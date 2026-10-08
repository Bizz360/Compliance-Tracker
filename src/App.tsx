import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header, NavTab } from './components/layout/Header';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { EntryModule } from './components/entry/EntryModule';
import { RecordsModule } from './components/records/RecordsModule';
import { ProcessModule } from './components/process/ProcessModule';
import { AdminModule } from './components/admin/AdminModule';
import { MigrationModule } from './components/migration/MigrationModule';
import { SupabaseConfigModal } from './components/supabase/SupabaseConfigModal';
import { ShieldCheck, Database, Lock } from 'lucide-react';

function AppContent() {
  const { currentUser, canAccessAdmin, canAccessEntry } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [recordsFilterPreset, setRecordsFilterPreset] = useState<{ status?: string; issueCategory?: string } | undefined>(undefined);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  const handleNavigateFromDashboard = (tab: NavTab, filterPreset?: { status?: string; issueCategory?: string }) => {
    setRecordsFilterPreset(filterPreset);
    setActiveTab(tab);
  };

  const handleTabChange = (tab: NavTab) => {
    // Clear filter preset when navigating manually
    if (tab === 'records') {
      setRecordsFilterPreset(undefined);
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* 3-Zone Enterprise Header */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardModule onNavigate={handleNavigateFromDashboard} />
        )}

        {activeTab === 'entry' && (
          canAccessEntry ? (
            <EntryModule
              onSuccessNavigate={(tab) => {
                setActiveTab(tab);
              }}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-lg text-center">
              <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-800">Case Entry Restricted</h2>
              <p className="text-xs text-slate-600 mt-1">
                Your role ({currentUser.role}) does not have permission to initiate new BPO records.
              </p>
            </div>
          )
        )}

        {activeTab === 'records' && (
          <RecordsModule initialFilter={recordsFilterPreset} />
        )}

        {activeTab === 'process' && (
          <ProcessModule />
        )}

        {activeTab === 'admin' && (
          <AdminModule />
        )}

        {activeTab === 'migration' && (
          <MigrationModule />
        )}
      </main>

      {/* Corporate Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CustomsFlow</span>
            <span aria-hidden="true">·</span>
            <span>SAP-Style CRM &amp; Customs Process Management System</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-slate-400">PostgreSQL 15 / Supabase RLS</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RLS Active</span>
            </div>
            <span aria-hidden="true">·</span>
            <span>Session: {currentUser.full_name} ({currentUser.role})</span>
          </div>
        </div>
      </footer>

      {/* Supabase & Database Config Drawer/Modal */}
      {supabaseModalOpen && (
        <SupabaseConfigModal onClose={() => setSupabaseModalOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
