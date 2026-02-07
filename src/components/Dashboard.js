import React, { useState, useEffect, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import '../config/chart'; // Import to register Chart.js components
import { gasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataCache } from '../context/DataCacheContext';
import { getTodayDate, getFirstDayOfCurrentMonth, formatDateForDisplay } from '../utils/dateUtils';
import DateInput from './DateInput';
import Swal from 'sweetalert2';

function Dashboard({ overrideBranchCode, overrideBranchName }) {
  const { user } = useAuth();
  const effectiveBranchCode = overrideBranchCode ?? user?.branchCode;
  const isOffice = user?.role === 'office';
  const { getCachedData, setCachedData } = useDataCache();
  const [data, setData] = useState({
    totalSales: 0,
    netProfit: 0,
    totalExpenses: 0,
    totalRecords: 0,
    sales: [],
    charts: { line: { labels: [], sales: [] }, pie: { labels: [], data: [] } },
    pnlCost: 0,
    pnlOpex: 0,
    pnlGrossProfit: 0,
    pnlNetProfit: 0,
    depositsInRange: 0
  });
  const [loading, setLoading] = useState(true);
  // วันที่เริ่มต้น = วันที่ 1 ของเดือนปัจจุบัน, วันที่สิ้นสุด = วันที่ปัจจุบัน (ใช้ local date)
  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(getTodayDate());

  /** หาเดือน (YYYY-MM) ที่อยู่ในช่วง startDate .. endDate */
  const getYearMonthsInRange = (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const months = [];
    let y = start.getFullYear();
    let m = start.getMonth();
    const endY = end.getFullYear();
    const endM = end.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      months.push(`${y}-${String(m + 1).padStart(2, '0')}`);
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return months;
  };

  useEffect(() => {
    if (effectiveBranchCode) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchCode, startDate, endDate]);

  const loadDashboard = async (forceRefresh = false) => {
    if (!effectiveBranchCode) return;
    
    const cacheKey = `dashboard_${effectiveBranchCode}_${startDate}_${endDate}`;
    const params = { branchCode: effectiveBranchCode, startDate, endDate };
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey, params);
      if (cachedData) {
        setData({
          ...cachedData,
          pnlCost: cachedData.pnlCost ?? 0,
          pnlOpex: cachedData.pnlOpex ?? 0,
          pnlGrossProfit: cachedData.pnlGrossProfit ?? 0,
          pnlNetProfit: cachedData.pnlNetProfit ?? 0,
          depositsInRange: cachedData.depositsInRange ?? 0
        });
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      let result;
      if (isOffice) {
        const [officeRes, expRes] = await Promise.all([
          gasAPI.getOfficeSales(effectiveBranchCode, startDate, endDate),
          gasAPI.getDashboardData(effectiveBranchCode, startDate, endDate)
        ]);
        const officeRows = officeRes?.data || [];
        const toDateStr = (d) => (d ? String(d).slice(0, 10) : '');
        let totalSales = 0;
        let sumRangsan = 0;
        let sumSao = 0;
        const sales = officeRows.map((r) => {
          const rTotal = Number(r.rangsan_total) || 0;
          const sTotal = Number(r.sao_total) || 0;
          const total = rTotal + sTotal;
          totalSales += total;
          sumRangsan += rTotal;
          sumSao += sTotal;
          return {
            date: toDateStr(r.Date),
            rangsanTotal: rTotal,
            saoTotal: sTotal,
            total,
            status: 'บันทึกแล้ว'
          };
        });
        sales.sort((a, b) => (b.date > a.date ? 1 : -1));
        const lineLabels = sales.map((s) => formatDateForDisplay(s.date));
        const lineSales = sales.map((s) => s.total);
        result = {
          ...expRes,
          status: 'success',
          totalSales,
          netProfit: totalSales - (expRes?.totalExpenses || 0),
          totalRecords: sales.length,
          sales,
          charts: {
            line: { labels: lineLabels, sales: lineSales },
            pie: { labels: ['RANGSAN', 'SAO'], data: [sumRangsan, sumSao] }
          }
        };
      } else {
        result = await gasAPI.getDashboardData(effectiveBranchCode, startDate, endDate);
      }

      if (result.status === 'success' || result.totalSales !== undefined) {
        if (!isOffice && result.sales && Array.isArray(result.sales) && result.sales.length > 0) {
          const recalculatedTotalSales = result.sales.reduce((sum, sale) => {
            const total = (sale.cash || 0) + (sale.transfer || 0) + (sale.grab || 0) +
                         (sale.lineman || 0) + (sale.shopee || 0) + (sale.robinhood || 0) +
                         (sale.creditCard || 0) + (sale.halfHalf || 0) + (sale.other || 0);
            return sum + total;
          }, 0);
          if (Math.abs(recalculatedTotalSales - result.totalSales) > 0.01) {
            result.totalSales = recalculatedTotalSales;
            result.netProfit = recalculatedTotalSales - (result.totalExpenses || 0);
          }
        }

        let pnlCost = 0;
        let pnlOpex = 0;
        let pnlGrossProfit = 0;
        let pnlNetProfit = 0;
        const months = getYearMonthsInRange(startDate, endDate);
        let settingsRes;
        try {
          settingsRes = await gasAPI.getPnlSettings(effectiveBranchCode);
        } catch (e) {
          settingsRes = {};
        }
        const enableVat7 = settingsRes?.enableVat7 !== false;
        const getPnlSales = isOffice ? gasAPI.getPnlOfficeSalesSummary : gasAPI.getPnlSalesSummary;
        for (const yearMonth of months) {
          try {
            const [salesRes, cogsRes, opexRes] = await Promise.all([
              getPnlSales(effectiveBranchCode, yearMonth),
              gasAPI.getPnlCogsSummary(effectiveBranchCode, yearMonth),
              gasAPI.getOperatingExpensesForMonth(effectiveBranchCode, yearMonth)
            ]);
            const totalSales = Number(salesRes?.totalSales) || 0;
            const salesAfterVat = enableVat7 ? totalSales / 1.07 : totalSales;
            const totalDiscount = (Number(salesRes?.staffDiscount) || 0) + (Number(salesRes?.promoDiscount) || 0);
            const salesAfterDiscount = salesAfterVat - totalDiscount;
            const totalCogs = Number(cogsRes?.totalCogs) || 0;
            const opexTotal = Object.values(opexRes || {}).reduce((s, o) => s + (Number(o?.amount) || 0), 0);
            pnlCost += totalCogs;
            pnlOpex += opexTotal;
            const gross = salesAfterDiscount - totalCogs;
            pnlGrossProfit += gross;
            pnlNetProfit += gross - opexTotal;
          } catch (e) {
            console.warn('[Dashboard] P&L for', yearMonth, e);
          }
        }

        let depositsInRange = 0;
        try {
          const depositRes = await gasAPI.getDepositInfo(effectiveBranchCode);
          const history = depositRes?.history || [];
          const normStart = startDate.replace(/\//g, '-');
          const normEnd = endDate.replace(/\//g, '-');
          depositsInRange = history
            .filter(d => {
              const dStr = (d.date || '').toString().trim();
              return dStr >= normStart && dStr <= normEnd;
            })
            .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        } catch (e) {
          console.warn('[Dashboard] Deposits:', e);
        }

        const fullData = {
          ...result,
          pnlCost,
          pnlOpex,
          pnlGrossProfit,
          pnlNetProfit,
          depositsInRange
        };
        setData(fullData);
        setCachedData(cacheKey, fullData, params);
      } else {
        throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลได้');
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

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => (dateStr ? formatDateForDisplay(dateStr) : '-');

  // Memoize chart data and options to prevent re-renders
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
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'],
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

  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-90 uppercase tracking-wide mb-1">ยอดขายรวม</p>
              <h2 className="text-2xl md:text-3xl font-bold">{formatNumber(data.totalSales)}</h2>
            </div>
            <i className="fas fa-wallet text-3xl opacity-20"></i>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">กำไรขั้นต้น</p>
          <h2 className="text-2xl md:text-3xl font-bold text-green-600">{formatNumber(data.pnlGrossProfit)}</h2>
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

      {/* การ์ดจากงบกำไรขาดทุน + ยอดนำฝากตามช่วง */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-amber-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ต้นทุน (จากงบ P&L)</p>
          <h2 className="text-xl font-bold text-amber-700">{formatNumber(data.pnlCost)}</h2>
          <p className="text-xs text-gray-400 mt-1">จากงบกำไรขาดทุนที่บันทึกแล้ว</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-rose-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ค่าใช้จ่ายดำเนินการ (จากงบ P&L)</p>
          <h2 className="text-xl font-bold text-rose-700">{formatNumber(data.pnlOpex)}</h2>
          <p className="text-xs text-gray-400 mt-1">จากงบกำไรขาดทุนที่บันทึกแล้ว</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-emerald-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ยอดนำฝากรวม (ช่วงที่เลือก)</p>
          <h2 className="text-xl font-bold text-emerald-700">{formatNumber(data.depositsInRange)}</h2>
          <p className="text-xs text-gray-400 mt-1">ตามช่วงวันที่เริ่มต้น–สิ้นสุด</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">กำไรสุทธิ (จากงบ P&L)</p>
          <h2 className={`text-xl font-bold ${Number(data.pnlNetProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(data.pnlNetProfit)}</h2>
          <p className="text-xs text-gray-400 mt-1">ตามช่วงเวลาที่เลือก</p>
        </div>
      </section>

      {/* Date Filter — แสดง dd/mm/yyyy + ปุ่มปฏิทิน */}
      <section className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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
          <div className="flex-1">
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
          <div className="flex items-end">
            <button
              onClick={() => loadDashboard(true)}
              className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              <i className="fas fa-search mr-2"></i>ค้นหา
            </button>
          </div>
        </div>
      </section>

      {/* Sales Table (Desktop Only) — สาขา: เงินสด/โอน/Credit/Delivery | Office: RANGSAN/SAO */}
      <section className="desktop-only bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <i className="fas fa-table mr-2 text-blue-600"></i>
            ตารางข้อมูลยอดขาย
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">วันที่</th>
                {isOffice ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">RANGSAN รวม</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">SAO รวม</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">เงินสด</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">โอน</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Credit Card</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Delivery</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">รวม</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">สถานะ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={isOffice ? 5 : 7} className="px-6 py-8 text-center text-gray-500">
                    <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : data.sales && data.sales.length > 0 ? (
                isOffice ? (
                  data.sales.map((sale, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(sale.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(sale.rangsanTotal || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(sale.saoTotal || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatNumber(sale.total || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">
                          {sale.status || 'บันทึกแล้ว'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  data.sales.map((sale, index) => {
                    const delivery = (sale.grab || 0) + (sale.lineman || 0) + (sale.shopee || 0) + (sale.robinhood || 0);
                    const displayedTotal = (sale.cash || 0) + (sale.transfer || 0) + (sale.creditCard || 0) + delivery + (sale.halfHalf || 0) + (sale.other || 0);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(sale.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(sale.cash || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(sale.transfer || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(sale.creditCard || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(delivery)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatNumber(displayedTotal)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">
                            {sale.status || 'บันทึกแล้ว'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                <tr>
                  <td colSpan={isOffice ? 5 : 7} className="px-6 py-8 text-center text-gray-500">ไม่มีข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
}

export default Dashboard;

