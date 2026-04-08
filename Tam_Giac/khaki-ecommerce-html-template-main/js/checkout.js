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
      throw new Error("Ban can dang nhap truoc khi dat hang.");
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
      throw new Error(data.error || "Khong the xu ly don hang.");
    }

    return data;
  }

  function getSelectedMethod(form) {
    var checked = form.querySelector('input[name="payment"]:checked');
    return checked ? checked.value : "cod";
  }

  function shouldForceVnpay() {
    var params = new URLSearchParams(window.location.search);
    return params.get("force_vnpay") === "1";
  }

  function preferVnpayForDemo(form) {
    if (!form) {
      return;
    }

    var codInput = form.querySelector('input[name="payment"][value="cod"]');
    var vnpayInput = form.querySelector('input[name="payment"][value="vnpay"]');
    if (codInput) {
      codInput.checked = false;
      codInput.disabled = true;
    }
    if (vnpayInput && !vnpayInput.disabled) {
      vnpayInput.checked = true;
    }
  }

  function updateMethodUI(form) {
    var helpNode = document.getElementById("paymentHelpText");
    var submitButton = document.getElementById("checkoutSubmit");
    var method = getSelectedMethod(form);

    if (helpNode) {
      if (method === "vnpay") {
        helpNode.value = "VNPay QR sandbox is active. After saving the order, Tam Giac will redirect you to the VNPay payment page so you can scan the QR code on your phone.";
      } else {
        helpNode.value = "Cash on delivery is the active payment flow. The order will be stored directly in SQL Server.";
      }
    }

    if (submitButton) {
      submitButton.value = "VNPAY TEST 20260409B";
      submitButton.dataset.originalLabel = submitButton.value;
    }
  }

  function bindPaymentMethodUI(form) {
    form.querySelectorAll('input[name="payment"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        updateMethodUI(form);
      });
    });
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

  async function createOrder(form, paymentMethod) {
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
        paymentMethod: paymentMethod || getSelectedMethod(form),
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

  async function createVnpayPayment(orderId) {
    return apiCall("/payments/vnpay/create", {
      method: "POST",
      body: JSON.stringify({
        orderId: orderId
      })
    });
  }

  function getReturnContext() {
    var params = new URLSearchParams(window.location.search);

    if (params.get("payment") !== "vnpay-return") {
      return null;
    }

    return {
      orderId: params.get("orderId") || "",
      resultCode: params.get("resultCode") || "",
      status: params.get("status") || "",
      success: params.get("success") === "1",
      transactionNo: params.get("transactionNo") || "",
      message: params.get("message") || ""
    };
  }

  function applyReturnContext() {
    var context = getReturnContext();
    if (!context) {
      return;
    }

    if (context.success) {
      clearCartAfterSuccess();
      removeStorage(window.sessionStorage, CHECKOUT_DRAFT_KEY);
      setStatus("VNPay payment completed successfully.", "success");
      setReturnCard({
        title: "VNPay payment completed",
        message: context.message || "Your payment was confirmed and the order has been recorded in the database.",
        meta: "Order ref: " + (context.orderId || "-") + (context.transactionNo ? " | VNPay txn: " + context.transactionNo : ""),
        linkText: "View orders",
        linkHref: "orders.html"
      });
      return;
    }

    setStatus(context.message || "VNPay payment was not completed.", "error");
    setReturnCard({
      title: "VNPay payment not completed",
      message: context.message || "You can review the order and try again with a new checkout attempt.",
      meta: "Order ref: " + (context.orderId || "-") + (context.resultCode ? " | Code: " + context.resultCode : ""),
      linkText: "Back to cart",
      linkHref: "cart.html"
    });
  }

  function bindCheckout() {
    var form = document.getElementById("checkout-form");
    if (!form || form.dataset.checkoutBound === "true") {
      return;
    }

    form.dataset.checkoutBound = "true";
    restoreCheckoutDraft(form);
    preferVnpayForDemo(form);
    bindDraftPersistence(form);
    bindPaymentMethodUI(form);
    updateMethodUI(form);
    prefillProfile(form);
    applyReturnContext();
    window.setTimeout(function () {
      if (shouldForceVnpay()) {
        preferVnpayForDemo(form);
        updateMethodUI(form);
      }
    }, 50);

    form.addEventListener("submit", async function (event) {
      var submitButton = document.getElementById("checkoutSubmit");
      var cart = readCart();
      var paymentMethod = "vnpay";

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

      saveCheckoutDraft(form);

      try {
        setSubmitState(submitButton, true, "Connecting to VNPay...");
        setStatus("Creating your order and preparing the VNPay QR payment page...", "info");

        var paymentOrderResult = await createOrder(form, "vnpay");
        var paymentOrder = paymentOrderResult.order || {};
        var paymentGateway = await createVnpayPayment(paymentOrder.id);

        setStatus("Redirecting to VNPay QR...", "info");
        window.location.href = paymentGateway.paymentUrl;
      } catch (error) {
        setStatus(error.message || "Could not start VNPay payment.", "error");
      } finally {
        setSubmitState(submitButton, false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", bindCheckout);
})();
