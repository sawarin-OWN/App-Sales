# การตั้งค่า Supabase สำหรับโปรเจกต์ Clone

โปรเจกต์นี้เชื่อมต่อกับฐานข้อมูล Supabase แล้ว (Project: `arilermjxqvmkvmzzzpz`)

---

## 1. สร้างตารางใน Supabase

ใน Supabase Dashboard → SQL Editor ให้รันคำสั่งสร้างตารางตามที่กำหนดไว้ (User, Taxpayers, TaxInvoices, Sales, Expenses, Deposits) หรือใช้โครงสร้างที่คุณให้มาแล้ว

**ตารางสำหรับงบกำไรขาดทุนประจำเดือน:** รันไฟล์ `supabase-pnl-tables.sql` ใน SQL Editor เพื่อสร้างตาราง PnlSettings, CentralBills, OperatingExpenses

---

## 2. นโยบายความปลอดภัย (RLS)

ถ้าเปิด **Row Level Security (RLS)** ไว้ ตารางจะไม่ให้อ่าน/เขียนจากแอปจนกว่าจะมี Policy

### วิธีที่ 1: ปิด RLS ชั่วคราว (เหมาะกับ development)

ใน SQL Editor:

```sql
ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Taxpayers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaxInvoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sales" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Expenses" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Deposits" DISABLE ROW LEVEL SECURITY;
```

### วิธีที่ 2: เปิด RLS และอนุญาต anon

ถ้าต้องการเปิด RLS ให้สร้าง Policy อนุญาตให้ `anon` อ่าน/เขียน (หรือจำกัดตาม role ตามที่คุณออกแบบ):

```sql
-- ตัวอย่าง: อนุญาต anon อ่าน/เขียนทุกตาราง (ปรับตามความปลอดภัยที่ต้องการ)
CREATE POLICY "Allow anon read write User" ON public."User" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write Taxpayers" ON public."Taxpayers" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write TaxInvoices" ON public."TaxInvoices" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write Sales" ON public."Sales" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write Expenses" ON public."Expenses" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write Deposits" ON public."Deposits" FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## 3. Storage — Bucket สำหรับรูปสลิป/ใบสรุปยอดขาย (หน้าปิดยอด)

ใช้เก็บรูปภาพจากส่วน **แนบรูปภาพสลิปหรือใบสรุปยอดขาย** ในหน้าปิดยอด

### 3.1 สร้าง Bucket ใน Dashboard

1. เปิด **Supabase Dashboard** → **Storage**
2. คลิก **New bucket**
3. ตั้งค่า:
   - **Name**: `sales-receipts`
   - **Public bucket**: เปิด (ติ๊ก) — เพื่อให้ได้ URL เปิดดูรูปได้โดยตรง
4. คลิก **Create bucket**

### 3.2 ตั้งค่า Policy ให้อัปโหลดได้

ถ้า Bucket ไม่อนุญาตให้ anon อัปโหลด ให้ไปที่ **Storage** → **Policies** ของ bucket `sales-receipts` แล้วเพิ่ม Policy หรือรันใน **SQL Editor**:

```sql
-- อนุญาตให้ทุกคน (anon) อัปโหลดและอ่านไฟล์ใน bucket sales-receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-receipts', 'sales-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: อัปโหลดได้
CREATE POLICY "Allow anon upload sales-receipts"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'sales-receipts');

-- Policy: อ่านได้ (public)
CREATE POLICY "Allow public read sales-receipts"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'sales-receipts');

-- Policy: ลบได้ (ถ้าต้องการให้ผู้ใช้ลบรูปได้)
CREATE POLICY "Allow anon delete sales-receipts"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'sales-receipts');
```

ถ้าสร้าง bucket ผ่าน Dashboard แล้ว ให้ไปที่ **Storage** → **sales-receipts** → **Policies** แล้วเพิ่ม policy อนุญาต **INSERT** และ **SELECT** สำหรับ role `anon` (หรือรันเฉพาะ 3 บรรทัด CREATE POLICY ด้านบน โดยไม่ต้อง INSERT INTO storage.buckets)

### 3.3 Bucket เพิ่มเติม: ค่าใช้จ่าย, นำฝาก, ใบกำกับภาษี

ใช้เก็บรูปภาพในหน้า **ค่าใช้จ่าย** (รูปหลักฐาน), **นำฝาก** (สลิปการฝาก), **ใบกำกับภาษี** (รูปใบกำกับภาษี) — ทำงานเหมือนหน้าปิดยอด

สร้าง bucket อีก 3 ตัวใน **Storage** → **New bucket** แต่ละตัว:

| Bucket name         | ใช้สำหรับ        |
|---------------------|-------------------|
| `expense-receipts`  | หน้าค่าใช้จ่าย    |
| `deposit-slips`     | หน้านำฝาก        |
| `tax-invoice-images`| หน้าใบกำกับภาษี  |

สำหรับแต่ละ bucket:
- ตั้ง **Public bucket** = เปิด (ติ๊ก)
- ไปที่ **Policies** ของ bucket นั้น → เพิ่ม policy อนุญาต **INSERT** และ **SELECT** สำหรับ role `anon`

หรือรันใน **SQL Editor** (สร้าง bucket ผ่าน Dashboard ก่อน แล้วรันเฉพาะส่วน Policy):

```sql
-- Policy สำหรับ expense-receipts
CREATE POLICY "Allow anon upload expense-receipts" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'expense-receipts');
CREATE POLICY "Allow public read expense-receipts" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'expense-receipts');

-- Policy สำหรับ deposit-slips
CREATE POLICY "Allow anon upload deposit-slips" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'deposit-slips');
CREATE POLICY "Allow public read deposit-slips" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'deposit-slips');

-- Policy สำหรับ tax-invoice-images
CREATE POLICY "Allow anon upload tax-invoice-images" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'tax-invoice-images');
CREATE POLICY "Allow public read tax-invoice-images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'tax-invoice-images');
```

---

## 4. ตัวแปรแวดล้อม (ถ้าต้องการเปลี่ยนโปรเจกต์)

ค่าเริ่มต้นในโค้ดชี้ไปที่โปรเจกต์นี้แล้ว ถ้าต้องการเปลี่ยน URL หรือ Key ให้สร้าง `.env` หรือ `.env.local`:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_or_publishable_key
```

จาก Supabase Dashboard: **Project Settings** → **API** → **Project URL** และ **anon public** key

---

## 5. ข้อมูล User สำหรับ Login

ต้องมีอย่างน้อย 1 แถวในตาราง `User` ถึงจะล็อกอินได้

ใน SQL Editor:

```sql
INSERT INTO public."User" ("Email", "Password", "Name", "Branch Code", "Branch Name")
VALUES ('admin@example.com', 'password123', 'Admin', 'SA001', 'สาขาหลัก');
```

จากนั้นใช้ Email และ Password นี้ล็อกอินในแอป

---

## 6. สลับกลับไปใช้ GAS

ถ้าต้องการให้แอปใช้ Google Apps Script แทน Supabase:

ใน `.env` หรือ `.env.local`:

```env
REACT_APP_USE_SUPABASE=false
REACT_APP_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

จากนั้นรัน `npm start` ใหม่
