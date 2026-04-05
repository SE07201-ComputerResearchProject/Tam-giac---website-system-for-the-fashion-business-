const { Category, Product, ProductImage } = require('../models');

const photoUrl = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

const imagePool = [
  photoUrl(5288811),
  photoUrl(29369449),
  photoUrl(20433734),
  photoUrl(13341179),
  photoUrl(29228588),
  photoUrl(34461333),
  photoUrl(4614885),
  photoUrl(4614841),
  photoUrl(7164260),
  photoUrl(7164286),
  photoUrl(18738663),
  photoUrl(15669734)
];

const collections = [
  {
    city: 'Seoul',
    label: 'Street Layer',
    story: 'Layering that feels cool, sharp and ready for city nights.',
    priceOffset: 140000
  },
  {
    city: 'Tokyo',
    label: 'Minimal Precision',
    story: 'Quiet silhouettes, clean structure and precise proportions.',
    priceOffset: 220000
  },
  {
    city: 'Shanghai',
    label: 'Modern Tailor',
    story: 'Polished tailoring built for glass towers and long evenings.',
    priceOffset: 260000
  },
  {
    city: 'Saigon',
    label: 'Daily Urban',
    story: 'Breathable pieces tuned for movement, heat and everyday style.',
    priceOffset: 120000
  }
];

const kinds = [
  { name: 'Overshirt', category: 'Outerwear', basePrice: 1290000 },
  { name: 'Boxy Tee', category: 'Top', basePrice: 590000 },
  { name: 'Relaxed Shirt', category: 'Top', basePrice: 790000 },
  { name: 'Wide Trousers', category: 'Bottom', basePrice: 1190000 },
  { name: 'Slip Dress', category: 'Dress', basePrice: 1490000 },
  { name: 'Crossbody Bag', category: 'Accessory', basePrice: 990000 }
];

const getGallery = (index) =>
  Array.from({ length: 4 }, (_, offset) => imagePool[(index + offset) % imagePool.length]);

const buildSeedProducts = (categoryByName) =>
  collections.reduce((allProducts, collection, collectionIndex) => {
    kinds.forEach((kind, kindIndex) => {
      const absoluteIndex = collectionIndex * kinds.length + kindIndex;
      const price = kind.basePrice + collection.priceOffset + ((kindIndex % 3) * 60000);
      const name = `${collection.city} ${kind.name}`;

      allProducts.push({
        product: {
          name,
          description: `${collection.story} A clean ${kind.name.toLowerCase()} built for daily wear.`,
          price,
          stock: 24 - (absoluteIndex % 6),
          isActive: true,
          categoryId: categoryByName.get(kind.category)
        },
        images: getGallery(absoluteIndex)
      });
    });

    return allProducts;
  }, []);

const ensureCatalogSeed = async () => {
  const productCount = await Product.count();
  if (productCount > 0) {
    return { seeded: false, productCount };
  }

  const categoryMap = new Map();
  const uniqueCategories = [...new Set(kinds.map((kind) => kind.category))];

  for (const categoryName of uniqueCategories) {
    const [category] = await Category.findOrCreate({
      where: { name: categoryName },
      defaults: {
        description: `${categoryName} collection for the Tam Giac catalog.`
      }
    });

    categoryMap.set(categoryName, category.id);
  }

  const products = buildSeedProducts(categoryMap);

  for (const entry of products) {
    const createdProduct = await Product.create(entry.product);
    await ProductImage.bulkCreate(
      entry.images.map((imageUrl) => ({
        productId: createdProduct.id,
        imageUrl
      }))
    );
  }

  return { seeded: true, productCount: products.length };
};

module.exports = { ensureCatalogSeed };
