import { loadProfile, apiCall, isLoggedIn, navigateWithLoader, logout } from './auth.js';
import { initHeaderAuth } from './header-auth.js';

const showAlert = (message, type = 'info') => {
  window.alert(message);
};

document.addEventListener('DOMContentLoaded', async () => {
  initHeaderAuth();

  const form = document.querySelector('.checkout-form');
  const profileName = document.querySelector('.profile-img h2');
  const profileEmail = document.querySelector('.profile-img p');
  const logoutLink = Array.from(document.querySelectorAll('.profile a')).find((link) =>
    /logout/i.test(link.textContent || '')
  );

  if (!isLoggedIn()) {
    navigateWithLoader('login.html', 0);
    return;
  }

  if (logoutLink) {
    logoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    });
  }

  try {
    const profile = await loadProfile();
    if (!profile) {
      throw new Error('Profile not found');
    }

    profileName.textContent = profile.fullName || profile.email;
    profileEmail.textContent = profile.email;
    document.getElementById('fname').value = profile.fullName ? profile.fullName.split(' ')[0] : '';
    document.getElementById('lname').value = profile.fullName ? profile.fullName.split(' ').slice(1).join(' ') : '';
    document.getElementById('mobile').value = profile.phone || '';
  } catch (error) {
    navigateWithLoader('login.html', 0);
    return;
  }

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fullName = `${document.getElementById('fname').value} ${document.getElementById('lname').value}`.trim();
    const phone = document.getElementById('mobile').value.trim();

    try {
      const result = await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone })
      });

      profileName.textContent = result.user?.fullName || fullName;
      showAlert('Cap nhat tai khoan thanh cong.');
    } catch (error) {
      showAlert(error.error || 'Khong the cap nhat tai khoan.', 'error');
    }
  });
});
