import { isLoggedIn, login } from './auth.js?v=20260320b';

const form = document.getElementById('loginForm');
const statusBox = document.getElementById('loginStatus');
const submitBtn = document.getElementById('loginBtn');

if (isLoggedIn()) {
  window.location.href = 'index.html';
}

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
  submitBtn.textContent = loading ? 'Dang xu ly...' : 'Dang nhap';
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

  showStatus('Dang ky thanh cong. Ban co the dang nhap ngay bay gio.', 'success');
  sessionStorage.removeItem('auth_notice');
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus('');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showStatus('Vui long nhap day du email va mat khau.', 'error');
    return;
  }

  setLoading(true);

  try {
    const result = await login(email, password);

    if (!result.success) {
      showStatus(result.error || 'Dang nhap that bai. Vui long thu lai.', 'error');
      return;
    }

    showStatus('Dang nhap thanh cong. Dang chuyen ve trang chu...', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 900);
  } catch (error) {
    showStatus(error?.error || 'Khong ket noi duoc may chu.', 'error');
  } finally {
    setLoading(false);
  }
});

togglePasswordButtons();
showRegisterNotice();
