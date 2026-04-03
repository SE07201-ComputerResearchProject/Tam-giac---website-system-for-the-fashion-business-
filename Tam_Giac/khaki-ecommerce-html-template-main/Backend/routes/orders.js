const express = require('express');
const { sequelize } = require('../config/database');
const { Order, OrderItem, Product } = require('../models');
const authMiddleware = require('../middleware/auth');
const { serializeOrder } = require('../services/storefront');
const logger = require('../utils/logger');

const router = express.Router();
const DELIVERY_FEE = 30000;
const allowedPaymentMethods = new Set(['cod', 'momo', 'vnpay', 'bank']);
const orderInclude = [
  {
    model: OrderItem,
    required: false,
    include: [{ model: Product, required: false }]
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
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Gio hang dang trong' });
    }

    const normalizedItems = requestedItems
      .map((item) => ({
        productId: Number(item.productId || item.id),
        quantity: normalizeQuantity(item.quantity)
      }))
      .filter((item) => Number.isFinite(item.productId));

    if (!normalizedItems.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Khong co san pham hop le de dat hang' });
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await Product.findAll({
      where: { id: productIds, isActive: true },
      transaction
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    if (productMap.size !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Mot so san pham khong hop le hoac da ngung ban' });
    }

    const paymentMethod = String(req.body.paymentMethod || 'cod').toLowerCase();
    if (!allowedPaymentMethods.has(paymentMethod)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Phuong thuc thanh toan khong hop le' });
    }

    const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalAmount = normalizedItems.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      return sum + (Number(product.price) * item.quantity);
    }, 0);
    const deliveryFee = itemCount > 0 ? DELIVERY_FEE : 0;
    const totalAmount = subtotalAmount + deliveryFee;

    const order = await Order.create(
      {
        userId: req.user.id,
        totalAmount,
        subtotalAmount,
        deliveryFee,
        itemCount,
        status: 'pending',
        paymentMethod,
        customerName: String(req.body.customerName || '').trim(),
        customerEmail: String(req.body.customerEmail || req.user.email || '').trim(),
        customerPhone: String(req.body.customerPhone || '').trim(),
        orderNote: String(req.body.orderNote || '').trim(),
        shippingAddress: req.body.shippingAddress || null
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      normalizedItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          orderId: order.id,
          productId: item.productId,
          price: product.price,
          quantity: item.quantity
        };
      }),
      { transaction }
    );

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
      order: [['id', 'DESC']],
      limit: 50
    });

    res.json(orders.map(serializeOrder));
  } catch (error) {
    logger.error('List my orders failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai don hang' });
  }
});

module.exports = router;
