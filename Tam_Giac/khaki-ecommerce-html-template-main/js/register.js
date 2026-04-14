import { register } from "./auth.js?v=20260403a";

const form = document.getElementById("registerForm");
const statusBox = document.getElementById("registerStatus");
const submitBtn = document.getElementById("registerBtn");
const passwordInput = document.getElementById("registerPassword");
const strengthFill = document.getElementById("strengthFill");
const strengthText = document.getElementById("strengthText");

if (form && statusBox && submitBtn && passwordInput && strengthFill && strengthText) {
  const PASSWORD_RULE =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

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
    submitBtn.textContent = loading ? "Processing..." : "Create account";
  };

  const getPasswordStrength = (password) => {
    if (!password) {
      return {
        score: 0,
        text: "Use at least 8 characters.",
        color: "rgba(120, 155, 182, 0.55)"
      };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&]/.test(password)) score += 1;

    if (score <= 2) return { score, text: "Weak password", color: "#d05a5a" };
    if (score <= 4) return { score, text: "Good password", color: "#d48a2d" };
    return { score, text: "Strong password", color: "#1f9466" };
  };

  const renderPasswordStrength = (password) => {
    const state = getPasswordStrength(password);
    const scale = state.score / 5;

    strengthFill.style.backgroundColor = state.color;

    if (window.gsap) {
      window.gsap.to(strengthFill, {
        scaleX: scale,
        opacity: state.score === 0 ? 0.72 : 1,
        duration: 0.35,
        ease: "power2.out",
        overwrite: true
      });
    } else {
      strengthFill.style.transform = `scaleX(${scale})`;
      strengthFill.style.opacity = state.score === 0 ? "0.72" : "1";
    }

    strengthText.textContent = state.text;
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

  passwordInput.addEventListener("input", (event) => {
    renderPasswordStrength(event.target.value);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("");

    const fullName = document.getElementById("registerFullName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = passwordInput.value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;

    if (!fullName || !email || !password || !confirmPassword) {
      showStatus("Please complete all required fields.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showStatus("Password confirmation does not match.", "error");
      return;
    }

    if (!PASSWORD_RULE.test(password)) {
      showStatus("Your password does not meet the security requirements.", "error");
      return;
    }

    setLoading(true);

    try {
      const recaptchaToken = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || null;
      const result = await register(email, password, fullName, recaptchaToken);

      if (!result.success) {
        showStatus(result.error || "Registration failed. Please try again.", "error");
        return;
      }

      sessionStorage.setItem("auth_notice", "register_success");
      showStatus("Account created successfully. Switching to login...", "success");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("auth:request-mode", {
          detail: { mode: "login" }
        }));
      }, 850);
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

  togglePasswordButtons();
  renderPasswordStrength("");
}
