import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../services/database';
import { BpoRecord, ProcessStatus } from '../../types';
import { formatDateDisplay, toIsoDate } from '../../utils/date';
import {
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Save,
  RotateCcw,
  Search,
  History,
  ShieldCheck,
} from 'lucide-react';
import { NavTab } from '../layout/Header';

interface EntryModuleProps {
  onSuccessNavigate?: (tab: NavTab, recordReference?: string) => void;
}

export const EntryModule: React.FC<EntryModuleProps> = ({ onSuccessNavigate }) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  // Load master data dropdowns dynamically
  const divisions = useMemo(() => db.getMasterDataByCategory('DIVISION'), []);
  const issueCategories = useMemo(() => db.getMasterDataByCategory('ISSUE_CATEGORY'), []);
  const errorCategories = useMemo(() => db.getMasterDataByCategory('ERROR_CATEGORY'), []);
  const ownerships = useMemo(() => db.getMasterDataByCategory('OWNERSHIP'), []);
  const statuses = useMemo(() => db.getMasterDataByCategory('STATUS'), []);
  const teams = useMemo(() => db.getTeams(), []);

  // Server-generated reference preview
  const [referencePreview, setReferencePreview] = useState('');

  useEffect(() => {
    setReferencePreview(db.generateReferenceNumber());
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    team_id: currentUser.team_id || (teams[0] ? teams[0].id : ''),
    customer: '',
    division: divisions[0]?.value || 'Ocean Freight',
    issue_category: issueCategories[0]?.value || 'VDP (Voluntary Disclosure Program)',
    permit_no: '',
    importer_exporter_name: '',
    mabl_obl_job_ref: '',
    error_category: errorCategories[0]?.value || 'HS Code Misclassification',
    description_of_error: '',
    root_cause: '',
    preventive_action: '',
    vdp_nod_refund_customs_reference: '',
    ownership: ownerships[0]?.value || 'LSP / Broker Responsibility',
    lsp_cs_name: currentUser.full_name,
    status: 'Open' as ProcessStatus,
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer suggestion & past history query
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const existingCustomers = useMemo(() => {
    const all = db.getBpoRecords(currentUser);
    const unique = Array.from(new Set(all.map((r) => r.customer)));
    return unique;
  }, [currentUser]);

  const filteredCustomerSuggestions = useMemo(() => {
    if (!formData.customer || formData.customer.length < 2) return [];
    return existingCustomers.filter((c) =>
      c.toLowerCase().includes(formData.customer.toLowerCase())
    );
  }, [formData.customer, existingCustomers]);

  // Customer historical intel
  const customerHistory = useMemo(() => {
    return db.getCustomerHistory(formData.customer, currentUser);
  }, [formData.customer, currentUser]);

  // If team role, freeze team_id to user's own team
  useEffect(() => {
    if (currentUser.role === 'TEAM' && currentUser.team_id) {
      setFormData((prev) => ({ ...prev, team_id: currentUser.team_id! }));
    }
  }, [currentUser]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer.trim()) {
      newErrors.customer = 'Customer name is mandatory.';
    }
    if (!formData.permit_no.trim()) {
      newErrors.permit_no = 'Customs Permit Number is required.';
    } else if (formData.permit_no.trim().length < 4) {
      newErrors.permit_no = 'Permit number must be at least 4 characters.';
    }
    if (!formData.importer_exporter_name.trim()) {
      newErrors.importer_exporter_name = 'Importer/Exporter entity is required.';
    }
    if (!formData.description_of_error.trim()) {
      newErrors.description_of_error = 'Detailed description of customs error is required.';
    } else if (formData.description_of_error.trim().length < 15) {
      newErrors.description_of_error = 'Please provide a clear description (at least 15 characters).';
    }
    if (!formData.team_id) {
      newErrors.team_id = 'Operational team assignment is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Validation Incomplete', 'Please correct the highlighted fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdRecord = db.createBpoRecord(currentUser, {
        issue_date: formData.issue_date,
        team_id: formData.team_id,
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
      });

      toast.success(
        'Case Record Created Successfully',
        `Reference ${createdRecord.reference} has been registered in PostgreSQL & synchronized with HQ Process queue.`
      );

      // Reset form with new preview reference
      setReferencePreview(db.generateReferenceNumber());
      setFormData({
        issue_date: new Date().toISOString().split('T')[0],
        team_id: currentUser.team_id || (teams[0] ? teams[0].id : ''),
        customer: '',
        division: divisions[0]?.value || 'Ocean Freight',
        issue_category: issueCategories[0]?.value || 'VDP (Voluntary Disclosure Program)',
        permit_no: '',
        importer_exporter_name: '',
        mabl_obl_job_ref: '',
        error_category: errorCategories[0]?.value || 'HS Code Misclassification',
        description_of_error: '',
        root_cause: '',
        preventive_action: '',
        vdp_nod_refund_customs_reference: '',
        ownership: ownerships[0]?.value || 'LSP / Broker Responsibility',
        lsp_cs_name: currentUser.full_name,
        status: 'Open',
      });
      setErrors({});

      if (onSuccessNavigate) {
        onSuccessNavigate('records', createdRecord.reference);
      }
    } catch (err: unknown) {
      toast.error('Submission Failed', err instanceof Error ? err.message : 'Database rejection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to discard your draft entry?')) {
      setFormData({
        issue_date: new Date().toISOString().split('T')[0],
        team_id: currentUser.team_id || (teams[0] ? teams[0].id : ''),
        customer: '',
        division: divisions[0]?.value || 'Ocean Freight',
        issue_category: issueCategories[0]?.value || 'VDP (Voluntary Disclosure Program)',
        permit_no: '',
        importer_exporter_name: '',
        mabl_obl_job_ref: '',
        error_category: errorCategories[0]?.value || 'HS Code Misclassification',
        description_of_error: '',
        root_cause: '',
        preventive_action: '',
        vdp_nod_refund_customs_reference: '',
        ownership: ownerships[0]?.value || 'LSP / Broker Responsibility',
        lsp_cs_name: currentUser.full_name,
        status: 'Open',
      });
      setErrors({});
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title & Context */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">New Customs Process Case Entry (BPO)</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              RLS Policy Enforced
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Complete the 17-point customs declaration audit dossier. Server automatically provisions the immutable reference number.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Provisioned Reference</span>
            <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
              {referencePreview || 'COM-PENDING'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Core Shipment & Entity Details */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>1. Entity Identification &amp; Regulatory Allocation</span>
            </h2>
            <span className="text-[11px] text-slate-500">* Required fields</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reference (Server read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference Number (COM-YYMMDDHHMMSS)
              </label>
              <input
                type="text"
                disabled
                value={referencePreview}
                className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-mono cursor-not-allowed"
                title="Generated server-side upon record creation"
              />
              <span className="text-[10px] text-slate-600 mt-0.5 block">Immutable database key</span>
            </div>

            {/* Issue Date (DD/MM/YYYY) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Date * (Display: {formatDateDisplay(formData.issue_date)})
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <span className="text-[10px] text-slate-600 mt-0.5 block">
                Standard: DD/MM/YYYY ({formatDateDisplay(formData.issue_date)})
              </span>
            </div>

            {/* Operational Team */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Team Assignment *
              </label>
              <select
                disabled={currentUser.role === 'TEAM'}
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className={`w-full bg-white border rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                  currentUser.role === 'TEAM' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : 'border-slate-300'
                }`}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.team_name}
                  </option>
                ))}
              </select>
              {currentUser.role === 'TEAM' && (
                <span className="text-[10px] text-slate-600 mt-0.5 block">Locked to your authenticated team</span>
              )}
            </div>

            {/* Customer with Autocomplete & Quick History */}
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Customer *</span>
                {customerHistory.totalCases > 0 && (
                  <span className="text-[10px] font-normal text-blue-700 flex items-center gap-1 font-mono">
                    <History className="w-3 h-3" />
                    {customerHistory.totalCases} previous cases ({customerHistory.openCases} open)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g., Apex Global Logistics Pte Ltd"
                  value={formData.customer}
                  onChange={(e) => {
                    setFormData({ ...formData, customer: e.target.value });
                    setCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  className={`w-full bg-white border rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                    errors.customer ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Suggestions dropdown */}
              {customerDropdownOpen && filteredCustomerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                  {filteredCustomerSuggestions.map((cust) => (
                    <button
                      key={cust}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          customer: cust,
                          importer_exporter_name: formData.importer_exporter_name || cust,
                        });
                        setCustomerDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-slate-800 flex items-center justify-between"
                    >
                      <span>{cust}</span>
                      <span className="text-[10px] text-slate-600">Existing Customer</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.customer && <p className="text-[10px] text-rose-600 mt-0.5">{errors.customer}</p>}

              {/* Customer Past Intel Box if customer exists */}
              {customerHistory.totalCases > 0 && (
                <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1 font-medium text-slate-800 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Compliance Memory:</span>
                  </div>
                  <p>
                    Recent prior issues: {customerHistory.recentReferences.join(', ')}
                  </p>
                  {customerHistory.pastRootCauses.length > 0 && (
                    <p className="mt-0.5 text-amber-700">
                      Recurring root causes: {customerHistory.pastRootCauses.join('; ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Division */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Division *
              </label>
              <select
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.value}>
                    {d.value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Customs Manifest & Declaration Details */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>2. Manifest, Trade Permit &amp; Shipment References</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Permit No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Permit No. *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PM-SG-2026-88190"
                value={formData.permit_no}
                onChange={(e) => setFormData({ ...formData, permit_no: e.target.value })}
                className={`w-full bg-white border rounded-md px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                  errors.permit_no ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {errors.permit_no && <p className="text-[10px] text-rose-600 mt-0.5">{errors.permit_no}</p>}
            </div>

            {/* Importer/Exporter Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Importer / Exporter Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BioVanguard Laboratories Switzerland"
                value={formData.importer_exporter_name}
                onChange={(e) => setFormData({ ...formData, importer_exporter_name: e.target.value })}
                className={`w-full bg-white border rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                  errors.importer_exporter_name ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {errors.importer_exporter_name && (
                <p className="text-[10px] text-rose-600 mt-0.5">{errors.importer_exporter_name}</p>
              )}
            </div>

            {/* MABL / OBL / Job Ref # */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MABL / OBL / Job Ref#
              </label>
              <input
                type="text"
                placeholder="e.g. MAEU982174092 / JOB-4412"
                value={formData.mabl_obl_job_ref}
                onChange={(e) => setFormData({ ...formData, mabl_obl_job_ref: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Issue Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Category *
              </label>
              <select
                value={formData.issue_category}
                onChange={(e) => setFormData({ ...formData, issue_category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {issueCategories.map((ic) => (
                  <option key={ic.id} value={ic.value}>
                    {ic.value}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Error Category *
              </label>
              <select
                value={formData.error_category}
                onChange={(e) => setFormData({ ...formData, error_category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {errorCategories.map((ec) => (
                  <option key={ec.id} value={ec.value}>
                    {ec.value}
                  </option>
                ))}
              </select>
            </div>

            {/* VDP / NOD / Refund / Customs Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VDP / NOD / Refund / Customs Ref
              </label>
              <input
                type="text"
                placeholder="e.g. NOD-CUS-2026-0814"
                value={formData.vdp_nod_refund_customs_reference}
                onChange={(e) => setFormData({ ...formData, vdp_nod_refund_customs_reference: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Root Cause Analysis & CAPA (Corrective and Preventive Action) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>3. Error Description, Root Cause &amp; Preventive Action</span>
            </h2>
          </div>

          <div className="space-y-4">
            {/* Description of Error */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description Of Error *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Detailed account of what was misdeclared, missing documents, or discrepancy raised by customs authority..."
                value={formData.description_of_error}
                onChange={(e) => setFormData({ ...formData, description_of_error: e.target.value })}
                className={`w-full bg-white border rounded-md p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                  errors.description_of_error ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {errors.description_of_error && (
                <p className="text-[10px] text-rose-600 mt-0.5">{errors.description_of_error}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Root Cause */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Root Cause
                </label>
                <textarea
                  rows={2}
                  placeholder="Primary failure mode (e.g. shipper dual-currency invoice format, delayed physical origin certificate)..."
                  value={formData.root_cause}
                  onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Preventive Action */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preventive Action (CAPA)
                </label>
                <textarea
                  rows={2}
                  placeholder="Systemic countermeasure implemented to avoid recurrence..."
                  value={formData.preventive_action}
                  onChange={(e) => setFormData({ ...formData, preventive_action: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Ownership & Responsible Officer */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>4. Liability Ownership, Custody &amp; Status</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ownership */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ownership *
              </label>
              <select
                value={formData.ownership}
                onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {ownerships.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
            </div>

            {/* LSP / CS Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LSP / CS Name
              </label>
              <input
                type="text"
                placeholder="Assigned customer service officer"
                value={formData.lsp_cs_name}
                onChange={(e) => setFormData({ ...formData, lsp_cs_name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Initial Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProcessStatus })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.value}>
                    {s.value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Registering into PostgreSQL...' : 'Save & Register Case'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
