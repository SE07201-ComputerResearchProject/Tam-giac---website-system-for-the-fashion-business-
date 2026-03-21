(function () {
  function photoUrl(id) {
    return "https://images.pexels.com/photos/" + id + "/pexels-photo-" + id + ".jpeg?auto=compress&cs=tinysrgb&w=900";
  }

  var imagePool = [
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
    photoUrl(15669734),
    photoUrl(5607219),
    photoUrl(35547724),
    photoUrl(29096398),
    photoUrl(31450726),
    photoUrl(31450739),
    photoUrl(22432990),
    photoUrl(22432989),
    photoUrl(36364966),
    photoUrl(36364964),
    photoUrl(36365228),
    photoUrl(27127411),
    photoUrl(9381693)
  ];

  var collections = [
    {
      key: "seoul-street",
      city: "Seoul",
      label: "Seoul Street",
      badge: "Seoul Edit",
      story: "Layering that feels cool, sharp and ready for city nights.",
      mood: "street layering",
      priceOffset: 140000
    },
    {
      key: "tokyo-minimal",
      city: "Tokyo",
      label: "Tokyo Minimal",
      badge: "Tokyo Minimal",
      story: "Quiet silhouettes, clean structure and precise proportions.",
      mood: "minimal precision",
      priceOffset: 220000
    },
    {
      key: "shanghai-modern",
      city: "Shanghai",
      label: "Shanghai Modern",
      badge: "Shanghai Tailor",
      story: "Polished tailoring built for glass towers and long evenings.",
      mood: "modern tailoring",
      priceOffset: 260000
    },
    {
      key: "saigon-urban",
      city: "Saigon",
      label: "Saigon Urban",
      badge: "Saigon Daily",
      story: "Breathable pieces tuned for movement, heat and everyday style.",
      mood: "light urban comfort",
      priceOffset: 120000
    },
    {
      key: "taipei-weekend",
      city: "Taipei",
      label: "Taipei Weekend",
      badge: "Taipei Soft",
      story: "Relaxed essentials with gentle color, texture and comfort.",
      mood: "soft weekend ease",
      priceOffset: 90000
    },
    {
      key: "kyoto-linen",
      city: "Kyoto",
      label: "Kyoto Linen",
      badge: "Kyoto Linen",
      story: "Natural surfaces and calm cuts inspired by slower dressing.",
      mood: "quiet natural balance",
      priceOffset: 170000
    }
  ];

  var kinds = [
    { key: "overshirt", name: "Overshirt", type: "Outerwear", basePrice: 1290000, material: "washed twill", fit: "boxy fit", note: "Easy layer for city weather and late coffee runs." },
    { key: "bomber", name: "Bomber Jacket", type: "Outerwear", basePrice: 1890000, material: "matte nylon", fit: "cropped volume", note: "A stronger shape that sharpens everyday looks." },
    { key: "tee", name: "Boxy Tee", type: "Top", basePrice: 590000, material: "heavy cotton", fit: "relaxed shoulder", note: "Clean base layer with a premium drape." },
    { key: "shirt", name: "Relaxed Shirt", type: "Top", basePrice: 790000, material: "cool poplin", fit: "easy straight fit", note: "Light and breathable for layering or solo wear." },
    { key: "polo", name: "Knit Polo", type: "Top", basePrice: 990000, material: "soft knit", fit: "trim relaxed fit", note: "Refined texture for smart casual styling." },
    { key: "trousers", name: "Wide Trousers", type: "Bottom", basePrice: 1190000, material: "fluid suiting", fit: "wide straight fit", note: "Moves well and lengthens the silhouette." },
    { key: "cargo", name: "Cargo Pants", type: "Bottom", basePrice: 1290000, material: "structured cotton", fit: "relaxed taper", note: "Utility details without losing a clean line." },
    { key: "jeans", name: "Straight Jeans", type: "Bottom", basePrice: 1390000, material: "dry denim", fit: "straight fit", note: "A reliable foundation for minimalist wardrobes." },
    { key: "skirt", name: "Pleated Skirt", type: "Bottom", basePrice: 1090000, material: "light crepe", fit: "swing pleat", note: "Soft movement with city-ready structure." },
    { key: "blazer", name: "Cropped Blazer", type: "Outerwear", basePrice: 1990000, material: "tech suiting", fit: "sharp cropped fit", note: "Tailored attitude with a fashion-forward proportion." },
    { key: "dress", name: "Slip Dress", type: "Dress", basePrice: 1490000, material: "soft satin", fit: "column fit", note: "Simple enough for day, sleek enough for night." },
    { key: "hoodie", name: "Layer Hoodie", type: "Outerwear", basePrice: 1190000, material: "brushed fleece", fit: "relaxed fit", note: "Balanced volume for modern casual layering." },
    { key: "sneakers", name: "Low Sneakers", type: "Footwear", basePrice: 1590000, material: "mixed leather", fit: "low profile", note: "City sneakers with a clean and versatile shape." },
    { key: "loafers", name: "Soft Loafers", type: "Footwear", basePrice: 1690000, material: "polished vegan leather", fit: "soft step", note: "Sharp enough for tailoring, easy enough for daily use." },
    { key: "tote", name: "Canvas Tote", type: "Accessory", basePrice: 690000, material: "heavy canvas", fit: "daily carry", note: "Carries a laptop, notebook and the rest of the day." },
    { key: "crossbody", name: "Crossbody Bag", type: "Accessory", basePrice: 990000, material: "waterproof shell", fit: "compact utility", note: "Compact size with enough room for essentials." },
    { key: "glasses", name: "Tinted Glasses", type: "Accessory", basePrice: 790000, material: "acetate frame", fit: "light frame", note: "A quick style lift for monochrome and neutral looks." },
    { key: "watch", name: "Minimal Watch", type: "Accessory", basePrice: 1890000, material: "brushed steel", fit: "slim profile", note: "Subtle polish for daily dressing." }
  ];

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tam-giac-item";
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
  }

  function getGallery(index) {
    return Array.from({ length: 4 }, function (_, offset) {
      return imagePool[(index + offset) % imagePool.length];
    });
  }

  var products = collections.reduce(function (allProducts, collection, collectionIndex) {
    kinds.forEach(function (kind, kindIndex) {
      var absoluteIndex = (collectionIndex * kinds.length) + kindIndex;
      var image = imagePool[absoluteIndex % imagePool.length];
      var price = kind.basePrice + collection.priceOffset + ((kindIndex % 4) * 60000);
      var productName = collection.city + " " + kind.name;
      var id = slugify(collection.key + "-" + kind.key);

      allProducts.push({
        id: id,
        sku: "TG-" + String(absoluteIndex + 1).padStart(3, "0"),
        name: productName,
        collectionKey: collection.key,
        collectionLabel: collection.label,
        city: collection.city,
        badge: collection.badge,
        category: kind.type + " / " + collection.label,
        type: kind.type,
        material: kind.material,
        fit: kind.fit,
        note: kind.note,
        mood: collection.mood,
        image: image,
        gallery: getGallery(absoluteIndex),
        price: price,
        descriptionShort: collection.story + " " + kind.note,
        descriptionLong: [
          productName + " is designed around " + kind.fit + " and " + kind.material + ", giving the piece a strong " + collection.city + " mood without feeling difficult to wear.",
          "This piece works best with neutral layers, clean footwear and a compact accessory. It is built for wardrobes that want more Asian city influence while staying practical for everyday use."
        ],
        searchText: [
          productName,
          collection.label,
          collection.city,
          kind.type,
          kind.material,
          collection.mood
        ].join(" ").toLowerCase()
      });
    });

    return allProducts;
  }, []);

  var productMap = products.reduce(function (map, product) {
    map[product.id] = product;
    return map;
  }, {});

  function getProductById(id) {
    return productMap[id] || null;
  }

  function getCollectionCounts() {
    return collections.map(function (collection) {
      return {
        key: collection.key,
        label: collection.label,
        count: products.filter(function (product) {
          return product.collectionKey === collection.key;
        }).length
      };
    });
  }

  window.TamGiacCatalog = {
    products: products,
    collections: collections,
    getProductById: getProductById,
    getCollectionCounts: getCollectionCounts,
    formatPrice: formatPrice
  };
})();
