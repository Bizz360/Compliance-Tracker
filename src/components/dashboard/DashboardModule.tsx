import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/database';
import { calculateAgingDays, getAgingBucket } from '../../utils/date';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  BarChart2,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';
import { NavTab } from '../layout/Header';

interface DashboardModuleProps {
  onNavigate: (tab: NavTab, filterPreset?: { status?: string; issueCategory?: string }) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  // Load records according to user authorization (RLS enforced)
  const bpoRecords = useMemo(() => {
    return db.getBpoRecords(currentUser);
  }, [currentUser]);

  const hqRecords = useMemo(() => {
    return db.getHqRecords(currentUser);
  }, [currentUser]);

  const teams = useMemo(() => {
    return db.getTeams();
  }, []);

  // Compute Core KPIs
  const stats = useMemo(() => {
    const total = bpoRecords.length;
    const open = bpoRecords.filter((r) => r.status === 'Open').length;
    const inProgress = bpoRecords.filter((r) => r.status === 'In Progress' || r.status === 'Under Review' || r.status === 'Submitted').length;
    const completed = bpoRecords.filter((r) => r.status === 'Completed' || r.status === 'Approved').length;
    const closed = bpoRecords.filter((r) => r.status === 'Closed').length;

    // Overdue: Open/In Progress with aging > 14 days
    const overdue = bpoRecords.filter((r) => {
      if (['Completed', 'Closed'].includes(r.status)) return false;
      return calculateAgingDays(r.issue_date) > 14;
    }).length;

    // This month entries
    const currentYearMonth = new Date().toISOString().substring(0, 7);
    const thisMonth = bpoRecords.filter((r) => r.issue_date.startsWith(currentYearMonth)).length;

    // Today's entries
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayEntries = bpoRecords.filter((r) => r.issue_date === todayStr).length;

    // Customs Special Categories
    const vdp = bpoRecords.filter((r) => r.issue_category.includes('VDP')).length;
    const nod = bpoRecords.filter((r) => r.issue_category.includes('NOD')).length;
    const refund = bpoRecords.filter((r) => r.issue_category.includes('Refund')).length;
    const compound = bpoRecords.filter((r) => r.issue_category.includes('Compound') || r.issue_category.includes('Penalty')).length;
    const tariff = bpoRecords.filter((r) => r.issue_category.includes('Tariff') || r.issue_category.includes('Valuation')).length;

    return {
      total,
      open,
      inProgress,
      completed,
      closed,
      overdue,
      thisMonth,
      todayEntries,
      bpoCases: total,
      hqCases: hqRecords.length,
      vdp,
      nod,
      refund,
      compound,
      tariff,
    };
  }, [bpoRecords, hqRecords]);

  // Compute Status Breakdown
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    bpoRecords.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percent: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    }));
  }, [bpoRecords, stats.total]);

  // Compute Team Breakdown
  const teamPerformance = useMemo(() => {
    const teamCounts: Record<string, { total: number; resolved: number; teamName: string }> = {};
    teams.forEach((t) => {
      teamCounts[t.id] = { total: 0, resolved: 0, teamName: t.team_name };
    });

    bpoRecords.forEach((r) => {
      if (teamCounts[r.team_id]) {
        teamCounts[r.team_id].total++;
        if (['Completed', 'Closed', 'Approved'].includes(r.status)) {
          teamCounts[r.team_id].resolved++;
        }
      }
    });

    return Object.values(teamCounts).filter((item) => currentUser.role !== 'TEAM' || item.teamName === currentUser.team_name);
  }, [bpoRecords, teams, currentUser]);

  // Aging Buckets
  const agingDistribution = useMemo(() => {
    const buckets = {
      '0–3 Days': 0,
      '4–7 Days': 0,
      '8–15 Days': 0,
      '16–30 Days': 0,
      '31+ Days': 0,
    };

    bpoRecords.forEach((r) => {
      if (['Completed', 'Closed'].includes(r.status)) return;
      const days = calculateAgingDays(r.issue_date);
      const b = getAgingBucket(days);
      if (b === '0-3 Days') buckets['0–3 Days']++;
      else if (b === '4-7 Days') buckets['4–7 Days']++;
      else if (b === '8-15 Days') buckets['8–15 Days']++;
      else if (b === '16-30 Days') buckets['16–30 Days']++;
      else buckets['31+ Days']++;
    });

    return buckets;
  }, [bpoRecords]);

  // Issue Category Breakdown
  const issueCategories = useMemo(() => {
    const map: Record<string, number> = {};
    bpoRecords.forEach((r) => {
      map[r.issue_category] = (map[r.issue_category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [bpoRecords]);

  // Error Category Breakdown
  const errorCategories = useMemo(() => {
    const map: Record<string, number> = {};
    bpoRecords.forEach((r) => {
      map[r.error_category] = (map[r.error_category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [bpoRecords]);

  // Ownership Distribution
  const ownershipData = useMemo(() => {
    const map: Record<string, number> = {};
    bpoRecords.forEach((r) => {
      map[r.ownership] = (map[r.ownership] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percent: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    }));
  }, [bpoRecords, stats.total]);

  return (
    <div className="space-y-6">
      {/* Scope & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Customs Process Dashboard</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {currentUser.role === 'ADMIN' ? 'Enterprise Global View' : `${currentUser.team_name || currentUser.role} Scope`}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time compliance monitoring, BPO dispute tracking, and Customs Authority audit status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('records')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>View All Records</span>
          </button>
          <button
            onClick={() => onNavigate('entry')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors shadow-sm"
          >
            <span>+ New BPO Entry</span>
          </button>
        </div>
      </div>

      {/* Row 1: Primary Operational KPIs (8 KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div
          onClick={() => onNavigate('records')}
          className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-medium text-slate-500 truncate">Total Records</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-600 mt-1 flex items-center justify-between">
            <span>All cases</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('records', { status: 'Open' })}
          className="bg-white p-3 rounded-lg border border-slate-200 hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-medium text-slate-500 truncate">Open</div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-600 mt-1">{stats.open}</div>
          <div className="text-[10px] text-slate-600 mt-1">Pending action</div>
        </div>

        <div
          onClick={() => onNavigate('records', { status: 'In Progress' })}
          className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-medium text-slate-500 truncate">In Progress</div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-600 mt-1">{stats.inProgress}</div>
          <div className="text-[10px] text-slate-600 mt-1">Under processing</div>
        </div>

        <div
          onClick={() => onNavigate('records', { status: 'Completed' })}
          className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-medium text-slate-500 truncate">Completed</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 mt-1">{stats.completed}</div>
          <div className="text-[10px] text-slate-600 mt-1">Endorsed / Settled</div>
        </div>

        <div
          onClick={() => onNavigate('records', { status: 'Closed' })}
          className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-400 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-medium text-slate-500 truncate">Closed</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-700 mt-1">{stats.closed}</div>
          <div className="text-[10px] text-slate-600 mt-1">Archived</div>
        </div>

        <div
          onClick={() => onNavigate('records')}
          className="bg-white p-3 rounded-lg border border-rose-200 bg-rose-50/20 hover:border-rose-400 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-medium text-rose-700 truncate flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Overdue (&gt;14d)</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1">{stats.overdue}</div>
          <div className="text-[10px] text-rose-600 mt-1">Urgent escalation</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-[11px] font-medium text-slate-500 truncate">This Month</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{stats.thisMonth}</div>
          <div className="text-[10px] text-slate-600 mt-1">MTD Intake</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-[11px] font-medium text-slate-500 truncate">Today's Entries</div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-700 mt-1">{stats.todayEntries}</div>
          <div className="text-[10px] text-slate-600 mt-1">Active ledger</div>
        </div>
      </div>

      {/* Row 2: Customs Specialized Case Category Strip */}
      <div className="bg-slate-900 text-white p-4 rounded-lg shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
              Customs Statutory Notice Classification
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Cross-regulatory tracking (Customs Act &amp; Strategic Trade)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div
            onClick={() => onNavigate('records', { issueCategory: 'VDP' })}
            className="p-2.5 rounded bg-slate-800/80 border border-slate-700/80 hover:border-blue-400 cursor-pointer transition-colors"
          >
            <div className="text-slate-400 text-[11px]">VDP Cases</div>
            <div className="text-lg font-mono font-bold text-blue-400 tabular-nums">{stats.vdp}</div>
            <div className="text-[10px] text-slate-400">Voluntary Disclosure</div>
          </div>

          <div
            onClick={() => onNavigate('records', { issueCategory: 'NOD' })}
            className="p-2.5 rounded bg-slate-800/80 border border-slate-700/80 hover:border-amber-400 cursor-pointer transition-colors"
          >
            <div className="text-slate-400 text-[11px]">NOD Notices</div>
            <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">{stats.nod}</div>
            <div className="text-[10px] text-slate-400">Notice of Demand</div>
          </div>

          <div
            onClick={() => onNavigate('records', { issueCategory: 'Refund' })}
            className="p-2.5 rounded bg-slate-800/80 border border-slate-700/80 hover:border-emerald-400 cursor-pointer transition-colors"
          >
            <div className="text-slate-400 text-[11px]">Refund Claims</div>
            <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">{stats.refund}</div>
            <div className="text-[10px] text-slate-400">Duty Reimbursement</div>
          </div>

          <div
            onClick={() => onNavigate('records', { issueCategory: 'Compound' })}
            className="p-2.5 rounded bg-slate-800/80 border border-slate-700/80 hover:border-rose-400 cursor-pointer transition-colors"
          >
            <div className="text-slate-400 text-[11px]">Compound &amp; Penalty</div>
            <div className="text-lg font-mono font-bold text-rose-400 tabular-nums">{stats.compound}</div>
            <div className="text-[10px] text-slate-400">Checkpoints &amp; Fines</div>
          </div>

          <div
            onClick={() => onNavigate('records')}
            className="p-2.5 rounded bg-slate-800/80 border border-slate-700/80 hover:border-purple-400 cursor-pointer transition-colors"
          >
            <div className="text-slate-400 text-[11px]">Tariff Disputes</div>
            <div className="text-lg font-mono font-bold text-purple-400 tabular-nums">{stats.tariff}</div>
            <div className="text-[10px] text-slate-400">HS Classification</div>
          </div>

          <div
            onClick={() => onNavigate('process')}
            className="p-2.5 rounded bg-slate-800/80 border border-slate-700/80 hover:border-cyan-400 cursor-pointer transition-colors"
          >
            <div className="text-slate-400 text-[11px]">HQ Review Pipeline</div>
            <div className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{stats.hqCases}</div>
            <div className="text-[10px] text-slate-400">Escalated Docket</div>
          </div>
        </div>
      </div>

      {/* Row 3: Interactive Charts (Grid 1: Status Distribution & Process Aging) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-600" />
              <span>Status Distribution</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">{stats.total} total cases</span>
          </div>

          <div className="space-y-2.5">
            {statusDistribution.map((item) => {
              const colorMap: Record<string, string> = {
                Open: 'bg-amber-500',
                'In Progress': 'bg-blue-500',
                Submitted: 'bg-indigo-500',
                'Under Review': 'bg-purple-500',
                Approved: 'bg-emerald-500',
                Completed: 'bg-teal-500',
                Rejected: 'bg-rose-500',
                Closed: 'bg-slate-400',
              };
              const color = colorMap[item.name] || 'bg-slate-400';

              return (
                <div key={item.name} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-700 font-medium">{item.name}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-300`}
                      style={{ width: `${Math.max(item.percent, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Process Aging Buckets */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Process Aging (Active Cases)</span>
            </h2>
            <span className="text-[11px] text-slate-500">Days since filing</span>
          </div>

          <div className="space-y-3">
            {Object.entries(agingDistribution).map(([bucket, count]) => {
              const totalActive = stats.open + stats.inProgress;
              const percent = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
              const isUrgent = bucket === '16–30 Days' || bucket === '31+ Days';

              return (
                <div key={bucket} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium ${isUrgent ? 'text-rose-700' : 'text-slate-700'}`}>
                      {bucket}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {count} cases {totalActive > 0 && `(${percent}%)`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        bucket === '0–3 Days'
                          ? 'bg-emerald-500'
                          : bucket === '4–7 Days'
                          ? 'bg-blue-500'
                          : bucket === '8–15 Days'
                          ? 'bg-amber-500'
                          : bucket === '16–30 Days'
                          ? 'bg-orange-500'
                          : 'bg-rose-600'
                      }`}
                      style={{ width: `${Math.max(percent, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>SLA Target: &le; 7 Days</span>
            <span className="font-mono text-rose-700 font-semibold">{stats.overdue} escalated cases</span>
          </div>
        </div>

        {/* Ownership Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Liability &amp; Ownership</span>
            </h2>
            <span className="text-[11px] text-slate-500">Dispute party</span>
          </div>

          <div className="space-y-3">
            {ownershipData.map((item) => (
              <div key={item.name} className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-700 font-medium truncate pr-2">{item.name}</span>
                  <span className="font-mono tabular-nums text-slate-500 shrink-0">
                    {item.count} ({item.percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(item.percent, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
            Root liability assessment used for customer chargebacks &amp; broker insurance claims.
          </div>
        </div>
      </div>

      {/* Row 4: Team Performance & Root Cause Error Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance Bar Chart */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <span>Operational Team Volume &amp; Resolution Rate</span>
            </h2>
            <span className="text-[11px] text-slate-500">Active vs Cleared</span>
          </div>

          <div className="space-y-4">
            {teamPerformance.map((tp) => {
              const resRate = tp.total > 0 ? Math.round((tp.resolved / tp.total) * 100) : 0;
              return (
                <div key={tp.teamName} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-800">{tp.teamName}</span>
                    <span className="font-mono text-slate-500">
                      {tp.resolved}/{tp.total} cases cleared ({resRate}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${resRate}%` }}
                      title={`Resolved: ${tp.resolved}`}
                    />
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${100 - resRate}%` }}
                      title={`Open: ${tp.total - tp.resolved}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Root Cause Error Categories */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Customs Error Category Breakdown (Pareto)</span>
            </h2>
            <span className="text-[11px] text-slate-500">Compliance Deficiencies</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {errorCategories.map((ec, idx) => {
              const pct = stats.total > 0 ? Math.round((ec.count / stats.total) * 100) : 0;
              return (
                <div key={ec.name} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-700 truncate pr-2">
                      <span className="font-mono text-slate-400 mr-1.5">{idx + 1}.</span>
                      {ec.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 shrink-0">
                      {ec.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
