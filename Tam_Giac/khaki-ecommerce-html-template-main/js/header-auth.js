import { isLoggedIn, logout, loadProfile } from './auth.js';

export const initHeaderAuth = async () => {
  const accountIcon = document.querySelector('.shop-icon .dropdown:first-child');
  if (!accountIcon) {
    return;
  }

  const loggedIn = isLoggedIn();
  const profile = loggedIn ? await loadProfile().catch(() => null) : null;

  if (loggedIn && profile) {
    const adminLink = profile.role === 'admin'
      ? '<li><a href="admin/product.html">Admin Panel</a></li>'
      : '';

    accountIcon.innerHTML = `
      <div class="user-menu">
        <img src="img/icons/account.png" alt="Account">
        <div class="user-copy">
          <span class="user-kicker">Signed in</span>
          <strong class="user-name">${profile.fullName || profile.email}</strong>
        </div>
        <div class="dropdown-menu">
          <ul>
            ${adminLink}
            <li><a href="account.html">My Account</a></li>
            <li><a href="orders.html">My Orders</a></li>
            <li><a href="javascript:logout()">Log Out</a></li>
          </ul>
        </div>
      </div>
    `;
    return;
  }

  accountIcon.innerHTML = `
    <div class="dropdown">
      <img src="img/icons/account.png" title="Account" alt="Account">
      <div class="dropdown-menu login-links">
        <ul>
          <li><a href="login.html">Log In</a></li>
          <li><a href="register.html">Sign Up</a></li>
        </ul>
      </div>
    </div>
  `;
};

window.logout = logout;

document.addEventListener('DOMContentLoaded', initHeaderAuth);
// Load chatbot widget (non-blocking)
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    try {
      import('./chatbot-widget.js');
    } catch (e) {
      // dynamic import may not be supported in some environments; fallback to adding script
      const s = document.createElement('script');
      s.defer = true;
      s.src = 'js/chatbot-widget.js';
      document.head.appendChild(s);
    }
  });
}
