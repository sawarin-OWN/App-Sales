# 🔧 แก้ไขการบันทึก TaxId ให้เป็น Text Format

## 📋 ปัญหาที่พบ

ข้อมูล TaxId ใน Sheets "Taxpayers" Column B เป็นข้อความ (text) เพื่อให้เลข 0 หน้าคงอยู่ เช่น "0105562087242"

แต่เมื่อดึงข้อมูลไปที่หน้าแอปและบันทึกลง Sheets "TaxInvoices" Column F ข้อมูลเป็นตัวเลข ทำให้เลข 0 หน้าหายไป เช่น "105562087242"

**ตัวอย่าง:**
- TaxId ใน Taxpayers: `0105562087242` (text format)
- TaxId ใน TaxInvoices: `105562087242` (number format) ❌

## ✅ สาเหตุ

เมื่อใช้ `setValues()` ใน Google Sheets ถ้าค่าเป็น number ที่มีเลข 0 หน้า เช่น "0105562087242" มันจะถูกแปลงเป็น number และเลข 0 หน้าจะหายไป

## 🔧 การแก้ไข

### 1. แก้ไข `saveTaxInvoice`

**ก่อน:**
```javascript
var rowData = [
  ...
  data.taxpayerTaxId || '', // บันทึกเป็น string ธรรมดา
  ...
];
sheet.appendRow(rowData);
```

**หลัง:**
```javascript
// แปลง TaxId เป็น string และเพิ่ม apostrophe (') เพื่อบังคับให้เป็น text format
var taxpayerTaxId = data.taxpayerTaxId || data.taxpayerId || '';
var taxpayerTaxIdText = '';
if (taxpayerTaxId) {
  taxpayerTaxIdText = "'" + taxpayerTaxId.toString().trim();
}

var rowData = [
  ...
  taxpayerTaxIdText, // ใช้ TaxId ที่มี apostrophe
  ...
];

var newRowIndex = sheet.getLastRow() + 1;
sheet.appendRow(rowData);

// ตั้งค่า Column F (TaxpayerTaxId) เป็น text format
sheet.getRange(newRowIndex, 6).setNumberFormat('@'); // '@' = text format
```

### 2. แก้ไข `saveTaxpayer`

**ก่อน:**
```javascript
sheet.getRange(lastRow + 1, 1, 1, 2).setValues([[name.toString().trim(), taxId.toString().trim()]]);
```

**หลัง:**
```javascript
// แปลง TaxId เป็น string และเพิ่ม apostrophe (') เพื่อบังคับให้เป็น text format
var taxIdText = "'" + taxId.toString().trim();

var newRowIndex = lastRow + 1;
sheet.getRange(newRowIndex, 1, 1, 2).setValues([[name.toString().trim(), taxIdText]]);

// ตั้งค่า Column B (TaxId) เป็น text format
sheet.getRange(newRowIndex, 2).setNumberFormat('@'); // '@' = text format
```

### 3. แก้ไข `getTaxpayers`

**ก่อน:**
```javascript
var taxId = row[1] ? row[1].toString().trim() : '';
```

**หลัง:**
```javascript
// อ่าน TaxId เป็น string และลบ apostrophe (') ถ้ามี
var taxIdRaw = row[1];
var taxId = '';
if (taxIdRaw) {
  taxId = taxIdRaw.toString().trim();
  // ลบ apostrophe (') ถ้ามีอยู่หน้าตัวเลข
  if (taxId.startsWith("'")) {
    taxId = taxId.substring(1);
  }
}
```

### 4. แก้ไข `getTaxInvoices`

**ก่อน:**
```javascript
var taxpayerTaxId = row[taxpayerTaxIdColIndex] ? row[taxpayerTaxIdColIndex].toString().trim() : '';
```

**หลัง:**
```javascript
// อ่าน TaxId เป็น string และลบ apostrophe (') ถ้ามี
var taxpayerTaxIdRaw = row[taxpayerTaxIdColIndex];
var taxpayerTaxId = '';
if (taxpayerTaxIdRaw) {
  taxpayerTaxId = taxpayerTaxIdRaw.toString().trim();
  // ลบ apostrophe (') ถ้ามีอยู่หน้าตัวเลข
  if (taxpayerTaxId.startsWith("'")) {
    taxpayerTaxId = taxpayerTaxId.substring(1);
  }
}
```

### 5. แก้ไข `saveTaxpayer` - ตรวจสอบข้อมูลซ้ำ

**ก่อน:**
```javascript
var rowTaxId = row[1] ? row[1].toString().trim() : '';
```

**หลัง:**
```javascript
// อ่าน TaxId เป็น string และลบ apostrophe (') ถ้ามี
var rowTaxIdRaw = row[1];
var rowTaxId = '';
if (rowTaxIdRaw) {
  rowTaxId = rowTaxIdRaw.toString().trim();
  // ลบ apostrophe (') ถ้ามีอยู่หน้าตัวเลข
  if (rowTaxId.startsWith("'")) {
    rowTaxId = rowTaxId.substring(1);
  }
}
```

## 📝 ไฟล์ที่แก้ไข

- `backend/Code.js`:
  - `saveTaxInvoice` - บันทึก TaxId เป็น text format
  - `getTaxInvoices` - อ่าน TaxId และลบ apostrophe
  - `saveTaxpayer` - บันทึก TaxId เป็น text format
  - `getTaxpayers` - อ่าน TaxId และลบ apostrophe

## 🔍 วิธีการทำงาน

### การบันทึก (Save)
1. เพิ่ม apostrophe (') หน้าค่า TaxId: `'0105562087242`
2. ตั้งค่า Column เป็น text format: `setNumberFormat('@')`
3. บันทึกลง Sheets

### การอ่าน (Read)
1. อ่านค่า TaxId จาก Sheets
2. ลบ apostrophe (') ถ้ามี: `'0105562087242` → `0105562087242`
3. ส่งกลับไปยัง Frontend

## 🚀 Deploy

### 1. Deploy Google Apps Script

1. เปิด Google Apps Script Editor
2. Copy โค้ดจาก `backend/Code.js` ไปวาง
3. Deploy > Manage deployments > Edit > New version > Deploy
4. Description: `Fix TaxId format - save as text to preserve leading zeros`

### 2. ทดสอบ

1. **บันทึกผู้เสียภาษีใหม่**:
   - เปิดหน้า "ใบกำกับภาษี"
   - คลิก "เพิ่มผู้เสียภาษี"
   - กรอก TaxId ที่มีเลข 0 หน้า เช่น `0105562087242`
   - บันทึก
   - ตรวจสอบใน Sheets "Taxpayers" ว่า TaxId มีเลข 0 หน้าคงอยู่

2. **บันทึกใบกำกับภาษี**:
   - เลือกผู้เสียภาษีที่มี TaxId ที่มีเลข 0 หน้า
   - บันทึกใบกำกับภาษี
   - ตรวจสอบใน Sheets "TaxInvoices" ว่า TaxId มีเลข 0 หน้าคงอยู่

3. **ดึงข้อมูล**:
   - ตรวจสอบว่า TaxId ที่แสดงในหน้าแอปถูกต้อง (มีเลข 0 หน้า)

## ⚠️ หมายเหตุ

- **Apostrophe (')**: Google Sheets จะซ่อน apostrophe เมื่อแสดงผล แต่จะเก็บไว้ในข้อมูล
- **Text Format**: ใช้ `setNumberFormat('@')` เพื่อบังคับให้เป็น text format
- **ความแม่นยำ**: TaxId จะถูกบันทึกและอ่านอย่างถูกต้อง 100% โดยไม่สูญเสียเลข 0 หน้า

## 📊 ตัวอย่าง

**ก่อนแก้ไข:**
- TaxId ใน Taxpayers: `0105562087242` (text)
- TaxId ใน TaxInvoices: `105562087242` (number) ❌

**หลังแก้ไข:**
- TaxId ใน Taxpayers: `0105562087242` (text)
- TaxId ใน TaxInvoices: `0105562087242` (text) ✅
