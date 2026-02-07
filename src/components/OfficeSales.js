/**
 * หน้ายอดขายสำนักงาน (Office): แท็บ RANGSAN + แท็บ SAO
 * โครงสร้างตาม supabase-office-sales.sql
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getTodayDate } from '../utils/dateUtils';
import DateInput from './DateInput';
import Swal from 'sweetalert2';

const OFFICE_SALES_KEYS = [
  'rangsan_store_cash', 'rangsan_store_transfer',
  'rangsan_course_basic_barista', 'rangsan_course_basic_latte_art', 'rangsan_course_latte_art', 'rangsan_course_other',
  'rangsan_equip_brewer', 'rangsan_equip_grinder', 'rangsan_equip_set', 'rangsan_equip_other',
  'rangsan_franchise_franchise', 'rangsan_franchise_app', 'rangsan_franchise_branch_buy',
  'rangsan_online_line', 'rangsan_online_facebook', 'rangsan_online_shopee', 'rangsan_online_lazada', 'rangsan_online_tiktok', 'rangsan_online_other',
  'sao_retrain_fee', 'sao_retrain_other',
  'sao_franchise_franchise', 'sao_franchise_app', 'sao_franchise_branch_buy',
  'sao_online_line', 'sao_online_facebook', 'sao_online_shopee', 'sao_online_lazada', 'sao_online_tiktok', 'sao_online_other'
];

const RANGSAN_FIELDS = [
  {
    section: '1. ยอดขายหน้าร้าน (วัตถุดิบและอุปกรณ์)',
    items: [
      { key: 'rangsan_store_cash', label: 'เงินสด' },
      { key: 'rangsan_store_transfer', label: 'เงินโอน' }
    ]
  },
  {
    section: '2. คอร์สอน',
    items: [
      { key: 'rangsan_course_basic_barista', label: 'เบสิคบาริสต้า' },
      { key: 'rangsan_course_basic_latte_art', label: 'เบสิคบาริสต้าและลาเต้อาร์ต' },
      { key: 'rangsan_course_latte_art', label: 'ลาเต้อาร์ต' },
      { key: 'rangsan_course_other', label: 'อื่นๆ' }
    ]
  },
  {
    section: '3. เครื่องชง เครื่องบด',
    items: [
      { key: 'rangsan_equip_brewer', label: 'เครื่องชง' },
      { key: 'rangsan_equip_grinder', label: 'เครื่องบด' },
      { key: 'rangsan_equip_set', label: 'Set' },
      { key: 'rangsan_equip_other', label: 'อื่นๆ' }
    ]
  },
  {
    section: '4. ยอดขายแฟรนไชส์',
    items: [
      { key: 'rangsan_franchise_franchise', label: 'แฟรนไชส์' },
      { key: 'rangsan_franchise_app', label: 'วัตถุดิบและอุปกรณ์ (App)' },
      { key: 'rangsan_franchise_branch_buy', label: 'ยอดซื้อจากสาขา' }
    ]
  },
  {
    section: '5. ออนไลน์',
    items: [
      { key: 'rangsan_online_line', label: 'LINE' },
      { key: 'rangsan_online_facebook', label: 'Facebook' },
      { key: 'rangsan_online_shopee', label: 'Shopee' },
      { key: 'rangsan_online_lazada', label: 'Lazada' },
      { key: 'rangsan_online_tiktok', label: 'TikTok' },
      { key: 'rangsan_online_other', label: 'Other' }
    ]
  }
];

const SAO_FIELDS = [
  {
    section: '1. การรีเทรนสาขา',
    items: [
      { key: 'sao_retrain_fee', label: 'ค่ารีเทรน' },
      { key: 'sao_retrain_other', label: 'อื่นๆ' }
    ]
  },
  {
    section: '2. ยอดขายแฟรนไชส์ (SAO)',
    items: [
      { key: 'sao_franchise_franchise', label: 'แฟรนไชส์ (SAO)' },
      { key: 'sao_franchise_app', label: 'วัตถุดิบและอุปกรณ์ (App SAO)' },
      { key: 'sao_franchise_branch_buy', label: 'ยอดซื้อจากสาขา' }
    ]
  },
  {
    section: '3. ออนไลน์ (SAO)',
    items: [
      { key: 'sao_online_line', label: 'LINE (SAO)' },
      { key: 'sao_online_facebook', label: 'Facebook (SAO)' },
      { key: 'sao_online_shopee', label: 'Shopee (SAO)' },
      { key: 'sao_online_lazada', label: 'Lazada (SAO)' },
      { key: 'sao_online_tiktok', label: 'TikTok (SAO)' },
      { key: 'sao_online_other', label: 'Other (SAO)' }
    ]
  }
];

const initialForm = () => {
  const o = { date: getTodayDate(), notes: '' };
  OFFICE_SALES_KEYS.forEach(k => { o[k] = ''; });
  return o;
};

function OfficeSales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const branchCode = user?.branchCode || 'OFFICE';
  const [activeTab, setActiveTab] = useState('rangsan');
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branchCode && formData.date) loadForDate(formData.date);
  }, [formData.date, branchCode]);

  const loadForDate = async (dateStr) => {
    setLoading(true);
    try {
      const res = await gasAPI.getOfficeSalesByDate(branchCode, dateStr);
      if (res.status === 'success' && res.data) {
        const data = res.data;
        setFormData(prev => {
          const next = { ...prev, date: prev.date, notes: data.Notes || '' };
          OFFICE_SALES_KEYS.forEach(k => { next[k] = data[k] != null ? String(data[k]) : ''; });
          return next;
        });
      } else {
        setFormData(prev => ({ ...initialForm(), date: prev.date }));
      }
    } catch (e) {
      setFormData(prev => ({ ...initialForm(), date: prev.date }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, branchCode, email: user?.email };
    OFFICE_SALES_KEYS.forEach(k => { payload[k] = parseFloat(formData[k]) || 0; });
    setSaving(true);
    try {
      const res = await gasAPI.saveOfficeSales(payload);
      if (res.status === 'success') {
        Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', text: res.message, timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res.message });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const formatNum = (n) => parseFloat(n) || 0;
  const rangsanTotal = RANGSAN_FIELDS.flatMap(s => s.items).reduce((sum, { key }) => sum + formatNum(formData[key]), 0);
  const saoTotal = SAO_FIELDS.flatMap(s => s.items).reduce((sum, { key }) => sum + formatNum(formData[key]), 0);

  const renderSection = (section) => {
    const sectionTotal = section.items.reduce((sum, { key }) => sum + formatNum(formData[key]), 0);
    return (
      <div key={section.section} className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3 border-b border-slate-200 pb-1">
          <h3 className="text-sm font-bold text-slate-700">{section.section}</h3>
          <span className="text-sm font-bold text-slate-800">
            ยอดรวมหัวข้อ: <span className="text-slate-900">{sectionTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> บาท
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {section.items.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData[key] ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 rounded-xl shadow-lg flex-1">
          <h1 className="text-2xl font-bold flex items-center">
            <i className="fas fa-building mr-3"></i>
            ยอดขายสำนักงาน
          </h1>
          <p className="text-slate-200 mt-1">เก็บยอดขาย RANGSAN และ SAO</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-5 rounded-xl border border-slate-300 transition"
        >
          <i className="fas fa-arrow-left"></i>
          กลับแดชบอร์ด
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-64">
            <label className="block text-sm font-bold text-gray-700 mb-2">วันที่</label>
            <DateInput
              value={formData.date}
              onChange={(v) => setFormData(prev => ({ ...prev, date: v }))}
              max={getTodayDate()}
            />
          </div>
          {loading && (
            <span className="text-slate-500 text-sm flex items-center">
              <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...
            </span>
          )}
        </div>

        {/* แท็บ RANGSAN / SAO */}
        <div>
          <div className="flex border-b border-slate-200 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('rangsan')}
              className={`px-6 py-3 font-bold text-sm border-b-2 transition ${activeTab === 'rangsan' ? 'border-slate-600 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              การเก็บยอดขาย RANGSAN
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sao')}
              className={`px-6 py-3 font-bold text-sm border-b-2 transition ${activeTab === 'sao' ? 'border-slate-600 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              การเก็บยอดขาย SAO
            </button>
          </div>

          {activeTab === 'rangsan' && (
            <div className="py-2">
              {RANGSAN_FIELDS.map(s => renderSection(s))}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <span className="font-bold text-slate-700">รวม RANGSAN: </span>
                <span className="text-lg font-bold text-slate-900">{rangsanTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {activeTab === 'sao' && (
            <div className="py-2">
              {SAO_FIELDS.map(s => renderSection(s))}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <span className="font-bold text-slate-700">รวม SAO: </span>
                <span className="text-lg font-bold text-slate-900">{saoTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500"
            placeholder="หมายเหตุ (ถ้ามี)"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
          >
            {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
}

export default OfficeSales;
