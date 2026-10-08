import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../services/database';
import { BpoRecord, ProcessStatus } from '../../types';
import { formatDateDisplay } from '../../utils/date';
import { X, Save, ShieldAlert } from 'lucide-react';

interface RecordEditModalProps {
  record: BpoRecord;
  onClose: () => void;
  onSaved: () => void;
}

export const RecordEditModal: React.FC<RecordEditModalProps> = ({ record, onClose, onSaved }) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const divisions = useMemo(() => db.getMasterDataByCategory('DIVISION'), []);
  const issueCategories = useMemo(() => db.getMasterDataByCategory('ISSUE_CATEGORY'), []);
  const errorCategories = useMemo(() => db.getMasterDataByCategory('ERROR_CATEGORY'), []);
  const ownerships = useMemo(() => db.getMasterDataByCategory('OWNERSHIP'), []);
  const statuses = useMemo(() => db.getMasterDataByCategory('STATUS'), []);
  const teams = useMemo(() => db.getTeams(), []);

  const [formData, setFormData] = useState({
    customer: record.customer,
    division: record.division,
    issue_category: record.issue_category,
    permit_no: record.permit_no,
    importer_exporter_name: record.importer_exporter_name,
    mabl_obl_job_ref: record.mabl_obl_job_ref || '',
    error_category: record.error_category,
    description_of_error: record.description_of_error,
    root_cause: record.root_cause || '',
    preventive_action: record.preventive_action || '',
    vdp_nod_refund_customs_reference: record.vdp_nod_refund_customs_reference || '',
    ownership: record.ownership,
    lsp_cs_name: record.lsp_cs_name || '',
    status: record.status as ProcessStatus,
    team_id: record.team_id,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer.trim() || !formData.permit_no.trim() || !formData.description_of_error.trim()) {
      toast.error('Validation Error', 'Customer, Permit No, and Description of Error are mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      db.updateBpoRecord(currentUser, record.reference, {
        customer: formData.customer.trim(),
        division: formData.division,
        issue_category: formData.issue_category,
        permit_no: formData.permit_no.trim().toUpperCase(),
        importer_exporter_name: formData.importer_exporter_name.trim(),
        mabl_obl_job_ref: formData.mabl_obl_job_ref.trim() || undefined,
        error_category: formData.error_category,
        description_of_error: formData.description_of_error.trim(),
        root_cause: formData.root_cause.trim() || undefined,
        preventive_action: formData.preventive_action.trim() || undefined,
        vdp_nod_refund_customs_reference: formData.vdp_nod_refund_customs_reference.trim() || undefined,
        ownership: formData.ownership,
        lsp_cs_name: formData.lsp_cs_name.trim() || undefined,
        status: formData.status,
        team_id: formData.team_id,
      });

      toast.success('Record Updated', `Changes to ${record.reference} have been saved and audited.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Database rejection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-slate-900">Edit Customs Case Record</h3>
            <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {record.reference}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 text-xs space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
              <input
                type="text"
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Permit No *</label>
              <input
                type="text"
                required
                value={formData.permit_no}
                onChange={(e) => setFormData({ ...formData, permit_no: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Importer / Exporter *</label>
              <input
                type="text"
                required
                value={formData.importer_exporter_name}
                onChange={(e) => setFormData({ ...formData, importer_exporter_name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">MABL / OBL / Job Ref</label>
              <input
                type="text"
                value={formData.mabl_obl_job_ref}
                onChange={(e) => setFormData({ ...formData, mabl_obl_job_ref: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Division</label>
              <select
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.value}>
                    {d.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
              <select
                value={formData.issue_category}
                onChange={(e) => setFormData({ ...formData, issue_category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {issueCategories.map((ic) => (
                  <option key={ic.id} value={ic.value}>
                    {ic.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Error Category</label>
              <select
                value={formData.error_category}
                onChange={(e) => setFormData({ ...formData, error_category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {errorCategories.map((ec) => (
                  <option key={ec.id} value={ec.value}>
                    {ec.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ownership</label>
              <select
                value={formData.ownership}
                onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {ownerships.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProcessStatus })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.value}>
                    {s.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customs / VDP Ref</label>
              <input
                type="text"
                value={formData.vdp_nod_refund_customs_reference}
                onChange={(e) => setFormData({ ...formData, vdp_nod_refund_customs_reference: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description of Error *</label>
            <textarea
              required
              rows={2}
              value={formData.description_of_error}
              onChange={(e) => setFormData({ ...formData, description_of_error: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Root Cause</label>
              <textarea
                rows={2}
                value={formData.root_cause}
                onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Preventive Action (CAPA)</label>
              <textarea
                rows={2}
                value={formData.preventive_action}
                onChange={(e) => setFormData({ ...formData, preventive_action: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
