import React, { useState, useEffect } from 'react';
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataCache } from '../context/DataCacheContext';
import { uploadSalesReceipt } from '../services/supabaseStorage';
import Swal from 'sweetalert2';
import { normalizeDate, getTodayDate, formatDateForDisplay } from '../utils/dateUtils';
import DateInput from './DateInput';

function Sales({ overrideBranchCode, overrideBranchName, allowAdminDelete }) {
  const { user } = useAuth();
  const effectiveBranchCode = overrideBranchCode ?? user?.branchCode;
  const effectiveBranchName = overrideBranchName ?? user?.branchName;
  const { getCachedData, setCachedData, invalidateCache, invalidatePattern } = useDataCache();
  const [deletingSales, setDeletingSales] = useState(false);
  const getToday = () => getTodayDate();
  const [today, setToday] = useState(getToday());
  
  // อัปเดตวันที่เป็นวันปัจจุบันทุกวัน
  useEffect(() => {
    const updateDate = () => {
      const newToday = getToday();
      setToday(newToday);
      // อัปเดตวันที่ใน form ถ้ายังไม่ได้แก้ไข
      setFormData(prev => {
        const currentDate = prev.date || today;
        if (currentDate === today || !prev.date) {
          return { ...prev, date: newToday };
        }
        return prev;
      });
    };
    
    // อัปเดตทันที
    updateDate();
    
    // อัปเดตทุก 1 ชั่วโมง (เผื่อเปลี่ยนวัน)
    const interval = setInterval(updateDate, 3600000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [formData, setFormData] = useState({
    date: getToday(),
    cash: '',
    transfer: '',
    grab: '',
    lineman: '',
    shopee: '',
    robinhood: '',
    creditCard: '',
    halfHalf: '',
    other: '',
    startingCash: '',
    staffDiscount: '',
    promoDiscount: '',
    cashCounted: '',
    waste: '',
    notes: '',
    receiptImage: null,
    receiptImageBase64: '',
    receiptImageUrl: '', // เก็บ URL จาก Google Drive
    receiptFileName: ''
  });
  
  const [expenses, setExpenses] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [existingSalesId, setExistingSalesId] = useState(null);
  const [loadingSalesData, setLoadingSalesData] = useState(false);
  const [salesDates, setSalesDates] = useState([]); // รายการวันที่ที่มีข้อมูล

  const [calculations, setCalculations] = useState({
    totalSales: 0,
    cashBalance: 0,
    cashDifference: 0,
    depositAmount: 0,
    cashExpenses: 0
  });

  useEffect(() => {
    calculateTotals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, expenses]);

  useEffect(() => {
    if (effectiveBranchCode && formData.date) {
      checkExistingSales();
      loadExpensesForDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, effectiveBranchCode]);

  // โหลดรายการวันที่ที่มีข้อมูลเมื่อ component mount
  useEffect(() => {
    if (effectiveBranchCode) {
      loadSalesDates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchCode]);

  const loadSalesDates = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;

    const cacheKey = `salesDates_${effectiveBranchCode}`;
    const params = { branchCode: effectiveBranchCode };
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setSalesDates(cachedData);
        console.log('[Sales] Loaded sales dates from cache:', cachedData.length);
        return;
      }
    }
    
    try {
      const result = await gasAPI.getSalesDates(effectiveBranchCode);
      if (result && result.status === 'success' && Array.isArray(result.dates)) {
        setSalesDates(result.dates);
        console.log('[Sales] Loaded sales dates:', result.dates.length);
        // Cache the result
        setCachedData(cacheKey, result.dates, params);
      }
    } catch (error) {
      console.error('[Sales] Error loading sales dates:', error);
      setSalesDates([]);
    }
  };
  
  const loadExpensesForDate = async () => {
    if (!effectiveBranchCode || !formData.date) return;
    
    try {
      console.log('[Sales] Loading expenses for date:', formData.date, 'branchCode:', effectiveBranchCode);
      const result = await gasAPI.getExpenseHistory(effectiveBranchCode);
      console.log('[Sales] getExpenseHistory result:', result);
      
      // Handle both old format (array) and new format (object with data property)
      let expensesArray = [];
      if (Array.isArray(result)) {
        expensesArray = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        expensesArray = result.data;
      } else if (result && result.status === 'success' && Array.isArray(result.data)) {
        expensesArray = result.data;
      }
      
      console.log('[Sales] Expenses array length:', expensesArray.length);
      
      // Filter expenses for selected date (normalize both dates for comparison)
      const normalizedFormDate = normalizeDate(formData.date);
      console.log('[Sales] Filtering expenses for normalized date:', normalizedFormDate);
      
      const dateExpenses = expensesArray.filter(exp => {
        const expDate = normalizeDate(exp.date);
        const match = expDate === normalizedFormDate;
        if (match || expensesArray.length <= 5) {
          console.log('[Sales] Expense:', {
            date: exp.date,
            normalizedDate: expDate,
            searchDate: normalizedFormDate,
            match: match,
            amount: exp.amount,
            reason: exp.reason
          });
        }
        return match;
      });
      
      console.log('[Sales] Filtered expenses for date:', dateExpenses.length);
      setExpenses(dateExpenses);
    } catch (error) {
      console.error('[Sales] Error loading expenses:', error);
      setExpenses([]);
    }
  };
  
  const checkExistingSales = async () => {
    if (!effectiveBranchCode || !formData.date) {
      // ถ้าไม่มีข้อมูล ให้ reset เป็นโหมดสร้างใหม่
      setIsEditing(false);
      setExistingSalesId(null);
      setLoadingSalesData(false);
      return;
    }
    
    // Normalize date before sending
    const normalizedDate = normalizeDate(formData.date);
    
    // ตรวจสอบว่าวันที่นี้มีข้อมูลใน salesDates หรือไม่
    const hasData = salesDates.includes(normalizedDate);
    
    if (hasData) {
      // แสดง toast notification กำลังดึงข้อมูล (ไม่บัง input field)
      setLoadingSalesData(true);
      Swal.fire({
        title: 'กำลังดึงข้อมูลยอดขาย',
        text: 'วันที่ ' + formatDateForDisplay(formData.date) + ' มีการบันทึกข้อมูลแล้ว',
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }
    
    try {
      console.log('[Sales] Checking existing sales for:', {
        branchCode: effectiveBranchCode,
        date: formData.date,
        normalizedDate: normalizedDate
      });
      
      const result = await gasAPI.getSalesData(effectiveBranchCode, normalizedDate);
      
      console.log('[Sales] getSalesData result:', result);
      
      // ปิด popup loading
      if (hasData) {
        Swal.close();
        setLoadingSalesData(false);
      }
      
      if (result && result.status === 'success' && result.data) {
        // มีข้อมูลยอดขายสำหรับวันที่นี้ - แสดงข้อมูล
        setIsEditing(true);
        setExistingSalesId(result.data.rowId);
        // Load existing data
        setFormData(prev => ({
          ...prev,
          date: result.data.date || prev.date,
          cash: result.data.cash ? result.data.cash.toString() : '',
          transfer: result.data.transfer ? result.data.transfer.toString() : '',
          grab: result.data.grab ? result.data.grab.toString() : '',
          lineman: result.data.lineman ? result.data.lineman.toString() : '',
          shopee: result.data.shopee ? result.data.shopee.toString() : '',
          robinhood: result.data.robinhood ? result.data.robinhood.toString() : '',
          creditCard: result.data.creditCard ? result.data.creditCard.toString() : '',
          halfHalf: result.data.halfHalf ? result.data.halfHalf.toString() : '',
          other: result.data.other ? result.data.other.toString() : '',
          startingCash: result.data.startingCash ? result.data.startingCash.toString() : '',
          staffDiscount: result.data.staffDiscount ? result.data.staffDiscount.toString() : '',
          promoDiscount: result.data.promoDiscount ? result.data.promoDiscount.toString() : '',
          cashCounted: result.data.cashCounted ? result.data.cashCounted.toString() : '',
          waste: result.data.waste ? result.data.waste.toString() : '',
          notes: result.data.notes || '',
          receiptImage: null,
          receiptImageBase64: '', // ไม่ต้องโหลด Base64 กลับมา
          receiptImageUrl: result.data.receiptImageUrl || '', // โหลด URL แทน
          receiptFileName: result.data.receiptFileName || ''
        }));
        
        // แสดง toast notification แจ้งเตือนว่าพบข้อมูล (ไม่บัง input field)
        if (hasData) {
          Swal.fire({
            icon: 'success',
            title: 'พบข้อมูลยอดขาย',
            text: 'ข้อมูลถูกโหลดมาแสดงแล้ว',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
        }
      } else {
        // ไม่มีข้อมูลยอดขายสำหรับวันที่นี้ - reset เป็นโหมดสร้างใหม่
        setIsEditing(false);
        setExistingSalesId(null);
        // Reset form data แต่คงวันที่ไว้
        setFormData(prev => ({
          ...prev,
          cash: '',
          transfer: '',
          grab: '',
          lineman: '',
          shopee: '',
          robinhood: '',
          creditCard: '',
          halfHalf: '',
          other: '',
          startingCash: '',
          staffDiscount: '',
          promoDiscount: '',
          cashCounted: '',
          waste: '',
          notes: '',
          receiptImage: null,
          receiptImageBase64: '',
          receiptImageUrl: '',
          receiptFileName: ''
        }));
      }
    } catch (error) {
      console.error('Error checking existing sales:', error);
      setIsEditing(false);
      setExistingSalesId(null);
      setLoadingSalesData(false);
      
      // ปิด popup loading ถ้ายังเปิดอยู่
      const normalizedDate = normalizeDate(formData.date);
      const hasData = salesDates.includes(normalizedDate);
      if (hasData) {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถดึงข้อมูลยอดขายได้: ' + (error.message || 'Unknown error')
        });
      }
    }
  };

  const calculateTotals = () => {
    const cash = parseFloat(formData.cash) || 0;
    const transfer = parseFloat(formData.transfer) || 0;
    const grab = parseFloat(formData.grab) || 0;
    const lineman = parseFloat(formData.lineman) || 0;
    const shopee = parseFloat(formData.shopee) || 0;
    const robinhood = parseFloat(formData.robinhood) || 0;
    const creditCard = parseFloat(formData.creditCard) || 0;
    const halfHalf = parseFloat(formData.halfHalf) || 0;
    const other = parseFloat(formData.other) || 0;
    const startingCash = parseFloat(formData.startingCash) || 0;
    const cashCounted = parseFloat(formData.cashCounted) || 0;

    const totalSales = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;

    // รวมค่าใช้จ่ายทั้งหมด (ทุกประเภท) สำหรับแสดงใน UI
    const cashExpensesTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    // เฉพาะประเภท "เบิกเงินลิ้นชัก" สำหรับคำนวณเงินสดคงเหลือ / เงินสดขาด-เกิน / ยอดที่ต้องนำฝาก
    const cashExpensesDrawerOnly = expenses
      .filter((e) => (e.expenseType || e.Type || '') === 'CASH_DRAWER')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const cashBalance = (startingCash + cash) - cashExpensesDrawerOnly;
    const cashDifference = cashCounted - cashBalance;
    const depositAmount = cash - cashExpensesDrawerOnly;

    setCalculations({
      ...calculations,
      totalSales,
      cashBalance,
      cashDifference,
      cashExpenses: cashExpensesTotal,
      depositAmount: Math.max(0, depositAmount)
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // ถ้าเปลี่ยนวันที่ ให้ clear ข้อมูลทั้งหมดทันที
    if (name === 'date') {
      const previousDate = formData.date;
      const newDate = value;
      
      // ถ้าวันที่เปลี่ยน ให้ reset form data
      if (previousDate !== newDate) {
        setFormData(prev => ({
          ...prev,
          date: newDate,
          // Clear ข้อมูลยอดขายทั้งหมด
          cash: '',
          transfer: '',
          grab: '',
          lineman: '',
          shopee: '',
          robinhood: '',
          creditCard: '',
          halfHalf: '',
          other: '',
          startingCash: '',
          cashCounted: '',
          wasteAmount: '',
          notes: '',
          receiptImage: null,
          receiptImageBase64: '',
          receiptImageUrl: '',
          receiptFileName: ''
        }));
        
        // Reset editing state
        setIsEditing(false);
        setExistingSalesId(null);
        setExpenses([]);
        setCalculations({
          totalSales: 0,
          cashBalance: 0,
          cashDifference: 0,
          depositAmount: 0,
          cashExpenses: 0
        });
      }
    } else {
      // ถ้าไม่ใช่การเปลี่ยนวันที่ ให้อัพเดทตามปกติ
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleNumberFocus = (e) => {
    // เมื่อโฟกัสที่ช่องตัวเลข ถ้าเป็น 0 ให้เลือกทั้งหมดเพื่อให้ผู้ใช้พิมพ์ทับได้เลย
    const v = e.target.value;
    if (v === '0' || v === '0.00' || v === '0.0') e.target.select();
  };
  
  const handleNumberBlur = (e) => {
    const { name } = e.target;
    const value = e.target.value.trim();
    // ถ้าเป็นค่าว่างหรือ 0 ให้แสดงเป็นค่าว่าง
    if (!value || value === '0' || value === '0.00') {
      setFormData(prev => ({
        ...prev,
        [name]: ''
      }));
    } else {
      // แปลงเป็นตัวเลขและ format
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue === 0 ? '' : numValue.toString()
      }));
    }
  };
  
  const handleNumberInput = (e) => {
    const { name, value } = e.target;
    // อนุญาตให้กรอกตัวเลข, จุดทศนิยม, และลบ
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // ตรวจสอบประเภทไฟล์
      if (!file.type.match('image.*')) {
        Swal.fire({
          icon: 'warning',
          title: 'ไฟล์ไม่ถูกต้อง',
          text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น'
        });
        return;
      }
      
      // ตรวจสอบขนาดไฟล์ (5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'ไฟล์ใหญ่เกินไป',
          text: 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB'
        });
        return;
      }
      
      // แสดง loading
      Swal.fire({
        title: 'กำลังประมวลผลรูปภาพ...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // สร้าง canvas เพื่อ resize รูปภาพ
          let width = img.width;
          let height = img.height;
          
          // จำกัดขนาดสูงสุด 300px และคุณภาพต่ำมาก (เพื่อให้สามารถใช้ JSONP ได้)
          // เพราะ POST method ผ่าน iframe มีปัญหา 403 และ timeout
          // ต้องลดขนาดให้เล็กมากเพื่อให้สามารถส่งผ่าน URL (JSONP) ได้
          const maxWidth = 300;
          const maxHeight = 300;
          let quality = 0.25; // เริ่มด้วยคุณภาพต่ำมาก
          
          // คำนวณขนาดที่เหมาะสม (ไม่เกิน 300px)
          let targetWidth = width;
          let targetHeight = height;
          
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              targetHeight = (height * maxWidth) / width;
              targetWidth = maxWidth;
            } else {
              targetWidth = (width * maxHeight) / height;
              targetHeight = maxHeight;
            }
          }
          
          // บีบอัดหลายครั้งจนได้ขนาดที่เหมาะสม (< 20KB binary = ~27KB base64)
          // เพื่อให้ URL length รวมทั้งหมด < 6000 chars (ปลอดภัยสำหรับ JSONP)
          let compressedBase64 = '';
          let compressedSizeKB = Infinity;
          let currentQuality = quality;
          let currentWidth = Math.floor(targetWidth);
          let currentHeight = Math.floor(targetHeight);
          const maxAttempts = 15;
          let attempts = 0;
          
          while (compressedSizeKB > 20 && attempts < maxAttempts && currentQuality >= 0.15) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = currentWidth;
            tempCanvas.height = currentHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // ตั้งค่าคุณภาพการวาดรูป
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'low';
            tempCtx.drawImage(img, 0, 0, currentWidth, currentHeight);
            
            compressedBase64 = tempCanvas.toDataURL('image/jpeg', currentQuality).split(',')[1];
            compressedSizeKB = (compressedBase64.length * 3) / 4 / 1024;
            
            if (compressedSizeKB > 20) {
              if (currentWidth > 250 && currentHeight > 250) {
                // ลดขนาดก่อน (ลดลง 25%)
                currentWidth = Math.floor(currentWidth * 0.75);
                currentHeight = Math.floor(currentHeight * 0.75);
              } else if (currentWidth > 200 && currentHeight > 200) {
                // ลดขนาดต่อ (ลดลง 30%)
                currentWidth = Math.floor(currentWidth * 0.7);
                currentHeight = Math.floor(currentHeight * 0.7);
              } else if (currentWidth > 150 && currentHeight > 150) {
                // ลดขนาดต่อ (ลดลง 35%)
                currentWidth = Math.floor(currentWidth * 0.65);
                currentHeight = Math.floor(currentHeight * 0.65);
              } else {
                // ลดคุณภาพ
                currentQuality -= 0.03;
              }
            }
            attempts++;
          }
          
          // ถ้ายังใหญ่เกิน 20KB ให้ลดขนาดสุดท้ายเป็น 200x200 หรือ 150x150
          if (compressedSizeKB > 20) {
            const finalSize = compressedSizeKB > 30 ? 150 : 200;
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = finalSize;
            finalCanvas.height = finalSize;
            const finalCtx = finalCanvas.getContext('2d');
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'low';
            finalCtx.drawImage(img, 0, 0, finalSize, finalSize);
            compressedBase64 = finalCanvas.toDataURL('image/jpeg', 0.15).split(',')[1];
            compressedSizeKB = (compressedBase64.length * 3) / 4 / 1024;
          }
          
          Swal.close();
          
          if (compressedSizeKB > 20) {
            Swal.fire({
              icon: 'warning',
              title: 'รูปภาพใหญ่เกินไป',
              text: 'รูปภาพถูกบีบอัดเป็น ' + compressedSizeKB.toFixed(1) + ' KB แล้ว แต่ยังใหญ่อยู่ กรุณาเลือกรูปภาพที่มีขนาดเล็กลง (แนะนำ: ลดขนาดรูปภาพเป็น 200x200 หรือเล็กลง)'
            });
          } else {
            console.log('รูปภาพถูกบีบอัดเป็น ' + compressedSizeKB.toFixed(1) + ' KB สำเร็จ');
          }

          const currentDate = formData.date || getToday();
          const currentBranch = effectiveBranchCode || '';
          setFormData(prev => ({
            ...prev,
            receiptImage: file,
            receiptImageBase64: compressedBase64,
            receiptFileName: file.name
          }));
          // อัปโหลดไป Supabase Storage เพื่อเก็บรูปสลิป/ใบสรุปยอด
          (async () => {
            try {
              const url = await uploadSalesReceipt(compressedBase64, file.name, currentBranch, normalizeDate(currentDate));
              setFormData(prev => ({ ...prev, receiptImageUrl: url, receiptImage: file, receiptImageBase64: compressedBase64, receiptFileName: file.name }));
            } catch (err) {
              console.warn('[Sales] Supabase Storage upload failed, using base64 fallback:', err);
              setFormData(prev => ({ ...prev, receiptImage: file, receiptImageBase64: compressedBase64, receiptFileName: file.name }));
              Swal.fire({ icon: 'warning', title: 'เก็บรูปใน Storage ไม่ได้', text: err.message || 'จะบันทึกเป็นข้อมูลในระบบแทน', timer: 3000 });
            }
          })();
        };
        
        img.onerror = () => {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถโหลดรูปภาพได้'
          });
        };
        
        img.src = reader.result;
      };
      
      reader.onerror = () => {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถอ่านไฟล์ได้'
        });
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      receiptImage: null,
      receiptImageBase64: '',
      receiptImageUrl: '',
      receiptFileName: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!formData.date || !formData.cash || !formData.startingCash || !formData.cashCounted) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'ต้องกรอกวันที่, เงินสด, เงินสดตั้งต้น, และเงินสดในลิ้นชัก'
      });
      return;
    }
    
    // ตรวจสอบว่าต้องแนบรูปภาพ (ถ้ายังไม่ได้บันทึก)
    if (!isEditing && !formData.receiptImageBase64 && !formData.receiptImage && !formData.receiptImageUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาแนบรูปภาพ',
        text: 'ต้องแนบรูปภาพสลิปหรือใบสรุปยอดขายก่อนบันทึกข้อมูล',
        confirmButtonText: 'เข้าใจแล้ว'
      });
      return;
    }

    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // สร้าง data object โดยไม่รวม receiptImage (File object) เพราะจะทำให้ข้อมูลใหญ่เกินไป
    // ส่งเฉพาะ receiptImageBase64 และ receiptFileName
    const data = {
      date: normalizeDate(formData.date), // Normalize date before sending
      cash: formData.cash,
      transfer: formData.transfer || '',
      grab: formData.grab || '',
      lineman: formData.lineman || '',
      shopee: formData.shopee || '',
      robinhood: formData.robinhood || '',
      creditCard: formData.creditCard || '',
      halfHalf: formData.halfHalf || '',
      other: formData.other || '',
      startingCash: formData.startingCash,
      staffDiscount: formData.staffDiscount || '',
      promoDiscount: formData.promoDiscount || '',
      cashCounted: formData.cashCounted,
      waste: formData.waste || '',
      notes: formData.notes || '',
      receiptImageBase64: formData.receiptImageBase64, // ส่ง Base64 ไปให้ GAS บันทึกลง Drive
      receiptFileName: formData.receiptFileName,
      receiptImageUrl: formData.receiptImageUrl || '', // เก็บ URL (ถ้ามี)
      totalSales: calculations.totalSales,
      depositAmount: calculations.depositAmount,
      cashBalance: calculations.cashBalance,
      cashDiff: calculations.cashDifference,
      branchCode: effectiveBranchCode,
      branchName: effectiveBranchName,
      email: user.email
    };
    
    // Log สำหรับ debug
    console.log('[Sales] Submitting data:', {
      action: isEditing ? 'update' : 'create',
      hasImage: !!data.receiptImageBase64,
      imageSize: data.receiptImageBase64 ? (data.receiptImageBase64.length * 3) / 4 / 1024 : 0,
      dataSize: JSON.stringify(data).length / 1024
    });

    try {
      let result;
      if (isEditing && existingSalesId) {
        // Update existing sales
        data.rowId = existingSalesId;
        result = await gasAPI.updateSalesData(data);
      } else {
        // Create new sales
        result = await gasAPI.saveSalesData(data);
      }
      
      if (result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: isEditing ? 'อัปเดตข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
        
        // Invalidate related caches
        invalidateCache(`salesDates_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`); // Invalidate all dashboard caches for this branch
        invalidateCache(`expenses_${effectiveBranchCode}`); // Invalidate expenses cache
        
        // Refresh existing sales data to get the latest data
        // This ensures we have the correct rowId and data after save/update
        await checkExistingSales();
        
        // Reload expenses for the current date
        await loadExpensesForDate();
        
        // Reload sales dates list (force refresh)
        await loadSalesDates(true);
      } else {
        throw new Error(result.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้'
      });
    }
  };

  const handleDeleteSales = async () => {
    if (!allowAdminDelete || !existingSalesId) return;
    const { value: confirmed } = await Swal.fire({
      title: 'ยืนยันลบรายการปิดยอด?',
      text: 'รายการปิดยอดวันที่ ' + formatDateForDisplay(formData.date) + ' จะถูกลบ การลบไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ'
    });
    if (!confirmed) return;
    setDeletingSales(true);
    try {
      const result = await gasAPI.deleteSalesData(existingSalesId);
      if (result.status === 'success') {
        Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1500, showConfirmButton: false });
        invalidateCache(`salesDates_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`);
        invalidateCache(`expenses_${effectiveBranchCode}`);
        setIsEditing(false);
        setExistingSalesId(null);
        setFormData(prev => ({
          ...prev,
          cash: '', transfer: '', grab: '', lineman: '', shopee: '', robinhood: '', creditCard: '', halfHalf: '', other: '',
          startingCash: '', staffDiscount: '', promoDiscount: '', cashCounted: '', waste: '', notes: '',
          receiptImage: null, receiptImageBase64: '', receiptImageUrl: '', receiptFileName: ''
        }));
        await loadSalesDates(true);
        await loadExpensesForDate();
      } else throw new Error(result.message);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e.message });
    } finally {
      setDeletingSales(false);
    }
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCashDiffColor = () => {
    if (calculations.cashDifference > 0) return 'text-green-400';
    if (calculations.cashDifference < 0) return 'text-red-400';
    return 'text-white';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <i className="fas fa-cash-register mr-2 text-blue-600"></i>
        ปิดยอดสิ้นวัน
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            วันที่ปิดยอด <span className="text-red-500">*</span>
            {salesDates.includes(normalizeDate(formData.date)) && !loadingSalesData && (
              <span className="ml-2 text-xs text-green-600 font-normal">
                <i className="fas fa-check-circle mr-1"></i>
                มีข้อมูลแล้ว
              </span>
            )}
            {loadingSalesData && (
              <span className="ml-2 text-xs text-blue-600 font-normal">
                <i className="fas fa-spinner fa-spin mr-1"></i>
                กำลังโหลด...
              </span>
            )}
          </label>
          <DateInput
            name="date"
            value={formData.date}
            onChange={(v) => setFormData(prev => ({ ...prev, date: v }))}
            required
            disabled={loadingSalesData}
            max={getTodayDate()}
            className={salesDates.includes(normalizeDate(formData.date)) ? 'border-green-400 bg-green-50' : 'border-gray-300'}
            title={salesDates.includes(normalizeDate(formData.date)) ? 'วันที่นี้มีการบันทึกข้อมูลยอดขายแล้ว' : 'วันที่นี้ยังไม่มีการบันทึกข้อมูล'}
          />
          {salesDates.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">
                มีข้อมูลแล้ว {salesDates.length} วันที่: {salesDates.slice(0, 5).map(d => formatDateForDisplay(d)).join(', ')}
                {salesDates.length > 5 && ' ...'}
              </p>
            </div>
          )}
        </div>

        {/* Sales Amounts */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4">รายรับ (แยกตามช่องทาง)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'cash', label: 'เงินสด', required: true },
              { name: 'transfer', label: 'เงินโอน' },
              { name: 'grab', label: 'Grab' },
              { name: 'lineman', label: 'Lineman' },
              { name: 'shopee', label: 'Shopee' },
              { name: 'robinhood', label: 'Robinhood' },
              { name: 'creditCard', label: 'บัตรเครดิต' },
              { name: 'halfHalf', label: 'คนละครึ่ง' },
              { name: 'other', label: 'อื่นๆ' }
            ].map(field => (
              <div key={field.name}>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleNumberInput}
                  onFocus={handleNumberFocus}
                  onBlur={handleNumberBlur}
                  required={field.required}
                  placeholder="0"
                  autoComplete="off"
                  className="sales-input w-full border border-gray-300 rounded-lg p-3 mobile-input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                />
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-gray-900 rounded-lg text-white flex justify-between items-center">
            <span className="font-bold">รวมยอดขาย</span>
            <span className="text-2xl font-bold">{formatNumber(calculations.totalSales)}</span>
          </div>
        </div>

        {/* Cash Settings */}
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4">เงินสดและส่วนลด</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'startingCash', label: 'เงินสดตั้งต้น', required: true },
              { name: 'staffDiscount', label: 'ส่วนลดพนักงาน' },
              { name: 'promoDiscount', label: 'ส่วนลดโปรโมชั่น' },
              { name: 'cashCounted', label: 'เงินสดในลิ้นชัก', required: true },
              { name: 'waste', label: 'มูลค่าของเสีย (Waste)' }
            ].map(field => (
              <div key={field.name}>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleNumberInput}
                  onFocus={handleNumberFocus}
                  onBlur={handleNumberBlur}
                  required={field.required}
                  placeholder="0"
                  autoComplete="off"
                  className="sales-input w-full border-2 border-gray-400 rounded-lg p-3 text-lg font-bold text-right mobile-input focus:border-blue-500 outline-none"
                />
              </div>
            ))}
          </div>

          {/* Cash Expenses Display */}
          {expenses.length > 0 && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center">
                <i className="fas fa-file-invoice-dollar mr-2"></i>
                ค่าใช้จ่ายที่กรอกแล้ว ({expenses.length} รายการ)
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {expenses.map((exp, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-red-100">
                    <div>
                      <span className="font-bold text-gray-800">{exp.reason || '-'}</span>
                      <span className="text-gray-600 ml-2">({exp.expenseType || '-'})</span>
                    </div>
                    <span className="font-bold text-red-600">{formatNumber(exp.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-red-200 flex justify-between items-center">
                <span className="text-sm font-bold text-red-800">รวมค่าใช้จ่าย:</span>
                <span className="text-lg font-bold text-red-600">{formatNumber(calculations.cashExpenses)}</span>
              </div>
            </div>
          )}

          {/* Cash Balance Calculation */}
          <div className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-lg">
            <div className="mb-3">
              <p className="text-xs opacity-90 mb-1">เงินสดคงเหลือ (ตามทฤษฎี)</p>
              <p className="text-xs opacity-75">(เงินสดตั้งต้น + ยอดขายเงินสด) - ค่าใช้จ่ายเฉพาะประเภทเบิกเงินลิ้นชัก</p>
              <h3 className="text-2xl font-bold mt-2">{formatNumber(calculations.cashBalance)}</h3>
            </div>
            <div className="border-t border-white/20 pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm opacity-90">เงินสดในลิ้นชัก (นับจริง)</span>
                <span className="text-lg font-bold">{formatNumber(formData.cashCounted)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">เงินขาด/เกิน</span>
                <span className={`text-xl font-bold ${getCashDiffColor()}`}>
                  {calculations.cashDifference > 0 ? '+' : ''}{formatNumber(calculations.cashDifference)}
                  {calculations.cashDifference > 0 ? ' (เกิน)' : calculations.cashDifference < 0 ? ' (ขาด)' : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-900 text-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm opacity-90">ยอดที่ต้องนำฝาก</span>
              <span className="text-2xl font-bold">{formatNumber(calculations.depositAmount)}</span>
            </div>
            <div className="text-xs opacity-75 mt-2">
              คำนวณจาก: ยอดขายเงินสด - ค่าใช้จ่ายเฉพาะประเภทเบิกเงินลิ้นชัก - เงินตั้งต้น
            </div>
          </div>
        </div>

        {/* Receipt/Image Upload */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <i className="fas fa-image mr-2 text-blue-600"></i>
            แนบรูปภาพสลิปหรือใบสรุปยอดขาย <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
            <input
              type="file"
              id="receiptImage"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label htmlFor="receiptImage" className="cursor-pointer">
              {formData.receiptImageUrl || formData.receiptImageBase64 || formData.receiptImage ? (
                <div>
                  <img 
                    src={
                      formData.receiptImageUrl 
                        ? formData.receiptImageUrl 
                        : formData.receiptImage 
                          ? URL.createObjectURL(formData.receiptImage) 
                          : `data:image/jpeg;base64,${formData.receiptImageBase64}`
                    } 
                    alt="Receipt" 
                    className="max-w-full h-48 mx-auto rounded-lg mb-2"
                  />
                  <p className="text-sm text-gray-600">{formData.receiptFileName || 'รูปภาพที่อัปโหลด'}</p>
                  {formData.receiptImageUrl && (
                    <a 
                      href={formData.receiptImageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 block mt-1"
                    >
                      <i className="fas fa-external-link-alt mr-1"></i>เปิดดูรูปภาพ
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    <i className="fas fa-trash mr-1"></i>ลบรูปภาพ
                  </button>
                </div>
              ) : (
                <div>
                  <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                  <p className="text-sm text-gray-600">คลิกเพื่ออัปโหลดรูปภาพ</p>
                  <p className="text-xs text-gray-400 mt-1">รองรับไฟล์รูปภาพ (JPG, PNG) ขนาดไม่เกิน 5MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            autoComplete="off"
            className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-blue-500 outline-none"
            placeholder="เพิ่มหมายเหตุเพิ่มเติม..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transition active:scale-95 text-lg"
        >
          <i className={`fas ${isEditing ? 'fa-edit' : 'fa-save'} mr-2`}></i>
          {isEditing ? 'อัปเดตข้อมูลปิดยอด' : 'บันทึกข้อมูลปิดยอด'}
        </button>
        
        {isEditing && (
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setExistingSalesId(null);
                const todayDate = new Date().toISOString().split('T')[0];
                setFormData({
                  date: todayDate,
                  cash: '', transfer: '', grab: '', lineman: '', shopee: '', robinhood: '', creditCard: '', halfHalf: '', other: '',
                  startingCash: '', staffDiscount: '', promoDiscount: '', cashCounted: '', notes: '',
                  receiptImage: null, receiptImageBase64: '', receiptImageUrl: '', receiptFileName: ''
                });
              }}
              className="flex-1 bg-gray-500 text-white font-bold py-3 rounded-lg shadow hover:bg-gray-600 transition"
            >
              <i className="fas fa-times mr-2"></i>ยกเลิกการแก้ไข
            </button>
            {allowAdminDelete && (
              <button
                type="button"
                onClick={handleDeleteSales}
                disabled={deletingSales}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg shadow hover:bg-red-700 transition disabled:opacity-50"
              >
                <i className={`fas ${deletingSales ? 'fa-spinner fa-spin' : 'fa-trash-alt'} mr-2`}></i>ลบรายการปิดยอด (แอดมิน)
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default Sales;

