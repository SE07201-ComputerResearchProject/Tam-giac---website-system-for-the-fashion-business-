(function () {
  if (typeof window === 'undefined' || window.__TG_AI_CHATBOT_BOOTED__) {
    return;
  }

  window.__TG_AI_CHATBOT_BOOTED__ = true;

  const CONFIG = {
    apiUrl: '/api/ai-chat',
    stylesheetHref: 'css/ai-chatbot.css?v=20260412b',
    historyLimit: 10,
    moveDelayMin: 3400,
    moveDelayMax: 6400
  };

  const state = {
    isOpen: false,
    isReady: false,
    isBusy: false,
    history: [],
    position: { x: 24, y: 120 },
    rafId: 0,
    roamTimer: 0,
    webTimer: 0,
    requestController: null,
    ui: null
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function sanitizeText(value, maxLength) {
    if (typeof value !== 'string') {
      return '';
    }

    const text = value
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return typeof maxLength === 'number' ? text.slice(0, maxLength) : text;
  }

  function buildMascotSvg() {
    return `
      <span class="tg-ai-webburst tg-ai-webburst-left" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="tg-ai-webburst tg-ai-webburst-right" aria-hidden="true"><i></i><i></i><i></i></span>
      <svg class="tg-ai-mascot-body" viewBox="0 0 180 190" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="tgSpiderSuit" x1="38" y1="18" x2="144" y2="150" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FF8599"></stop>
            <stop offset="0.4" stop-color="#FF4C67"></stop>
            <stop offset="1" stop-color="#7B1433"></stop>
          </linearGradient>
          <linearGradient id="tgSpiderBody" x1="58" y1="80" x2="124" y2="148" gradientUnits="userSpaceOnUse">
            <stop stop-color="#2B6BFF"></stop>
            <stop offset="1" stop-color="#0C173F"></stop>
          </linearGradient>
          <radialGradient id="tgSpiderHeadGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(74 46) rotate(43) scale(36 32)">
            <stop stop-color="#FFD0D9"></stop>
            <stop offset="1" stop-color="#FFD0D9" stop-opacity="0"></stop>
          </radialGradient>
          <linearGradient id="tgSpiderEye" x1="58" y1="57" x2="101" y2="92" gradientUnits="userSpaceOnUse">
            <stop stop-color="#8BF7FF"></stop>
            <stop offset="1" stop-color="#4EDBFF"></stop>
          </linearGradient>
        </defs>
        <ellipse class="tg-ai-shadow-shape" cx="90" cy="174" rx="36" ry="10"></ellipse>
        <g class="tg-ai-figure">
          <g class="tg-ai-leg tg-ai-leg-left">
            <path class="tg-ai-limb-stroke" d="M83 121C74 136 70 149 63 165"></path>
            <path class="tg-ai-limb-accent" d="M81 123C74 136 70 147 65 160"></path>
            <ellipse class="tg-ai-foot" cx="60" cy="169" rx="11" ry="8"></ellipse>
          </g>
          <g class="tg-ai-leg tg-ai-leg-right">
            <path class="tg-ai-limb-stroke" d="M103 121C111 135 117 148 124 164"></path>
            <path class="tg-ai-limb-accent" d="M103 123C111 136 116 147 121 160"></path>
            <ellipse class="tg-ai-foot" cx="128" cy="168" rx="11" ry="8"></ellipse>
          </g>
          <g class="tg-ai-arm tg-ai-arm-left">
            <path class="tg-ai-limb-stroke" d="M72 95C55 104 47 117 43 130"></path>
            <path class="tg-ai-limb-accent" d="M71 97C57 105 50 117 46 127"></path>
            <circle class="tg-ai-hand" cx="42" cy="134" r="9"></circle>
          </g>
          <g class="tg-ai-arm tg-ai-arm-right">
            <path class="tg-ai-limb-stroke" d="M108 95C126 101 138 113 145 126"></path>
            <path class="tg-ai-limb-accent" d="M109 97C125 103 135 113 141 123"></path>
            <circle class="tg-ai-hand" cx="148" cy="130" r="9"></circle>
          </g>
          <g class="tg-ai-torso-group">
            <path d="M71 84C79 77 101 77 109 84C118 92 122 105 120 123C119 139 109 150 90 150C71 150 61 139 60 123C58 105 62 92 71 84Z" fill="url(#tgSpiderBody)" stroke="#0B1433" stroke-width="6"></path>
            <path d="M90 84V149" stroke="rgba(255,255,255,0.16)" stroke-width="3" stroke-linecap="round"></path>
            <path d="M74 90C79 86 101 86 106 90" stroke="rgba(255,255,255,0.24)" stroke-width="3" stroke-linecap="round"></path>
            <path d="M66 106C74 102 81 100 90 99C99 100 106 102 114 106" stroke="#FF4C67" stroke-width="7" stroke-linecap="round"></path>
            <path d="M90 98V127" stroke="#73E8FF" stroke-width="3.6" stroke-linecap="round"></path>
            <path d="M90 105L82 113" stroke="#73E8FF" stroke-width="3.2" stroke-linecap="round"></path>
            <path d="M90 105L98 113" stroke="#73E8FF" stroke-width="3.2" stroke-linecap="round"></path>
            <path d="M90 116L81 122" stroke="#73E8FF" stroke-width="3" stroke-linecap="round"></path>
            <path d="M90 116L99 122" stroke="#73E8FF" stroke-width="3" stroke-linecap="round"></path>
          </g>
          <g class="tg-ai-head-group">
            <circle cx="90" cy="55" r="40" fill="url(#tgSpiderSuit)" stroke="#0B1433" stroke-width="6"></circle>
            <circle cx="90" cy="55" r="40" fill="url(#tgSpiderHeadGlow)" opacity="0.65"></circle>
            <path d="M90 17V92" stroke="rgba(255,255,255,0.18)" stroke-width="3" stroke-linecap="round"></path>
            <path d="M59 41C69 31 81 26 90 26C99 26 111 31 121 41" stroke="rgba(10,15,35,0.82)" stroke-width="5" stroke-linecap="round"></path>
            <path d="M54 58C64 44 76 39 90 39C82 57 72 66 60 68C53 66 50 63 54 58Z" class="tg-ai-eye" fill="url(#tgSpiderEye)" stroke="#214667" stroke-width="3"></path>
            <path d="M126 58C116 44 104 39 90 39C98 57 108 66 120 68C127 66 130 63 126 58Z" class="tg-ai-eye" fill="url(#tgSpiderEye)" stroke="#214667" stroke-width="3"></path>
            <path d="M82 74C86 77 94 77 98 74" class="tg-ai-mouth" fill="none" stroke="rgba(14,20,44,0.84)" stroke-width="4" stroke-linecap="round"></path>
          </g>
        </g>
      </svg>
    `;
  }

  function buildHeaderSvg() {
    return `
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="paint0_linear_header" x1="26" y1="16" x2="97" y2="95" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FF879A"></stop>
            <stop offset="0.42" stop-color="#FF4C67"></stop>
            <stop offset="1" stop-color="#214CFF"></stop>
          </linearGradient>
          <linearGradient id="paint1_linear_header" x1="41" y1="60" x2="79" y2="92" gradientUnits="userSpaceOnUse">
            <stop stop-color="#2C6DFF"></stop>
            <stop offset="1" stop-color="#0D173F"></stop>
          </linearGradient>
        </defs>
        <path d="M61 18C75 18 88 27 93 40C99 55 96 72 84 82C72 91 50 91 38 82C26 72 23 55 29 40C34 27 47 18 61 18Z" fill="url(#paint0_linear_header)" stroke="#0B1433" stroke-width="5"></path>
        <path d="M43 68C47 58 54 52 61 52C68 52 75 58 79 68C82 77 79 88 70 94C61 99 49 99 40 94C31 88 28 77 31 68C33 63 37 59 43 56" fill="url(#paint1_linear_header)" stroke="#0B1433" stroke-width="5" stroke-linejoin="round"></path>
        <path d="M36 52C44 41 51 38 61 38C55 51 48 57 39 59C35 57 33 55 36 52Z" fill="#77EEFF"></path>
        <path d="M86 52C78 41 71 38 61 38C67 51 74 57 83 59C87 57 89 55 86 52Z" fill="#77EEFF"></path>
      </svg>
    `;
  }

  function buildMarkup() {
    return `
      <div class="tg-ai-root" data-state="closed">
        <div class="tg-ai-backdrop"></div>
        <button
          class="tg-ai-mascot"
          type="button"
          aria-label="Mở trợ lý AI Tam Giac"
          aria-expanded="false"
        >
          <span class="tg-ai-rope"></span>
          <span class="tg-ai-mascot-shell">${buildMascotSvg()}</span>
        </button>

        <section class="tg-ai-panel" aria-hidden="true" aria-label="Tam Giac AI Assistant">
          <header class="tg-ai-panel-header">
            <div class="tg-ai-avatar">${buildHeaderSvg()}</div>
            <div class="tg-ai-panel-title">
              <span class="tg-ai-panel-kicker">Spider Assistant</span>
              <strong>Tam Giac AI Tư Vấn</strong>
              <p>Hỏi về sản phẩm, cách mua hàng, giao hàng, đăng nhập hoặc hướng dẫn trên trang.</p>
            </div>
            <button class="tg-ai-close" type="button" aria-label="Đóng cửa sổ chat">×</button>
          </header>

          <div class="tg-ai-panel-body">
            <div class="tg-ai-scroll" role="log" aria-live="polite" aria-label="Lịch sử chat">
              <div class="tg-ai-intro">
                <p>Mình là trợ lý tư vấn ngay trên website. Bạn có thể hỏi rất tự nhiên, mình sẽ hỗ trợ nhanh và gọn.</p>
                <div class="tg-ai-quick-list">
                  <button class="tg-ai-quick" type="button" data-quick-message="Gợi ý sản phẩm phù hợp cho tôi">Gợi ý sản phẩm</button>
                  <button class="tg-ai-quick" type="button" data-quick-message="Hướng dẫn tôi cách mua hàng">Cách mua hàng</button>
                  <button class="tg-ai-quick" type="button" data-quick-message="Tôi cần hỗ trợ đăng nhập hoặc đăng ký">Hỗ trợ tài khoản</button>
                </div>
              </div>
            </div>
          </div>

          <footer class="tg-ai-panel-footer">
            <div class="tg-ai-status" aria-live="polite"></div>
            <form class="tg-ai-form">
              <div class="tg-ai-input-wrap">
                <textarea
                  class="tg-ai-textarea"
                  rows="1"
                  maxlength="1200"
                  placeholder="Nhập câu hỏi của bạn..."
                  aria-label="Nhập câu hỏi cho chatbot"
                ></textarea>
              </div>
              <button class="tg-ai-send" type="submit" aria-label="Gửi tin nhắn">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 20L21 12L3 4L4.8 10.6L14 12L4.8 13.4L3 20Z" fill="currentColor"></path>
                </svg>
              </button>
            </form>
            <div class="tg-ai-hint">Enter để gửi, Shift + Enter để xuống dòng.</div>
          </footer>
        </section>
      </div>
    `;
  }

  function createHost() {
    const host = document.createElement('div');
    host.id = 'tg-ai-assistant-host';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483000';
    host.style.pointerEvents = 'none';
    document.body.appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CONFIG.stylesheetHref;
    shadowRoot.appendChild(link);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildMarkup();
    shadowRoot.appendChild(wrapper);

    const root = shadowRoot.querySelector('.tg-ai-root');
    const mascot = shadowRoot.querySelector('.tg-ai-mascot');
    const panel = shadowRoot.querySelector('.tg-ai-panel');
    const closeBtn = shadowRoot.querySelector('.tg-ai-close');
    const scroll = shadowRoot.querySelector('.tg-ai-scroll');
    const form = shadowRoot.querySelector('.tg-ai-form');
    const textarea = shadowRoot.querySelector('.tg-ai-textarea');
    const sendBtn = shadowRoot.querySelector('.tg-ai-send');
    const status = shadowRoot.querySelector('.tg-ai-status');
    const quickButtons = Array.from(shadowRoot.querySelectorAll('[data-quick-message]'));
    const backdrop = shadowRoot.querySelector('.tg-ai-backdrop');

    return {
      host,
      shadowRoot,
      root,
      mascot,
      panel,
      closeBtn,
      scroll,
      form,
      textarea,
      sendBtn,
      status,
      quickButtons,
      backdrop
    };
  }

  function getViewportBounds() {
    const size = window.innerWidth <= 760 ? 96 : 112;
    const height = window.innerWidth <= 760 ? 176 : 196;
    const xMin = 12;
    const xMax = Math.max(12, window.innerWidth - size - 14);
    const yMin = 78;
    const yMax = Math.max(yMin, window.innerHeight - height - 18);

    return {
      size,
      height,
      xMin,
      xMax,
      yMin,
      yMax
    };
  }

  function getAnchorPoints() {
    const bounds = getViewportBounds();

    return [
      { x: bounds.xMax, y: clamp(window.innerHeight * 0.22, bounds.yMin, bounds.yMax) },
      { x: bounds.xMax, y: clamp(window.innerHeight * 0.56, bounds.yMin, bounds.yMax) },
      { x: bounds.xMax, y: clamp(window.innerHeight * 0.8, bounds.yMin, bounds.yMax) },
      { x: bounds.xMin, y: clamp(window.innerHeight * 0.3, bounds.yMin, bounds.yMax) },
      { x: bounds.xMin, y: clamp(window.innerHeight * 0.7, bounds.yMin, bounds.yMax) },
      { x: clamp(window.innerWidth * 0.48, bounds.xMin, bounds.xMax), y: clamp(window.innerHeight * 0.82, bounds.yMin, bounds.yMax) }
    ];
  }

  function chooseNextAnchor() {
    const anchors = getAnchorPoints();
    let selected = anchors[Math.floor(Math.random() * anchors.length)];

    for (let i = 0; i < 4; i += 1) {
      const candidate = anchors[Math.floor(Math.random() * anchors.length)];
      const distance = Math.hypot(candidate.x - state.position.x, candidate.y - state.position.y);
      if (distance > 90) {
        selected = candidate;
        break;
      }
    }

    return selected;
  }

  function setMascotMode(mode) {
    if (!state.ui) {
      return;
    }

    state.ui.mascot.dataset.mode = mode || 'idle';
  }

  function setMascotFacing(direction) {
    if (!state.ui || Math.abs(direction) < 6) {
      return;
    }

    state.ui.mascot.dataset.facing = direction < 0 ? 'left' : 'right';
  }

  function triggerWebBurst(side) {
    if (!state.ui) {
      return;
    }

    clearTimeout(state.webTimer);
    state.ui.mascot.dataset.web = side === 'left' ? 'left' : 'right';
    state.ui.mascot.classList.remove('is-webbing');
    void state.ui.mascot.offsetWidth;
    state.ui.mascot.classList.add('is-webbing');

    state.webTimer = window.setTimeout(() => {
      if (!state.ui) {
        return;
      }

      state.ui.mascot.classList.remove('is-webbing');
    }, 760);
  }

  function chooseRestMode() {
    const poses = ['idle', 'sit', 'crawl', 'idle', 'sit'];
    return poses[Math.floor(Math.random() * poses.length)];
  }

  function setMascotPosition(x, y) {
    if (!state.ui) {
      return;
    }

    const bounds = getViewportBounds();
    const safeX = clamp(x, bounds.xMin, bounds.xMax);
    const safeY = clamp(y, bounds.yMin, bounds.yMax);

    state.position = { x: safeX, y: safeY };
    state.ui.mascot.style.transform = `translate3d(${safeX}px, ${safeY}px, 0)`;
    state.ui.mascot.style.setProperty('--tg-ai-rope-length', `${Math.max(28, safeY + 12)}px`);
  }

  function animatePosition(target, mode) {
    return new Promise((resolve) => {
      const start = { x: state.position.x, y: state.position.y };
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      const duration = clamp(780 + distance * 2.3 + (mode === 'crawl' ? 160 : 0), 780, 1820);
      const amplitude = Math.max(28, Math.min(96, distance * 0.18));
      const startTime = performance.now();
      const direction = target.x - start.x;

      cancelAnimationFrame(state.rafId);
      setMascotFacing(direction);

      if (mode === 'crawl') {
        setMascotMode('crawl');
      } else if (mode === 'hop') {
        setMascotMode('webshot');
        triggerWebBurst(direction < 0 ? 'left' : 'right');
      } else {
        setMascotMode('fly');
        triggerWebBurst(direction < 0 ? 'left' : 'right');
      }

      const frame = (now) => {
        const elapsed = now - startTime;
        const progress = clamp(elapsed / duration, 0, 1);
        const eased = easeInOutCubic(progress);
        let nextX = start.x + (target.x - start.x) * eased;
        let nextY = start.y + (target.y - start.y) * eased;

        if (mode === 'hop') {
          nextY -= Math.sin(progress * Math.PI) * amplitude;
        } else if (mode === 'swing') {
          nextX += Math.sin(progress * Math.PI * 2.2) * Math.max(10, amplitude * 0.14) * (1 - progress);
          nextY -= Math.sin(progress * Math.PI) * Math.max(10, amplitude * 0.08);
        } else if (mode === 'crawl') {
          nextY += Math.sin(progress * Math.PI * 4) * 3;
        } else {
          nextY -= Math.sin(progress * Math.PI) * Math.max(8, amplitude * 0.06);
        }

        setMascotPosition(nextX, nextY);

        if (progress < 1) {
          state.rafId = requestAnimationFrame(frame);
          return;
        }

        setMascotPosition(target.x, target.y);
        setMascotMode(state.isOpen ? (state.isBusy ? 'sit' : 'idle') : chooseRestMode());

        if (!state.isOpen && !state.isBusy && Math.random() > 0.58) {
          window.setTimeout(() => {
            if (!state.isOpen && !state.isBusy) {
              triggerWebBurst(Math.random() > 0.5 ? 'left' : 'right');
            }
          }, 180);
        }

        resolve();
      };

      state.rafId = requestAnimationFrame(frame);
    });
  }

  function scheduleRoam(delay) {
    clearTimeout(state.roamTimer);

    if (!state.isReady || state.isOpen || state.isBusy) {
      return;
    }

    const wait =
      typeof delay === 'number'
        ? delay
        : randomBetween(CONFIG.moveDelayMin, CONFIG.moveDelayMax);

    state.roamTimer = window.setTimeout(async () => {
      if (state.isOpen || state.isBusy) {
        scheduleRoam();
        return;
      }

      const target = chooseNextAnchor();
      const modes = ['swing', 'hop', 'crawl', 'glide'];
      const mode = modes[Math.floor(Math.random() * modes.length)];

      try {
        await animatePosition(target, mode);
      } catch (error) {
      }

      scheduleRoam();
    }, wait);
  }

  function moveToDock() {
    const bounds = getViewportBounds();
    const panelTop = clamp(
      window.innerHeight - Math.min(620, window.innerHeight - 56) - bounds.height + 42,
      bounds.yMin,
      bounds.yMax
    );
    const target = {
      x: clamp(window.innerWidth - bounds.size - 24, bounds.xMin, bounds.xMax),
      y: panelTop
    };

    return animatePosition(target, 'glide');
  }

  function scrollToEnd() {
    if (!state.ui) {
      return;
    }

    state.ui.scroll.scrollTop = state.ui.scroll.scrollHeight;
  }

  function autoResizeTextarea() {
    if (!state.ui) {
      return;
    }

    const { textarea } = state.ui;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 146)}px`;
  }

  function setStatus(message) {
    if (!state.ui) {
      return;
    }

    state.ui.status.textContent = message || '';
  }

  function setBusy(isBusy) {
    state.isBusy = isBusy;

    if (!state.ui) {
      return;
    }

    state.ui.root.classList.toggle('is-thinking', isBusy);
    state.ui.textarea.disabled = isBusy;
    state.ui.sendBtn.disabled = isBusy;
    setMascotMode(isBusy ? 'sit' : state.isOpen ? 'idle' : chooseRestMode());
  }

  function createTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'tg-ai-typing';

    for (let i = 0; i < 3; i += 1) {
      typing.appendChild(document.createElement('span'));
    }

    return typing;
  }

  function appendMessage(role, text, options) {
    if (!state.ui) {
      return null;
    }

    const row = document.createElement('div');
    row.className = `tg-ai-message-row ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'tg-ai-message';

    if (options && options.typing) {
      bubble.appendChild(createTypingIndicator());
    } else {
      bubble.textContent = text;
    }

    row.appendChild(bubble);
    state.ui.scroll.appendChild(row);
    scrollToEnd();

    return bubble;
  }

  function setBubbleText(bubble, text) {
    if (!bubble) {
      return;
    }

    bubble.replaceChildren(document.createTextNode(text));
  }

  function getPageContext() {
    const productNode = document.querySelector('[data-product-id]');
    const productNameNode =
      document.querySelector('.single-product .product-name h2') ||
      document.querySelector('.product-name h2') ||
      document.querySelector('main h1');

    const pageContext = {
      path: sanitizeText(window.location.pathname, 90),
      title: sanitizeText(document.title, 160)
    };

    if (productNode) {
      pageContext.productId = sanitizeText(productNode.getAttribute('data-product-id') || '', 80);
    }

    if (productNameNode) {
      pageContext.productName = sanitizeText(productNameNode.textContent || '', 160);
    }

    return pageContext;
  }

  function trimHistory() {
    if (state.history.length <= CONFIG.historyLimit) {
      return;
    }

    state.history = state.history.slice(-CONFIG.historyLimit);
  }

  function openPanel() {
    if (!state.ui || state.isOpen) {
      return;
    }

    state.isOpen = true;
    clearTimeout(state.roamTimer);

    state.ui.root.classList.add('is-open');
    state.ui.panel.setAttribute('aria-hidden', 'false');
    state.ui.mascot.setAttribute('aria-expanded', 'true');
    setMascotMode('fly');

    moveToDock()
      .catch(() => {})
      .finally(() => {
        setMascotMode('idle');
        window.setTimeout(() => {
          state.ui.textarea.focus();
          autoResizeTextarea();
        }, 120);
      });
  }

  function closePanel() {
    if (!state.ui || !state.isOpen) {
      return;
    }

    state.isOpen = false;
    state.ui.root.classList.remove('is-open');
    state.ui.panel.setAttribute('aria-hidden', 'true');
    state.ui.mascot.setAttribute('aria-expanded', 'false');

    if (state.requestController) {
      state.requestController.abort();
      state.requestController = null;
    }

    setBusy(false);
    setStatus('');
    setMascotMode('sit');
    scheduleRoam(600);
  }

  function togglePanel() {
    if (state.isOpen) {
      closePanel();
      return;
    }

    openPanel();
  }

  async function readNdjsonStream(response, bubble) {
    if (!response.body) {
      throw new Error('Trình duyệt không hỗ trợ stream phản hồi.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        let event;
        try {
          event = JSON.parse(line);
        } catch (error) {
          continue;
        }

        if (event.type === 'chunk' && typeof event.text === 'string') {
          if (event.text.startsWith(fullText)) {
            fullText = event.text;
          } else {
            fullText += event.text;
          }
          setBubbleText(bubble, fullText);
          scrollToEnd();
        } else if (event.type === 'error') {
          throw new Error(event.error || 'Có lỗi khi lấy phản hồi từ AI.');
        }
      }
    }

    if (buffer.trim()) {
      try {
        const lastEvent = JSON.parse(buffer.trim());
        if (lastEvent.type === 'chunk' && typeof lastEvent.text === 'string') {
          if (lastEvent.text.startsWith(fullText)) {
            fullText = lastEvent.text;
          } else {
            fullText += lastEvent.text;
          }
          setBubbleText(bubble, fullText);
        } else if (lastEvent.type === 'error') {
          throw new Error(lastEvent.error || 'Có lỗi khi lấy phản hồi từ AI.');
        }
      } catch (error) {
      }
    }

    return sanitizeText(fullText) || 'Mình chưa nhận được nội dung phản hồi rõ ràng, bạn thử hỏi lại giúp mình nhé.';
  }

  async function sendMessage(quickMessage) {
    if (!state.ui || state.isBusy) {
      return;
    }

    const text = sanitizeText(typeof quickMessage === 'string' ? quickMessage : state.ui.textarea.value, 1200);

    if (!text) {
      setStatus('Bạn nhập câu hỏi rồi mình trả lời ngay nhé.');
      state.ui.textarea.focus();
      return;
    }

    openPanel();

    const priorHistory = state.history.slice(-CONFIG.historyLimit);
    appendMessage('user', text);
    state.history.push({ role: 'user', text });
    trimHistory();

    state.ui.textarea.value = '';
    autoResizeTextarea();

    const responseBubble = appendMessage('assistant', '', { typing: true });
    setBusy(true);
    setStatus('Spider Assistant đang phân tích câu hỏi của bạn...');

    const controller = new AbortController();
    state.requestController = controller;

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: priorHistory,
          pageContext: getPageContext()
        }),
        signal: controller.signal
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();

      if (!response.ok) {
        const errorJson = contentType.includes('application/json')
          ? await response.json().catch(() => ({}))
          : {};
        throw new Error(errorJson.error || 'Không thể kết nối tới trợ lý AI lúc này.');
      }

      let reply = '';

      if (contentType.includes('application/x-ndjson')) {
        reply = await readNdjsonStream(response, responseBubble);
      } else {
        const data = await response.json().catch(() => ({}));
        reply = sanitizeText(data.reply || data.error || '', 2400);
      }

      setBubbleText(responseBubble, reply);
      state.history.push({ role: 'assistant', text: reply });
      trimHistory();
      setStatus('Đã cập nhật phản hồi mới nhất.');
    } catch (error) {
      if (error && error.name === 'AbortError') {
        if (responseBubble && responseBubble.parentElement) {
          responseBubble.parentElement.remove();
        }
        return;
      }

      const message =
        sanitizeText((error && error.message) || '', 240) || 'Có lỗi khi kết nối tới AI.';

      setBubbleText(responseBubble, message);
      responseBubble.parentElement.classList.add('system');
      setStatus('Hiện tại phản hồi chưa hoàn tất, bạn có thể gửi lại câu hỏi.');
    } finally {
      state.requestController = null;
      setBusy(false);
      scrollToEnd();
    }
  }

  function bindEvents() {
    if (!state.ui) {
      return;
    }

    state.ui.mascot.addEventListener('click', togglePanel);
    state.ui.closeBtn.addEventListener('click', closePanel);
    state.ui.backdrop.addEventListener('click', closePanel);

    state.ui.form.addEventListener('submit', (event) => {
      event.preventDefault();
      sendMessage();
    });

    state.ui.textarea.addEventListener('input', autoResizeTextarea);
    state.ui.textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePanel();
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    state.ui.quickButtons.forEach((button) => {
      button.addEventListener('click', () => {
        sendMessage(button.getAttribute('data-quick-message') || '');
      });
    });

    window.addEventListener('resize', () => {
      const bounds = getViewportBounds();
      setMascotPosition(
        clamp(state.position.x, bounds.xMin, bounds.xMax),
        clamp(state.position.y, bounds.yMin, bounds.yMax)
      );
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isOpen) {
        closePanel();
      }
    });
  }

  function initWidget() {
    if (state.isReady || !document.body) {
      return;
    }

    state.ui = createHost();
    bindEvents();

    const startAnchor = chooseNextAnchor();
    setMascotPosition(startAnchor.x, startAnchor.y);
    setMascotFacing(startAnchor.x > window.innerWidth * 0.45 ? -1 : 1);
    setMascotMode('sit');
    setStatus('Spider Assistant đã sẵn sàng.');

    state.isReady = true;
    scheduleRoam(1100);
  }

  function queueInit() {
    const run = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(initWidget, { timeout: 2200 });
      } else {
        window.setTimeout(initWidget, 650);
      }
    };

    if (document.readyState === 'complete') {
      run();
      return;
    }

    window.addEventListener('load', run, { once: true });
  }

  queueInit();
})();
