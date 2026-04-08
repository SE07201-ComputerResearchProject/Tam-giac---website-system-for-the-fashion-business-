import { isLoggedIn, loadProfile, navigateWithLoader, logout, apiCall } from './auth.js';

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`;

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('vi-VN');
};

const renderProfile = async () => {
  const profileName = document.querySelector('.profile-img h2');
  const profileEmail = document.querySelector('.profile-img p');

  if (!profileName || !profileEmail) {
    return;
  }

  const profile = await loadProfile().catch(() => null);
  if (!profile) {
    profileName.textContent = 'Guest';
    profileEmail.textContent = 'Please log in';
    return;
  }

  profileName.textContent = profile.fullName || 'Tam Giac account';
  profileEmail.textContent = profile.email || '';
};

const renderOrders = async () => {
  const tbody = document.querySelector('.order-detail table tbody');
  if (!tbody) {
    return;
  }

  try {
    const orders = await apiCall('/orders/my');

    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="6">No orders yet. Head back to the shop to start shopping.</td></tr>';
      return;
    }

    tbody.innerHTML = orders
      .map((order) => [
        '<tr>',
        `<td>${formatDate(order.createdAt)}</td>`,
        `<td>${order.reference || order.id || '-'}</td>`,
        `<td>${formatPrice(order.totalAmount)}</td>`,
        `<td>${order.paymentLabel || 'Cash on delivery'}</td>`,
        `<td>${order.statusLabel || order.status || 'Pending'}</td>`,
        `<td><a href="shop.html">Shop again</a></td>`,
        '</tr>'
      ].join(''))
      .join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="6">Could not load your orders right now.</td></tr>';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    navigateWithLoader('login.html', 0);
    return;
  }

  await renderProfile();
  await renderOrders();

  const logoutLink = Array.from(document.querySelectorAll('.profile a')).find((link) =>
    /logout/i.test(link.textContent || '')
  );

  if (logoutLink) {
    logoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    });
  }
});
