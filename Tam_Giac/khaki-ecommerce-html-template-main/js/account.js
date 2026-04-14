import { loadProfile, apiCall, isLoggedIn, navigateWithLoader, logout } from './auth.js';
import { initHeaderAuth } from './header-auth.js';

const showAlert = (message) => {
  window.alert(message);
};

const splitFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  };
};

const setInputValue = (id, value = '') => {
  const field = document.getElementById(id);
  if (!field) {
    return;
  }

  field.value = value || '';
};

const setSelectValue = (id, value = '') => {
  const field = document.getElementById(id);
  if (!field) {
    return;
  }

  const normalized = String(value || '').trim();
  if (!normalized) {
    field.value = '';
    return;
  }

  const optionExists = Array.from(field.options).some((option) => option.value === normalized);
  if (!optionExists) {
    const option = document.createElement('option');
    option.value = normalized;
    option.textContent = normalized;
    field.appendChild(option);
  }

  field.value = normalized;
};

const applyProfileToView = (profile, profileName, profileEmail) => {
  if (!profile) {
    return;
  }

  const { firstName, lastName } = splitFullName(profile.fullName);

  if (profileName) {
    profileName.textContent = profile.fullName || profile.email || 'Tam Giac account';
  }

  if (profileEmail) {
    profileEmail.textContent = profile.email || '';
  }

  setInputValue('fname', firstName);
  setInputValue('lname', lastName);
  setInputValue('cname', profile.companyName || '');
  setSelectValue('country', profile.country || '');
  setSelectValue('city', profile.city || '');
  setInputValue('address', profile.address || '');
  setInputValue('tel', profile.tel || '');
  setInputValue('mobile', profile.phone || '');
};

document.addEventListener('DOMContentLoaded', async () => {
  initHeaderAuth();

  const form = document.querySelector('.checkout-form');
  const profileName = document.querySelector('.profile-img h2');
  const profileEmail = document.querySelector('.profile-img p');
  const submitButton = document.getElementById('update');
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

    applyProfileToView(profile, profileName, profileEmail);
  } catch (error) {
    navigateWithLoader('login.html', 0);
    return;
  }

  if (!form) {
    return;
  }

  const setLoading = (loading) => {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = loading;
    submitButton.value = loading ? 'Updating...' : 'Update';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fullName = `${document.getElementById('fname').value} ${document.getElementById('lname').value}`.trim();
    const payload = {
      fullName: fullName || null,
      companyName: document.getElementById('cname').value.trim() || null,
      country: document.getElementById('country').value.trim() || null,
      city: document.getElementById('city').value.trim() || null,
      address: document.getElementById('address').value.trim() || null,
      tel: document.getElementById('tel').value.trim() || null,
      phone: document.getElementById('mobile').value.trim() || null
    };

    setLoading(true);

    try {
      const result = await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const nextProfile = result.user || {
        ...payload,
        email: profileEmail ? profileEmail.textContent : ''
      };

      applyProfileToView(nextProfile, profileName, profileEmail);
      await initHeaderAuth();
      showAlert('Account updated successfully.');
    } catch (error) {
      showAlert(error.error || 'Unable to update your account right now.');
    } finally {
      setLoading(false);
    }
  });
});
