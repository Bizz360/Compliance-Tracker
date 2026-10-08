import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db, subscribeToDatabase } from '../../services/database';
import { MasterCategory, MasterDataItem, Team, UserProfile, UserRole } from '../../types';
import { formatDateDisplay, formatDateTimeDisplay } from '../../utils/date';
import {
  ShieldAlert,
  Users,
  Briefcase,
  Database,
  History,
  Activity,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  KeyRound,
  RotateCcw,
  Save,
  X,
  Search,
} from 'lucide-react';

export const AdminModule: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  // Enforce DB/Role security: Non-admin is rejected
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-lg shadow-sm text-center">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Denied: Administration Restricted</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          You do not have permission to access the Administrative module. Row Level Security policies require an active
          ADMIN role. Please contact your system administrator if you believe this is incorrect.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'master' | 'audit' | 'system'>('users');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return subscribeToDatabase(() => setVersion((v) => v + 1));
  }, []);

  // Admin Data Sources
  const users = useMemo(() => db.getProfiles(currentUser), [currentUser, version]);
  const teams = useMemo(() => db.getTeams(), [version]);
  const masterData = useMemo(() => db.getMasterData(), [version]);
  const auditLogs = useMemo(() => db.getAuditLogs(currentUser), [currentUser, version]);
  const systemStats = useMemo(() => db.getSystemStatistics(currentUser), [currentUser, version]);

  // User Management State
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'TEAM' as UserRole,
    team_id: teams[0]?.id || '',
    status: 'ACTIVE' as const,
  });

  // Team Management State
  const [newTeamModalOpen, setNewTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Master Data State
  const [selectedCategory, setSelectedCategory] = useState<MasterCategory>('ISSUE_CATEGORY');
  const [newMasterValue, setNewMasterValue] = useState('');
  const [newMasterOrder, setNewMasterOrder] = useState(10);

  // Audit Filter
  const [auditFilterAction, setAuditFilterAction] = useState('ALL');

  // USER ACTIONS
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      db.createUser(currentUser, newUserData);
      toast.success('User Created', `User account for ${newUserData.full_name} (${newUserData.role}) created.`);
      setNewUserModalOpen(false);
      setNewUserData({
        username: '',
        email: '',
        full_name: '',
        role: 'TEAM',
        team_id: teams[0]?.id || '',
        status: 'ACTIVE',
      });
    } catch (err) {
      toast.error('User Creation Error', err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleUserStatus = (profileId: string) => {
    try {
      const updated = db.toggleUserStatus(currentUser, profileId);
      toast.success('User Status Updated', `${updated.full_name} is now ${updated.status}.`);
    } catch (err) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Cannot toggle status');
    }
  };

  // TEAM ACTIONS
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      db.createTeam(currentUser, newTeamName.trim(), newTeamDesc.trim());
      toast.success('Team Created', `Operational team "${newTeamName}" established.`);
      setNewTeamModalOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
    } catch (err) {
      toast.error('Error Creating Team', err instanceof Error ? err.message : 'Failed');
    }
  };

  // MASTER DATA ACTIONS
  const handleCreateMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterValue.trim()) return;
    try {
      db.createMasterData(currentUser, {
        category: selectedCategory,
        value: newMasterValue.trim(),
        display_order: Number(newMasterOrder) || 10,
        active: true,
      });
      toast.success('Master Data Entry Added', `Registered "${newMasterValue}" under ${selectedCategory}.`);
      setNewMasterValue('');
    } catch (err) {
      toast.error('Failed to Add', err instanceof Error ? err.message : 'Database error');
    }
  };

  const handleDeleteMaster = (id: string, value: string) => {
    if (window.confirm(`Delete master data value "${value}"?`)) {
      try {
        db.deleteMasterData(currentUser, id);
        toast.success('Master Data Deleted', `Removed "${value}".`);
      } catch (err) {
        toast.error('Deletion Failed', err instanceof Error ? err.message : 'Error');
      }
    }
  };

  const handleResetSeed = () => {
    if (window.confirm('WARNING: Reset database to initial factory seed? All custom data will be reset to factory defaults.')) {
      db.resetToFactorySeed(currentUser);
      toast.success('Database Re-seeded', 'Factory records restored.');
    }
  };

  const filteredMasterItems = useMemo(() => {
    return masterData
      .filter((m) => m.category === selectedCategory)
      .sort((a, b) => a.display_order - b.display_order);
  }, [masterData, selectedCategory]);

  const filteredAuditLogs = useMemo(() => {
    if (auditFilterAction === 'ALL') return auditLogs;
    return auditLogs.filter((l) => l.action === auditFilterAction);
  }, [auditLogs, auditFilterAction]);

  return (
    <div className="space-y-6">
      {/* Admin Module Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">System Administration &amp; Governance</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              Admin Privilege Enforced
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Maintain user access, operational teams, master classification dropdowns, immutable audit trail, and database health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSeed}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            title="Reset database to demo seed data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Re-seed Demo Data</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-white px-2 rounded-t-lg text-xs space-x-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'users' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'teams' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Teams ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('master')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'master' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Master Data</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'system' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Health</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Enterprise Users &amp; Role Assignments</h2>
              <p className="text-xs text-slate-500">Configure access levels: TEAM, PCO, HQ, ADMIN.</p>
            </div>
            <button
              onClick={() => setNewUserModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 rounded hover:bg-rose-800 flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5">User</th>
                  <th className="px-3.5 py-2.5">Role</th>
                  <th className="px-3.5 py-2.5">Team Assignment</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5">Last Login</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.username} · {u.email}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border bg-slate-100 text-slate-800 border-slate-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700">{u.team_name || 'All Teams'}</td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600">
                      {u.last_login ? formatDateTimeDisplay(u.last_login) : 'Never'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        disabled={u.id === currentUser.id}
                        className="text-[11px] px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                      >
                        {u.status === 'ACTIVE' ? 'Disable' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TEAM MANAGEMENT */}
      {activeTab === 'teams' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customs Operational Teams</h2>
              <p className="text-xs text-slate-500">Configure logistics divisions and bonded clearance teams.</p>
            </div>
            <button
              onClick={() => setNewTeamModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Team</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => (
              <div key={t.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{t.team_name}</h3>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{t.description || 'No description provided.'}</p>
                <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-200">
                  Created: {formatDateDisplay(t.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MASTER DATA */}
      {activeTab === 'master' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Master Data Category Dictionary</h2>
              <p className="text-xs text-slate-500">
                Dynamically manage standardized system dropdowns. Normal users only view active values.
              </p>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-700">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as MasterCategory)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-medium"
              >
                <option value="ISSUE_CATEGORY">Issue Category</option>
                <option value="ERROR_CATEGORY">Error Category</option>
                <option value="DIVISION">Division</option>
                <option value="OWNERSHIP">Ownership</option>
                <option value="STATUS">Status</option>
              </select>
            </div>
          </div>

          {/* Add New Master Data Form */}
          <form onSubmit={handleCreateMaster} className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <input
              type="text"
              required
              placeholder={`Add new ${selectedCategory.toLowerCase().replace('_', ' ')} value...`}
              value={newMasterValue}
              onChange={(e) => setNewMasterValue(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-600"
            />
            <input
              type="number"
              placeholder="Order"
              value={newMasterOrder}
              onChange={(e) => setNewMasterOrder(Number(e.target.value))}
              className="w-20 bg-white border border-slate-300 rounded px-2 py-1.5 font-mono"
              title="Display Order sequence"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-rose-700 text-white font-semibold rounded hover:bg-rose-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Value</span>
            </button>
          </form>

          {/* Master Data Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5 w-16">Order</th>
                  <th className="px-3.5 py-2.5">Value</th>
                  <th className="px-3.5 py-2.5 w-24">Status</th>
                  <th className="px-3.5 py-2.5 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMasterItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 font-mono text-slate-500">{item.display_order}</td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">{item.value}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {item.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteMaster(item.id, item.value)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete master data item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Immutable Audit Trail (PostgreSQL Compliance)</h2>
              <p className="text-slate-500">Every mutation, status shift, login, and export is recorded.</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-medium">Filter Action:</label>
              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="RESTORE">RESTORE</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                <option value="USER_CREATE">USER_CREATE</option>
                <option value="EXPORT">EXPORT</option>
                <option value="IMPORT">IMPORT</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5">Timestamp</th>
                  <th className="px-3.5 py-2.5">Officer</th>
                  <th className="px-3.5 py-2.5">Action</th>
                  <th className="px-3.5 py-2.5">Entity / Ref</th>
                  <th className="px-3.5 py-2.5">IP Address</th>
                  <th className="px-3.5 py-2.5">Audit Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {formatDateTimeDisplay(log.created_at)}
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                      {log.user_name}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-blue-700 whitespace-nowrap">
                      {log.reference || log.entity_type}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                      {log.new_data ? JSON.stringify(log.new_data) : log.old_data ? JSON.stringify(log.old_data) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SYSTEM HEALTH */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">System Diagnostics &amp; Capacity Matrix</h2>
            <p className="text-xs text-slate-500">Real-time table cardinality and health metrics.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Total BPO Records</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {systemStats.totalBpo}
              </span>
              <span className="text-[10px] text-slate-400">
                {systemStats.activeBpo} active · {systemStats.deletedBpo} soft-deleted
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">HQ Process Pipeline</span>
              <span className="text-xl font-bold font-mono text-purple-700 mt-1 block">
                {systemStats.totalHq}
              </span>
              <span className="text-[10px] text-slate-400">Synchronized records</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Registered Users</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {systemStats.totalUsers}
              </span>
              <span className="text-[10px] text-slate-400">{systemStats.activeUsers} active accounts</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Audit Log Entries</span>
              <span className="text-xl font-bold font-mono text-blue-700 mt-1 block">
                {systemStats.totalAuditLogs}
              </span>
              <span className="text-[10px] text-slate-400">Storage: ~{systemStats.databaseStorageEstimateKb} KB</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              <span>Row Level Security (RLS) Status: ENFORCED</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Database security constraints actively reject unauthorized data access across teams and roles.
            </p>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Provision New CRM User</h3>
              <button onClick={() => setNewUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 text-xs space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. j.smith"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Smith"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. j.smith@customs-flow.corp"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="TEAM">TEAM</option>
                    <option value="PCO">PCO</option>
                    <option value="HQ">HQ</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Team</label>
                  <select
                    value={newUserData.team_id}
                    onChange={(e) => setNewUserData({ ...newUserData, team_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-3 py-1.5 text-slate-700 border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 text-white font-semibold rounded hover:bg-rose-800"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {newTeamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Establish Operational Team</h3>
              <button onClick={() => setNewTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-5 text-xs space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bonded Rail Transport"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Mandate / Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe cargo types, checkpoints, or declaration responsibilities..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewTeamModalOpen(false)}
                  className="px-3 py-1.5 text-slate-700 border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800"
                >
                  Establish Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
