import React, { useState, useEffect } from 'react';
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataCache } from '../context/DataCacheContext';
import { uploadExpenseReceipt } from '../services/supabaseStorage';
import Swal from 'sweetalert2';
import { normalizeDate, getTodayDate, formatDateForDisplay } from '../utils/dateUtils';
import DateInput from './DateInput';

function Expenses({ overrideBranchCode, overrideBranchName, allowAdminDelete }) {
  const { user } = useAuth();
  const effectiveBranchCode = overrideBranchCode ?? user?.branchCode;
  const { getCachedData, setCachedData, invalidateCache, invalidatePattern } = useDataCache();
  const [deletingId, setDeletingId] = useState(null);
  const getToday = () => getTodayDate();
  const [today, setToday] = useState(getToday());
  
  // อัปเดตวันที่เป็นวันปัจจุบันทุกวัน
  useEffect(() => {
    const updateDate = () => {
      const newToday = getToday();
      setToday(newToday);
      setFormData(prev => {
        if (prev.date === today || !prev.date) {
          return { ...prev, date: newToday };
        }
        return prev;
      });
    };
    
    updateDate();
    const interval = setInterval(updateDate, 3600000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [formData, setFormData] = useState({
    date: getToday(),
    amount: '',
    expenseType: 'CASH_DRAWER',
    reason: '',
    notes: '',
    receiptImage: null,
    receiptImageBase64: '',
    receiptImageUrl: '',
    receiptFileName: ''
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (effectiveBranchCode) loadExpenseHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchCode]);

  const loadExpenseHistory = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;
    
    const cacheKey = `expenses_${effectiveBranchCode}`;
    const params = { branchCode: effectiveBranchCode };
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setExpenses(cachedData);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      console.log('[Expenses] Loading expense history for branchCode:', effectiveBranchCode);
      const result = await gasAPI.getExpenseHistory(effectiveBranchCode);
      console.log('[Expenses] getExpenseHistory result:', result);
      
      // Handle both old format (array) and new format (object with data property)
      let expensesArray = [];
      if (Array.isArray(result)) {
        console.log('[Expenses] Result is array, length:', result.length);
        expensesArray = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        console.log('[Expenses] Result has data property, length:', result.data.length);
        expensesArray = result.data;
      } else if (result && result.status === 'success' && Array.isArray(result.data)) {
        console.log('[Expenses] Result has status success, data length:', result.data.length);
        expensesArray = result.data;
      } else {
        console.warn('[Expenses] Unexpected result format:', result);
        expensesArray = [];
      }
      
      setExpenses(expensesArray);
      // Cache the result
      setCachedData(cacheKey, expensesArray, params);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : value) : value
    }));
  };

  const handleImageChange = async (e) => {
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
      
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            // จำกัดขนาดสูงสุด 300px และคุณภาพต่ำมาก (เพื่อให้สามารถใช้ JSONP ได้)
            const maxWidth = 300;
            const maxHeight = 300;
            let quality = 0.25;
            
            let targetWidth = img.width;
            let targetHeight = img.height;
            
            if (img.width > maxWidth || img.height > maxHeight) {
              if (img.width > img.height) {
                targetHeight = (img.height * maxWidth) / img.width;
                targetWidth = maxWidth;
              } else {
                targetWidth = (img.width * maxHeight) / img.height;
                targetHeight = maxHeight;
              }
            }
            
            // บีบอัดหลายครั้งจนได้ขนาด < 20KB
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
              tempCtx.imageSmoothingEnabled = true;
              tempCtx.imageSmoothingQuality = 'low';
              tempCtx.drawImage(img, 0, 0, currentWidth, currentHeight);
              
              compressedBase64 = tempCanvas.toDataURL('image/jpeg', currentQuality).split(',')[1];
              compressedSizeKB = (compressedBase64.length * 3) / 4 / 1024;
              
              if (compressedSizeKB > 20) {
                if (currentWidth > 250 && currentHeight > 250) {
                  currentWidth = Math.floor(currentWidth * 0.75);
                  currentHeight = Math.floor(currentHeight * 0.75);
                } else if (currentWidth > 200 && currentHeight > 200) {
                  currentWidth = Math.floor(currentWidth * 0.7);
                  currentHeight = Math.floor(currentHeight * 0.7);
                } else if (currentWidth > 150 && currentHeight > 150) {
                  currentWidth = Math.floor(currentWidth * 0.65);
                  currentHeight = Math.floor(currentHeight * 0.65);
                } else {
                  currentQuality -= 0.03;
                }
              }
              attempts++;
            }
            
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
            (async () => {
              try {
                const url = await uploadExpenseReceipt(compressedBase64, file.name, currentBranch, normalizeDate(currentDate));
                setFormData(prev => ({ ...prev, receiptImageUrl: url, receiptImage: file, receiptImageBase64: compressedBase64, receiptFileName: file.name }));
              } catch (err) {
                console.warn('[Expenses] Storage upload failed:', err);
                setFormData(prev => ({ ...prev, receiptImage: file, receiptImageBase64: compressedBase64, receiptFileName: file.name }));
                Swal.fire({ icon: 'warning', title: 'เก็บรูปใน Storage ไม่ได้', text: err.message || 'จะบันทึกเป็นข้อมูลในระบบแทน', timer: 3000 });
              }
            })();
          };
          
          img.onerror = () => {
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ไม่สามารถโหลดรูปภาพได้'
            });
          };
          
          img.src = reader.result;
        };
        
        reader.onerror = () => {
          Swal.close();
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถอ่านไฟล์ได้'
          });
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message || 'ไม่สามารถประมวลผลรูปภาพได้'
        });
      }
    }
  };

  // เมื่อโฟกัสที่ช่องตัวเลข ถ้าเป็น 0 ให้เลือกทั้งหมดเพื่อให้ผู้ใช้พิมพ์ทับได้เลย
  const handleNumberFocus = (e) => {
    const v = e.target.value;
    if (v === '0' || v === '0.00' || v === '0.0' || v === '') e.target.select();
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

    const hasReceiptImage = !!(formData.receiptImageUrl || formData.receiptImageBase64 || formData.receiptImage);

    if (!formData.date || !formData.amount || !formData.reason) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'ต้องกรอกวันที่, จำนวนเงิน, และรายการ'
      });
      return;
    }

    if (!hasReceiptImage) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาแนบรูปภาพหลักฐาน',
        text: 'ต้องแนบรูปภาพหลักฐานก่อนจึงจะบันทึกค่าใช้จ่ายได้'
      });
      return;
    }

    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // สร้าง data object โดยไม่รวม receiptImage (File object)
    const data = {
      date: normalizeDate(formData.date), // Normalize date before sending
      amount: parseFloat(formData.amount) || 0,
      expenseType: formData.expenseType,
      reason: formData.reason,
      notes: formData.notes || '',
      receiptBase64: formData.receiptImageBase64 || '', // ส่ง Base64 ไปให้ GAS บันทึกลง Drive
      receiptImageUrl: formData.receiptImageUrl || '', // เก็บ URL (ถ้ามี)
      receiptFileName: formData.receiptFileName || '',
      branchCode: effectiveBranchCode,
      email: user.email
    };
    
    // Log สำหรับ debug
    console.log('[Expenses] Submitting data:', {
      hasImage: !!data.receiptBase64,
      imageSize: data.receiptBase64 ? (data.receiptBase64.length * 3) / 4 / 1024 : 0,
      dataSize: JSON.stringify(data).length / 1024
    });

    try {
      const result = await gasAPI.saveExpenseData(data);
      if (result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'บันทึกค่าใช้จ่ายเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
        setFormData({
          date: today,
          amount: '',
          expenseType: 'CASH_DRAWER',
          reason: '',
          notes: '',
          receiptImage: null,
          receiptImageBase64: '',
          receiptImageUrl: '',
          receiptFileName: ''
        });
        // Invalidate related caches
        invalidateCache(`expenses_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`); // Invalidate all dashboard caches for this branch
        loadExpenseHistory(true); // Force refresh
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

  const handleDeleteExpense = async (id) => {
    if (!id || !allowAdminDelete) return;
    const { value: confirmed } = await Swal.fire({
      title: 'ยืนยันลบค่าใช้จ่าย?',
      text: 'การลบไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ'
    });
    if (!confirmed) return;
    setDeletingId(id);
    try {
      const result = await gasAPI.deleteExpense(id);
      if (result.status === 'success') {
        Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1500, showConfirmButton: false });
        invalidateCache(`expenses_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`);
        loadExpenseHistory(true);
      } else throw new Error(result.message);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e.message });
    } finally {
      setDeletingId(null);
    }
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => (dateStr ? formatDateForDisplay(dateStr) : '-');

  const getExpenseTypeLabel = (type) => {
    const types = {
      'CASH_DRAWER': 'เบิกเงินลิ้นชัก',
      'EXTERNAL': 'ซื้อของนอก',
      'UTILITY': 'ค่าไฟ/น้ำ/โทรศัพท์',
      'SUPPLY': 'วัสดุสิ้นเปลือง',
      'OTHER': 'อื่นๆ'
    };
    return types[type] || type;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <i className="fas fa-file-invoice-dollar mr-2 text-red-600"></i>
        บันทึกค่าใช้จ่ายระหว่างวัน
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              วันที่ <span className="text-red-500">*</span>
            </label>
            <DateInput
              name="date"
              value={formData.date}
              onChange={(v) => setFormData(prev => ({ ...prev, date: v }))}
              required
              max={getTodayDate()}
              className="border-gray-300 focus-within:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              จำนวนเงิน <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              onFocus={handleNumberFocus}
              required
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg font-bold text-red-600 mobile-input focus:border-red-500 outline-none"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ประเภทค่าใช้จ่าย <span className="text-red-500">*</span>
          </label>
          <select
            name="expenseType"
            value={formData.expenseType}
            onChange={handleChange}
            required
            className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-red-500 outline-none"
          >
            <option value="CASH_DRAWER">เบิกเงินลิ้นชัก</option>
            <option value="EXTERNAL">ซื้อของนอก</option>
            <option value="SUPPLY">วัสดุสิ้นเปลือง</option>
            <option value="OTHER">อื่นๆ</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            รายการ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-red-500 outline-none"
            placeholder="ระบุรายการค่าใช้จ่าย"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-red-500 outline-none"
            placeholder="เพิ่มหมายเหตุเพิ่มเติม..."
          />
        </div>

        {/* Receipt/Image Upload - บังคับต้องแนบรูปก่อนบันทึก */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <i className="fas fa-image mr-2 text-red-600"></i>
            รูปภาพหลักฐาน <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-600 mb-2">ต้องแนบรูปภาพหลักฐานถึงจะบันทึกค่าใช้จ่ายได้</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-red-400 transition">
            <input
              type="file"
              id="expenseReceiptImage"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label htmlFor="expenseReceiptImage" className="cursor-pointer">
              {formData.receiptImageUrl || formData.receiptImageBase64 || formData.receiptImage ? (
                <div className="space-y-2">
                  <img
                    src={formData.receiptImageUrl || (formData.receiptImage ? URL.createObjectURL(formData.receiptImage) : `data:image/jpeg;base64,${formData.receiptImageBase64}`)}
                    alt="Receipt"
                    className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                  />
                  <p className="text-sm text-gray-600">{formData.receiptFileName}</p>
                  {formData.receiptImageUrl && (
                    <a href={formData.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 block">
                      <i className="fas fa-external-link-alt mr-1"></i>เปิดดูรูปภาพ
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    <i className="fas fa-trash mr-1"></i>ลบรูปภาพ
                  </button>
                </div>
              ) : (
                <div>
                  <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                  <p className="text-gray-600">คลิกเพื่อเลือกรูปภาพหรือถ่ายรูป</p>
                  <p className="text-xs text-gray-500 mt-1">รองรับไฟล์: JPG, PNG, GIF (ไม่เกิน 5MB)</p>
                </div>
              )}
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!(formData.receiptImageUrl || formData.receiptImageBase64 || formData.receiptImage)}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 transition active:scale-95 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-600 disabled:hover:to-red-700"
        >
          <i className="fas fa-save mr-2"></i>
          บันทึกค่าใช้จ่าย
        </button>
        {!(formData.receiptImageUrl || formData.receiptImageBase64 || formData.receiptImage) && (
          <p className="text-center text-sm text-amber-600 mt-1">
            <i className="fas fa-info-circle mr-1"></i>กรุณาแนบรูปภาพหลักฐานก่อนกดบันทึก
          </p>
        )}
      </form>
      
      {/* Expense History */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">ประวัติค่าใช้จ่าย</h3>
        {loading ? (
          <div className="text-center text-gray-500 py-4">
            <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...
          </div>
        ) : expenses.length > 0 ? (
          <div className="space-y-2">
            {expenses.map((exp, index) => (
              <div key={exp.id ?? index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-bold text-gray-800">{exp.reason || '-'}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(exp.date)} - {getExpenseTypeLabel(exp.expenseType)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{formatNumber(exp.amount)}</p>
                      </div>
                    </div>
                    {exp.receiptImageUrl && (
                      <a 
                        href={exp.receiptImageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 block mt-2"
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>เปิดดูรูปภาพ
                      </a>
                    )}
                    {exp.notes && (
                      <p className="text-xs text-gray-500 mt-1">{exp.notes}</p>
                    )}
                  </div>
                  {allowAdminDelete && exp.id != null && (
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      disabled={deletingId === exp.id}
                      className="flex-none p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="ลบรายการ (แอดมิน)"
                    >
                      <i className={`fas ${deletingId === exp.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">ไม่มีข้อมูลค่าใช้จ่าย</div>
        )}
      </div>
    </div>
  );
}

export default Expenses;

