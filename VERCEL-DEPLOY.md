# 🚀 Deploy ขึ้น Vercel — คู่มือสั้นๆ

โปรเจกต์นี้เป็น **Create React App** ใช้ **Supabase** อยู่แล้ว มี `vercel.json` สำหรับ PWA และ SPA routing

---

## วิธีที่ 1: Deploy ผ่าน Vercel + GitHub (แนะนำ)

### 1. อัปโหลดโค้ดขึ้น GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. เชื่อมกับ Vercel
1. ไปที่ **[vercel.com](https://vercel.com)** → Login (ใช้ GitHub ได้)
2. คลิก **Add New** → **Project**
3. เลือก repo **Sales Report** (หรือชื่อที่ push ไว้)
4. ตั้งค่าโปรเจกต์:
   - **Framework Preset:** Create React App (Vercel จะเดาให้อัตโนมัติ)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`

### 3. ใส่ Environment Variables
ก่อนกด Deploy ให้เพิ่มตัวแปรสภาพแวดล้อม:

| Name | Value | หมายเหตุ |
|------|--------|----------|
| `REACT_APP_SUPABASE_URL` | `https://arilermjxqvmkvmzzzpz.supabase.co` | URL โปรเจกต์ Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | คีย์ anon/public ของ Supabase | จาก Supabase → Settings → API |

- กด **Add** แต่ละตัว
- เลือก **Production**, **Preview**, **Development** ให้ครบ (หรืออย่างน้อย Production)

### 4. Deploy
- กด **Deploy**
- รอ 1–2 นาที จะได้ลิงก์แบบ `https://your-project.vercel.app`

---

## วิธีที่ 2: Deploy ด้วย Vercel CLI (ไม่ใช้ Git)

### 1. ติดตั้งและ Login
```bash
npm i -g vercel
vercel login
```

### 2. Deploy จากโฟลเดอร์โปรเจกต์
```bash
cd "c:\Users\ST36\Desktop\SALEs REPORT - Clone"
vercel
```

- **Set up and deploy?** → **Y**
- **Which scope?** → เลือกบัญชี
- **Link to existing project?** → **N** (ถ้าเป็นโปรเจกต์ใหม่)
- **Project name?** → ตั้งชื่อ (เช่น `sales-report`)
- **Directory?** → กด Enter ใช้ `.` (Vercel จะรัน build ให้)

### 3. ใส่ Environment Variables หลัง Deploy
1. ไปที่ [Vercel Dashboard](https://vercel.com/dashboard) → เลือกโปรเจกต์
2. **Settings** → **Environment Variables**
3. เพิ่ม `REACT_APP_SUPABASE_URL` และ `REACT_APP_SUPABASE_ANON_KEY` ตามตารางด้านบน
4. **Redeploy** (Deployments → ⋮ → Redeploy) เพื่อให้ env มีผล

### Deploy ขึ้น Production
```bash
vercel --prod
```

---

## สิ่งที่โปรเจกต์ตั้งไว้แล้ว

- **`vercel.json`**  
  - Header สำหรับ `manifest.json` และ `service-worker.js` (PWA)  
  - **rewrites** ให้ทุก path ไปที่ `index.html` (แก้ปัญหา refresh แล้ว 404)

- **Build**
  - `prebuild` จะ copy `index.production.html` ไปใช้ก่อน build
  - Output อยู่ที่โฟลเดอร์ `build/`

---

## Checklist ก่อน Deploy

- [ ] Build ผ่านในเครื่อง: `npm run build`
- [ ] ใส่ `REACT_APP_SUPABASE_URL` และ `REACT_APP_SUPABASE_ANON_KEY` ใน Vercel
- [ ] ถ้าใช้โดเมนอื่น ไปที่ Settings → Domains เพิ่มโดเมนและตั้ง DNS ตามที่ Vercel แนะนำ

---

## ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|--------|--------|
| Build ล้มเหลว | รัน `npm install` แล้ว `npm run build` ในเครื่อง ดู error ให้ตรงกับที่ Vercel แสดง |
| Refresh หน้าแล้ว 404 | ตรวจว่า `vercel.json` มี `rewrites` ไปที่ `/index.html` (ในโปรเจกต์นี้ใส่ไว้แล้ว) |
| Supabase ไม่เชื่อมต่อ | ตรวจว่าใส่ทั้งสอง env ใน Vercel แล้ว Redeploy |
| PWA / ไอคอนไม่อัปเดต | ลองเคลียร์ cache หรือลบแอปจากโฮมแล้ว Add to Home Screen ใหม่ |

---

## ลิงก์อ้างอิง

- [Vercel Docs](https://vercel.com/docs)
- [Deploying Create React App](https://vercel.com/guides/deploying-react-with-vercel)
