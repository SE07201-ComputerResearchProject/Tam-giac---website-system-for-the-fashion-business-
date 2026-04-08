const express = require('express');
const { sequelize } = require('../config/database');
const { Order, OrderItem, Product, ProductImage, ShippingAddress } = require('../models');
const authMiddleware = require('../middleware/auth');
const { serializeOrder } = require('../services/storefront');
const { getInitialOrderStatus, normalizePaymentMethod } = require('../services/order-payment');
const logger = require('../utils/logger');

const router = express.Router();
const orderInclude = [
  {
    model: OrderItem,
    required: false,
    include: [
      {
        model: Product,
        required: false,
        include: [{ model: ProductImage, required: false }]
      }
    ]
  }
];

const normalizeQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.round(quantity)));
};

router.post('/', authMiddleware.authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const paymentMethod = normalizePaymentMethod(req.body.paymentMethod);
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Gio hang dang trong' });
    }

    const normalizedItems = requestedItems
      .map((item) => ({
        productId: String(item.productId || item.id || '').trim(),
        quantity: normalizeQuantity(item.quantity)
      }))
      .filter((item) => item.productId);

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await Product.findAll({
      where: { id: productIds, isActive: true },
      transaction
    });
    const productMap = new Map(products.map((product) => [String(product.id), product]));

    if (!productIds.length || productMap.size !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Mot so san pham khong hop le hoac da ngung ban' });
    }

    const totalAmount = normalizedItems.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      return sum + (Number(product.price) * item.quantity);
    }, 0);

    const order = await Order.create(
      {
        userId: req.user.id,
        totalAmount,
        status: getInitialOrderStatus(paymentMethod)
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      normalizedItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        };
      }),
      { transaction }
    );

    const shippingAddress = req.body.shippingAddress || null;
    if (shippingAddress && shippingAddress.addressLine) {
      const existingAddress = await ShippingAddress.findOne({
        where: { userId: req.user.id },
        order: [['id', 'DESC']],
        transaction
      });

      const addressPayload = {
        userId: req.user.id,
        addressLine: String(shippingAddress.addressLine || '').trim(),
        city: String(shippingAddress.city || '').trim(),
        country: String(shippingAddress.country || '').trim(),
        postalCode: String(shippingAddress.postalCode || '').trim()
      };

      if (existingAddress) {
        await existingAddress.update(addressPayload, { transaction });
      } else {
        await ShippingAddress.create(addressPayload, { transaction });
      }
    }

    await transaction.commit();

    const createdOrder = await Order.findByPk(order.id, { include: orderInclude });
    res.status(201).json({
      message: 'Tao don hang thanh cong',
      order: serializeOrder(createdOrder)
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create order failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tao don hang' });
  }
});

router.get('/my', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: orderInclude,
      order: [['createdAt', 'DESC']]
    });

    res.json(orders.map(serializeOrder));
  } catch (error) {
    logger.error('List my orders failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai don hang' });
  }
});

module.exports = router;
