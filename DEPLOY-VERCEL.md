# คู่มือ Deploy บน Vercel (แบบละเอียด)

โปรเจกต์นี้เป็น **Create React App** ใช้ **Supabase** เป็นหลังบ้าน คู่มือนี้จะพาทีละขั้นตอนตั้งแต่เตรียม Repo จนถึงได้ URL Production

---

## สรุปขั้นตอน Deploy แบบเร็ว (Quick Steps)

| ลำดับ | ทำอะไร | หมายเหตุ |
|-------|--------|----------|
| 1 | **Push โค้ดขึ้น GitHub** (ถ้าใช้ Deploy ผ่าน Dashboard) | Repo ใดก็ได้ เช่น `main` |
| 2 | **เตรียม Supabase** | จาก Supabase → Settings → API คัดลอก **Project URL** และ **anon public** key |
| 3 | **ไปที่ [vercel.com](https://vercel.com)** → Add New → Project → เลือก Repo | หรือใช้ CLI: `npx vercel` |
| 4 | **ตั้งค่า Build:** Framework = Create React App, Build = `npm run build`, Output = `build` | มักเดาได้อัตโนมัติ |
| 5 | **ใส่ Environment Variables** ก่อนกด Deploy: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` | ติ๊ก Production + Preview |
| 6 | **กด Deploy** | รอ 1–3 นาที จะได้ URL เช่น `https://xxx.vercel.app` |
| 7 | **ทดสอบ:** เปิด URL, ลอง Login, ลอง Refresh หน้าที่ path ย่อย (เช่น `/dashboard`) | ถ้า 404 ดูหัวข้อ "แก้ปัญหา: Refresh แล้ว 404" — โปรเจกต์นี้มี `vercel.json` แล้ว |

**ตรวจในเครื่องก่อน Deploy:** รัน `npm run build` ให้ผ่าน (โปรเจกต์นี้ build ผ่านแล้ว)

---

## ปลายทาง (Project) ที่ Deploy ไป — ต้องเป็น repo นี้

โปรเจกต์นี้ต้อง deploy ไปที่ Vercel Project ที่เชื่อมกับ **https://github.com/saocafe31-pixel/sales-report** เท่านั้น (เช่น sales-report-taupe.vercel.app) ไม่ให้ deploy ไปที่โปรเจกต์อื่น (เช่น sale-s-report-clone / sawarin-owns-projects) — ดูขั้นตอนลิงก์ที่ถูกต้องในหัวข้อ "วิธีกำหนดปลายทาง" ด้านล่าง

| รายการ | สถานะในโปรเจกต์นี้ |
|--------|---------------------|
| **กำหนดไว้ใน repo หรือไม่** | **ไม่มี** — โปรเจกต์นี้ไม่ได้เก็บชื่อ/ID ของ Vercel Project ไว้ในโค้ด |
| **โฟลเดอร์ `.vercel/`** | ไม่มีในโปรเจกต์ (และอยู่ใน `.gitignore` จึงไม่ถูก commit) |
| **ไฟล์ `vercel.json`** | **มีแล้ว** — ใช้สำหรับ SPA rewrites (ป้องกัน Refresh แล้ว 404) |

**สรุป:** ตอนนี้ **ไม่มี “ปลายทาง” ตายตัวในโปรเจกต์**  
- **Deploy ผ่าน Vercel Dashboard (Import จาก GitHub):** ปลายทางคือ Project ที่คุณสร้าง/เลือกตอน Import Repo นั้นบน [vercel.com](https://vercel.com)  
- **Deploy ผ่าน Vercel CLI (`vercel` / `vercel --prod`):** ปลายทางจะถูกกำหนดตอนรันคำสั่ง (ถามให้เลือก Team + Project หรือสร้างใหม่) และเก็บในโฟลเดอร์ `.vercel/project.json` ในเครื่องคุณเท่านั้น (ไม่ส่งขึ้น Git)

### วิธีตรวจสอบว่าโฟลเดอร์นี้ deploy ไปที่ Project ไหน (เมื่อใช้ CLI)

1. รันในโฟลเดอร์โปรเจกต์:
   ```bash
   npx vercel project ls
   ```
   จะแสดงรายการ Project ในบัญชี/ทีมที่ login อยู่

2. ถ้ามีการ link ไว้แล้ว (มีโฟลเดอร์ `.vercel` ในเครื่อง) ดูได้จาก:
   - เปิดไฟล์ `.vercel/project.json` (ถ้ามี) จะมี `projectId`, `orgId`, `projectName`  
   - หรือรัน `npx vercel inspect <url>` โดยใส่ URL deployment จริง เช่น `npx vercel inspect sales-report-taupe.vercel.app`

3. ถ้ายังไม่เคย link หรือลบ `.vercel` ไปแล้ว การรัน `vercel` ครั้งถัดไปจะถามให้เลือก/สร้าง Project ใหม่

### วิธีกำหนดปลายทาง (Link กับ Project ที่เชื่อมกับ repo นี้)

โปรเจกต์นี้ต้อง deploy ไปที่ **https://github.com/saocafe31-pixel/sales-report** (โดเมนเช่น sales-report-taupe.vercel.app) ไม่ใช่โปรเจกต์อื่น (เช่น sale-s-report-clone / sawarin-owns-projects)

**ทำไมรัน `vercel link` แล้วเห็น Scope "sawarin-own's projects"?**  
เพราะ Vercel CLI แสดง **ทุก Scope (ทีม/บัญชี) ที่คุณ login อยู่** — ถ้าคุณเคยใช้บัญชีนี้กับไฟล์ต้นทางที่ clone มา ก็จะโผล่ในรายการ ต้องเลือก Scope ที่เป็นเจ้าของโปรเจกต์ที่เชื่อมกับ repo นี้ หรือถ้ามีแค่ Scope เดียว ให้เลือกแล้วไปเลือก **ชื่อโปรเจกต์** ให้ถูก (sales-report ไม่ใช่ sale-s-report-clone)

1. **ลบการ link เก่า** (ถ้าเคย deploy ไปผิดโปรเจกต์): ลบโฟลเดอร์ `.vercel` ในโปรเจกต์ หรือรัน `Remove-Item -Path ".vercel" -Recurse -Force`
2. รัน:
   ```bash
   npx vercel link
   ```
3. **Which scope?** → ใช้ลูกศรขึ้นลงดูรายการ **ทุก Scope** ที่โผล่มา  
   - ถ้ามี Scope อื่นนอกจาก "sawarin-own's projects" (เช่น บัญชีที่ใช้ Import repo saocafe31-pixel/sales-report) ให้เลือก **Scope นั้น**  
   - ถ้ามีแค่ "sawarin-own's projects" ให้เลือก Scope นี้ได้ แล้วไปขั้นถัดไปให้เลือก **ชื่อโปรเจกต์** ให้ถูก (ต้องเป็น sales-report ที่โดเมน sales-report-taupe.vercel.app ไม่ใช่ sale-s-report-clone)
4. **Link to existing project?** → **Y**
5. **What's the name of your existing project?** → เลือก **sales-report** (โดเมน sales-report-taupe.vercel.app) **ไม่ใช่** sale-s-report-clone

จากนั้นรัน `vercel --prod` จะ deploy ไปที่ Project ที่เชื่อมกับ repo นี้

---

## สิ่งที่ต้องเตรียมก่อน Deploy

| รายการ | หมายเหตุ |
|--------|----------|
| **บัญชี Vercel** | สมัครที่ [vercel.com](https://vercel.com) (ใช้ GitHub Login ได้) |
| **โค้ดบน GitHub** | โปรเจกต์ต้อง push ขึ้น GitHub แล้ว (branch ใดก็ได้ เช่น `main`) |
| **Supabase** | มีโปรเจกต์ Supabase พร้อม URL และ Anon Key (ใช้ตอนตั้งค่า Environment Variables) |

---

## วิธีที่ 1: Deploy ผ่าน Vercel Dashboard (แนะนำ)

เหมาะกับคนที่ใช้ GitHub อยู่แล้ว และอยากให้ Vercel build อัตโนมัติทุกครั้งที่ push

### ขั้นที่ 1: เข้า Vercel และเพิ่มโปรเจกต์

1. เปิด **[vercel.com](https://vercel.com)** แล้ว Login (แนะนำให้เชื่อมกับ GitHub)
2. คลิกปุ่ม **"Add New..."** มุมขวาบน
3. เลือก **"Project"**

### ขั้นที่ 2: Import โปรเจกต์จาก GitHub

1. ในหน้า Import Git Repository จะเห็นรายการ Repo จาก GitHub
2. เลือก Repo ของโปรเจกต์ (เช่น `saocafe31-pixel/sales-report`)  
   - ถ้าไม่เห็น Repo ให้คลิก **"Adjust GitHub App Permissions"** แล้วเปิดสิทธิ์ให้ Vercel เห็น Organization/Repo ที่ต้องการ
3. คลิก **"Import"** ข้างชื่อ Repo

### ขั้นที่ 3: ตั้งค่า Build (Configure Project)

ก่อนกด Deploy ตรวจสอบค่าต่อไปนี้:

| ช่อง | ค่าที่ใช้ | หมายเหตุ |
|------|-----------|----------|
| **Framework Preset** | `Create React App` | Vercel มักเดาได้จาก `package.json` |
| **Root Directory** | `./` | เว้นว่างหรือใส่ `./` ถ้าโค้ดอยู่ที่ root |
| **Build Command** | `npm run build` | ตรงกับสคริปต์ใน `package.json` |
| **Output Directory** | `build` | CRA สร้างโฟลเดอร์ `build` |
| **Install Command** | `npm install` | ค่าเริ่มต้น |

ไม่ต้องเปลี่ยน **Node.js Version** ถ้าไม่จำเป็น (ใช้ default ได้)

### ขั้นที่ 4: ใส่ Environment Variables (สำคัญ)

แอปใช้ Supabase จึงต้องใส่ตัวแปรเหล่านี้ก่อน Deploy ครั้งแรก:

1. ในหน้า Configure Project เลื่อนลงถึงส่วน **"Environment Variables"**
2. เพิ่มทีละตัวตามตาราง:

| Name | Value | ใช้กับ |
|------|--------|--------|
| `REACT_APP_SUPABASE_URL` | `https://xxxxx.supabase.co` | URL โปรเจกต์จาก Supabase → Settings → API |
| `REACT_APP_SUPABASE_ANON_KEY` | คีย์ยาวๆ ที่ขึ้นต้นแบบ anon/public | จาก Supabase → Settings → API → Project API keys → `anon` `public` |

3. ใส่ค่าแล้วกด **Add**
4. ติ๊กให้ครบทั้ง **Production**, **Preview**, **Development** (หรืออย่างน้อย Production)

### ขั้นที่ 5: กด Deploy

1. คลิก **"Deploy"**
2. รอ 1–3 นาที (ขึ้นกับขนาดโปรเจกต์)
3. เมื่อเสร็จจะได้:
   - **Production URL** เช่น `https://sales-report-xxxx.vercel.app`
   - ลิงก์ไปที่ **Vercel Dashboard** ของโปรเจกต์นี้

### ขั้นที่ 6: เปิดแอปและทดสอบ

1. คลิก URL ที่ได้ เพื่อเปิดแอป
2. ทดสอบ Login (ต้องใช้ Supabase Auth ที่ตั้งไว้ในโปรเจกต์เดียวกัน)
3. ถ้า Refresh หน้าที่อยู่ path ย่อย (เช่น `/dashboard`) แล้วขึ้น 404 ให้ดูหัวข้อ **“แก้ปัญหา: Refresh แล้ว 404”** ด้านล่าง

---

## วิธีที่ 2: Deploy ผ่าน Vercel CLI

เหมาะกับคนที่อยาก deploy จากเครื่องตัวเองโดยไม่ผูกกับ GitHub ทันที

### ขั้นที่ 1: ติดตั้ง Vercel CLI

```bash
npm install -g vercel
```

หรือรันแบบไม่ติดตั้งทั่วเครื่อง:

```bash
npx vercel
```

### ขั้นที่ 2: Login (ครั้งแรกเท่านั้น)

```bash
vercel login
```

เลือกวิธี Login (เช่นอีเมล หรือ GitHub) แล้วทำตามที่บอก

### ขั้นที่ 3: Deploy จากโฟลเดอร์โปรเจกต์

1. เปิด Terminal แล้วไปที่โฟลเดอร์โปรเจกต์:

   ```bash
   cd "C:\Users\ST36\Desktop\SALEs REPORT - Clone"
   ```

2. รัน:

   ```bash
   vercel
   ```

3. ตอบคำถามประมาณนี้:
   - **Set up and deploy?** → กด **Y**
   - **Which scope?** → เลือกบัญชีหรือทีม
   - **Link to existing project?** → **N** (โปรเจกต์ใหม่) หรือ **Y** (ถ้ามีโปรเจกต์ใน Vercel อยู่แล้ว)
   - **Project name?** → ตั้งชื่อ เช่น `sales-report`
   - **Directory?** → กด Enter ใช้ `./`

4. รอให้อัปโหลดและ build เสร็จ จะได้ URL แบบ Preview

### ขั้นที่ 4: Deploy ขึ้น Production

```bash
vercel --prod
```

จะได้ URL แบบ Production (เช่น `https://sales-report-xxxx.vercel.app`)

### ขั้นที่ 5: ใส่ Environment Variables (ถ้ารัน CLI ครั้งแรก)

ถ้ายังไม่ได้ใส่ตัวแปรใน Vercel:

1. ไปที่ **[Vercel Dashboard](https://vercel.com/dashboard)** → เลือกโปรเจกต์
2. ไปที่ **Settings** → **Environment Variables**
3. เพิ่ม `REACT_APP_SUPABASE_URL` และ `REACT_APP_SUPABASE_ANON_KEY` ตามหัวข้อ “ขั้นที่ 4” ในวิธีที่ 1
4. กลับไปที่ **Deployments** → กด **⋮** ที่ deployment ล่าสุด → **Redeploy** เพื่อให้ build ใหม่โดยมี env

---

## หลัง Deploy: การตั้งค่าเพิ่ม (ถ้าต้องการ)

### โดเมนของ Vercel

- โปรเจกต์จะได้โดเมนฟรี เช่น `https://sales-report-xxxx.vercel.app`
- เปลี่ยนหรือเพิ่มโดเมน: **Settings** → **Domains** แล้วเพิ่มโดเมนแล้วตั้ง DNS ตามที่ Vercel แนะนำ

### Auto Deploy จาก GitHub

- ถ้าใช้ **วิธีที่ 1** (Import จาก GitHub) อยู่แล้ว: ทุกครั้งที่ push ขึ้น branch ที่เชื่อมไว้ (เช่น `main`) Vercel จะ build และ deploy ให้อัตโนมัติ
- ดู/เปลี่ยน branch ได้ที่ **Settings** → **Git** → **Production Branch**

### Redeploy เอง

- **Deployments** → เลือก deployment ที่ต้องการ → **⋮** → **Redeploy**

---

## แก้ปัญหาเบื้องต้น

### Build ล้มเหลว (Build Failed)

- ดู **Build Logs** ในหน้า Deployment แล้วดูบรรทัด error
- รันในเครื่องก่อนให้ผ่าน:
  ```bash
  npm install
  npm run build
  ```
- ถ้า error เหมือนกัน แก้ในเครื่องแล้ว commit/push (หรือ deploy ผ่าน CLI อีกครั้ง)

### Refresh หน้าที่ path ย่อยแล้วขึ้น 404

แอปเป็น SPA (Single Page App) ต้องให้ทุก path ไปที่ `index.html`:

1. สร้างไฟล์ `vercel.json` ที่ root โปรเจกต์ (ระดับเดียวกับ `package.json`)
2. ใส่เนื้อหาดังนี้:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

3. Commit แล้ว push (หรือ deploy ผ่าน CLI อีกครั้ง)

### Supabase ไม่เชื่อมต่อ / Login ไม่ได้

- ตรวจว่าใน Vercel ใส่ **Environment Variables** ครบ: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
- ตรวจว่า URL ใน Supabase (เช่น Site URL / Redirect URLs) อนุญาตโดเมนของ Vercel แล้ว
- หลังแก้ env ให้ **Redeploy** เพื่อให้ build ใหม่มีค่าล่าสุด

### ต้องการดูค่า Environment Variables

- ใน Vercel ดูได้แค่ชื่อตัวแปร (Value ถูกซ่อน)  
- แก้หรือเพิ่มได้ที่ **Settings** → **Environment Variables**

---

## สรุป Checklist ก่อน Deploy

- [ ] โปรเจกต์ push ขึ้น GitHub แล้ว (ถ้าใช้วิธีที่ 1)
- [ ] ใส่ `REACT_APP_SUPABASE_URL` และ `REACT_APP_SUPABASE_ANON_KEY` ใน Vercel
- [ ] Build ผ่านในเครื่อง: `npm run build`
- [ ] (ถ้าใช้ SPA เต็ม path) มี `vercel.json` สำหรับ rewrites

---

## ลิงก์อ้างอิง

- [Vercel Docs](https://vercel.com/docs)
- [Deploying Create React App](https://vercel.com/guides/deploying-react-with-vercel)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
