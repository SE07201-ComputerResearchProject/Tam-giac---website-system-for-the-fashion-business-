// Account page - Load dynamic profile
import { loadProfile, apiCall, isLoggedIn, navigateWithLoader } from './auth.js';
import { initHeaderAuth } from './header-auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  initHeaderAuth();

  const profileImg = document.querySelector('.profile-img');
  const form = document.querySelector('.checkout-form');
  const profileName = document.querySelector('.profile-img h2');
  const profileEmail = document.querySelector('.profile-img p');
  const updateBtn = document.getElementById('update');

  if (!isLoggedIn()) {
    navigateWithLoader('login.html', 0);
    return;
  }

  try {
    const profile = await loadProfile();
    profileName.textContent = profile.fullName || profile.email;
    profileEmail.textContent = profile.email;
    // Fill form
    document.getElementById('fname').value = profile.fullName ? profile.fullName.split(' ')[0] : '';
    document.getElementById('lname').value = profile.fullName ? profile.fullName.split(' ').slice(1).join(' ') : '';
    document.getElementById('mobile').value = profile.phone || '';
  } catch (error) {
    console.error('Load profile error:', error);
    navigateWithLoader('login.html', 0);
  }

  // Update profile
  updateBtn.addEventListener('click', async () => {
    const fullName = document.getElementById('fname').value + ' ' + document.getElementById('lname').value;
    const phone = document.getElementById('mobile').value;
    
    try {
      await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone })
      });
      alert('Cập nhật thành công!');
      window.location.reload();
    } catch (error) {
      alert('Lỗi cập nhật: ' + (error.error || error.message));
    }
  });
});
