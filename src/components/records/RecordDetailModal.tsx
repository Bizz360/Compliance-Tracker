import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../services/database';
import { BpoRecord, ProcessStatus } from '../../types';
import { formatDateDisplay, formatDateTimeDisplay, calculateAgingDays } from '../../utils/date';
import {
  X,
  FileText,
  Clock,
  History,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  Building,
  User,
  Shield,
  Layers,
} from 'lucide-react';

interface RecordDetailModalProps {
  reference: string;
  onClose: () => void;
  onRecordUpdated?: () => void;
  onEditRequest?: (record: BpoRecord) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  reference,
  onClose,
  onRecordUpdated,
  onEditRequest,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'audit' | 'attachments'>('overview');
  const [record, setRecord] = useState<BpoRecord | null>(null);
  const [statusHistory, setStatusHistory] = useState(db.getStatusHistory(reference));
  const [attachments, setAttachments] = useState(db.getAttachments(reference));

  // File upload state
  const [newFileName, setNewFileName] = useState('');

  const refreshData = () => {
    try {
      const rec = db.getBpoRecordByReference(currentUser, reference);
      setRecord(rec || null);
      setStatusHistory(db.getStatusHistory(reference));
      setAttachments(db.getAttachments(reference));
    } catch (err) {
      toast.error('Access Restricted', err instanceof Error ? err.message : 'Cannot load record.');
      onClose();
    }
  };

  useEffect(() => {
    refreshData();
  }, [reference, currentUser]);

  if (!record) return null;

  const canEdit =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'TEAM' && record.team_id === currentUser.team_id && record.created_by === currentUser.id) ||
    (currentUser.role === 'PCO' && record.created_by === currentUser.id) ||
    currentUser.role === 'HQ';

  const canDelete =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'TEAM' && record.team_id === currentUser.team_id && record.created_by === currentUser.id) ||
    (currentUser.role === 'PCO' && record.created_by === currentUser.id);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to soft-delete record ${record.reference}?`)) {
      try {
        db.deleteBpoRecord(currentUser, record.reference);
        toast.success('Record Soft-Deleted', `${record.reference} marked as deleted. Retained for audit compliance.`);
        if (onRecordUpdated) onRecordUpdated();
        onClose();
      } catch (err) {
        toast.error('Delete Rejected', err instanceof Error ? err.message : 'Permission denied.');
      }
    }
  };

  const handleRestore = () => {
    try {
      db.restoreBpoRecord(currentUser, record.reference);
      toast.success('Record Restored', `${record.reference} has been restored to active status.`);
      refreshData();
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      toast.error('Restore Failed', err instanceof Error ? err.message : 'Permission denied.');
    }
  };

  const handleUploadSimulated = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      db.addAttachment(currentUser, record.reference, {
        name: newFileName.trim(),
        size: Math.floor(Math.random() * 800000 + 150000),
        type: newFileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      });
      toast.success('Document Attached', `${newFileName} uploaded to storage bucket.`);
      setNewFileName('');
      setAttachments(db.getAttachments(record.reference));
    } catch (err) {
      toast.error('Upload Error', String(err));
    }
  };

  const agingDays = calculateAgingDays(record.issue_date);

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

  const workflowSteps: ProcessStatus[] = [
    'Open',
    'In Progress',
    'Submitted',
    'Under Review',
    'Approved',
    'Completed',
    'Closed',
  ];

  const currentStepIdx = workflowSteps.indexOf(record.status as ProcessStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold font-mono text-slate-900 tracking-tight">
              {record.reference}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getStatusColor(record.status)}`}>
              {record.status}
            </span>
            {record.is_deleted && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                SOFT DELETED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {record.is_deleted ? (
              currentUser.role === 'ADMIN' && (
                <button
                  onClick={handleRestore}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Record</span>
                </button>
              )
            ) : (
              <>
                {canEdit && onEditRequest && (
                  <button
                    onClick={() => {
                      onClose();
                      onEditRequest(record);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Soft Delete</span>
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center px-5 border-b border-slate-200 bg-white text-xs space-x-1 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Case Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Status Workflow &amp; Aging</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({statusHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'attachments'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Documents &amp; Permits ({attachments.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Grid 1: Basic Identifiers */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Entity &amp; Regulatory Identifiers</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-600 block text-[11px]">Customer</span>
                    <span className="font-semibold text-slate-900 text-xs">{record.customer}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Issue Date</span>
                    <span className="font-mono font-semibold text-slate-900 text-xs">
                      {formatDateDisplay(record.issue_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Operating Team</span>
                    <span className="font-semibold text-slate-900 text-xs">{record.team_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Division</span>
                    <span className="font-semibold text-slate-900 text-xs">{record.division}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Customs Trade Data */}
              <div className="p-4 rounded-lg bg-white border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manifest, Permit &amp; Regulatory References</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-600 block text-[11px]">Permit No.</span>
                    <span className="font-mono font-semibold text-blue-700 text-xs">{record.permit_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Importer / Exporter</span>
                    <span className="font-semibold text-slate-900 text-xs">{record.importer_exporter_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">MABL / OBL / Job Ref</span>
                    <span className="font-mono text-slate-800 text-xs">{record.mabl_obl_job_ref || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Issue Category</span>
                    <span className="font-semibold text-amber-700 text-xs">{record.issue_category}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Customs / VDP Ref</span>
                    <span className="font-mono text-slate-800 text-xs">
                      {record.vdp_nod_refund_customs_reference || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Liability Ownership</span>
                    <span className="font-semibold text-slate-900 text-xs">{record.ownership}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">LSP / CS Officer</span>
                    <span className="text-slate-800 text-xs">{record.lsp_cs_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Process Aging</span>
                    <span className="font-mono font-semibold text-slate-900 text-xs">{agingDays} days elapsed</span>
                  </div>
                </div>
              </div>

              {/* Grid 3: Root Cause & CAPA */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compliance Defect Analysis &amp; CAPA</span>
                </h3>

                <div>
                  <span className="text-slate-600 font-medium block mb-0.5">Error Category:</span>
                  <span className="font-semibold text-rose-700">{record.error_category}</span>
                </div>

                <div>
                  <span className="text-slate-600 font-medium block mb-0.5">Description of Error:</span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {record.description_of_error}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-600 font-medium block mb-0.5">Root Cause:</span>
                    <p className="text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                      {record.root_cause || 'No root cause entered.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium block mb-0.5">Preventive Action (CAPA):</span>
                    <p className="text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                      {record.preventive_action || 'No preventive action documented.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata footer */}
              <div className="pt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100">
                <span>Created by: {record.created_by_name || 'System'} ({formatDateTimeDisplay(record.created_at)})</span>
                <span>Last Updated: {formatDateTimeDisplay(record.updated_at)}</span>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Stepper */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                  Standard Customs Process Pipeline
                </h3>
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />
                  {workflowSteps.map((step, idx) => {
                    const isPassed = currentStepIdx >= idx;
                    const isCurrent = record.status === step;
                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-100'
                              : isPassed
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-400 border-slate-300'
                          }`}
                        >
                          {isPassed && !isCurrent ? '✓' : idx + 1}
                        </div>
                        <span
                          className={`mt-1.5 text-[11px] whitespace-nowrap ${
                            isCurrent
                              ? 'font-bold text-blue-700'
                              : isPassed
                              ? 'text-slate-700 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status History list */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Chronological Status Transition Ledger
                </h3>
                {statusHistory.length === 0 ? (
                  <p className="text-slate-500 italic">No previous status modifications logged.</p>
                ) : (
                  <div className="space-y-2">
                    {statusHistory.map((sh) => (
                      <div
                        key={sh.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {sh.old_status ? `${sh.old_status} → ${sh.new_status}` : `Initialized as ${sh.new_status}`}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono">
                              by {sh.changed_by_name}
                            </span>
                          </div>
                          {sh.remarks && <p className="text-slate-600 mt-1">{sh.remarks}</p>}
                        </div>
                        <span className="text-[11px] text-slate-600 font-mono shrink-0">
                          {formatDateTimeDisplay(sh.changed_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Full Audit Trail for Reference {record.reference}
              </h3>
              <p className="text-slate-500 text-[11px]">
                Every create, field update, and status change is immutably timestamped in PostgreSQL audit log.
              </p>

              <div className="space-y-2">
                {statusHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center justify-between text-slate-800 font-semibold mb-1">
                      <span>Action: Status Transition ({item.new_status})</span>
                      <span className="font-mono text-[10px] text-slate-600">{formatDateTimeDisplay(item.changed_at)}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{item.remarks}</p>
                    <span className="text-[10px] text-slate-600 mt-1 block">Officer: {item.changed_by_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Customs Dossier Attachments (Supabase Storage)
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Trade permits, commercial invoices, bill of lading, and official customs notices.
                  </p>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUploadSimulated} className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="text"
                  placeholder="e.g. Customs_Endorsement_Permit_SG.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </form>

              {/* Attachments List */}
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-slate-500 italic py-2">No attachments uploaded for this case yet.</p>
                ) : (
                  attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{att.file_name}</p>
                          <span className="text-[10px] text-slate-600 font-mono">
                            {(att.file_size / 1024).toFixed(1)} KB · Uploaded by {att.uploaded_by_name || 'Officer'} ·{' '}
                            {formatDateTimeDisplay(att.uploaded_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.info('Download Initiated', `Retrieving ${att.file_name} from Supabase Storage.`)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-600 font-mono">
            PostgreSQL RLS Mode: {currentUser.role}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
