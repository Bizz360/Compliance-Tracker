import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db, subscribeToDatabase } from '../../services/database';
import { BpoRecord, FilterOptions } from '../../types';
import { formatDateDisplay, calculateAgingDays } from '../../utils/date';
import { exportRecordsToExcel, exportRecordsToCsv } from '../../utils/export';
import { RecordDetailModal } from './RecordDetailModal';
import { RecordEditModal } from './RecordEditModal';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  Check,
  X,
} from 'lucide-react';

interface RecordsModuleProps {
  initialFilter?: { status?: string; issueCategory?: string };
}

type SortField = 'reference' | 'issue_date' | 'customer' | 'team_name' | 'status' | 'permit_no';

export const RecordsModule: React.FC<RecordsModuleProps> = ({ initialFilter }) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter?.status || '');
  const [selectedIssueCategory, setSelectedIssueCategory] = useState<string>(initialFilter?.issueCategory || '');
  const [selectedOwnership, setSelectedOwnership] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [selectedReferenceForDetail, setSelectedReferenceForDetail] = useState<string | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<BpoRecord | null>(null);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    reference: true,
    issue_date: true,
    team: true,
    customer: true,
    permit_no: true,
    issue_category: true,
    error_category: true,
    ownership: true,
    status: true,
    aging: true,
    actions: true,
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  // Master Data & Teams
  const teams = useMemo(() => db.getTeams(), []);
  const statuses = useMemo(() => db.getMasterDataByCategory('STATUS'), []);
  const issueCategories = useMemo(() => db.getMasterDataByCategory('ISSUE_CATEGORY'), []);
  const ownerships = useMemo(() => db.getMasterDataByCategory('OWNERSHIP'), []);

  // Reload trigger for local database changes
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return subscribeToDatabase(() => setVersion((v) => v + 1));
  }, []);

  // Load records enforcing user role & RLS
  const records = useMemo(() => {
    const filters: FilterOptions = {
      searchQuery,
      teamId: selectedTeam || undefined,
      status: selectedStatus || undefined,
      issueCategory: selectedIssueCategory || undefined,
      ownership: selectedOwnership || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      showDeleted: currentUser.role === 'ADMIN' ? showDeleted : false,
    };
    return db.getBpoRecords(currentUser, filters);
  }, [
    currentUser,
    searchQuery,
    selectedTeam,
    selectedStatus,
    selectedIssueCategory,
    selectedOwnership,
    startDate,
    endDate,
    showDeleted,
    version,
  ]);

  // Sort records
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let aVal: string | number = (a[sortField as keyof BpoRecord] as string) || '';
      let bVal: string | number = (b[sortField as keyof BpoRecord] as string) || '';

      if (sortField === 'issue_date') {
        aVal = new Date(a.issue_date).getTime();
        bVal = new Date(b.issue_date).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortDirection]);

  // Pagination slice
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTeam, selectedStatus, selectedIssueCategory, selectedOwnership, startDate, endDate, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportExcel = () => {
    if (sortedRecords.length === 0) {
      toast.warning('Empty Dataset', 'No matching records to export.');
      return;
    }
    exportRecordsToExcel(sortedRecords, `Customs_BPO_Export_${currentUser.role}`);
    db.logAudit(currentUser, 'EXPORT', 'BPO', undefined, undefined, null, {
      type: 'EXCEL',
      count: sortedRecords.length,
    });
    toast.success('Excel Generated', `Exported ${sortedRecords.length} records conforming to SAP schema.`);
  };

  const handleExportCsv = () => {
    if (sortedRecords.length === 0) {
      toast.warning('Empty Dataset', 'No matching records to export.');
      return;
    }
    exportRecordsToCsv(sortedRecords, `Customs_BPO_Export_${currentUser.role}`);
    db.logAudit(currentUser, 'EXPORT', 'BPO', undefined, undefined, null, {
      type: 'CSV',
      count: sortedRecords.length,
    });
    toast.success('CSV Generated', `Exported ${sortedRecords.length} records.`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTeam('');
    setSelectedStatus('');
    setSelectedIssueCategory('');
    setSelectedOwnership('');
    setStartDate('');
    setEndDate('');
    setShowDeleted(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'In Progress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Submitted':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'Under Review':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Approved':
      case 'Completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Rejected':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Top Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box with debounced feel */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, customer, permit #, importer, job ref, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                filterPanelOpen || selectedStatus || selectedTeam || selectedIssueCategory
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(selectedStatus || selectedTeam || selectedIssueCategory) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>

              {columnMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg p-2 z-20 text-xs">
                  <div className="font-semibold text-slate-700 px-2 py-1 mb-1 border-b border-slate-100">
                    Visible Columns
                  </div>
                  {Object.keys(visibleColumns).map((col) => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col]}
                        onChange={(e) => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span>{col.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition-colors"
              title="Export filtered records to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {filterPanelOpen && (
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3 animate-in fade-in duration-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {currentUser.role !== 'TEAM' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Team</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                  >
                    <option value="">All Operational Teams</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                >
                  <option value="">All Case Statuses</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.value}>
                      {s.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Issue Category</label>
                <select
                  value={selectedIssueCategory}
                  onChange={(e) => setSelectedIssueCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                >
                  <option value="">All Issue Categories</option>
                  {issueCategories.map((ic) => (
                    <option key={ic.id} value={ic.value}>
                      {ic.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Liability Ownership</label>
                <select
                  value={selectedOwnership}
                  onChange={(e) => setSelectedOwnership(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                >
                  <option value="">All Ownership Types</option>
                  {ownerships.map((o) => (
                    <option key={o.id} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Date Range</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    title="From date"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    title="To date"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              {currentUser.role === 'ADMIN' ? (
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-0"
                  />
                  <span>Include Soft-Deleted Records</span>
                </label>
              ) : (
                <div />
              )}

              <button
                onClick={handleResetFilters}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enterprise High-Density Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold select-none">
              <tr>
                {visibleColumns.reference && (
                  <th
                    onClick={() => handleSort('reference')}
                    className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>Reference</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {visibleColumns.issue_date && (
                  <th
                    onClick={() => handleSort('issue_date')}
                    className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {visibleColumns.team && (
                  <th
                    onClick={() => handleSort('team_name')}
                    className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>Team</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {visibleColumns.customer && (
                  <th
                    onClick={() => handleSort('customer')}
                    className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {visibleColumns.permit_no && (
                  <th
                    onClick={() => handleSort('permit_no')}
                    className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>Permit #</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {visibleColumns.issue_category && (
                  <th className="px-3.5 py-2.5">Issue Category</th>
                )}
                {visibleColumns.error_category && (
                  <th className="px-3.5 py-2.5">Error Category</th>
                )}
                {visibleColumns.ownership && (
                  <th className="px-3.5 py-2.5">Ownership</th>
                )}
                {visibleColumns.status && (
                  <th
                    onClick={() => handleSort('status')}
                    className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}
                {visibleColumns.aging && (
                  <th className="px-3.5 py-2.5 text-right">Aging</th>
                )}
                {visibleColumns.actions && (
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    No customs records found matching current query or permissions.
                  </td>
                </tr>
              ) : (
                pagedRecords.map((r) => {
                  const aging = calculateAgingDays(r.issue_date);
                  const canEdit =
                    currentUser.role === 'ADMIN' ||
                    (currentUser.role === 'TEAM' && r.team_id === currentUser.team_id && r.created_by === currentUser.id) ||
                    (currentUser.role === 'PCO' && r.created_by === currentUser.id) ||
                    currentUser.role === 'HQ';

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        r.is_deleted ? 'bg-rose-50/30 opacity-75' : ''
                      }`}
                    >
                      {visibleColumns.reference && (
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-blue-700 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedReferenceForDetail(r.reference)}
                            className="hover:underline text-left"
                          >
                            {r.reference}
                          </button>
                        </td>
                      )}

                      {visibleColumns.issue_date && (
                        <td className="px-3.5 py-2.5 font-mono tabular-nums whitespace-nowrap text-slate-700">
                          {formatDateDisplay(r.issue_date)}
                        </td>
                      )}

                      {visibleColumns.team && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 truncate max-w-[140px]">
                          {r.team_name || 'N/A'}
                        </td>
                      )}

                      {visibleColumns.customer && (
                        <td className="px-3.5 py-2.5 font-medium text-slate-900 truncate max-w-[180px]">
                          {r.customer}
                        </td>
                      )}

                      {visibleColumns.permit_no && (
                        <td className="px-3.5 py-2.5 font-mono text-slate-800 whitespace-nowrap">
                          {r.permit_no}
                        </td>
                      )}

                      {visibleColumns.issue_category && (
                        <td className="px-3.5 py-2.5 text-slate-700 truncate max-w-[160px]">
                          {r.issue_category}
                        </td>
                      )}

                      {visibleColumns.error_category && (
                        <td className="px-3.5 py-2.5 text-slate-700 truncate max-w-[160px]">
                          {r.error_category}
                        </td>
                      )}

                      {visibleColumns.ownership && (
                        <td className="px-3.5 py-2.5 text-slate-600 truncate max-w-[130px]">
                          {r.ownership}
                        </td>
                      )}

                      {visibleColumns.status && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getStatusBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      )}

                      {visibleColumns.aging && (
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={
                              aging > 14
                                ? 'text-rose-700 font-bold'
                                : aging > 7
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }
                          >
                            {aging}d
                          </span>
                        </td>
                      )}

                      {visibleColumns.actions && (
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedReferenceForDetail(r.reference)}
                              className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="View case dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {canEdit && (
                              <button
                                onClick={() => setRecordToEdit(r)}
                                className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Edit record"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>
              Showing <span className="font-semibold text-slate-900">{totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">{Math.min(page * pageSize, totalRecords)}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalRecords}</span> entries
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-3 py-1 font-mono font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedReferenceForDetail && (
        <RecordDetailModal
          reference={selectedReferenceForDetail}
          onClose={() => setSelectedReferenceForDetail(null)}
          onEditRequest={(rec) => setRecordToEdit(rec)}
        />
      )}

      {/* Record Edit Modal */}
      {recordToEdit && (
        <RecordEditModal
          record={recordToEdit}
          onClose={() => setRecordToEdit(null)}
          onSaved={() => {
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};
