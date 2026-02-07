import React, { useState, useEffect } from 'react';
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataCache } from '../context/DataCacheContext';
import { uploadTaxInvoiceImage } from '../services/supabaseStorage';
import Swal from 'sweetalert2';
import { normalizeDate, getTodayDate, formatDateForDisplay } from '../utils/dateUtils';
import DateInput from './DateInput';

function TaxInvoices({ overrideBranchCode, overrideBranchName, allowAdminDelete }) {
  const { user } = useAuth();
  const effectiveBranchCode = overrideBranchCode ?? user?.branchCode;
  const effectiveBranchName = overrideBranchName ?? user?.branchName;
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
    amount: '',
    invoiceNumber: '',
    taxpayerId: '',
    taxpayerName: '',
    taxpayerTaxId: '',
    imageBase64: '',
    invoiceImageUrl: ''
  });

  const [taxpayers, setTaxpayers] = useState([]);
  const [filteredTaxpayers, setFilteredTaxpayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaxpayerModal, setShowTaxpayerModal] = useState(false);
  const [newTaxpayer, setNewTaxpayer] = useState({
    name: '',
    taxId: ''
  });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInvoiceList, setShowInvoiceList] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [invoiceImage, setInvoiceImage] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);

  // โหลดข้อมูลผู้เสียภาษี
  useEffect(() => {
    if (effectiveBranchCode) {
      loadTaxpayers();
      loadInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchCode]);

  const loadTaxpayers = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;
    
    const cacheKey = 'taxpayers';
    const params = {};
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setTaxpayers(cachedData);
        setFilteredTaxpayers(cachedData);
        return;
      }
    }
    
    try {
      const result = await gasAPI.getTaxpayers();
      if (result && result.status === 'success' && result.data) {
        setTaxpayers(result.data);
        setFilteredTaxpayers(result.data);
        // Cache the result
        setCachedData(cacheKey, result.data, params);
      }
    } catch (error) {
      console.error('Error loading taxpayers:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลผู้เสียภาษีได้'
      });
    }
  };

  const loadInvoices = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;
    
    const cacheKey = `taxInvoices_${effectiveBranchCode}`;
    const params = { branchCode: effectiveBranchCode };
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setInvoices(cachedData);
        return;
      }
    }
    
    try {
      const result = await gasAPI.getTaxInvoices(effectiveBranchCode);
      if (result && result.status === 'success' && result.data) {
        setInvoices(result.data);
        // Cache the result
        setCachedData(cacheKey, result.data, params);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  // ค้นหาผู้เสียภาษี
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTaxpayers(taxpayers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = taxpayers.filter(tp => 
      tp.name.toLowerCase().includes(query) ||
      tp.taxId.includes(query)
    );
    setFilteredTaxpayers(filtered);
  }, [searchQuery, taxpayers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaxpayerSelect = (taxpayer) => {
    setFormData(prev => ({
      ...prev,
      taxpayerId: taxpayer.id || taxpayer.rowId,
      taxpayerName: taxpayer.name,
      taxpayerTaxId: taxpayer.taxId
    }));
    setSearchQuery('');
    setFilteredTaxpayers(taxpayers);
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
          
          setInvoiceImage(file);
          setInvoicePreview(`data:image/jpeg;base64,${compressedBase64}`);
          setFormData(prev => ({ ...prev, imageBase64: compressedBase64, invoiceImageUrl: '' }));
          const currentDate = formData.date || getToday();
          const currentBranch = effectiveBranchCode || '';
          (async () => {
            try {
              const url = await uploadTaxInvoiceImage(compressedBase64, file.name, currentBranch, normalizeDate(currentDate));
              setFormData(prev => ({ ...prev, imageBase64: compressedBase64, invoiceImageUrl: url }));
            } catch (err) {
              console.warn('[TaxInvoices] Storage upload failed:', err);
              setFormData(prev => ({ ...prev, imageBase64: compressedBase64 }));
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

  const handleSaveTaxpayer = async () => {
    if (!newTaxpayer.name.trim() || !newTaxpayer.taxId.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณากรอกชื่อผู้เสียภาษีและเลขที่ผู้เสียภาษี'
      });
      return;
    }

    try {
      setLoading(true);
      const result = await gasAPI.saveTaxpayer(newTaxpayer.name, newTaxpayer.taxId);
      
      if (result && result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: 'เพิ่มข้อมูลผู้เสียภาษีเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
        
        // โหลดข้อมูลใหม่
        await loadTaxpayers();
        
        // เลือกผู้เสียภาษีที่เพิ่งเพิ่ม
        const updatedTaxpayers = await gasAPI.getTaxpayers();
        if (updatedTaxpayers && updatedTaxpayers.data) {
          const newTaxpayerData = updatedTaxpayers.data.find(
            tp => tp.name === newTaxpayer.name && tp.taxId === newTaxpayer.taxId
          );
          if (newTaxpayerData) {
            handleTaxpayerSelect(newTaxpayerData);
          }
        }
        
        // Reset form
        setNewTaxpayer({ name: '', taxId: '' });
        setShowTaxpayerModal(false);
      } else {
        throw new Error(result.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error) {
      console.error('Error saving taxpayer:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลผู้เสียภาษีได้'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.invoiceNumber || !formData.taxpayerId) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณากรอกยอดซื้อ, เลขที่ใบเสร็จ และเลือกผู้ขาย'
      });
      return;
    }

    // ตรวจสอบว่ามีรูปภาพหรือไม่ (จาก Storage URL หรือ base64)
    if (!formData.imageBase64 && !formData.invoiceImageUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเพิ่มรูปภาพใบกำกับภาษี',
        text: 'กรุณาเลือกรูปภาพใบกำกับภาษีก่อนบันทึกข้อมูล'
      });
      return;
    }

    try {
      setLoading(true);
      const result = await gasAPI.saveTaxInvoice({
        branchCode: effectiveBranchCode,
        date: normalizeDate(formData.date),
        amount: parseFloat(formData.amount) || 0,
        invoiceNumber: formData.invoiceNumber,
        taxpayerId: formData.taxpayerId,
        taxpayerName: formData.taxpayerName,
        taxpayerTaxId: formData.taxpayerTaxId,
        imageBase64: formData.imageBase64 || '',
        invoiceImageUrl: formData.invoiceImageUrl || ''
      });

      if (result && result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: 'บันทึกข้อมูลใบกำกับภาษีเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        });

        // Reset form
        setFormData({
          date: getToday(),
          amount: '',
          invoiceNumber: '',
          taxpayerId: '',
          taxpayerName: '',
          taxpayerTaxId: '',
          imageBase64: '',
          invoiceImageUrl: ''
        });
        setSearchQuery('');
        // Invalidate related caches
        invalidateCache(`taxInvoices_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`); // Invalidate all dashboard caches for this branch
        loadInvoices(true); // Force refresh
        setInvoiceImage(null);
        setInvoicePreview(null);

        // โหลดข้อมูลใหม่
        await loadInvoices();
      } else {
        throw new Error(result.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลใบกำกับภาษีได้'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTaxInvoice = async (id) => {
    if (!id || !allowAdminDelete) return;
    const { value: confirmed } = await Swal.fire({
      title: 'ยืนยันลบใบกำกับภาษี?',
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
      const result = await gasAPI.deleteTaxInvoice(id);
      if (result.status === 'success') {
        Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1500, showConfirmButton: false });
        invalidateCache(`taxInvoices_${effectiveBranchCode}`);
        invalidatePattern(`dashboard_${effectiveBranchCode}_*`);
        loadInvoices(true);
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

  return (
    <div className="bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <i className="fas fa-file-invoice-dollar text-blue-600 mr-3"></i>
            ใบกำกับภาษี
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ระบุวันที่ในใบกำกับภาษี <span className="text-red-500">*</span>
              </label>
              <DateInput
                name="date"
                value={formData.date}
                onChange={(v) => setFormData(prev => ({ ...prev, date: v }))}
                required
                max={getTodayDate()}
                className="border-gray-300 focus-within:border-blue-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ยอดซื้อ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                onFocus={handleNumberFocus}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-blue-500 outline-none"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                เลขที่ใบเสร็จ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                required
                placeholder="กรอกเลขที่ใบเสร็จ"
                className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-blue-500 outline-none"
              />
            </div>

            {/* Taxpayer Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ผู้ขาย <span className="text-red-500">*</span>
              </label>
              
              {/* Search Input */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อผู้เสียภาษีหรือเลขที่ผู้เสียภาษี..."
                  className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-blue-500 outline-none"
                />
                <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>

              {/* Selected Taxpayer Display */}
              {formData.taxpayerName && (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{formData.taxpayerName}</p>
                      <p className="text-sm text-gray-600">เลขที่ผู้เสียภาษี: {formData.taxpayerTaxId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          taxpayerId: '',
                          taxpayerName: '',
                          taxpayerTaxId: ''
                        }));
                        setSearchQuery('');
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Taxpayer List */}
              {!formData.taxpayerName && searchQuery && filteredTaxpayers.length > 0 && (
                <div className="border-2 border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {filteredTaxpayers.map((taxpayer, index) => (
                    <div
                      key={index}
                      onClick={() => handleTaxpayerSelect(taxpayer)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <p className="font-semibold text-gray-800">{taxpayer.name}</p>
                      <p className="text-sm text-gray-600">เลขที่ผู้เสียภาษี: {taxpayer.taxId}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!formData.taxpayerName && searchQuery && filteredTaxpayers.length === 0 && (
                <div className="border-2 border-gray-300 rounded-lg p-3 text-center text-gray-500">
                  <p>ไม่พบข้อมูลผู้เสียภาษี</p>
                </div>
              )}

              {/* Add New Taxpayer Button */}
              {!formData.taxpayerName && (
                <button
                  type="button"
                  onClick={() => setShowTaxpayerModal(true)}
                  className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <i className="fas fa-plus mr-2"></i>
                  เพิ่มข้อมูลผู้เสียภาษีใหม่
                </button>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                รูปภาพใบกำกับภาษี <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="invoice-image-upload"
                />
                <label
                  htmlFor="invoice-image-upload"
                  className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <i className="fas fa-camera text-gray-400 text-2xl mb-2"></i>
                  <p className="text-sm text-gray-600">
                    {(invoicePreview || formData.invoiceImageUrl) ? 'เปลี่ยนรูปภาพ' : 'คลิกเพื่อเลือกรูปภาพ'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">รองรับไฟล์ JPG, PNG (ไม่เกิน 5MB)</p>
                </label>
                
                {(invoicePreview || formData.invoiceImageUrl) && (
                  <div className="relative">
                    <img
                      src={formData.invoiceImageUrl || invoicePreview}
                      alt="Invoice preview"
                      className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300"
                    />
                    {formData.invoiceImageUrl && (
                      <a href={formData.invoiceImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 block mt-1">
                        <i className="fas fa-external-link-alt mr-1"></i>เปิดดูรูปภาพ
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceImage(null);
                        setInvoicePreview(null);
                        setFormData(prev => ({
                          ...prev,
                          imageBase64: '',
                          invoiceImageUrl: ''
                        }));
                        // Reset file input
                        const fileInput = document.getElementById('invoice-image-upload');
                        if (fileInput) {
                          fileInput.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!invoicePreview && !formData.invoiceImageUrl) || (!formData.imageBase64 && !formData.invoiceImageUrl)}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span><i className="fas fa-spinner fa-spin mr-2"></i>กำลังบันทึก...</span>
              ) : (
                <span><i className="fas fa-save mr-2"></i>บันทึกข้อมูล</span>
              )}
            </button>
            
            {!invoicePreview && !formData.invoiceImageUrl && (
              <p className="text-sm text-red-500 text-center mt-2">
                <i className="fas fa-exclamation-circle mr-1"></i>
                กรุณาเพิ่มรูปภาพใบกำกับภาษีก่อนบันทึกข้อมูล
              </p>
            )}
          </form>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <i className="fas fa-list text-blue-600 mr-2"></i>
              รายการใบกำกับภาษี
            </h3>
            <button
              onClick={() => setShowInvoiceList(!showInvoiceList)}
              className="text-blue-600 hover:text-blue-800"
            >
              {showInvoiceList ? 'ซ่อน' : 'แสดง'} รายการ
            </button>
          </div>

          {showInvoiceList && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left border-b">วันที่</th>
                    <th className="p-3 text-left border-b">เลขที่ใบเสร็จ</th>
                    <th className="p-3 text-left border-b">ผู้ขาย</th>
                    <th className="p-3 text-left border-b">เลขที่ผู้เสียภาษี</th>
                    <th className="p-3 text-right border-b">ยอดซื้อ</th>
                    <th className="p-3 text-center border-b">รูปภาพ</th>
                    {allowAdminDelete && <th className="p-3 text-center border-b w-14">ลบ</th>}
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={allowAdminDelete ? 7 : 6} className="p-4 text-center text-gray-500">
                        ยังไม่มีข้อมูลใบกำกับภาษี
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice, index) => (
                      <tr key={invoice.id ?? index} className="hover:bg-gray-50">
                        <td className="p-3 border-b">{formatDate(invoice.date)}</td>
                        <td className="p-3 border-b">{invoice.invoiceNumber}</td>
                        <td className="p-3 border-b">{invoice.taxpayerName}</td>
                        <td className="p-3 border-b">{invoice.taxpayerTaxId}</td>
                        <td className="p-3 border-b text-right">{formatNumber(invoice.amount)}</td>
                        <td className="p-3 border-b text-center">
                          {invoice.invoiceImageUrl ? (
                            <img
                              src={invoice.invoiceImageUrl}
                              alt="Invoice"
                              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => {
                                Swal.fire({
                                  imageUrl: invoice.invoiceImageUrl,
                                  imageWidth: '80%',
                                  imageAlt: 'ใบกำกับภาษี',
                                  showCloseButton: true,
                                  showConfirmButton: false
                                });
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<span class="text-gray-400">-</span>';
                              }}
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        {allowAdminDelete && invoice.id != null && (
                          <td className="p-3 border-b text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteTaxInvoice(invoice.id)}
                              disabled={deletingId === invoice.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="ลบรายการ (แอดมิน)"
                            >
                              <i className={`fas ${deletingId === invoice.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                            </button>
                          </td>
                        )}
                        {allowAdminDelete && invoice.id == null && <td className="p-3 border-b"></td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Taxpayer Modal */}
      {showTaxpayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">เพิ่มข้อมูลผู้เสียภาษี</h3>
              <button
                onClick={() => {
                  setShowTaxpayerModal(false);
                  setNewTaxpayer({ name: '', taxId: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ชื่อบริษัท/ผู้เสียภาษี <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTaxpayer.name}
                  onChange={(e) => setNewTaxpayer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="กรอกชื่อบริษัทหรือผู้เสียภาษี"
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  เลขที่ผู้เสียภาษี <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTaxpayer.taxId}
                  onChange={(e) => setNewTaxpayer(prev => ({ ...prev, taxId: e.target.value }))}
                  placeholder="กรอกเลขที่ผู้เสียภาษี"
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveTaxpayer}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button
                  onClick={() => {
                    setShowTaxpayerModal(false);
                    setNewTaxpayer({ name: '', taxId: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxInvoices;

