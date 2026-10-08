import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../services/database';
import { MigrationReport } from '../../types';
import { formatDateDisplay } from '../../utils/date';
import * as XLSX from 'xlsx';
import {
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const MigrationModule: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'bundled' | 'csv' | 'report'>('bundled');

  // Bundled baseline extracted from the client's Google Sheet
  const sampleGoogleSheetData = [
    {
      reference: 'COM-260810101500',
      'Issue Date': '10/08/2026',
      'Team Name': 'Ocean Freight Clearance',
      customer: 'Global Logistics Hub',
      division: 'Ocean Freight',
      'Issue Category': 'VDP (Voluntary Disclosure Program)',
      'Permit No': 'PM-SG-2026-10294',
      'Importer/Exporter Name': 'Global Logistics Hub Asia',
      'MABL/OBL/Job Ref#': 'OBL-992019 / J-101',
      'Error Category': 'HS Code Misclassification',
      'Description Of Error': 'Automotive spare sensors declared under heading 8708 instead of 9031.',
      'Root Cause': 'Supplier catalog part description used directly without verification.',
      'Preventive Action': 'Technical verification required for all electronic components.',
      'VDP/NOD/Refund/Customs Reference': 'VDP-AUTO-2026-01',
      ownership: 'LSP / Broker Responsibility',
      'LSP/CS Name': 'Sarah Jenkins',
      status: 'Completed',
    },
    {
      reference: 'COM-260815143000',
      'Issue Date': '15/08/2026',
      'Team Name': 'Air Freight Customs',
      customer: 'Pacific Express Courier',
      division: 'Air Freight',
      'Issue Category': 'NOD (Notice of Demand)',
      'Permit No': 'PM-AIR-2026-55912',
      'Importer/Exporter Name': 'Pacific Express Logistics',
      'MABL/OBL/Job Ref#': '016-881920 / EXP-44',
      'Error Category': 'Incorrect Invoice Valuation / Currency',
      'Description Of Error': 'Freight invoice currency listed as EUR, declared as USD.',
      'Root Cause': 'Exchange rate conversion omitted during peak flight manifest dispatch.',
      'Preventive Action': 'Dual-currency alert trigger placed on EDI manifest gateway.',
      'VDP/NOD/Refund/Customs Reference': 'NOD-AIR-2026-88',
      ownership: 'Shared Responsibility',
      'LSP/CS Name': 'Marcus Vance',
      status: 'Approved',
    },
    {
      reference: 'COM-260820090000',
      'Issue Date': '20/08/2026',
      'Team Name': 'Cross-Border Trucking',
      customer: 'Trans-Border Freightlines',
      division: 'Land Transport / Logistics',
      'Issue Category': 'Compound & Penalty Notice',
      'Permit No': 'PM-CB-2026-33901',
      'Importer/Exporter Name': 'Trans-Border Road Haulage',
      'MABL/OBL/Job Ref#': 'TRK-9901 / J-202',
      'Error Category': 'Late Declaration Submission',
      'Description Of Error': 'Bonded road transit arrived at checkpoint 40 mins prior to clearance acknowledgement.',
      'Root Cause': 'Border road congestion caused vehicle to queue at checkpoint before EDI response.',
      'Preventive Action': 'Mandatory checkpoint staging hold until customs SMS receipt is verified.',
      'VDP/NOD/Refund/Customs Reference': 'CMP-BOND-2026-12',
      ownership: 'Port Operator / Terminal Agent',
      'LSP/CS Name': 'Liam Chen',
      status: 'Closed',
    },
  ];

  const handleImportBundled = () => {
    if (currentUser.role !== 'ADMIN') {
      toast.error('Permission Denied', 'Only ADMIN role can initiate database migration.');
      return;
    }

    setIsProcessing(true);
    try {
      const report = db.migrateFromData(currentUser, sampleGoogleSheetData, 'Google Sheet: 1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY');
      setMigrationReport(report);
      setActiveTab('report');
      toast.success(
        'Migration Batch Complete',
        `Imported ${report.successfullyImported} records. ${report.duplicateRecords} duplicates identified.`
      );
    } catch (err) {
      toast.error('Migration Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser.role !== 'ADMIN') {
      toast.error('Permission Denied', 'Only ADMIN role can initiate database migration.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

        if (rows.length === 0) {
          toast.warning('Empty File', 'The uploaded file does not contain valid data rows.');
          setIsProcessing(false);
          return;
        }

        const report = db.migrateFromData(currentUser, rows, file.name);
        setMigrationReport(report);
        setActiveTab('report');
        toast.success(
          'File Processed',
          `Parsed ${rows.length} rows. Imported: ${report.successfullyImported}, Duplicates: ${report.duplicateRecords}`
        );
      } catch (err) {
        toast.error('Parse Error', 'Failed to read spreadsheet/CSV file.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleParseCsvText = () => {
    if (!csvText.trim()) return;

    if (currentUser.role !== 'ADMIN') {
      toast.error('Permission Denied', 'Only ADMIN role can initiate database migration.');
      return;
    }

    setIsProcessing(true);
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        toast.error('Format Error', 'CSV must have at least 1 header line and 1 data line.');
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx] || '';
        });
        rows.push(row);
      }

      const report = db.migrateFromData(currentUser, rows, 'Raw CSV Manual Input');
      setMigrationReport(report);
      setActiveTab('report');
      toast.success(
        'CSV Import Complete',
        `Imported ${report.successfullyImported} records. Skipped: ${report.skippedRecords}`
      );
    } catch (err) {
      toast.error('Import Error', 'Failed to process CSV payload.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Google Sheets Migration &amp; Data Pipeline</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              PostgreSQL Ingestion
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Transition historical customs cases from the legacy spreadsheet into structured, relational PostgreSQL tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded border border-blue-200"
          >
            <span>Open Source Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-white px-2 rounded-t-lg text-xs space-x-1">
        <button
          onClick={() => setActiveTab('bundled')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'bundled' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>1-Click Sheet Migration</span>
        </button>

        <button
          onClick={() => setActiveTab('csv')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'csv' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileUp className="w-4 h-4" />
          <span>Upload CSV / Excel File</span>
        </button>

        {migrationReport && (
          <button
            onClick={() => setActiveTab('report')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'report' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Report</span>
          </button>
        )}
      </div>

      {/* 1. BUNDLED 1-CLICK MIGRATION */}
      {activeTab === 'bundled' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-5 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <h2 className="font-bold text-slate-900 text-sm">Target Spreadsheet Source</h2>
            <div className="font-mono text-slate-600 text-[11px] bg-white p-2 rounded border border-slate-200">
              ID: 1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY<br />
              Sheets: BPO · HQ · Data · Admin
            </div>
            <p className="text-slate-600 leading-relaxed">
              This migration utility transforms legacy spreadsheet columns into relational PostgreSQL schemas,
              automatically normalizes date formats from DD/MM/YYYY into ISO dates, maps operational teams, creates
              matching HQ workflow docket entries, and logs an immutable audit event.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-500 font-medium">Ready to validate &amp; import initial cases:</span>
            <button
              onClick={handleImportBundled}
              disabled={isProcessing}
              className="px-4 py-2 font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Importing...' : 'Execute Migration from Google Sheet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. CSV / EXCEL UPLOAD */}
      {activeTab === 'csv' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Upload CSV / Excel File</h2>
            <p className="text-slate-500 mt-0.5">
              Select exported .xlsx or .csv from Google Sheets, or paste comma-separated values directly.
            </p>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg text-center bg-slate-50 hover:bg-slate-100 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
              <FileUp className="w-8 h-8 text-blue-600 mb-2" />
              <span className="font-semibold text-slate-800 text-xs">Click to select CSV or XLSX spreadsheet</span>
              <span className="text-[11px] text-slate-500 mt-1">Preserves dates, customer names, references</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-700 block">Or Paste CSV Text:</label>
            <textarea
              rows={4}
              placeholder="reference,customer,permit_no,issue_date,issue_category,status&#10;COM-261001001,Apex Global,PM-SG-01,01/10/2026,VDP,Open"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full font-mono text-[11px] p-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              onClick={handleParseCsvText}
              disabled={isProcessing || !csvText.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 disabled:opacity-40"
            >
              Parse &amp; Import Text
            </button>
          </div>
        </div>
      )}

      {/* 3. AUDIT REPORT */}
      {migrationReport && activeTab === 'report' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-5 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Post-Migration Reconciliation Audit Report</h2>
              <span className="text-[11px] text-slate-500 font-mono">
                Source: {migrationReport.source} · {formatDateDisplay(migrationReport.timestamp)}
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Source Rows</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {migrationReport.totalSourceRecords}
              </span>
            </div>

            <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-emerald-700 text-[11px] block">Successfully Imported</span>
              <span className="text-lg font-bold font-mono text-emerald-700 mt-0.5 block">
                {migrationReport.successfullyImported}
              </span>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <span className="text-amber-700 text-[11px] block">Duplicate Skipped</span>
              <span className="text-lg font-bold font-mono text-amber-700 mt-0.5 block">
                {migrationReport.duplicateRecords}
              </span>
            </div>

            <div className="p-3 bg-rose-50 rounded border border-rose-200">
              <span className="text-rose-700 text-[11px] block">Invalid / Missing Fields</span>
              <span className="text-lg font-bold font-mono text-rose-700 mt-0.5 block">
                {migrationReport.invalidRecords}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Integrity Rate</span>
              <span className="text-lg font-bold font-mono text-blue-700 mt-0.5 block">
                {migrationReport.totalSourceRecords > 0
                  ? `${Math.round(
                      (migrationReport.successfullyImported / migrationReport.totalSourceRecords) * 100
                    )}%`
                  : '100%'}
              </span>
            </div>
          </div>

          {/* Error detail table if any */}
          {migrationReport.errors.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-slate-800 text-xs">Validation Exceptions &amp; Skipped Line Items:</h3>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100 text-[11px]">
                {migrationReport.errors.map((err, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-slate-700">
                    <span className="font-mono text-slate-500">Row #{err.row}</span>
                    <span className="font-mono text-blue-700">{err.reference}</span>
                    <span className="text-rose-600">{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
