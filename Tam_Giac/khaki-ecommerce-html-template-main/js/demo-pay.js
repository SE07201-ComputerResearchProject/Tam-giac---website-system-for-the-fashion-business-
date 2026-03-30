(function () {
  var API_BASE = "http://127.0.0.1:3002/api/payments/mock";
  var sessionId = new URLSearchParams(window.location.search).get("session");
  var currentSession = null;
  var pollTimer = 0;
  var countdownTimer = 0;
  var isActionRunning = false;

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
  }

  function formatRemaining(expiresAt) {
    var remainingMs = Math.max(0, Number(expiresAt || 0) - Date.now());
    var totalSeconds = Math.floor(remainingMs / 1000);
    var minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    var seconds = String(totalSeconds % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function setStatusPill(status) {
    var node = document.getElementById("demoPayStatusPill");
    if (!node) {
      return;
    }

    var labels = {
      pending: "Dang cho thanh toan",
      paid: "Da thanh toan",
      failed: "That bai",
      cancelled: "Da huy",
      expired: "Het han"
    };

    node.textContent = labels[status] || status;
  }

  function setButtonsDisabled(disabled) {
    document.querySelectorAll(".demo-pay-btn").forEach(function (button) {
      button.disabled = disabled;
    });

    var qrTrigger = document.getElementById("demoPayQrTrigger");
    if (qrTrigger) {
      qrTrigger.disabled = disabled;
    }
  }

  function renderSession(session) {
    currentSession = session;
    setText("demoPayOrderId", session.orderId || "-");
    setText("demoPayOrderInfo", session.orderInfo || "-");
    setText("demoPayAmount", formatPrice(session.amount));
    setText("demoPayCountdown", formatRemaining(session.expiresAt));
    setStatusPill(session.status);

    if (session.webhookPayload) {
      setText("demoPayWebhookText", "Webhook demo da gui: " + JSON.stringify(session.webhookPayload));
    }

    var qr = document.getElementById("demoPayQr");
    var qrTrigger = document.getElementById("demoPayQrTrigger");
    var loading = document.getElementById("demoPayLoading");
    if (qr && session.qrCodeUrl) {
      qr.src = session.qrCodeUrl;
    }
    if (qrTrigger && session.qrCodeUrl) {
      qrTrigger.hidden = false;
    }
    if (loading) {
      loading.hidden = true;
    }

    if (session.status !== "pending") {
      setButtonsDisabled(true);
      if (session.redirectUrl) {
        setText("demoPayNote", "Dang quay ve checkout...");
        window.setTimeout(function () {
          window.location.href = session.redirectUrl;
        }, 1200);
      }
    }
  }

  async function fetchSession() {
    if (!sessionId) {
      throw new Error("Khong tim thay session thanh toan demo");
    }

    var response = await fetch(API_BASE + "/session/" + encodeURIComponent(sessionId));
    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Khong tai duoc session");
    }
    renderSession(data);
  }

  async function performAction(action) {
    if (isActionRunning) {
      return;
    }

    isActionRunning = true;
    var response = await fetch(API_BASE + "/session/" + encodeURIComponent(sessionId) + "/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: action })
    });
    var data = await response.json();
    if (!response.ok) {
      isActionRunning = false;
      throw new Error(data.error || "Khong cap nhat duoc session");
    }

    await fetchSession();
    isActionRunning = false;
  }

  function bindActions() {
    function triggerAction(action, message) {
      setButtonsDisabled(true);
      setText("demoPayNote", message || "Dang xu ly ket qua giao dich demo...");
      performAction(action).catch(function (error) {
        isActionRunning = false;
        setButtonsDisabled(false);
        setText("demoPayNote", error && error.message ? error.message : "Khong xu ly duoc giao dich demo");
      });
    }

    document.querySelectorAll(".demo-pay-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        triggerAction(button.dataset.action, "Dang xu ly ket qua giao dich demo...");
      });
    });

    var qrTrigger = document.getElementById("demoPayQrTrigger");
    if (qrTrigger) {
      qrTrigger.addEventListener("click", function () {
        triggerAction("success", "Da ghi nhan thao tac quet QR. Dang xac nhan giao dich...");
      });
    }
  }

  function startCountdown() {
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
    }

    countdownTimer = window.setInterval(function () {
      if (!currentSession) {
        return;
      }
      setText("demoPayCountdown", formatRemaining(currentSession.expiresAt));
    }, 1000);
  }

  function startPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
    }

    pollTimer = window.setInterval(function () {
      if (!currentSession || currentSession.status !== "pending") {
        return;
      }
      fetchSession().catch(function () {});
    }, 3000);
  }

  function init() {
    bindActions();
    fetchSession()
      .then(function () {
        startCountdown();
        startPolling();
      })
      .catch(function (error) {
        setText("demoPayNote", error && error.message ? error.message : "Khong tai duoc gateway demo");
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
