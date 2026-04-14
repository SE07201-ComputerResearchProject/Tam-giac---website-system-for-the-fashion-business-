(function () {
  function getCatalogPromise() {
    if (window.TamGiacCatalogReady && typeof window.TamGiacCatalogReady.then === "function") {
      return window.TamGiacCatalogReady;
    }

    return Promise.resolve(window.TamGiacCatalog || null);
  }

  function getSearchInput() {
    return document.querySelector('.search-bar input[name="search"]');
  }

  function getProductLink(product) {
    return "product.html?id=" + encodeURIComponent(product.id);
  }

  function getProductImageAttributes(index, options) {
    var mode = (options && options.imageMode) || "default";

    if (mode === "home-primary") {
      if (index < 4) {
        return 'loading="eager" fetchpriority="high" decoding="async"';
      }
      if (index < 8) {
        return 'loading="eager" fetchpriority="auto" decoding="async"';
      }
      return 'loading="lazy" fetchpriority="auto" decoding="async"';
    }

    if (mode === "home-secondary") {
      if (index < 4) {
        return 'loading="eager" fetchpriority="auto" decoding="async"';
      }
      return 'loading="lazy" fetchpriority="auto" decoding="async"';
    }

    if (mode === "shop-grid") {
      if (index < 8) {
        return 'loading="eager" fetchpriority="auto" decoding="async"';
      }
      return 'loading="lazy" fetchpriority="auto" decoding="async"';
    }

    if (mode === "related") {
      return 'loading="eager" fetchpriority="auto" decoding="async"';
    }

    return 'loading="lazy" fetchpriority="auto" decoding="async"';
  }

  function createProductCard(catalog, product, index, options) {
    var imageAttributes = getProductImageAttributes(index, options);

    return [
      '<div class="product" data-product-id="' + product.id + '">',
      '<a class="product-media" href="' + getProductLink(product) + '">',
      '<span class="product-badge">' + (product.badge || "Tam Giac") + '</span>',
      '<img src="' + product.image + '" alt="' + product.name + '" ' + imageAttributes + '>',
      '</a>',
      '<div class="product-detail">',
      "<h3>" + (product.category || "Catalog") + "</h3>",
      "<h2>" + product.name + "</h2>",
      '<div class="product-note">' + (product.note || product.descriptionShort || "") + "</div>",
      '<div class="product-actions">',
      '<a href="' + getProductLink(product) + '" class="product-detail-link">View details</a>',
      '<a href="#" data-add-to-cart="true">Add to cart</a>',
      "<p>" + catalog.formatPrice(product.price) + "</p>",
      "</div>",
      "</div>",
      "</div>"
    ].join("");
  }

  function prewarmImages(products, limit) {
    if (!Array.isArray(products) || !products.length) {
      return;
    }

    var seen = Object.create(null);
    var sources = products
      .map(function (product) {
        return product && product.image;
      })
      .filter(function (src) {
        if (!src || seen[src]) {
          return false;
        }
        seen[src] = true;
        return true;
      })
      .slice(0, Math.max(0, limit || 0));

    if (!sources.length) {
      return;
    }

    function warm() {
      sources.forEach(function (src) {
        var img = new Image();
        img.decoding = "async";
        img.src = src;
      });
    }

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(warm, { timeout: 1200 });
      return;
    }

    window.setTimeout(warm, 180);
  }

  function renderProductList(catalog, container, products, options) {
    if (!container) {
      return;
    }

    if (!products.length) {
      container.innerHTML = '<div class="catalog-empty">No products are available right now.</div>';
      return;
    }

    container.innerHTML = products.map(function (product, index) {
      return createProductCard(catalog, product, index, options);
    }).join("");
  }

  function ensureShopPanel(shopSection, content) {
    var panel = shopSection.querySelector(".shop-catalog-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "shop-catalog-panel";
      content.parentNode.insertBefore(panel, content);
      panel.appendChild(content);
    }

    return panel;
  }

  function enhanceShopCards(container) {
    if (!container) {
      return;
    }

    var cards = Array.prototype.slice.call(container.querySelectorAll(".product"));
    if (!cards.length) {
      return;
    }

    var supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var observer = null;

    if (container._shopObserver && typeof container._shopObserver.disconnect === "function") {
      container._shopObserver.disconnect();
      container._shopObserver = null;
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      }, {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      });
      container._shopObserver = observer;
    }

    cards.forEach(function (card, index) {
      card.style.setProperty("--shop-delay", Math.min(index, 8) * 55 + "ms");

      if (observer) {
        observer.observe(card);
      } else {
        card.classList.add("is-visible");
      }

      if (!supportsHover) {
        return;
      }

      card.addEventListener("pointermove", function (event) {
        var bounds = card.getBoundingClientRect();
        var offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        var offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        card.style.setProperty("--shop-rotate-y", offsetX * 8 + "deg");
        card.style.setProperty("--shop-rotate-x", offsetY * -7 + "deg");
        card.style.setProperty("--shop-shift-y", "-10px");
        card.style.setProperty("--shop-scale", "1.01");
      }, { passive: true });

      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--shop-rotate-y", "0deg");
        card.style.setProperty("--shop-rotate-x", "0deg");
        card.style.setProperty("--shop-shift-y", "0px");
        card.style.setProperty("--shop-scale", "1");
      });
    });
  }

  function renderHomePage(catalog) {
    var slider = document.querySelector(".slider");
    var homeSections = document.querySelectorAll("main .new-product-section:not(.shop)");

    if (!slider || homeSections.length < 2) {
      return;
    }

    var trending = catalog.products.slice(0, 8);
    var recommended = catalog.products.slice(8, 16).length ? catalog.products.slice(8, 16) : trending;

    homeSections[0].querySelector(".product-section-heading h2").innerHTML = 'Fresh from SQL Server <img src="img/icons/increase.png">';
    homeSections[0].querySelector(".product-section-heading h3").textContent = "The homepage is now reading products from the backend catalog.";
    renderProductList(catalog, homeSections[0].querySelector(".product-content"), trending, { imageMode: "home-primary" });

    homeSections[1].querySelector(".product-section-heading h2").innerHTML = 'Admin-managed picks <img src="img/icons/good_quality.png">';
    homeSections[1].querySelector(".product-section-heading h3").textContent = "Products added in the admin panel appear here automatically.";
    renderProductList(catalog, homeSections[1].querySelector(".product-content"), recommended, { imageMode: "home-secondary" });
    prewarmImages(trending.concat(recommended), 12);

    var slides = document.querySelectorAll(".slider-text");
    if (slides[0]) {
      slides[0].querySelector("h3").textContent = "Connected catalog";
      slides[0].querySelector("h2").textContent = "Products now come from the backend";
      slides[0].querySelector("a").textContent = "Shop now";
      slides[0].querySelector("a").setAttribute("href", "shop.html");
    }
  }

  function renderShopPage(catalog) {
    var shopSection = document.querySelector(".new-product-section.shop");
    if (!shopSection) {
      return;
    }

    var content = shopSection.querySelector(".product-content");
    var panel = ensureShopPanel(shopSection, content);
    var sidebarList = shopSection.querySelector(".sidebar-widget ul");
    var loadMoreButton = document.querySelector(".load-more a");
    var amountInput = document.getElementById("amount");
    var sliderNode = document.getElementById("slider-range");
    var searchInput = getSearchInput();
    var url = new URL(window.location.href);
    var requestedCollection = url.searchParams.get("collection") || "all";
    var collections = catalog.getCollectionCounts();
    var validCollections = collections.map(function (collection) {
      return collection.key;
    });
    var prices = catalog.products.map(function (product) {
      return Number(product.price || 0);
    });
    var minPrice = prices.length ? Math.min.apply(Math, prices) : 0;
    var maxPrice = prices.length ? Math.max.apply(Math, prices) : 0;
    var roundedMaxPrice = Math.ceil((maxPrice || 100000) / 100000) * 100000;
    var state = {
      collection: validCollections.indexOf(requestedCollection) !== -1 ? requestedCollection : "all",
      query: "",
      minPrice: minPrice,
      maxPrice: roundedMaxPrice,
      visibleCount: 12
    };

    var toolbar = document.createElement("div");
    toolbar.className = "catalog-toolbar";
    toolbar.innerHTML = [
      '<div class="catalog-summary">',
      '<span class="catalog-kicker">Connected catalog</span>',
      '<strong>Curated pieces, cleaner browsing</strong>',
      '<p>Filter by collection, search intent, or price range without leaving the page.</p>',
      "</div>",
      '<div class="catalog-state"></div>'
    ].join("");
    panel.insertBefore(toolbar, content);

    if (searchInput) {
      searchInput.placeholder = "Search by product or category...";
      if (searchInput.form) {
        searchInput.form.addEventListener("submit", function (event) {
          event.preventDefault();
        });
      }
      searchInput.addEventListener("input", function (event) {
        state.query = String(event.target.value || "").trim().toLowerCase();
        state.visibleCount = 12;
        renderCurrentState();
      });
    }

    if (sidebarList) {
      sidebarList.innerHTML = [
        '<li><a href="#" class="sidebar-filter-link" data-collection="all">All <span class="sidebar-count">' + catalog.products.length + "</span></a></li>"
      ].concat(collections.map(function (collection) {
        return '<li><a href="#" class="sidebar-filter-link" data-collection="' + collection.key + '">' + collection.label + ' <span class="sidebar-count">' + collection.count + "</span></a></li>";
      })).join("");

      sidebarList.addEventListener("click", function (event) {
        var link = event.target.closest(".sidebar-filter-link");
        if (!link) {
          return;
        }

        event.preventDefault();
        state.collection = link.dataset.collection || "all";
        state.visibleCount = 12;
        renderCurrentState();
      });
    }

    function setAmountLabel() {
      if (amountInput) {
        amountInput.value = catalog.formatPrice(state.minPrice) + " - " + catalog.formatPrice(state.maxPrice);
      }
    }

    function getFilteredProducts() {
      return catalog.products.filter(function (product) {
        var matchesCollection = state.collection === "all" || product.collectionKey === state.collection;
        var matchesQuery = !state.query || product.searchText.indexOf(state.query) !== -1;
        var matchesPrice = Number(product.price) >= state.minPrice && Number(product.price) <= state.maxPrice;
        return matchesCollection && matchesQuery && matchesPrice;
      });
    }

    function renderCurrentState() {
      var filtered = getFilteredProducts();
      var visible = filtered.slice(0, state.visibleCount);
      var stateNode = toolbar.querySelector(".catalog-state");
      var activeCollection = collections.find(function (collection) {
        return collection.key === state.collection;
      });
      var activeLabel = state.collection === "all"
        ? "All collections"
        : (activeCollection ? activeCollection.label : state.collection);

      renderProductList(catalog, content, visible, { imageMode: "shop-grid" });
      enhanceShopCards(content);
      prewarmImages(filtered.slice(0, Math.min(filtered.length, state.visibleCount + 8)), state.visibleCount + 8);

      if (stateNode) {
        stateNode.innerHTML = [
          '<span class="catalog-state-chip">' + activeLabel + "</span>",
          '<strong>' + visible.length + "</strong>",
          "<span>/ " + filtered.length + " products</span>"
        ].join(" ");
      }

      if (sidebarList) {
        sidebarList.querySelectorAll(".sidebar-filter-link").forEach(function (link) {
          link.classList.toggle("is-active", (link.dataset.collection || "all") === state.collection);
        });
      }

      if (loadMoreButton) {
        if (visible.length >= filtered.length) {
          loadMoreButton.textContent = "All shown";
          loadMoreButton.classList.add("is-disabled");
        } else {
          loadMoreButton.textContent = "Load more";
          loadMoreButton.classList.remove("is-disabled");
        }
      }
    }

    if (loadMoreButton) {
      loadMoreButton.addEventListener("click", function (event) {
        event.preventDefault();
        var filtered = getFilteredProducts();
        if (state.visibleCount >= filtered.length) {
          return;
        }

        state.visibleCount += 12;
        renderCurrentState();
      });
    }

    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.slider && sliderNode) {
      window.jQuery(sliderNode).slider({
        range: true,
        min: minPrice,
        max: roundedMaxPrice,
        step: 100000,
        values: [state.minPrice, state.maxPrice],
        slide: function (_, ui) {
          state.minPrice = ui.values[0];
          state.maxPrice = ui.values[1];
          setAmountLabel();
        },
        change: function (_, ui) {
          state.minPrice = ui.values[0];
          state.maxPrice = ui.values[1];
          setAmountLabel();
          state.visibleCount = 12;
          renderCurrentState();
        }
      });
    }

    setAmountLabel();
    renderCurrentState();
  }

  function initProductGallery() {
    if (!(window.jQuery && window.jQuery.fn && window.jQuery.fn.fancybox)) {
      return;
    }

    window.jQuery(".fancybox").fancybox({
      openEffect: "none",
      closeEffect: "none",
      prevEffect: "none",
      nextEffect: "none",
      closeBtn: false,
      helpers: {
        title: { type: "inside" },
        buttons: {}
      }
    });
  }

  function renderProductPage(catalog) {
    var singleProduct = document.querySelector(".single-product");
    if (!singleProduct) {
      return;
    }

    if (!catalog.products.length) {
      singleProduct.innerHTML = "<p>Product data is not available yet.</p>";
      return;
    }

    var url = new URL(window.location.href);
    var currentProduct = catalog.getProductById(url.searchParams.get("id")) || catalog.products[0];
    var related = catalog.products.filter(function (product) {
      return product.id !== currentProduct.id && product.categoryName === currentProduct.categoryName;
    }).slice(0, 4);

    document.title = currentProduct.name + " | Tam Giac";
    singleProduct.dataset.productId = currentProduct.id;

    var largeImage = singleProduct.querySelector(".larg-img img");
    if (largeImage) {
      largeImage.setAttribute("src", currentProduct.image);
      largeImage.setAttribute("alt", currentProduct.name);
    }

    var smallImages = singleProduct.querySelector(".small-img");
    if (smallImages) {
      smallImages.innerHTML = currentProduct.gallery.map(function (image, index) {
        return [
          '<a class="fancybox" rel="group" href="' + image + '" title="' + currentProduct.name + ' view ' + (index + 1) + '">',
          '<img src="' + image + '" alt="' + currentProduct.name + ' view ' + (index + 1) + '">',
          "</a>"
        ].join("");
      }).join("");
    }

    singleProduct.querySelector(".product-name h2").textContent = currentProduct.name;
    singleProduct.querySelector(".product-price h3").textContent = catalog.formatPrice(currentProduct.price);
    singleProduct.querySelector(".product-description p").textContent = currentProduct.descriptionShort;

    var longDescription = document.querySelector(".product-long-description");
    if (longDescription) {
      var paragraphs = longDescription.querySelectorAll("p");
      if (paragraphs[0]) {
        paragraphs[0].textContent = currentProduct.descriptionLong[0] || currentProduct.descriptionShort;
      }
      if (paragraphs[1]) {
        paragraphs[1].textContent = currentProduct.descriptionLong[1] || "Managed from the backend product catalog.";
      }
    }

    var metaItems = singleProduct.querySelectorAll(".product-meta p");
    if (metaItems[0]) {
      metaItems[0].innerHTML = "<b>Category: </b>" + currentProduct.category;
    }
    if (metaItems[1]) {
      metaItems[1].innerHTML = "<b>Storefront: </b>Connected to backend catalog";
    }

    var relatedSection = document.querySelector("main .new-product-section .product-content");
    if (relatedSection) {
      renderProductList(catalog, relatedSection, related.length ? related : catalog.products.slice(0, 4), { imageMode: "related" });
    }

    initProductGallery();
  }

  document.addEventListener("DOMContentLoaded", function () {
    getCatalogPromise().then(function (catalog) {
      if (!catalog) {
        return;
      }

      renderHomePage(catalog);
      renderShopPage(catalog);
      renderProductPage(catalog);
    });
  });
})();
