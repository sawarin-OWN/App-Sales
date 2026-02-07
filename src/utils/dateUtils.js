/**
 * Utility functions for date formatting and normalization
 * เพื่อแก้ปัญหา date format และ timezone ที่ไม่ตรงกัน
 */

/**
 * Normalize date to YYYY-MM-DD format (UTC date, no time)
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Date in YYYY-MM-DD format
 */
export function normalizeDate(dateInput) {
  if (!dateInput) return '';
  
  // ถ้าเป็น string ที่เป็น YYYY-MM-DD อยู่แล้ว
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  
  // ถ้าเป็น string format อื่น (เช่น MM/DD/YYYY, DD/MM/YYYY)
  if (typeof dateInput === 'string') {
    // ลอง parse เป็น Date
    const dateObj = new Date(dateInput);
    if (!isNaN(dateObj.getTime())) {
      // ใช้ UTC date เพื่อหลีกเลี่ยง timezone issues
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // ถ้า parse ไม่ได้ ลอง parse format MM/DD/YYYY หรือ DD/MM/YYYY
    const parts = dateInput.trim().split(/[-/]/);
    if (parts.length === 3) {
      let year, month, day;
      
      // ถ้า part แรกมี 4 หลัก = YYYY-MM-DD หรือ YYYY/MM/DD
      if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      } 
      // ถ้า part สุดท้ายมี 4 หลัก = MM/DD/YYYY หรือ DD/MM/YYYY
      else if (parts[2].length === 4) {
        year = parts[2];
        // ถ้า month > 12 = DD/MM/YYYY, ไม่งั้น = MM/DD/YYYY
        if (parseInt(parts[0]) > 12) {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
        } else {
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
        }
      } else {
        return dateInput; // ไม่สามารถ parse ได้
      }
      
      return `${year}-${month}-${day}`;
    }
  }
  
  // ถ้าเป็น Date object
  if (dateInput instanceof Date) {
    if (!isNaN(dateInput.getTime())) {
      // ใช้ UTC date เพื่อหลีกเลี่ยง timezone issues
      const year = dateInput.getUTCFullYear();
      const month = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  return '';
}

/**
 * Get today's date in YYYY-MM-DD format (local date, not UTC)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the 1st day of the current month in YYYY-MM-DD format (local date)
 * ใช้เป็นค่า default วันที่เริ่มต้นของฟิลเตอร์
 * @returns {string} First day of current month in YYYY-MM-DD format
 */
export function getFirstDayOfCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Format date for display as dd/mm/yyyy (ใช้ทั่วทั้งแอป)
 * @param {string|Date} dateInput - Date in YYYY-MM-DD string or Date object
 * @returns {string} Formatted date string (dd/mm/yyyy)
 */
export function formatDateForDisplay(dateInput) {
  if (dateInput == null) return '';
  let yyyyMmDd = '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    yyyyMmDd = `${y}-${m}-${d}`;
  } else {
    yyyyMmDd = normalizeDate(dateInput);
  }
  if (!yyyyMmDd) return typeof dateInput === 'string' ? dateInput : '';
  const parts = yyyyMmDd.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return yyyyMmDd;
}

/**
 * Parse string รูปแบบ dd/mm/yyyy เป็น YYYY-MM-DD (สำหรับช่องกรอกวันที่ที่แสดงเป็น dd/mm/yyyy)
 * @param {string} str - เช่น "01/02/2026" หรือ "1/2/2026"
 * @returns {string|null} YYYY-MM-DD หรือ null ถ้าไม่ถูกต้อง
 */
export function parseDisplayDateToYyyyMmDd(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split(/[/-]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(p => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  const lastDay = new Date(y, m, 0).getDate();
  if (d < 1 || d > lastDay) return null;
  const yy = String(y);
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

