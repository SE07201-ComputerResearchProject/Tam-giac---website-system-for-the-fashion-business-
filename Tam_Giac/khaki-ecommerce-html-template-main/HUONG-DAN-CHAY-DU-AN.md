# Huong dan chay du an Tam Giac

## 1. Chay du an moi lan su dung

Ban chi can lam dung 3 buoc sau:

1. Mo thu muc:
   `Tam_Giac\khaki-ecommerce-html-template-main`
2. Double click file:
   `CHAY-DU-AN.cmd`
3. Giu nguyen cua so den `cmd` do, sau do mo trinh duyet:
   `http://127.0.0.1:3002`

Neu muon vao thang cac trang:

- Trang chu: `http://127.0.0.1:3002`
- Dang ky: `http://127.0.0.1:3002/register.html`
- Dang nhap: `http://127.0.0.1:3002/login.html`
- Quan tri san pham: `http://127.0.0.1:3002/admin/product.html`

## 2. Tai sao phai mo cua so cmd

Project nay dang chay theo luong:

`Trinh duyet -> Node.js server -> Backend API -> SQL Server`

Vi vay moi lan dung website, can co 1 cua so `cmd` dang chay `node server.js`.

Neu dong cua so den do:

- website se mat ket noi
- dang ky se khong chay
- dang nhap se khong chay

## 3. Dang ky va dang nhap hien tai hoat dong the nao

- Dang ky thanh cong: du lieu duoc luu that vao bang `dbo.Users`
- Khong co user trong database: dang nhap se that bai
- Co user trong database va dung mat khau: dang nhap thanh cong
- User co `role = admin`: vao duoc luong admin

## 4. Lan dau tien tren may moi

Can co san:

- Node.js
- SQL Server dang chay
- Database `KhakiEcommerceDB_fresh`

Neu chua cai package, chay 1 lan:

```powershell
cd "c:\Users\buih1\OneDrive\Máy tính\LAST Chance\khaki-ecommerce-html-template-main\Tam-giac---website-system-for-the-fashion-business-\Tam_Giac\khaki-ecommerce-html-template-main\Backend"
npm install
```

Sau do, moi lan sau chi can double click:

`CHAY-DU-AN.cmd`

## 5. Cach dung admin

Tai khoan admin hien tai:

- Email: `admin@tamgiac.local`
- Password: `KhakiAdmin@2026`

## 6. Cach kiem tra co luu xuong database hay khong

Mo SSMS va chay:

```sql
USE KhakiEcommerceDB_fresh;

SELECT TOP 20 id, email, full_name, role, is_active, created_at
FROM dbo.Users
ORDER BY created_at DESC;
```

## 7. Neu mo web ma khong len

Kiem tra theo thu tu nay:

1. Ban da mo `CHAY-DU-AN.cmd` chua
2. Ban co giu cua so den `cmd` do dang mo khong
3. SQL Server co dang chay khong
4. Mo thu:
   `http://127.0.0.1:3002/health`

Neu can xem log:

- `Backend\logs\combined.log`
- `Backend\logs\error.log`

## 8. Cach tat du an

Chi can dong cua so `cmd` dang chay server.
