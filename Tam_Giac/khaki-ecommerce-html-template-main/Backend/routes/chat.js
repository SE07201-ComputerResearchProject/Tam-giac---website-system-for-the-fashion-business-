const express = require('express');
const fetch = global.fetch || require('node-fetch');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Stricter rate limit for chat to avoid abuse
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many chat requests, please try again later.' }
});

router.post('/', chatLimiter, async (req, res) => {
  const { message, pageContext, sessionOnly, requireAuth } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // If the client asked for authenticated data access, verify token
  if (requireAuth) {
    return authenticateToken(req, res, () => handleChat(req, res, message, pageContext, sessionOnly));
  }

  return handleChat(req, res, message, pageContext, sessionOnly);
});

async function handleChat(req, res, message, pageContext, sessionOnly) {
  const start = Date.now();

  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';

    if (!endpoint || !key || !deployment) {
      logger.error('Azure OpenAI config missing');
      return res.status(500).json({ error: 'AI provider not configured' });
    }

    // Construct a short system prompt + user message; add lightweight page context
    const system = `Bạn là "Tam Giac Assistant" — trợ lý bán hàng cho trang Tam Giac (thời trang). Nhiệm vụ: trả lời ngắn gọn (1-3 câu) bằng tiếng Việt, thân thiện và chính xác. Nếu câu hỏi cần thêm thông tin để trả lời chính xác, hãy yêu cầu làm rõ. Khi có context sản phẩm (productId), sử dụng thông tin đó để đưa ra đề xuất phù hợp. Không tiết lộ hay thu thập thông tin nhạy cảm; nếu không biết, thừa nhận và hướng người dùng đến kênh hỗ trợ. Tránh văn phong quá kỹ thuật.`;
    const contextText = pageContext && pageContext.productId ? `Context: productId=${pageContext.productId}` : '';

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const body = {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${contextText}\n${message}` }
      ],
      max_tokens: 500,
      temperature: 0.2
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key
      },
      body: JSON.stringify(body),
      timeout: 30 * 1000
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => 'unknown');
      logger.error('Azure OpenAI error', { status: r.status, body: errText });
      return res.status(502).json({ error: 'AI provider error' });
    }

    const data = await r.json();
    // Response shape: choices[0].message.content
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

    // Light analytics/logging (no raw message storage) — store stats only
    try {
      logger.info('chat:msg', {
        user: req.user ? req.user.email : null,
        productId: pageContext && pageContext.productId ? pageContext.productId : null,
        latencyMs: Date.now() - start,
        promptLength: message.length
      });
    } catch (e) {}

    return res.json({ success: true, reply });
  } catch (error) {
    logger.error('Chat handler error', { message: error && error.message });
    return res.status(500).json({ error: 'Internal error handling chat' });
  }
}

module.exports = router;
