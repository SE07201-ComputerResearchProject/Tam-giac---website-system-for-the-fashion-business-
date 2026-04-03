const { Category, Product } = require('../models');

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
    key: 'seoul-street',
    city: 'Seoul',
    label: 'Seoul Street',
    badge: 'Seoul Edit',
    story: 'Layering that feels cool, sharp and ready for city nights.',
    mood: 'street layering',
    priceOffset: 140000
  },
  {
    key: 'tokyo-minimal',
    city: 'Tokyo',
    label: 'Tokyo Minimal',
    badge: 'Tokyo Minimal',
    story: 'Quiet silhouettes, clean structure and precise proportions.',
    mood: 'minimal precision',
    priceOffset: 220000
  },
  {
    key: 'shanghai-modern',
    city: 'Shanghai',
    label: 'Shanghai Modern',
    badge: 'Shanghai Tailor',
    story: 'Polished tailoring built for glass towers and long evenings.',
    mood: 'modern tailoring',
    priceOffset: 260000
  },
  {
    key: 'saigon-urban',
    city: 'Saigon',
    label: 'Saigon Urban',
    badge: 'Saigon Daily',
    story: 'Breathable pieces tuned for movement, heat and everyday style.',
    mood: 'light urban comfort',
    priceOffset: 120000
  }
];

const kinds = [
  {
    key: 'overshirt',
    name: 'Overshirt',
    type: 'Outerwear',
    basePrice: 1290000,
    material: 'washed twill',
    fit: 'boxy fit',
    note: 'Easy layer for city weather and late coffee runs.'
  },
  {
    key: 'tee',
    name: 'Boxy Tee',
    type: 'Top',
    basePrice: 590000,
    material: 'heavy cotton',
    fit: 'relaxed shoulder',
    note: 'Clean base layer with a premium drape.'
  },
  {
    key: 'shirt',
    name: 'Relaxed Shirt',
    type: 'Top',
    basePrice: 790000,
    material: 'cool poplin',
    fit: 'easy straight fit',
    note: 'Light and breathable for layering or solo wear.'
  },
  {
    key: 'trousers',
    name: 'Wide Trousers',
    type: 'Bottom',
    basePrice: 1190000,
    material: 'fluid suiting',
    fit: 'wide straight fit',
    note: 'Moves well and lengthens the silhouette.'
  },
  {
    key: 'dress',
    name: 'Slip Dress',
    type: 'Dress',
    basePrice: 1490000,
    material: 'soft satin',
    fit: 'column fit',
    note: 'Simple enough for day, sleek enough for night.'
  },
  {
    key: 'crossbody',
    name: 'Crossbody Bag',
    type: 'Accessory',
    basePrice: 990000,
    material: 'waterproof shell',
    fit: 'compact utility',
    note: 'Compact size with enough room for essentials.'
  }
];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tam-giac-item';

const getGallery = (index) =>
  Array.from({ length: 4 }, (_, offset) => imagePool[(index + offset) % imagePool.length]);

const buildSeedProducts = (categoryByName) =>
  collections.reduce((allProducts, collection, collectionIndex) => {
    kinds.forEach((kind, kindIndex) => {
      const absoluteIndex = collectionIndex * kinds.length + kindIndex;
      const price = kind.basePrice + collection.priceOffset + ((kindIndex % 3) * 60000);
      const name = `${collection.city} ${kind.name}`;
      const gallery = getGallery(absoluteIndex);
      const slug = slugify(`${collection.key}-${kind.key}`);

      allProducts.push({
        slug,
        sku: `TG-${String(absoluteIndex + 1).padStart(3, '0')}`,
        name,
        description: `${collection.story} ${kind.note}`,
        descriptionLongJson: JSON.stringify([
          `${name} is designed around ${kind.fit} and ${kind.material}, giving the piece a strong ${collection.city} mood without feeling difficult to wear.`,
          'This piece works best with neutral layers, clean footwear and a compact accessory. It is built for wardrobes that want more Asian city influence while staying practical for everyday use.'
        ]),
        price,
        stock: 24 - (absoluteIndex % 6),
        imageUrl: gallery[0],
        galleryJson: JSON.stringify(gallery),
        type: kind.type,
        badge: collection.badge,
        city: collection.city,
        collectionKey: collection.key,
        collectionLabel: collection.label,
        material: kind.material,
        fit: kind.fit,
        note: kind.note,
        searchText: `${name} ${collection.label} ${collection.city} ${kind.type} ${kind.material} ${collection.mood}`.toLowerCase(),
        categoryId: categoryByName.get(kind.type),
        isActive: true
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

  for (const type of [...new Set(kinds.map((kind) => kind.type))]) {
    const [category] = await Category.findOrCreate({
      where: { name: type },
      defaults: {
        slug: slugify(type),
        description: `${type} collection for the Tam Giac catalog.`,
        isActive: true
      }
    });

    categoryMap.set(type, category.id);
  }

  const products = buildSeedProducts(categoryMap);
  await Product.bulkCreate(products);

  return { seeded: true, productCount: products.length };
};

module.exports = { ensureCatalogSeed };
