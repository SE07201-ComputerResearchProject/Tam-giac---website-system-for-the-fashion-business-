const express = require('express');
const { Product, Category } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Public: list products (basic)
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      include: [{ model: Category, required: false }],
      order: [['id', 'DESC']],
      limit: 50
    });
    res.json(products);
  } catch (error) {
    logger.error('List products failed', { message: error?.message });
    res.status(500).json({ error: 'Lỗi tải sản phẩm' });
  }
});

// Public: get product detail
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const product = await Product.findOne({
      where: { id, isActive: true },
      include: [{ model: Category, required: false }]
    });
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    res.json(product);
  } catch (error) {
    logger.error('Get product failed', { message: error?.message });
    res.status(500).json({ error: 'Lỗi tải sản phẩm' });
  }
});

module.exports = router;

