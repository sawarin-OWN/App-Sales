# โครงสร้างประเภทผู้ใช้: สำนักงาน (Office)

## วัตถุประสงค์

เพิ่มประเภทผู้ใช้อีก 1 ประเภท เพื่อเก็บ **ข้อมูลยอดขายของสำนักงาน**  
ช่องทางในการกรอกยอดจะ **ไม่เหมือนสาขา** (สาขาใช้ เงินสด, โอน, Grab, Lineman, Shopee ฯลฯ; สำนักงานอาจเป็น โครงการ A/B, สัญญา, บริการ ฯลฯ)

---

## 1. ฐานข้อมูล (Supabase)

### ตาราง User

- เพิ่มคอลัมน์ **`Role`** (text):
  - `branch` = ผู้ใช้สาขา (ค่าเริ่มต้น)
  - `admin` = แอดมิน
  - `office` = สำนักงาน

รันสคริปต์ใน **`supabase-office-user.sql`** เพื่อเพิ่มคอลัมน์และสร้างตาราง `OfficeSales`

### ตาราง OfficeSales (ยอดขายสำนักงาน)

| คอลัมน์       | ประเภท   | หมายเหตุ |
|---------------|----------|----------|
| id            | bigint   | PK, อัตโนมัติ |
| Branch Code   | text     | เช่น `OFFICE` หรือรหัสสำนักงาน |
| Date          | date     | วันที่บันทึก |
| Channel1      | numeric  | ช่องทางที่ 1 (เปลี่ยนชื่อเป็นชื่อจริง เช่น ProjectA) |
| Channel2      | numeric  | ช่องทางที่ 2 |
| Channel3      | numeric  | ช่องทางที่ 3 |
| Other         | numeric  | อื่นๆ |
| Total         | numeric  | รวม |
| Notes         | text     | หมายเหตุ |
| CreatedBy     | text     | อีเมลผู้บันทึก |
| CreatedAt     | timestamptz | |
| UpdatedAt     | timestamptz | |

**หมายเหตุ:** ชื่อ `Channel1`, `Channel2`, `Channel3` เป็น placeholder — หลังตกลงชื่อช่องทางจริง (เช่น โครงการA, สัญญา, บริการ) ให้เปลี่ยนชื่อคอลัมน์ใน SQL และใน frontend ให้ตรงกัน

---

## 2. Frontend (เตรียมไว้)

- **Login / AuthContext:** อ่าน `user.role` จาก API หลังล็อกอิน
- **Layout (เมนู):**
  - ถ้า `role === 'office'` แสดงเมนูเฉพาะหน้าที่เกี่ยวกับสำนักงาน (เช่น "ยอดขายสำนักงาน") — ไม่แสดงปิดยอด/ค่าใช้จ่ายสาขาแบบเดิม
  - ถ้า `role === 'branch'` แสดงเมนูสาขาตามเดิม
  - ถ้า `role === 'admin'` แสดงเมนูสาขา + หลังบ้าน
- **หน้าใหม่ (placeholder):** ตัวอย่าง route `/office-sales` สำหรับฟอร์มบันทึกยอดขายสำนักงาน — ช่องกรอกแทน Cash/Transfer/Grab จะเป็นช่องทางที่กำหนดสำหรับ Office (Channel1, Channel2, Channel3, Other)

---

## 3. API (เตรียมไว้)

ใน `supabaseAPI.js` (หรือ api.js) จะต้องมีฟังก์ชันเช่น:

- `getOfficeSales(branchCode, startDate, endDate)` — ดึงรายการยอดขายสำนักงาน
- `saveOfficeSales(data)` — บันทึกยอดขายสำนักงาน (รับ channel1, channel2, channel3, other, total, date, branchCode ฯลฯ)
- `updateOfficeSales(data)` — แก้ไขรายการ

จะ implement เมื่อกำหนดชื่อช่องทางจริงและรูปแบบฟอร์มแล้ว

---

## 4. สรุป

| รายการ | สถานะ |
|--------|--------|
| SQL เพิ่ม Role ใน User + สร้างตาราง OfficeSales | เตรียมใน `supabase-office-user.sql` |
| เอกสารโครงสร้าง | ไฟล์นี้ |
| Frontend: แยกเมนูตาม role, หน้า office-sales | Placeholder — รอชื่อช่องทางจริง |
| API: getOfficeSales, saveOfficeSales, updateOfficeSales | Placeholder —  implement หลังตกลงโครงสร้าง |

เมื่อตกลงชื่อช่องทางยอดขายสำนักงานแล้ว (เช่น โครงการA, โครงการB, สัญญา) ให้แก้ `OfficeSales` และฟอร์มให้ใช้ชื่อคอลัมน์นั้นแทน Channel1/2/3
