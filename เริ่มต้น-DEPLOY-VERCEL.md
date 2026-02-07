# เริ่มต้น Deploy ตั้งแต่ต้น — สร้าง Repo → Push → Vercel

ทำตามลำดับทีละขั้น ไม่ข้าม

---

## ขั้นที่ 1: สร้าง Repo บน GitHub

1. อยู่ที่หน้า **Create a new repository** (ตามภาพที่ส่งมา)
2. ตั้งค่า:
   - **Owner:** `saocafe31-pixel` (ใช้อยู่แล้ว)
   - **Repository name:** `sales-report` (ใช้อยู่แล้ว หรือจะเปลี่ยนก็ได้)
   - **Description:** (ไม่บังคับ) เช่น `Sales Dashboard - React + Supabase`
   - **Public** ตามที่เลือกไว้
   - **อย่าเลือก** "Add a README" — ตั้งเป็น **Off**
   - **Add .gitignore** → **No .gitignore**
   - **Add license** → **No license**

3. กด **Create repository**

เหตุผลที่ไม่ให้เพิ่ม README / .gitignore: โปรเจกต์เรามี `.gitignore` และไฟล์อยู่แล้ว จะ push ขึ้นไปทีเดียว

---

## ขั้นที่ 2: Push โปรเจกต์จากเครื่องขึ้น GitHub

หลังสร้าง repo แล้ว GitHub จะแสดงคำสั่งแบบ "…or push an existing repository from the command line" ใช้แนวทางนั้นได้ หรือทำตามด้านล่าง

### เปิด Terminal / PowerShell ที่โฟลเดอร์โปรเจกต์

```powershell
cd "c:\Users\ST36\Desktop\SALEs REPORT - Clone"
```

### ถ้ายังไม่เคยใช้ Git ในโฟลเดอร์นี้ (ครั้งแรก)

```powershell
git init
git add .
git commit -m "Initial commit - Sales Report React app"
git branch -M main
git remote add origin https://github.com/saocafe31-pixel/sales-report.git
git push -u origin main
```

### ถ้าโฟลเดอร์นี้เคยเชื่อมกับ repo อื่น (เช่น chaijunla) แล้ว

```powershell
git remote remove origin
git remote add origin https://github.com/saocafe31-pixel/sales-report.git
git branch -M main
git push -u origin main
```

- ถ้า `git push` ขอ **username/password** ให้ใช้ **Personal Access Token** แทนรหัสผ่าน  
  (GitHub → Settings → Developer settings → Personal access tokens → Generate new token)

### ทางเลือก: ใช้ GitHub Desktop

1. ติดตั้ง [GitHub Desktop](https://desktop.github.com)
2. **File** → **Add local repository** → เลือกโฟลเดอร์ `SALEs REPORT - Clone`
3. ถ้าขึ้นว่า "This directory does not appear to be a Git repository" → กด **create a repository** ในโฟลเดอร์นี้ (ชื่อ repo ในเครื่องไม่สำคัญ)
4. จะเห็นรายการไฟล์ → ใส่ Summary เช่น `Initial commit` → กด **Commit to main**
5. **Repository** → **Push origin** (หรือปุ่ม Push)
6. ถ้ายังไม่มี remote: **Repository** → **Repository settings** → เพิ่ม Remote URL เป็น `https://github.com/saocafe31-pixel/sales-report.git` แล้ว Push อีกครั้ง

### ตรวจผล

เปิด https://github.com/saocafe31-pixel/sales-report  
ต้องเห็น **package.json**, โฟลเดอร์ **src/** และ **public/** ที่ root

---

## ขั้นที่ 3: สร้างโปรเจกต์บน Vercel และ Deploy

1. ไปที่ **[vercel.com](https://vercel.com)** → Login (ใช้ GitHub ได้)
2. กด **Add New** → **Project**
3. จากรายการ repo เลือก **sales-report** (ของ `saocafe31-pixel`) → **Import**
4. ตั้งค่าโปรเจกต์:
   - **Framework Preset:** Create React App (หรือ Vite ถ้า Vercel เดาเป็น Vite)
   - **Root Directory:** `./` (เว้นว่างหรือใส่ `./`)
   - กด **Expand** ที่ **Build and Output Settings** แล้วตรวจ:
     - **Build Command:** `npm run build`
     - **Output Directory:** `build`
   - **Install Command:** ไม่ต้องเปลี่ยน (ใช้ `npm install`)

5. กด **Expand** ที่ **Environment Variables** แล้วเพิ่ม 2 ตัว:

   | Name | Value |
   |------|--------|
   | `REACT_APP_SUPABASE_URL` | `https://arilermjxqvmkvmzzzpz.supabase.co` |
   | `REACT_APP_SUPABASE_ANON_KEY` | คีย์จาก Supabase → Settings → API → anon public |

   Environment เลือก **Production** (หรือเลือกครบทุกตัว)

6. กด **Deploy**

7. รอ 1–2 นาที จะได้ลิงก์แบบ `https://sales-report-xxx.vercel.app`

---

## ขั้นที่ 4: ตรวจว่าแอปทำงาน

1. เปิดลิงก์ที่ Vercel ให้
2. ควรเห็นหน้า Login / Sales Dashboard
3. ลอง Login แล้วใช้งานตามปกติ
4. ถ้า Supabase ไม่เชื่อมต่อ → ตรวจว่าใส่ **Environment Variables** ครบแล้ว แล้วไป **Deployments** → **Redeploy**

---

## สรุปสั้น ๆ

| ลำดับ | ทำอะไร |
|--------|--------|
| 1 | สร้าง repo ชื่อ `sales-report` บน GitHub (ไม่ต้องเพิ่ม README/.gitignore) |
| 2 | Push โปรเจกต์จากโฟลเดอร์ "SALEs REPORT - Clone" ขึ้น repo นั้น |
| 3 | Vercel → Import repo **sales-report** → ตั้ง Build + ใส่ env → Deploy |
| 4 | เปิดลิงก์ที่ได้แล้วทดสอบแอป |

---

## ถ้าเจอปัญหา

- **Push ไม่ได้ / ไม่รู้คำสั่ง git** → ใช้ GitHub Desktop ตามขั้นที่ 2
- **Vercel build ล้มเหลว** → ตรวจว่าใน repo มี **package.json** ที่ root และตั้ง Output Directory = `build`
- **แอปขึ้นแต่เชื่อม Supabase ไม่ได้** → ใส่ `REACT_APP_SUPABASE_URL` กับ `REACT_APP_SUPABASE_ANON_KEY` ใน Vercel แล้ว Redeploy
