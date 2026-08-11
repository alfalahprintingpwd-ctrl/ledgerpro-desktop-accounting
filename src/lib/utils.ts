import { Transaction, Expense, CashBankTransfer, MonthFile, BusinessProfile } from '../types';

export {
  getSystemTimeZone,
  getUserTimeZone,
  getLocalAccountingDate,
  getLocalDateTime,
  getLocalAccountingMonthId,
  getLocalAccountingYear,
  getLocalAccountingMonthNumber,
  parseLocalDate,
  getDayOfWeek,
  getDayName,
  formatDateToDDMonthYYYY,
  formatDate,
  formatDateTimeLocal,
  formatDateTimePKT,
  addDaysToLocalDate,
  useLocalDateWatcher,
} from './dateUtils';

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

// Simple hash for local client password storage
export function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'lp_hash_' + Math.abs(hash).toString(36) + '_' + text.length;
}

export function generateInvoiceNumber(profile: BusinessProfile, year: number): string {
  const prefix = profile.invoicePrefix || 'INV-';
  const seq = String(profile.nextInvoiceSeq || 1).padStart(4, '0');
  return `${prefix}${year}-${seq}`;
}

export function calculateMonthTotals(
  monthId: string,
  transactions: Transaction[],
  expenses: Expense[],
  transfers: CashBankTransfer[],
  monthFile?: MonthFile
) {
  const monthTx = transactions.filter((t) => t.monthId === monthId && !t.isVoided && t.status !== 'voided');
  const monthExp = expenses.filter((e) => e.monthId === monthId);
  const monthTransfers = transfers.filter((t) => t.monthId === monthId);

  const totalSales = monthTx.reduce((sum, t) => sum + t.grandTotal, 0);
  const totalReceived = monthTx.reduce((sum, t) => sum + t.totalReceived, 0);
  const totalPending = monthTx.reduce((sum, t) => sum + t.pendingAmount, 0);
  const totalExpenses = monthExp.reduce((sum, e) => sum + e.amount, 0);

  const cashReceived = monthTx.reduce((sum, t) => sum + t.cashReceived, 0);
  const bankReceived = monthTx.reduce((sum, t) => sum + t.bankReceived, 0);

  const cashExpenses = monthExp
    .filter((e) => e.paymentSource === 'Cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const bankExpenses = monthExp
    .filter((e) => e.paymentSource === 'Bank')
    .reduce((sum, e) => sum + e.amount, 0);

  const transferCashNet = monthTransfers.reduce((net, tr) => {
    if (tr.from === 'Bank' && tr.to === 'Cash') return net + tr.amount;
    if (tr.from === 'Cash' && tr.to === 'Bank') return net - tr.amount;
    return net;
  }, 0);

  const openingCash = monthFile?.openingCash || 0;
  const openingBank = monthFile?.openingBank || 0;

  const cashBalance = openingCash + cashReceived - cashExpenses + transferCashNet;
  const bankBalance = openingBank + bankReceived - bankExpenses - transferCashNet;
  const totalAvailableBalance = cashBalance + bankBalance;

  return {
    totalSales,
    totalReceived,
    totalPending,
    totalExpenses,
    cashReceived,
    bankReceived,
    cashExpenses,
    bankExpenses,
    openingCash,
    openingBank,
    cashBalance,
    bankBalance,
    totalAvailableBalance,
    invoiceCount: monthTx.length,
    grossOperatingResult: totalSales - totalExpenses,
  };
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  };

  const csvContent = rows.map(processRow).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
