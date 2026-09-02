import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'compact' | 'sidebar';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  showLabel = false,
  className = '',
}) => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 1. Compact simple toggle button (one-click toggle with tooltip)
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={`Current mode: ${isDark ? 'Dark' : 'Light'}. Click to switch theme (Shortcut: F2)`}
        aria-label="Toggle dark/light theme"
        className={`relative p-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 hover:text-amber-300 border border-slate-700'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
        } ${className}`}
      >
        {isDark ? (
          <Moon className="w-4 h-4 transition-transform duration-300 rotate-0" />
        ) : (
          <Sun className="w-4 h-4 transition-transform duration-300 rotate-0" />
        )}
      </button>
    );
  }

  // 2. Sidebar variant (styled to match sidebar footer)
  if (variant === 'sidebar') {
    return (
      <div className="flex items-center justify-between bg-slate-800/80 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-700/60 text-xs transition">
        <div className="flex items-center gap-2 px-1 text-slate-300">
          {isDark ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
          <span className="text-[11px] font-medium">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </div>
        <div className="flex items-center bg-slate-900/60 p-0.5 rounded-md border border-slate-700/40">
          <button
            type="button"
            onClick={() => setTheme('light')}
            title="Light Theme"
            className={`p-1 rounded transition cursor-pointer ${
              theme === 'light' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            title="Dark Theme"
            className={`p-1 rounded transition cursor-pointer ${
              theme === 'dark' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('system')}
            title="System Auto Theme"
            className={`p-1 rounded transition cursor-pointer ${
              theme === 'system' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // 3. Dropdown Menu Variant (used in TopHeader or Settings)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Theme: ${theme.toUpperCase()} (F2 to toggle)`}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
        }`}
      >
        {theme === 'system' ? (
          <Laptop className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        ) : isDark ? (
          <Moon className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
        {showLabel && (
          <span className="capitalize">
            {theme === 'system' ? 'System' : theme}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-1.5 w-40 rounded-xl shadow-xl border py-1 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150 ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-200'
              : 'bg-white border-slate-200 text-slate-700 shadow-slate-200/80'
          }`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <span>Color Theme</span>
            <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.2 rounded">F2</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer ${
              theme === 'light' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light Mode</span>
            </div>
            {theme === 'light' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer ${
              theme === 'dark' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span>Dark Mode</span>
            </div>
            {theme === 'dark' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer ${
              theme === 'system' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-blue-500" />
              <span>System Default</span>
            </div>
            {theme === 'system' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          </button>
        </div>
      )}
    </div>
  );
};
