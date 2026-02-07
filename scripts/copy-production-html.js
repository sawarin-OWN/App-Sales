/**
 * Script สำหรับ copy ไฟล์ index.production.html ไปยัง index.html
 * ใช้ก่อน build เพื่อให้ production build ใช้ HTML version ที่ optimized
 */

const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../public/index.production.html');
const dest = path.join(__dirname, '../public/index.html');
const backup = path.join(__dirname, '../public/index.original.html');

try {
  // Backup ไฟล์เดิม (ถ้ายังไม่มี backup)
  if (!fs.existsSync(backup) && fs.existsSync(dest)) {
    fs.copyFileSync(dest, backup);
    console.log('✅ Backup created: index.original.html');
  }
  
  // Copy production HTML
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log('✅ Production HTML copied successfully!');
    console.log('   Source: index.production.html');
    console.log('   Destination: index.html');
  } else {
    console.warn('⚠️  Warning: index.production.html not found!');
    console.warn('   Using default index.html instead.');
  }
} catch (error) {
  console.error('❌ Error copying production HTML:', error.message);
  process.exit(1);
}
