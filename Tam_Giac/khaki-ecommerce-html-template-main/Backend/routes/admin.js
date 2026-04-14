const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  Category,
  Product,
  ProductImage,
  User,
  Order,
  OrderItem,
  ShippingAddress
} = require('../models');
const authMiddleware = require('../middleware/auth');
const {
  serializeProduct,
  createOrderReference,
  moneyToNumber
} = require('../services/storefront');
const {
  ORDER_STATUSES,
  getPaymentMethodFromStatus,
  getStatusLabel,
  paymentLabels
} = require('../services/order-payment');
const logger = require('../utils/logger');

const router = express.Router();
const adminOnly = [authMiddleware.authenticateToken, authMiddleware.authorizeAdmin];
const LOW_STOCK_THRESHOLD = 5;
const productInclude = [
  { model: Category, required: false },
  { model: ProductImage, required: false }
];
const categoryInclude = [
  {
    model: Product,
    required: false,
    attributes: ['id', 'isActive']
  }
];
const orderInclude = [
  {
    model: User,
    required: false,
    attributes: [
      'id',
      'email',
      'fullName',
      'phone',
      'tel',
      'companyName',
      'country',
      'city',
      'address',
      'role',
      'isVerified',
      'isActive'
    ],
    include: [{ model: ShippingAddress, required: false }]
  },
  {
    model: OrderItem,
    required: false,
    include: [
      {
        model: Product,
        required: false,
        include: [
          { model: ProductImage, required: false },
          { model: Category, required: false }
        ]
      }
    ]
  }
];
const USER_ROLE_OPTIONS = ['user', 'admin'];
const ORDER_STATUS_OPTIONS = [
  ORDER_STATUSES.COD_PENDING,
  ORDER_STATUSES.COD_PAID,
  ORDER_STATUSES.VNPAY_PENDING,
  ORDER_STATUSES.VNPAY_PAID,
  ORDER_STATUSES.VNPAY_FAILED,
  ORDER_STATUSES.VNPAY_CANCELLED,
  ORDER_STATUSES.VNPAY_EXPIRED
];
const NON_SELLING_ORDER_STATUSES = [
  ORDER_STATUSES.VNPAY_FAILED,
  ORDER_STATUSES.VNPAY_CANCELLED,
  ORDER_STATUSES.VNPAY_EXPIRED
];

const parsePrice = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
};

const parseStock = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const stock = Number(value);
  return Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : fallback;
};

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parsePositiveInt = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(0, Math.round(quantity));
};

const sanitizeText = (value, limit = 255) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, limit);

const resolveCategory = async ({ categoryId, categoryName }) => {
  if (categoryId) {
    const category = await Category.findByPk(categoryId);
    if (category) {
      return category;
    }
  }

  const normalizedName = sanitizeText(categoryName, 120);
  if (!normalizedName) {
    return null;
  }

  const [category] = await Category.findOrCreate({
    where: { name: normalizedName },
    defaults: {
      description: `${normalizedName} products managed from admin panel.`
    }
  });

  return category;
};

const syncPrimaryImage = async (productId, imageUrl, transaction) => {
  const normalizedImage = sanitizeText(imageUrl, 500);
  await ProductImage.destroy({ where: { productId }, transaction });

  if (!normalizedImage) {
    return;
  }

  await ProductImage.create(
    {
      productId,
      imageUrl: normalizedImage
    },
    { transaction }
  );
};

const serializeCategory = (category) => {
  const source = category && typeof category.get === 'function'
    ? category.get({ plain: true })
    : category;
  const products = Array.isArray(source?.Products) ? source.Products : [];

  return {
    id: source.id,
    name: source.name,
    description: source.description || '',
    productCount: products.length,
    activeProductCount: products.filter((product) => product && product.isActive !== false).length
  };
};

const pickLatestAddress = (userSource) => {
  const userAddresses = Array.isArray(userSource?.ShippingAddresses)
    ? userSource.ShippingAddresses
    : [];

  if (!userAddresses.length) {
    return null;
  }

  return userAddresses[userAddresses.length - 1];
};

const serializeAdminOrder = (order) => {
  const source = order && typeof order.get === 'function'
    ? order.get({ plain: true })
    : order;
  const user = source.User || null;
  const items = Array.isArray(source.OrderItems) ? source.OrderItems : [];
  const shippingAddress = pickLatestAddress(user);

  return {
    id: source.id,
    reference: createOrderReference(source.id),
    createdAt: source.createdAt,
    status: source.status || ORDER_STATUSES.COD_PENDING,
    statusLabel: getStatusLabel(source.status),
    paymentMethod: getPaymentMethodFromStatus(source.status),
    paymentLabel:
      paymentLabels[getPaymentMethodFromStatus(source.status)] || paymentLabels.cod,
    totalAmount: moneyToNumber(source.totalAmount),
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    customerName: user?.fullName || user?.email || 'Guest',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || user?.tel || '',
    companyName: user?.companyName || '',
    shippingAddress: shippingAddress
      ? {
          addressLine: shippingAddress.addressLine || '',
          city: shippingAddress.city || '',
          country: shippingAddress.country || '',
          postalCode: shippingAddress.postalCode || ''
        }
      : null,
    items: items.map((item) => {
      const product = item.Product || null;
      const serializedProduct = product ? serializeProduct(product) : null;

      return {
        id: item.id,
        productId: item.productId,
        productName: serializedProduct?.name || product?.name || 'Product',
        productImage: serializedProduct?.image || '',
        categoryName: serializedProduct?.categoryName || product?.Category?.name || 'Catalog',
        quantity: Number(item.quantity || 0),
        price: moneyToNumber(item.price)
      };
    })
  };
};

const serializeStockRow = (product, soldMap) => {
  const serialized = serializeProduct(product);
  const soldUnits = Number(soldMap.get(String(serialized.id)) || 0);
  const availableStock = Number(serialized.stock || 0);

  return {
    id: serialized.id,
    name: serialized.name,
    categoryName: serialized.categoryName || 'Catalog',
    image: serialized.image || '',
    price: Number(serialized.price || 0),
    availableStock,
    soldUnits,
    stockIn: availableStock + soldUnits,
    lowStock: availableStock <= LOW_STOCK_THRESHOLD,
    isActive: Boolean(serialized.isActive)
  };
};

const serializeAdminUser = (user) => {
  const source = user && typeof user.get === 'function'
    ? user.get({ plain: true })
    : user;
  const orders = Array.isArray(source.Orders) ? source.Orders : [];

  return {
    id: source.id,
    fullName: source.fullName || '',
    email: source.email,
    phone: source.phone || source.tel || '',
    role: source.role || 'user',
    isVerified: Boolean(source.isVerified),
    isActive: Boolean(source.isActive),
    companyName: source.companyName || '',
    country: source.country || '',
    city: source.city || '',
    createdAt: source.createdAt || null,
    orderCount: orders.length
  };
};

const getSoldQuantities = async () => {
  const soldRows = await OrderItem.findAll({
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'soldUnits']
    ],
    include: [
      {
        model: Order,
        required: true,
        attributes: [],
        where: {
          status: {
            [Op.notIn]: NON_SELLING_ORDER_STATUSES
          }
        }
      }
    ],
    group: ['productId']
  });

  return soldRows.reduce((map, row) => {
    const source = row && typeof row.get === 'function'
      ? row.get({ plain: true })
      : row;
    map.set(String(source.productId), Number(source.soldUnits || 0));
    return map;
  }, new Map());
};

router.get('/health', adminOnly, (req, res) => {
  res.json({ status: 'OK' });
});

router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const completedStatusWhere = {
      status: {
        [Op.in]: [ORDER_STATUSES.COD_PAID, ORDER_STATUSES.VNPAY_PAID]
      }
    };
    const lowStockWhere = {
      isActive: true,
      stock: { [Op.lte]: LOW_STOCK_THRESHOLD }
    };

    const [
      productCount,
      hiddenProductCount,
      categoryCount,
      userCount,
      orderCount,
      pendingOrders,
      completedOrdersCount,
      lowStockCount,
      lowStockProducts,
      recentOrders,
      completedOrders
    ] = await Promise.all([
      Product.count({ where: { isActive: true } }),
      Product.count({ where: { isActive: false } }),
      Category.count(),
      User.count(),
      Order.count(),
      Order.count({
        where: {
          status: {
            [Op.in]: [ORDER_STATUSES.COD_PENDING, ORDER_STATUSES.VNPAY_PENDING]
          }
        }
      }),
      Order.count({ where: completedStatusWhere }),
      Product.count({ where: lowStockWhere }),
      Product.findAll({
        where: lowStockWhere,
        include: productInclude,
        order: [['stock', 'ASC'], ['createdAt', 'DESC']],
        limit: 6
      }),
      Order.findAll({
        include: orderInclude,
        order: [['createdAt', 'DESC']],
        limit: 8
      }),
      Order.findAll({
        where: completedStatusWhere,
        include: orderInclude,
        order: [['createdAt', 'DESC']],
        limit: 8
      })
    ]);

    res.json({
      stats: {
        activeProducts: productCount,
        hiddenProducts: hiddenProductCount,
        categories: categoryCount,
        users: userCount,
        totalOrders: orderCount,
        pendingOrders,
        completedOrders: completedOrdersCount,
        lowStockItems: lowStockCount
      },
      lowStockProducts: lowStockProducts.map((product) => serializeStockRow(product, new Map())),
      recentOrders: recentOrders.map(serializeAdminOrder),
      completedOrders: completedOrders.map(serializeAdminOrder)
    });
  } catch (error) {
    logger.error('Admin dashboard failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai dashboard admin' });
  }
});

router.get('/categories', adminOnly, async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: categoryInclude,
      order: [['name', 'ASC']]
    });

    res.json(categories.map(serializeCategory));
  } catch (error) {
    logger.error('Admin categories failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai danh muc' });
  }
});

router.post('/categories', adminOnly, async (req, res) => {
  try {
    const name = sanitizeText(req.body.name, 120);
    const description = sanitizeText(req.body.description, 255);

    if (!name) {
      return res.status(400).json({ error: 'Ten danh muc la bat buoc' });
    }

    const category = await Category.create({
      name,
      description
    });

    const createdCategory = await Category.findByPk(category.id, { include: categoryInclude });
    res.status(201).json({
      message: 'Them danh muc thanh cong',
      category: serializeCategory(createdCategory)
    });
  } catch (error) {
    logger.error('Admin create category failed', { message: error?.message });
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'Danh muc nay da ton tai' });
    }
    res.status(500).json({ error: 'Khong the them danh muc' });
  }
});

router.put('/categories/:id', adminOnly, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Khong tim thay danh muc' });
    }

    const name = sanitizeText(req.body.name || category.name, 120);
    const description = sanitizeText(req.body.description, 255);

    if (!name) {
      return res.status(400).json({ error: 'Ten danh muc la bat buoc' });
    }

    await category.update({
      name,
      description
    });

    const updatedCategory = await Category.findByPk(category.id, { include: categoryInclude });
    res.json({
      message: 'Cap nhat danh muc thanh cong',
      category: serializeCategory(updatedCategory)
    });
  } catch (error) {
    logger.error('Admin update category failed', { message: error?.message });
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'Ten danh muc nay da duoc su dung' });
    }
    res.status(500).json({ error: 'Khong the cap nhat danh muc' });
  }
});

router.delete('/categories/:id', adminOnly, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const category = await Category.findByPk(req.params.id, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Khong tim thay danh muc' });
    }

    await Product.update(
      { categoryId: null },
      {
        where: { categoryId: category.id },
        transaction
      }
    );

    await category.destroy({ transaction });
    await transaction.commit();

    res.json({ message: 'Da xoa danh muc va bo lien ket san pham cu' });
  } catch (error) {
    await transaction.rollback();
    logger.error('Admin delete category failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the xoa danh muc' });
  }
});

router.get('/products', adminOnly, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || 'true').toLowerCase() === 'true';
    const products = await Product.findAll({
      where: includeInactive ? {} : { isActive: true },
      include: productInclude,
      order: [['createdAt', 'DESC']]
    });

    res.json(products.map(serializeProduct));
  } catch (error) {
    logger.error('Admin list products failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai san pham' });
  }
});

router.post('/products', adminOnly, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const name = sanitizeText(req.body.name, 160);
    if (!name) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Ten san pham la bat buoc' });
    }

    const category = await resolveCategory({
      categoryId: req.body.categoryId,
      categoryName: req.body.categoryName
    });

    const product = await Product.create(
      {
        name,
        description: sanitizeText(req.body.description, 255),
        price: parsePrice(req.body.price, 0),
        stock: parseStock(req.body.stock, 0),
        isActive: parseBoolean(req.body.isActive, true),
        categoryId: category ? category.id : null
      },
      { transaction }
    );

    await syncPrimaryImage(product.id, req.body.imageUrl, transaction);
    await transaction.commit();

    const createdProduct = await Product.findByPk(product.id, { include: productInclude });
    res.status(201).json({
      message: 'Them san pham thanh cong',
      product: serializeProduct(createdProduct)
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Admin create product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the them san pham' });
  }
});

router.put('/products/:id', adminOnly, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const product = await Product.findByPk(req.params.id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    const category = await resolveCategory({
      categoryId: req.body.categoryId,
      categoryName: req.body.categoryName
    });

    await product.update(
      {
        name: sanitizeText(req.body.name || product.name, 160),
        description:
          req.body.description === undefined
            ? product.description
            : sanitizeText(req.body.description, 255),
        price: parsePrice(req.body.price, Number(product.price || 0)),
        stock: parseStock(req.body.stock, Number(product.stock || 0)),
        isActive: parseBoolean(req.body.isActive, product.isActive !== false),
        categoryId:
          req.body.categoryId === undefined && req.body.categoryName === undefined
            ? product.categoryId
            : category
              ? category.id
              : null
      },
      { transaction }
    );

    if (req.body.imageUrl !== undefined) {
      await syncPrimaryImage(product.id, req.body.imageUrl, transaction);
    }

    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, { include: productInclude });
    res.json({
      message: 'Cap nhat san pham thanh cong',
      product: serializeProduct(updatedProduct)
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Admin update product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the cap nhat san pham' });
  }
});

router.delete('/products/:id', adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    await product.update({ isActive: false });
    res.json({ message: 'Da an san pham khoi storefront' });
  } catch (error) {
    logger.error('Admin delete product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the xoa san pham' });
  }
});

router.post('/products/:id/restore', adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    await product.update({ isActive: true });
    const restoredProduct = await Product.findByPk(product.id, { include: productInclude });
    res.json({
      message: 'Da khoi phuc san pham',
      product: serializeProduct(restoredProduct)
    });
  } catch (error) {
    logger.error('Admin restore product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the khoi phuc san pham' });
  }
});

router.post('/products/:id/stock', adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    const quantity = parsePositiveInt(req.body.quantity);
    if (!quantity) {
      return res.status(400).json({ error: 'So luong them vao phai lon hon 0' });
    }

    await product.update({
      stock: Number(product.stock || 0) + quantity
    });

    const updatedProduct = await Product.findByPk(product.id, { include: productInclude });
    res.json({
      message: 'Da cap nhat ton kho',
      product: serializeProduct(updatedProduct)
    });
  } catch (error) {
    logger.error('Admin add stock failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the cap nhat ton kho' });
  }
});

router.get('/stock', adminOnly, async (req, res) => {
  try {
    const [products, soldMap] = await Promise.all([
      Product.findAll({
        include: productInclude,
        order: [['createdAt', 'DESC']]
      }),
      getSoldQuantities()
    ]);

    res.json({
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      rows: products.map((product) => serializeStockRow(product, soldMap))
    });
  } catch (error) {
    logger.error('Admin stock failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai du lieu ton kho' });
  }
});

router.get('/orders', adminOnly, async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: orderInclude,
      order: [['createdAt', 'DESC']]
    });

    res.json(orders.map(serializeAdminOrder));
  } catch (error) {
    logger.error('Admin orders failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai danh sach don hang' });
  }
});

router.patch('/orders/:id', adminOnly, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Khong tim thay don hang' });
    }

    const nextStatus = sanitizeText(req.body.status, 40).toLowerCase();
    if (!ORDER_STATUS_OPTIONS.includes(nextStatus)) {
      return res.status(400).json({ error: 'Trang thai don hang khong hop le' });
    }

    await order.update({ status: nextStatus });
    const updatedOrder = await Order.findByPk(order.id, { include: orderInclude });
    res.json({
      message: 'Da cap nhat trang thai don hang',
      order: serializeAdminOrder(updatedOrder)
    });
  } catch (error) {
    logger.error('Admin update order failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the cap nhat don hang' });
  }
});

router.delete('/orders/:id', adminOnly, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(req.params.id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Khong tim thay don hang' });
    }

    await OrderItem.destroy({
      where: { orderId: order.id },
      transaction
    });
    await order.destroy({ transaction });
    await transaction.commit();

    res.json({ message: 'Da xoa don hang khoi he thong admin' });
  } catch (error) {
    await transaction.rollback();
    logger.error('Admin delete order failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the xoa don hang' });
  }
});

router.get('/users', adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Order,
          required: false,
          attributes: ['id']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(users.map(serializeAdminUser));
  } catch (error) {
    logger.error('Admin users failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai nguoi dung' });
  }
});

router.patch('/users/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Khong tim thay nguoi dung' });
    }

    const nextRole = sanitizeText(req.body.role || user.role, 20).toLowerCase() || 'user';
    if (!USER_ROLE_OPTIONS.includes(nextRole)) {
      return res.status(400).json({ error: 'Role khong hop le' });
    }

    const nextIsActive = parseBoolean(req.body.isActive, user.isActive !== false);
    const nextIsVerified = parseBoolean(req.body.isVerified, Boolean(user.isVerified));

    if (String(user.id) === String(req.user.id) && (!nextIsActive || nextRole !== 'admin')) {
      return res.status(400).json({ error: 'Ban khong the tu ha quyen hoac vo hieu hoa chinh minh' });
    }

    await user.update({
      role: nextRole,
      isActive: nextIsActive,
      isVerified: nextIsVerified
    });

    const updatedUser = await User.findByPk(user.id, {
      include: [
        {
          model: Order,
          required: false,
          attributes: ['id']
        }
      ]
    });

    res.json({
      message: 'Da cap nhat nguoi dung',
      user: serializeAdminUser(updatedUser)
    });
  } catch (error) {
    logger.error('Admin update user failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the cap nhat nguoi dung' });
  }
});

module.exports = router;
