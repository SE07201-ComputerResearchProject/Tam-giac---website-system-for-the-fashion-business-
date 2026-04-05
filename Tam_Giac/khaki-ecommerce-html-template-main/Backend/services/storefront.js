const photoUrl = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

const fallbackImages = [
  photoUrl(5288811),
  photoUrl(29369449),
  photoUrl(20433734),
  photoUrl(13341179),
  photoUrl(29228588),
  photoUrl(34461333)
];

const moneyToNumber = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const createOrderReference = (id) => {
  const text = String(id || '').trim();
  if (!text) {
    return 'TG-ORDER';
  }

  return `TG-${text.split('-')[0].toUpperCase()}`;
};

const paymentLabels = {
  cod: 'Cash on delivery',
  momo: 'MoMo',
  vnpay: 'VNPay',
  bank: 'Bank transfer'
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tam-giac-item';

const serializeProduct = (product) => {
  const source = product && typeof product.get === 'function' ? product.get({ plain: true }) : product;
  const images = Array.isArray(source.ProductImages)
    ? source.ProductImages.map((image) => image.imageUrl).filter(Boolean)
    : [];
  const primaryImage = images[0] || fallbackImages[Math.abs(String(source.id || '').length) % fallbackImages.length];
  const categoryName = source.Category?.name || 'Catalog';
  const collectionKey = slugify(categoryName);

  return {
    id: String(source.id),
    dbId: source.id,
    slug: slugify(source.name),
    sku: '',
    name: source.name,
    badge: categoryName,
    category: `${categoryName} / Tam Giac`,
    categoryId: source.categoryId || source.Category?.id || null,
    categoryName,
    city: 'Tam Giac',
    collectionKey,
    collectionLabel: categoryName,
    type: categoryName,
    material: 'Curated fabric',
    fit: 'Daily fit',
    note: source.description || 'Tam Giac curated piece.',
    image: primaryImage,
    gallery: images.length ? images : [primaryImage],
    price: moneyToNumber(source.price),
    stock: Number(source.stock || 0),
    descriptionShort: source.description || '',
    descriptionLong: [
      source.description || `${source.name} is ready for everyday wear.`,
      'This product is managed directly from the Tam Giac admin panel and served from SQL Server.'
    ],
    searchText: `${source.name} ${categoryName} ${source.description || ''}`.toLowerCase(),
    isActive: Boolean(source.isActive)
  };
};

const buildCollectionSummary = (products) => {
  const grouped = new Map();

  products.forEach((product) => {
    const key = product.collectionKey || 'catalog';
    const current = grouped.get(key) || {
      key,
      label: product.collectionLabel || 'Catalog',
      city: 'Tam Giac',
      badge: product.badge || product.collectionLabel || 'Catalog',
      story: product.descriptionShort || '',
      count: 0
    };

    current.count += 1;
    if (!current.story && product.descriptionShort) {
      current.story = product.descriptionShort;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((left, right) => left.label.localeCompare(right.label));
};

const serializeOrder = (order) => {
  const source = order && typeof order.get === 'function' ? order.get({ plain: true }) : order;
  const items = Array.isArray(source.OrderItems) ? source.OrderItems : [];
  const totalAmount = moneyToNumber(source.totalAmount);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    id: source.id,
    reference: createOrderReference(source.id),
    status: source.status || 'pending',
    paymentMethod: 'cod',
    paymentLabel: paymentLabels.cod,
    totalAmount,
    subtotalAmount: totalAmount,
    deliveryFee: 0,
    itemCount,
    createdAt: source.createdAt,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderNote: '',
    shippingAddress: null,
    items: items.map((item) => {
      const product = item.Product && typeof item.Product.get === 'function'
        ? item.Product.get({ plain: true })
        : item.Product;
      const productImages = Array.isArray(product?.ProductImages)
        ? product.ProductImages.map((image) => image.imageUrl).filter(Boolean)
        : [];

      return {
        id: item.id,
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        price: moneyToNumber(item.price),
        productName: product?.name || 'Product',
        productImage: productImages[0] || fallbackImages[0],
        productSlug: slugify(product?.name || item.productId || 'product')
      };
    })
  };
};

module.exports = {
  buildCollectionSummary,
  createOrderReference,
  moneyToNumber,
  paymentLabels,
  serializeOrder,
  serializeProduct,
  slugify
};
