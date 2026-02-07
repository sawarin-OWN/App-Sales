/**
 * Supabase Storage — อัปโหลดรูปภาพสำหรับหน้าต่างๆ
 * Bucket: sales-receipts (ปิดยอด), expense-receipts (ค่าใช้จ่าย), deposit-slips (นำฝาก), tax-invoice-images (ใบกำกับภาษี)
 */
import { supabase } from './supabaseClient';

const BUCKET_SALES_RECEIPTS = 'sales-receipts';
const BUCKET_EXPENSE_RECEIPTS = 'expense-receipts';
const BUCKET_DEPOSIT_SLIPS = 'deposit-slips';
const BUCKET_TAX_INVOICES = 'tax-invoice-images';

/**
 * แปลง base64 เป็น Blob
 */
function base64ToBlob(base64, mimeType = 'image/jpeg') {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * อัปโหลดรูปสลิป/ใบสรุปยอดขายไปยัง Supabase Storage
 * @param {string} base64 - รูปภาพแบบ base64 (ไม่มี data URL prefix)
 * @param {string} fileName - ชื่อไฟล์ เช่น image.jpg
 * @param {string} branchCode - รหัสสาขา
 * @param {string} dateStr - วันที่ปิดยอด YYYY-MM-DD
 * @returns {Promise<string>} public URL ของรูป
 */
export async function uploadSalesReceipt(base64, fileName, branchCode, dateStr) {
  if (!base64) throw new Error('ไม่มีข้อมูลรูปภาพ');

  const safeBranch = (branchCode || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const ext = (fileName && fileName.includes('.')) ? fileName.split('.').pop() : 'jpg';
  const name = `${safeBranch}/${safeDate}_${Date.now()}.${ext}`;

  const blob = base64ToBlob(base64, 'image/jpeg');
  const { data, error } = await supabase.storage
    .from(BUCKET_SALES_RECEIPTS)
    .upload(name, blob, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (error) {
    console.error('[Supabase Storage] upload error:', error);
    throw new Error(error.message || 'อัปโหลดรูปไม่สำเร็จ');
  }

  const { data: urlData } = supabase.storage.from(BUCKET_SALES_RECEIPTS).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * ลบรูปจาก Storage (ใช้เมื่อผู้ใช้ลบรูปหรืออัปเดตเป็นรูปใหม่)
 * @param {string} publicUrl - URL เต็มจาก getPublicUrl
 * @returns {Promise<void>}
 */
export async function deleteSalesReceiptByUrl(publicUrl) {
  if (!publicUrl || !publicUrl.includes(BUCKET_SALES_RECEIPTS)) return;
  try {
    const path = publicUrl.split(`/object/public/${BUCKET_SALES_RECEIPTS}/`)[1];
    if (path) await supabase.storage.from(BUCKET_SALES_RECEIPTS).remove([path]);
  } catch (e) {
    console.warn('[Supabase Storage] delete error:', e);
  }
}

/** อัปโหลดรูปหลักฐานค่าใช้จ่าย (หน้าค่าใช้จ่าย) */
export async function uploadExpenseReceipt(base64, fileName, branchCode, dateStr) {
  return uploadToBucket(base64, fileName, branchCode, dateStr, BUCKET_EXPENSE_RECEIPTS);
}

/** อัปโหลดสลิปการฝาก (หน้านำฝาก) */
export async function uploadDepositSlip(base64, fileName, branchCode, dateStr) {
  return uploadToBucket(base64, fileName, branchCode, dateStr, BUCKET_DEPOSIT_SLIPS);
}

/** อัปโหลดรูปใบกำกับภาษี (หน้าใบกำกับภาษี) */
export async function uploadTaxInvoiceImage(base64, fileName, branchCode, dateStr) {
  return uploadToBucket(base64, fileName, branchCode, dateStr, BUCKET_TAX_INVOICES);
}

async function uploadToBucket(base64, fileName, branchCode, dateStr, bucketId) {
  if (!base64) throw new Error('ไม่มีข้อมูลรูปภาพ');
  const safeBranch = (branchCode || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const ext = (fileName && fileName.includes('.')) ? fileName.split('.').pop() : 'jpg';
  const name = `${safeBranch}/${safeDate}_${Date.now()}.${ext}`;
  const blob = base64ToBlob(base64, 'image/jpeg');
  const { data, error } = await supabase.storage.from(bucketId).upload(name, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) {
    console.error('[Supabase Storage] upload error:', error);
    throw new Error(error.message || 'อัปโหลดรูปไม่สำเร็จ');
  }
  const { data: urlData } = supabase.storage.from(bucketId).getPublicUrl(data.path);
  return urlData.publicUrl;
}
