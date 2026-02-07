# 🔍 คู่มือตรวจสอบและแก้ไขข้อมูลใน Sheets

## ⚠️ ปัญหาที่พบ

จากภาพที่ส่งมา พบว่าข้อมูล Total ใน Dashboard แสดงไม่ถูกต้อง:
- วันที่ 14 ม.ค.: แสดง Total = 10.00 แต่ควรเป็น 1,072.24 (2.00 + 6.00 + 1,064.24)
- วันที่ 15 ม.ค.: แสดง Total = 8.00 แต่ควรเป็น 513.46 (2.00 + 4.00 + 507.46)

## 🔧 สาเหตุ

1. **Backend อ่าน Total จาก Column L ใน Sheets** แทนการคำนวณใหม่
2. **Column L ใน Sheets อาจมีค่าผิดพลาด** จากข้อมูลเก่าหรือการบันทึกผิด

## ✅ วิธีแก้ไข

### 1. แก้ไข Backend (ทำแล้ว)

แก้ไข `backend/Code.js` ในฟังก์ชัน `getDashboardData`:
- เปลี่ยนจาก: `var total = parseFloat(salesData[i][11]) || (cash + transfer + ...)`
- เป็น: `var total = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;`

**ผลลัพธ์**: Dashboard จะคำนวณ Total ใหม่จากข้อมูลจริงเสมอ

### 2. แก้ไขข้อมูลใน Sheets (ถ้าต้องการ)

#### วิธีที่ 1: ใช้ Google Sheets Formula

1. เปิด Google Sheets
2. ไปที่ Sheet "Sales"
3. คลิกที่ Column L (Total)
4. เพิ่ม Formula ใน Cell L2:
   ```
   =C2+D2+E2+F2+G2+H2+I2+J2+K2+L2
   ```
   หรือ:
   ```
   =SUM(C2:K2)
   ```
5. Copy Formula ลงไปทุกแถว

#### วิธีที่ 2: ใช้ Google Apps Script

สร้างฟังก์ชันใหม่ใน Google Apps Script:

```javascript
function fixTotalColumn() {
  var ss = SpreadsheetApp.openById("YOUR_SHEET_ID");
  var sheet = ss.getSheetByName("Sales");
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  
  // เริ่มจากแถวที่ 2 (ข้าม header)
  for (var i = 1; i < data.length; i++) {
    var cash = parseFloat(data[i][2]) || 0;        // Column C
    var transfer = parseFloat(data[i][3]) || 0;    // Column D
    var grab = parseFloat(data[i][4]) || 0;         // Column E
    var lineman = parseFloat(data[i][5]) || 0;      // Column F
    var shopee = parseFloat(data[i][6]) || 0;      // Column G
    var robinhood = parseFloat(data[i][7]) || 0;    // Column H
    var creditCard = parseFloat(data[i][8]) || 0;  // Column I
    var halfHalf = parseFloat(data[i][9]) || 0;     // Column J
    var other = parseFloat(data[i][10]) || 0;      // Column K
    
    var total = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;
    
    // อัปเดต Column L (index 11)
    sheet.getRange(i + 1, 12).setValue(total);
  }
  
  Logger.log('Fixed Total column for ' + (data.length - 1) + ' rows');
}
```

**วิธีใช้งาน**:
1. เปิด Google Apps Script Editor
2. วางโค้ดข้างต้น
3. เปลี่ยน `YOUR_SHEET_ID` เป็น Sheet ID ของคุณ
4. คลิก Run > fixTotalColumn
5. Authorize permissions (ถ้ายังไม่ได้ authorize)

## 📊 ตรวจสอบข้อมูล

### ตรวจสอบใน Sheets

1. เปิด Google Sheets
2. ไปที่ Sheet "Sales"
3. ตรวจสอบว่า Column L (Total) ตรงกับผลรวมของ Columns C-K หรือไม่

### ตรวจสอบใน Dashboard

1. เปิด Dashboard
2. ตรวจสอบว่า Total ในตารางตรงกับผลรวมของ:
   - เงินสด + โอน + Credit Card + Delivery
3. ตรวจสอบว่า "ยอดขายรวม" ตรงกับผลรวมของ Total ทั้งหมด

## 🔍 สูตรการคำนวณ

### Total Sales (ยอดขายรวม)
```
Total = Cash + Transfer + Grab + Lineman + Shopee + Robinhood + Credit Card + HalfHalf + Other
```

### Delivery (รวม)
```
Delivery = Grab + Lineman + Shopee + Robinhood
```

## ⚠️ หมายเหตุ

- **Backend แก้ไขแล้ว**: Dashboard จะคำนวณ Total ใหม่เสมอ ไม่ใช้ค่าจาก Column L
- **Column L ใน Sheets**: ยังคงมีค่าเดิม (อาจผิดพลาด) แต่ Dashboard จะไม่ใช้ค่าเหล่านั้นแล้ว
- **ถ้าต้องการแก้ไข Column L**: ใช้วิธีที่ 1 หรือ 2 ข้างต้น

## 🚀 Deploy

หลังจากแก้ไข Backend แล้ว:
1. Deploy Google Apps Script ใหม่
2. Refresh Dashboard
3. ตรวจสอบว่าข้อมูลแสดงถูกต้อง
