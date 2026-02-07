# ความคืบหน้าโปรเจกต์ Sales Report

อัปเดตล่าสุด: ก.พ. 2025

---

## สถานะปัจจุบัน

| รายการ | สถานะ |
|--------|--------|
| **Git / GitHub** | ✅ Repo: `saocafe31-pixel/sales-report`, branch `main`, ส่งโค้ดแล้ว |
| **Vercel Deploy** | ✅ Deploy Production แล้ว (build ผ่านหลังแก้ ESLint สำหรับ CI) |
| **แอป React** | ✅ ใช้ Supabase, มี Dashboard, Sales, Deposits, Expenses, TaxInvoices, P&amp;L, Admin |
| **เอกสาร** | ✅ มี README, QUICK-START, SUPABASE-SETUP, USER-GUIDE, VERCEL-DEPLOY ฯลฯ |

---

## สิ่งที่ทำไปแล้ว

1. **Push ขึ้น GitHub** – แก้ `push-to-github.ps1` และ `.gitignore` (ไม่รวมโฟลเดอร์ `sales-report/` ที่เป็น nested repo), commit และ push สำเร็จ
2. **Deploy Vercel** – แก้ ESLint (unused vars, react-hooks) ให้ build ผ่านเมื่อ `CI=true`, deploy ผ่าน Vercel CLI
3. **อัปเดต GitHub สำหรับ Vercel** – commit การแก้ ESLint แล้ว push เพื่อให้ Vercel build จากโค้ดล่าสุด

---

## สิ่งที่ควรทำต่อ (ถ้าต้องการ)

- ตั้งค่า **Environment Variables** บน Vercel: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` แล้ว Redeploy
- ตรวจสอบการ Login และการเชื่อมต่อ Supabase บน Production

---

## ไฟล์ที่ลบไป (ไม่เกี่ยวข้อง / ซ้ำ)

- โฟลเดอร์ **sales-report/** – nested git clone ที่ไม่ใช้
- ไฟล์ **FIX-*.md** (6 ไฟล์) – บันทึกการแก้ไขครั้งเดียวที่ทำไปแล้วในโค้ด
- **เริ่มต้น-DEPLOY-VERCEL.md**, **DEPLOY-PRODUCTION.md** – ซ้ำกับ VERCEL-DEPLOY.md และ DEPLOY-GUIDE.md
