/**
 * Supabase API Service
 * แทนที่ gasAPI — เชื่อมต่อกับตาราง Supabase โดยตรง
 * รูปแบบ response ให้ตรงกับที่ GAS คืนมาเพื่อให้ frontend ใช้ได้เหมือนเดิม
 */
import { supabase } from './supabaseClient';

function toYMD(d) {
  if (!d) return '';
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).trim();
  return toYMD(d);
}

// --- Login ---
async function loginUser(email, password) {
  try {
    const inputEmail = (email || '').toString().trim().toLowerCase();
    const inputPassword = (password || '').toString().trim();

    const { data: rows, error } = await supabase
      .from('User')
      .select('*');

    if (error) {
      console.error('[Supabase] loginUser error:', error);
      return { status: 'error', message: error.message };
    }

    for (const row of rows || []) {
      const rowEmail = (row.Email || '').toString().trim().toLowerCase();
      const rowPassword = (row.Password || '').toString().trim();
      if (rowEmail === inputEmail && rowPassword === inputPassword) {
        const branchCode = (row['Branch Code'] || '').toString().trim();
        const branchName = (row['Branch Name'] || row.Name || 'สาขา').toString().trim();
        let token = (row.Token || '').toString().trim();
        if (!token && branchCode) token = branchCode + '_' + Date.now();

        if (!token) token = branchCode || 'TEMP_' + Date.now();

        const role = (row.Role || row.role || 'branch').toString().trim().toLowerCase();
        return {
          status: 'success',
          user: {
            email: row.Email,
            name: row.Name || '',
            branchCode,
            branchName,
            token,
            role: role === 'admin' ? 'admin' : role === 'office' ? 'office' : 'branch'
          }
        };
      }
    }

    return { status: 'error', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  } catch (e) {
    console.error('[Supabase] loginUser:', e);
    return { status: 'error', message: e.message || e.toString() };
  }
}

// --- Dashboard ---
async function getDashboardData(branchCode, startDateStr, endDateStr) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    const startNorm = normalizeDate(startDateStr);
    const endNorm = normalizeDate(endDateStr);

    const { data: salesRows, error: salesErr } = await supabase
      .from('Sales')
      .select('*')
      .eq('Branch Code', searchBranch);

    if (salesErr) {
      console.error('[Supabase] getDashboardData sales:', salesErr);
      return { totalSales: 0, netProfit: 0, totalExpenses: 0, totalRecords: 0, sales: [], charts: defaultCharts() };
    }

    const { data: expenseRows, error: expErr } = await supabase
      .from('Expenses')
      .select('*')
      .eq('Branch Code', searchBranch);

    if (expErr) {
      console.error('[Supabase] getDashboardData expenses:', expErr);
    }

    let totalSales = 0;
    const sales = [];
    const salesList = salesRows || [];

    for (const row of salesList) {
      const dateVal = row.Date;
      const date = dateVal ? toYMD(dateVal) : '';
      if (!date) continue;
      if (startNorm && endNorm && (normalizeDate(date) < startNorm || normalizeDate(date) > endNorm)) continue;

      const cash = Number(row.Cash) || 0;
      const transfer = Number(row.Transfer) || 0;
      const grab = Number(row.Grab) || 0;
      const lineman = Number(row.Lineman) || 0;
      const shopee = Number(row.Shopee) || 0;
      const robinhood = Number(row.Robinhood) || 0;
      const creditCard = Number(row['Credit card']) || 0;
      const halfHalf = Number(row.HalfHalf) || 0;
      const other = Number(row.Other) || 0;
      const total = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;
      totalSales += total;
      sales.push({
        date,
        cash,
        transfer,
        grab,
        lineman,
        shopee,
        robinhood,
        creditCard,
        halfHalf,
        other,
        delivery: grab + lineman + shopee + robinhood,
        total,
        status: 'บันทึกแล้ว'
      });
    }

    sales.sort((a, b) => (normalizeDate(b.date) > normalizeDate(a.date) ? 1 : -1));

    let totalExpenses = 0;
    const expList = expenseRows || [];
    for (const row of expList) {
      const dateVal = row.Date;
      const date = dateVal ? toYMD(dateVal) : '';
      if (startNorm && endNorm && date && (normalizeDate(date) < startNorm || normalizeDate(date) > endNorm)) continue;
      totalExpenses += Number(row.Amount) || 0;
    }

    const charts = generateChartData(sales);

    return {
      totalSales,
      netProfit: totalSales - totalExpenses,
      totalExpenses,
      totalRecords: sales.length,
      sales,
      charts
    };
  } catch (e) {
    console.error('[Supabase] getDashboardData:', e);
    return { status: 'error', message: e.message };
  }
}

function defaultCharts() {
  return {
    line: { labels: [], sales: [] },
    pie: { labels: ['เงินสด', 'โอน', 'Grab', 'Lineman', 'Shopee', 'Robinhood', 'Credit Card', 'คนละครึ่ง', 'อื่นๆ'], data: [0, 0, 0, 0, 0, 0, 0, 0, 0] }
  };
}

function generateChartData(sales) {
  const weeklyData = {};
  const paymentData = { cash: 0, transfer: 0, grab: 0, lineman: 0, shopee: 0, robinhood: 0, creditCard: 0, halfHalf: 0, other: 0 };

  for (const s of sales) {
    if (s.date) {
      const d = new Date(s.date);
      const week = 'W' + Math.ceil(d.getDate() / 7);
      weeklyData[week] = (weeklyData[week] || 0) + (s.total || 0);
    }
    paymentData.cash += s.cash || 0;
    paymentData.transfer += s.transfer || 0;
    paymentData.grab += s.grab || 0;
    paymentData.lineman += s.lineman || 0;
    paymentData.shopee += s.shopee || 0;
    paymentData.robinhood += s.robinhood || 0;
    paymentData.creditCard += s.creditCard || 0;
    paymentData.halfHalf += s.halfHalf || 0;
    paymentData.other += s.other || 0;
  }

  const weeks = Object.keys(weeklyData).sort();
  const labels = ['เงินสด', 'โอน', 'Grab', 'Lineman', 'Shopee', 'Robinhood', 'Credit Card', 'คนละครึ่ง', 'อื่นๆ'];
  const data = [paymentData.cash, paymentData.transfer, paymentData.grab, paymentData.lineman, paymentData.shopee, paymentData.robinhood, paymentData.creditCard, paymentData.halfHalf, paymentData.other];

  return {
    line: { labels: weeks.length ? weeks : ['W1', 'W2', 'W3', 'W4'], sales: weeks.map(w => weeklyData[w] || 0) },
    pie: { labels, data }
  };
}

// --- Sales ---
async function getSalesData(branchCode, date) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    const targetDate = normalizeDate(date);

    const { data: rows, error } = await supabase
      .from('Sales')
      .select('*')
      .eq('Branch Code', searchBranch);

    if (error) return { status: 'error', message: error.message, data: null };

    for (const row of rows || []) {
      const rowDate = row.Date ? toYMD(row.Date) : '';
      if (normalizeDate(rowDate) !== targetDate) continue;

      return {
        status: 'success',
        data: {
          rowId: row.id,
          date: rowDate,
          cash: Number(row.Cash) || 0,
          transfer: Number(row.Transfer) || 0,
          grab: Number(row.Grab) || 0,
          lineman: Number(row.Lineman) || 0,
          shopee: Number(row.Shopee) || 0,
          robinhood: Number(row.Robinhood) || 0,
          creditCard: Number(row['Credit card']) || 0,
          halfHalf: Number(row.HalfHalf) || 0,
          other: Number(row.Other) || 0,
          totalSales: Number(row.Total) || 0,
          startingCash: Number(row.StartingCash) || 0,
          staffDiscount: Number(row.StaffDiscount) || 0,
          promoDiscount: Number(row.PromoDiscount) || 0,
          cashCounted: Number(row.CashCounted) || 0,
          waste: Number(row.Waste) || 0,
          depositAmount: Number(row.DepositAmount) || 0,
          cashBalance: Number(row.CashBalance) || 0,
          cashDiff: Number(row.CashDiff) || 0,
          notes: row.Notes || '',
          receiptFileName: row.ReceiptFileName || '',
          receiptImageUrl: row.ReceiptBase64 && row.ReceiptBase64.startsWith('http') ? row.ReceiptBase64 : (row.ReceiptImageUrl || ''),
          receiptImageBase64: ''
        }
      };
    }

    return { status: 'success', data: null, message: 'ไม่พบข้อมูลสำหรับวันที่นี้' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function getSalesDates(branchCode) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    const { data: rows, error } = await supabase
      .from('Sales')
      .select('Date')
      .eq('Branch Code', searchBranch);

    if (error) return { status: 'error', message: error.message, dates: [] };

    const set = new Set();
    for (const row of rows || []) {
      const d = row.Date ? toYMD(row.Date) : '';
      if (d) set.add(d);
    }
    return { status: 'success', dates: Array.from(set) };
  } catch (e) {
    return { status: 'error', message: e.message, dates: [] };
  }
}

async function saveSalesData(data) {
  try {
    const branchCode = (data.branchCode || '').toString().trim();
    const date = normalizeDate(data.date) || toYMD(new Date());
    const cash = parseFloat(data.cash) || 0;
    const transfer = parseFloat(data.transfer) || 0;
    const grab = parseFloat(data.grab) || 0;
    const lineman = parseFloat(data.lineman) || 0;
    const shopee = parseFloat(data.shopee) || 0;
    const robinhood = parseFloat(data.robinhood) || 0;
    const creditCard = parseFloat(data.creditCard) || 0;
    const halfHalf = parseFloat(data.halfHalf) || 0;
    const other = parseFloat(data.other) || 0;
    const total = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;
    const now = new Date().toISOString();

    const row = {
      'Branch Code': branchCode,
      'Date': date,
      'Cash': cash,
      'Transfer': transfer,
      'Grab': grab,
      'Lineman': lineman,
      'Shopee': shopee,
      'Robinhood': robinhood,
      'Credit card': creditCard,
      'HalfHalf': halfHalf,
      'Other': other,
      'Total': total,
      'StartingCash': parseFloat(data.startingCash) || 0,
      'StaffDiscount': parseFloat(data.staffDiscount) || 0,
      'PromoDiscount': parseFloat(data.promoDiscount) || 0,
      'CashCounted': parseFloat(data.cashCounted) || 0,
      'Waste': parseFloat(data.waste) || 0,
      'DepositAmount': parseFloat(data.depositAmount) || 0,
      'CashBalance': parseFloat(data.cashBalance) || 0,
      'CashDiff': parseFloat(data.cashDiff) || 0,
      'Notes': data.notes || '',
      'ReceiptFileName': data.receiptFileName || '',
      'ReceiptBase64': data.receiptImageUrl || data.receiptImageBase64 || '',
      'CreatedBy': data.email || '',
      'CreatedAt': now,
      'UpdatedAt': now
    };

    const { data: inserted, error } = await supabase.from('Sales').insert(row).select('id').single();
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'บันทึกข้อมูลยอดขายเรียบร้อยแล้ว', rowId: inserted?.id };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function updateSalesData(data) {
  try {
    const id = data.rowId;
    if (!id) return { status: 'error', message: 'Invalid row ID' };

    const branchCode = (data.branchCode || '').toString().trim();
    const date = normalizeDate(data.date) || toYMD(new Date());
    const cash = parseFloat(data.cash) || 0;
    const transfer = parseFloat(data.transfer) || 0;
    const grab = parseFloat(data.grab) || 0;
    const lineman = parseFloat(data.lineman) || 0;
    const shopee = parseFloat(data.shopee) || 0;
    const robinhood = parseFloat(data.robinhood) || 0;
    const creditCard = parseFloat(data.creditCard) || 0;
    const halfHalf = parseFloat(data.halfHalf) || 0;
    const other = parseFloat(data.other) || 0;
    const total = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;
    const now = new Date().toISOString();

    const row = {
      'Branch Code': branchCode,
      'Date': date,
      'Cash': cash,
      'Transfer': transfer,
      'Grab': grab,
      'Lineman': lineman,
      'Shopee': shopee,
      'Robinhood': robinhood,
      'Credit card': creditCard,
      'HalfHalf': halfHalf,
      'Other': other,
      'Total': total,
      'StartingCash': parseFloat(data.startingCash) || 0,
      'StaffDiscount': parseFloat(data.staffDiscount) || 0,
      'PromoDiscount': parseFloat(data.promoDiscount) || 0,
      'CashCounted': parseFloat(data.cashCounted) || 0,
      'Waste': parseFloat(data.waste) || 0,
      'DepositAmount': parseFloat(data.depositAmount) || 0,
      'CashBalance': parseFloat(data.cashBalance) || 0,
      'CashDiff': parseFloat(data.cashDiff) || 0,
      'Notes': data.notes || '',
      'ReceiptFileName': data.receiptFileName || '',
      'ReceiptBase64': data.receiptImageUrl || data.receiptImageBase64 || '',
      'CreatedBy': data.email || '',
      'UpdatedAt': now
    };

    const { error } = await supabase.from('Sales').update(row).eq('id', id);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'อัปเดตข้อมูลยอดขายเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function deleteSalesData(id) {
  try {
    if (id == null || id === '') return { status: 'error', message: 'ไม่มี id' };
    const { error } = await supabase.from('Sales').delete().eq('id', id);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'ลบรายการปิดยอดเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// --- Expenses ---
async function getExpenseHistory(branchCode) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    const { data: rows, error } = await supabase
      .from('Expenses')
      .select('*')
      .eq('Branch Code', searchBranch)
      .order('Timestamp', { ascending: false })
      .limit(20);

    if (error) return { status: 'error', message: error.message, data: [] };

    const resultList = (rows || []).map(row => ({
      id: row.id,
      date: row.Date ? toYMD(row.Date) : '',
      amount: Number(row.Amount) || 0,
      expenseType: row.Type || '',
      reason: row.Reason || '',
      notes: row.Notes || '',
      receiptFileName: row.ReceiptFileName || '',
      receiptImageUrl: row['Slip URL'] || ''
    }));

    return { status: 'success', data: resultList };
  } catch (e) {
    return { status: 'error', message: e.message, data: [] };
  }
}

async function saveExpenseData(data) {
  try {
    const row = {
      'Branch Code': (data.branchCode || '').toString().trim(),
      'Date': normalizeDate(data.date) || toYMD(new Date()),
      'Amount': parseFloat(data.amount) || 0,
      'Type': data.expenseType || '',
      'Reason': data.reason || '',
      'Notes': data.notes || '',
      'ReceiptFileName': data.receiptFileName || '',
      'Slip URL': data.receiptImageUrl || data.receiptBase64 || '',
      'Timestamp': new Date().toISOString()
    };

    const { error } = await supabase.from('Expenses').insert(row);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'บันทึกค่าใช้จ่ายเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function deleteExpense(id) {
  try {
    if (id == null || id === '') return { status: 'error', message: 'ไม่มี id' };
    const { error } = await supabase.from('Expenses').delete().eq('id', id);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'ลบค่าใช้จ่ายเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function getCashExpensesForDate(branchCode, dateStr) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    const targetDate = normalizeDate(dateStr);

    const { data: rows, error } = await supabase
      .from('Expenses')
      .select('*')
      .eq('Branch Code', searchBranch)
      .eq('Type', 'CASH_DRAWER');

    if (error) return 0;

    let total = 0;
    for (const row of rows || []) {
      const rowDate = row.Date ? toYMD(row.Date) : '';
      if (rowDate === targetDate) total += Number(row.Amount) || 0;
    }
    return total;
  } catch (e) {
    return 0;
  }
}

// --- Deposits ---
async function getDepositInfo(branchCode) {
  try {
    const searchBranch = (branchCode || '').toString().trim();

    const { data: depositRows, error: depErr } = await supabase
      .from('Deposits')
      .select('*')
      .eq('Branch Code', searchBranch);

    if (depErr) return { pendingBalance: 0, history: [] };

    let totalDeposits = 0;
    const history = (depositRows || []).map(row => {
      const amount = Number(row.Amount) || 0;
      totalDeposits += amount;
      return {
        id: row.id,
        date: row.Date ? toYMD(row.Date) : '',
        amount,
        slipFileName: row.ReceiptFileName || '',
        slipImageUrl: row['Slip URL'] || '',
        notes: ''
      };
    });

    const { data: salesRows } = await supabase.from('Sales').select('*').eq('Branch Code', searchBranch);
    const { data: expenseRows } = await supabase.from('Expenses').select('*').eq('Branch Code', searchBranch);

    const dailyExpenses = {};
    for (const row of expenseRows || []) {
      const d = row.Date ? toYMD(row.Date) : '';
      if (!d) continue;
      dailyExpenses[d] = (dailyExpenses[d] || 0) + (Number(row.Amount) || 0);
    }

    let totalDailyDeposits = 0;
    for (const row of salesRows || []) {
      const d = row.Date ? toYMD(row.Date) : '';
      if (!d) continue;
      const cash = Number(row.Cash) || 0;
      const dayExp = dailyExpenses[d] || 0;
      totalDailyDeposits += cash - dayExp;
    }

    const pendingBalance = totalDailyDeposits - totalDeposits;
    return { pendingBalance, history };
  } catch (e) {
    return { pendingBalance: 0, history: [] };
  }
}

async function saveDepositData(data) {
  try {
    const row = {
      'Branch Code': (data.branchCode || '').toString().trim(),
      'Date': normalizeDate(data.date) || toYMD(new Date()),
      'Amount': parseFloat(data.amount) || 0,
      'ReceiptFileName': data.slipFileName || '',
      'Slip URL': data.slipImageUrl || data.slipBase64 || '',
      'CreatedBy': data.email || '',
      'Timestamp': new Date().toISOString()
    };

    const { error } = await supabase.from('Deposits').insert(row);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'บันทึกการนำฝากเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function deleteDeposit(id) {
  try {
    if (id == null || id === '') return { status: 'error', message: 'ไม่มี id' };
    const { error } = await supabase.from('Deposits').delete().eq('id', id);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'ลบรายการนำฝากเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// --- Taxpayers ---
async function getTaxpayers() {
  try {
    const { data: rows, error } = await supabase.from('Taxpayers').select('*');
    if (error) return { status: 'error', message: error.message, data: [] };

    const taxpayers = (rows || []).map((row, i) => ({
      id: row.id,
      rowId: row.id,
      name: row.Name || '',
      taxId: (row.TaxId || '').toString().replace(/^'/, '')
    })).filter(t => t.name && t.taxId);

    return { status: 'success', data: taxpayers };
  } catch (e) {
    return { status: 'error', message: e.message, data: [] };
  }
}

async function saveTaxpayer(name, taxId) {
  try {
    const n = (name || '').toString().trim();
    const t = (taxId || '').toString().trim().replace(/^'/, '');
    if (!n || !t) return { status: 'error', message: 'กรุณากรอกชื่อและเลขที่ผู้เสียภาษี' };

    const { data: existing } = await supabase.from('Taxpayers').select('id').eq('Name', n).eq('TaxId', t).maybeSingle();
    if (existing) return { status: 'error', message: 'ข้อมูลผู้เสียภาษีนี้มีอยู่แล้ว' };

    const { data: inserted, error } = await supabase.from('Taxpayers').insert({ Name: n, TaxId: t }).select('id').single();
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'บันทึกข้อมูลผู้เสียภาษีเรียบร้อยแล้ว', data: { name: n, taxId: t }, rowId: inserted?.id };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// --- Tax Invoices ---
async function getTaxInvoices(branchCode) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    const { data: rows, error } = await supabase
      .from('TaxInvoices')
      .select('*')
      .eq('BranchCode', searchBranch)
      .order('Date', { ascending: false });

    if (error) return { status: 'error', message: error.message, data: [] };

    const invoices = (rows || []).map(row => ({
      id: row.id,
      date: row.Date ? toYMD(row.Date) : '',
      amount: Number(row.Amount) || 0,
      invoiceNumber: row.InvoiceNumber || '',
      taxpayerName: row.TaxpayerName || '',
      taxpayerTaxId: (row.TaxpayerTaxId || '').toString().replace(/^'/, ''),
      invoiceImageUrl: row.ReceiptBase64 && row.ReceiptBase64.startsWith('http') ? row.ReceiptBase64 : (row.ReceiptBase64 || '')
    }));

    return { status: 'success', data: invoices };
  } catch (e) {
    return { status: 'error', message: e.message, data: [] };
  }
}

async function saveTaxInvoice(data) {
  try {
    if (!data.branchCode || !data.date || !data.amount || !data.invoiceNumber || !data.taxpayerId) {
      return { status: 'error', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    const row = {
      BranchCode: (data.branchCode || '').toString().trim(),
      Date: normalizeDate(data.date),
      Amount: parseFloat(data.amount) || 0,
      InvoiceNumber: (data.invoiceNumber || '').toString().trim(),
      TaxpayerName: data.taxpayerName || '',
      TaxpayerTaxId: (data.taxpayerTaxId || data.taxpayerId || '').toString().trim().replace(/^'/, ''),
      CreatedAt: new Date().toISOString(),
      ReceiptBase64: data.invoiceImageUrl || data.imageBase64 || ''
    };

    const { data: inserted, error } = await supabase.from('TaxInvoices').insert(row).select('id').single();
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'บันทึกข้อมูลใบกำกับภาษีเรียบร้อยแล้ว', rowId: inserted?.id };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function deleteTaxInvoice(id) {
  try {
    if (id == null || id === '') return { status: 'error', message: 'ไม่มี id' };
    const { error } = await supabase.from('TaxInvoices').delete().eq('id', id);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'ลบใบกำกับภาษีเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// --- All Branches ---
async function getAllBranches() {
  try {
    const { data: rows, error } = await supabase.from('User').select('*');
    if (error) return { status: 'error', message: error.message };

    const map = new Map();
    for (const row of rows || []) {
      const code = (row['Branch Code'] || '').toString().trim();
      const name = (row['Branch Name'] || row.Name || code).toString().trim();
      const isAdmin = code.toLowerCase() === 'admin' || name.toLowerCase() === 'admin';
      if (code && !isAdmin && !map.has(code)) map.set(code, { code, name });
    }
    const branches = Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    return { status: 'success', data: branches };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function fixSalesTotalColumn(branchCode) {
  try {
    const searchBranch = (branchCode || '').toString().trim();
    let query = supabase.from('Sales').select('*');
    if (searchBranch) query = query.eq('Branch Code', searchBranch);
    const { data: rows, error } = await query;
    if (error || !rows || rows.length === 0) return { status: 'success', message: 'No rows to fix', fixedCount: 0, errorCount: 0, fixedRows: [], totalRows: 0 };

    let fixedCount = 0;
    for (const row of rows) {
      const cash = Number(row.Cash) || 0, transfer = Number(row.Transfer) || 0, grab = Number(row.Grab) || 0, lineman = Number(row.Lineman) || 0, shopee = Number(row.Shopee) || 0, robinhood = Number(row.Robinhood) || 0, creditCard = Number(row['Credit card']) || 0, halfHalf = Number(row.HalfHalf) || 0, other = Number(row.Other) || 0;
      const newTotal = cash + transfer + grab + lineman + shopee + robinhood + creditCard + halfHalf + other;
      const oldTotal = Number(row.Total) || 0;
      if (Math.abs(oldTotal - newTotal) > 0.01) {
        await supabase.from('Sales').update({ Total: newTotal }).eq('id', row.id);
        fixedCount++;
      }
    }
    return { status: 'success', message: `Fixed ${fixedCount} row(s)`, fixedCount, errorCount: 0, fixedRows: [], totalRows: rows.length };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ========== งบกำไรขาดทุนประจำเดือน (P&L) ==========

/** ดึงสรุปยอดขายตามเดือน สำหรับ P&L ส่วนที่ 1 */
async function getPnlSalesSummary(branchCode, yearMonth) {
  try {
    const [y, m] = yearMonth.split('-');
    const startDate = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    const { data: rows, error } = await supabase
      .from('Sales')
      .select('*')
      .eq('Branch Code', (branchCode || '').toString().trim());

    if (error) return { cash: 0, transfer: 0, creditCard: 0, halfHalf: 0, lineman: 0, grab: 0, shopee: 0, robinhood: 0, other: 0, totalSales: 0, staffDiscount: 0, promoDiscount: 0 };

    let cash = 0, transfer = 0, creditCard = 0, halfHalf = 0, lineman = 0, grab = 0, shopee = 0, robinhood = 0, other = 0, staffDiscount = 0, promoDiscount = 0;
    for (const row of rows || []) {
      const date = row.Date ? toYMD(row.Date) : '';
      if (!date || date < startDate || date > endDate) continue;
      cash += Number(row.Cash) || 0;
      transfer += Number(row.Transfer) || 0;
      creditCard += Number(row['Credit card']) || 0;
      halfHalf += Number(row.HalfHalf) || 0;
      lineman += Number(row.Lineman) || 0;
      grab += Number(row.Grab) || 0;
      shopee += Number(row.Shopee) || 0;
      robinhood += Number(row.Robinhood) || 0;
      other += Number(row.Other) || 0;
      staffDiscount += Number(row.StaffDiscount) || 0;
      promoDiscount += Number(row.PromoDiscount) || 0;
    }
    const totalSales = cash + transfer + creditCard + halfHalf + lineman + grab + shopee + robinhood + other;
    return { cash, transfer, creditCard, halfHalf, lineman, grab, shopee, robinhood, other, totalSales, staffDiscount, promoDiscount };
  } catch (e) {
    console.error('[Supabase] getPnlSalesSummary:', e);
    return { cash: 0, transfer: 0, creditCard: 0, halfHalf: 0, lineman: 0, grab: 0, shopee: 0, robinhood: 0, other: 0, totalSales: 0, staffDiscount: 0, promoDiscount: 0 };
  }
}

/** COGS: ยอดค่าใช้จ่ายทุกประเภทจากหน้ากรอกค่าใช้จ่าย (ในช่วงเวลาที่เลือก) + ยอดซื้อจากใบกำกับภาษี + บิลส่วนกลาง */
async function getPnlCogsSummary(branchCode, yearMonth) {
  try {
    const [y, m] = yearMonth.split('-');
    const startDate = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    let expensePurchase = 0;
    const { data: expRows } = await supabase.from('Expenses').select('*').eq('Branch Code', (branchCode || '').toString().trim());
    for (const row of expRows || []) {
      const date = row.Date ? toYMD(row.Date) : '';
      if (date && date >= startDate && date <= endDate) expensePurchase += Number(row.Amount) || 0;
    }

    let taxInvoicePurchase = 0;
    const { data: invRows } = await supabase.from('TaxInvoices').select('*').eq('BranchCode', (branchCode || '').toString().trim());
    for (const row of invRows || []) {
      const date = row.Date ? toYMD(row.Date) : '';
      if (date && date >= startDate && date <= endDate) taxInvoicePurchase += Number(row.Amount) || 0;
    }

    let centralBillsTotal = 0;
    const { data: billRows } = await supabase.from('CentralBills').select('*').eq('Branch Code', (branchCode || '').toString().trim());
    for (const row of billRows || []) {
      const date = row.BillDate ? toYMD(row.BillDate) : '';
      if (date && date >= startDate && date <= endDate) centralBillsTotal += Number(row.Amount) || 0;
    }

    return { expensePurchase, taxInvoicePurchase, centralBillsTotal, totalCogs: expensePurchase + taxInvoicePurchase + centralBillsTotal };
  } catch (e) {
    console.error('[Supabase] getPnlCogsSummary:', e);
    return { expensePurchase: 0, taxInvoicePurchase: 0, centralBillsTotal: 0, totalCogs: 0 };
  }
}

/** บิลจากส่วนกลาง: ดึงรายการตามเดือน */
async function getCentralBills(branchCode, yearMonth) {
  try {
    const [y, m] = yearMonth.split('-');
    const startDate = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('CentralBills')
      .select('*')
      .eq('Branch Code', (branchCode || '').toString().trim())
      .gte('BillDate', startDate)
      .lte('BillDate', endDate)
      .order('BillDate', { ascending: true });

    if (error) return [];
    return data || [];
  } catch (e) {
    return [];
  }
}

/** เพิ่มบิลส่วนกลาง */
async function addCentralBill(branchCode, { billNo, billDate, amount }) {
  try {
    const { data, error } = await supabase.from('CentralBills').insert({
      'Branch Code': (branchCode || '').toString().trim(),
      'BillNo': (billNo || '').toString().trim(),
      'BillDate': normalizeDate(billDate) || toYMD(new Date()),
      'Amount': parseFloat(amount) || 0
    }).select('*').single();
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', data };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/** ลบบิลส่วนกลาง */
async function deleteCentralBill(id) {
  try {
    const { error } = await supabase.from('CentralBills').delete().eq('id', id);
    if (error) return { status: 'error', message: error.message };
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/** ค่าใช้จ่ายดำเนินการ ตามเดือน */
async function getOperatingExpensesForMonth(branchCode, yearMonth) {
  try {
    const { data, error } = await supabase
      .from('OperatingExpenses')
      .select('*')
      .eq('Branch Code', (branchCode || '').toString().trim())
      .eq('YearMonth', yearMonth);

    if (error) return {};
    const map = {};
    for (const row of data || []) map[row.Category] = { amount: Number(row.Amount) || 0, notes: row.Notes || '', id: row.id };
    return map;
  } catch (e) {
    return {};
  }
}

/** บันทึกค่าใช้จ่ายดำเนินการ (upsert ตาม Category) */
const OPEX_CATEGORIES = ['salary', 'daily_wage', 'social_security', 'overtime', 'travel', 'commission', 'position_allowance', 'bonus', 'rent', 'electricity', 'water', 'phone', 'marketing', 'spoilage', 'pos_system', 'other'];

async function saveOperatingExpensesForMonth(branchCode, yearMonth, items) {
  try {
    const branch = (branchCode || '').toString().trim();
    for (const cat of OPEX_CATEGORIES) {
      const item = items[cat];
      const amount = item && (item.amount !== undefined && item.amount !== '') ? parseFloat(item.amount) || 0 : 0;
      const notes = (item && item.notes) ? String(item.notes) : '';

      const { data: existing } = await supabase
        .from('OperatingExpenses')
        .select('id')
        .eq('Branch Code', branch)
        .eq('YearMonth', yearMonth)
        .eq('Category', cat)
        .maybeSingle();

      if (existing) {
        await supabase.from('OperatingExpenses').update({ Amount: amount, Notes: notes, 'UpdatedAt': new Date().toISOString() }).eq('id', existing.id);
      } else {
        if (amount !== 0 || notes) await supabase.from('OperatingExpenses').insert({ 'Branch Code': branch, 'YearMonth': yearMonth, 'Category': cat, 'Amount': amount, 'Notes': notes });
      }
    }
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/** ตั้งค่า P&L (เช่น เปิด/ปิด VAT 7%) */
async function getPnlSettings(branchCode) {
  try {
    const { data, error } = await supabase.from('PnlSettings').select('*').eq('Branch Code', (branchCode || '').toString().trim()).maybeSingle();
    if (error || !data) return { enableVat7: true };
    return { enableVat7: !!data.EnableVat7 };
  } catch (e) {
    return { enableVat7: true };
  }
}

async function updatePnlSettings(branchCode, { enableVat7 }) {
  try {
    const branch = (branchCode || '').toString().trim();
    await supabase.from('PnlSettings').upsert({ 'Branch Code': branch, 'EnableVat7': !!enableVat7, 'UpdatedAt': new Date().toISOString() }, { onConflict: 'Branch Code' });
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// --- Office Sales (RANGSAN + SAO) ---
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

async function getOfficeSalesByDate(branchCode, dateStr) {
  try {
    const code = (branchCode || '').toString().trim();
    const date = normalizeDate(dateStr) || toYMD(new Date());
    const { data: rows, error } = await supabase
      .from('OfficeSales')
      .select('*')
      .eq('Branch Code', code)
      .eq('Date', date)
      .maybeSingle();
    if (error) return { status: 'error', message: error.message, data: null };
    return { status: 'success', data: rows };
  } catch (e) {
    return { status: 'error', message: e.message, data: null };
  }
}

async function getOfficeSales(branchCode, startDateStr, endDateStr) {
  try {
    const code = (branchCode || '').toString().trim();
    const start = normalizeDate(startDateStr);
    const end = normalizeDate(endDateStr);
    let q = supabase.from('OfficeSales').select('*').eq('Branch Code', code);
    if (start) q = q.gte('Date', start);
    if (end) q = q.lte('Date', end);
    const { data: rows, error } = await q.order('Date', { ascending: false });
    if (error) return { status: 'error', message: error.message, data: [] };
    return { status: 'success', data: rows || [] };
  } catch (e) {
    return { status: 'error', message: e.message, data: [] };
  }
}

async function saveOfficeSales(data) {
  try {
    const branchCode = (data.branchCode || '').toString().trim();
    const date = normalizeDate(data.date) || toYMD(new Date());
    const now = new Date().toISOString();
    const row = {
      'Branch Code': branchCode,
      'Date': date,
      'Notes': data.notes || null,
      'CreatedBy': data.email || null,
      'CreatedAt': now,
      'UpdatedAt': now
    };
    OFFICE_SALES_KEYS.forEach(k => { row[k] = parseFloat(data[k]) || 0; });
    const rangsanTotal = OFFICE_SALES_KEYS.filter(k => k.startsWith('rangsan_')).reduce((sum, k) => sum + (row[k] || 0), 0);
    const saoTotal = OFFICE_SALES_KEYS.filter(k => k.startsWith('sao_')).reduce((sum, k) => sum + (row[k] || 0), 0);
    row.rangsan_total = rangsanTotal;
    row.sao_total = saoTotal;

    const { error } = await supabase.from('OfficeSales').upsert(row, {
      onConflict: ['Branch Code', 'Date']
    });
    if (error) return { status: 'error', message: error.message };
    return { status: 'success', message: 'บันทึกยอดขาย Office เรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

async function updateOfficeSales(data) {
  return saveOfficeSales(data);
}

/** สรุปยอดขาย Office ตามเดือน สำหรับงบกำไรขาดทุน (ดึงจากตาราง OfficeSales / หน้ายอดขายสำนักงาน) */
async function getPnlOfficeSalesSummary(branchCode, yearMonth) {
  try {
    const code = (branchCode || '').toString().trim();
    const [y, m] = (yearMonth || '').split('-');
    if (!y || !m) return { totalSales: 0, staffDiscount: 0, promoDiscount: 0, ...Object.fromEntries(OFFICE_SALES_KEYS.map(k => [k, 0])) };
    const startDate = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    const { data: rows, error } = await supabase
      .from('OfficeSales')
      .select('*')
      .eq('Branch Code', code)
      .gte('Date', startDate)
      .lte('Date', endDate);

    if (error) return { totalSales: 0, staffDiscount: 0, promoDiscount: 0, ...Object.fromEntries(OFFICE_SALES_KEYS.map(k => [k, 0])) };

    const sum = Object.fromEntries(OFFICE_SALES_KEYS.map(k => [k, 0]));
    let totalSales = 0;
    for (const row of rows || []) {
      OFFICE_SALES_KEYS.forEach(k => { sum[k] += Number(row[k]) || 0; });
      totalSales += (Number(row.rangsan_total) || 0) + (Number(row.sao_total) || 0);
    }
    return { ...sum, totalSales, staffDiscount: 0, promoDiscount: 0 };
  } catch (e) {
    console.error('[Supabase] getPnlOfficeSalesSummary:', e);
    return { totalSales: 0, staffDiscount: 0, promoDiscount: 0, ...Object.fromEntries(OFFICE_SALES_KEYS.map(k => [k, 0])) };
  }
}

export const supabaseAPI = {
  loginUser,
  getDashboardData,
  saveSalesData,
  getSalesData,
  getSalesDates,
  updateSalesData,
  deleteSalesData,
  saveExpenseData,
  saveDepositData,
  deleteDeposit,
  getExpenseHistory,
  getDepositInfo,
  deleteExpense,
  getCashExpensesForDate,
  getTaxpayers,
  saveTaxpayer,
  getTaxInvoices,
  saveTaxInvoice,
  deleteTaxInvoice,
  getAllBranches,
  fixSalesTotalColumn,
  getPnlSalesSummary,
  getPnlCogsSummary,
  getCentralBills,
  addCentralBill,
  deleteCentralBill,
  getOperatingExpensesForMonth,
  saveOperatingExpensesForMonth,
  getPnlSettings,
  updatePnlSettings,
  getOfficeSalesByDate,
  getOfficeSales,
  saveOfficeSales,
  updateOfficeSales,
  getPnlOfficeSalesSummary
};

export { OPEX_CATEGORIES };
