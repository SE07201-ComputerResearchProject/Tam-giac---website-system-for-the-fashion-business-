(function () {
  var STORAGE_KEY = "tamgiac_cart";
  var DELIVERY_FEE = 30000;

  function readCart() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getSafeQuantity(quantity) {
    return Math.max(1, Math.min(10, Number(quantity) || 1));
  }

  function parsePrice(text) {
    return Number(String(text || "").replace(/[^\d]/g, "")) || 0;
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tam-giac-item";
  }

  function findCardData(button) {
    var card = button.closest(".product");
    if (!card) {
      return null;
    }

    var title = card.querySelector("h2");
    var category = card.querySelector("h3");
    var price = card.querySelector("p");
    var image = card.querySelector("img");

    return {
      id: card.dataset.productId || slugify(title ? title.textContent : "product"),
      name: title ? title.textContent.trim() : "Tam Giac product",
      category: category ? category.textContent.trim() : "Tam Giac",
      price: parsePrice(price ? price.textContent : 0),
      image: image ? image.getAttribute("src") : "img/product/img1.jpg"
    };
  }

  function findDetailData(form) {
    var wrapper = form.closest(".single-product");
    if (!wrapper) {
      return null;
    }

    var title = wrapper.querySelector(".product-name h2");
    var price = wrapper.querySelector(".product-price h3");
    var image = wrapper.querySelector(".larg-img img");
    var category = wrapper.querySelector(".product-meta p");

    return {
      id: wrapper.dataset.productId || slugify(title ? title.textContent : "product"),
      name: title ? title.textContent.trim() : "Tam Giac product",
      category: category ? category.textContent.replace("Category:", "").trim() : "Tam Giac",
      price: parsePrice(price ? price.textContent : 0),
      image: image ? image.getAttribute("src") : "img/product/img1.jpg"
    };
  }

  function upsertCartItem(item, quantity) {
    if (!item || !item.price) {
      return;
    }

    var cart = readCart();
    var nextQuantity = getSafeQuantity(quantity);
    var existing = cart.find(function (cartItem) {
      return cartItem.id === item.id;
    });

    if (existing) {
      existing.quantity = getSafeQuantity(existing.quantity + nextQuantity);
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        quantity: nextQuantity
      });
    }

    saveCart(cart);
    syncCartUI();
  }

  function updateItemQuantity(itemId, quantity) {
    var cart = readCart()
      .map(function (item) {
        if (item.id === itemId) {
          item.quantity = getSafeQuantity(quantity);
        }
        return item;
      });

    saveCart(cart);
    syncCartUI();
  }

  function removeItem(itemId) {
    var cart = readCart().filter(function (item) {
      return item.id !== itemId;
    });

    saveCart(cart);
    syncCartUI();
  }

  function clearCart() {
    saveCart([]);
    syncCartUI();
  }

  function getCartStats() {
    var cart = readCart();
    return cart.reduce(
      function (stats, item) {
        stats.totalItems += Number(item.quantity) || 0;
        stats.totalAmount += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        return stats;
      },
      { totalItems: 0, totalAmount: 0 }
    );
  }

  function updateCartBadge() {
    var cartIcon = document.querySelectorAll(".shop-icon > .dropdown")[2];
    if (!cartIcon) {
      return;
    }

    var badge = cartIcon.querySelector(".cart-badge");
    var stats = getCartStats();

    if (!stats.totalItems) {
      if (badge) {
        badge.remove();
      }
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "cart-badge";
      cartIcon.appendChild(badge);
    }

    badge.textContent = stats.totalItems;
  }

  function renderMiniCart() {
    var menus = document.querySelectorAll(".dropdown-menu.cart-item");
    if (!menus.length) {
      return;
    }

    var cart = readCart();
    var stats = getCartStats();

    menus.forEach(function (menu) {
      if (!cart.length) {
        menu.innerHTML = [
          '<div class="mini-cart-empty">Your cart is empty.</div>',
          '<div class="mini-cart-actions"><a href="shop.html">Continue shopping</a></div>'
        ].join("");
        return;
      }

      var rows = cart
        .map(function (item) {
          var amount = item.price * item.quantity;
          return [
            "<tr>",
            '<td><img src="' + item.image + '" alt="' + item.name + '"></td>',
            "<td>" + item.name + "</td>",
            '<td class="center">' + formatPrice(item.price) + "</td>",
            '<td class="center">' + item.quantity + "</td>",
            '<td class="center">' + formatPrice(amount) + "</td>",
            "</tr>"
          ].join("");
        })
        .join("");

      menu.innerHTML = [
        '<table border="1">',
        "<thead>",
        "<tr>",
        "<th>Image</th>",
        "<th>Product Name</th>",
        '<th class="center">Price</th>',
        '<th class="center">Qty.</th>',
        '<th class="center">Amount</th>',
        "</tr>",
        "</thead>",
        "<tbody>",
        rows,
        "</tbody>",
        "</table>",
        '<div class="mini-cart-summary">',
        "<strong>Total</strong>",
        "<span>" + formatPrice(stats.totalAmount) + "</span>",
        "</div>",
        '<div class="mini-cart-actions"><a href="cart.html">Open cart</a></div>'
      ].join("");
    });
  }

  function renderCartPage() {
    var cartPage = document.querySelector(".cart-page");
    if (!cartPage) {
      return;
    }

    var tbody = cartPage.querySelector(".cart-items table tbody");
    var summary = cartPage.querySelector(".cart-summary .checkout-total ul");
    if (!tbody || !summary) {
      return;
    }

    var cart = readCart();
    var stats = getCartStats();

    if (!cart.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="cart-empty-row">Your cart is empty.</td></tr>';
      summary.innerHTML = [
        "<li>Number of Products x 0</li>",
        "<li>Number of items x 0</li>",
        "<hr>",
        '<li>Cart Total <span style="float: right;">0 đ</span></li>',
        '<li><a href="shop.html">Continue shopping</a></li>'
      ].join("");
      return;
    }

    tbody.innerHTML = cart
      .map(function (item) {
        var amount = item.price * item.quantity;
        return [
          "<tr>",
          '<td style="width: 20%;"><img src="' + item.image + '" alt="' + item.name + '"></td>',
          '<td style="width: 60%;">',
          "<h2>" + item.name + "</h2>",
          "<p>" + item.category + "</p>",
          "<br>",
          "<h3>Price: " + formatPrice(item.price) + "</h3>",
          "<br>",
          '<a href="#" class="cart-remove" data-item-id="' + item.id + '">x</a> Remove',
          "</td>",
          '<td class="qty" style="width: 15%;">',
          '<div class="prev" data-item-id="' + item.id + '">-</div>',
          '<div class="next" data-item-id="' + item.id + '">+</div>',
          '<input type="number" name="cartNumber" class="cartNumber" value="' + item.quantity + '" min="1" max="10" data-item-id="' + item.id + '">',
          "<br><br>",
          "<h3>" + formatPrice(amount) + "</h3>",
          "</td>",
          "</tr>"
        ].join("");
      })
      .join("");

    summary.innerHTML = [
      "<li>Number of Products x " + cart.length + "</li>",
      "<li>Number of items x " + stats.totalItems + "</li>",
      "<hr>",
      '<li>Cart Total <span style="float: right;">' + formatPrice(stats.totalAmount) + "</span></li>",
      '<li><a href="checkout.html">Go to Checkout</a></li>'
    ].join("");
  }

  function renderCheckoutSummary() {
    var summary = document.querySelector(".order-summary .checkout-total ul");
    if (!summary) {
      return;
    }

    var stats = getCartStats();
    var delivery = stats.totalItems ? DELIVERY_FEE : 0;
    var total = stats.totalAmount + delivery;

    var lines = summary.querySelectorAll("li");
    if (lines.length < 6) {
      return;
    }

    lines[0].innerHTML = 'Cart Amount: <span>' + formatPrice(stats.totalAmount) + "</span>";
    lines[1].innerHTML = 'Delivery Charges: <span>' + formatPrice(delivery) + "</span>";
    lines[2].innerHTML = 'Less: Discount @ 10%: <span>0 đ</span>';
    lines[3].innerHTML = 'Total Amount: <span>' + formatPrice(total) + "</span>";
  }

  function flashButton(button, text) {
    if (!button) {
      return;
    }

    var original = button.dataset.originalText || button.textContent || button.value;
    button.dataset.originalText = original;

    if ("value" in button && button.tagName === "INPUT") {
      button.value = text;
    } else {
      button.textContent = text;
    }

    window.setTimeout(function () {
      if ("value" in button && button.tagName === "INPUT") {
        button.value = original;
      } else {
        button.textContent = original;
      }
    }, 1400);
  }

  function isListingCartButton(button) {
    return !!button && (
      button.dataset.addToCart === "true" ||
      /(add to cart|them vao gio)/i.test(button.textContent || "")
    );
  }

  function bindListingButtons() {
    if (!document.body || document.body.dataset.listingCartBound === "true") {
      return;
    }

    document.body.dataset.listingCartBound = "true";

    document.addEventListener("click", function (event) {
      var button = event.target.closest(".product .product-detail a");
      if (!isListingCartButton(button)) {
        return;
      }

      event.preventDefault();
      var item = findCardData(button);
      upsertCartItem(item, 1);
      flashButton(button, "Added");
    });
  }

  function bindProductForm() {
    var form = document.querySelector("#cart-form");
    if (!form || form.dataset.cartBound === "true") {
      return;
    }

    form.dataset.cartBound = "true";
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var item = findDetailData(form);
      var quantityInput = form.querySelector(".cart-number");
      upsertCartItem(item, quantityInput ? quantityInput.value : 1);
      flashButton(form.querySelector('input[type="submit"]'), "Added");
    });

    var buyNowButton = form.querySelector(".buy-now-trigger");
    if (buyNowButton) {
      buyNowButton.addEventListener("click", function () {
        var item = findDetailData(form);
        var quantityInput = form.querySelector(".cart-number");
        upsertCartItem(item, quantityInput ? quantityInput.value : 1);
        flashButton(buyNowButton, "Opening cart");
        window.setTimeout(function () {
          window.location.href = "cart.html?source=buy-now";
        }, 150);
      });
    }
  }

  function bindCartPageEvents() {
    var cartPage = document.querySelector(".cart-page");
    if (!cartPage || cartPage.dataset.cartBound === "true") {
      return;
    }

    cartPage.dataset.cartBound = "true";

    cartPage.addEventListener("click", function (event) {
      var removeButton = event.target.closest(".cart-remove");
      if (removeButton) {
        event.preventDefault();
        removeItem(removeButton.dataset.itemId);
        return;
      }

      var prevButton = event.target.closest(".prev");
      if (prevButton) {
        var prevInput = cartPage.querySelector('.cartNumber[data-item-id="' + prevButton.dataset.itemId + '"]');
        if (!prevInput) {
          return;
        }
        updateItemQuantity(prevButton.dataset.itemId, Math.max(1, Number(prevInput.value) - 1));
        return;
      }

      var nextButton = event.target.closest(".next");
      if (nextButton) {
        var nextInput = cartPage.querySelector('.cartNumber[data-item-id="' + nextButton.dataset.itemId + '"]');
        if (!nextInput) {
          return;
        }
        updateItemQuantity(nextButton.dataset.itemId, Math.min(10, Number(nextInput.value) + 1));
      }
    });

    cartPage.addEventListener("change", function (event) {
      if (!event.target.classList.contains("cartNumber")) {
        return;
      }

      updateItemQuantity(event.target.dataset.itemId, event.target.value);
    });
  }

  function syncCartUI() {
    renderMiniCart();
    updateCartBadge();
    renderCartPage();
    renderCheckoutSummary();
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindListingButtons();
    bindProductForm();
    bindCartPageEvents();
    syncCartUI();
  });

  window.addEventListener("storage", syncCartUI);
  window.TamGiacCart = {
    readCart: readCart,
    clearCart: clearCart,
    getCartStats: getCartStats,
    syncCartUI: syncCartUI,
    upsertCartItem: upsertCartItem
  };
})();
