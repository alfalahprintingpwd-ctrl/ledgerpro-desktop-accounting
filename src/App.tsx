import React, { useState, useEffect } from 'react';
import {
  AppData,
  BusinessProfile,
  Transaction,
  Expense,
  CashBankTransfer,
  MonthFile,
  Customer,
  PasswordRecoveryConfig,
  SecurityAuditLog,
} from './types';
import {
  getInitialData,
  saveAppData,
  clearAppData,
  generateSampleData,
  DEFAULT_CATEGORIES,
} from './lib/storage';
import { calculateMonthTotals, simpleHash } from './lib/utils';
import { createSecurityLog } from './lib/security';

// UI Components
import { SetupWizard } from './components/SetupWizard';
import { LockScreen } from './components/LockScreen';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Dashboard } from './components/Dashboard';
import { SalesEntries } from './components/SalesEntries';
import { NewSalesModal } from './components/NewSalesModal';
import { InvoiceModal } from './components/InvoiceModal';
import { DeleteInvoiceModal } from './components/DeleteInvoiceModal';
import { Expenses } from './components/Expenses';
import { CashBank } from './components/CashBank';
import { Customers } from './components/Customers';
import { MonthlyFiles } from './components/MonthlyFiles';
import { DailyReport } from './components/DailyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { YearlyReport } from './components/YearlyReport';
import { BackupRestore } from './components/BackupRestore';
import { BusinessSettings } from './components/BusinessSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { HelpAbout } from './components/HelpAbout';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { getSavedShortcuts, isInputField, matchKeyCombo } from './lib/shortcuts';
import { getLocalAccountingMonthId } from './lib/utils';

export default function App() {
  const [appData, setAppData] = useState<AppData>(getInitialData);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNewSalesModalOpen, setIsNewSalesModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<Transaction | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [deleteModalTx, setDeleteModalTx] = useState<Transaction | null>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Global Floating Toast Message
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Global Keyboard Shortcut System
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. F1 works anywhere to toggle Shortcuts Help Modal
      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // If software is locked, do NOT execute application shortcuts (security rule)
      if (isLocked) return;

      const activeElem = document.activeElement;
      const typingInInput = isInputField(activeElem);

      const shortcuts = getSavedShortcuts();
      const getCombo = (id: string) => {
        const found = shortcuts.find((s) => s.id === id);
        return found ? found.customKeyCombo || found.defaultKeyCombo : '';
      };

      // 2. ESC key logic
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
        } else if (isInvoiceModalOpen) {
          setIsInvoiceModalOpen(false);
          setSelectedInvoiceTx(null);
        } else if (deleteModalTx) {
          setDeleteModalTx(null);
        } else if (searchQuery) {
          setSearchQuery('');
        }
        return;
      }

      // 3. Security Shortcuts
      if (matchKeyCombo(e, getCombo('lock_software'))) {
        e.preventDefault();
        setIsLocked(true);
        setToastMessage({ type: 'info', text: 'Software locked (Ctrl+L)' });
        return;
      }
      if (matchKeyCombo(e, getCombo('logout_session'))) {
        e.preventDefault();
        setIsLocked(true);
        setToastMessage({ type: 'info', text: 'Session logged out safely (Ctrl+Shift+L)' });
        return;
      }

      // If typing in input, ignore navigation & action shortcuts unless Ctrl/Alt combo
      if (typingInInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
        return;
      }

      // 4. Focus Search (Ctrl+F)
      if (matchKeyCombo(e, getCombo('focus_search'))) {
        e.preventDefault();
        const searchInput = document.getElementById('main-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // 5. Create New Entry (Ctrl+N or Ctrl+I)
      if (
        matchKeyCombo(e, getCombo('new_entry')) ||
        matchKeyCombo(e, getCombo('new_invoice'))
      ) {
        e.preventDefault();
        setEditingTransaction(null);
        setIsNewSalesModalOpen(true);
        return;
      }

      // 6. Navigation (Alt + Keys)
      if (matchKeyCombo(e, getCombo('nav_dashboard'))) {
        e.preventDefault();
        setActiveTab('dashboard');
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_sales'))) {
        e.preventDefault();
        setActiveTab('sales');
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_new_entry'))) {
        e.preventDefault();
        setEditingTransaction(null);
        setIsNewSalesModalOpen(true);
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_customers'))) {
        e.preventDefault();
        setActiveTab('customers');
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_expenses'))) {
        e.preventDefault();
        setActiveTab('expenses');
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_reports'))) {
        e.preventDefault();
        setActiveTab('daily_report');
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_settings'))) {
        e.preventDefault();
        setActiveTab('settings');
        return;
      }
      if (matchKeyCombo(e, getCombo('nav_backup'))) {
        e.preventDefault();
        setActiveTab('backup_restore');
        return;
      }

      // 7. Monthly Report Navigation (Ctrl+Shift+Left / Right)
      if (
        (activeTab === 'monthly_files' || activeTab === 'monthly_reports') &&
        appData.months.length > 0
      ) {
        if (matchKeyCombo(e, getCombo('monthly_prev_month'))) {
          e.preventDefault();
          const currentIdx = appData.months.findIndex(
            (m) => m.id === appData.activeMonthId
          );
          if (currentIdx > 0) {
            setAppData((prev) => ({
              ...prev,
              activeMonthId: prev.months[currentIdx - 1].id,
            }));
            setToastMessage({
              type: 'info',
              text: `Switched month: ${appData.months[currentIdx - 1].name}`,
            });
          }
        } else if (matchKeyCombo(e, getCombo('monthly_next_month'))) {
          e.preventDefault();
          const currentIdx = appData.months.findIndex(
            (m) => m.id === appData.activeMonthId
          );
          if (currentIdx >= 0 && currentIdx < appData.months.length - 1) {
            setAppData((prev) => ({
              ...prev,
              activeMonthId: prev.months[currentIdx + 1].id,
            }));
            setToastMessage({
              type: 'info',
              text: `Switched month: ${appData.months[currentIdx + 1].name}`,
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isLocked,
    isShortcutsModalOpen,
    isInvoiceModalOpen,
    deleteModalTx,
    searchQuery,
    activeTab,
    appData.months,
    appData.activeMonthId,
  ]);

  // Save to local storage whenever appData changes
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Handle Setup Wizard Completion
  const handleSetupComplete = (
    profile: BusinessProfile,
    passwordHash: string,
    recoveryConfig: PasswordRecoveryConfig,
    initialLog: SecurityAuditLog
  ) => {
    const todayMonthId = getLocalAccountingMonthId();
    const year = Number(todayMonthId.slice(0, 4));
    const monthNum = Number(todayMonthId.slice(5, 7));

    const MONTH_NAMES = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const initialMonth: MonthFile = {
      id: todayMonthId,
      year,
      monthNumber: monthNum,
      monthName: MONTH_NAMES[monthNum - 1],
      status: 'active',
      openingCash: 0,
      openingBank: 0,
    };

    const newAppData: AppData = {
      businessProfile: profile,
      passwordHash,
      recoveryConfig,
      securityLogs: [initialLog],
      months: [initialMonth],
      activeMonthId: todayMonthId,
      transactions: [],
      expenses: [],
      transfers: [],
      customCategories: DEFAULT_CATEGORIES,
    };

    setAppData(newAppData);
    setIsLocked(false);
  };

  // Handle Password Reset and Recovery Updates
  const handlePasswordReset = (
    newHash: string,
    updatedConfig?: PasswordRecoveryConfig,
    auditLog?: SecurityAuditLog
  ) => {
    setAppData((prev) => ({
      ...prev,
      passwordHash: newHash,
      recoveryConfig: updatedConfig || prev.recoveryConfig,
      securityLogs: auditLog
        ? [auditLog, ...(prev.securityLogs || [])]
        : prev.securityLogs,
    }));
  };

  // Populate Sample Printing Studio Demo Data
  const handleLoadSampleData = () => {
    const sample = generateSampleData();
    setAppData(sample);
    setIsLocked(false);
  };

  // Factory / First-Run State Reset
  const handleFactoryReset = (providedPassword?: string): boolean => {
    // If password is provided, verify it matches
    if (appData.passwordHash && providedPassword) {
      if (simpleHash(providedPassword) !== appData.passwordHash) {
        console.error('Password verification failed during software reset request.');
        return false;
      }
    }

    // Record local security/audit event before performing reset
    const auditLog = createSecurityLog(
      'software_reset_initiated',
      'Software factory reset executed.'
    );
    console.log('Audit Log Created:', auditLog);

    const cleanData = clearAppData();
    setAppData(cleanData);
    setIsLocked(false);
    setActiveTab('dashboard');
    setSearchQuery('');
    return true;
  };

  // Check setup
  if (!appData.businessProfile || !appData.passwordHash) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans">
        <SetupWizard onComplete={handleSetupComplete} />
      </div>
    );
  }

  // Lock Screen
  if (isLocked) {
    return (
      <LockScreen
        businessProfile={appData.businessProfile}
        passwordHash={appData.passwordHash}
        recoveryConfig={appData.recoveryConfig}
        onUnlock={() => setIsLocked(false)}
        onPasswordReset={handlePasswordReset}
        onLoadSampleData={handleLoadSampleData}
        onFactoryReset={handleFactoryReset}
      />
    );
  }

  // Current active month
  const activeMonth =
    appData.months.find((m) => m.id === appData.activeMonthId) ||
    appData.months[appData.months.length - 1];

  const monthId = activeMonth?.id || '';

  // Calculate overall financial balances for top header
  const totals = calculateMonthTotals(
    monthId,
    appData.transactions,
    appData.expenses,
    appData.transfers,
    activeMonth
  );

  // Derive Customers list automatically from all transactions
  const deriveCustomersList = (): Customer[] => {
    const map: Record<string, Customer> = {};

    // 1st Pass: Collect customer contact records from all transactions
    appData.transactions.forEach((tx) => {
      const key = tx.customerName.toLowerCase().trim();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: `cust_${key.replace(/[^a-z0-9]/g, '')}`,
          name: tx.customerName,
          phone: tx.customerPhone || '',
          address: tx.customerAddress || '',
          totalPurchases: 0,
          totalPaid: 0,
          totalPending: 0,
          lastActive: tx.date,
        };
      } else {
        if (tx.customerPhone && !map[key].phone) map[key].phone = tx.customerPhone;
        if (tx.customerAddress && !map[key].address) map[key].address = tx.customerAddress;
      }
    });

    // 2nd Pass: Sum financial totals ONLY from active non-voided transactions
    appData.transactions.forEach((tx) => {
      if (tx.isVoided || tx.status === 'voided') return;
      const key = tx.customerName.toLowerCase().trim();
      if (map[key]) {
        map[key].totalPurchases += tx.grandTotal;
        map[key].totalPaid += tx.totalReceived;
        map[key].totalPending += tx.pendingAmount;
        if (tx.date > map[key].lastActive) map[key].lastActive = tx.date;
      }
    });

    return Object.values(map);
  };

  const customersList = deriveCustomersList();

  // Real-time Global Invoice & Customer Filter
  const filterTransactions = (txList: Transaction[], query: string): Transaction[] => {
    const q = query.trim().toLowerCase();
    if (!q) return txList;

    const cleanPhoneQuery = q.replace(/[^0-9]/g, '');

    return txList.filter((tx) => {
      // 1. Customer Name (e.g. Ali, Ali Khan, Muhammad Ali)
      const matchCustomer = tx.customerName.toLowerCase().includes(q);

      // 2. Invoice Number (e.g. INV-2026-0025)
      const matchInv = tx.invoiceNumber.toLowerCase().includes(q);

      // 3. Contact Number / WhatsApp (e.g. 0336-4447881)
      const phoneLower = (tx.customerPhone || '').toLowerCase();
      const cleanPhone = phoneLower.replace(/[^0-9]/g, '');
      const matchPhone =
        phoneLower.includes(q) ||
        (cleanPhoneQuery.length >= 3 && cleanPhone.includes(cleanPhoneQuery));

      // 4. Products / Items
      const matchItem = tx.items.some(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q))
      );

      return matchCustomer || matchInv || matchPhone || matchItem;
    });
  };

  // Save / Update Sales Entry
  const handleSaveTransaction = (tx: Transaction) => {
    setAppData((prev) => {
      const existingIdx = prev.transactions.findIndex((t) => t.id === tx.id);
      let updatedTxList = [...prev.transactions];
      let nextSeq = prev.businessProfile?.nextInvoiceSeq || 1001;
      let logs = [...(prev.securityLogs || [])];

      if (existingIdx >= 0) {
        const oldTx = prev.transactions[existingIdx];
        updatedTxList[existingIdx] = tx;
        logs.unshift(
          createSecurityLog(
            'invoice_edited',
            `Invoice #${tx.invoiceNumber} edited for ${tx.customerName}. Subtotal: $${oldTx.subtotal} -> $${tx.subtotal}, Total: $${oldTx.grandTotal} -> $${tx.grandTotal}`
          )
        );
      } else {
        updatedTxList.push(tx);
        nextSeq += 1;
      }

      // Ensure month file exists for transaction date if not already
      const txMonthId = tx.monthId || tx.date.slice(0, 7);
      let updatedMonths = [...prev.months];
      if (!updatedMonths.some((m) => m.id === txMonthId)) {
        const year = Number(txMonthId.slice(0, 4)) || 2026;
        const monthNum = Number(txMonthId.slice(5, 7)) || 1;
        const MONTH_NAMES = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        updatedMonths.push({
          id: txMonthId,
          year,
          monthNumber: monthNum,
          monthName: MONTH_NAMES[monthNum - 1] || 'January',
          status: 'active',
          openingCash: 0,
          openingBank: 0,
        });
      }

      return {
        ...prev,
        businessProfile: prev.businessProfile
          ? { ...prev.businessProfile, nextInvoiceSeq: nextSeq }
          : null,
        transactions: updatedTxList,
        months: updatedMonths,
        securityLogs: logs,
      };
    });

    setIsNewSalesModalOpen(false);
    setEditingTransaction(null);

    // Open Generated Invoice automatically
    setSelectedInvoiceTx(tx);
    setIsInvoiceModalOpen(true);
  };

  // Delete Transaction Permanently
  const handleDeleteTransactionPermanently = (tx: Transaction) => {
    setAppData((prev) => {
      const logs = [...(prev.securityLogs || [])];
      logs.unshift(
        createSecurityLog(
          'invoice_deleted',
          `Invoice #${tx.invoiceNumber} for ${tx.customerName} ($${tx.grandTotal}) permanently deleted.`
        )
      );
      return {
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== tx.id),
        securityLogs: logs,
      };
    });
    setDeleteModalTx(null);
  };

  // Void Transaction (Mark as Voided, preserve record, reverse financial effect)
  const handleVoidTransaction = (tx: Transaction, reason: string) => {
    setAppData((prev) => {
      const logs = [...(prev.securityLogs || [])];
      logs.unshift(
        createSecurityLog(
          'invoice_voided',
          `Invoice #${tx.invoiceNumber} for ${tx.customerName} ($${tx.grandTotal}) voided. Reason: ${reason}`
        )
      );
      const updatedTx = prev.transactions.map((t) =>
        t.id === tx.id
          ? {
              ...t,
              isVoided: true,
              status: 'voided' as const,
              voidedAt: new Date().toISOString(),
              voidedReason: reason,
            }
          : t
      );
      return {
        ...prev,
        transactions: updatedTx,
        securityLogs: logs,
      };
    });
    setDeleteModalTx(null);
  };

  // Save Expense
  const handleSaveExpense = (exp: Expense) => {
    setAppData((prev) => {
      const existingIdx = prev.expenses.findIndex((e) => e.id === exp.id);
      let updatedList = [...prev.expenses];
      if (existingIdx >= 0) {
        updatedList[existingIdx] = exp;
      } else {
        updatedList.push(exp);
      }
      return { ...prev, expenses: updatedList };
    });
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  // Custom Expense Category
  const handleAddCustomCategory = (name: string) => {
    setAppData((prev) => ({
      ...prev,
      customCategories: [
        ...prev.customCategories,
        { id: `cat_${Date.now()}`, name, isCustom: true },
      ],
    }));
  };

  // Add Cash Bank Transfer
  const handleAddTransfer = (tr: CashBankTransfer) => {
    setAppData((prev) => ({
      ...prev,
      transfers: [...prev.transfers, tr],
    }));
  };

  // Create New Month File
  const handleCreateNewMonth = (year: number, monthNum: number, monthName: string) => {
    const newId = `${year}-${String(monthNum).padStart(2, '0')}`;
    if (appData.months.some((m) => m.id === newId)) {
      setAppData((prev) => ({ ...prev, activeMonthId: newId }));
      return;
    }

    // Carry forward closing balance from previous month
    const prevMonthTotals = totals;

    const newMonthFile: MonthFile = {
      id: newId,
      year,
      monthNumber: monthNum,
      monthName,
      status: 'active',
      openingCash: prevMonthTotals.cashBalance,
      openingBank: prevMonthTotals.bankBalance,
    };

    setAppData((prev) => ({
      ...prev,
      months: [...prev.months, newMonthFile].sort((a, b) => a.id.localeCompare(b.id)),
      activeMonthId: newId,
    }));
  };

  // Finish / Close Month
  const handleFinishMonth = (mId: string) => {
    setAppData((prev) => {
      const updatedMonths = prev.months.map((m) => {
        if (m.id === mId) {
          return { ...m, status: 'closed' as const, closedAt: new Date().toISOString() };
        }
        return m;
      });

      // Calculate closing balances
      const currentM = prev.months.find((m) => m.id === mId);
      const mTotals = calculateMonthTotals(mId, prev.transactions, prev.expenses, prev.transfers, currentM);

      // Auto create next month if not exists
      const year = Number(mId.slice(0, 4));
      const monthNum = Number(mId.slice(5, 7));
      const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
      const nextYear = monthNum === 12 ? year + 1 : year;
      const nextId = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`;

      const MONTH_NAMES = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      if (!updatedMonths.some((m) => m.id === nextId)) {
        updatedMonths.push({
          id: nextId,
          year: nextYear,
          monthNumber: nextMonthNum,
          monthName: MONTH_NAMES[nextMonthNum - 1],
          status: 'active',
          openingCash: mTotals.cashBalance,
          openingBank: mTotals.bankBalance,
        });
      }

      return {
        ...prev,
        months: updatedMonths.sort((a, b) => a.id.localeCompare(b.id)),
        activeMonthId: nextId,
      };
    });
  };

  // Reopen Closed Month
  const handleReopenMonth = (mId: string) => {
    setAppData((prev) => ({
      ...prev,
      months: prev.months.map((m) => (m.id === mId ? { ...m, status: 'active' as const } : m)),
    }));
  };

  // View Invoice
  const handleViewInvoice = (tx: Transaction) => {
    setSelectedInvoiceTx(tx);
    setIsInvoiceModalOpen(true);
  };

  // Edit Sales Entry
  const handleEditSalesModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsNewSalesModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        businessProfile={appData.businessProfile}
        onLock={() => setIsLocked(true)}
        onOpenShortcutsHelp={() => setIsShortcutsModalOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <TopHeader
          activeMonth={activeMonth}
          months={appData.months}
          onSelectMonth={(id) => setAppData((prev) => ({ ...prev, activeMonthId: id }))}
          onOpenNewSalesModal={() => {
            setEditingTransaction(null);
            setIsNewSalesModalOpen(true);
          }}
          onOpenNewExpenseModal={() => setActiveTab('expenses')}
          totalAvailableMoney={totals.totalAvailableBalance}
          cashBalance={totals.cashBalance}
          bankBalance={totals.bankBalance}
          businessProfile={appData.businessProfile}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (q.trim() && activeTab !== 'sales') {
              setActiveTab('sales');
            }
          }}
          onSearchSubmit={() => {
            if (activeTab !== 'sales') {
              setActiveTab('sales');
            }
          }}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto pb-12">
          {activeTab === 'dashboard' && (
            <Dashboard
              activeMonth={activeMonth}
              transactions={appData.transactions}
              expenses={appData.expenses}
              transfers={appData.transfers}
              businessProfile={appData.businessProfile}
              onOpenNewSalesModal={() => {
                setEditingTransaction(null);
                setIsNewSalesModalOpen(true);
              }}
              onOpenNewExpenseModal={() => setActiveTab('expenses')}
              onViewInvoice={handleViewInvoice}
            />
          )}

          {activeTab === 'sales' && (
            <SalesEntries
              activeMonth={activeMonth}
              transactions={appData.transactions}
              businessProfile={appData.businessProfile}
              months={appData.months}
              onOpenNewSalesModal={() => {
                setEditingTransaction(null);
                setIsNewSalesModalOpen(true);
              }}
              onViewInvoice={handleViewInvoice}
              onEditSalesModal={handleEditSalesModal}
              onDeleteTransaction={(tx) => setDeleteModalTx(tx)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterTransactions={filterTransactions}
            />
          )}

          {activeTab === 'customers' && (
            <Customers
              customers={customersList}
              transactions={appData.transactions}
              businessProfile={appData.businessProfile}
              onViewInvoice={handleViewInvoice}
            />
          )}

          {activeTab === 'expenses' && (
            <Expenses
              activeMonth={activeMonth}
              expenses={appData.expenses}
              customCategories={appData.customCategories}
              businessProfile={appData.businessProfile}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddCustomCategory={handleAddCustomCategory}
            />
          )}

          {activeTab === 'cash_bank' && (
            <CashBank
              activeMonth={activeMonth}
              transactions={appData.transactions}
              expenses={appData.expenses}
              transfers={appData.transfers}
              businessProfile={appData.businessProfile}
              onAddTransfer={handleAddTransfer}
            />
          )}

          {activeTab === 'monthly_files' && (
            <MonthlyFiles
              months={appData.months}
              activeMonthId={monthId}
              transactions={appData.transactions}
              expenses={appData.expenses}
              transfers={appData.transfers}
              businessProfile={appData.businessProfile}
              onSelectMonth={(id) => setAppData((prev) => ({ ...prev, activeMonthId: id }))}
              onCreateNewMonth={handleCreateNewMonth}
              onFinishMonth={handleFinishMonth}
              onReopenMonth={handleReopenMonth}
              onNavigateToReport={(mId) => {
                setAppData((prev) => ({ ...prev, activeMonthId: mId }));
                setActiveTab('monthly_reports');
              }}
            />
          )}

          {activeTab === 'daily_report' && (
            <DailyReport
              transactions={appData.transactions}
              expenses={appData.expenses}
              transfers={appData.transfers}
              businessProfile={appData.businessProfile}
              onViewInvoice={(tx) => {
                setSelectedInvoiceTx(tx);
                setIsInvoiceModalOpen(true);
              }}
            />
          )}

          {activeTab === 'monthly_reports' && (
            <MonthlyReport
              monthFile={activeMonth}
              transactions={appData.transactions}
              expenses={appData.expenses}
              transfers={appData.transfers}
              businessProfile={appData.businessProfile}
            />
          )}

          {activeTab === 'yearly_reports' && (
            <YearlyReport
              months={appData.months}
              transactions={appData.transactions}
              expenses={appData.expenses}
              transfers={appData.transfers}
              businessProfile={appData.businessProfile}
            />
          )}

          {activeTab === 'backup_restore' && (
            <BackupRestore
              appData={appData}
              onRestoreData={(newData) => setAppData(newData)}
              onLoadSampleData={handleLoadSampleData}
              businessProfile={appData.businessProfile}
              onFactoryReset={handleFactoryReset}
            />
          )}

          {activeTab === 'settings' && (
            <BusinessSettings
              businessProfile={appData.businessProfile}
              passwordHash={appData.passwordHash || ''}
              onSaveProfile={(prof, auditLog) =>
                setAppData((prev) => ({
                  ...prev,
                  businessProfile: prof,
                  securityLogs: auditLog
                    ? [auditLog, ...(prev.securityLogs || [])]
                    : prev.securityLogs,
                }))
              }
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettings
              passwordHash={appData.passwordHash || ''}
              recoveryConfig={appData.recoveryConfig}
              securityLogs={appData.securityLogs}
              businessProfile={appData.businessProfile}
              onChangePassword={(newHash, updatedConfig, auditLog) =>
                handlePasswordReset(newHash, updatedConfig, auditLog)
              }
              onLock={() => setIsLocked(true)}
              onFactoryReset={handleFactoryReset}
            />
          )}

          {activeTab === 'help' && (
            <HelpAbout onOpenShortcutsHelp={() => setIsShortcutsModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewSalesModal
        isOpen={isNewSalesModalOpen}
        onClose={() => setIsNewSalesModalOpen(false)}
        onSave={handleSaveTransaction}
        existingCustomers={customersList}
        businessProfile={appData.businessProfile}
        activeMonthId={monthId}
        editingTransaction={editingTransaction}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        transaction={selectedInvoiceTx}
        businessProfile={appData.businessProfile}
        onEdit={(tx) => {
          setEditingTransaction(tx);
          setIsNewSalesModalOpen(true);
        }}
        onDeleteOrVoid={(tx) => {
          setDeleteModalTx(tx);
        }}
        onNavigatePrev={() => {
          if (!selectedInvoiceTx) return;
          const idx = appData.transactions.findIndex((t) => t.id === selectedInvoiceTx.id);
          if (idx > 0) {
            setSelectedInvoiceTx(appData.transactions[idx - 1]);
          }
        }}
        onNavigateNext={() => {
          if (!selectedInvoiceTx) return;
          const idx = appData.transactions.findIndex((t) => t.id === selectedInvoiceTx.id);
          if (idx >= 0 && idx < appData.transactions.length - 1) {
            setSelectedInvoiceTx(appData.transactions[idx + 1]);
          }
        }}
      />

      <DeleteInvoiceModal
        isOpen={!!deleteModalTx}
        onClose={() => setDeleteModalTx(null)}
        transaction={deleteModalTx}
        passwordHash={appData.passwordHash || ''}
        businessProfile={appData.businessProfile}
        onConfirmDelete={(tx) => handleDeleteTransactionPermanently(tx)}
        onConfirmVoid={(tx, reason) => handleVoidTransaction(tx, reason)}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
