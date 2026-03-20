# TODO: Complete E-commerce Auth Integration

Status: Planning phase - waiting for DB credentials

## 1. Setup Backend Environment [Pending]
- [ ] Create Backend/.env with DB creds (user to provide)
- [ ] cd Backend && npm install
- [ ] Start server: npm start (port 3000)

## 2. Database Setup [Pending]
- [ ] Create MSSQL DB 'tamgiac_db'
- [ ] Run SQLTGiac.sql
- [ ] sequelize.sync()

## 3. Frontend Fixes [Ready]
- [ ] Update js/api.js port to 3000
- [ ] Test Live Server port 3001

## 4. Test Auth Flow
- [ ] Register new user
- [ ] Login, check token/header
- [ ] Logout

## 5. Disable/Optional Recaptcha [Ready]

Next step: User provide DB MSSQL details to create .env
