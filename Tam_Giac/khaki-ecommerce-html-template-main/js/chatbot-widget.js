// Minimal chatbot widget: UI + fetch to /api/chat
(function () {
  const BASE = '/api/chat';

  function createStyles() {
    const css = `
    .tg-chatbot { position: fixed; right: 18px; bottom: 18px; width: 360px; max-width: calc(100% - 40px); font-family: Be Vietnam Pro, Arial, sans-serif; z-index: 99999; }
    .tg-chat-toggle { background: linear-gradient(135deg,#9f7539,#5f431f); color: #fff; padding: 12px 14px; border-radius: 999px; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
    .tg-chat-window { display: none; margin-top: 10px; background: #fff; border-radius: 12px; box-shadow: 0 18px 40px rgba(7,44,69,0.12); overflow: hidden; }
    .tg-chat-header { padding: 12px 14px; background: #f6f6f6; font-weight:700; }
    .tg-chat-body { max-height: 300px; overflow:auto; padding: 12px; display:flex; flex-direction:column; gap:8px; }
    .tg-chat-input { display:flex; gap:8px; padding:12px; background:#fff; }
    .tg-chat-input textarea { flex:1; min-height:44px; padding:8px; border-radius:8px; border:1px solid #ddd; }
    .tg-chat-msg { padding:10px 12px; border-radius:10px; max-width:80%; }
    .tg-chat-msg.user { align-self:flex-end; background:#e9f6fb; }
    .tg-chat-msg.bot { align-self:flex-start; background:#f3f3f3; }
    .tg-chat-loading { font-size:12px; color:#666; }
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
      <div class="tg-chat-header">Trợ lý Tam Giac</div>
      <div class="tg-chat-body" role="log" aria-live="polite"></div>
      <div class="tg-chat-input">
        <textarea placeholder="Gõ câu hỏi..." aria-label="Chat input"></textarea>
        <button class="tg-chat-send">Gửi</button>
      </div>
    `;

    toggle.addEventListener('click', () => {
      win.style.display = win.style.display === 'block' ? 'none' : 'block';
    });

    wrap.appendChild(toggle);
    wrap.appendChild(win);
    document.body.appendChild(wrap);

    const body = win.querySelector('.tg-chat-body');
    const textarea = win.querySelector('textarea');
    const sendBtn = win.querySelector('.tg-chat-send');

    function appendMessage(text, who) {
      const m = document.createElement('div');
      m.className = 'tg-chat-msg ' + (who === 'user' ? 'user' : 'bot');
      m.textContent = text;
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
    }

    async function sendMessage() {
      const txt = textarea.value.trim();
      if (!txt) return;
      appendMessage(txt, 'user');
      textarea.value = '';
      const loading = document.createElement('div');
      loading.className = 'tg-chat-loading';
      loading.textContent = 'Đang trả lời...';
      body.appendChild(loading);
      body.scrollTop = body.scrollHeight;

      try {
        const token = localStorage.getItem('token');
        const resp = await fetch(BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({ message: txt, pageContext: { path: location.pathname } })
        });

        const json = await resp.json();
        loading.remove();
        if (!resp.ok) {
          appendMessage(json && json.error ? json.error : 'Lỗi trả lời', 'bot');
          return;
        }

        appendMessage(json.reply || 'Không có phản hồi', 'bot');
      } catch (e) {
        loading.remove();
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
