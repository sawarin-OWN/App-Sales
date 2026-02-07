# 📱 คู่มือ Deploy Production HTML สำหรับ Vercel

## 🎯 วัตถุประสงค์

ไฟล์ `index.production.html` นี้ถูกออกแบบมาเพื่อ:
- ✅ แสดงผลเต็มจอบนมือถือ (Fullscreen PWA)
- ✅ ป้องกันการเลื่อนหน้าจอเมื่อเปิดคีย์บอร์ด
- ✅ มี Splash Screen สวยงาม
- ✅ รักษาฟังก์ชันการใช้งานทั้งหมดของ React App

## 📋 ขั้นตอนการ Deploy

### วิธีที่ 1: ใช้ไฟล์ Production โดยตรง (แนะนำ)

1. **Backup ไฟล์เดิม:**
   ```bash
   cp public/index.html public/index.original.html
   ```

2. **แทนที่ด้วย Production Version:**
   ```bash
   cp public/index.production.html public/index.html
   ```

3. **Deploy ไปยัง Vercel:**
   ```bash
   git add public/index.html
   git commit -m "Update to production HTML for fullscreen mobile"
   git push
   ```

### วิธีที่ 2: ใช้ Build Script (อัตโนมัติ) ⭐ **แนะนำ**

**✅ วิธีนี้ถูกตั้งค่าให้แล้ว!** เพียงแค่รัน build ตามปกติ

**ข้อดี:**
- ✅ อัตโนมัติ - ไม่ต้องจำขั้นตอน
- ✅ ปลอดภัย - backup ไฟล์เดิมอัตโนมัติ
- ✅ ใช้งานง่าย - แค่ `npm run build` ตามปกติ
- ✅ ไม่กระทบ development - ใช้ไฟล์เดิมตอน `npm start`

**วิธีใช้งาน:**
```bash
# Build ตามปกติ - จะใช้ production HTML อัตโนมัติ
npm run build

# หรือ deploy ไป Vercel - จะ build อัตโนมัติ
git add .
git commit -m "Deploy with production HTML"
git push
```

**การทำงาน:**
- เมื่อรัน `npm run build` → จะรัน `prebuild` script ก่อน
- `prebuild` จะ copy `index.production.html` → `index.html` อัตโนมัติ
- จากนั้น build ตามปกติ
- ไฟล์ `index.original.html` จะถูก backup อัตโนมัติ (ครั้งแรกเท่านั้น)

### วิธีที่ 3: ใช้ Vercel Build Command

ใน Vercel Dashboard → Settings → Build & Development Settings:

**Build Command:**
```bash
cp public/index.production.html public/index.html && npm run build
```

## 🔍 ตรวจสอบการทำงาน

### 1. ตรวจสอบ Local
```bash
npm run build
npm install -g serve
serve -s build
```

### 2. ตรวจสอบบน Mobile
- เปิดจาก Safari/Chrome
- เพิ่มไปหน้าแรก (Add to Home Screen)
- เปิดจาก Home Screen
- ตรวจสอบว่า:
  - ✅ ไม่มี Address Bar
  - ✅ หน้าจอเต็มจอ
  - ✅ เมื่อกด input ไม่เลื่อนหน้าจอ

## 🎨 คุณสมบัติของ Production HTML

### 1. **Fullscreen PWA**
- `position: fixed` บน `html`, `body`, `#root`
- `height: 100dvh` (Dynamic Viewport Height)
- `overflow: hidden` บน `html` และ `body`
- `overflow-y: auto` บน `#root` เท่านั้น

### 2. **Keyboard Scroll Prevention**
- ใช้ Visual Viewport API
- Lock scroll position เมื่อคีย์บอร์ดเปิด
- Unlock เมื่อคีย์บอร์ดปิด
- ป้องกัน touch scroll เมื่อ locked

### 3. **Splash Screen**
- Gradient background สีเขียว (emerald)
- Logo animation (ping + pulse)
- Loading dots animation
- Auto-hide เมื่อ React โหลดเสร็จ

### 4. **PWA Meta Tags**
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `viewport-fit=cover` สำหรับ notch support
- `minimal-ui` สำหรับ minimal browser UI

## ⚠️ ข้อควรระวัง

1. **React App Structure:**
   - ต้องมี `<div id="root"></div>` สำหรับ React
   - ต้องมี script tags สำหรับ React bundle (จะถูก inject โดย build process)

2. **Service Worker:**
   - ต้องมีไฟล์ `public/service-worker.js`
   - ต้องมี `vercel.json` สำหรับ MIME type

3. **Manifest:**
   - ต้องมีไฟล์ `public/manifest.json`
   - ต้องมี icon URLs ที่ถูกต้อง

4. **iOS Cache:**
   - iOS Safari cache PWA settings อย่างเข้มงวด
   - ต้องลบ PWA เก่าและเพิ่มใหม่ทุกครั้งที่อัปเดต

## 🔄 Rollback

ถ้าต้องการกลับไปใช้ไฟล์เดิม:

```bash
cp public/index.original.html public/index.html
git add public/index.html
git commit -m "Revert to original HTML"
git push
```

## 📝 Notes

- ไฟล์นี้ใช้ `!important` อย่างเข้มงวดเพื่อ override styles อื่นๆ
- ใช้ Visual Viewport API สำหรับ modern browsers
- มี fallback สำหรับ older browsers
- Optimized สำหรับ mobile devices โดยเฉพาะ

## 🐛 Troubleshooting

### ปัญหา: หน้าจอยังเลื่อนเมื่อเปิดคีย์บอร์ด
**แก้ไข:**
- ตรวจสอบว่า Visual Viewport API ทำงานหรือไม่
- ตรวจสอบ console สำหรับ errors
- ลอง clear cache และ reload

### ปัญหา: Address bar ยังแสดง
**แก้ไข:**
- ตรวจสอบว่าเปิดจาก Home Screen (PWA mode) ไม่ใช่ Safari
- ลบ PWA เก่าและเพิ่มใหม่
- Clear Safari cache

### ปัญหา: React App ไม่แสดง
**แก้ไข:**
- ตรวจสอบว่า `<div id="root"></div>` ยังอยู่
- ตรวจสอบว่า React bundle ถูก load
- ตรวจสอบ console สำหรับ errors

