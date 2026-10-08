import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db, subscribeToDatabase } from '../../services/database';
import { HqRecord, ProcessStatus } from '../../types';
import { formatDateDisplay, formatDateTimeDisplay, calculateAgingDays } from '../../utils/date';
import {
  Workflow,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  X,
  History,
  FileCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { RecordDetailModal } from '../records/RecordDetailModal';

export const ProcessModule: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<string | null>(null);

  // Status Change Modal
  const [activeUpdateRecord, setActiveUpdateRecord] = useState<HqRecord | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ProcessStatus>('Under Review');
  const [updateApprovalDate, setUpdateApprovalDate] = useState<string>('');
  const [updateCustomsRef, setUpdateCustomsRef] = useState<string>('');
  const [updateRemarks, setUpdateRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [version, setVersion] = useState(0);
  useEffect(() => {
    return subscribeToDatabase(() => setVersion((v) => v + 1));
  }, []);

  const hqRecords = useMemo(() => {
    return db.getHqRecords(currentUser);
  }, [currentUser, version]);

  const statuses = useMemo(() => db.getMasterDataByCategory('STATUS'), []);

  const filteredRecords = useMemo(() => {
    return hqRecords.filter((h) => {
      if (statusFilter && h.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = h.reference.toLowerCase().includes(q);
        const matchesCustomer = h.bpo?.customer.toLowerCase().includes(q);
        const matchesPermit = h.permit_no?.toLowerCase().includes(q);
        const matchesTeam = h.bpo?.team_name?.toLowerCase().includes(q);
        return matchesRef || matchesCustomer || matchesPermit || matchesTeam;
      }
      return true;
    });
  }, [hqRecords, statusFilter, searchQuery]);

  const canUpdate = currentUser.role === 'ADMIN' || currentUser.role === 'HQ';

  const handleOpenUpdate = (record: HqRecord) => {
    if (!canUpdate) {
      toast.warning('HQ Authorization Required', 'Only HQ Compliance Officers and Admins may amend statutory approval states.');
      return;
    }
    setActiveUpdateRecord(record);
    setUpdateStatus(record.status as ProcessStatus);
    setUpdateApprovalDate(record.approval_date || '');
    setUpdateCustomsRef(record.vdp_nod_refund_customs_reference || '');
    setUpdateRemarks('');
  };

  const handleSaveProcessUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUpdateRecord) return;

    if (!updateRemarks.trim()) {
      toast.error('Audit Requirement', 'Please enter administrative remarks for this status transition.');
      return;
    }

    setIsSubmitting(true);
    try {
      db.updateHqProcess(currentUser, activeUpdateRecord.reference, {
        status: updateStatus,
        approval_date: updateApprovalDate || undefined,
        vdp_nod_refund_customs_reference: updateCustomsRef || undefined,
        remarks: updateRemarks.trim(),
      });

      toast.success(
        'Process Status Updated',
        `${activeUpdateRecord.reference} transitioned to ${updateStatus}. Audit trail updated.`
      );
      setActiveUpdateRecord(null);
    } catch (err) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Database error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
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
    <div className="space-y-6">
      {/* Header Context */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">HQ Customs Process &amp; Approval Engine</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Workflow Authority: {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Centrally manage case lifecycle, regulatory endorsements, VDP/NOD settlement filings, and process aging SLAs.
          </p>
        </div>

        {/* Quick status summary counters */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Pending HQ Review</span>
            <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {hqRecords.filter((r) => ['Submitted', 'Under Review'].includes(r.status)).length} cases
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search process records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800"
          >
            <option value="">All Workflow Stages</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.value}>
                {s.value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* HQ Process Records Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold select-none">
              <tr>
                <th className="px-3.5 py-2.5">Reference</th>
                <th className="px-3.5 py-2.5">Customer / Operating Team</th>
                <th className="px-3.5 py-2.5">Issue Category</th>
                <th className="px-3.5 py-2.5">Permit # / Customs Ref</th>
                <th className="px-3.5 py-2.5">Submitted Date</th>
                <th className="px-3.5 py-2.5">Approval Date</th>
                <th className="px-3.5 py-2.5">Process Age</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">HQ Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No process cases currently found matching selection.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const aging = calculateAgingDays(r.submitted_date);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-blue-700 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCaseForDetail(r.reference)}
                          className="hover:underline text-left"
                        >
                          {r.reference}
                        </button>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">
                          {r.bpo?.customer}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {r.bpo?.team_name}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                        {r.bpo?.issue_category}
                      </td>

                      <td className="px-3.5 py-2.5 font-mono text-slate-800 whitespace-nowrap">
                        <div>{r.permit_no || '-'}</div>
                        {r.vdp_nod_refund_customs_reference && (
                          <div className="text-[10px] text-purple-700 font-semibold">
                            {r.vdp_nod_refund_customs_reference}
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {formatDateDisplay(r.submitted_date)}
                      </td>

                      <td className="px-3.5 py-2.5 font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {r.approval_date ? formatDateDisplay(r.approval_date) : '-'}
                      </td>

                      <td className="px-3.5 py-2.5 font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={
                            aging > 14
                              ? 'text-rose-700 font-bold'
                              : aging > 7
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }
                        >
                          {aging} days
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenUpdate(r)}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HQ Process Update Modal */}
      {activeUpdateRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-purple-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Update Customs Approval Status</h3>
                <span className="font-mono text-xs text-purple-700 font-semibold">{activeUpdateRecord.reference}</span>
              </div>
              <button
                onClick={() => setActiveUpdateRecord(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProcessUpdate} className="p-5 text-xs space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Process Status *</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as ProcessStatus)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-600 font-medium"
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.value}>
                      {s.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Approval Date</label>
                <input
                  type="date"
                  value={updateApprovalDate}
                  onChange={(e) => setUpdateApprovalDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  VDP / NOD / Refund / Customs Case Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. NOD-CUS-2026-0814"
                  value={updateCustomsRef}
                  onChange={(e) => setUpdateCustomsRef(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Audit Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State decision justification, meeting reference with Senior Customs Superintendent, or settlement terms..."
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveUpdateRecord(null)}
                  className="px-3.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 font-semibold text-white bg-purple-700 rounded hover:bg-purple-800 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Committing...' : 'Commit Status Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCaseForDetail && (
        <RecordDetailModal
          reference={selectedCaseForDetail}
          onClose={() => setSelectedCaseForDetail(null)}
        />
      )}
    </div>
  );
};
