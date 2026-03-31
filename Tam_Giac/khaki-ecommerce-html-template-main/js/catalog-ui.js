(function () {
  var catalog = window.TamGiacCatalog;

  if (!catalog) {
    return;
  }

  function formatPrice(value) {
    return catalog.formatPrice(value);
  }

  function getSearchInput() {
    return document.querySelector('.search-bar input[name="search"]');
  }

  function getProductLink(product) {
    return "product.html?id=" + encodeURIComponent(product.id);
  }

  function createProductCard(product) {
    return [
      '<div class="product" data-product-id="' + product.id + '">',
      '<a class="product-media" href="' + getProductLink(product) + '">',
      '<span class="product-badge">' + product.badge + '</span>',
      '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">',
      '</a>',
      '<div class="product-detail">',
      "<h3>" + product.category + "</h3>",
      "<h2>" + product.name + "</h2>",
      '<div class="product-note">' + product.note + "</div>",
      '<div class="product-actions">',
      '<a href="' + getProductLink(product) + '" class="product-detail-link">View details</a>',
      '<a href="#" data-add-to-cart="true">Add to cart</a>',
      "<p>" + formatPrice(product.price) + "</p>",
      "</div>",
      "</div>",
      "</div>"
    ].join("");
  }

  function renderProductList(container, products) {
    if (!container) {
      return;
    }

    container.innerHTML = products.map(createProductCard).join("");
  }

  function renderHomePage() {
    var slider = document.querySelector(".slider");
    var homeSections = document.querySelectorAll("main .new-product-section:not(.shop)");

    if (!slider || homeSections.length < 2) {
      return;
    }

    var trending = catalog.products.slice(0, 8);
    var recommended = catalog.products.slice(28, 36);

    homeSections[0].querySelector(".product-section-heading h2").innerHTML = 'Asian city highlights <img src="img/icons/increase.png">';
    homeSections[0].querySelector(".product-section-heading h3").textContent = "108 fresh pieces inspired by Seoul, Tokyo, Shanghai, and Saigon";
    renderProductList(homeSections[0].querySelector(".product-content"), trending);

    homeSections[1].querySelector(".product-section-heading h2").innerHTML = 'Curated for urban wardrobes <img src="img/icons/good_quality.png">';
    homeSections[1].querySelector(".product-section-heading h3").textContent = "A blend of minimal tailoring and layered Asian city dressing";
    renderProductList(homeSections[1].querySelector(".product-content"), recommended);

    var slides = document.querySelectorAll(".slider-text");
    if (slides[0]) {
      slides[0].querySelector("h3").textContent = "Seoul capsule";
      slides[0].querySelector("h2").textContent = "Layering for city nights";
      slides[0].querySelector("a").textContent = "Explore now";
      slides[0].querySelector("a").setAttribute("href", "shop.html?collection=seoul-street");
    }
    if (slides[1]) {
      slides[1].querySelector("h3").textContent = "Tokyo minimal";
      slides[1].querySelector("h2").textContent = "Quiet lines, strong silhouette";
      slides[1].querySelector("a").textContent = "View collection";
      slides[1].querySelector("a").setAttribute("href", "shop.html?collection=tokyo-minimal");
    }
    if (slides[2]) {
      slides[2].querySelector("h3").textContent = "Saigon x Shanghai";
      slides[2].querySelector("h2").textContent = "Modern daily wardrobe";
      slides[2].querySelector("a").textContent = "Find your style";
      slides[2].querySelector("a").setAttribute("href", "shop.html");
    }

    var collections = document.querySelector(".collection");
    if (collections) {
      var menCollection = collections.querySelector(".men-collection");
      var womenCollection = collections.querySelector(".women-collection");

      if (menCollection) {
        menCollection.innerHTML = [
          '<div class="collection-copy">',
          "<span>Seoul / Tokyo</span>",
          "<h2>Asian Street Layers</h2>",
          "<p>Bomber, overshirt, wide trousers and quiet sneakers for a sharper daily look.</p>",
          '<a href="shop.html?collection=seoul-street">View this line</a>',
          "</div>"
        ].join("");
      }

      if (womenCollection) {
        womenCollection.innerHTML = [
          '<div class="collection-copy">',
          "<span>Kyoto / Shanghai</span>",
          "<h2>Soft Tailored Edit</h2>",
          "<p>Slip dress, cropped blazer and pleated silhouettes with calm Asian polish.</p>",
          '<a href="shop.html?collection=kyoto-linen">Explore the style</a>',
          "</div>"
        ].join("");
      }
    }
  }

  function renderShopPage() {
    var shopSection = document.querySelector(".new-product-section.shop");
    if (!shopSection) {
      return;
    }

    var content = shopSection.querySelector(".product-content");
    var sidebarList = shopSection.querySelector(".sidebar-widget ul");
    var loadMoreButton = document.querySelector(".load-more a");
    var amountInput = document.getElementById("amount");
    var sliderNode = document.getElementById("slider-range");
    var searchInput = getSearchInput();
    var url = new URL(window.location.href);
    var requestedCollection = url.searchParams.get("collection") || "all";
    var validCollections = catalog.collections.map(function (collection) {
      return collection.key;
    });
    var maxPrice = Math.max.apply(Math, catalog.products.map(function (product) {
      return product.price;
    }));
    var minPrice = Math.min.apply(Math, catalog.products.map(function (product) {
      return product.price;
    }));
    var roundedMaxPrice = Math.ceil(maxPrice / 100000) * 100000;
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
      '<div class="catalog-summary">Asian wardrobe / ' + catalog.products.length + ' products</div>',
      '<div class="catalog-state"></div>'
    ].join("");
    content.parentNode.insertBefore(toolbar, content);

    if (searchInput) {
      searchInput.placeholder = "Search blazer, tee, bag, Seoul, Tokyo...";
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
      var collectionItems = catalog.getCollectionCounts();
      sidebarList.innerHTML = [
        '<li><a href="#" class="sidebar-filter-link" data-collection="all">All <span class="sidebar-count">' + catalog.products.length + "</span></a></li>"
      ].concat(collectionItems.map(function (collection) {
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
      if (!amountInput) {
        return;
      }
      amountInput.value = formatPrice(state.minPrice) + " - " + formatPrice(state.maxPrice);
    }

    function getFilteredProducts() {
      return catalog.products.filter(function (product) {
        var matchesCollection = state.collection === "all" || product.collectionKey === state.collection;
        var matchesQuery = !state.query || product.searchText.indexOf(state.query) !== -1;
        var matchesPrice = product.price >= state.minPrice && product.price <= state.maxPrice;
        return matchesCollection && matchesQuery && matchesPrice;
      });
    }

    function renderCurrentState() {
      var filtered = getFilteredProducts();
      var visible = filtered.slice(0, state.visibleCount);
      var stateNode = toolbar.querySelector(".catalog-state");

      if (sidebarList) {
        sidebarList.querySelectorAll(".sidebar-filter-link").forEach(function (link) {
          link.classList.toggle("is-active", (link.dataset.collection || "all") === state.collection);
        });
      }

      if (!filtered.length) {
        content.innerHTML = '<div class="catalog-empty">No matching products were found. Try widening the price range or changing your search.</div>';
      } else {
        renderProductList(content, visible);
      }

      if (stateNode) {
        stateNode.textContent = "Showing " + Math.min(visible.length, filtered.length) + " / " + filtered.length + " products";
      }

      if (loadMoreButton) {
        if (visible.length >= filtered.length || !filtered.length) {
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
      setAmountLabel();
    } else {
      setAmountLabel();
    }

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

  function renderProductPage() {
    var singleProduct = document.querySelector(".single-product");
    if (!singleProduct) {
      return;
    }

    var url = new URL(window.location.href);
    var currentProduct = catalog.getProductById(url.searchParams.get("id")) || catalog.products[0];
    var related = catalog.products.filter(function (product) {
      return product.id !== currentProduct.id && (
        product.collectionKey === currentProduct.collectionKey ||
        product.type === currentProduct.type
      );
    }).slice(0, 4);

    document.title = currentProduct.name + " | Tam Giac";
    singleProduct.dataset.productId = currentProduct.id;

    var breadcrumbItems = document.querySelectorAll(".breadcrumb li");
    if (breadcrumbItems.length >= 5) {
      breadcrumbItems[2].innerHTML = '<a href="shop.html">Shop</a>';
      breadcrumbItems[4].textContent = currentProduct.name;
    }

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
    singleProduct.querySelector(".product-price h3").textContent = formatPrice(currentProduct.price);
    singleProduct.querySelector(".product-description p").textContent = currentProduct.descriptionShort;

    var longDescription = document.querySelector(".product-long-description");
    if (longDescription) {
      var paragraphs = longDescription.querySelectorAll("p");
      longDescription.querySelector("h3").textContent = "Style Story";
      if (paragraphs[0]) {
        paragraphs[0].textContent = currentProduct.descriptionLong[0];
      }
      if (paragraphs[1]) {
        paragraphs[1].textContent = currentProduct.descriptionLong[1];
      }
    }

    var cartButton = singleProduct.querySelector('#cart-form input[type="submit"]');
    if (cartButton) {
      cartButton.value = "Add to cart";
    }

    var metaItems = singleProduct.querySelectorAll(".product-meta p");
    if (metaItems[0]) {
      metaItems[0].innerHTML = "<b>Category: </b>" + currentProduct.category;
    }
    if (metaItems[1]) {
      metaItems[1].innerHTML = "<b>Style DNA: </b>" + currentProduct.city + ", " + currentProduct.material + ", " + currentProduct.fit;
    }

    var wishlistText = singleProduct.querySelector("#wishlist-form .form-group");
    if (wishlistText) {
      wishlistText.innerHTML = '<input type="checkbox" class="wishlist" name="wishlist"> Save to wishlist';
    }

    var relatedSection = document.querySelector("main .new-product-section .product-content");
    var relatedHeading = document.querySelector("main .new-product-section .product-section-heading");
    if (relatedSection && relatedHeading) {
      relatedHeading.querySelector("h2").innerHTML = 'Complete the mood <img src="img/icons/good_quality.png">';
      relatedHeading.querySelector("h3").textContent = "More options that match the same Asian-inspired outfit direction";
      renderProductList(relatedSection, related);
    }

    initProductGallery();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderHomePage();
    renderShopPage();
    renderProductPage();
  });
})();
