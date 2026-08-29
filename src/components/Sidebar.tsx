import React from 'react';
import { BusinessProfile } from '../types';
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Building,
  FolderTree,
  FileBarChart,
  BarChart3,
  Database,
  Settings,
  Shield,
  HelpCircle,
  Lock,
  LogOut,
  CalendarDays,
  Keyboard,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export type NavTab =
  | 'dashboard'
  | 'sales'
  | 'customers'
  | 'expenses'
  | 'cash_bank'
  | 'monthly_files'
  | 'daily_report'
  | 'monthly_reports'
  | 'yearly_reports'
  | 'backup_restore'
  | 'settings'
  | 'security'
  | 'help';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  businessProfile: BusinessProfile | null;
  onLock: () => void;
  onOpenShortcutsHelp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  businessProfile,
  onLock,
  onOpenShortcutsHelp,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales / Invoices', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: CreditCard },
    { id: 'cash_bank', label: 'Cash & Bank', icon: Building },
    { id: 'monthly_files', label: 'Monthly Files', icon: FolderTree },
    { id: 'daily_report', label: 'Daily Report', icon: CalendarDays },
    { id: 'monthly_reports', label: 'Monthly Reports', icon: FileBarChart },
    { id: 'yearly_reports', label: 'Yearly Reports', icon: BarChart3 },
    { id: 'backup_restore', label: 'Backup & Restore', icon: Database },
    { id: 'settings', label: 'Business Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'help', label: 'Help / About', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-[#1E293B] dark:bg-[#0c1322] text-slate-300 flex flex-col shrink-0 border-r border-slate-700/60 dark:border-slate-800/80 h-screen sticky top-0 select-none transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-700/60 dark:border-slate-800/80 flex items-center gap-3 bg-[#0F172A]/40 dark:bg-[#070b14]/60">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden shadow-sm">
          {businessProfile?.logoUrl ? (
            <img
              src={businessProfile.logoUrl}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          ) : (
            'LP'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-white truncate">
            {businessProfile?.name || 'LedgerPro Accounting'}
          </h1>
          <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
            Desktop Offline Edition
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Lock / Shortcuts / Footer */}
      <div className="p-3 border-t border-slate-700/60 dark:border-slate-800/80 bg-[#0F172A]/50 dark:bg-[#070b14]/80 space-y-2">
        <ThemeToggle variant="sidebar" />
        {onOpenShortcutsHelp && (
          <button
            onClick={onOpenShortcutsHelp}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/80 dark:bg-slate-800/50 hover:bg-slate-700 dark:hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/50 dark:border-slate-700/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5 text-blue-400" />
              <span>Shortcuts</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded">
              F1
            </span>
          </button>
        )}
        <button
          onClick={onLock}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/50 dark:border-slate-700/40 transition cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Lock Software (Ctrl+L)</span>
        </button>
        <div className="text-[10px] text-slate-400 text-center">
          CEO: {businessProfile?.ceoName || 'Owner'}
        </div>
      </div>
    </aside>
  );
};
