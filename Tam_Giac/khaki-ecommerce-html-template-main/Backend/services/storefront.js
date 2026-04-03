const moneyToNumber = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const safeJsonParse = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const createOrderReference = (id) => `TG-${String(id || 0).padStart(6, '0')}`;

const paymentLabels = {
  cod: 'Cash on delivery',
  momo: 'MoMo',
  vnpay: 'VNPay',
  bank: 'Bank transfer'
};

const serializeProduct = (product) => {
  const source = product && typeof product.get === 'function' ? product.get({ plain: true }) : product;
  const gallery = safeJsonParse(source.galleryJson, []);
  const descriptionLong = safeJsonParse(source.descriptionLongJson, []);
  const categoryName = source.Category?.name || source.category?.name || source.type || 'Catalog';
  const collectionLabel = source.collectionLabel || source.city || 'Tam Giac';
  const image = source.imageUrl || gallery[0] || '';

  return {
    id: String(source.id),
    dbId: source.id,
    slug: source.slug || String(source.id),
    sku: source.sku || '',
    name: source.name,
    badge: source.badge || collectionLabel,
    category: `${categoryName} / ${collectionLabel}`,
    categoryId: source.categoryId || source.Category?.id || null,
    categoryName,
    city: source.city || '',
    collectionKey: source.collectionKey || 'tam-giac-core',
    collectionLabel,
    type: source.type || categoryName,
    material: source.material || '',
    fit: source.fit || '',
    note: source.note || '',
    image,
    gallery: gallery.length ? gallery : [image].filter(Boolean),
    price: moneyToNumber(source.price),
    stock: Number(source.stock || 0),
    descriptionShort: source.description || '',
    descriptionLong: Array.isArray(descriptionLong) ? descriptionLong : [],
    searchText: String(source.searchText || source.name || '').toLowerCase(),
    isActive: Boolean(source.isActive)
  };
};

const buildCollectionSummary = (products) => {
  const grouped = new Map();

  products.forEach((product) => {
    const key = product.collectionKey || 'tam-giac-core';
    const current = grouped.get(key) || {
      key,
      label: product.collectionLabel || 'Tam Giac',
      city: product.city || '',
      badge: product.badge || product.collectionLabel || 'Tam Giac',
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

  return {
    id: source.id,
    reference: createOrderReference(source.id),
    status: source.status || 'pending',
    paymentMethod: source.paymentMethod || 'cod',
    paymentLabel: paymentLabels[source.paymentMethod] || source.paymentMethod || 'Payment',
    totalAmount: moneyToNumber(source.totalAmount),
    subtotalAmount: moneyToNumber(source.subtotalAmount),
    deliveryFee: moneyToNumber(source.deliveryFee),
    itemCount: Number(source.itemCount || 0),
    createdAt: source.createdAt,
    customerName: source.customerName || '',
    customerEmail: source.customerEmail || '',
    customerPhone: source.customerPhone || '',
    orderNote: source.orderNote || '',
    shippingAddress: source.shippingAddress || null,
    items: items.map((item) => {
      const product = item.Product && typeof item.Product.get === 'function'
        ? item.Product.get({ plain: true })
        : item.Product;

      return {
        id: item.id,
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        price: moneyToNumber(item.price),
        productName: product?.name || 'Product',
        productImage: product?.imageUrl || '',
        productSlug: product?.slug || String(item.productId || '')
      };
    })
  };
};

module.exports = {
  buildCollectionSummary,
  createOrderReference,
  moneyToNumber,
  paymentLabels,
  safeJsonParse,
  serializeOrder,
  serializeProduct
};
