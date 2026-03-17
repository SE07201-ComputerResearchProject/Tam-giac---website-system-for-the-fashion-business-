const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Placeholder admin routes (can be expanded)
router.get('/health', authMiddleware.authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json({ status: 'OK' });
});

module.exports = router;

