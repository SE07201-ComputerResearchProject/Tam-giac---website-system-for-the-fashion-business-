const express = require('express');
const { Category, Product, ProductImage } = require('../models');
const authMiddleware = require('../middleware/auth');
const { serializeProduct } = require('../services/storefront');
const logger = require('../utils/logger');

const router = express.Router();
const adminOnly = [authMiddleware.authenticateToken, authMiddleware.authorizeAdmin];
const productInclude = [
  { model: Category, required: false },
  { model: ProductImage, required: false }
];

const parsePrice = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const parseStock = (value) => {
  const stock = Number(value);
  return Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : 0;
};

const resolveCategory = async ({ categoryId, categoryName }) => {
  if (categoryId) {
    const category = await Category.findByPk(categoryId);
    if (category) {
      return category;
    }
  }

  const normalizedName = String(categoryName || '').trim();
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

const syncPrimaryImage = async (productId, imageUrl) => {
  const normalizedImage = String(imageUrl || '').trim();
  await ProductImage.destroy({ where: { productId } });

  if (!normalizedImage) {
    return;
  }

  await ProductImage.create({
    productId,
    imageUrl: normalizedImage
  });
};

router.get('/health', adminOnly, (req, res) => {
  res.json({ status: 'OK' });
});

router.get('/categories', adminOnly, async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.json(categories.map((category) => category.get({ plain: true })));
  } catch (error) {
    logger.error('Admin categories failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the tai danh muc' });
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
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Ten san pham la bat buoc' });
    }

    const category = await resolveCategory({
      categoryId: req.body.categoryId,
      categoryName: req.body.categoryName
    });

    const product = await Product.create({
      name,
      description: String(req.body.description || '').trim(),
      price: parsePrice(req.body.price),
      stock: parseStock(req.body.stock),
      isActive: req.body.isActive !== false,
      categoryId: category ? category.id : null
    });

    await syncPrimaryImage(product.id, req.body.imageUrl);

    const createdProduct = await Product.findByPk(product.id, { include: productInclude });
    res.status(201).json({
      message: 'Them san pham thanh cong',
      product: serializeProduct(createdProduct)
    });
  } catch (error) {
    logger.error('Admin create product failed', { message: error?.message });
    res.status(500).json({ error: 'Khong the them san pham' });
  }
});

router.put('/products/:id', adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Khong tim thay san pham' });
    }

    const category = await resolveCategory({
      categoryId: req.body.categoryId,
      categoryName: req.body.categoryName
    });

    await product.update({
      name: String(req.body.name || product.name).trim(),
      description: String(req.body.description || '').trim(),
      price: parsePrice(req.body.price),
      stock: parseStock(req.body.stock),
      isActive: req.body.isActive !== false,
      categoryId: category ? category.id : null
    });

    await syncPrimaryImage(product.id, req.body.imageUrl);

    const updatedProduct = await Product.findByPk(product.id, { include: productInclude });
    res.json({
      message: 'Cap nhat san pham thanh cong',
      product: serializeProduct(updatedProduct)
    });
  } catch (error) {
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

module.exports = router;
