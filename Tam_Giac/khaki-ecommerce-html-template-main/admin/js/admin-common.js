(function () {
  if (window.TamGiacAdmin) {
    return;
  }

  var API_BASE = "/api";
  var TOKEN_KEY = "token";

  function getToken() {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      return "";
    }
  }

  function clearToken() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
    }
  }

  function redirectToLogin() {
    window.location.href = "../login.html";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function setStatus(target, message, isError) {
    var node = typeof target === "string" ? document.getElementById(target) : target;
    if (!node) {
      return;
    }

    node.textContent = message || "";
    node.style.color = isError ? "#b42318" : "#335b88";
  }

  async function apiCall(endpoint, options) {
    var token = getToken();
    if (!token) {
      redirectToLogin();
      throw { error: "Your session has expired." };
    }

    var config = Object.assign(
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        }
      },
      options || {}
    );

    var response;
    try {
      response = await fetch(API_BASE + endpoint, config);
    } catch (error) {
      throw { error: "Cannot connect to the admin backend right now." };
    }

    var payload = await response.json().catch(function () {
      return { error: "Admin API error." };
    });

    if (!response.ok) {
      payload.status = response.status;
      if (response.status === 401 || response.status === 403) {
        clearToken();
      }
      throw payload;
    }

    return payload;
  }

  function bindLogout(linkId) {
    var link = document.getElementById(linkId || "adminLogoutLink");
    if (!link || link.dataset.bound === "true") {
      return;
    }

    link.dataset.bound = "true";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      clearToken();
      redirectToLogin();
    });
  }

  async function verifyAdmin(statusTarget) {
    try {
      await apiCall("/admin/health");
      return true;
    } catch (error) {
      setStatus(
        statusTarget,
        error.error || "You do not have permission to access the admin panel.",
        true
      );
      throw error;
    }
  }

  async function initPage(options) {
    bindLogout(options && options.logoutId);

    if (!getToken()) {
      redirectToLogin();
      return false;
    }

    try {
      await verifyAdmin(options && options.statusId);
      if (options && typeof options.onReady === "function") {
        await options.onReady();
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  window.TamGiacAdmin = {
    apiCall: apiCall,
    bindLogout: bindLogout,
    clearToken: clearToken,
    escapeHtml: escapeHtml,
    formatDateTime: formatDateTime,
    formatPrice: formatPrice,
    getToken: getToken,
    initPage: initPage,
    redirectToLogin: redirectToLogin,
    setStatus: setStatus
  };
})();
