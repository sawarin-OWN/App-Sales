# 📋 คู่มือ Clone แอปโดยไม่กระทบการใช้งานปัจจุบัน

คู่มือนี้จะแนะนำวิธีสร้างสำเนาของแอปสำหรับ Development หรือ Environment อื่นๆ โดยไม่กระทบกับ Production

---

## 🎯 วัตถุประสงค์

- สร้าง Development Environment แยกจาก Production
- ทดสอบฟีเจอร์ใหม่โดยไม่กระทบข้อมูลจริง
- Clone สำหรับสาขาใหม่หรือ Environment อื่นๆ

---

## 📝 ขั้นตอนการ Clone

### 1. Clone Google Sheets (ข้อมูล)

#### 1.1 สร้างสำเนา Google Sheets

1. เปิด Google Sheets ที่ใช้อยู่ (Production)
   - URL: `https://docs.google.com/spreadsheets/d/1K7PN4s_SNl5kqq_uLaV54f5Lh4IUwxmj16qeh1DrG_A/edit`

2. คลิก **File** > **Make a copy** (สร้างสำเนา)

3. ตั้งชื่อใหม่ เช่น:
   - `KebYod App - Development`
   - `KebYod App - Branch 2`
   - `KebYod App - Testing`

4. เลือกโฟลเดอร์ที่ต้องการ (หรือปล่อยไว้ที่ My Drive)

5. คลิก **Make a copy**

6. **บันทึก Sheet ID ใหม่**:
   - ดูจาก URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - หรือคลิก **File** > **Share** > **Copy link** แล้วดู Sheet ID

#### 1.2 ตรวจสอบ Sheets ที่จำเป็น

ตรวจสอบว่า Sheet ใหม่มี Sheets ต่อไปนี้:
- ✅ **User** - ข้อมูลผู้ใช้และสาขา
- ✅ **Sales** - ข้อมูลยอดขาย
- ✅ **Expenses** - ข้อมูลค่าใช้จ่าย
- ✅ **Deposits** - ข้อมูลการนำฝาก
- ✅ **TaxInvoices** - ข้อมูลใบกำกับภาษี
- ✅ **Taxpayers** - ข้อมูลผู้เสียภาษี

> 💡 **หมายเหตุ**: ถ้า Sheet ใหม่ไม่มี Sheets เหล่านี้ ให้สร้างใหม่ตามโครงสร้างเดิม

---

### 2. Clone Google Apps Script (Backend)

#### 2.1 สร้าง Google Apps Script Project ใหม่

1. เปิด [Google Apps Script](https://script.google.com/)

2. คลิก **New project** (โปรเจคใหม่)

3. ตั้งชื่อโปรเจค เช่น:
   - `KebYod App Backend - Development`
   - `KebYod App Backend - Branch 2`

#### 2.2 Copy Code จาก Production

1. เปิด Google Apps Script Project เดิม (Production)

2. Copy เนื้อหาทั้งหมดจาก `backend/Code.js` ในโปรเจคนี้

3. วางใน Google Apps Script Project ใหม่

4. **แก้ไข Sheet IDs** ใน Code:

   ```javascript
   // แก้ไขจาก Production Sheet ID
   const USER_SHEET_ID = "1K7PN4s_SNl5kqq_uLaV54f5Lh4IUwxmj16qeh1DrG_A"; 
   const SALES_SHEET_ID = "1K7PN4s_SNl5kqq_uLaV54f5Lh4IUwxmj16qeh1DrG_A";
   const SHEET_ID_DISCORD = "1K7PN4s_SNl5kqq_uLaV54f5Lh4IUwxmj16qeh1DrG_A";
   
   // เป็น Development Sheet ID (ที่ได้จากขั้นตอน 1.1)
   const USER_SHEET_ID = "YOUR_NEW_SHEET_ID_HERE"; 
   const SALES_SHEET_ID = "YOUR_NEW_SHEET_ID_HERE";
   const SHEET_ID_DISCORD = "YOUR_NEW_SHEET_ID_HERE";
   ```

5. **แก้ไข Discord Webhook URL** (ถ้าต้องการแยก):
   ```javascript
   // ถ้าต้องการแยก Discord notification
   const DISCORD_WEBHOOK_URL_BATCH = "YOUR_DEV_DISCORD_WEBHOOK_URL";
   ```

6. บันทึกโปรเจค (Ctrl+S หรือ Cmd+S)

#### 2.3 Deploy Google Apps Script

1. คลิก **Deploy** > **New deployment**

2. คลิกไอคอน **⚙️** (Settings) ข้างๆ "Select type"

3. เลือก Type: **Web app**

4. ตั้งค่าดังนี้:
   - **Description**: `KebYod App API - Development` (หรือชื่อที่ต้องการ)
   - **Execute as**: **Me** (หรือ User deploying the web app)
   - **Who has access**: **Anyone** ⚠️ **สำคัญมาก!**

5. คลิก **Deploy**

6. **Authorize access** (ครั้งแรกจะต้อง authorize):
   - คลิก **Authorize access**
   - เลือกบัญชี Google
   - คลิก **Advanced** > **Go to [Project Name] (unsafe)**
   - คลิก **Allow**

7. **Copy Web App URL**:
   - URL จะมีรูปแบบ: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`
   - บันทึก URL นี้ไว้

---

### 3. ตั้งค่า React App (Frontend)

#### 3.1 Clone React App (ถ้ายังไม่มี)

```bash
# ถ้าใช้ Git
git clone [YOUR_REPO_URL]
cd SALEs-REPORT

# หรือสร้างโฟลเดอร์ใหม่
mkdir sales-report-dev
cd sales-report-dev
# Copy ไฟล์ทั้งหมดจากโปรเจคเดิม
```

#### 3.2 สร้างไฟล์ `.env` สำหรับ Development

1. สร้างไฟล์ `.env` ใน root directory ของโปรเจค:

   ```bash
   # Windows
   type nul > .env
   
   # Mac/Linux
   touch .env
   ```

2. เพิ่มเนื้อหาดังนี้:

   ```env
   # Development Environment
   REACT_APP_GAS_URL=https://script.google.com/macros/s/YOUR_DEV_SCRIPT_ID/exec
   ```

   > แทนที่ `YOUR_DEV_SCRIPT_ID` ด้วย Script ID ที่ได้จากขั้นตอน 2.3

3. **สำคัญ**: เพิ่ม `.env` ใน `.gitignore`:

   ```gitignore
   # Environment variables
   .env
   .env.local
   .env.development
   .env.production
   ```

#### 3.3 ตั้งค่า Production Environment (ถ้าต้องการ)

สร้างไฟล์ `.env.production` สำหรับ Production:

```env
# Production Environment
REACT_APP_GAS_URL=https://script.google.com/macros/s/AKfycbwMoX1Tu4jO2hKx7uRGtGqoCTvdmUgmLnuq5ceygSeMRoZQ2Hwha3qNZltzXf3FGQpI/exec
```

#### 3.4 แก้ไข `src/services/gasAPI.js` (ถ้าต้องการ)

ถ้าต้องการให้ใช้ Environment Variable แทน Hardcode:

```javascript
// ใช้ Environment Variable ก่อน ถ้าไม่มีค่อยใช้ค่า default
const GAS_WEB_APP_URL = process.env.REACT_APP_GAS_URL || 
  'https://script.google.com/macros/s/AKfycbwMoX1Tu4jO2hKx7uRGtGqoCTvdmUgmLnuq5ceygSeMRoZQ2Hwha3qNZltzXf3FGQpI/exec';
```

> ✅ **ดีแล้ว**: Code ปัจจุบันรองรับ Environment Variable แล้ว

---

### 4. ทดสอบการเชื่อมต่อ

#### 4.1 รัน Development Server

```bash
npm install
npm start
```

แอปจะรันที่ `http://localhost:3000`

#### 4.2 ทดสอบ Login

1. เปิด `http://localhost:3000`
2. ลอง Login ด้วยบัญชีที่สร้างใน Development Sheet
3. ตรวจสอบว่าข้อมูลที่แสดงมาจาก Development Sheet

#### 4.3 ตรวจสอบ Console

เปิด Browser DevTools (F12) และดู Console:
- ไม่มี Error เกี่ยวกับ CORS
- API calls สำเร็จ
- ข้อมูลที่แสดงถูกต้อง

---

## 🔄 การสลับระหว่าง Production และ Development

### วิธีที่ 1: ใช้ Environment Variables (แนะนำ)

```bash
# Development
npm start
# หรือ
REACT_APP_GAS_URL=https://script.google.com/macros/s/DEV_ID/exec npm start

# Production Build
npm run build
# หรือ
REACT_APP_GAS_URL=https://script.google.com/macros/s/PROD_ID/exec npm run build
```

### วิธีที่ 2: แก้ไข `gasAPI.js` ชั่วคราว

```javascript
// Development
const GAS_WEB_APP_URL = process.env.REACT_APP_GAS_URL || 
  'https://script.google.com/macros/s/DEV_SCRIPT_ID/exec';

// Production
const GAS_WEB_APP_URL = process.env.REACT_APP_GAS_URL || 
  'https://script.google.com/macros/s/PROD_SCRIPT_ID/exec';
```

> ⚠️ **ระวัง**: อย่าลืมเปลี่ยนกลับก่อน Deploy Production!

---

## 📦 Deploy แยก Environment

### Development Environment

```bash
# Build
npm run build

# Deploy ไป Vercel (Development)
vercel --prod
# หรือสร้าง Project แยกใน Vercel
vercel --prod --name sales-report-dev
```

### Production Environment

```bash
# ตรวจสอบว่าใช้ Production URL
# แก้ไข .env.production หรือ gasAPI.js

# Build
npm run build

# Deploy
vercel --prod
```

---

## 🛡️ วิธีป้องกันการกระทบ Production

### 1. ใช้ Environment Variables

✅ **ดี**: ใช้ `.env` สำหรับ Development  
✅ **ดี**: ใช้ `.env.production` สำหรับ Production  
❌ **ไม่ดี**: Hardcode URL ใน Code

### 2. แยก Google Accounts

- ใช้ Google Account แยกสำหรับ Development
- หรือใช้ Google Workspace แยก

### 3. ตั้งชื่อให้ชัดเจน

- Google Sheets: `KebYod App - Development`
- Google Apps Script: `KebYod App Backend - Development`
- Vercel Project: `sales-report-dev`

### 4. ใช้ Git Branches

```bash
# Development branch
git checkout -b development
# แก้ไข .env และ code

# Production branch
git checkout main
# ใช้ Production URL
```

### 5. ตรวจสอบก่อน Deploy

- ✅ ตรวจสอบ Sheet ID ใน GAS Code
- ✅ ตรวจสอบ GAS Web App URL ใน Frontend
- ✅ ทดสอบ Login และ CRUD operations
- ✅ ตรวจสอบ Console ไม่มี Error

---

## 📋 Checklist การ Clone

### Google Sheets
- [ ] สร้างสำเนา Google Sheets
- [ ] บันทึก Sheet ID ใหม่
- [ ] ตรวจสอบ Sheets ที่จำเป็นครบถ้วน
- [ ] สร้าง User สำหรับทดสอบ (ถ้ายังไม่มี)

### Google Apps Script
- [ ] สร้าง Google Apps Script Project ใหม่
- [ ] Copy Code จาก Production
- [ ] แก้ไข Sheet IDs ใน Code
- [ ] Deploy as Web App
- [ ] ตั้งค่า "Who has access: Anyone"
- [ ] Authorize access
- [ ] บันทึก Web App URL

### React App
- [ ] Clone หรือ Copy โปรเจค
- [ ] สร้างไฟล์ `.env`
- [ ] ตั้งค่า `REACT_APP_GAS_URL` ใน `.env`
- [ ] เพิ่ม `.env` ใน `.gitignore`
- [ ] รัน `npm install`
- [ ] ทดสอบ `npm start`

### Testing
- [ ] ทดสอบ Login
- [ ] ทดสอบ Dashboard
- [ ] ทดสอบบันทึกข้อมูล
- [ ] ตรวจสอบ Console ไม่มี Error
- [ ] ตรวจสอบข้อมูลใน Development Sheet

---

## 🚨 ปัญหาที่พบบ่อย

### ปัญหา: "Failed to fetch"

**สาเหตุ**: 
- GAS Web App URL ผิด
- GAS Web App ยังไม่ได้ Deploy
- GAS Web App ตั้งค่า "Who has access" ไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบ URL ใน `.env` หรือ `gasAPI.js`
2. ตรวจสอบว่า GAS Web App ถูก Deploy แล้ว
3. ตั้งค่า "Who has access: Anyone"

### ปัญหา: "Invalid credentials"

**สาเหตุ**: 
- User ไม่มีใน Development Sheet
- Sheet ID ผิด

**วิธีแก้**:
1. ตรวจสอบว่า User มีใน Development Sheet
2. ตรวจสอบ Sheet ID ใน GAS Code

### ปัญหา: ข้อมูลไม่แสดง

**สาเหตุ**: 
- Sheet ID ผิด
- Sheets ไม่มีข้อมูล
- Permission ไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบ Sheet ID ใน GAS Code
2. ตรวจสอบว่า Sheets มีข้อมูล
3. ตรวจสอบ Permission ของ GAS Project

---

## 📚 เอกสารเพิ่มเติม

- [GAS-DEPLOY-INSTRUCTIONS.md](./GAS-DEPLOY-INSTRUCTIONS.md) - คู่มือ Deploy GAS
- [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md) - คู่มือ Deploy ไป Vercel
- [FUNCTION-SUMMARY.md](./FUNCTION-SUMMARY.md) - สรุปฟังก์ชันการทำงาน

---

## 💡 Tips

1. **ใช้ Environment Variables**: ง่ายต่อการสลับระหว่าง Environments
2. **ตั้งชื่อให้ชัดเจน**: หลีกเลี่ยงความสับสน
3. **ทดสอบก่อน Deploy**: ตรวจสอบทุกอย่างก่อน Deploy Production
4. **Backup ข้อมูล**: สำรองข้อมูล Production เป็นประจำ
5. **ใช้ Git**: ติดตามการเปลี่ยนแปลงและ Rollback ได้ง่าย

---

## ✅ สรุป

การ Clone แอปโดยไม่กระทบ Production ต้องทำ 3 ส่วน:

1. **Clone Google Sheets** → ได้ Sheet ID ใหม่
2. **Clone Google Apps Script** → ได้ Web App URL ใหม่
3. **ตั้งค่า React App** → ใช้ Environment Variables

เมื่อทำครบทั้ง 3 ส่วนแล้ว คุณจะมี Development Environment แยกจาก Production โดยสมบูรณ์! 🎉
