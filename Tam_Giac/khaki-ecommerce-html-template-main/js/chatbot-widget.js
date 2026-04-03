// Minimal chatbot widget: UI + fetch to /api/chat
// Improved chatbot widget with spinner, history cap, clear and close actions
(function () {
  const BASE = '/api/chat';
  const HISTORY_LIMIT = 30;

  function createStyles() {
    const css = `
    .tg-chatbot { position: fixed; right: 18px; bottom: 18px; width: 360px; max-width: calc(100% - 40px); font-family: "Be Vietnam Pro", Arial, sans-serif; z-index: 99999; }
    .tg-chat-toggle { background: linear-gradient(135deg,#9f7539,#5f431f); color: #fff; padding: 12px 14px; border-radius: 999px; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.12); border: none; }
    .tg-chat-window { display: none; margin-top: 10px; background: #fff; border-radius: 12px; box-shadow: 0 18px 40px rgba(7,44,69,0.12); overflow: hidden; width: 100%; }
    .tg-chat-header { display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; background: #f6f6f6; font-weight:700; }
    .tg-chat-actions { display:flex; gap:8px; align-items:center; }
    .tg-chat-btn { background: transparent; border: none; cursor: pointer; font-weight:700; color:#333; }
    .tg-chat-body { max-height: 320px; overflow:auto; padding: 12px; display:flex; flex-direction:column; gap:8px; background: linear-gradient(180deg,#fff,#fbfdff); }
    .tg-chat-input { display:flex; gap:8px; padding:12px; background:#fff; border-top:1px solid #eee; }
    .tg-chat-input textarea { flex:1; min-height:48px; padding:8px; border-radius:8px; border:1px solid #ddd; resize:vertical; }
    .tg-chat-send { min-width:72px; padding:10px 12px; border-radius:8px; border:none; background:linear-gradient(135deg,#2bb1d7,#0f587e); color:#fff; cursor:pointer; }
    .tg-chat-msg { padding:10px 12px; border-radius:10px; max-width:80%; word-break:break-word; }
    .tg-chat-msg.user { align-self:flex-end; background:#e9f6fb; }
    .tg-chat-msg.bot { align-self:flex-start; background:#f3f3f3; }
    .tg-spinner { width:18px; height:18px; border-radius:50%; border:3px solid rgba(0,0,0,0.08); border-top-color:#0f587e; animation: tg-spin 1s linear infinite; display:inline-block; }
    @keyframes tg-spin { to { transform: rotate(360deg);} }
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function init() {
    if (document.querySelector('.tg-chatbot')) return;
    createStyles();

    const wrap = document.createElement('div');
    wrap.className = 'tg-chatbot';

    const toggle = document.createElement('button');
    toggle.className = 'tg-chat-toggle';
    toggle.textContent = 'Hỗ trợ — Chat với Tam Giac';

    const win = document.createElement('div');
    win.className = 'tg-chat-window';

    win.innerHTML = `
      <div class="tg-chat-header">
        <div>Trợ lý Tam Giac</div>
        <div class="tg-chat-actions">
          <button class="tg-chat-btn tg-chat-clear" title="Xóa lịch sử">Xóa</button>
          <button class="tg-chat-btn tg-chat-close" title="Đóng">✕</button>
        </div>
      </div>
      <div class="tg-chat-body" role="log" aria-live="polite"></div>
      <div class="tg-chat-input">
        <textarea placeholder="Gõ câu hỏi... (Enter gửi, Shift+Enter xuống dòng)" aria-label="Chat input"></textarea>
        <button class="tg-chat-send">Gửi</button>
      </div>
    `;

    toggle.addEventListener('click', () => {
      win.style.display = win.style.display === 'block' ? 'none' : 'block';
      if (win.style.display === 'block') win.querySelector('textarea').focus();
    });

    wrap.appendChild(toggle);
    wrap.appendChild(win);
    document.body.appendChild(wrap);

    const body = win.querySelector('.tg-chat-body');
    const textarea = win.querySelector('textarea');
    const sendBtn = win.querySelector('.tg-chat-send');
    const clearBtn = win.querySelector('.tg-chat-clear');
    const closeBtn = win.querySelector('.tg-chat-close');

    function trimHistory() {
      const msgs = body.querySelectorAll('.tg-chat-msg');
      if (msgs.length <= HISTORY_LIMIT) return;
      const removeCount = msgs.length - HISTORY_LIMIT;
      for (let i = 0; i < removeCount; i++) msgs[i].remove();
    }

    function escapeHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function renderMarkdown(md) {
      // Very small, safe markdown -> HTML converter (code blocks, inline code, links, line breaks)
      let out = escapeHtml(md);
      // code block ```
      out = out.replace(/```([\s\S]*?)```/g, function (m, code) {
        return '<pre><code>' + escapeHtml(code) + '</code></pre>';
      });
      // inline code `code`
      out = out.replace(/`([^`]+?)`/g, '<code>$1</code>');
      // links [text](url)
      out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, text, url) {
        const safeUrl = escapeHtml(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
      });
      // line breaks
      out = out.replace(/\n/g, '<br>');
      return out;
    }

    function appendMessage(text, who, isHtml) {
      const m = document.createElement('div');
      m.className = 'tg-chat-msg ' + (who === 'user' ? 'user' : 'bot');
      if (isHtml) {
        m.innerHTML = text;
      } else {
        m.textContent = text;
      }
      body.appendChild(m);
      trimHistory();
      body.scrollTop = body.scrollHeight;
      return m;
    }

    function setBusy(isBusy) {
      sendBtn.disabled = isBusy;
      textarea.disabled = isBusy;
      sendBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }

    async function sendMessage() {
      const txt = textarea.value.trim();
      if (!txt) return;
      appendMessage(txt, 'user');
      textarea.value = '';
      const loadingWrap = document.createElement('div');
      loadingWrap.className = 'tg-chat-msg bot';
      const spinner = document.createElement('span');
      spinner.className = 'tg-spinner';
      loadingWrap.appendChild(spinner);
      const loadingText = document.createElement('span');
      loadingText.style.marginLeft = '8px';
      loadingText.textContent = 'Đang trả lời...';
      loadingWrap.appendChild(loadingText);
      body.appendChild(loadingWrap);
      body.scrollTop = body.scrollHeight;
      setBusy(true);

      try {
        const token = localStorage.getItem('token');
        const productId = (document.querySelector('[data-product-id]') && document.querySelector('[data-product-id]').getAttribute('data-product-id')) || (document.querySelector('meta[name="product-id"]') && document.querySelector('meta[name="product-id"]').content) || null;
        const payload = { message: txt, pageContext: { path: location.pathname } };
        if (productId) payload.pageContext.productId = productId;

        const resp = await fetch(BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify(payload)
        });

        const json = await resp.json().catch(() => ({}));
        loadingWrap.remove();
        setBusy(false);
        if (!resp.ok) {
          appendMessage(json && json.error ? json.error : 'Lỗi trả lời', 'bot');
          return;
        }
        const reply = json.reply || 'Không có phản hồi';
        // render markdown if present
        const html = renderMarkdown(reply);
        appendMessage(html, 'bot', true);
      } catch (e) {
        loadingWrap.remove();
        setBusy(false);
        appendMessage('Lỗi kết nối tới máy chủ.', 'bot');
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    clearBtn.addEventListener('click', () => { body.innerHTML = ''; textarea.focus(); });
    closeBtn.addEventListener('click', () => { win.style.display = 'none'; });

    // Small welcome message
    appendMessage('Chào bạn! Tôi có thể giúp tìm sản phẩm, hướng dẫn mua hàng, và hỗ trợ đơn hàng cơ bản.', 'bot');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
