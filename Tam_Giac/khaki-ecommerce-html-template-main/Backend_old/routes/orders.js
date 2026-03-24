const express = require('express');
const { Order, OrderItem, Product } = require('../models');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// User: list my orders (JWT required)
router.get('/my', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: OrderItem,
          required: false,
          include: [{ model: Product, required: false }]
        }
      ],
      order: [['id', 'DESC']],
      limit: 50
    });
    res.json(orders);
  } catch (error) {
    logger.error('List my orders failed', { message: error?.message });
    res.status(500).json({ error: 'Lỗi tải đơn hàng' });
  }
});

module.exports = router;

