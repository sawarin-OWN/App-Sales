
# แก้ไขปัญหา PWA ไม่แสดงเต็มจอ (Address Bar ยังแสดงอยู่)

## ปัญหา
หลังจาก Add to Home Screen แล้ว ยังมี address bar แสดงอยู่

## วิธีแก้ไข

### 1. ลบแอปเก่าออกจากหน้าแรก
- กดค้างที่ไอคอนแอปบนหน้าแรก
- เลือก "ลบแอป" หรือ "Remove App"
- ยืนยันการลบ

### 2. Clear Cache และ Cookies
**iOS Safari:**
- ไปที่ Settings → Safari
- เลือก "Clear History and Website Data"
- ยืนยันการลบ

**Android Chrome:**
- ไปที่ Settings → Apps → Chrome
- เลือก "Storage" → "Clear Cache"
- เลือก "Clear Data"

### 3. เพิ่มแอปใหม่
- เปิดเว็บไซต์ใน browser
- แตะปุ่ม "แชร์" (Share)
- เลือก "เพิ่มไปหน้าแรก" หรือ "Add to Home Screen"
- ยืนยันการเพิ่ม

### 4. เปิดแอปจากหน้าแรก
- แตะไอคอนแอปบนหน้าแรก
- แอปจะเปิดในโหมดเต็มจอ (ไม่มี address bar)

## ตรวจสอบว่า PWA ทำงานถูกต้อง

### วิธีตรวจสอบ:
1. เปิดแอปจากหน้าแรก
2. ตรวจสอบว่าไม่มี address bar
3. ตรวจสอบว่าไม่มี browser navigation bar
4. ตรวจสอบว่าแสดงเต็มจอ

### ถ้ายังไม่ได้:
1. ตรวจสอบว่า manifest.json ถูกต้อง
2. ตรวจสอบว่า service-worker.js ทำงาน
3. ลบแอปและเพิ่มใหม่
4. Clear cache และ cookies
5. Restart device

## หมายเหตุ
- iOS Safari อาจต้อง restart device หลังจากเพิ่มแอป
- Android Chrome อาจต้องรอสักครู่ก่อนเปิดแอป
- ถ้ายังไม่ได้ ให้ลองใช้ browser อื่น (Firefox, Edge)

