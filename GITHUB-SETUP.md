# วิธีเชื่อมโปรเจกต์นี้กับ GitHub

คู่มือนี้ใช้ได้ทั้งกรณี **ยังไม่มี Repo บน GitHub** และกรณี **มี Repo อยู่แล้ว** ต้องการเชื่อมโฟลเดอร์โปรเจกต์กับ Repo นั้น

---

## สิ่งที่ต้องมีก่อน

| รายการ | หมายเหตุ |
|--------|----------|
| **Git** | ติดตั้งแล้ว ([ดาวน์โหลด](https://git-scm.com/download/win)) |
| **บัญชี GitHub** | สมัครที่ [github.com](https://github.com) |

ตรวจสอบว่าใช้ Git ได้:

```bash
git --version
```

---

## กรณีที่ 1: ยังไม่มี Repo บน GitHub (สร้างใหม่)

### ขั้นที่ 1: สร้าง Repo ใหม่บน GitHub

1. Login ที่ [github.com](https://github.com)
2. คลิก **"+"** มุมขวาบน → **"New repository"**
3. ตั้งค่า:
   - **Repository name:** เช่น `sales-report` (หรือชื่ออื่น)
   - **Description:** (ไม่บังคับ) เช่น "KebYod App - React + Supabase"
   - **Public** หรือ **Private** ตามต้องการ
   - **ไม่ต้อง** ติ๊ก "Add a README" หรือ ".gitignore" (เพราะในโฟลเดอร์มีอยู่แล้ว)
4. คลิก **"Create repository"**
5. **Copy URL ของ Repo** (เช่น `https://github.com/username/sales-report.git`) ไว้ใช้ขั้นต่อไป

### ขั้นที่ 2: เปิดโฟลเดอร์โปรเจกต์ใน Terminal

เปิด **PowerShell** หรือ **Command Prompt** แล้วไปที่โฟลเดอร์โปรเจกต์:

```powershell
cd "C:\Users\ST36\Desktop\SALEs REPORT - Clone"
```

(แก้ path ให้ตรงกับที่เก็บโปรเจกต์ของคุณ)

### ขั้นที่ 3: ตรวจสอบว่าเป็น Git repo หรือยัง

รัน:

```bash
git status
```

- ถ้า **ขึ้น error** แบบ "not a git repository" → ต้อง **init** ก่อน (ขั้นที่ 4)
- ถ้า **ขึ้นรายการไฟล์ / branch** → โปรเจกต์เป็น Git repo อยู่แล้ว ไปขั้นที่ 5 ได้

### ขั้นที่ 4: สร้าง Git repo ในโฟลเดอร์ (ถ้ายังไม่มี)

รันทีละคำสั่ง:

```bash
git init
git add .
git commit -m "Initial commit - KebYod App"
git branch -M main
```

- `git add .` จะ add ตาม `.gitignore` (ไม่รวม `node_modules`, `.env` ฯลฯ)
- ถ้ามีโฟลเดอร์ที่มี `.git` ข้างใน (nested repo) และ error ตอน add ให้เพิ่มชื่อโฟลเดอร์นั้นใน `.gitignore` แล้วรัน `git add .` อีกครั้ง

### ขั้นที่ 5: เชื่อมกับ Repo บน GitHub

แทนที่ `https://github.com/USERNAME/REPO.git` ด้วย URL จริงที่ copy ไว้:

```bash
git remote add origin https://github.com/USERNAME/REPO.git
```

ตัวอย่าง:

```bash
git remote add origin https://github.com/saocafe31-pixel/sales-report.git
```

ถ้าขึ้นว่า **"remote origin already exists"** แปลว่าโปรเจกต์เชื่อมกับ GitHub อยู่แล้ว ไม่ต้อง add ซ้ำ  
- ดู URL ที่ใช้อยู่: `git remote -v`  
- ถ้าต้องการ**เปลี่ยนไปใช้ Repo อื่น** ค่อยรัน: `git remote set-url origin https://github.com/USERNAME/REPO.git`  
- ถ้า URL ถูกต้องแล้ว แค่ **push** ได้เลย: `git push -u origin main`

### ขั้นที่ 6: Push ขึ้น GitHub ครั้งแรก

```bash
git push -u origin main
```

- ถ้า Repo สร้างใหม่และยังไม่มี commit บน GitHub คำสั่งนี้จะส่ง branch `main` ขึ้นไป
- ถ้า GitHub ขอ Login ให้ใส่ **Username** และ **Password** — สำหรับ Password ต้องใช้ **Personal Access Token** (ไม่ใช้รหัสผ่านเข้าเว็บ) สร้างได้ที่ GitHub → Settings → Developer settings → Personal access tokens

เมื่อ push สำเร็จ โปรเจกต์จะเชื่อมกับ GitHub แล้ว เปิด Repo ที่ github.com จะเห็นโค้ดครบ

---

## กรณีที่ 2: มี Repo บน GitHub อยู่แล้ว (แค่เชื่อมโฟลเดอร์)

ใช้เมื่อคุณสร้าง Repo ไว้แล้ว หรือได้ Repo จากคนอื่น และต้องการให้โฟลเดอร์นี้ชี้ไปที่ Repo นั้น

### ขั้นที่ 1: ได้ URL ของ Repo

จากหน้า Repo บน GitHub คลิกปุ่ม **"Code"** แล้ว copy URL (เช่น `https://github.com/username/sales-report.git`)

### ขั้นที่ 2: ไปที่โฟลเดอร์โปรเจกต์

```powershell
cd "C:\Users\ST36\Desktop\SALEs REPORT - Clone"
```

### ขั้นที่ 3: ตรวจสอบ Git และ remote

```bash
git status
git remote -v
```

- ถ้า **ยังไม่ใช่ git repo** → รัน `git init` แล้ว `git add .` และ `git commit -m "Initial commit"` และ `git branch -M main` ก่อน
- ถ้า **มี remote อยู่แล้ว** แต่จะเปลี่ยนไปใช้ Repo อื่น:
  ```bash
  git remote set-url origin https://github.com/USERNAME/REPO.git
  ```
- ถ้า **ยังไม่มี remote**:
  ```bash
  git remote add origin https://github.com/USERNAME/REPO.git
  ```

### ขั้นที่ 4: Push ขึ้น Repo นั้น

ถ้า Repo มี commit อยู่แล้ว (เช่นมี README จาก GitHub) อาจต้องดึงมาก่อนแล้วค่อย push:

```bash
git pull origin main --allow-unrelated-histories
```

จากนั้น:

```bash
git push -u origin main
```

ถ้า Repo ว่างเปล่า (ไม่มี commit) ให้ push ตรงๆ:

```bash
git push -u origin main
```

---

## คำสั่งที่ใช้บ่อยหลังเชื่อมแล้ว

| งาน | คำสั่ง |
|-----|--------|
| ดูสถานะไฟล์ | `git status` |
| ดู remote | `git remote -v` |
| ส่งโค้ดขึ้น GitHub | `git add .` → `git commit -m "ข้อความ"` → `git push` |
| ดึงโค้ดล่าสุดจาก GitHub | `git pull` |
| เปลี่ยน URL ของ origin | `git remote set-url origin https://github.com/USER/REPO.git` |

---

## การ Login / Token (เมื่อ Git ขอรหัส)

เมื่อ `git push` หรือ `git pull` แล้ว Git ขอ Username/Password:

- **Username:** ชื่อผู้ใช้ GitHub ของคุณ
- **Password:** **ไม่ใช้รหัสผ่านเข้าเว็บ** ต้องใช้ **Personal Access Token (PAT)**

สร้าง Token:

1. GitHub → **Settings** (ของบัญชี) → **Developer settings** → **Personal access tokens**
2. เลือก **Tokens (classic)** → **Generate new token**
3. ตั้งชื่อ (เช่น "Cursor PC") เลือกสิทธิ์อย่างน้อย **repo**
4. Generate แล้ว **copy เก็บไว้** (จะดูอีกครั้งไม่ได้)
5. ตอน Git ขอ Password ให้วาง Token นี้

---

## ทางเลือก: ใช้ GitHub Desktop

ถ้าไม่อยากใช้คำสั่งใน Terminal:

1. ติดตั้ง [GitHub Desktop](https://desktop.github.com/)
2. เปิดโปรแกรม → **File** → **Add local repository** → เลือกโฟลเดอร์โปรเจกต์
3. ถ้าโฟลเดอร์ยังไม่ใช่ Git repo โปรแกรมจะถามให้ **create a repository** ได้
4. ใช้เมนู **Publish repository** หรือ **Push origin** เพื่อส่งโค้ดขึ้น GitHub
5. สามารถตั้งค่า remote และจัดการ branch ผ่านเมนู **Repository** → **Repository settings**

---

## สรุป Checklist

- [ ] ติดตั้ง Git และมีบัญชี GitHub
- [ ] สร้าง Repo บน GitHub (หรือมี Repo อยู่แล้ว)
- [ ] ในโฟลเดอร์โปรเจกต์: `git init` (ถ้ายังไม่มี), `git add .`, `git commit`, `git branch -M main`
- [ ] เชื่อม remote: `git remote add origin https://github.com/USER/REPO.git`
- [ ] Push ครั้งแรก: `git push -u origin main`
- [ ] (ถ้า Git ขอรหัส) ใช้ Personal Access Token แทนรหัสผ่าน

---

โปรเจกต์นี้มี `.gitignore` ตั้งไว้แล้ว จึงจะไม่ส่ง `node_modules`, `.env`, โฟลเดอร์ `build` ขึ้น GitHub โดยอัตโนมัติ
