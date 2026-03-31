import { isLoggedIn, loadProfile, navigateWithLoader } from './auth.js?v=20260320b';

const ORDERS_KEY = 'tamgiac_orders';

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`;

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('vi-VN');
};

const readOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const renderProfile = async () => {
  const profileName = document.querySelector('.profile-img h2');
  const profileEmail = document.querySelector('.profile-img p');

  if (!profileName || !profileEmail) {
    return;
  }

  if (!isLoggedIn()) {
    profileName.textContent = 'Khach';
    profileEmail.textContent = 'Vui long dang nhap';
    return;
  }

  const profile = await loadProfile().catch(() => null);
  if (!profile) {
    return;
  }

  profileName.textContent = profile.fullName || 'Tai khoan Tam Giac';
  profileEmail.textContent = profile.email || '';
};

const renderOrders = () => {
  const tbody = document.querySelector('.order-detail table tbody');
  if (!tbody) {
    return;
  }

  const orders = readOrders();

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="6">Chua co don hang nao. Hay quay lai shop de mua sam.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map((order) => [
    '<tr>',
    `<td>${formatDate(order.createdAt)}</td>`,
    `<td>${order.id || '-'}</td>`,
    `<td>${formatPrice(order.total)}</td>`,
    `<td>${order.paymentLabel || order.paymentMethod || '-'}</td>`,
    `<td>${order.status || 'Moi tao'}</td>`,
    `<td><a href="shop.html">Mua tiep</a></td>`,
    '</tr>'
  ].join('')).join('');
};

document.addEventListener('DOMContentLoaded', async () => {
  await renderProfile();
  renderOrders();

  const logoutLink = Array.from(document.querySelectorAll('.profile a')).find((link) =>
    /logout/i.test(link.textContent || '')
  );

  if (logoutLink) {
    logoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem('token');
      navigateWithLoader('login.html', 80);
    });
  }
});
