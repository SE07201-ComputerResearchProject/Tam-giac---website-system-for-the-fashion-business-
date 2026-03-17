# TODO Backend Tam-Giac ✅ Tiến độ: 5/18

**Hoàn thành:**
- ✅ package.json
- ✅ .env.example
- ✅ server.js (Express + middleware cơ bản: helmet, rate-limit, cors, logger)
- ✅ config/database.js (Sequelize SQL Server)
- ✅ config/redis.js
- ✅ utils/logger.js (Winston)

## Giai đoạn 2: Models & DB (bắt đầu)
- [ ] Bước 5: models/index.js, User.js (bcrypt field, mfaSecret), Product.js, Order.js, Category.js
- [ ] Bước 6: Tạo migrations/ folder & CLI config

## Còn lại:
- Middleware bảo mật (auth JWT, MFA speakeasy, ReCAPTCHA)
- Routes (auth với OAuth2 Google, products, orders)
- VNPay integration
- docker-compose.yml
- Dockerfile

**Tiếp theo: Chạy `cd Backend && npm install` rồi bảo tôi output để test server.js (sẽ lỗi models tạm thời).**
