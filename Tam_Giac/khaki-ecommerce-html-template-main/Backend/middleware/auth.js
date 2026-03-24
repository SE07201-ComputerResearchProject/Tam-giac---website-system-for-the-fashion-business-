const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

module.exports = {
  // Verify JWT (protect routes)
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Truy cập yêu cầu token' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('JWT verify fail:', err.message);
        return res.status(403).json({ error: 'Token không hợp lệ' });
      }
      req.user = user; // {id, email, role}
      next();
    });
  },

  // Chỉ admin
  authorizeAdmin: (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin truy cập' });
    }
    next();
  }
};

