const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const state = {
  health: null,
  register: null,
  login: null,
  profile: null,
  token: ''
};

const form = document.getElementById('proofForm');
const statusBox = document.getElementById('statusBox');
const proofBanner = document.getElementById('proofBanner');
const consoleLog = document.getElementById('consoleLog');

const elements = {
  backendOrigin: document.getElementById('backendOrigin'),
  fullName: document.getElementById('fullName'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  checkDbBtn: document.getElementById('checkDbBtn'),
  registerBtn: document.getElementById('registerBtn'),
  loginBtn: document.getElementById('loginBtn'),
  generateIdentityBtn: document.getElementById('generateIdentityBtn'),
  resetLogBtn: document.getElementById('resetLogBtn'),
  dbBadge: document.getElementById('dbBadge'),
  registerBadge: document.getElementById('registerBadge'),
  loginBadge: document.getElementById('loginBadge'),
  profileBadge: document.getElementById('profileBadge'),
  dbEvidence: document.getElementById('dbEvidence'),
  registerEvidence: document.getElementById('registerEvidence'),
  loginEvidence: document.getElementById('loginEvidence'),
  profileEvidence: document.getElementById('profileEvidence')
};

const stepDetails = {
  db: document.getElementById('step-db-detail'),
  register: document.getElementById('step-register-detail'),
  login: document.getElementById('step-login-detail')
};

const stepCards = {
  db: document.querySelector('[data-step-card="db"]'),
  register: document.querySelector('[data-step-card="register"]'),
  login: document.querySelector('[data-step-card="login"]')
};

const setStatus = (message, tone = '') => {
  statusBox.textContent = message;
  statusBox.className = tone ? `status-box ${tone}` : 'status-box';
};

const setStepState = (step, stateName, detail) => {
  const card = stepCards[step];
  const detailNode = stepDetails[step];

  if (card) {
    card.className = `step-card ${stateName}`;
  }

  if (detailNode && detail) {
    detailNode.textContent = detail;
  }
};

const updateProofBanner = () => {
  const chip = proofBanner.querySelector('.proof-chip');
  const title = proofBanner.querySelector('strong');
  const description = proofBanner.querySelector('p');
  const proofComplete = Boolean(state.health && state.register && state.profile);

  if (proofComplete) {
    chip.textContent = 'Proved';
    title.textContent = 'Database proof complete.';
    description.textContent =
      'The backend reached SQL Server, inserted a new account, then logged in and read the profile back.';
    return;
  }

  if (state.health && !state.register) {
    chip.textContent = 'DB online';
    title.textContent = 'Database health is confirmed.';
    description.textContent =
      'Next, register a fresh account to prove a write into SQL Server.';
    return;
  }

  if (state.register && !state.profile) {
    chip.textContent = 'Account created';
    title.textContent = 'The write step succeeded.';
    description.textContent =
      'Now complete reCAPTCHA again and load the profile to prove the read step.';
    return;
  }

  chip.textContent = 'Pending';
  title.textContent = 'Run the proof steps below.';
  description.textContent =
    'The demo only marks success when the backend responds and the account is read back from the API.';
};

const formatJson = (value) => {
  if (value === undefined || value === null) {
    return 'No data yet.';
  }

  return JSON.stringify(value, null, 2);
};

const setEvidence = (kind, badgeText, payload) => {
  const badgeMap = {
    db: elements.dbBadge,
    register: elements.registerBadge,
    login: elements.loginBadge,
    profile: elements.profileBadge
  };
  const evidenceMap = {
    db: elements.dbEvidence,
    register: elements.registerEvidence,
    login: elements.loginEvidence,
    profile: elements.profileEvidence
  };

  const badge = badgeMap[kind];
  const evidence = evidenceMap[kind];

  if (badge) {
    badge.textContent = badgeText;
  }

  if (evidence) {
    evidence.textContent = formatJson(payload);
  }
};

const addConsoleEntry = (tone, title, message, payload) => {
  const entry = document.createElement('article');
  entry.className = `console-entry ${tone}`;

  const time = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const header = document.createElement('header');
  header.innerHTML = `<strong>${title}</strong><time>${time}</time>`;
  entry.appendChild(header);

  const text = document.createElement('p');
  text.textContent = message;
  entry.appendChild(text);

  if (payload !== undefined) {
    const code = document.createElement('code');
    code.textContent = formatJson(payload);
    entry.appendChild(code);
  }

  consoleLog.prepend(entry);
};

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const getBackendOrigin = () => {
  const rawValue = elements.backendOrigin.value.trim();
  if (!rawValue) {
    throw new Error('Please enter the backend origin first. Example: http://127.0.0.1:3002');
  }

  try {
    const parsed = new URL(rawValue);
    return trimTrailingSlash(parsed.origin);
  } catch {
    throw new Error('The backend origin is invalid. Example: http://127.0.0.1:3002');
  }
};

const readForm = () => ({
  fullName: elements.fullName.value.trim(),
  email: elements.email.value.trim().toLowerCase(),
  password: elements.password.value
});

const ensureValidIdentity = () => {
  const identity = readForm();

  if (!identity.fullName || !identity.email || !identity.password) {
    throw new Error('Please complete full name, email, and password before running the proof.');
  }

  if (!PASSWORD_RULE.test(identity.password)) {
    throw new Error(
      'The password must contain at least 8 characters, uppercase, lowercase, a number, and a special character.'
    );
  }

  return identity;
};

const getRecaptchaToken = () => {
  if (!window.grecaptcha || typeof window.grecaptcha.getResponse !== 'function') {
    throw new Error('reCAPTCHA is still loading. Wait a moment and try again.');
  }

  const token = window.grecaptcha.getResponse();
  if (!token) {
    throw new Error('Please complete reCAPTCHA before running this secured step.');
  }

  return token;
};

const resetRecaptcha = () => {
  if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
    try {
      window.grecaptcha.reset();
    } catch (_) {}
  }
};

const fetchJson = async (url, options = {}) => {
  const config = {
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    ...options
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new Error(
      'The browser could not reach the backend. Make sure the backend server is running on the chosen origin.'
    );
  }

  const rawText = await response.text();
  let data = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}.`);
  }

  return data;
};

const setLoading = (button, loading, idleLabel, activeLabel) => {
  button.disabled = loading;
  button.textContent = loading ? activeLabel : idleLabel;
};

const resetProofState = ({ keepHealth = true } = {}) => {
  state.register = null;
  state.login = null;
  state.profile = null;
  state.token = '';

  if (!keepHealth) {
    state.health = null;
    setStepState('db', 'pending', 'Check /health/db first.');
    setEvidence('db', 'Waiting', 'No health check yet.');
  }

  setStepState('register', 'pending', 'Create a new user through /api/auth/register.');
  setStepState('login', 'pending', 'Use /api/auth/login and /api/auth/me to read back the record.');
  setEvidence('register', 'Waiting', 'No account created yet.');
  setEvidence('login', 'Waiting', 'No token yet.');
  setEvidence('profile', 'Waiting', 'No profile loaded yet.');
  updateProofBanner();
};

const generateDemoIdentity = () => {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6);

  resetProofState();
  elements.fullName.value = 'Tam Giac Demo User';
  elements.email.value = `proof.${stamp}.${suffix}@example.com`;
  elements.password.value = 'KhakiDemo@2026';

  setStatus(
    'Fresh demo credentials generated. Complete reCAPTCHA before Register, then complete it again before Login.',
    'success'
  );

  addConsoleEntry(
    'success',
    'Fresh demo identity ready',
    'A unique email was generated so the next registration can prove a new insert.',
    readForm()
  );
};

const checkDbHealth = async () => {
  const backendOrigin = getBackendOrigin();
  const healthUrl = `${backendOrigin}/health/db`;

  setLoading(elements.checkDbBtn, true, '1. Check DB health', 'Checking DB...');
  setStatus('Checking backend database health...', 'running');
  setStepState('db', 'running', 'Calling /health/db now.');
  addConsoleEntry('running', 'Health check started', `GET ${healthUrl}`);

  try {
    const data = await fetchJson(healthUrl);
    state.health = data;

    setStepState('db', 'success', `Database responded at ${data.timestamp || 'the backend health endpoint'}.`);
    setEvidence('db', 'Connected', data);
    setStatus('Database health check passed.', 'success');
    addConsoleEntry('success', 'Health check passed', 'The backend confirmed DB access.', data);
  } catch (error) {
    state.health = null;
    setStepState('db', 'error', error.message);
    setEvidence('db', 'Failed', { error: error.message });
    setStatus(error.message, 'error');
    addConsoleEntry('error', 'Health check failed', error.message);
  } finally {
    setLoading(elements.checkDbBtn, false, '1. Check DB health', 'Checking DB...');
    updateProofBanner();
  }
};

const registerAccount = async () => {
  const backendOrigin = getBackendOrigin();
  const identity = ensureValidIdentity();
  const recaptchaToken = getRecaptchaToken();
  const registerUrl = `${backendOrigin}/api/auth/register`;

  setLoading(elements.registerBtn, true, '2. Register in DB', 'Registering...');
  setStatus('Creating the account through the backend API...', 'running');
  setStepState('register', 'running', 'Posting a brand-new account to /api/auth/register.');
  addConsoleEntry('running', 'Register request started', `POST ${registerUrl}`, {
    fullName: identity.fullName,
    email: identity.email
  });

  try {
    const payload = {
      email: identity.email,
      password: identity.password,
      fullName: identity.fullName,
      recaptchaToken
    };
    const data = await fetchJson(registerUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    state.register = { ...data, identity };
    state.login = null;
    state.profile = null;
    state.token = '';

    setStepState(
      'register',
      'success',
      `Account ${identity.email} was created successfully.`
    );
    setStepState(
      'login',
      'pending',
      'Complete reCAPTCHA again, then log in to read the profile back.'
    );
    setEvidence('register', 'Inserted', state.register);
    setEvidence('login', 'Waiting', 'Register succeeded. Run the login step next.');
    setEvidence('profile', 'Waiting', 'No profile read yet.');
    setStatus(
      'Registration succeeded. Complete reCAPTCHA one more time, then click Login and load profile.',
      'success'
    );
    addConsoleEntry(
      'success',
      'Register request passed',
      'The backend accepted the insert and returned a success response.',
      state.register
    );
  } catch (error) {
    state.register = null;
    state.login = null;
    state.profile = null;
    state.token = '';
    setStepState('register', 'error', error.message);
    setStepState('login', 'pending', 'Fix the register step first, then log in to read the profile back.');
    setEvidence('register', 'Failed', { error: error.message, attemptedEmail: identity.email });
    setEvidence('login', 'Waiting', 'No token yet.');
    setEvidence('profile', 'Waiting', 'No profile loaded yet.');
    setStatus(error.message, 'error');
    addConsoleEntry('error', 'Register request failed', error.message, {
      attemptedEmail: identity.email
    });
  } finally {
    resetRecaptcha();
    setLoading(elements.registerBtn, false, '2. Register in DB', 'Registering...');
    updateProofBanner();
  }
};

const loginAndLoadProfile = async () => {
  if (!state.register) {
    throw new Error('Register a fresh account first so the demo can prove a real database insert.');
  }

  const backendOrigin = getBackendOrigin();
  const recaptchaToken = getRecaptchaToken();
  const identity = state.register.identity;
  const loginUrl = `${backendOrigin}/api/auth/login`;
  const profileUrl = `${backendOrigin}/api/auth/me`;

  setLoading(elements.loginBtn, true, '3. Login and load profile', 'Logging in...');
  setStatus('Logging in and reading the profile from the backend...', 'running');
  setStepState('login', 'running', 'Posting credentials to /api/auth/login.');
  addConsoleEntry('running', 'Login request started', `POST ${loginUrl}`, {
    email: identity.email
  });

  try {
    const loginData = await fetchJson(loginUrl, {
      method: 'POST',
      body: JSON.stringify({
        email: identity.email,
        password: identity.password,
        recaptchaToken
      })
    });

    state.login = loginData;
    state.token = loginData.token;
    setEvidence('login', 'Token issued', {
      tokenPreview: `${loginData.token.slice(0, 28)}...`,
      message: loginData.message,
      mfaEnabled: loginData.mfaEnabled
    });
    addConsoleEntry('success', 'Login request passed', 'The backend issued a token.', {
      tokenPreview: `${loginData.token.slice(0, 28)}...`
    });

    const profile = await fetchJson(profileUrl, {
      headers: {
        Authorization: `Bearer ${loginData.token}`
      }
    });

    state.profile = profile;
    setStepState(
      'login',
      'success',
      `Profile read back for ${profile.email}. Database write and read are both confirmed.`
    );
    setEvidence('profile', 'Read back', profile);
    setStatus(
      'Proof complete. The account was inserted, authenticated, and read back from the backend.',
      'success'
    );
    addConsoleEntry('success', 'Profile loaded', 'The backend returned the profile for the newly created account.', profile);
  } catch (error) {
    state.login = null;
    state.profile = null;
    state.token = '';
    setStepState('login', 'error', error.message);
    setEvidence('login', 'Failed', { error: error.message });
    setEvidence('profile', 'Failed', { error: 'Profile was not loaded because login/read failed.' });
    setStatus(error.message, 'error');
    addConsoleEntry('error', 'Login/profile step failed', error.message);
  } finally {
    resetRecaptcha();
    setLoading(elements.loginBtn, false, '3. Login and load profile', 'Logging in...');
    updateProofBanner();
  }
};

const clearConsole = () => {
  consoleLog.innerHTML = '';
  addConsoleEntry(
    'running',
    'Console cleared',
    'The visual log was reset. Existing proof state is still preserved until you generate a new account.'
  );
};

elements.generateIdentityBtn.addEventListener('click', generateDemoIdentity);
elements.checkDbBtn.addEventListener('click', () => {
  checkDbHealth().catch((error) => {
    setStatus(error.message, 'error');
    addConsoleEntry('error', 'Unexpected health-check error', error.message);
  });
});
elements.registerBtn.addEventListener('click', () => {
  registerAccount().catch((error) => {
    setStatus(error.message, 'error');
    addConsoleEntry('error', 'Unexpected register error', error.message);
  });
});
elements.loginBtn.addEventListener('click', () => {
  loginAndLoadProfile().catch((error) => {
    setStatus(error.message, 'error');
    addConsoleEntry('error', 'Unexpected login error', error.message);
  });
});
elements.resetLogBtn.addEventListener('click', clearConsole);

form.addEventListener('submit', (event) => {
  event.preventDefault();
});

generateDemoIdentity();
addConsoleEntry(
  'running',
  'Proof lab ready',
  'Use the buttons in order: check DB, register account, then complete reCAPTCHA again and log in.'
);
updateProofBanner();
