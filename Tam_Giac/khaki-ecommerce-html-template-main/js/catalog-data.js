(function () {
  var API_BASE = "/api";

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
  }

  function normalizeCatalog(payload) {
    var products = Array.isArray(payload && payload.products) ? payload.products : [];
    var collections = Array.isArray(payload && payload.collections) ? payload.collections : [];
    var productMap = products.reduce(function (map, product) {
      map[product.id] = product;
      return map;
    }, {});

    return {
      products: products,
      collections: collections,
      getProductById: function (id) {
        return productMap[id] || null;
      },
      getCollectionCounts: function () {
        if (collections.length) {
          return collections.map(function (collection) {
            return {
              key: collection.key,
              label: collection.label,
              count: collection.count
            };
          });
        }

        return [];
      },
      formatPrice: formatPrice
    };
  }

  async function loadCatalog() {
    try {
      var response = await fetch(API_BASE + "/products/catalog");
      if (!response.ok) {
        throw new Error("Could not load catalog");
      }

      var data = await response.json();
      window.TamGiacCatalog = normalizeCatalog(data);
      return window.TamGiacCatalog;
    } catch (error) {
      window.TamGiacCatalogError = error;
      window.TamGiacCatalog = normalizeCatalog({ products: [], collections: [] });
      return window.TamGiacCatalog;
    }
  }

  window.TamGiacCatalogReady = loadCatalog();
})();
