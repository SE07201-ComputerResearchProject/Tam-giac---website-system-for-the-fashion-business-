const express = require('express');
const { Op } = require('sequelize');
const { Product, Category } = require('../models');
const { buildCollectionSummary, serializeProduct } = require('../services/storefront');
const logger = require('../utils/logger');

const router = express.Router();
const productInclude = [{ model: Category, required: false }];

const parsePrice = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildWhere = (query) => {
  const where = { isActive: true };
  const keyword = String(query.q || query.search || '').trim().toLowerCase();
  const collectionKey = String(query.collection || '').trim();
  const type = String(query.type || query.category || '').trim();
  const minPrice = parsePrice(query.minPrice);
  const maxPrice = parsePrice(query.maxPrice);

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { searchText: { [Op.like]: `%${keyword}%` } },
      { collectionLabel: { [Op.like]: `%${keyword}%` } },
      { city: { [Op.like]: `%${keyword}%` } },
      { type: { [Op.like]: `%${keyword}%` } }
    ];
  }

  if (collectionKey) {
    where.collectionKey = collectionKey;
  }

  if (type) {
    where.type = type;
  }

  if (minPrice !== null || maxPrice !== null) {
    where.price = {};

    if (minPrice !== null) {
      where.price[Op.gte] = minPrice;
    }

    if (maxPrice !== null) {
      where.price[Op.lte] = maxPrice;
    }
  }

  return where;
};

router.get('/catalog', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: buildWhere(req.query),
      include: productInclude,
      order: [['id', 'ASC']],
      limit: 240
    });

    const serializedProducts = products.map(serializeProduct);
    res.json({
      products: serializedProducts,
      collections: buildCollectionSummary(serializedProducts)
    });
  } catch (error) {
    logger.error('Catalog products failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai san pham' });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: buildWhere(req.query),
      include: productInclude,
      order: [['id', 'ASC']],
      limit: 240
    });

    res.json(products.map(serializeProduct));
  } catch (error) {
    logger.error('List products failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai danh sach san pham' });
  }
});

router.get('/:idOrSlug', async (req, res) => {
  try {
    const rawId = String(req.params.idOrSlug || '').trim();
    if (!rawId) {
      return res.status(400).json({ error: 'ID san pham khong hop le' });
    }

    const numericId = Number(rawId);
    const product = await Product.findOne({
      where: {
        isActive: true,
        ...(Number.isFinite(numericId)
          ? { [Op.or]: [{ id: numericId }, { slug: rawId }] }
          : { slug: rawId })
      },
      include: productInclude
    });

    if (!product) {
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    res.json(serializeProduct(product));
  } catch (error) {
    logger.error('Get product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai chi tiet san pham' });
  }
});

module.exports = router;
