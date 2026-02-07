import React, { useState, useEffect } from 'react';
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataCache } from '../context/DataCacheContext';
import { uploadDepositSlip } from '../services/supabaseStorage';
import Swal from 'sweetalert2';
import { normalizeDate, getTodayDate, formatDateForDisplay } from '../utils/dateUtils';
import DateInput from './DateInput';

function Deposits({ overrideBranchCode, overrideBranchName, allowAdminDelete }) {
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
        const currentDate = prev.date || today;
        if (currentDate === today || !prev.date) {
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
    amount: 0,
    notes: '',
    slipBase64Compressed: '',
    slipImageUrl: ''
  });

  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (effectiveBranchCode) {
      loadDepositHistory();
      calculatePendingDeposit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchCode]);

  const loadDepositHistory = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;
    
    const cacheKey = `deposits_${effectiveBranchCode}`;
    const params = { branchCode: effectiveBranchCode };
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData && cachedData.history) {
        setDeposits(Array.isArray(cachedData.history) ? cachedData.history : []);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      console.log('[Deposits] Loading deposit history for branchCode:', effectiveBranchCode);
      const result = await gasAPI.getDepositInfo(effectiveBranchCode);
      console.log('[Deposits] getDepositInfo result:', result);
      
      if (result && result.history) {
        console.log('[Deposits] Found history, length:', result.history.length);
        setDeposits(Array.isArray(result.history) ? result.history : []);
        // Cache the result
        setCachedData(cacheKey, result, params);
      } else {
        console.warn('[Deposits] No history in result:', result);
        setDeposits([]);
      }
    } catch (error) {
      console.error('Error loading deposits:', error);
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  const calculatePendingDeposit = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;
    
    const cacheKey = `deposits_${effectiveBranchCode}`;
    const params = { branchCode: effectiveBranchCode };
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData && cachedData.pendingBalance !== undefined) {
        setPendingBalance(cachedData.pendingBalance || 0);
        return;
      }
    }
    
    try {
      console.log('[Deposits] Calculating pending deposit for branchCode:', effectiveBranchCode);
      const result = await gasAPI.getDepositInfo(effectiveBranchCode);
      console.log('[Deposits] getDepositInfo result for pending balance:', result);
      
      if (result && result.pendingBalance !== undefined) {
        console.log('[Deposits] Setting pending balance:', result.pendingBalance);
        setPendingBalance(result.pendingBalance || 0);
        // Cache the result
        setCachedData(cacheKey, result, params);
      } else {
        console.warn('[Deposits] No pendingBalance in result:', result);
        setPendingBalance(0);
      }
    } catch (error) {
      console.error('Error calculating pending deposit:', error);
      setPendingBalance(0);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFileSelect = (e) => {
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
          
          setSlipFile(file);
          setSlipPreview(`data:image/jpeg;base64,${compressedBase64}`);
          setFormData(prev => ({ ...prev, slipBase64Compressed: compressedBase64, slipImageUrl: '' }));
          const currentDate = formData.date || getToday();
          const currentBranch = effectiveBranchCode || '';
          (async () => {
            try {
              const url = await uploadDepositSlip(compressedBase64, file.name, currentBranch, normalizeDate(currentDate));
              setFormData(prev => ({ ...prev, slipBase64Compressed: compressedBase64, slipImageUrl: url }));
            } catch (err) {
              console.warn('[Deposits] Storage upload failed:', err);
              setFormData(prev => ({ ...prev, slipBase64Compressed: compressedBase64 }));
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
    }
  };

  // เมื่อโฟกัสที่ช่องตัวเลข ถ้าเป็น 0 ให้เลือกทั้งหมดเพื่อให้ผู้ใช้พิมพ์ทับได้เลย
  const handleNumberFocus = (e) => {
    const v = e.target.value;
    if (v === '0' || v === '0.00' || v === '0.0') e.target.select();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.amount) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'ต้องกรอกวันที่และจำนวนเงิน'
      });
      return;
    }

    if (!slipFile) {
      Swal.fire({
        icon: 'error',
        title: 'กรุณาอัปโหลดสลิป',
        text: 'ต้องอัปโหลดสลิปการฝาก'
      });
      return;
    }

    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // ใช้ base64 ที่บีบอัดแล้ว (ถ้ามี) หรืออ่านจาก preview
    let base64ToSend = formData.slipBase64Compressed || (slipPreview ? slipPreview.split(',')[1] : '');
    
    // ถ้าไม่มี base64 ที่บีบอัดแล้วและมี file ให้อ่านใหม่
    if (!base64ToSend && slipFile) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];
        await saveDepositWithBase64(base64);
      };
      reader.readAsDataURL(slipFile);
      return;
    }
    
    await saveDepositWithBase64(base64ToSend);
  };

    const saveDepositWithBase64 = async (base64ToSend) => {
    // สร้าง data object โดยไม่รวม slipFile (File object)
    const data = {
      date: normalizeDate(formData.date), // Normalize date before sending
      amount: formData.amount,
      notes: formData.notes || '',
      slipBase64: base64ToSend || '', // ส่ง Base64 ไปให้ GAS บันทึกลง Drive
      slipImageUrl: formData.slipImageUrl || '', // เก็บ URL (ถ้ามี)
      slipFileName: slipFile ? slipFile.name : '',
      branchCode: effectiveBranchCode,
      email: user.email
    };
    
    // Log สำหรับ debug
    console.log('[Deposits] Submitting data:', {
      hasImage: !!data.slipBase64,
      imageSize: data.slipBase64 ? (data.slipBase64.length * 3) / 4 / 1024 : 0,
      dataSize: JSON.stringify(data).length / 1024
    });

    try {
      const result = await gasAPI.saveDepositData(data);
        if (result.status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'บันทึกการนำฝากเรียบร้อยแล้ว',
            timer: 2000,
            showConfirmButton: false
          });
          setFormData({
            date: today,
            amount: 0,
            notes: '',
            slipBase64Compressed: '',
            slipImageUrl: ''
          });
          setSlipFile(null);
          setSlipPreview(null);
          // Invalidate related caches
          invalidateCache(`deposits_${effectiveBranchCode}`);
          invalidatePattern(`dashboard_${effectiveBranchCode}_*`); // Invalidate all dashboard caches for this branch
          loadDepositHistory(true); // Force refresh
          calculatePendingDeposit(true); // Force refresh
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

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDeleteDeposit = async (id) => {
    if (!id || !allowAdminDelete) return;
    const { value: confirmed } = await Swal.fire({
      title: 'ยืนยันลบรายการนำฝาก?',
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
      const result = await gasAPI.deleteDeposit(id);
      if (result.status === 'success') {
        Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1500, showConfirmButton: false });
        invalidateCache(`deposits_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`);
        loadDepositHistory(true);
        calculatePendingDeposit(true);
      } else throw new Error(result.message);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e.message });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => (dateStr ? formatDateForDisplay(dateStr) : '-');

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg mb-6">
        <p className="text-sm opacity-90 mb-2">ยอดเงินค้างฝากสะสม</p>
        <h2 className="text-4xl font-bold">{formatNumber(pendingBalance)}</h2>
        <p className="text-xs opacity-75 mt-2">คำนวณจาก: รวมยอดนำฝากทุกวัน (เงินสด - ค่าใช้จ่าย) - ยอดฝากแล้ว</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            วันที่นำฝาก <span className="text-red-500">*</span>
          </label>
          <DateInput
            name="date"
            value={formData.date}
            onChange={(v) => setFormData(prev => ({ ...prev, date: v }))}
            required
            max={getTodayDate()}
            className="border-gray-300 focus-within:border-green-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            จำนวนเงินที่นำฝาก <span className="text-red-500">*</span>
          </label>
            <input
            type="number"
            step="0.01"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            onFocus={handleNumberFocus}
            required
            className="w-full border-2 border-gray-400 rounded-lg p-4 text-3xl font-bold text-right mobile-input focus:border-green-500 outline-none"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            อัปโหลดสลิปการฝาก <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition">
            <input
              type="file"
              id="depositSlip"
              accept="image/*"
              onChange={handleFileSelect}
              required
              className="hidden"
            />
            <label htmlFor="depositSlip" className="cursor-pointer">
              <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
              <p className="text-sm text-gray-600">คลิกเพื่ออัปโหลดสลิป</p>
              <p className="text-xs text-gray-400 mt-1">รองรับไฟล์รูปภาพ (JPG, PNG)</p>
            </label>
            {slipPreview && (
              <div className="mt-4">
                <img src={slipPreview} alt="Preview" className="max-w-full h-48 mx-auto rounded-lg" />
                <p className="text-sm text-gray-600 mt-2">{slipFile?.name}</p>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-green-500 outline-none"
            placeholder="เพิ่มหมายเหตุเพิ่มเติม..."
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 transition active:scale-95 text-lg"
        >
          <i className="fas fa-university mr-2"></i>
          ยืนยันการนำฝาก
        </button>
      </form>
      
      {/* Deposit History */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">ประวัติการนำฝาก</h3>
        {loading ? (
          <div className="text-center text-gray-500 py-4">
            <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...
          </div>
        ) : deposits.length > 0 ? (
          <div className="space-y-2">
            {deposits.map((dep, index) => (
              <div key={dep.id ?? index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-gray-800">{formatDate(dep.date)}</p>
                      <p className="text-lg font-bold text-green-600">{formatNumber(dep.amount)}</p>
                    </div>
                    {dep.slipFileName && (
                      <p className="text-xs text-gray-600">
                        <i className="fas fa-file-image mr-1"></i>{dep.slipFileName}
                      </p>
                    )}
                    {dep.slipImageUrl && (
                      <a 
                        href={dep.slipImageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 block mt-1"
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>เปิดดูรูปภาพ
                      </a>
                    )}
                    {dep.notes && (
                      <p className="text-xs text-gray-500 mt-1">{dep.notes}</p>
                    )}
                  </div>
                  {allowAdminDelete && dep.id != null && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDeposit(dep.id)}
                      disabled={deletingId === dep.id}
                      className="flex-none p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="ลบรายการ (แอดมิน)"
                    >
                      <i className={`fas ${deletingId === dep.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">ไม่มีประวัติการนำฝาก</div>
        )}
      </div>
    </div>
  );
}

export default Deposits;

