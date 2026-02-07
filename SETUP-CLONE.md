# การตั้งค่าโปรเจกต์ Clone — ย้ายหลังบ้านใหม่

โปรเจกต์นี้ถูกตัดการเชื่อมต่อกับหลังบ้านและ Google Sheet เดิมแล้ว จะไม่กระทบข้อมูลของไฟล์หลัก

**ตอนนี้โปรเจกต์ Clone ใช้ Supabase เป็นหลังบ้านโดยค่าเริ่มต้น**  
- ดูรายละเอียดการตั้งค่า Supabase ใน **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)**  
- ถ้าต้องการใช้ Google Apps Script แทน ให้ดูขั้นตอนด้านล่างและตั้งค่า `REACT_APP_USE_SUPABASE=false` ใน `.env`

ก่อนใช้งาน (ถ้าใช้ GAS) ต้องตั้งค่าต่อไปนี้:

---

## 1. Google Sheet (ข้อมูล)

1. สร้างสำเนา Google Sheet จากไฟล์หลัก (ถ้ามี) หรือสร้าง Sheet ใหม่
2. ตรวจสอบว่ามีชีต: **User**, **Sales**, **Expenses**, **Deposits**, **TaxInvoices**, **Taxpayers**
3. Copy **Spreadsheet ID** จาก URL:  
   `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

---

## 2. Backend (Google Apps Script)

### 2.1 แก้ไข `backend/Code.js`

เปิด `backend/Code.js` แล้วแทนที่ placeholder ด้วยค่าจริง:

```javascript
const USER_SHEET_ID = "ใส่_SHEET_ID_ของคุณ";
const SALES_SHEET_ID = "ใส่_SHEET_ID_ของคุณ";
const SHEET_ID_DISCORD = "ใส่_SHEET_ID_ของคุณ";
const DISCORD_WEBHOOK_URL_BATCH = "";  // ถ้าต้องการแจ้ง Discord ใส่ URL ของ Webhook
```

### 2.2 สร้างโปรเจกต์ GAS ใหม่

1. เปิด [Google Apps Script](https://script.google.com/) → **New project**
2. ตั้งชื่อโปรเจกต์ (เช่น Sales Report Backend - Clone)
3. ลบโค้ดในไฟล์เริ่มต้น แล้ว copy เนื้อหาทั้งหมดจาก `backend/Code.js` (หลังแก้ Sheet ID แล้ว) วางแทน
4. **Deploy** → **New deployment** → ประเภท **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy **Web App URL** (รูปแบบ `https://script.google.com/macros/s/.../exec`)

### 2.3 ถ้าใช้ clasp

แก้ไข `.clasp.json`:

```json
"scriptId": "ใส่_SCRIPT_ID_ของโปรเจกต์_GAS_ใหม่"
```

Script ID ดูได้จาก URL ใน GAS Editor:  
`https://script.google.com/d/SCRIPT_ID/edit`

จากนั้นรัน `clasp push` เพื่ออัปโหลดโค้ด

---

## 3. Frontend (เชื่อมกับหลังบ้านใหม่)

สร้างหรือแก้ไขไฟล์ `.env` หรือ `.env.local` ในโฟลเดอร์โปรเจกต์:

```env
REACT_APP_GAS_URL=https://script.google.com/macros/s/ใส่_ID_จาก_Deploy/exec
```

หรือแก้ใน `src/services/gasAPI.js` ชั่วคราว (ไม่แนะนำสำหรับ production):

```javascript
const GAS_WEB_APP_URL = process.env.REACT_APP_GAS_URL || 'https://script.google.com/macros/s/ใส่_URL_จาก_Deploy/exec';
```

จากนั้นรันแอป:

```bash
npm start
```

---

## สรุป Checklist

- [ ] แก้ `USER_SHEET_ID`, `SALES_SHEET_ID`, `SHEET_ID_DISCORD` ใน `backend/Code.js`
- [ ] (ถ้าใช้) แก้ `DISCORD_WEBHOOK_URL_BATCH` ใน `backend/Code.js`
- [ ] สร้างโปรเจกต์ GAS ใหม่ และ Deploy as Web App
- [ ] ตั้งค่า `REACT_APP_GAS_URL` ใน `.env` / `.env.local` หรือใน `gasAPI.js`
- [ ] (ถ้าใช้ clasp) แก้ `scriptId` ใน `.clasp.json` เป็น Script ID ของโปรเจกต์ใหม่

หลังตั้งค่าแล้ว โปรเจกต์ Clone นี้จะใช้เฉพาะ Google Sheet และ GAS ของคุณ จะไม่ไปกระทบข้อมูลของไฟล์หลัก
