// auth-script.js - Xử lý login/register auth.html
import { login, register, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loader = document.getElementById('loginLoader');
    const btn = document.querySelector('#loginForm .btn-primary');

    btn.disabled = true;
    loader.style.display = 'block';
    errorDiv.style.display = 'none';

    try {
      const result = await login(email, password);
      if (result.success) {
        // Success toast
        showMessage('Đăng nhập thành công!', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      errorDiv.textContent = error.error || 'Lỗi kết nối';
      errorDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
      loader.style.display = 'none';
    }
  });

  // Register form
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('registerError');
    const loader = document.getElementById('registerLoader');
    const btn = document.querySelector('#registerForm .btn-primary');

    // Validation
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (password !== confirmPassword) {
      errorDiv.textContent = 'Xác nhận mật khẩu không khớp';
      errorDiv.style.display = 'block';
      return;
    }
    if (!passRegex.test(password)) {
      errorDiv.textContent = 'Mật khẩu phải ≥8 ký tự: chữ hoa/thường, số, ký tự đặc biệt (@$!%*?&)';
      errorDiv.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'block';
    errorDiv.style.display = 'none';

    try {
      const result = await register(email, password, fullName);
      if (result.success) {
        showMessage('Đăng ký thành công! Vui lòng đăng nhập', 'success');
        showTab('login');
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      errorDiv.textContent = error.error || 'Lỗi kết nối server';
      errorDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
      loader.style.display = 'none';
    }
  });
});

// Toast message
function showMessage(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// CSS cho toast
const style = document.createElement('style');
style.textContent = `
  .toast { position: fixed; top: 20px; right: 20px; padding: 16px 20px; border-radius: 8px; color: white; font-weight: 500; z-index: 10000; transform: translateX(400px); transition: transform 0.3s; }
  .toast-success { background: #2ed573; }
  .toast-error { background: #ff4757; }
  .toast.show { transform: translateX(0); }
`;
document.head.appendChild(style);

