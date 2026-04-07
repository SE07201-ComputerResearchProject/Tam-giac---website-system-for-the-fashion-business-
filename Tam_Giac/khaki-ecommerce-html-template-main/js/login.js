

const form = document.getElementById('loginForm');
const statusBox = document.getElementById('loginStatus');
const submitBtn = document.getElementById('loginBtn');

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
  submitBtn.textContent = loading ? 'Processing...' : 'Log In';
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

const showRegisterNotice = () => {
  const notice = sessionStorage.getItem('auth_notice');
  if (notice !== 'register_success') return;

  showStatus('Your account was created successfully. You can log in now.', 'success');
  sessionStorage.removeItem('auth_notice');
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus('');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showStatus('Please enter both your email and password.', 'error');
    return;
  }

  setLoading(true);

  try {
    const recaptchaToken = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || null;
    const result = await login(email, password, recaptchaToken);

    if (!result.success) {
      showStatus(result.error || 'Login failed. Please try again.', 'error');
      return;
    }

    showStatus('Login successful. Redirecting to the homepage...', 'success');
    setTimeout(() => {
      navigateWithLoader('index.html', 120);
    }, 900);
  } catch (error) {
    showStatus(error?.error || 'Unable to reach the server.', 'error');
  } finally {
    if (window.grecaptcha && grecaptcha.reset) try { grecaptcha.reset(); } catch (e) {}
    setLoading(false);
  }
});

togglePasswordButtons();
showRegisterNotice();
