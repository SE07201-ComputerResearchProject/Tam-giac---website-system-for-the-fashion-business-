import { login, navigateWithLoader } from "./auth.js?v=20260403a";

const form = document.getElementById("loginForm");
const statusBox = document.getElementById("loginStatus");
const submitBtn = document.getElementById("loginBtn");

if (form && statusBox && submitBtn) {
  const emitStatusEvent = (visible, type) => {
    window.dispatchEvent(new CustomEvent("auth:status", {
      detail: {
        id: statusBox.id,
        visible,
        type
      }
    }));
  };

  const showStatus = (message, type = "error") => {
    if (!message) {
      statusBox.textContent = "";
      statusBox.className = "status";
      statusBox.style.display = "none";
      emitStatusEvent(false, type);
      return;
    }

    statusBox.textContent = message;
    statusBox.className = `status ${type}`;
    statusBox.style.display = "block";
    emitStatusEvent(true, type);
  };

  const setLoading = (loading) => {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle("is-loading", loading);
    submitBtn.textContent = loading ? "Processing..." : "Login";
  };

  const togglePasswordButtons = () => {
    form.querySelectorAll(".toggle-password").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;

        const show = target.type === "password";
        target.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
      });
    });
  };

  const showRegisterNotice = () => {
    const notice = sessionStorage.getItem("auth_notice");
    if (notice !== "register_success") return;

    showStatus("Account created successfully. You can sign in now.", "success");
    sessionStorage.removeItem("auth_notice");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showStatus("Please enter both email and password.", "error");
      return;
    }

    setLoading(true);

    try {
      const recaptchaToken = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || null;
      const result = await login(email, password, recaptchaToken);

      if (!result.success) {
        showStatus(result.error || "Login failed. Please try again.", "error");
        return;
      }

      showStatus("Login successful. Redirecting to the home page...", "success");
      setTimeout(() => {
        navigateWithLoader("index.html", 780, { reason: "login-success" });
      }, 520);
    } catch (error) {
      showStatus(error?.error || "Unable to connect to the server.", "error");
    } finally {
      if (window.grecaptcha && grecaptcha.reset) {
        try {
          grecaptcha.reset();
        } catch (e) {
          // no-op
        }
      }
      setLoading(false);
    }
  });

  window.addEventListener("auth:mode-changed", (event) => {
    if (event.detail && event.detail.mode === "login") {
      showRegisterNotice();
    }
  });

  togglePasswordButtons();
  showRegisterNotice();
}
