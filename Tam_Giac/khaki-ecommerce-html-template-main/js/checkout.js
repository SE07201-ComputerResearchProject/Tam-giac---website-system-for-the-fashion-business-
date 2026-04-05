(function () {
  var STORAGE_KEY = "tamgiac_cart";
  var CHECKOUT_DRAFT_KEY = "tamgiac_checkout_draft";
  var API_BASE = "/api";
  var DRAFT_FIELDS = [
    "fname",
    "lname",
    "cname",
    "country",
    "cityy",
    "address",
    "email",
    "tel",
    "mobile",
    "orderNote"
  ];

  function readStorage(storage, key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function removeStorage(storage, key) {
    storage.removeItem(key);
  }

  function readCart() {
    var cart = readStorage(window.localStorage, STORAGE_KEY);
    return Array.isArray(cart) ? cart : [];
  }

  function getToken() {
    return window.localStorage.getItem("token");
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
  }

  function setStatus(text, type) {
    var statusNode = document.getElementById("paymentStatus");
    if (!statusNode) {
      return;
    }

    statusNode.textContent = text || "";
    statusNode.className = "payment-status";
    if (type) {
      statusNode.classList.add("is-" + type);
    }
  }

  function setSubmitState(button, isLoading, label) {
    if (!button) {
      return;
    }

    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.value;
    }

    button.disabled = isLoading;
    button.value = isLoading ? (label || "Processing...") : button.dataset.originalLabel;
  }

  function setReturnCard(details) {
    var card = document.getElementById("checkoutReturnCard");
    if (!card || !details) {
      return;
    }

    var title = document.getElementById("checkoutReturnTitle");
    var message = document.getElementById("checkoutReturnMessage");
    var meta = document.getElementById("checkoutReturnMeta");
    var continueLink = document.getElementById("checkoutReturnContinue");

    if (title) {
      title.textContent = details.title || "Checkout update";
    }

    if (message) {
      message.textContent = details.message || "";
    }

    if (meta) {
      meta.textContent = details.meta || "";
    }

    if (continueLink) {
      continueLink.textContent = details.linkText || "Continue shopping";
      continueLink.href = details.linkHref || "shop.html";
    }

    card.hidden = false;
  }

  function clearCartAfterSuccess() {
    if (window.TamGiacCart && typeof window.TamGiacCart.clearCart === "function") {
      window.TamGiacCart.clearCart();
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, "[]");
  }

  function getFieldValue(form, id) {
    var node = form.querySelector("#" + id);
    return node ? String(node.value || "").trim() : "";
  }

  function saveCheckoutDraft(form) {
    var draft = DRAFT_FIELDS.reduce(function (result, key) {
      result[key] = getFieldValue(form, key);
      return result;
    }, {});

    writeStorage(window.sessionStorage, CHECKOUT_DRAFT_KEY, draft);
  }

  function restoreCheckoutDraft(form) {
    var draft = readStorage(window.sessionStorage, CHECKOUT_DRAFT_KEY);
    if (!draft) {
      return;
    }

    DRAFT_FIELDS.forEach(function (key) {
      var field = form.querySelector("#" + key);
      if (field && draft[key]) {
        field.value = draft[key];
      }
    });
  }

  function bindDraftPersistence(form) {
    form.addEventListener("input", function () {
      saveCheckoutDraft(form);
    });

    form.addEventListener("change", function () {
      saveCheckoutDraft(form);
    });
  }

  async function apiCall(endpoint, options) {
    var token = getToken();
    if (!token) {
      throw new Error("Bạn cần đăng nhập trước khi đặt hàng.");
    }

    var response = await fetch(API_BASE + endpoint, Object.assign({
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      }
    }, options || {}));

    var data = await response.json().catch(function () {
      return { error: "API error" };
    });

    if (!response.ok) {
      throw new Error(data.error || "Không thể xử lý đơn hàng.");
    }

    return data;
  }

  function getSelectedMethod(form) {
    var checked = form.querySelector('input[name="payment"]:checked');
    return checked ? checked.value : "cod";
  }

  function updateMethodUI() {
    var helpNode = document.getElementById("paymentHelpText");
    var submitButton = document.getElementById("checkoutSubmit");

    if (helpNode) {
      helpNode.value = "Cash on delivery is the active payment flow. The order will be stored directly in SQL Server.";
    }

    if (submitButton) {
      submitButton.value = "Place Order";
      submitButton.dataset.originalLabel = "Place Order";
    }
  }

  async function prefillProfile(form) {
    var token = getToken();
    if (!token) {
      return;
    }

    try {
      var profile = await apiCall("/auth/me", { method: "GET" });
      var parts = String(profile.fullName || "").trim().split(/\s+/).filter(Boolean);
      if (parts.length && !getFieldValue(form, "fname")) {
        form.querySelector("#fname").value = parts[0];
        form.querySelector("#lname").value = parts.slice(1).join(" ");
      }
      if (!getFieldValue(form, "email")) {
        form.querySelector("#email").value = profile.email || "";
      }
      if (!getFieldValue(form, "mobile")) {
        form.querySelector("#mobile").value = profile.phone || "";
      }
    } catch (error) {
      // Keep checkout usable even if profile load fails.
    }
  }

  async function createOrder(form) {
    var cart = readCart();
    var items = cart.map(function (item) {
      return {
        productId: item.id,
        quantity: item.quantity
      };
    });

    return apiCall("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: items,
        paymentMethod: getSelectedMethod(form),
        customerName: (getFieldValue(form, "fname") + " " + getFieldValue(form, "lname")).trim(),
        customerEmail: getFieldValue(form, "email"),
        customerPhone: getFieldValue(form, "mobile") || getFieldValue(form, "tel"),
        orderNote: getFieldValue(form, "orderNote"),
        shippingAddress: {
          addressLine: getFieldValue(form, "address"),
          city: getFieldValue(form, "cityy"),
          country: getFieldValue(form, "country"),
          postalCode: "",
          tel: getFieldValue(form, "tel"),
          mobile: getFieldValue(form, "mobile")
        }
      })
    });
  }

  function bindCheckout() {
    var form = document.getElementById("checkout-form");
    if (!form || form.dataset.checkoutBound === "true") {
      return;
    }

    form.dataset.checkoutBound = "true";
    restoreCheckoutDraft(form);
    updateMethodUI();
    bindDraftPersistence(form);
    prefillProfile(form);

    form.addEventListener("submit", async function (event) {
      var submitButton = document.getElementById("checkoutSubmit");
      var cart = readCart();

      event.preventDefault();

      if (!cart.length) {
        setStatus("Your cart is empty. Add a product before checking out.", "error");
        return;
      }

      if (!getToken()) {
        setStatus("Please log in before placing an order. Redirecting...", "error");
        window.setTimeout(function () {
          window.location.href = "login.html";
        }, 800);
        return;
      }

      if (!form.reportValidity()) {
        setStatus("Please complete the shipping and contact information.", "error");
        return;
      }

      if (getSelectedMethod(form) !== "cod") {
        setStatus("Only cash on delivery is active right now.", "info");
        return;
      }

      saveCheckoutDraft(form);
      setSubmitState(submitButton, true, "Saving order...");
      setStatus("Saving your order to the database...", "info");

      try {
        var result = await createOrder(form);
        var order = result.order || {};

        clearCartAfterSuccess();
        removeStorage(window.sessionStorage, CHECKOUT_DRAFT_KEY);
        form.reset();
        updateMethodUI();

        setStatus("Order placed successfully.", "success");
        setReturnCard({
          title: "Order placed successfully",
          message: "Your order has been saved through the backend and written to SQL Server.",
          meta: "Order ref: " + (order.reference || order.id || "-") + " | Total: " + formatPrice(order.totalAmount || 0),
          linkText: "View orders",
          linkHref: "orders.html"
        });
      } catch (error) {
        setStatus(error.message || "Could not save the order.", "error");
      } finally {
        setSubmitState(submitButton, false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", bindCheckout);
})();
