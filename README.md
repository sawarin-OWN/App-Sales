# Sales Dashboard - React + Supabase

ระบบบันทึกและรายงานยอดขาย พัฒนาด้วย React, Tailwind CSS และ Supabase

> 📖 **ดูคู่มือการใช้งาน**: [USER-GUIDE.md](./USER-GUIDE.md)

## 🎯 เทคโนโลยีที่ใช้

- **Frontend**: React 18, Tailwind CSS, SweetAlert2, Chart.js
- **Backend**: Supabase (Auth, Database, Storage)
- **Deploy**: Vercel

## 📁 โครงสร้างโปรเจค

```
SALES REPORT/
├── src/                    # React Source Code
│   ├── components/         # React Components
│   │   ├── Login.js
│   │   ├── Layout.js
│   │   ├── Dashboard.js
│   │   ├── Sales.js
│   │   ├── Expenses.js
│   │   ├── Deposits.js
│   │   ├── TaxInvoices.js
│   │   ├── ProfitLoss.js
│   │   └── Admin.js
│   ├── context/            # React Context
│   │   ├── AuthContext.js
│   │   └── DataCacheContext.js
│   ├── services/           # API Services
│   │   ├── api.js          # API layer (Supabase)
│   │   ├── supabaseAPI.js
│   │   ├── supabaseClient.js
│   │   └── supabaseStorage.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── public/                 # Static Files
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
└── README.md
```

## 🚀 วิธีติดตั้งและรัน

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ [Supabase](https://supabase.com/)
2. Copy ไฟล์ `.env.example` เป็น `.env` หรือ `.env.local`
3. ใส่ `REACT_APP_SUPABASE_URL` และ `REACT_APP_SUPABASE_ANON_KEY` จาก Supabase Dashboard
4. รัน SQL ที่จำเป็น (ดู [SUPABASE-SETUP.md](./SUPABASE-SETUP.md) และ `supabase-pnl-tables.sql` ถ้าใช้งบกำไรขาดทุน)

### 3. รัน Development Server

```bash
npm start
```

แอปจะรันที่ `http://localhost:3000`

### 4. Build สำหรับ Production

```bash
npm run build
```

ไฟล์จะถูกสร้างในโฟลเดอร์ `build/`

## 📝 ฟีเจอร์

- ✅ ระบบ Login (Supabase Auth)
- ✅ Dashboard แสดงยอดขายและกราฟ
- ✅ บันทึกยอดขาย/ปิดยอดสิ้นวัน
- ✅ บันทึกค่าใช้จ่าย
- ✅ บันทึกการนำฝากเงินสด
- ✅ บันทึกใบกำกับภาษี
- ✅ จัดการข้อมูลผู้เสียภาษี (ใช้ร่วมกันทุกสาขา)
- ✅ งบกำไรขาดทุน (P&L) และเทียบเดือน
- ✅ คำนวณเงินขาด/เกิน
- ✅ Responsive Design (รองรับมือถือและเว็บ)
- ✅ อัพโหลดรูปภาพหลักฐาน (Supabase Storage)
- ✅ แก้ไขข้อมูลที่บันทึกไว้แล้ว
- ✅ หลังบ้าน Admin (ดู/เทียบงบสาขา)

## 📚 เอกสาร

- 📖 **[USER-GUIDE.md](./USER-GUIDE.md)** - คู่มือการใช้งานฉบับเต็ม
- 🚀 **[QUICK-START.md](./QUICK-START.md)** - เริ่มต้นใช้งานเร็วๆ
- 🗄️ **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)** - ตั้งค่า Supabase
- 🚀 **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)** - คู่มือ Deploy ไป Vercel
- 📄 **[TAX-INVOICES-SETUP.md](./TAX-INVOICES-SETUP.md)** - คู่มือตั้งค่าใบกำกับภาษี
- 🔄 **[SETUP-CLONE.md](./SETUP-CLONE.md)** / **[CLONE-APP-GUIDE.md](./CLONE-APP-GUIDE.md)** - Clone แอป / ตั้งค่าโปรเจกต์ใหม่

## 🔧 การ Deploy (Vercel)

- ใช้ Vercel เชื่อมกับ Git repo แล้ว deploy อัตโนมัติ
- ตั้งค่า Environment Variables ใน Vercel: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
- รายละเอียด: [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)

## 🐛 Troubleshooting

### Login ไม่ได้
- ตรวจสอบ Email/Password และว่ามี user ใน Supabase Auth
- ตรวจสอบตาราง `users` / สิทธิ์ RLS ใน Supabase

### บันทึกข้อมูลไม่ได้
- ตรวจสอบ Supabase Table names และ RLS policies
- ดู [SUPABASE-SETUP.md](./SUPABASE-SETUP.md)

### CORS / Network
- ใช้ Supabase URL และ Anon Key ที่ถูกต้องจาก Dashboard

## 📄 License

MIT
