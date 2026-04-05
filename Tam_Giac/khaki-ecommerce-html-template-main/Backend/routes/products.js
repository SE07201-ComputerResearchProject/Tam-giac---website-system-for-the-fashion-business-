const express = require('express');
const { Op } = require('sequelize');
const { Product, Category, ProductImage } = require('../models');
const { buildCollectionSummary, serializeProduct } = require('../services/storefront');
const logger = require('../utils/logger');

const router = express.Router();
const productInclude = [
  { model: Category, required: false },
  { model: ProductImage, required: false }
];

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
  const categoryId = String(query.categoryId || '').trim();
  const collectionKey = String(query.collection || '').trim().toLowerCase();
  const minPrice = parsePrice(query.minPrice);
  const maxPrice = parsePrice(query.maxPrice);

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { description: { [Op.like]: `%${keyword}%` } }
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
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

  return { where, collectionKey };
};

router.get('/catalog', async (req, res) => {
  try {
    const filter = buildWhere(req.query);
    const products = await Product.findAll({
      where: filter.where,
      include: productInclude,
      order: [['createdAt', 'DESC']]
    });

    let serializedProducts = products.map(serializeProduct);
    if (filter.collectionKey) {
      serializedProducts = serializedProducts.filter(
        (product) => product.collectionKey === filter.collectionKey
      );
    }

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
    const filter = buildWhere(req.query);
    const products = await Product.findAll({
      where: filter.where,
      include: productInclude,
      order: [['createdAt', 'DESC']]
    });

    let serializedProducts = products.map(serializeProduct);
    if (filter.collectionKey) {
      serializedProducts = serializedProducts.filter(
        (product) => product.collectionKey === filter.collectionKey
      );
    }

    res.json(serializedProducts);
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

    const products = await Product.findAll({
      where: { isActive: true },
      include: productInclude
    });

    const product = products
      .map(serializeProduct)
      .find((item) => item.id === rawId || item.slug === rawId);

    if (!product) {
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Get product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai chi tiet san pham' });
  }
});

module.exports = router;
