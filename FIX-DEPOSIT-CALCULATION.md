# 🔧 แก้ไขการคำนวณยอดเงินค้างฝากสะสม

## 📋 ปัญหาที่พบ

การคำนวณยอดเงินค้างฝากสะสมในหน้านำฝากผิดพลาด

**ตัวอย่าง:**
- สาขา RS003
- ยอดขายเงินสด 05/01/2569-16/01/2569 = 8,434 บาท
- ค่าใช้จ่ายที่เบิกเงินสด 05/01/2569-16/01/2569 = 3,627 บาท
- ไม่มีประวัตินำฝาก

**คำนวณตามสูตร:**
```
รวมยอดนำฝากทุกวัน (เงินสด - ค่าใช้จ่าย) - ยอดฝากแล้ว
= 8,434 - 3,627 - 0
= 4,807 บาท
```

**แต่แสดงผล:** -72 บาท ❌

## ✅ สาเหตุ

1. **ใช้ `getDisplayValues()` แทน `getValues()`**
   - `getDisplayValues()` จะได้ค่าที่ format แล้ว (string) เช่น "8,434.00"
   - เมื่อใช้ `parseFloat()` อาจได้ค่าผิดพลาด

2. **การแปลงวันที่ไม่ถูกต้อง**
   - วันที่จาก Sheets อาจเป็น Date object หรือ string
   - ต้องแปลงให้เป็น YYYY-MM-DD format เสมอ

## 🔧 การแก้ไข

### 1. เปลี่ยนจาก `getDisplayValues()` เป็น `getValues()`

**ก่อน:**
```javascript
var salesData = salesSheet.getDataRange().getDisplayValues();
var expenseData = expenseSheet.getDataRange().getDisplayValues();
var depositData = depositSheet.getDataRange().getDisplayValues();
```

**หลัง:**
```javascript
var salesData = salesSheet.getDataRange().getValues();
var expenseData = expenseSheet.getDataRange().getValues();
var depositData = depositSheet.getDataRange().getValues();
```

### 2. แก้ไขการอ่านค่าตัวเลข

**ก่อน:**
```javascript
var cash = parseFloat(salesData[i][cashColIndex]) || 0;
var expenseAmount = parseFloatSafe(expenseData[i][expenseAmountColIndex]) || 0;
```

**หลัง:**
```javascript
var cash = typeof salesData[i][cashColIndex] === 'number' 
  ? salesData[i][cashColIndex] 
  : (parseFloat(salesData[i][cashColIndex]) || 0);

var expenseAmount = typeof expenseData[i][expenseAmountColIndex] === 'number' 
  ? expenseData[i][expenseAmountColIndex] 
  : (parseFloat(expenseData[i][expenseAmountColIndex]) || 0);
```

### 3. แก้ไขการแปลงวันที่

**ก่อน:**
```javascript
var salesDate = salesData[i][dateColIndex];
var normalizedSalesDate = normalizeDate(salesDate);
```

**หลัง:**
```javascript
var salesDateValue = salesData[i][dateColIndex];
var salesDate = '';

if (salesDateValue instanceof Date) {
  var year = salesDateValue.getFullYear();
  var month = String(salesDateValue.getMonth() + 1).padStart(2, '0');
  var day = String(salesDateValue.getDate()).padStart(2, '0');
  salesDate = year + '-' + month + '-' + day;
} else if (typeof salesDateValue === 'string') {
  salesDate = normalizeDate(salesDateValue);
} else {
  continue; // ข้ามแถวที่ไม่มีวันที่
}

var normalizedSalesDate = normalizeDate(salesDate);
```

### 4. เพิ่ม Console Log สำหรับ Debug

```javascript
console.log('[GAS] getDepositInfo - Daily calculation:', {
  date: normalizedSalesDate,
  cash: cash,
  expenses: dayExpenses,
  dailyDeposit: dailyDeposit
});
```

## 📝 ไฟล์ที่แก้ไข

- `backend/Code.js` - ฟังก์ชัน `getDepositInfo`:
  - เปลี่ยนจาก `getDisplayValues()` เป็น `getValues()`
  - แก้ไขการอ่านค่าตัวเลข
  - แก้ไขการแปลงวันที่
  - เพิ่ม console.log สำหรับ debug

## 🚀 Deploy

### 1. Deploy Google Apps Script

1. เปิด Google Apps Script Editor
2. Copy โค้ดจาก `backend/Code.js` ไปวาง
3. Deploy > Manage deployments > Edit > New version > Deploy
4. Description: `Fix deposit calculation - use getValues() instead of getDisplayValues()`

### 2. ทดสอบ

1. เปิดหน้า "นำฝาก": https://sales-report-theta.vercel.app/deposits
2. Refresh หน้าเว็บ (Ctrl+F5)
3. ตรวจสอบ:
   - ยอดเงินค้างฝากสะสมถูกต้อง
   - ตรงกับสูตร: รวมยอดนำฝากทุกวัน (เงินสด - ค่าใช้จ่าย) - ยอดฝากแล้ว

## 📊 สูตรการคำนวณ

```
ยอดนำฝากแต่ละวัน = เงินสด - ค่าใช้จ่าย (ของวันนั้น)
ยอดนำฝากสะสม = รวมยอดนำฝากทุกวัน - ยอดฝากแล้ว
```

**ตัวอย่าง:**
- วันที่ 05/01/2569: เงินสด 500, ค่าใช้จ่าย 100 → ยอดนำฝาก = 400
- วันที่ 06/01/2569: เงินสด 600, ค่าใช้จ่าย 150 → ยอดนำฝาก = 450
- รวมยอดนำฝากทุกวัน = 400 + 450 = 850
- ยอดฝากแล้ว = 0
- **ยอดเงินค้างฝากสะสม = 850 - 0 = 850** ✅

## ⚠️ หมายเหตุ

- ต้อง Deploy Google Apps Script ใหม่เพื่อให้การแก้ไขมีผล
- Refresh หน้าเว็บเพื่อล้าง cache
- ตรวจสอบ Console (F12) เพื่อดู log การคำนวณแต่ละวัน
