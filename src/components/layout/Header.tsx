import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Database, ShieldCheck, UserCheck, ChevronDown, LogOut, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';

export type NavTab = 'dashboard' | 'entry' | 'records' | 'process' | 'admin' | 'migration';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSupabaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onOpenSupabaseModal }) => {
  const { currentUser, availableUsers, switchUser, logout, canAccessAdmin, canAccessEntry } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabaseConnected = isSupabaseConfigured();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'HQ':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'PCO':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'TEAM':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Zone 1: Brand Mark (Single clean title element) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="text-left font-bold text-base tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <div className="w-7 h-7 bg-blue-700 rounded-md flex items-center justify-center text-white font-mono text-sm font-semibold shadow-sm">
                CF
              </div>
              <span>CustomsFlow</span>
            </button>
            <span className="hidden sm:inline-block text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              SAP Enterprise v4.6
            </span>
          </div>

          {/* Zone 2: Navigation Links (Clean text links with active indicator) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            {canAccessEntry && (
              <button
                onClick={() => onTabChange('entry')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'entry'
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Entry
              </button>
            )}

            <button
              onClick={() => onTabChange('records')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'records'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Records
            </button>

            <button
              onClick={() => onTabChange('process')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'process'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Process / Status
            </button>

            {canAccessAdmin && (
              <button
                onClick={() => onTabChange('admin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'admin'
                    ? 'text-rose-700 bg-rose-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Admin
              </button>
            )}

            <button
              onClick={() => onTabChange('migration')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'migration'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Migration
            </button>
          </nav>

          {/* Zone 3: Primary Actions & User Identity */}
          <div className="flex items-center space-x-2.5">
            {/* Database / Supabase indicator */}
            <button
              onClick={onOpenSupabaseModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                supabaseConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Database & Supabase Connection Status"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">
                {supabaseConnected ? 'Supabase Live' : 'PostgreSQL Engine'}
              </span>
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 pr-1.5 text-left rounded-md border border-slate-200 hover:border-slate-300 bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-[150px]">
                    {currentUser.full_name.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`text-[10px] font-mono px-1 rounded border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200">
                  {currentUser.full_name.charAt(0)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Switch User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg border border-slate-200 shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
                    <p className="font-semibold text-slate-900">{currentUser.full_name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    {currentUser.team_name && (
                      <p className="text-[11px] text-blue-700 mt-0.5 font-medium">Team: {currentUser.team_name}</p>
                    )}
                  </div>

                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Role Simulation / Switch User
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {availableUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          u.id === currentUser.id ? 'bg-blue-50/60 font-semibold text-blue-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-xs">{u.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.team_name || 'All Teams'}</p>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-100 px-2 flex justify-between items-center">
                    <button
                      onClick={() => {
                        onOpenSupabaseModal();
                        setUserDropdownOpen(false);
                      }}
                      className="text-slate-600 hover:text-blue-700 py-1 px-2 rounded hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Database & SQL
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="text-rose-600 hover:text-rose-800 py-1 px-2 rounded hover:bg-rose-50 inline-flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center space-x-1 px-3 py-2 border-t border-slate-100 bg-slate-50/50 overflow-x-auto text-xs">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`px-2.5 py-1 rounded font-medium shrink-0 ${
            activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Dashboard
        </button>
        {canAccessEntry && (
          <button
            onClick={() => onTabChange('entry')}
            className={`px-2.5 py-1 rounded font-medium shrink-0 ${
              activeTab === 'entry' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            Entry
          </button>
        )}
        <button
          onClick={() => onTabChange('records')}
          className={`px-2.5 py-1 rounded font-medium shrink-0 ${
            activeTab === 'records' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Records
        </button>
        <button
          onClick={() => onTabChange('process')}
          className={`px-2.5 py-1 rounded font-medium shrink-0 ${
            activeTab === 'process' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Process
        </button>
        {canAccessAdmin && (
          <button
            onClick={() => onTabChange('admin')}
            className={`px-2.5 py-1 rounded font-medium shrink-0 ${
              activeTab === 'admin' ? 'bg-rose-600 text-white' : 'text-slate-600'
            }`}
          >
            Admin
          </button>
        )}
        <button
          onClick={() => onTabChange('migration')}
          className={`px-2.5 py-1 rounded font-medium shrink-0 ${
            activeTab === 'migration' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Migration
        </button>
      </div>
    </header>
  );
};
