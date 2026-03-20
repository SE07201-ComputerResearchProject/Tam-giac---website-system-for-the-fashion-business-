// Dynamic header auth cho tất cả pages
import { isLoggedIn, logout, loadProfile } from './auth.js';

export const initHeaderAuth = async () => {
  const accountIcon = document.querySelector('.shop-icon .dropdown:first-child');
  if (!accountIcon) return;

  const isLogin = isLoggedIn();
  const profile = isLogin ? await loadProfile().catch(() => null) : null;

  if (isLogin && profile) {
    // Logged in: Hiển thị tên
    accountIcon.innerHTML = `
      <div class="user-menu">
        <img src="img/icons/account.png">
        <span>Xin chào ${profile.fullName || profile.email}</span>
        <div class="dropdown-menu">
          <ul>
            <li><a href="account.html">Tài khoản</a></li>
            <li><a href="orders.html">Đơn hàng</a></li>
            <li><a href="javascript:logout()">Đăng xuất</a></li>
          </ul>
        </div>
      </div>
    `;
  } else {
    // Guest: Login/Register
    accountIcon.innerHTML = `
      <div class="dropdown">
        <img src="img/icons/account.png" title="Đăng nhập">
        <div class="dropdown-menu login-links">
          <ul>
            <li><a href="login.html">Đăng nhập</a></li>
            <li><a href="register.html">Đăng ký</a></li>
          </ul>
        </div>
      </div>
    `;
  }
};

// Expose logout for inline handler in existing header markup.
window.logout = logout;

// Auto init khi load page
document.addEventListener('DOMContentLoaded', initHeaderAuth);
