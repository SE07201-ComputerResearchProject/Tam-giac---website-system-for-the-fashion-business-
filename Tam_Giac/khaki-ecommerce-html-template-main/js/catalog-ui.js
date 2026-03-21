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
      '<a href="#" data-add-to-cart="true">Them vao gio</a>',
      "<p>" + formatPrice(product.price) + "</p>",
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

    homeSections[0].querySelector(".product-section-heading h2").innerHTML = 'Goc mac chau A noi bat <img src="img/icons/increase.png">';
    homeSections[0].querySelector(".product-section-heading h3").textContent = "108 thiet ke moi lay cam hung tu Seoul, Tokyo, Shanghai, Saigon";
    renderProductList(homeSections[0].querySelector(".product-content"), trending);

    homeSections[1].querySelector(".product-section-heading h2").innerHTML = 'De xuat cho gu thanh thi <img src="img/icons/good_quality.png">';
    homeSections[1].querySelector(".product-section-heading h3").textContent = "Pha tron minimal, tailoring va urban layer theo tinh than chau A";
    renderProductList(homeSections[1].querySelector(".product-content"), recommended);

    var slides = document.querySelectorAll(".slider-text");
    if (slides[0]) {
      slides[0].querySelector("h3").textContent = "Seoul capsule";
      slides[0].querySelector("h2").textContent = "Layering for city nights";
      slides[0].querySelector("a").textContent = "Kham pha ngay";
      slides[0].querySelector("a").setAttribute("href", "shop.html?collection=seoul-street");
    }
    if (slides[1]) {
      slides[1].querySelector("h3").textContent = "Tokyo minimal";
      slides[1].querySelector("h2").textContent = "Quiet lines, strong silhouette";
      slides[1].querySelector("a").textContent = "Xem bo suu tap";
      slides[1].querySelector("a").setAttribute("href", "shop.html?collection=tokyo-minimal");
    }
    if (slides[2]) {
      slides[2].querySelector("h3").textContent = "Saigon x Shanghai";
      slides[2].querySelector("h2").textContent = "Modern daily wardrobe";
      slides[2].querySelector("a").textContent = "Tim phong cach";
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
          '<a href="shop.html?collection=seoul-street">Xem line nay</a>',
          "</div>"
        ].join("");
      }

      if (womenCollection) {
        womenCollection.innerHTML = [
          '<div class="collection-copy">',
          "<span>Kyoto / Shanghai</span>",
          "<h2>Soft Tailored Edit</h2>",
          "<p>Slip dress, cropped blazer and pleated silhouettes with calm Asian polish.</p>",
          '<a href="shop.html?collection=kyoto-linen">Kham pha phong cach</a>',
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
      '<div class="catalog-summary">Asian wardrobe / ' + catalog.products.length + ' san pham</div>',
      '<div class="catalog-state"></div>'
    ].join("");
    content.parentNode.insertBefore(toolbar, content);

    if (searchInput) {
      searchInput.placeholder = "Tim blazer, tee, bag, Seoul, Tokyo...";
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
        '<li><a href="#" class="sidebar-filter-link" data-collection="all">Tat ca <span class="sidebar-count">' + catalog.products.length + "</span></a></li>"
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
        content.innerHTML = '<div class="catalog-empty">Khong tim thay san pham phu hop. Thu mo rong khoang gia hoac doi tu khoa tim kiem.</div>';
      } else {
        renderProductList(content, visible);
      }

      if (stateNode) {
        stateNode.textContent = "Dang xem " + Math.min(visible.length, filtered.length) + " / " + filtered.length + " san pham";
      }

      if (loadMoreButton) {
        if (visible.length >= filtered.length || !filtered.length) {
          loadMoreButton.textContent = "Da hien het";
          loadMoreButton.classList.add("is-disabled");
        } else {
          loadMoreButton.textContent = "Xem them";
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
      cartButton.value = "Them vao gio";
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
      wishlistText.innerHTML = '<input type="checkbox" class="wishlist" name="wishlist"> Luu vao yeu thich';
    }

    var relatedSection = document.querySelector("main .new-product-section .product-content");
    var relatedHeading = document.querySelector("main .new-product-section .product-section-heading");
    if (relatedSection && relatedHeading) {
      relatedHeading.querySelector("h2").innerHTML = 'Mac cung tinh than <img src="img/icons/good_quality.png">';
      relatedHeading.querySelector("h3").textContent = "Them lua chon cung mood de hoan chinh set do chau A";
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
