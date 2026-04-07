# TODO: Thêm reCAPTCHA khi nhập sai mật khẩu quá 5 lần ở trang đăng nhập

**Trạng thái: Backend done, Frontend ongoing**

## Các bước:

- [x] Bước 0: Tạo TODO.md ✅
- [ ] Bước 1: Khởi động dự án (Backend + Frontend server)
- [ ] Bước 2: Cập nhật Backend/middleware/recaptcha.js (thêm requireRecaptcha)
- [x] Bước 3: Cập nhật Backend/routes/auth.js ✅ (Redis tracking + flag requireRecaptcha)
- [x] Bước 4: Cập nhật login.html ✅ (thêm div + note sitekey)
- [ ] Bước 5: Cập nhật Tam_Giac/khaki-ecommerce-html-template-main/js/login.js (client-side attempt count + dynamic show)
- [ ] Bước 6: Test: Fail login 5 lần → reCAPTCHA hiện & bắt buộc
- [ ] Bước 7: Config env RECAPTCHA_SITE_KEY, SECRET_KEY nếu chưa có
- [ ] Bước 8: Mark all done & attempt_completion

**Ghi chú:** Sử dụng Redis có sẵn + recaptcha2 package.
