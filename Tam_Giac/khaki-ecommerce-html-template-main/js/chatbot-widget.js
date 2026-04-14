(function () {
  if (typeof window === 'undefined' || window.__TG_AI_CHATBOT_SHIM__) {
    return;
  }

  window.__TG_AI_CHATBOT_SHIM__ = true;

  function canShowAiChatbot() {
    try {
      return Boolean(window.localStorage && window.localStorage.getItem('token'));
    } catch (error) {
      return false;
    }
  }

  function loadAiChatbot() {
    if (!canShowAiChatbot()) {
      return;
    }

    if (window.__TG_AI_CHATBOT_BOOTED__ || document.getElementById('tg-ai-chatbot-loader')) {
      return;
    }

    if (document.querySelector('script[src*="js/ai-chatbot.js"]')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'tg-ai-chatbot-loader';
    script.defer = true;
    script.src = 'js/ai-chatbot.js?v=20260415b';
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAiChatbot, { once: true });
  } else {
    loadAiChatbot();
  }
})();
