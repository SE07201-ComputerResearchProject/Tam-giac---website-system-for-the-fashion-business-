import { isLoggedIn, navigateWithLoader, register } from './auth.js?v=20260320b';

const form = document.getElementById('registerForm');
const statusBox = document.getElementById('registerStatus');
const submitBtn = document.getElementById('registerBtn');
const passwordInput = document.getElementById('password');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

if (isLoggedIn()) {
  navigateWithLoader('index.html', 0);
}

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const showStatus = (message, type = 'error') => {
  if (!message) {
    statusBox.textContent = '';
    statusBox.className = 'status';
    statusBox.style.display = 'none';
    return;
  }

  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
  statusBox.style.display = 'block';
};

const setLoading = (loading) => {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Processing...' : 'Create account';
};

const getPasswordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;

  if (score <= 2) return { score, text: 'Weak password', color: '#c33a33' };
  if (score <= 4) return { score, text: 'Fair password', color: '#b97f17' };
  return { score, text: 'Strong password', color: '#1f8f5f' };
};

const renderPasswordStrength = (password) => {
  const state = getPasswordStrength(password);
  strengthFill.style.width = `${state.score * 20}%`;
  strengthFill.style.backgroundColor = state.color;
  strengthText.textContent = state.text;
};

const togglePasswordButtons = () => {
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      const show = target.type === 'password';
      target.type = show ? 'text' : 'password';
      btn.textContent = show ? 'An' : 'Hien';
    });
  });
};

passwordInput.addEventListener('input', (event) => {
  renderPasswordStrength(event.target.value);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus('');

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = passwordInput.value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName || !email || !password || !confirmPassword) {
    showStatus('Please complete all required fields.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showStatus('The password confirmation does not match.', 'error');
    return;
  }

  if (!PASSWORD_RULE.test(password)) {
    showStatus('Your password does not meet the security requirements.', 'error');
    return;
  }

  setLoading(true);

  try {
    const recaptchaToken = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || null;
    const result = await register(email, password, fullName, recaptchaToken);

    if (!result.success) {
      showStatus(result.error || 'Sign up failed. Please try again.', 'error');
      return;
    }

    sessionStorage.setItem('auth_notice', 'register_success');
    showStatus('Account created successfully. Redirecting to the login page...', 'success');
    setTimeout(() => {
      navigateWithLoader('login.html', 120);
    }, 900);
  } catch (error) {
    showStatus(error?.error || 'Unable to reach the server.', 'error');
  } finally {
    if (window.grecaptcha && grecaptcha.reset) try { grecaptcha.reset(); } catch (e) {}
    setLoading(false);
  }
});

togglePasswordButtons();
renderPasswordStrength('');
