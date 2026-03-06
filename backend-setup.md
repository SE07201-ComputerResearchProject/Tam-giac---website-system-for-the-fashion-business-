# Backend Security & Setup Guide

## 1. Backend Tech Stack
- NodeJS (ExpressJS)
- Sequelize ORM (SQLite/MongoDB)
- Redis (Session, Cache)
- JWT (Authentication)
- Helmet (HTTP Security Headers)
- express-rate-limit (Rate Limiting)
- Passport (Google OAuth2)
- bcrypt (Password Hashing)
- crypto (AES-256 Encryption)
- morgan/winston (Logging)

## 2. Security Implementation

### ExpressJS Security
```js
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 1*60*1000, max: 100 }));
```

### JWT Authentication
```js
const jwt = require('jsonwebtoken');
// Issue token after login
const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
```

### Google OAuth2
```js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({ ... }, (accessToken, refreshToken, profile, done) => { ... }));
```

### MFA OTP (2FA)
- Tích hợp Google Authenticator (TOTP) với thư viện như speakeasy.

### Password Hashing
```js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);
```

### AES-256 Encryption
```js
const crypto = require('crypto');
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(data, 'utf8', 'hex');
encrypted += cipher.final('hex');
```

### Logging
```js
const morgan = require('morgan');
app.use(morgan('combined'));
```

## 3. Pentest & DevOps
- SonarQube: Phân tích mã nguồn tĩnh
- OWASP ZAP: Quét bảo mật động
- Docker: Đóng gói backend

### Dockerfile
```
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## 4. ORM Example (Sequelize)
```js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');
const Product = sequelize.define('Product', {
  name: DataTypes.STRING,
  price: DataTypes.FLOAT,
});
```

## 5. Redis Session Example
```js
const redis = require('redis');
const client = redis.createClient();
client.set('sessionId', 'userData');
```

## 6. API Secure Interceptor (Frontend)
- Dùng Axios Interceptor để tự động đính kèm token vào request.

## 7. reCAPTCHA v3
- Validate token ở backend trước khi xử lý form.

---

Tham khảo chi tiết từng phần để triển khai bảo mật toàn diện cho hệ thống.
