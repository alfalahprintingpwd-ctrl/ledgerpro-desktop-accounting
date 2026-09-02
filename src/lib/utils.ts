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

export { hashPassword, verifyPassword, legacySimpleHash } from './crypto';
import { legacySimpleHash } from './crypto';

// Hash function for local client password and recovery answer storage
export function simpleHash(text: string): string {
  return legacySimpleHash(text);
}

export function generateInvoiceNumber(profile: BusinessProfile, year: number): string {
  const prefix = profile.invoicePrefix || 'INV-';
  const seq = String(profile.nextInvoiceSeq || 1).padStart(4, '0');
  return `${prefix}${year}-${seq}`;
}

export function generateVoucherNumber(
  profile: BusinessProfile | null,
  year: number,
  expenses: Expense[] = []
): string {
  const prefix = profile?.expensePrefix || 'EXP-';
  
  // Find highest existing sequence for this prefix/year to ensure no duplication even after deletions
  let maxSeq = (profile?.nextExpenseSeq || 1) - 1;
  
  expenses.forEach((e) => {
    if (e.voucherNumber) {
      // Check if matches EXP-YYYY-#### or similar
      const parts = e.voucherNumber.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = Math.max(maxSeq + 1, profile?.nextExpenseSeq || 1);
  const seqStr = String(nextSeq).padStart(4, '0');
  return `${prefix}${year}-${seqStr}`;
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

  const openingCash = Number(monthFile?.openingCash || 0);
  const openingBank = Number(
    monthFile?.openingBank !== undefined
      ? monthFile.openingBank
      : monthFile?.openingAccount || 0
  );
  const openingTotal = openingCash + openingBank;

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
    openingAccount: openingBank,
    openingTotal,
    cashBalance,
    bankBalance,
    accountBalance: bankBalance,
    totalAvailableBalance,
    closingCash: cashBalance,
    closingBank: bankBalance,
    closingAccount: bankBalance,
    closingTotal: totalAvailableBalance,
    invoiceCount: monthTx.length,
    expenseCount: monthExp.length,
    transferCashNet,
    netCashTransfers: transferCashNet,
    netBankTransfers: -transferCashNet,
    netTransferCashToBank: transferCashNet,
    grossOperatingResult: totalSales - totalExpenses,
    netCashFlow: totalReceived - totalExpenses,
  };
}

/**
 * Synchronizes the entire forward carry-over chain of monthly files.
 * Rule: For every chronological month after the base month,
 * Opening Cash = Previous Month Closing Cash
 * Opening Bank = Previous Month Closing Bank
 * Opening Total = Opening Cash + Opening Bank
 */
export function syncAllMonthBalances(
  months: MonthFile[],
  transactions: Transaction[],
  expenses: Expense[],
  transfers: CashBankTransfer[]
): MonthFile[] {
  if (!months || months.length === 0) return [];

  // Sort chronological order by id (e.g. "2026-06", "2026-07", "2026-08")
  const sorted = [...months].sort((a, b) => a.id.localeCompare(b.id));
  const synchronized: MonthFile[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    let openingCash = Number(current.openingCash || 0);
    let openingBank = Number(current.openingBank || current.openingAccount || 0);

    // If there is a previous chronological month, strictly carry forward its closing balance!
    if (i > 0) {
      const prev = synchronized[i - 1];
      openingCash = Number(prev.closingCash ?? 0);
      openingBank = Number(prev.closingBank ?? prev.closingAccount ?? 0);
    }

    const openingTotal = openingCash + openingBank;

    // Calculate this month's financial totals with the synchronized opening balances
    const tempMonthFile: MonthFile = {
      ...current,
      openingCash,
      openingBank,
      openingAccount: openingBank,
      openingTotal,
    };

    const totals = calculateMonthTotals(
      current.id,
      transactions,
      expenses,
      transfers,
      tempMonthFile
    );

    const year = current.year || parseInt(current.id.slice(0, 4)) || 2026;
    const monthNum = current.monthNumber || parseInt(current.id.slice(5, 7)) || 1;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const startDate = current.startDate || `${current.id}-01`;
    const endDate = current.endDate || `${current.id}-${String(lastDayOfMonth).padStart(2, '0')}`;

    synchronized.push({
      ...current,
      year,
      monthNumber: monthNum,
      startDate,
      endDate,
      openingCash,
      openingBank,
      openingAccount: openingBank,
      openingTotal,
      closingCash: totals.cashBalance,
      closingBank: totals.bankBalance,
      closingAccount: totals.bankBalance,
      closingTotal: totals.totalAvailableBalance,
    });
  }

  return synchronized;
}

/**
 * Find the immediate previous chronological month file from a list of months
 */
export function getPreviousMonthFile(
  monthId: string,
  months: MonthFile[]
): MonthFile | undefined {
  if (!months || months.length === 0) return undefined;
  const sorted = [...months].sort((a, b) => a.id.localeCompare(b.id));
  const currentIndex = sorted.findIndex((m) => m.id === monthId);
  if (currentIndex > 0) {
    return sorted[currentIndex - 1];
  }
  return undefined;
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
