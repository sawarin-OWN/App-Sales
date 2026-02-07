# แก้ "git is not recognized" — ใช้ได้ 2 ทาง

PowerShell ไม่รู้คำสั่ง `git` แปลว่าเครื่องยังไม่มี Git ใน PATH หรือยังไม่ได้ติดตั้ง

---

## วิธีที่ 1: ใช้ GitHub Desktop (ไม่ต้องติดตั้ง Git / ไม่ต้องใช้คำสั่ง)

เหมาะถ้าไม่อยากติดตั้งหรือตั้งค่า Git ใน Terminal

### 1. ติดตั้ง GitHub Desktop
- ไปที่ **https://desktop.github.com**
- ดาวน์โหลดและติดตั้ง แล้วเปิดโปรแกรม

### 2. Login ด้วยบัญชี GitHub
- ใช้บัญชี **saocafe31-pixel** (หรือบัญชีที่สร้าง repo sales-report)

### 3. เพิ่มโฟลเดอร์โปรเจกต์
- เมนู **File** → **Add local repository**
- กด **Choose...** แล้วเลือกโฟลเดอร์:
  ```
  C:\Users\ST36\Desktop\SALEs REPORT - Clone
  ```
- กด **Add repository**

### 4. ถ้าขึ้นว่า "This directory does not appear to be a Git repository"
- กด **create a repository**
- Repository name: ใส่ `sales-report` หรืออะไรก็ได้ (ใช้แค่ในเครื่อง)
- กด **Create repository**

### 5. Commit ไฟล์ทั้งหมด
- ทางซ้ายจะเห็นรายการไฟล์ที่เปลี่ยน
- ด้านล่างซ้าย ช่อง **Summary** ใส่: `Initial commit - Sales Report`
- กดปุ่ม **Commit to main**

### 6. Publish / Push ไป GitHub
- เมนู **Repository** → **Push origin**  
  หรือถ้ามีปุ่ม **Publish repository** ให้กดนั้น
- ถ้าถามว่า Publish ไปที่ไหน:
  - เลือก Owner: **saocafe31-pixel**
  - Name: **sales-report**
  - กด **Push Repository** หรือ **Publish**

### 7. ตรวจบน GitHub
- เปิด https://github.com/saocafe31-pixel/sales-report
- ต้องเห็น **package.json**, โฟลเดอร์ **src/**, **public/** ฯลฯ

เสร็จแล้วไปทำขั้นตอน Deploy บน Vercel ต่อได้เลย

---

## ถ้าเปิด repo แล้วขึ้น "No local changes" / "Cannot publish: no commits"

แปลว่าโฟลเดอร์ที่ GitHub Desktop เปิดอยู่**ไม่ใช่โฟลเดอร์โปรเจกต์จริง** (อาจเป็นโฟลเดอร์ว่างที่ clone มาจาก GitHub) ต้องเพิ่มโฟลเดอร์ที่มีโค้ดจริงแทน:

1. เมนู **File** → **Add local repository**
2. กด **Choose...** แล้วเลือกโฟลเดอร์ที่มี **package.json** และโฟลเดอร์ **src** จริงๆ คือ:
   ```
   C:\Users\ST36\Desktop\SALEs REPORT - Clone
   ```
3. กด **Add repository**
4. ถ้าขึ้นว่า **"This directory does not appear to be a Git repository"**  
   → กด **create a repository** → Name: `sales-report` → **Create repository**
5. ทางซ้ายจะเห็นไฟล์เยอะ (changed files) → ช่อง **Summary** ใส่ `Initial commit - Sales Report` → กด **Commit to main**
6. เมนู **Repository** → **Push origin** หรือปุ่ม **Publish repository**  
   → Owner: **saocafe31-pixel**, Name: **sales-report** → Publish
7. เปิด https://github.com/saocafe31-pixel/sales-report ตรวจว่าเห็นโค้ดแล้ว ไป Deploy Vercel ต่อ

---

## วิธีที่ 2: ติดตั้ง Git แล้วใช้คำสั่งใน PowerShell

### 1. ติดตั้ง Git for Windows
- ไปที่ **https://git-scm.com/download/win**
- ดาวน์โหลดและติดตั้ง (ค่าเริ่มต้นได้หมด)
- ตอนติดตั้งมีตัวเลือก **"Add Git to PATH"** ให้เลือกใช้

### 2. ปิดแล้วเปิด PowerShell ใหม่
- หรือปิด Cursor แล้วเปิดใหม่ เพื่อให้รู้คำสั่ง `git`

### 3. ตรวจว่าใช้ได้
```powershell
git --version
```
ถ้าเห็นเลขเวอร์ชัน แปลว่าใช้ได้

### 4. รันคำสั่ง push ตามคู่มือ
```powershell
cd "c:\Users\ST36\Desktop\SALEs REPORT - Clone"
git init
git add .
git commit -m "Initial commit - Sales Report React app"
git branch -M main
git remote add origin https://github.com/saocafe31-pixel/sales-report.git
git push -u origin main
```

---

## สรุป
- **ไม่อยากติดตั้งอะไรเพิ่ม / อยากทำเร็ว:** ใช้ **วิธีที่ 1 (GitHub Desktop)**
- **อยากใช้คำสั่ง git ต่อๆ ไป:** ใช้ **วิธีที่ 2 (ติดตั้ง Git)**
