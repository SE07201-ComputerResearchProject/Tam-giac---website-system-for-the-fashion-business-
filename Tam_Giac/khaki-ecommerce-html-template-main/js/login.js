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
    submitBtn.textContent = loading ? "Đang xử lý..." : "Đăng nhập";
  };

  const togglePasswordButtons = () => {
    form.querySelectorAll(".toggle-password").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;

        const show = target.type === "password";
        target.type = show ? "text" : "password";
        btn.textContent = show ? "Ẩn" : "Hiện";
      });
    });
  };

  const showRegisterNotice = () => {
    const notice = sessionStorage.getItem("auth_notice");
    if (notice !== "register_success") return;

    showStatus("Tạo tài khoản thành công. Bây giờ bạn có thể đăng nhập.", "success");
    sessionStorage.removeItem("auth_notice");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showStatus("Vui lòng nhập đầy đủ email và mật khẩu.", "error");
      return;
    }

    setLoading(true);

    try {
      const recaptchaToken = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || null;
      const result = await login(email, password, recaptchaToken);

      if (!result.success) {
        showStatus(result.error || "Đăng nhập thất bại. Vui lòng thử lại.", "error");
        return;
      }

      showStatus("Đăng nhập thành công. Đang chuyển về trang chủ...", "success");
      setTimeout(() => {
        navigateWithLoader("index.html", 780, { reason: "login-success" });
      }, 520);
    } catch (error) {
      showStatus(error?.error || "Không thể kết nối tới máy chủ.", "error");
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
