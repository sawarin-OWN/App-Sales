import React, { useState, useEffect, useMemo } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import '../config/chart';
import { gasAPI } from '../services/api';
import { useDataCache } from '../context/DataCacheContext';
import { getTodayDate, getFirstDayOfCurrentMonth, formatDateForDisplay } from '../utils/dateUtils';
import DateInput from './DateInput';
import Swal from 'sweetalert2';
import ProfitLoss from './ProfitLoss';
import Dashboard from './Dashboard';
import Sales from './Sales';
import Expenses from './Expenses';
import Deposits from './Deposits';
import TaxInvoices from './TaxInvoices';

function Admin() {
  const { getCachedData, setCachedData } = useDataCache();
  
  // รายชื่อสาขา (ดึงจาก backend)
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  
  const [selectedBranch, setSelectedBranch] = useState('ALL'); // 'ALL' = รวมทุกสาขา
  const [selectedBranches, setSelectedBranches] = useState([]); // Array of selected branch codes
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [data, setData] = useState({
    totalSales: 0,
    netProfit: 0,
    totalExpenses: 0,
    totalRecords: 0,
    sales: [],
    charts: { line: { labels: [], sales: [] }, pie: { labels: [], data: [] } },
    branchData: [] // ข้อมูลแยกตามสาขา
  });
  const [depositData, setDepositData] = useState({
    totalDeposits: 0,
    totalPendingBalance: 0,
    branchDeposits: [] // ข้อมูลการนำฝากแยกตามสาขา
  });
  const [loading, setLoading] = useState(true);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  // วันที่เริ่มต้น = วันที่ 1 ของเดือนปัจจุบัน, วันที่สิ้นสุด = วันที่ปัจจุบัน (ใช้ local date)
  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(getTodayDate());

  const [pnlMode, setPnlMode] = useState('single');
  const [pnlBranch, setPnlBranch] = useState('');
  const [pnlCompareBranches, setPnlCompareBranches] = useState([]);
  const [pnlYearMonth, setPnlYearMonth] = useState(() => getFirstDayOfCurrentMonth().slice(0, 7));
  const [pnlCompareYearMonth, setPnlCompareYearMonth] = useState('');
  const [pnlCompareData, setPnlCompareData] = useState([]);
  const [loadingPnlCompare, setLoadingPnlCompare] = useState(false);

  // แท็บหลัก Admin: หลังบ้าน | แดชบอร์ด P&L
  const [adminSection, setAdminSection] = useState('backoffice');
  // แดชบอร์ด P&L: สรุปทุกสาขาจากงบกำไรขาดทุน สำหรับวิเคราะห์เชิงลึก
  const [pnlDashboardBranches, setPnlDashboardBranches] = useState([]);
  const [pnlDashboardYearMonth, setPnlDashboardYearMonth] = useState(() => getFirstDayOfCurrentMonth().slice(0, 7));
  const [pnlDashboardCompareYearMonth, setPnlDashboardCompareYearMonth] = useState('');
  const [pnlDashboardData, setPnlDashboardData] = useState([]);
  const [loadingPnlDashboard, setLoadingPnlDashboard] = useState(false);

  // เลือกสาขาเดียวแล้วเข้าไปแก้ไขข้อมูลสาขานั้น (ปิดยอด, ค่าใช้จ่าย, นำฝาก, ใบกำกับ, งบ P&L)
  const [adminEditTab, setAdminEditTab] = useState('overview');

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      loadAdminData();
      loadDepositData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, selectedBranches, startDate, endDate, branches.length]);

  // ปิด dropdown เมื่อคลิกนอกพื้นที่
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBranchSelector && !event.target.closest('.branch-selector-container')) {
        setShowBranchSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBranchSelector]);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const result = await gasAPI.getAllBranches();
      if (result && result.status === 'success' && result.data) {
        setBranches(result.data);
      } else {
        console.error('Error loading branches:', result);
        Swal.fire({
          icon: 'warning',
          title: 'ไม่สามารถโหลดรายชื่อสาขาได้',
          text: result?.message || 'กรุณาลองใหม่อีกครั้ง'
        });
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดรายชื่อสาขาได้'
      });
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadAdminData = async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      if (selectedBranch === 'ALL') {
        // โหลดข้อมูลทุกสาขา
        await loadAllBranchesData(forceRefresh);
      } else if (selectedBranches.length > 0) {
        // โหลดข้อมูลหลายสาขาที่เลือก
        await loadMultipleBranchesData(selectedBranches, forceRefresh);
      } else if (selectedBranch !== 'ALL') {
        // โหลดข้อมูลสาขาเดียว
        await loadSingleBranchData(selectedBranch, forceRefresh);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถโหลดข้อมูลได้'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMultipleBranchesData = async (branchCodes, forceRefresh = false) => {
    const cacheKey = `admin_dashboard_${branchCodes.join('_')}_${startDate}_${endDate}`;
    const params = { branchCodes, startDate, endDate };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }
    
    // โหลดข้อมูลหลายสาขา
    const branchDataPromises = branchCodes.map(branchCode => {
      const branch = branches.find(b => b.code === branchCode);
      return gasAPI.getDashboardData(branchCode, startDate, endDate)
        .then(result => ({
          branchCode: branchCode,
          branchName: branch?.name || branchCode,
          data: result
        }))
        .catch(error => {
          console.error(`Error loading data for ${branchCode}:`, error);
          return {
            branchCode: branchCode,
            branchName: branch?.name || branchCode,
            data: {
              totalSales: 0,
              netProfit: 0,
              totalExpenses: 0,
              totalRecords: 0,
              sales: [],
              charts: { line: { labels: [], sales: [] }, pie: { labels: [], data: [] } }
            }
          };
        });
    });
    
    const branchDataResults = await Promise.all(branchDataPromises);
    
    // รวมข้อมูลหลายสาขา
    const aggregatedData = {
      totalSales: 0,
      netProfit: 0,
      totalExpenses: 0,
      totalRecords: 0,
      sales: [],
      charts: { 
        line: { labels: [], sales: [] }, 
        pie: { labels: [], data: [] } 
      },
      branchData: branchDataResults
    };
    
    // รวมยอดขาย, กำไร, ค่าใช้จ่าย
    branchDataResults.forEach(({ data: branchData }) => {
      aggregatedData.totalSales += parseFloat(branchData.totalSales || 0);
      aggregatedData.netProfit += parseFloat(branchData.netProfit || 0);
      aggregatedData.totalExpenses += parseFloat(branchData.totalExpenses || 0);
      aggregatedData.totalRecords += parseInt(branchData.totalRecords || 0);
      
      // รวม sales
      if (branchData.sales && Array.isArray(branchData.sales)) {
        aggregatedData.sales = aggregatedData.sales.concat(branchData.sales);
      }
    });
    
    // สร้างกราฟจากข้อมูลรวม
    if (aggregatedData.sales.length > 0) {
      // จัดกลุ่มตามวันที่
      const salesByDate = {};
      aggregatedData.sales.forEach(sale => {
        const date = sale.date || '';
        if (!salesByDate[date]) {
          salesByDate[date] = {
            date: date,
            total: 0,
            cash: 0,
            transfer: 0,
            creditCard: 0,
            delivery: 0
          };
        }
        salesByDate[date].total += parseFloat(sale.total || 0);
        salesByDate[date].cash += parseFloat(sale.cash || 0);
        salesByDate[date].transfer += parseFloat(sale.transfer || 0);
        salesByDate[date].creditCard += parseFloat(sale.creditCard || 0);
        const delivery = (parseFloat(sale.grab || 0) + parseFloat(sale.lineman || 0) + 
                         parseFloat(sale.shopee || 0) + parseFloat(sale.robinhood || 0));
        salesByDate[date].delivery += delivery;
      });
      
      // สร้าง line chart data
      const sortedDates = Object.keys(salesByDate).sort();
      aggregatedData.charts.line.labels = sortedDates;
      aggregatedData.charts.line.sales = sortedDates.map(date => salesByDate[date].total);
      
      // สร้าง pie chart data (ช่องทางชำระเงิน)
      aggregatedData.charts.pie.labels = ['เงินสด', 'โอน', 'Credit Card', 'Delivery'];
      aggregatedData.charts.pie.data = [
        sortedDates.reduce((sum, date) => sum + salesByDate[date].cash, 0),
        sortedDates.reduce((sum, date) => sum + salesByDate[date].transfer, 0),
        sortedDates.reduce((sum, date) => sum + salesByDate[date].creditCard, 0),
        sortedDates.reduce((sum, date) => sum + salesByDate[date].delivery, 0)
      ];
    }
    
    setData(aggregatedData);
    setCachedData(cacheKey, aggregatedData, params);
  };

  const loadSingleBranchData = async (branchCode, forceRefresh = false) => {
    const cacheKey = `admin_dashboard_${branchCode}_${startDate}_${endDate}`;
    const params = { branchCode, startDate, endDate };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }
    
    const result = await gasAPI.getDashboardData(branchCode, startDate, endDate);
    if (result.status === 'success' || result.totalSales !== undefined) {
      setData(result);
      setCachedData(cacheKey, result, params);
    } else {
      throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลได้');
    }
  };

  const loadAllBranchesData = async (forceRefresh = false) => {
    const cacheKey = `admin_dashboard_ALL_${startDate}_${endDate}`;
    const params = { startDate, endDate, allBranches: true };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }
    
    // โหลดข้อมูลทุกสาขา
    const branchDataPromises = branches.map(branch => 
      gasAPI.getDashboardData(branch.code, startDate, endDate)
        .then(result => ({
          branchCode: branch.code,
          branchName: branch.name,
          data: result
        }))
        .catch(error => {
          console.error(`Error loading data for ${branch.code}:`, error);
          return {
            branchCode: branch.code,
            branchName: branch.name,
            data: {
              totalSales: 0,
              netProfit: 0,
              totalExpenses: 0,
              totalRecords: 0,
              sales: [],
              charts: { line: { labels: [], sales: [] }, pie: { labels: [], data: [] } }
            }
          };
        })
    );
    
    const branchDataResults = await Promise.all(branchDataPromises);
    
    // รวมข้อมูลทุกสาขา
    const aggregatedData = {
      totalSales: 0,
      netProfit: 0,
      totalExpenses: 0,
      totalRecords: 0,
      sales: [],
      charts: { 
        line: { labels: [], sales: [] }, 
        pie: { labels: [], data: [] } 
      },
      branchData: branchDataResults
    };
    
    // รวมยอดขาย, กำไร, ค่าใช้จ่าย
    branchDataResults.forEach(({ data: branchData }) => {
      aggregatedData.totalSales += parseFloat(branchData.totalSales || 0);
      aggregatedData.netProfit += parseFloat(branchData.netProfit || 0);
      aggregatedData.totalExpenses += parseFloat(branchData.totalExpenses || 0);
      aggregatedData.totalRecords += parseInt(branchData.totalRecords || 0);
      
      // รวม sales
      if (branchData.sales && Array.isArray(branchData.sales)) {
        aggregatedData.sales = aggregatedData.sales.concat(branchData.sales);
      }
    });
    
    // สร้างกราฟจากข้อมูลรวม
    if (aggregatedData.sales.length > 0) {
      // จัดกลุ่มตามวันที่
      const salesByDate = {};
      aggregatedData.sales.forEach(sale => {
        const date = sale.date || '';
        if (!salesByDate[date]) {
          salesByDate[date] = {
            date: date,
            total: 0,
            cash: 0,
            transfer: 0,
            creditCard: 0,
            delivery: 0
          };
        }
        salesByDate[date].total += parseFloat(sale.total || 0);
        salesByDate[date].cash += parseFloat(sale.cash || 0);
        salesByDate[date].transfer += parseFloat(sale.transfer || 0);
        salesByDate[date].creditCard += parseFloat(sale.creditCard || 0);
        const delivery = (parseFloat(sale.grab || 0) + parseFloat(sale.lineman || 0) + 
                         parseFloat(sale.shopee || 0) + parseFloat(sale.robinhood || 0));
        salesByDate[date].delivery += delivery;
      });
      
      // สร้าง line chart data
      const sortedDates = Object.keys(salesByDate).sort();
      aggregatedData.charts.line.labels = sortedDates;
      aggregatedData.charts.line.sales = sortedDates.map(date => salesByDate[date].total);
      
      // สร้าง pie chart data (ช่องทางชำระเงิน)
      aggregatedData.charts.pie.labels = ['เงินสด', 'โอน', 'Credit Card', 'Delivery'];
      aggregatedData.charts.pie.data = [
        sortedDates.reduce((sum, date) => sum + salesByDate[date].cash, 0),
        sortedDates.reduce((sum, date) => sum + salesByDate[date].transfer, 0),
        sortedDates.reduce((sum, date) => sum + salesByDate[date].creditCard, 0),
        sortedDates.reduce((sum, date) => sum + salesByDate[date].delivery, 0)
      ];
    }
    
    setData(aggregatedData);
    setCachedData(cacheKey, aggregatedData, params);
  };

  const loadDepositData = async (forceRefresh = false) => {
    setLoadingDeposits(true);
    
    try {
      if (selectedBranch === 'ALL') {
        await loadAllBranchesDeposits(forceRefresh);
      } else if (selectedBranches.length > 0) {
        await loadMultipleBranchesDeposits(selectedBranches, forceRefresh);
      } else if (selectedBranch !== 'ALL') {
        await loadSingleBranchDeposits(selectedBranch, forceRefresh);
      }
    } catch (error) {
      console.error('Error loading deposit data:', error);
    } finally {
      setLoadingDeposits(false);
    }
  };

  const loadMultipleBranchesDeposits = async (branchCodes, forceRefresh = false) => {
    const cacheKey = `admin_deposits_${branchCodes.join('_')}`;
    const params = { branchCodes };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setDepositData(cachedData);
        return;
      }
    }
    
    // โหลดข้อมูลการนำฝากหลายสาขา
    const depositPromises = branchCodes.map(branchCode => {
      const branch = branches.find(b => b.code === branchCode);
      return gasAPI.getDepositInfo(branchCode)
        .then(result => {
          const totalDeposits = result && result.history && Array.isArray(result.history)
            ? result.history.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
            : 0;
          
          return {
            branchCode: branchCode,
            branchName: branch?.name || branchCode,
            deposits: result && result.history ? result.history : [],
            pendingBalance: result && result.pendingBalance ? result.pendingBalance : 0,
            totalDeposits: totalDeposits
          };
        })
        .catch(error => {
          console.error(`Error loading deposits for ${branchCode}:`, error);
          return {
            branchCode: branchCode,
            branchName: branch?.name || branchCode,
            deposits: [],
            pendingBalance: 0,
            totalDeposits: 0
          };
        });
    });
    
    const branchDepositResults = await Promise.all(depositPromises);
    
    // รวมข้อมูลการนำฝาก
    const totalDeposits = branchDepositResults.reduce((sum, branch) => sum + branch.totalDeposits, 0);
    const totalPendingBalance = branchDepositResults.reduce((sum, branch) => sum + branch.pendingBalance, 0);
    
    const aggregatedDepositData = {
      totalDeposits: totalDeposits,
      totalPendingBalance: totalPendingBalance,
      branchDeposits: branchDepositResults
    };
    
    setDepositData(aggregatedDepositData);
    setCachedData(cacheKey, aggregatedDepositData, params);
  };

  const loadSingleBranchDeposits = async (branchCode, forceRefresh = false) => {
    const cacheKey = `admin_deposits_${branchCode}`;
    const params = { branchCode };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setDepositData({
          totalDeposits: cachedData.totalDeposits || 0,
          totalPendingBalance: cachedData.pendingBalance || 0,
          branchDeposits: [{
            branchCode: branchCode,
            branchName: branches.find(b => b.code === branchCode)?.name || branchCode,
            deposits: cachedData.history || [],
            pendingBalance: cachedData.pendingBalance || 0,
            totalDeposits: cachedData.totalDeposits || 0
          }]
        });
        return;
      }
    }
    
    const result = await gasAPI.getDepositInfo(branchCode);
    if (result && result.history) {
      const totalDeposits = Array.isArray(result.history) 
        ? result.history.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
        : 0;
      
      const depositInfo = {
        totalDeposits: totalDeposits,
        pendingBalance: result.pendingBalance || 0,
        history: result.history || []
      };
      
      setDepositData({
        totalDeposits: totalDeposits,
        totalPendingBalance: result.pendingBalance || 0,
        branchDeposits: [{
          branchCode: branchCode,
          branchName: branches.find(b => b.code === branchCode)?.name || branchCode,
          deposits: result.history || [],
          pendingBalance: result.pendingBalance || 0,
          totalDeposits: totalDeposits
        }]
      });
      
      setCachedData(cacheKey, depositInfo, params);
    }
  };

  const loadAllBranchesDeposits = async (forceRefresh = false) => {
    const cacheKey = `admin_deposits_ALL`;
    const params = { allBranches: true };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setDepositData(cachedData);
        return;
      }
    }
    
    // โหลดข้อมูลการนำฝากทุกสาขา
    const depositPromises = branches.map(branch => 
      gasAPI.getDepositInfo(branch.code)
        .then(result => {
          const totalDeposits = result && result.history && Array.isArray(result.history)
            ? result.history.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
            : 0;
          
          return {
            branchCode: branch.code,
            branchName: branch.name,
            deposits: result && result.history ? result.history : [],
            pendingBalance: result && result.pendingBalance ? result.pendingBalance : 0,
            totalDeposits: totalDeposits
          };
        })
        .catch(error => {
          console.error(`Error loading deposits for ${branch.code}:`, error);
          return {
            branchCode: branch.code,
            branchName: branch.name,
            deposits: [],
            pendingBalance: 0,
            totalDeposits: 0
          };
        })
    );
    
    const branchDepositResults = await Promise.all(depositPromises);
    
    // รวมข้อมูลการนำฝาก
    const totalDeposits = branchDepositResults.reduce((sum, branch) => sum + branch.totalDeposits, 0);
    const totalPendingBalance = branchDepositResults.reduce((sum, branch) => sum + branch.pendingBalance, 0);
    
    const aggregatedDepositData = {
      totalDeposits: totalDeposits,
      totalPendingBalance: totalPendingBalance,
      branchDeposits: branchDepositResults
    };
    
    setDepositData(aggregatedDepositData);
    setCachedData(cacheKey, aggregatedDepositData, params);
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Memoize chart data
  const lineChartData = useMemo(() => ({
    labels: data.charts?.line?.labels || [],
    datasets: [{
      label: 'ยอดขาย',
      data: data.charts?.line?.sales || [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }), [data.charts?.line]);

  const lineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        display: true
      },
      y: {
        display: true,
        beginAtZero: true
      }
    }
  }), []);

  const pieChartData = useMemo(() => ({
    labels: data.charts?.pie?.labels || [],
    datasets: [{
      data: data.charts?.pie?.data || [],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  }), [data.charts?.pie]);

  const pieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value.toLocaleString('th-TH')} (${percentage}%)`;
          }
        }
      }
    }
  }), []);

  const loadPnlDashboardData = async () => {
    const branchList = pnlDashboardBranches.length > 0 ? pnlDashboardBranches : branches.map(b => b.code);
    if (!branchList.length) {
      Swal.fire({ icon: 'warning', title: 'ไม่มีสาขาให้โหลด' });
      return;
    }
    setLoadingPnlDashboard(true);
    setPnlDashboardData([]);
    try {
      const hasCompare = pnlDashboardCompareYearMonth && pnlDashboardCompareYearMonth !== pnlDashboardYearMonth;
      const results = await Promise.all(branchList.map(async (code) => {
        const branch = branches.find(b => b.code === code);
        const [sales, cogs, opex, settings] = await Promise.all([
          gasAPI.getPnlSalesSummary(code, pnlDashboardYearMonth),
          gasAPI.getPnlCogsSummary(code, pnlDashboardYearMonth),
          gasAPI.getOperatingExpensesForMonth(code, pnlDashboardYearMonth),
          gasAPI.getPnlSettings(code)
        ]);
        const enableVat7 = settings?.enableVat7 !== false;
        const totalSales = Number(sales?.totalSales) || 0;
        const salesAfterVat = enableVat7 ? totalSales / 1.07 : totalSales;
        const totalDiscount = (Number(sales?.staffDiscount) || 0) + (Number(sales?.promoDiscount) || 0);
        const salesAfterDiscount = salesAfterVat - totalDiscount;
        const totalCogs = Number(cogs?.totalCogs) || 0;
        const grossProfit = salesAfterDiscount - totalCogs;
        let totalOpex = 0;
        const OPEX_KEYS = ['salary', 'daily_wage', 'social_security', 'overtime', 'travel', 'commission', 'position_allowance', 'bonus', 'rent', 'electricity', 'water', 'phone', 'marketing', 'spoilage', 'pos_system', 'other'];
        OPEX_KEYS.forEach(k => { totalOpex += parseFloat(opex?.[k]?.amount) || 0; });
        const netProfit = grossProfit - totalOpex;
        let compareTotalSales = 0, compareSalesAfterDiscount = 0, compareTotalCogs = 0, compareGrossProfit = 0, compareTotalOpex = 0, compareNetProfit = 0;
        if (hasCompare) {
          const [cSales, cCogs, cOpex] = await Promise.all([
            gasAPI.getPnlSalesSummary(code, pnlDashboardCompareYearMonth),
            gasAPI.getPnlCogsSummary(code, pnlDashboardCompareYearMonth),
            gasAPI.getOperatingExpensesForMonth(code, pnlDashboardCompareYearMonth)
          ]);
          compareTotalSales = Number(cSales?.totalSales) || 0;
          compareSalesAfterDiscount = (enableVat7 ? compareTotalSales / 1.07 : compareTotalSales) - (Number(cSales?.staffDiscount) || 0) - (Number(cSales?.promoDiscount) || 0);
          compareTotalCogs = Number(cCogs?.totalCogs) || 0;
          compareGrossProfit = compareSalesAfterDiscount - compareTotalCogs;
          OPEX_KEYS.forEach(k => { compareTotalOpex += parseFloat(cOpex?.[k]?.amount) || 0; });
          compareNetProfit = compareGrossProfit - compareTotalOpex;
        }
        return {
          branchCode: code,
          branchName: branch?.name || code,
          totalSales, salesAfterDiscount, totalCogs, grossProfit, totalOpex, netProfit,
          compareTotalSales, compareSalesAfterDiscount, compareTotalCogs, compareGrossProfit, compareTotalOpex, compareNetProfit,
          hasCompare
        };
      }));
      setPnlDashboardData(results);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: e?.message });
    } finally {
      setLoadingPnlDashboard(false);
    }
  };

  const loadPnlCompareData = async () => {
    if (!pnlCompareBranches.length) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกอย่างน้อย 1 สาขา' });
      return;
    }
    setLoadingPnlCompare(true);
    setPnlCompareData([]);
    try {
      const hasCompare = pnlCompareYearMonth && pnlCompareYearMonth !== pnlYearMonth;
      const results = await Promise.all(pnlCompareBranches.map(async (code) => {
        const branch = branches.find(b => b.code === code);
        const [sales, cogs, opex, settings] = await Promise.all([
          gasAPI.getPnlSalesSummary(code, pnlYearMonth),
          gasAPI.getPnlCogsSummary(code, pnlYearMonth),
          gasAPI.getOperatingExpensesForMonth(code, pnlYearMonth),
          gasAPI.getPnlSettings(code)
        ]);
        const enableVat7 = settings.enableVat7 !== false;
        const totalSales = Number(sales?.totalSales) || 0;
        const salesAfterVat = enableVat7 ? totalSales / 1.07 : totalSales;
        const totalDiscount = (Number(sales?.staffDiscount) || 0) + (Number(sales?.promoDiscount) || 0);
        const salesAfterDiscount = salesAfterVat - totalDiscount;
        const totalCogs = Number(cogs?.totalCogs) || 0;
        const grossProfit = salesAfterDiscount - totalCogs;
        let totalOpex = 0;
        const OPEX_KEYS = ['salary', 'daily_wage', 'social_security', 'overtime', 'travel', 'commission', 'position_allowance', 'bonus', 'rent', 'electricity', 'water', 'phone', 'marketing', 'spoilage', 'pos_system', 'other'];
        OPEX_KEYS.forEach(k => { totalOpex += parseFloat(opex?.[k]?.amount) || 0; });
        const netProfit = grossProfit - totalOpex;
        let compareTotalSales = 0, compareSalesAfterDiscount = 0, compareTotalCogs = 0, compareGrossProfit = 0, compareTotalOpex = 0, compareNetProfit = 0;
        if (hasCompare) {
          const [cSales, cCogs, cOpex] = await Promise.all([
            gasAPI.getPnlSalesSummary(code, pnlCompareYearMonth),
            gasAPI.getPnlCogsSummary(code, pnlCompareYearMonth),
            gasAPI.getOperatingExpensesForMonth(code, pnlCompareYearMonth)
          ]);
          compareTotalSales = Number(cSales?.totalSales) || 0;
          compareSalesAfterDiscount = (enableVat7 ? compareTotalSales / 1.07 : compareTotalSales) - (Number(cSales?.staffDiscount) || 0) - (Number(cSales?.promoDiscount) || 0);
          compareTotalCogs = Number(cCogs?.totalCogs) || 0;
          compareGrossProfit = compareSalesAfterDiscount - compareTotalCogs;
          OPEX_KEYS.forEach(k => { compareTotalOpex += parseFloat(cOpex?.[k]?.amount) || 0; });
          compareNetProfit = compareGrossProfit - compareTotalOpex;
        }
        return {
          branchCode: code,
          branchName: branch?.name || code,
          totalSales, salesAfterDiscount, totalCogs, grossProfit, totalOpex, netProfit,
          compareTotalSales, compareSalesAfterDiscount, compareTotalCogs, compareGrossProfit, compareTotalOpex, compareNetProfit,
          hasCompare
        };
      }));
      setPnlCompareData(results);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: e.message });
    } finally {
      setLoadingPnlCompare(false);
    }
  };

  const formatNum = (n) => (n != null && n !== '') ? parseFloat(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  const pnlYearMonthLabel = pnlYearMonth ? new Date(pnlYearMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) : '';
  const pnlCompareYearMonthLabel = pnlCompareYearMonth ? new Date(pnlCompareYearMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) : '';
  const pnlDashboardMonthLabel = pnlDashboardYearMonth ? new Date(pnlDashboardYearMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) : '';
  const pnlDashboardCompareMonthLabel = pnlDashboardCompareYearMonth ? new Date(pnlDashboardCompareYearMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }) : '';

  // กราฟแนวโน้ม แดชบอร์ด P&L — ยอดขาย, ต้นทุน COGS, ค่าใช้จ่ายดำเนินการ (เทียบสาขา / เทียบเดือน)
  const pnlDashboardChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed?.y;
            return (v != null ? Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '') + ' บาท';
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => typeof v === 'number' ? v.toLocaleString('th-TH') : v }
      }
    }
  }), []);

  const pnlSalesChartData = useMemo(() => {
    if (!pnlDashboardData.length) return { labels: [], datasets: [] };
    const labels = pnlDashboardData.map(r => r.branchName || r.branchCode);
    const datasets = [
      { label: pnlDashboardMonthLabel || 'เดือนที่เลือก', data: pnlDashboardData.map(r => r.totalSales), backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: '#2563eb', borderWidth: 1 }
    ];
    if (pnlDashboardData[0]?.hasCompare) {
      datasets.push({ label: pnlDashboardCompareMonthLabel || 'เดือนเทียบ', data: pnlDashboardData.map(r => r.compareTotalSales), backgroundColor: 'rgba(148, 163, 184, 0.7)', borderColor: '#64748b', borderWidth: 1 });
    }
    return { labels, datasets };
  }, [pnlDashboardData, pnlDashboardMonthLabel, pnlDashboardCompareMonthLabel]);

  const pnlCogsChartData = useMemo(() => {
    if (!pnlDashboardData.length) return { labels: [], datasets: [] };
    const labels = pnlDashboardData.map(r => r.branchName || r.branchCode);
    const datasets = [
      { label: pnlDashboardMonthLabel || 'เดือนที่เลือก', data: pnlDashboardData.map(r => r.totalCogs), backgroundColor: 'rgba(245, 158, 11, 0.7)', borderColor: '#d97706', borderWidth: 1 }
    ];
    if (pnlDashboardData[0]?.hasCompare) {
      datasets.push({ label: pnlDashboardCompareMonthLabel || 'เดือนเทียบ', data: pnlDashboardData.map(r => r.compareTotalCogs), backgroundColor: 'rgba(148, 163, 184, 0.7)', borderColor: '#64748b', borderWidth: 1 });
    }
    return { labels, datasets };
  }, [pnlDashboardData, pnlDashboardMonthLabel, pnlDashboardCompareMonthLabel]);

  const pnlOpexChartData = useMemo(() => {
    if (!pnlDashboardData.length) return { labels: [], datasets: [] };
    const labels = pnlDashboardData.map(r => r.branchName || r.branchCode);
    const datasets = [
      { label: pnlDashboardMonthLabel || 'เดือนที่เลือก', data: pnlDashboardData.map(r => r.totalOpex), backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: '#dc2626', borderWidth: 1 }
    ];
    if (pnlDashboardData[0]?.hasCompare) {
      datasets.push({ label: pnlDashboardCompareMonthLabel || 'เดือนเทียบ', data: pnlDashboardData.map(r => r.compareTotalOpex), backgroundColor: 'rgba(148, 163, 184, 0.7)', borderColor: '#64748b', borderWidth: 1 });
    }
    return { labels, datasets };
  }, [pnlDashboardData, pnlDashboardMonthLabel, pnlDashboardCompareMonthLabel]);

  const pnlNetProfitChartData = useMemo(() => {
    if (!pnlDashboardData.length) return { labels: [], datasets: [] };
    const labels = pnlDashboardData.map(r => r.branchName || r.branchCode);
    const datasets = [
      { label: pnlDashboardMonthLabel || 'เดือนที่เลือก', data: pnlDashboardData.map(r => r.netProfit), backgroundColor: pnlDashboardData.map(r => (Number(r.netProfit) >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)')), borderColor: pnlDashboardData.map(r => (Number(r.netProfit) >= 0 ? '#16a34a' : '#dc2626')), borderWidth: 1 }
    ];
    if (pnlDashboardData[0]?.hasCompare) {
      datasets.push({
        label: pnlDashboardCompareMonthLabel || 'เดือนเทียบ',
        data: pnlDashboardData.map(r => r.compareNetProfit),
        backgroundColor: pnlDashboardData.map(r => (Number(r.compareNetProfit) >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)')),
        borderColor: pnlDashboardData.map(r => (Number(r.compareNetProfit) >= 0 ? '#16a34a' : '#dc2626')),
        borderWidth: 1
      });
    }
    return { labels, datasets };
  }, [pnlDashboardData, pnlDashboardMonthLabel, pnlDashboardCompareMonthLabel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <i className="fas fa-user-shield mr-3"></i>
          ระบบจัดการหลังบ้าน (Admin)
        </h1>
        <p className="text-purple-100">ตรวจสอบและแก้ไขข้อมูลทุกสาขา • งบกำไรขาดทุน • แดชบอร์ดสรุป P&L</p>
      </div>

      {/* แท็บหลัก: หลังบ้าน | แดชบอร์ด P&L */}
      <div className="flex border-b-2 border-gray-200 bg-white rounded-t-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setAdminSection('backoffice')}
          className={`flex-1 px-6 py-4 font-bold text-sm transition ${adminSection === 'backoffice' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <i className="fas fa-building mr-2"></i>หลังบ้าน + งบกำไรขาดทุน
        </button>
        <button
          type="button"
          onClick={() => setAdminSection('pnl-dashboard')}
          className={`flex-1 px-6 py-4 font-bold text-sm transition ${adminSection === 'pnl-dashboard' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <i className="fas fa-chart-bar mr-2"></i>แดชบอร์ดสรุป P&L
        </button>
      </div>

      {/* ส่วน: แดชบอร์ดสรุป P&L — ดึงจากงบกำไรขาดทุนทุกสาขา วิเคราะห์เชิงลึก */}
      {adminSection === 'pnl-dashboard' && (
        <div className="bg-white rounded-b-xl shadow-md border border-gray-200 border-t-0 p-6 space-y-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">สาขา (ไม่เลือก = ทุกสาขา)</label>
              <div className="flex flex-wrap gap-2 max-w-xl">
                {branches.map(b => (
                  <label key={b.code} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={pnlDashboardBranches.includes(b.code)}
                      onChange={(e) => {
                        if (e.target.checked) setPnlDashboardBranches([...pnlDashboardBranches, b.code]);
                        else setPnlDashboardBranches(pnlDashboardBranches.filter(c => c !== b.code));
                      }}
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">เดือน</label>
              <input type="month" value={pnlDashboardYearMonth} onChange={(e) => setPnlDashboardYearMonth(e.target.value)} className="border-2 border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!pnlDashboardCompareYearMonth} onChange={(e) => setPnlDashboardCompareYearMonth(e.target.checked ? (pnlDashboardCompareYearMonth || (() => { const d = new Date(pnlDashboardYearMonth + '-01'); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()) : '')} />
              <span className="text-sm">เทียบกับเดือน</span>
            </label>
            {pnlDashboardCompareYearMonth && (
              <input type="month" value={pnlDashboardCompareYearMonth} onChange={(e) => setPnlDashboardCompareYearMonth(e.target.value || '')} className="border-2 border-gray-300 rounded-lg px-3 py-2" />
            )}
            <button type="button" onClick={loadPnlDashboardData} disabled={loadingPnlDashboard} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
              {loadingPnlDashboard ? 'กำลังโหลด...' : 'โหลดข้อมูล'}
            </button>
          </div>
          {pnlDashboardData.length > 0 && (
            <>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">สาขา</th>
                      <th className="px-3 py-2 text-right font-bold">ยอดขายรวม</th>
                      <th className="px-3 py-2 text-right font-bold">หลังหักส่วนลด</th>
                      <th className="px-3 py-2 text-right font-bold">COGS</th>
                      <th className="px-3 py-2 text-right font-bold">กำไรขั้นต้น</th>
                      <th className="px-3 py-2 text-right font-bold">ค่าใช้จ่ายดำเนินการ</th>
                      <th className="px-3 py-2 text-right font-bold">กำไรสุทธิ</th>
                      {pnlDashboardData[0]?.hasCompare && (
                        <>
                          <th className="px-3 py-2 text-right font-bold border-l border-indigo-200">ยอดขาย (เทียบ)</th>
                          <th className="px-3 py-2 text-right font-bold">กำไรสุทธิ (เทียบ)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pnlDashboardData.map((row, i) => (
                      <tr key={row.branchCode} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-medium border-t border-gray-100">{row.branchName} ({row.branchCode})</td>
                        <td className="px-3 py-2 text-right border-t border-gray-100 tabular-nums">{formatNum(row.totalSales)}</td>
                        <td className="px-3 py-2 text-right border-t border-gray-100 tabular-nums">{formatNum(row.salesAfterDiscount)}</td>
                        <td className="px-3 py-2 text-right border-t border-gray-100 tabular-nums">{formatNum(row.totalCogs)}</td>
                        <td className="px-3 py-2 text-right border-t border-gray-100 tabular-nums text-green-700">{formatNum(row.grossProfit)}</td>
                        <td className="px-3 py-2 text-right border-t border-gray-100 tabular-nums text-red-700">{formatNum(row.totalOpex)}</td>
                        <td className={`px-3 py-2 text-right border-t border-gray-100 tabular-nums font-bold ${Number(row.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNum(row.netProfit)}</td>
                        {row.hasCompare && (
                          <>
                            <td className="px-3 py-2 text-right border-l border-t border-gray-100 tabular-nums">{formatNum(row.compareTotalSales)}</td>
                            <td className={`px-3 py-2 text-right border-t border-gray-100 tabular-nums ${Number(row.compareNetProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNum(row.compareNetProfit)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">ข้อมูลดึงจากงบกำไรขาดทุน (ยอดขาย, COGS, ค่าใช้จ่ายดำเนินการ) ตามเดือนที่เลือก</p>

              {/* กราฟแนวโน้ม — เทียบสาขา / เทียบเดือน */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-chart-line mr-2 text-indigo-600"></i>
                  กราฟแนวโน้มสำหรับวิเคราะห์ (เทียบสาขา · เทียบเดือน)
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">แนวโน้มยอดขายรวม</h4>
                    <div className="h-64">
                      <Bar data={pnlSalesChartData} options={pnlDashboardChartOptions} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">ต้นทุน COGS</h4>
                    <div className="h-64">
                      <Bar data={pnlCogsChartData} options={pnlDashboardChartOptions} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">ค่าใช้จ่ายดำเนินการ</h4>
                    <div className="h-64">
                      <Bar data={pnlOpexChartData} options={pnlDashboardChartOptions} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">กำไรสุทธิ</h4>
                    <div className="h-64">
                      <Bar data={pnlNetProfitChartData} options={pnlDashboardChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Branch Selector & Date Filter — แสดงเฉพาะเมื่ออยู่แท็บ หลังบ้าน */}
      {adminSection === 'backoffice' && (
      <>
      {/* Branch Selector & Date Filter */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 branch-selector-container">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">เลือกสาขา</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBranchSelector(!showBranchSelector)}
                disabled={loadingBranches}
                className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
              >
                <span>
                  {selectedBranch === 'ALL' 
                    ? '📊 รวมทุกสาขา' 
                    : selectedBranches.length > 0
                    ? `เลือก ${selectedBranches.length} สาขา${selectedBranches.length > 0 ? ` (${selectedBranches.map(code => branches.find(b => b.code === code)?.name || code).join(', ')})` : ''}`
                    : branches.find(b => b.code === selectedBranch)?.name || 'เลือกสาขา'}
                </span>
                <i className={`fas fa-chevron-${showBranchSelector ? 'up' : 'down'} ml-2`}></i>
              </button>
              
              {showBranchSelector && !loadingBranches && (
                <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="radio"
                        name="branchSelect"
                        checked={selectedBranch === 'ALL' && selectedBranches.length === 0}
                        onChange={() => {
                          setSelectedBranch('ALL');
                          setSelectedBranches([]);
                          setShowBranchSelector(false);
                        }}
                        className="mr-2"
                      />
                      <span className="font-bold">📊 รวมทุกสาขา</span>
                    </label>
                    <div className="border-t border-gray-200 my-1"></div>
                    {branches.map(branch => (
                      <label key={branch.code} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranches([...selectedBranches, branch.code]);
                              setSelectedBranch(''); // Clear single selection
                            } else {
                              setSelectedBranches(selectedBranches.filter(b => b !== branch.code));
                            }
                          }}
                          className="mr-2"
                        />
                        <span>{branch.name} ({branch.code})</span>
                      </label>
                    ))}
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedBranches.length > 0) {
                            setSelectedBranch('');
                            setShowBranchSelector(false);
                          }
                        }}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition"
                        disabled={selectedBranches.length === 0}
                      >
                        ตกลง ({selectedBranches.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBranches([]);
                          setSelectedBranch('ALL');
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
                      >
                        ล้าง
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">วันที่เริ่มต้น</label>
            <DateInput
              value={startDate}
              onChange={(v) => {
                setStartDate(v);
                if (v > endDate) setEndDate(v);
              }}
              max={endDate}
              placeholder="dd/mm/yyyy"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">วันที่สิ้นสุด</label>
            <DateInput
              value={endDate}
              onChange={(v) => {
                const today = getTodayDate();
                const clamped = v > today ? today : v;
                setEndDate(clamped);
                if (clamped < startDate) setStartDate(clamped);
              }}
              min={startDate}
              max={getTodayDate()}
              placeholder="dd/mm/yyyy"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2 items-center">
          <button
            onClick={() => {
              setShowBranchSelector(false);
              loadAdminData(true);
              loadDepositData(true);
            }}
            className="w-full md:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
          >
            <i className="fas fa-search mr-2"></i>ค้นหา
          </button>
          {selectedBranches.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-bold">เลือกแล้ว:</span> {selectedBranches.length} สาขา
            </div>
          )}
        </div>
      </div>

      {/* เลือกสาขาเดียวแล้วเข้าไปแก้ไขข้อมูลสาขานั้น — กรอกยอดขาย, ลบ/แก้ ค่าใช้จ่าย, นำฝาก, ใบกำกับ, งบกำไรขาดทุน */}
      {selectedBranches.length === 1 && (
        <div className="bg-white rounded-xl shadow-md border-2 border-purple-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-purple-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <i className="fas fa-edit mr-2 text-purple-600"></i>
              เข้าไปแก้ไขข้อมูลสาขา: {branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} ({selectedBranches[0]})
            </h2>
            <p className="text-sm text-gray-600 mt-1">ดึงหน้าผู้ใช้มาให้แอดมินกรอก/แก้ไข/ลบได้</p>
          </div>
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'overview', label: 'ภาพรวม', icon: 'fa-chart-line' },
              { id: 'sales', label: 'ปิดยอด', icon: 'fa-cash-register' },
              { id: 'expenses', label: 'ค่าใช้จ่าย', icon: 'fa-file-invoice-dollar' },
              { id: 'deposits', label: 'นำฝาก', icon: 'fa-university' },
              { id: 'tax-invoices', label: 'ใบกำกับภาษี', icon: 'fa-file-invoice' },
              { id: 'profit-loss', label: 'งบกำไรขาดทุน', icon: 'fa-balance-scale' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminEditTab(tab.id)}
                className={`flex-none px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap ${adminEditTab === tab.id ? 'border-purple-600 text-purple-600 bg-white' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>{tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 min-h-[200px]">
            {adminEditTab === 'overview' && <Dashboard overrideBranchCode={selectedBranches[0]} overrideBranchName={branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} />}
            {adminEditTab === 'sales' && <Sales overrideBranchCode={selectedBranches[0]} overrideBranchName={branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} allowAdminDelete />}
            {adminEditTab === 'expenses' && <Expenses overrideBranchCode={selectedBranches[0]} overrideBranchName={branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} allowAdminDelete />}
            {adminEditTab === 'deposits' && <Deposits overrideBranchCode={selectedBranches[0]} overrideBranchName={branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} allowAdminDelete />}
            {adminEditTab === 'tax-invoices' && <TaxInvoices overrideBranchCode={selectedBranches[0]} overrideBranchName={branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} allowAdminDelete />}
            {adminEditTab === 'profit-loss' && <ProfitLoss overrideBranchCode={selectedBranches[0]} overrideBranchName={branches.find(b => b.code === selectedBranches[0])?.name || selectedBranches[0]} />}
          </div>
        </div>
      )}

      {/* Dashboard Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-90 uppercase tracking-wide mb-1">ยอดขายรวม</p>
              <h2 className="text-2xl md:text-3xl font-bold">{formatNumber(data.totalSales)}</h2>
            </div>
            <i className="fas fa-wallet text-3xl opacity-20"></i>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">กำไรสุทธิ</p>
          <h2 className="text-2xl md:text-3xl font-bold text-green-600">{formatNumber(data.netProfit)}</h2>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-red-500">
          <p className="text-xs text-gray-500 uppercase mb-1">ค่าใช้จ่าย</p>
          <h2 className="text-xl font-bold text-red-600">{formatNumber(data.totalExpenses)}</h2>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-orange-500">
          <p className="text-xs text-gray-500 uppercase mb-1">จำนวนรายการ</p>
          <h2 className="text-xl font-bold text-orange-600">{formatNumber(data.totalRecords)}</h2>
        </div>
      </section>

      {/* Branch Breakdown (when viewing all branches or multiple branches) */}
      {((selectedBranch === 'ALL' || selectedBranches.length > 0) && data.branchData && data.branchData.length > 0) && (
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <i className="fas fa-building mr-2 text-purple-600"></i>
              สรุปยอดตามสาขา
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">สาขา</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ยอดขาย</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">กำไรสุทธิ</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ค่าใช้จ่าย</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">จำนวนรายการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : data.branchData.map((branch, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {branch.branchName} ({branch.branchCode})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(branch.data.totalSales || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                      {formatNumber(branch.data.netProfit || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatNumber(branch.data.totalExpenses || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(branch.data.totalRecords || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Deposit Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-90 uppercase tracking-wide mb-1">ยอดนำฝากรวม</p>
              <h2 className="text-2xl md:text-3xl font-bold">{formatNumber(depositData.totalDeposits)}</h2>
            </div>
            <i className="fas fa-university text-3xl opacity-20"></i>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-yellow-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ยอดเงินค้างฝากสะสม</p>
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-600">{formatNumber(depositData.totalPendingBalance)}</h2>
        </div>
      </section>

      {/* Deposit Breakdown (when viewing all branches or multiple branches) */}
      {((selectedBranch === 'ALL' || selectedBranches.length > 0) && depositData.branchDeposits && depositData.branchDeposits.length > 0) && (
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <i className="fas fa-university mr-2 text-green-600"></i>
              สรุปการนำฝากตามสาขา
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">สาขา</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ยอดนำฝากรวม</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ยอดเงินค้างฝาก</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">จำนวนรายการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingDeposits ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : depositData.branchDeposits.map((branch, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {branch.branchName} ({branch.branchCode})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                      {formatNumber(branch.totalDeposits || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      {formatNumber(branch.pendingBalance || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(branch.deposits?.length || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Deposit Details (when viewing single branch) */}
      {selectedBranch !== 'ALL' && selectedBranches.length === 0 && depositData.branchDeposits && depositData.branchDeposits.length > 0 && (
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <i className="fas fa-university mr-2 text-green-600"></i>
              รายละเอียดการนำฝาก - {depositData.branchDeposits[0]?.branchName}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">วันที่</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">จำนวนเงิน</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingDeposits ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                      <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : depositData.branchDeposits[0]?.deposits && depositData.branchDeposits[0].deposits.length > 0 ? (
                  depositData.branchDeposits[0].deposits.map((deposit, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deposit.date ? formatDateForDisplay(deposit.date) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        {formatNumber(deposit.amount || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {deposit.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                      ไม่มีข้อมูลการนำฝาก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* งบกำไรขาดทุน (แต่ละสาขา) */}
      <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-indigo-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <i className="fas fa-file-invoice-dollar mr-2 text-indigo-600"></i>
            งบกำไรขาดทุนของแต่ละสาขา
          </h2>
          <p className="text-sm text-gray-600 mt-1">ดู แก้ไข หรือเทียบงบกำไรขาดทุนตามสาขาและเดือน</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="font-bold text-gray-700">โหมด:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="pnlMode" checked={pnlMode === 'single'} onChange={() => setPnlMode('single')} className="rounded" />
              <span>ดู/แก้ไขงบสาขาเดียว</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="pnlMode" checked={pnlMode === 'compare'} onChange={() => setPnlMode('compare')} className="rounded" />
              <span>เทียบหลายสาขา / เทียบเดือน</span>
            </label>
          </div>

          {pnlMode === 'single' && (
            <>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="font-bold text-gray-700">สาขา:</label>
                <select
                  value={pnlBranch}
                  onChange={(e) => setPnlBranch(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 min-w-[200px]"
                >
                  <option value="">-- เลือกสาขา --</option>
                  {branches.map(b => (
                    <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              {pnlBranch ? (
                <div className="border border-indigo-200 rounded-lg overflow-hidden">
                  <ProfitLoss
                    overrideBranchCode={pnlBranch}
                    overrideBranchName={branches.find(b => b.code === pnlBranch)?.name || pnlBranch}
                  />
                </div>
              ) : (
                <p className="text-gray-500 py-8 text-center">กรุณาเลือกสาขาเพื่อดูหรือแก้ไขงบกำไรขาดทุน</p>
              )}
            </>
          )}

          {pnlMode === 'compare' && (
            <>
              <div className="flex flex-wrap gap-4 items-center">
                <span className="font-bold text-gray-700">สาขาที่เทียบ:</span>
                <div className="flex flex-wrap gap-2">
                  {branches.map(b => (
                    <label key={b.code} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pnlCompareBranches.includes(b.code)}
                        onChange={(e) => {
                          if (e.target.checked) setPnlCompareBranches([...pnlCompareBranches, b.code]);
                          else setPnlCompareBranches(pnlCompareBranches.filter(c => c !== b.code));
                        }}
                      />
                      <span className="text-sm">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="font-bold text-gray-700">เดือน:</label>
                <input type="month" value={pnlYearMonth} onChange={(e) => setPnlYearMonth(e.target.value)} className="border-2 border-gray-300 rounded-lg px-3 py-2" />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!pnlCompareYearMonth} onChange={(e) => setPnlCompareYearMonth(e.target.checked ? (pnlCompareYearMonth || (() => { const d = new Date(pnlYearMonth + '-01'); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()) : '')} />
                  <span>เทียบกับเดือน</span>
                </label>
                {pnlCompareYearMonth && (
                  <input type="month" value={pnlCompareYearMonth} onChange={(e) => setPnlCompareYearMonth(e.target.value || '')} className="border-2 border-gray-300 rounded-lg px-3 py-2" />
                )}
                <button type="button" onClick={loadPnlCompareData} disabled={loadingPnlCompare || !pnlCompareBranches.length} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                  {loadingPnlCompare ? 'กำลังโหลด...' : 'โหลดข้อมูลเทียบ'}
                </button>
              </div>
              {pnlCompareData.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-indigo-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">รายการ</th>
                        {pnlCompareData.map((b) => (
                          <th key={b.branchCode} colSpan={b.hasCompare ? 2 : 1} className="px-3 py-2 text-center font-bold border-l border-indigo-200">
                            {b.branchName} ({b.branchCode})
                            {b.hasCompare && <span className="block text-xs font-normal text-gray-600">{pnlYearMonthLabel} / {pnlCompareYearMonthLabel}</span>}
                          </th>
                        ))}
                      </tr>
                      {pnlCompareData[0]?.hasCompare && (
                        <tr className="bg-indigo-50 text-xs">
                          <th className="px-3 py-1"></th>
                          {pnlCompareData.map((b) => (
                            <React.Fragment key={b.branchCode}>
                              <th className="px-3 py-1 text-center border-l border-indigo-200">{pnlYearMonthLabel}</th>
                              <th className="px-3 py-1 text-center border-l border-indigo-200">{pnlCompareYearMonthLabel}</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {['totalSales', 'salesAfterDiscount', 'totalCogs', 'grossProfit', 'totalOpex', 'netProfit'].map((key, i) => {
                        const labels = { totalSales: 'ยอดขายรวม', salesAfterDiscount: 'ยอดขายหลังหักส่วนลด', totalCogs: 'ต้นทุน COGS', grossProfit: 'กำไรขั้นต้น', totalOpex: 'ค่าใช้จ่ายดำเนินการ', netProfit: 'กำไรสุทธิ' };
                        return (
                          <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 font-medium border-t border-gray-100">{labels[key]}</td>
                            {pnlCompareData.map((b) => {
                              const compareKey = 'compare' + key.charAt(0).toUpperCase() + key.slice(1);
                              return b.hasCompare ? (
                                <React.Fragment key={b.branchCode}>
                                  <td className="px-3 py-2 text-right border-l border-t border-gray-100 tabular-nums">{formatNum(b[key])}</td>
                                  <td className="px-3 py-2 text-right border-l border-t border-gray-100 tabular-nums text-gray-600">{formatNum(b[compareKey])}</td>
                                </React.Fragment>
                              ) : (
                                <td key={b.branchCode} className="px-3 py-2 text-right border-l border-t border-gray-100 tabular-nums">{formatNum(b[key])}</td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Charts */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
          <h3 className="font-bold mb-4 text-gray-800 text-sm uppercase">แนวโน้มยอดขาย</h3>
          <div className="h-64">
            {data.charts?.line?.labels && data.charts.line.labels.length > 0 ? (
              <Line data={lineChartData} options={lineChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
          <h3 className="font-bold mb-4 text-gray-800 text-sm uppercase">ช่องทางชำระเงิน</h3>
          <div className="h-64 flex justify-center">
            {data.charts?.pie?.data && data.charts.pie.data.some(d => d > 0) ? (
              <Doughnut data={pieChartData} options={pieChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
              </div>
            )}
          </div>
        </div>
      </section>
      </>
      )}
    </div>
  );
}

export default Admin;
