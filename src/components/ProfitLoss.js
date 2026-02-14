import React, { useState, useEffect, useRef } from 'react';
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getTodayDate, formatDateForDisplay } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import DateInput from './DateInput';

/** โครงสร้างส่วนที่ 1 สำหรับ Office (จากหน้ายอดขายสำนักงาน) */
const OFFICE_PNL_RANGSAN = [
  { section: 'RANGSAN 1. ยอดขายหน้าร้าน (วัตถุดิบและอุปกรณ์)', items: [{ key: 'rangsan_store_cash', label: 'เงินสด' }, { key: 'rangsan_store_transfer', label: 'เงินโอน' }] },
  { section: 'RANGSAN 2. คอร์สอน', items: [{ key: 'rangsan_course_basic_barista', label: 'เบสิคบาริสต้า' }, { key: 'rangsan_course_basic_latte_art', label: 'เบสิคบาริสต้าและลาเต้อาร์ต' }, { key: 'rangsan_course_latte_art', label: 'ลาเต้อาร์ต' }, { key: 'rangsan_course_other', label: 'อื่นๆ' }] },
  { section: 'RANGSAN 3. เครื่องชง เครื่องบด', items: [{ key: 'rangsan_equip_brewer', label: 'เครื่องชง' }, { key: 'rangsan_equip_grinder', label: 'เครื่องบด' }, { key: 'rangsan_equip_set', label: 'Set' }, { key: 'rangsan_equip_other', label: 'อื่นๆ' }] },
  { section: 'RANGSAN 4. ยอดขายแฟรนไชส์', items: [{ key: 'rangsan_franchise_franchise', label: 'แฟรนไชส์' }, { key: 'rangsan_franchise_app', label: 'วัตถุดิบและอุปกรณ์ (App)' }, { key: 'rangsan_franchise_branch_buy', label: 'ยอดซื้อจากสาขา' }] },
  { section: 'RANGSAN 5. ออนไลน์', items: [{ key: 'rangsan_online_line', label: 'LINE' }, { key: 'rangsan_online_facebook', label: 'Facebook' }, { key: 'rangsan_online_shopee', label: 'Shopee' }, { key: 'rangsan_online_lazada', label: 'Lazada' }, { key: 'rangsan_online_tiktok', label: 'TikTok' }, { key: 'rangsan_online_other', label: 'Other' }] }
];
const OFFICE_PNL_SAO = [
  { section: 'SAO 1. การรีเทรนสาขา', items: [{ key: 'sao_retrain_fee', label: 'ค่ารีเทรน' }, { key: 'sao_retrain_other', label: 'อื่นๆ' }] },
  { section: 'SAO 2. ยอดขายแฟรนไชส์ (SAO)', items: [{ key: 'sao_franchise_franchise', label: 'แฟรนไชส์ (SAO)' }, { key: 'sao_franchise_app', label: 'วัตถุดิบและอุปกรณ์ (App SAO)' }, { key: 'sao_franchise_branch_buy', label: 'ยอดซื้อจากสาขา' }] },
  { section: 'SAO 3. ออนไลน์ (SAO)', items: [{ key: 'sao_online_line', label: 'LINE (SAO)' }, { key: 'sao_online_facebook', label: 'Facebook (SAO)' }, { key: 'sao_online_shopee', label: 'Shopee (SAO)' }, { key: 'sao_online_lazada', label: 'Lazada (SAO)' }, { key: 'sao_online_tiktok', label: 'TikTok (SAO)' }, { key: 'sao_online_other', label: 'Other (SAO)' }] }
];

const OPEX_CATEGORIES = [
  { key: 'salary', label: 'เงินเดือนพนักงาน' },
  { key: 'daily_wage', label: 'ค่าจ้างรายวัน' },
  { key: 'social_security', label: 'ประกันสังคม' },
  { key: 'overtime', label: 'ค่าล่วงเวลา' },
  { key: 'travel', label: 'ค่าเดินทาง' },
  { key: 'commission', label: 'ค่าคอมมิชชั่น' },
  { key: 'position_allowance', label: 'ค่าตำแหน่ง' },
  { key: 'bonus', label: 'เงินพิเศษ' },
  { key: 'rent', label: 'ค่าเช่าอาคาร' },
  { key: 'electricity', label: 'ค่าไฟฟ้า' },
  { key: 'water', label: 'ค่าน้ำประปา' },
  { key: 'phone', label: 'ค่าโทรศัพท์' },
  { key: 'marketing', label: 'ค่าโฆษณา (การตลาด)' },
  { key: 'spoilage', label: 'สินค้าเสื่อม' },
  { key: 'pos_system', label: 'ค่าระบบ POS' },
  { key: 'other', label: 'อื่นๆ' }
];

function ProfitLoss({ overrideBranchCode, overrideBranchName }) {
  const { user } = useAuth();
  const printRef = useRef(null);

  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [enableVat7, setEnableVat7] = useState(true);
  const [salesSummary, setSalesSummary] = useState(null);
  const [cogsSummary, setCogsSummary] = useState(null);
  const [centralBills, setCentralBills] = useState([]);
  const [opexItems, setOpexItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingOpex, setSavingOpex] = useState(false);
  const [centralBillForm, setCentralBillForm] = useState({ billNo: '', billDate: yearMonth + '-01', amount: '' });
  const [compareYearMonth, setCompareYearMonth] = useState(null);
  const [compareData, setCompareData] = useState(null);

  const branchCode = (overrideBranchCode !== undefined && overrideBranchCode !== '') ? overrideBranchCode : (user?.branchCode || '');
  const branchName = (overrideBranchName !== undefined && overrideBranchName !== '') ? overrideBranchName : (user?.branchName || '');
  const isOffice = user?.role === 'office';

  const loadData = async () => {
    if (!branchCode) return;
    setLoading(true);
    setCompareData(null);
    try {
      const getSales = isOffice ? gasAPI.getPnlOfficeSalesSummary : gasAPI.getPnlSalesSummary;
      const [sales, cogs, bills, opex, settings] = await Promise.all([
        getSales(branchCode, yearMonth),
        gasAPI.getPnlCogsSummary(branchCode, yearMonth),
        gasAPI.getCentralBills(branchCode, yearMonth),
        gasAPI.getOperatingExpensesForMonth(branchCode, yearMonth),
        gasAPI.getPnlSettings(branchCode)
      ]);
      setSalesSummary(sales);
      setCogsSummary(cogs);
      setCentralBills(bills);
      const opexDefault = {};
      OPEX_CATEGORIES.forEach(c => {
        opexDefault[c.key] = opex[c.key] ? { amount: opex[c.key].amount, notes: opex[c.key].notes || '' } : { amount: '', notes: '' };
      });
      setOpexItems(opexDefault);
      setEnableVat7(settings.enableVat7 !== false);

      if (compareYearMonth && compareYearMonth !== yearMonth) {
        try {
          const [cSales, cCogs, cOpex] = await Promise.all([
            getSales(branchCode, compareYearMonth),
            gasAPI.getPnlCogsSummary(branchCode, compareYearMonth),
            gasAPI.getOperatingExpensesForMonth(branchCode, compareYearMonth)
          ]);
          setCompareData({ sales: cSales, cogs: cCogs, opex: cOpex });
        } catch (err) {
          console.error(err);
          setCompareData(null);
        }
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [branchCode, yearMonth, compareYearMonth]);

  const handleSaveVatSetting = async () => {
    const res = await gasAPI.updatePnlSettings(branchCode, { enableVat7 });
    if (res.status === 'success') Swal.fire({ icon: 'success', title: 'บันทึกการตั้งค่าแล้ว', timer: 1500 });
    else Swal.fire({ icon: 'error', text: res.message });
  };

  const handleAddCentralBill = async (e) => {
    e.preventDefault();
    const res = await gasAPI.addCentralBill(branchCode, {
      billNo: centralBillForm.billNo,
      billDate: centralBillForm.billDate,
      amount: centralBillForm.amount
    });
    if (res.status === 'success') {
      setCentralBillForm({ billNo: '', billDate: yearMonth + '-01', amount: '' });
      loadData();
      Swal.fire({ icon: 'success', title: 'เพิ่มบิลแล้ว', timer: 1500 });
    } else Swal.fire({ icon: 'error', text: res.message });
  };

  const handleDeleteCentralBill = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: 'ลบบิลนี้?', icon: 'question', showCancelButton: true });
    if (!isConfirmed) return;
    const res = await gasAPI.deleteCentralBill(id);
    if (res.status === 'success') loadData();
    else Swal.fire({ icon: 'error', text: res.message });
  };

  const handleOpexChange = (key, field, value) => {
    setOpexItems(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleSaveOpex = async () => {
    setSavingOpex(true);
    try {
      const res = await gasAPI.saveOperatingExpensesForMonth(branchCode, yearMonth, opexItems);
      if (res.status === 'success') Swal.fire({ icon: 'success', title: 'บันทึกค่าใช้จ่ายดำเนินการแล้ว', timer: 1500 });
      else Swal.fire({ icon: 'error', text: res.message });
    } finally {
      setSavingOpex(false);
    }
  };

  const formatNum = (n) => (n != null && n !== '') ? parseFloat(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  const safeSales = salesSummary || { totalSales: 0, staffDiscount: 0, promoDiscount: 0, cash: 0, transfer: 0, creditCard: 0, halfHalf: 0, lineman: 0, grab: 0, shopee: 0, robinhood: 0, other: 0 };
  const safeCogs = cogsSummary || { expensePurchase: 0, taxInvoicePurchase: 0, centralBillsTotal: 0, totalCogs: 0 };

  const totalSales = Number(safeSales.totalSales) || 0;
  const vatAmount = enableVat7 ? totalSales - totalSales / 1.07 : 0;
  const salesAfterVat = enableVat7 ? totalSales / 1.07 : totalSales;
  const totalDiscount = (Number(safeSales.staffDiscount) || 0) + (Number(safeSales.promoDiscount) || 0);
  const salesAfterDiscount = salesAfterVat - totalDiscount;

  const inStore = (Number(safeSales.cash) || 0) + (Number(safeSales.transfer) || 0) + (Number(safeSales.creditCard) || 0) + (Number(safeSales.halfHalf) || 0);
  const delivery = (Number(safeSales.lineman) || 0) + (Number(safeSales.grab) || 0) + (Number(safeSales.shopee) || 0) + (Number(safeSales.robinhood) || 0) + (Number(safeSales.other) || 0);

  const totalCogs = Number(safeCogs.totalCogs) || 0;
  const grossProfit = salesAfterDiscount - totalCogs;

  let totalOpex = 0;
  OPEX_CATEGORIES.forEach(c => { totalOpex += parseFloat(opexItems[c.key]?.amount) || 0; });
  const netProfit = grossProfit - totalOpex;

  const monthLabel = yearMonth ? new Date(yearMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) : '';
  const reportDate = formatDateForDisplay(getTodayDate());
  const branchNameEscaped = (branchName || 'สาขา').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const branchCodeEscaped = (branchCode || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const compareMonthLabel = compareYearMonth ? new Date(compareYearMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) : '';
  const cs = compareData?.sales || {};
  const cc = compareData?.cogs || {};
  const co = compareData?.opex || {};
  const compareTotalSales = Number(cs.totalSales) || 0;
  const compareVatAmount = enableVat7 ? compareTotalSales - compareTotalSales / 1.07 : 0;
  const compareSalesAfterVat = enableVat7 ? compareTotalSales / 1.07 : compareTotalSales;
  const compareTotalDiscount = (Number(cs.staffDiscount) || 0) + (Number(cs.promoDiscount) || 0);
  const compareSalesAfterDiscount = compareSalesAfterVat - compareTotalDiscount;
  const compareTotalCogs = Number(cc.totalCogs) || 0;
  const compareGrossProfit = compareSalesAfterDiscount - compareTotalCogs;
  let compareTotalOpex = 0;
  OPEX_CATEGORIES.forEach(c => { compareTotalOpex += parseFloat(co[c.key]?.amount) || 0; });
  const compareNetProfit = compareGrossProfit - compareTotalOpex;

  const diff = (a, b) => (Number(a) || 0) - (Number(b) || 0);
  const pctChange = (a, b) => (b && Number(b)) ? (((Number(a) || 0) - Number(b)) / Number(b) * 100).toFixed(1) + '%' : '-';
  const comparisonRows = [
    { label: 'ยอดขายรวม', curr: totalSales, comp: compareTotalSales },
    { label: 'ยอดขายหลังหักส่วนลด', curr: salesAfterDiscount, comp: compareSalesAfterDiscount },
    { label: 'ต้นทุนสินค้าขาย (COGS)', curr: totalCogs, comp: compareTotalCogs },
    { label: 'กำไรขั้นต้น', curr: grossProfit, comp: compareGrossProfit },
    { label: 'ค่าใช้จ่ายดำเนินการ', curr: totalOpex, comp: compareTotalOpex },
    { label: 'กำไรสุทธิ', curr: netProfit, comp: compareNetProfit }
  ];

  const openExportDocument = () => {
    const pct = (val, base) => (base && Number(base)) ? ((Number(val) || 0) / Number(base) * 100).toFixed(1) + '%' : '-';
    const baseSales = totalSales || 1;
    const baseRevenue = salesAfterDiscount || 1;
    const hasCompare = compareData && compareYearMonth && compareYearMonth !== yearMonth;
    const neg = (v) => (Number(v) < 0 ? ' negative' : '');
    const pos = (v) => (Number(v) > 0 ? ' positive' : '');
    const numClass = (v) => `cell num${neg(v)}${pos(v)}`;
    const diffClass = (d) => (d < 0 ? ' negative' : (d > 0 ? ' positive' : ''));
    const valClass = (label, v) => (label === 'กำไรสุทธิ' ? numClass(v) : 'cell num');
    const pctClass = (curr, comp) => { const b = Number(comp); if (!b) return ''; const pctNum = ((Number(curr) || 0) - b) / b * 100; return pctNum > 0 ? ' positive' : pctNum < 0 ? ' negative' : ''; };
    const compareTableRows = hasCompare ? comparisonRows.map((row) => {
      const d = diff(row.curr, row.comp);
      const pctVal = pctChange(row.curr, row.comp);
      return `<tr><td class="cell">${row.label}</td><td class="${valClass(row.label, row.curr)}">${formatNum(row.curr)}</td><td class="${valClass(row.label, row.comp)}">${formatNum(row.comp)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(row.curr, row.comp)}">${pctVal}</td></tr>`;
    }).join('') : '';

    const cs = compareData?.sales || {};
    const cc = compareData?.cogs || {};
    const co = compareData?.opex || {};
    const cInStore = (Number(cs.cash) || 0) + (Number(cs.transfer) || 0) + (Number(cs.creditCard) || 0) + (Number(cs.halfHalf) || 0);
    const cDelivery = (Number(cs.lineman) || 0) + (Number(cs.grab) || 0) + (Number(cs.shopee) || 0) + (Number(cs.robinhood) || 0) + (Number(cs.other) || 0);
    const cExpenseTax = (Number(cc.expensePurchase) || 0) + (Number(cc.taxInvoicePurchase) || 0);

    const section1OfficeRows = (withCompare) => {
      const rows = [];
      OFFICE_PNL_RANGSAN.forEach(({ section, items }) => {
        const sectionCurr = items.reduce((s, { key }) => s + (Number(safeSales[key]) || 0), 0);
        const sectionComp = items.reduce((s, { key }) => s + (Number(cs[key]) || 0), 0);
        rows.push({ label: section, curr: sectionCurr, comp: sectionComp, isSection: true });
        items.forEach(({ key, label }) => rows.push({ label: '　' + label, curr: safeSales[key], comp: cs[key], indent: 'indent-sub' }));
      });
      OFFICE_PNL_SAO.forEach(({ section, items }) => {
        const sectionCurr = items.reduce((s, { key }) => s + (Number(safeSales[key]) || 0), 0);
        const sectionComp = items.reduce((s, { key }) => s + (Number(cs[key]) || 0), 0);
        rows.push({ label: section, curr: sectionCurr, comp: sectionComp, isSection: true });
        items.forEach(({ key, label }) => rows.push({ label: '　' + label, curr: safeSales[key], comp: cs[key], indent: 'indent-sub' }));
      });
      rows.push({ label: 'ยอดขายรวม', curr: totalSales, comp: compareTotalSales, rowTotal: true });
      rows.push({ label: '　หัก ภาษีมูลค่าเพิ่ม 7% (VAT)', curr: vatAmount, comp: compareVatAmount, indent: 'indent' });
      rows.push({ label: 'ยอดขายหลังหัก VAT', curr: salesAfterVat, comp: compareSalesAfterVat, rowTotal: true });
      rows.push({ label: '　หัก ส่วนลด/โปรโมชั่น', curr: totalDiscount, comp: compareTotalDiscount, indent: 'indent' });
      rows.push({ label: '　　ส่วนลดพนักงาน 50%', curr: safeSales.staffDiscount, comp: cs.staffDiscount, indent: 'indent-2' });
      rows.push({ label: '　　โปรโมชั่น', curr: safeSales.promoDiscount, comp: cs.promoDiscount, indent: 'indent-2' });
      rows.push({ label: 'ยอดขายหลังหักส่วนลด', curr: salesAfterDiscount, comp: compareSalesAfterDiscount, rowTotal: true });
      if (withCompare) return rows.map(r => { if (r.isSection) { const d = diff(r.curr, r.comp); const pctVal = pctChange(r.curr, r.comp); return `<tr class="row-total"><td class="cell font-bold">${r.label}</td><td class="cell num">${formatNum(r.curr)}</td><td class="cell num">${formatNum(r.comp)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(r.curr, r.comp)}">${pctVal}</td></tr>`; } const d = diff(r.curr, r.comp); const pctVal = pctChange(r.curr, r.comp); const trClass = r.rowTotal ? ' class="row-total"' : ''; return `<tr${trClass}><td class="cell ${r.indent || ''}">${r.label}</td><td class="cell num">${formatNum(r.curr)}</td><td class="cell num">${formatNum(r.comp)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(r.curr, r.comp)}">${pctVal}</td></tr>`; }).join('');
      return rows.map(r => { if (r.isSection) return `<tr class="row-total"><td class="cell font-bold">${r.label}</td><td class="cell num">${formatNum(r.curr)}</td><td class="cell num pct">${pct(r.curr, baseSales)}</td></tr>`; return `<tr${r.rowTotal ? ' class="row-total"' : ''}><td class="cell ${r.indent || ''}">${r.label}</td><td class="cell num">${formatNum(r.curr)}</td><td class="cell num pct">${pct(r.curr, baseSales)}</td></tr>`; }).join('');
    };

    const section1RowsWithCompare = hasCompare ? (isOffice ? section1OfficeRows(true) : [
      { label: 'ยอดขายหน้าร้าน', curr: inStore, comp: cInStore },
      { label: '　เงินสด', curr: safeSales.cash, comp: cs.cash, indent: 'indent-sub' },
      { label: '　โอน', curr: safeSales.transfer, comp: cs.transfer, indent: 'indent-sub' },
      { label: '　เครดิต', curr: safeSales.creditCard, comp: cs.creditCard, indent: 'indent-sub' },
      { label: '　คนละครึ่ง', curr: safeSales.halfHalf, comp: cs.halfHalf, indent: 'indent-sub' },
      { label: 'ยอดขายเดลิเวอรี่', curr: delivery, comp: cDelivery },
      { label: '　LINE MAN', curr: safeSales.lineman, comp: cs.lineman, indent: 'indent-sub' },
      { label: '　GRAB', curr: safeSales.grab, comp: cs.grab, indent: 'indent-sub' },
      { label: '　SHOPEE', curr: safeSales.shopee, comp: cs.shopee, indent: 'indent-sub' },
      { label: '　ROBINHOOD', curr: safeSales.robinhood, comp: cs.robinhood, indent: 'indent-sub' },
      { label: '　อื่นๆ', curr: safeSales.other, comp: cs.other, indent: 'indent-sub' },
      { label: 'ยอดขายรวม', curr: totalSales, comp: compareTotalSales, rowTotal: true },
      { label: '　หัก ภาษีมูลค่าเพิ่ม 7% (VAT)', curr: vatAmount, comp: compareVatAmount, indent: 'indent' },
      { label: 'ยอดขายหลังหัก VAT', curr: salesAfterVat, comp: compareSalesAfterVat, rowTotal: true },
      { label: '　หัก ส่วนลด/โปรโมชั่น', curr: totalDiscount, comp: compareTotalDiscount, indent: 'indent' },
      { label: '　　ส่วนลดพนักงาน 50%', curr: safeSales.staffDiscount, comp: cs.staffDiscount, indent: 'indent-2' },
      { label: '　　โปรโมชั่น', curr: safeSales.promoDiscount, comp: cs.promoDiscount, indent: 'indent-2' },
      { label: 'ยอดขายหลังหักส่วนลด', curr: salesAfterDiscount, comp: compareSalesAfterDiscount, rowTotal: true }
    ].map(r => { const d = diff(r.curr, r.comp); const pctVal = pctChange(r.curr, r.comp); const trClass = r.rowTotal ? ' class="row-total"' : ''; return `<tr${trClass}><td class="cell ${r.indent || ''}">${r.label}</td><td class="cell num">${formatNum(r.curr)}</td><td class="cell num">${formatNum(r.comp)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(r.curr, r.comp)}">${pctVal}</td></tr>`; }).join('')) : '';
    const section2RowsWithCompare = hasCompare ? [
      { label: 'ยอดสั่งซื้อวัตถุดิบอื่นๆ (ค่าใช้จ่าย+ใบกำกับ)', curr: (safeCogs.expensePurchase || 0) + (safeCogs.taxInvoicePurchase || 0), comp: cExpenseTax },
      { label: '　จากหน้ากรอกค่าใช้จ่าย (ทุกประเภท)', curr: safeCogs.expensePurchase, comp: cc.expensePurchase, indent: 'indent-2' },
      { label: '　จากหน้าใบกำกับภาษี', curr: safeCogs.taxInvoicePurchase, comp: cc.taxInvoicePurchase, indent: 'indent-2' },
      { label: 'ยอดเบิกใช้วัตถุดิบส่วนกลาง', curr: safeCogs.centralBillsTotal, comp: cc.centralBillsTotal },
      { label: 'หัก: ต้นทุนสินค้าขาย (COGS)', curr: totalCogs, comp: compareTotalCogs, rowTotal: true }
    ].map(r => { const d = diff(r.curr, r.comp); const pctVal = pctChange(r.curr, r.comp); const trClass = r.rowTotal ? ' class="row-total"' : ''; return `<tr${trClass}><td class="cell ${r.indent || ''}">${r.label}</td><td class="cell num">${formatNum(r.curr)}</td><td class="cell num">${formatNum(r.comp)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(r.curr, r.comp)}">${pctVal}</td></tr>`; }).join('') : '';
    const opexRowsWithCompare = hasCompare ? OPEX_CATEGORIES.map(c => {
      const currAmt = (opexItems[c.key]?.amount != null && opexItems[c.key]?.amount !== '') ? parseFloat(opexItems[c.key].amount) : 0;
      const compAmt = parseFloat(co[c.key]?.amount) || 0;
      const d = diff(currAmt, compAmt);
      const pctVal = pctChange(currAmt, compAmt);
      return `<tr><td class="cell indent">${c.label}</td><td class="cell num">${currAmt ? formatNum(currAmt) : '-'}</td><td class="cell num">${compAmt ? formatNum(compAmt) : '-'}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(currAmt, compAmt)}">${pctVal}</td></tr>`;
    }).join('') + (() => { const d = diff(totalOpex, compareTotalOpex); return `<tr class="row-total"><td class="cell">รวมค่าใช้จ่ายดำเนินการ</td><td class="cell num">${formatNum(totalOpex)}</td><td class="cell num">${formatNum(compareTotalOpex)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(totalOpex, compareTotalOpex)}">${pctChange(totalOpex, compareTotalOpex)}</td></tr>`; })() : '';

    const opexRows = OPEX_CATEGORIES.map(c => {
      const amt = opexItems[c.key]?.amount;
      const numAmt = (amt != null && amt !== '') ? parseFloat(amt) : 0;
      const val = numAmt ? formatNum(numAmt) : '-';
      const pctVal = totalOpex ? pct(numAmt, totalOpex) : '-';
      return `<tr><td class="cell indent">${c.label}</td><td class="cell num">${val}</td><td class="cell num pct">${pctVal}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>งบกำไรขาดทุนประจำเดือน - ${branchCodeEscaped || 'รายงาน'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 10mm; }
    body { font-family: 'Sarabun', 'Tahoma', sans-serif; margin: 0; padding: 8px 10px; color: #1f2937; font-size: 10px; line-height: 1.2; }
    .header { text-align: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #1e3a5f; }
    .company { font-size: 14px; font-weight: 700; color: #1e3a5f; margin: 0 0 1px 0; }
    .branch-code { font-size: 10px; color: #6b7280; margin: 0 0 2px 0; }
    .report-title { font-size: 12px; font-weight: 700; color: #111827; margin: 2px 0 1px 0; }
    .period, .report-date { font-size: 10px; color: #374151; margin: 0; }
    section { margin-bottom: 6px; break-inside: avoid; }
    .section-title { font-size: 10px; font-weight: 700; color: #1e3a5f; margin: 0 0 3px 0; padding-bottom: 2px; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th { background: #f1f5f9; font-weight: 700; padding: 4px 6px; text-align: right; }
    thead th:first-child { text-align: left; }
    .cell { padding: 1px 6px; border-bottom: none; vertical-align: top; line-height: 1.25; }
    .cell.num { text-align: right; font-variant-numeric: tabular-nums; }
    .cell.pct { font-size: 9px; color: #6b7280; width: 48px; }
    .indent { padding-left: 20px; }
    .indent-2 { padding-left: 36px; }
    .indent-sub { padding-left: 24px; }
    .row-total { font-weight: 700; background: #f8fafc; }
    .row-total .cell { padding: 2px 6px; border-bottom: 1px solid #e2e8f0; }
    .highlight { font-size: 12px; font-weight: 700; margin: 0; text-align: right; }
    .highlight.profit { color: #047857; }
    .highlight.loss { color: #b91c1c; }
    .highlight .pct { font-size: 10px; color: #6b7280; font-weight: 400; margin-left: 4px; }
    .comp-section { margin-bottom: 8px; padding: 6px 0; border: 1px solid #c7d2fe; border-radius: 4px; background: #eef2ff; }
    .comp-section .section-title { color: #3730a3; }
    .comp-table { margin-top: 4px; }
    .comp-table th { font-weight: 700; background: #c7d2fe; padding: 4px 6px; text-align: right; }
    .comp-table th:first-child { text-align: left; }
    .comp-table .cell.profit { color: #047857; font-weight: 600; }
    .comp-table .cell.loss { color: #b91c1c; font-weight: 600; }
    .cell.negative { color: #b91c1c !important; font-weight: 600; }
    .cell.positive { color: #047857 !important; font-weight: 600; }
    .footer-note { margin-top: 6px; font-size: 9px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 0; font-size: 9px; }
      .header { margin-bottom: 4px; padding-bottom: 4px; }
      section { margin-bottom: 4px; }
      .cell { padding: 0 4px; }
      .indent { padding-left: 20px; }
      .indent-2 { padding-left: 36px; }
      .indent-sub { padding-left: 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="company">${branchNameEscaped}</p>
    <p class="branch-code">${branchCodeEscaped ? `รหัสสาขา: ${branchCodeEscaped}` : ''}</p>
    <h1 class="report-title">งบกำไรขาดทุนประจำเดือน</h1>
    <p class="period">ประจำงวด ${monthLabel}</p>
    <p class="report-date">วันที่จัดทำรายงาน: ${reportDate}</p>
  </div>

  ${hasCompare ? `
  <section class="comp-section">
    <h2 class="section-title">เทียบรายเดือน: ${monthLabel} vs ${compareMonthLabel}</h2>
    <table class="comp-table">
      <thead><tr><th class="cell">รายการ</th><th class="cell num">${monthLabel}</th><th class="cell num">${compareMonthLabel}</th><th class="cell num">ผลต่าง</th><th class="cell num pct">% เปลี่ยน</th></tr></thead>
      <tbody>${compareTableRows}</tbody>
    </table>
  </section>
  ` : ''}

  <section>
    <h2 class="section-title">ส่วนที่ 1 ข้อมูลจากหน้าปิดยอดขาย${isOffice ? ' (ยอดขายสำนักงาน)' : ''}</h2>
    <table>
    ${hasCompare ? `<thead><tr><th class="cell">รายการ</th><th class="cell num">${monthLabel}</th><th class="cell num">${compareMonthLabel}</th><th class="cell num">ผลต่าง</th><th class="cell num pct">% เปลี่ยน</th></tr></thead><tbody>${section1RowsWithCompare}</tbody>` : isOffice ? section1OfficeRows(false) : `
      <tr><td class="cell">ยอดขายหน้าร้าน</td><td class="cell num">${formatNum(inStore)}</td><td class="cell num pct">${pct(inStore, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　เงินสด</td><td class="cell num">${formatNum(safeSales.cash)}</td><td class="cell num pct">${pct(safeSales.cash, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　โอน</td><td class="cell num">${formatNum(safeSales.transfer)}</td><td class="cell num pct">${pct(safeSales.transfer, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　เครดิต</td><td class="cell num">${formatNum(safeSales.creditCard)}</td><td class="cell num pct">${pct(safeSales.creditCard, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　คนละครึ่ง</td><td class="cell num">${formatNum(safeSales.halfHalf)}</td><td class="cell num pct">${pct(safeSales.halfHalf, baseSales)}</td></tr>
      <tr><td class="cell">ยอดขายเดลิเวอรี่</td><td class="cell num">${formatNum(delivery)}</td><td class="cell num pct">${pct(delivery, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　LINE MAN</td><td class="cell num">${formatNum(safeSales.lineman)}</td><td class="cell num pct">${pct(safeSales.lineman, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　GRAB</td><td class="cell num">${formatNum(safeSales.grab)}</td><td class="cell num pct">${pct(safeSales.grab, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　SHOPEE</td><td class="cell num">${formatNum(safeSales.shopee)}</td><td class="cell num pct">${pct(safeSales.shopee, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　ROBINHOOD</td><td class="cell num">${formatNum(safeSales.robinhood)}</td><td class="cell num pct">${pct(safeSales.robinhood, baseSales)}</td></tr>
      <tr><td class="cell indent-sub">　อื่นๆ</td><td class="cell num">${formatNum(safeSales.other)}</td><td class="cell num pct">${pct(safeSales.other, baseSales)}</td></tr>
      <tr class="row-total"><td class="cell">ยอดขายรวม</td><td class="cell num">${formatNum(totalSales)}</td><td class="cell num pct">100.0%</td></tr>
      <tr><td class="cell indent">　หัก ภาษีมูลค่าเพิ่ม 7% (VAT)</td><td class="cell num">${formatNum(vatAmount)}</td><td class="cell num pct">${pct(vatAmount, baseSales)}</td></tr>
      <tr class="row-total"><td class="cell">ยอดขายหลังหัก VAT</td><td class="cell num">${formatNum(salesAfterVat)}</td><td class="cell num pct">${pct(salesAfterVat, baseSales)}</td></tr>
      <tr><td class="cell indent">　หัก ส่วนลด/โปรโมชั่น</td><td class="cell num">${formatNum(totalDiscount)}</td><td class="cell num pct">${pct(totalDiscount, baseSales)}</td></tr>
      <tr><td class="cell indent-2">　　ส่วนลดพนักงาน 50%</td><td class="cell num">${formatNum(safeSales.staffDiscount)}</td><td class="cell num pct">${pct(safeSales.staffDiscount, baseSales)}</td></tr>
      <tr><td class="cell indent-2">　　โปรโมชั่น</td><td class="cell num">${formatNum(safeSales.promoDiscount)}</td><td class="cell num pct">${pct(safeSales.promoDiscount, baseSales)}</td></tr>
      <tr class="row-total"><td class="cell">ยอดขายหลังหักส่วนลด</td><td class="cell num">${formatNum(salesAfterDiscount)}</td><td class="cell num pct">${pct(salesAfterDiscount, baseSales)}</td></tr>
    `}
    </table>
  </section>

  <section>
    <h2 class="section-title">ส่วนที่ 2 ค่าใช้จ่าย (ต้นทุนสินค้าขาย COGS)</h2>
    <table>
    ${hasCompare ? `<thead><tr><th class="cell">รายการ</th><th class="cell num">${monthLabel}</th><th class="cell num">${compareMonthLabel}</th><th class="cell num">ผลต่าง</th><th class="cell num pct">% เปลี่ยน</th></tr></thead><tbody>${section2RowsWithCompare}</tbody>` : `
      <tr><td class="cell">ยอดสั่งซื้อวัตถุดิบอื่นๆ (ค่าใช้จ่าย+ใบกำกับ)</td><td class="cell num">${formatNum((safeCogs.expensePurchase || 0) + (safeCogs.taxInvoicePurchase || 0))}</td><td class="cell num pct">${pct((safeCogs.expensePurchase || 0) + (safeCogs.taxInvoicePurchase || 0), baseRevenue)}</td></tr>
      <tr><td class="cell indent-2">จากหน้ากรอกค่าใช้จ่าย (ทุกประเภท)</td><td class="cell num">${formatNum(safeCogs.expensePurchase)}</td><td class="cell num pct">${totalCogs ? pct(safeCogs.expensePurchase, totalCogs) : '-'}</td></tr>
      <tr><td class="cell indent-2">จากหน้าใบกำกับภาษี</td><td class="cell num">${formatNum(safeCogs.taxInvoicePurchase)}</td><td class="cell num pct">${totalCogs ? pct(safeCogs.taxInvoicePurchase, totalCogs) : '-'}</td></tr>
      <tr><td class="cell">ยอดเบิกใช้วัตถุดิบส่วนกลาง</td><td class="cell num">${formatNum(safeCogs.centralBillsTotal)}</td><td class="cell num pct">${totalCogs ? pct(safeCogs.centralBillsTotal, totalCogs) : '-'}</td></tr>
      <tr class="row-total"><td class="cell">หัก: ต้นทุนสินค้าขาย (COGS)</td><td class="cell num">${formatNum(totalCogs)}</td><td class="cell num pct">${pct(totalCogs, baseRevenue)}</td></tr>
    `}
    </table>
  </section>

  <section>
    <h2 class="section-title">ส่วนที่ 3 กำไรขั้นต้น</h2>
    <p style="margin:0 0 2px 0; color:#6b7280; font-size:9px;">ยอดขายหลังหักส่วนลด − ต้นทุนสินค้าขาย (COGS)</p>
    ${hasCompare ? (() => { const d = diff(grossProfit, compareGrossProfit); return `<table><thead><tr><th class="cell">รายการ</th><th class="cell num">${monthLabel}</th><th class="cell num">${compareMonthLabel}</th><th class="cell num">ผลต่าง</th><th class="cell num pct">% เปลี่ยน</th></tr></thead><tbody><tr><td class="cell">กำไรขั้นต้น</td><td class="cell num">${formatNum(grossProfit)}</td><td class="cell num">${formatNum(compareGrossProfit)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(grossProfit, compareGrossProfit)}">${pctChange(grossProfit, compareGrossProfit)}</td></tr></tbody></table>`; })() : `<p class="highlight ${grossProfit >= 0 ? 'profit' : 'loss'}">${formatNum(grossProfit)} <span class="pct">(${pct(grossProfit, baseRevenue)})</span></p>`}
  </section>

  <section>
    <h2 class="section-title">ส่วนที่ 4 ค่าใช้จ่ายในการดำเนินงาน (Operating Expenses)</h2>
    <table>
    ${hasCompare ? `<thead><tr><th class="cell">รายการ</th><th class="cell num">${monthLabel}</th><th class="cell num">${compareMonthLabel}</th><th class="cell num">ผลต่าง</th><th class="cell num pct">% เปลี่ยน</th></tr></thead><tbody>${opexRowsWithCompare}</tbody>` : `
      ${opexRows}
      <tr class="row-total"><td class="cell">รวมค่าใช้จ่ายดำเนินการ</td><td class="cell num">${formatNum(totalOpex)}</td><td class="cell num pct">${pct(totalOpex, baseRevenue)}</td></tr>
    `}
    </table>
  </section>

  <section>
    <h2 class="section-title">ส่วนที่ 5 กำไรสุทธิ (Net Profit)</h2>
    <p style="margin:0 0 2px 0; color:#6b7280; font-size:9px;">กำไรขั้นต้น − ค่าใช้จ่ายในการดำเนินงาน</p>
    ${hasCompare ? (() => { const d = diff(netProfit, compareNetProfit); return `<table><thead><tr><th class="cell">รายการ</th><th class="cell num">${monthLabel}</th><th class="cell num">${compareMonthLabel}</th><th class="cell num">ผลต่าง</th><th class="cell num pct">% เปลี่ยน</th></tr></thead><tbody><tr><td class="cell">กำไรสุทธิ</td><td class="${numClass(netProfit)}">${formatNum(netProfit)}</td><td class="${numClass(compareNetProfit)}">${formatNum(compareNetProfit)}</td><td class="cell num${diffClass(d)}">${d >= 0 ? '+' : ''}${formatNum(d)}</td><td class="cell num pct${pctClass(netProfit, compareNetProfit)}">${pctChange(netProfit, compareNetProfit)}</td></tr></tbody></table>`; })() : `<p class="highlight ${netProfit >= 0 ? 'profit' : 'loss'}">${formatNum(netProfit)} <span class="pct">(${pct(netProfit, baseRevenue)})</span></p>`}
  </section>

  <p class="footer-note">เอกสารนี้จัดทำจากระบบ KebYod App · ใช้สำหรับการอ้างอิงภายใน</p>
</body>
</html>`;

    // ใช้ iframe แทน window.open() เพื่อไม่ถูก pop-up blocker
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'งบกำไรขาดทุน - ส่งออก');
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;overflow:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      Swal.fire({ icon: 'error', title: 'ไม่สามารถเตรียมเอกสารได้', text: 'กรุณาลองใหม่อีกครั้ง' });
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const printWin = iframe.contentWindow;
    if (printWin) {
      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        try {
          printWin.focus();
          printWin.print();
        } catch (e) {
          console.error('Print error:', e);
          Swal.fire({ icon: 'warning', title: 'ไม่สามารถเปิดหน้าพิมพ์ได้', text: 'กรุณาลองสั่งพิมพ์อีกครั้งหรือเลือก Save as PDF' });
        }
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 500);
      };
      printWin.onload = () => setTimeout(doPrint, 100);
      if (doc.readyState === 'complete') setTimeout(doPrint, 100);
    } else {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <i className="fas fa-file-invoice-dollar mr-2 text-indigo-600"></i>
        งบกำไรขาดทุนประจำเดือน
      </h2>

      <div className="flex flex-wrap gap-4 items-center mb-6">
        <label className="font-bold text-gray-700">เดือน:</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-3 py-2"
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enableVat7} onChange={(e) => setEnableVat7(e.target.checked)} />
          <span>คิด VAT 7%</span>
        </label>
        <label className="flex items-center gap-2 ml-2 border-l pl-4 border-gray-300">
          <input type="checkbox" checked={!!compareYearMonth} onChange={(e) => { if (e.target.checked && !compareYearMonth) { const d = new Date(yearMonth + '-01'); d.setMonth(d.getMonth() - 1); setCompareYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); } else if (!e.target.checked) setCompareYearMonth(null); }} />
          <span>เทียบกับเดือน</span>
        </label>
        {compareYearMonth && (
          <input
            type="month"
            value={compareYearMonth}
            onChange={(e) => setCompareYearMonth(e.target.value || null)}
            className="border-2 border-gray-300 rounded-lg px-3 py-2"
            title="เลือกเดือนที่ต้องการเทียบ"
          />
        )}
        <button type="button" onClick={handleSaveVatSetting} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">บันทึกการตั้งค่า</button>
        <button type="button" onClick={loadData} className="bg-blue-600 text-white px-3 py-1 rounded text-sm" disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
      ) : (
        <div ref={printRef} className="space-y-6">
          {compareData && compareYearMonth && compareYearMonth !== yearMonth && (
            <section className="bg-indigo-50 rounded-xl shadow p-6 border border-indigo-200">
              <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center">
                <i className="fas fa-balance-scale mr-2"></i>
                เทียบรายเดือน: {monthLabel} vs {compareMonthLabel}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-indigo-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-indigo-100">
                      <th className="text-left py-2 px-3">รายการ</th>
                      <th className="text-right py-2 px-3">{monthLabel}</th>
                      <th className="text-right py-2 px-3">{compareMonthLabel}</th>
                      <th className="text-right py-2 px-3">ผลต่าง</th>
                      <th className="text-right py-2 px-3">% เปลี่ยน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => {
                      const d = diff(row.curr, row.comp);
                      const pct = pctChange(row.curr, row.comp);
                      const pctNum = row.comp && Number(row.comp) ? ((Number(row.curr) || 0) - Number(row.comp)) / Number(row.comp) * 100 : null;
                      const redClass = 'text-red-600 font-medium';
                      const greenClass = 'text-green-600 font-medium';
                      const isNetProfit = row.label === 'กำไรสุทธิ';
                      const valCurrClass = isNetProfit ? (Number(row.curr) < 0 ? redClass : Number(row.curr) > 0 ? greenClass : '') : '';
                      const valCompClass = isNetProfit ? (Number(row.comp) < 0 ? redClass : Number(row.comp) > 0 ? greenClass : '') : 'text-gray-600';
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
                          <td className="py-2 px-3 font-medium">{row.label}</td>
                          <td className={`text-right py-2 px-3 tabular-nums ${valCurrClass}`}>{formatNum(row.curr)}</td>
                          <td className={`text-right py-2 px-3 tabular-nums ${valCompClass}`}>{formatNum(row.comp)}</td>
                          <td className={`text-right py-2 px-3 tabular-nums ${d < 0 ? redClass : d > 0 ? greenClass : ''}`}>{d >= 0 ? '+' : ''}{formatNum(d)}</td>
                          <td className={`text-right py-2 px-3 tabular-nums ${pctNum != null && pctNum < 0 ? redClass : pctNum != null && pctNum > 0 ? greenClass : 'text-gray-600'}`}>{pct}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {/* ส่วนที่ 1 — สาขา: หน้าร้าน/เดลิเวอรี่ | Office: ยอดขายสำนักงาน RANGSAN/SAO */}
          <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">ส่วนที่ 1 ข้อมูลจากหน้าปิดยอดขาย{isOffice ? ' (ยอดขายสำนักงาน)' : ''}</h3>
            <table className="w-full text-sm">
              <tbody>
                {isOffice ? (
                  <>
                    {OFFICE_PNL_RANGSAN.map(({ section, items }) => {
                      const sectionTotal = items.reduce((sum, { key }) => sum + (Number(safeSales[key]) || 0), 0);
                      return (
                        <React.Fragment key={section}>
                          <tr>
                            <td className="py-1 font-medium">{section}</td>
                            <td className="text-right font-medium">{formatNum(sectionTotal)}</td>
                          </tr>
                          {items.map(({ key, label }) => (
                            <tr key={key}><td className="pl-4">{label}</td><td className="text-right">{formatNum(safeSales[key])}</td></tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    {OFFICE_PNL_SAO.map(({ section, items }) => {
                      const sectionTotal = items.reduce((sum, { key }) => sum + (Number(safeSales[key]) || 0), 0);
                      return (
                        <React.Fragment key={section}>
                          <tr>
                            <td className="py-1 font-medium">{section}</td>
                            <td className="text-right font-medium">{formatNum(sectionTotal)}</td>
                          </tr>
                          {items.map(({ key, label }) => (
                            <tr key={key}><td className="pl-4">{label}</td><td className="text-right">{formatNum(safeSales[key])}</td></tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    <tr className="border-t font-bold"><td className="py-2">1. ยอดขายรวม</td><td className="text-right">{formatNum(totalSales)}</td></tr>
                    <tr><td>2. หัก ภาษีมูลค่าเพิ่ม 7% (VAT)</td><td className="text-right">{formatNum(vatAmount)}</td></tr>
                    <tr className="border-t font-bold"><td className="py-2">3. ยอดขายหลังหัก VAT</td><td className="text-right">{formatNum(salesAfterVat)}</td></tr>
                    <tr><td>4. หัก ส่วนลด/โปรโมชั่น</td><td className="text-right">{formatNum(totalDiscount)}</td></tr>
                    <tr><td className="pl-4">4.1 ส่วนลดพนักงาน 50%</td><td className="text-right">{formatNum(safeSales.staffDiscount)}</td></tr>
                    <tr><td className="pl-4">4.2 โปรโมชั่น</td><td className="text-right">{formatNum(safeSales.promoDiscount)}</td></tr>
                    <tr className="border-t font-bold"><td className="py-2">ยอดขายหลังหักส่วนลด</td><td className="text-right">{formatNum(salesAfterDiscount)}</td></tr>
                  </>
                ) : (
                  <>
                    <tr><td className="py-1">ยอดขายหน้าร้าน</td><td className="text-right font-medium">{formatNum(inStore)}</td></tr>
                    <tr><td className="pl-4">   - เงินสด</td><td className="text-right">{formatNum(safeSales.cash)}</td></tr>
                    <tr><td className="pl-4">   - โอน</td><td className="text-right">{formatNum(safeSales.transfer)}</td></tr>
                    <tr><td className="pl-4">   - เครดิต</td><td className="text-right">{formatNum(safeSales.creditCard)}</td></tr>
                    <tr><td className="pl-4">   - คนละครึ่ง</td><td className="text-right">{formatNum(safeSales.halfHalf)}</td></tr>
                    <tr><td className="py-1">ยอดขายเดลิเวอรี่</td><td className="text-right font-medium">{formatNum(delivery)}</td></tr>
                    <tr><td className="pl-4">   - LINE MAN</td><td className="text-right">{formatNum(safeSales.lineman)}</td></tr>
                    <tr><td className="pl-4">   - GRAB</td><td className="text-right">{formatNum(safeSales.grab)}</td></tr>
                    <tr><td className="pl-4">   - SHOPEE</td><td className="text-right">{formatNum(safeSales.shopee)}</td></tr>
                    <tr><td className="pl-4">   - ROBINHOOD</td><td className="text-right">{formatNum(safeSales.robinhood)}</td></tr>
                    <tr><td className="pl-4">   - อื่นๆ</td><td className="text-right">{formatNum(safeSales.other)}</td></tr>
                    <tr className="border-t font-bold"><td className="py-2">1. ยอดขายรวม</td><td className="text-right">{formatNum(totalSales)}</td></tr>
                    <tr><td>2. หัก ภาษีมูลค่าเพิ่ม 7% (VAT)</td><td className="text-right">{formatNum(vatAmount)}</td></tr>
                    <tr className="border-t font-bold"><td className="py-2">3. ยอดขายหลังหัก VAT</td><td className="text-right">{formatNum(salesAfterVat)}</td></tr>
                    <tr><td>4. หัก ส่วนลด/โปรโมชั่น</td><td className="text-right">{formatNum(totalDiscount)}</td></tr>
                    <tr><td className="pl-4">4.1 ส่วนลดพนักงาน 50%</td><td className="text-right">{formatNum(safeSales.staffDiscount)}</td></tr>
                    <tr><td className="pl-4">4.2 โปรโมชั่น</td><td className="text-right">{formatNum(safeSales.promoDiscount)}</td></tr>
                    <tr className="border-t font-bold"><td className="py-2">ยอดขายหลังหักส่วนลด</td><td className="text-right">{formatNum(salesAfterDiscount)}</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </section>

          {/* ส่วนที่ 2 */}
          <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">ส่วนที่ 2 ค่าใช้จ่าย (ต้นทุนสินค้าขาย COGS)</h3>
            <table className="w-full text-sm mb-4">
              <tbody>
                <tr><td>ยอดสั่งซื้อวัตถุดิบอื่นๆ (ค่าใช้จ่าย+ใบกำกับ)</td><td className="text-right">{formatNum((safeCogs.expensePurchase || 0) + (safeCogs.taxInvoicePurchase || 0))}</td></tr>
                <tr><td className="pl-4">- จากหน้ากรอกค่าใช้จ่าย (ทุกประเภท)</td><td className="text-right">{formatNum(safeCogs.expensePurchase)}</td></tr>
                <tr><td className="pl-4">- จากหน้าใบกำกับภาษี</td><td className="text-right">{formatNum(safeCogs.taxInvoicePurchase)}</td></tr>
                <tr><td>ยอดเบิกใช้วัตถุดิบส่วนกลาง</td><td className="text-right">{formatNum(safeCogs.centralBillsTotal)}</td></tr>
                <tr className="border-t font-bold"><td className="py-2">หัก: ต้นทุนสินค้าขาย (COGS)</td><td className="text-right">{formatNum(totalCogs)}</td></tr>
              </tbody>
            </table>
            <div className="border-t pt-4">
              <p className="font-bold text-gray-700 mb-2">เพิ่มบิล/ใบเสร็จจากส่วนกลาง</p>
              <form onSubmit={handleAddCentralBill} className="flex flex-wrap gap-2 items-end">
                <input type="text" placeholder="เลขที่บิล" value={centralBillForm.billNo} onChange={(e) => setCentralBillForm(f => ({ ...f, billNo: e.target.value }))} className="border rounded px-2 py-1 w-32" />
                <DateInput value={centralBillForm.billDate} onChange={(v) => setCentralBillForm(f => ({ ...f, billDate: v }))} className="min-w-[140px]" name="centralBillDate" />
                <input type="number" step="0.01" placeholder="ยอดซื้อ" value={centralBillForm.amount} onChange={(e) => setCentralBillForm(f => ({ ...f, amount: e.target.value }))} className="border rounded px-2 py-1 w-28" />
                <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">เพิ่ม</button>
              </form>
              {centralBills.length > 0 && (
                <ul className="mt-2 text-sm">
                  {centralBills.map(b => (
                    <li key={b.id} className="flex justify-between items-center py-1">
                      <span>{b.BillNo || '-'} {b.BillDate ? formatDateForDisplay(b.BillDate) : ''}</span>
                      <span className="flex items-center gap-2">
                        <span>{formatNum(b.Amount)}</span>
                        <button type="button" onClick={() => handleDeleteCentralBill(b.id)} className="text-red-600 text-xs">ลบ</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ส่วนที่ 3 */}
          <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">ส่วนที่ 3 กำไรขั้นต้น</h3>
            <p className="text-sm text-gray-600">ยอดขายหลังหักส่วนลด - ต้นทุนสินค้าขาย (COGS)</p>
            <p className="text-xl font-bold text-green-700 mt-2 text-right">{formatNum(grossProfit)}</p>
          </section>

          {/* ส่วนที่ 4 */}
          <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">ส่วนที่ 4 ค่าใช้จ่ายในการดำเนินงาน (Operating Expenses)</h3>
            <p className="text-sm text-gray-600 mb-4">กรอกและบันทึกตามเดือน</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">รายการ</th>
                    <th className="text-right w-32">จำนวนเงิน</th>
                    <th className="text-left w-40">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {OPEX_CATEGORIES.map(c => (
                    <tr key={c.key} className="border-b border-gray-100">
                      <td className="py-1">{c.label}</td>
                      <td className="py-1">
                        <input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-right" value={opexItems[c.key]?.amount ?? ''} onChange={(e) => handleOpexChange(c.key, 'amount', e.target.value)} onFocus={(e) => { if (e.target.value === '0' || e.target.value === '0.00') e.target.select(); }} />
                      </td>
                      <td className="py-1"><input type="text" className="w-full border rounded px-2 py-1" placeholder="-" value={opexItems[c.key]?.notes ?? ''} onChange={(e) => handleOpexChange(c.key, 'notes', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="font-bold">รวมค่าใช้จ่ายดำเนินการ</span>
              <span className="font-bold text-red-600">{formatNum(totalOpex)}</span>
            </div>
            <button type="button" onClick={handleSaveOpex} disabled={savingOpex} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">{savingOpex ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่ายดำเนินการ'}</button>
          </section>

          {/* ส่วนที่ 5 */}
          <section className="bg-white rounded-xl shadow p-6 border-2 border-indigo-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">ส่วนที่ 5 กำไรสุทธิ (Net Profit)</h3>
            <p className="text-sm text-gray-600">กำไรขั้นต้น - ค่าใช้จ่ายในการดำเนินงาน</p>
            <p className={`text-2xl font-bold mt-2 text-right ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatNum(netProfit)}</p>
          </section>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button type="button" onClick={openExportDocument} className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium">
          <i className="fas fa-file-pdf mr-2"></i>ส่งออกรายงาน (พิมพ์/PDF)
        </button>
      </div>
    </div>
  );
}

export default ProfitLoss;
