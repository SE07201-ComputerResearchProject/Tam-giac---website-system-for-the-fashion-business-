(function () {
  var STORAGE_KEY = "tamgiac_cart";
  var DELIVERY_FEE = 30000;
  var API_BASE = "http://127.0.0.1:3002/api/payments";
  var CHECKOUT_DRAFT_KEY = "tamgiac_checkout_draft";
  var PENDING_PAYMENT_KEY = "tamgiac_pending_payment";
  var LAST_PAYMENT_KEY = "tamgiac_last_payment";
  var LAST_PAYMENT_TTL_MS = 30 * 60 * 1000;
  var RETURN_CARD_VISIBLE_CLASS = "is-visible";
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
    "orderNote",
    "payment"
  ];

  var METHOD_COPY = {
    cod: {
      help: "Thanh toan khi nhan hang. Tam Giac se xac nhan don va lien he truoc khi giao.",
      button: "Dat hang COD"
    },
    momo: {
      help: "Neu da cau hinh MoMo test, ban se duoc chuyen sang MoMo. Neu chua, he thong se mo phong luong QR bang Tam Giac DemoPay.",
      button: "Thanh toan bang MoMo QR"
    },
    vnpay: {
      help: "Ban se duoc chuyen sang cong thanh toan VNPay de quet QR hoac thanh toan online.",
      button: "Thanh toan bang VNPay"
    },
    bank: {
      help: "Tam thoi ghi nhan yeu cau chuyen khoan ngan hang. Buoc doi soat giao dich se duoc noi tiep sau.",
      button: "Gui yeu cau chuyen khoan"
    }
  };

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

  function getCartStats() {
    return readCart().reduce(function (stats, item) {
      var quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      var price = Math.max(0, Number(item.price) || 0);
      stats.totalItems += quantity;
      stats.totalAmount += price * quantity;
      return stats;
    }, {
      totalItems: 0,
      totalAmount: 0
    });
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
  }

  function getSelectedMethod(form) {
    var checked = form.querySelector('input[name="payment"]:checked');
    return checked ? checked.value : "cod";
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
    button.value = isLoading ? (label || "Dang xu ly...") : button.dataset.originalLabel;
  }

  function setReturnCard(details) {
    var card = document.getElementById("checkoutReturnCard");
    if (!card || !details) {
      return;
    }

    var title = document.getElementById("checkoutReturnTitle");
    var message = document.getElementById("checkoutReturnMessage");
    var meta = document.getElementById("checkoutReturnMeta");

    if (title) {
      title.textContent = details.title || "Cap nhat thanh toan";
    }

    if (message) {
      message.textContent = details.message || "";
    }

    if (meta) {
      meta.textContent = details.meta || "";
    }

    card.hidden = false;
    card.classList.add(RETURN_CARD_VISIBLE_CLASS);
  }

  function getFieldValue(form, id) {
    var node = form.querySelector("#" + id);
    return node ? String(node.value || "").trim() : "";
  }

  function setFieldValue(form, id, value) {
    var node = form.querySelector("#" + id);
    if (node) {
      node.value = value;
    }
  }

  function saveCheckoutDraft(form) {
    var draft = DRAFT_FIELDS.reduce(function (result, key) {
      if (key === "payment") {
        result.payment = getSelectedMethod(form);
        return result;
      }

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
      if (key === "payment") {
        var radio = form.querySelector('input[name="payment"][value="' + draft.payment + '"]');
        if (radio) {
          radio.checked = true;
        }
        return;
      }

      if (draft[key]) {
        setFieldValue(form, key, draft[key]);
      }
    });
  }

  function updateMethodUI(form) {
    var method = getSelectedMethod(form);
    var copy = METHOD_COPY[method] || METHOD_COPY.cod;
    var helpNode = document.getElementById("paymentHelpText");
    var submitButton = document.getElementById("checkoutSubmit");

    if (helpNode) {
      helpNode.value = copy.help;
    }

    if (submitButton) {
      submitButton.value = copy.button;
      submitButton.dataset.originalLabel = copy.button;
    }
  }

  function buildOrderId(method) {
    return [method.toUpperCase(), "TG", Date.now()].join("-");
  }

  function getReturnUrl(method) {
    if (method === "vnpay") {
      return "http://127.0.0.1:3002/api/payments/vnpay_return";
    }

    return window.location.origin + "/checkout.html?payment=" + encodeURIComponent(method) + "-return";
  }

  function buildCheckoutPayload(form, method) {
    var stats = getCartStats();
    var delivery = stats.totalItems ? DELIVERY_FEE : 0;
    var total = stats.totalAmount + delivery;
    var firstName = getFieldValue(form, "fname");
    var lastName = getFieldValue(form, "lname");
    var fullName = (firstName + " " + lastName).trim();

    return {
      amount: total,
      orderId: buildOrderId(method),
      returnUrl: getReturnUrl(method),
      orderInfo: "Thanh toan don hang Tam Giac cho " + (fullName || "khach hang"),
      extraData: JSON.stringify({
        fullName: fullName,
        email: getFieldValue(form, "email"),
        tel: getFieldValue(form, "tel"),
        mobile: getFieldValue(form, "mobile"),
        address: getFieldValue(form, "address"),
        orderNote: getFieldValue(form, "orderNote"),
        paymentMethod: method
      })
    };
  }

  async function createOnlinePayment(method, payload) {
    var endpoint = method === "momo" ? "/momo/create" : "/create";
    var requestBody = method === "momo"
      ? payload
      : {
          amount: payload.amount,
          orderId: payload.orderId,
          returnUrl: payload.returnUrl
        };

    var response = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || "Khong tao duoc giao dich thanh toan");
    }

    return data;
  }

  function getPaymentRedirect(data) {
    return data.payUrl || data.paymentUrl || data.deeplink || data.qrCodeUrl || "";
  }

  function rememberPendingPayment(method, payload) {
    writeStorage(window.sessionStorage, PENDING_PAYMENT_KEY, {
      method: method,
      orderId: payload.orderId,
      amount: payload.amount,
      createdAt: Date.now(),
      cart: readCart()
    });
  }

  function readPendingPayment() {
    return readStorage(window.sessionStorage, PENDING_PAYMENT_KEY);
  }

  function clearPendingPayment() {
    removeStorage(window.sessionStorage, PENDING_PAYMENT_KEY);
  }

  function rememberCompletedPayment(record) {
    writeStorage(window.sessionStorage, LAST_PAYMENT_KEY, record);
  }

  function readCompletedPayment() {
    return readStorage(window.sessionStorage, LAST_PAYMENT_KEY);
  }

  function getMethodLabel(payment, pending) {
    if (pending && pending.method === "momo") {
      return "MoMo QR";
    }

    if (pending && pending.method === "vnpay") {
      return "VNPay";
    }

    if (/demopay/i.test(payment || "")) {
      return "MoMo QR demo";
    }

    return String(payment || "thanh toan online").replace(/-return$/i, "");
  }

  function clearCartAfterSuccess() {
    if (window.TamGiacCart && typeof window.TamGiacCart.clearCart === "function") {
      window.TamGiacCart.clearCart();
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, "[]");
  }

  function applySuccessfulReturn(payment, orderId, resultCode, message, pending) {
    var paymentLabel = getMethodLabel(payment, pending);
    var finalOrderId = orderId || (pending && pending.orderId) || "-";
    var amount = pending && pending.amount ? formatPrice(pending.amount) : "";

    clearCartAfterSuccess();
    clearPendingPayment();

    var record = {
      status: "success",
      payment: payment,
      paymentLabel: paymentLabel,
      orderId: finalOrderId,
      amount: amount,
      resultCode: resultCode || "00",
      message: message || "Thanh toan thanh cong",
      completedAt: Date.now()
    };

    rememberCompletedPayment(record);
    setStatus("Thanh toan " + paymentLabel + " thanh cong. Don " + finalOrderId + " da san sang de doi soat.", "success");
    setReturnCard({
      title: "Thanh toan thanh cong",
      message: "Ban da thanh toan thanh cong bang " + paymentLabel + ". Gio hang da duoc don sach de san sang cho don moi.",
      meta: "Ma don: " + finalOrderId + (amount ? " | Tong thanh toan: " + amount : "")
    });
  }

  function applyUnsuccessfulReturn(payment, resultCode, message, pending) {
    var paymentLabel = getMethodLabel(payment, pending);
    var info = message || resultCode || "Khong ro trang thai";

    setStatus("Da quay ve tu " + paymentLabel + ". Trang thai hien tai: " + info, "info");
    setReturnCard({
      title: "Giao dich chua hoan tat",
      message: "Tam Giac da nhan thong tin quay ve tu " + paymentLabel + ". Ban co the kiem tra lai giao dich hoac thanh toan lai.",
      meta: "Trang thai: " + info
    });
  }

  function handleReturnState() {
    var params = new URLSearchParams(window.location.search);
    var payment = params.get("payment");
    var resultCode = params.get("resultCode");
    var message = params.get("message");
    var orderId = params.get("orderId");
    var pending = readPendingPayment();

    if (payment) {
      if (resultCode === "0" || resultCode === "00") {
        applySuccessfulReturn(payment, orderId, resultCode, message, pending);
        return;
      }

      applyUnsuccessfulReturn(payment, resultCode, message, pending);
      return;
    }

    var completed = readCompletedPayment();
    if (completed && completed.status === "success" && (Date.now() - Number(completed.completedAt || 0) <= LAST_PAYMENT_TTL_MS)) {
      setReturnCard({
        title: "Don hang da thanh toan",
        message: "Lan thanh toan gan nhat cua ban da thanh cong. Ban co the tiep tuc mua sam ngay tai day.",
        meta: "Ma don: " + completed.orderId + (completed.amount ? " | Tong thanh toan: " + completed.amount : "")
      });
    }
  }

  function bindDraftPersistence(form) {
    form.addEventListener("input", function () {
      saveCheckoutDraft(form);
    });

    form.addEventListener("change", function () {
      saveCheckoutDraft(form);
    });
  }

  function bindCheckout() {
    var form = document.getElementById("checkout-form");
    if (!form || form.dataset.checkoutBound === "true") {
      return;
    }

    form.dataset.checkoutBound = "true";
    restoreCheckoutDraft(form);
    updateMethodUI(form);
    handleReturnState();
    bindDraftPersistence(form);

    form.addEventListener("change", function (event) {
      if (event.target.name === "payment") {
        updateMethodUI(form);
      }
    });

    form.addEventListener("submit", async function (event) {
      var submitButton = document.getElementById("checkoutSubmit");
      var method = getSelectedMethod(form);
      var cartStats = getCartStats();

      event.preventDefault();

      if (!cartStats.totalItems) {
        setStatus("Gio hang dang trong. Hay them san pham truoc khi thanh toan.", "error");
        return;
      }

      if (!form.reportValidity()) {
        setStatus("Vui long dien day du thong tin giao hang va lien he.", "error");
        return;
      }

      saveCheckoutDraft(form);

      if (method === "cod") {
        setStatus("Da ghi nhan lua chon thanh toan khi nhan hang. Buoc tao don se duoc noi tiep o backend order.", "success");
        setReturnCard({
          title: "Da ghi nhan don COD",
          message: "Thong tin giao hang da duoc luu. Khi backend order san sang, chung ta se noi tiep buoc tao don chinh thuc.",
          meta: "Phuong thuc: Thanh toan khi nhan hang"
        });
        return;
      }

      if (method === "bank") {
        setStatus("Da ghi nhan lua chon chuyen khoan ngan hang. Buoc doi soat giao dich se duoc bo sung sau.", "info");
        setReturnCard({
          title: "Da ghi nhan yeu cau chuyen khoan",
          message: "Ban co the giu nguyen thong tin nay de doi sang luong doi soat khi backend ngan hang san sang.",
          meta: "Phuong thuc: Chuyen khoan ngan hang"
        });
        return;
      }

      try {
        setSubmitState(submitButton, true, "Dang tao giao dich...");
        setStatus("Dang tao giao dich " + method.toUpperCase() + ", vui long doi trong giay lat...", "info");

        var payload = buildCheckoutPayload(form, method);
        var data = await createOnlinePayment(method, payload);
        var redirectUrl = getPaymentRedirect(data);

        if (!redirectUrl) {
          throw new Error("Khong nhan duoc link thanh toan tu cong " + method.toUpperCase());
        }

        rememberPendingPayment(method, payload);
        setStatus("Dang chuyen den cong thanh toan " + method.toUpperCase() + "...", "success");
        window.location.href = redirectUrl;
      } catch (error) {
        setStatus(error && error.message ? error.message : "Khong tao duoc giao dich thanh toan", "error");
      } finally {
        setSubmitState(submitButton, false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", bindCheckout);
})();
