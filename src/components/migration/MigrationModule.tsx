import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../services/database';
import { MigrationReport } from '../../types';
import { formatDateDisplay } from '../../utils/date';
import {
  signInWithGoogleSheets,
  signOutGoogleSheets,
  isGoogleSheetsConnected,
  getCachedGoogleUser,
  getGoogleAccessToken,
  getSpreadsheetDetails,
  fetchSheetRows,
  createGoogleSpreadsheetWithRecords,
  appendRecordsToGoogleSheet,
  extractSpreadsheetId,
} from '../../services/googleSheets';
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
  LogOut,
  Plus,
  Send,
} from 'lucide-react';

export const MigrationModule: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'google_api' | 'bundled' | 'csv' | 'report'>('google_api');

  // Google Sheets API state
  const [isGoogleConnected, setIsGoogleConnected] = useState(isGoogleSheetsConnected());
  const [googleUser, setGoogleUser] = useState(getCachedGoogleUser());
  const [spreadsheetInput, setSpreadsheetInput] = useState('1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY');
  const [availableSheets, setAvailableSheets] = useState<string[]>(['BPO', 'HQ', 'Data', 'Admin']);
  const [selectedSheet, setSelectedSheet] = useState('BPO');
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);

  // Check auth status
  useEffect(() => {
    setIsGoogleConnected(isGoogleSheetsConnected());
    setGoogleUser(getCachedGoogleUser());
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsProcessing(true);
      const res = await signInWithGoogleSheets();
      setIsGoogleConnected(true);
      setGoogleUser(res.user);
      toast.success('Connected to Google Account', `Signed in as ${res.user.email}. Google Sheets API is now active.`);
    } catch (err: any) {
      toast.error('Google Sign-In Failed', err.message || 'Unable to authenticate with Google.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleSheets();
    setIsGoogleConnected(false);
    setGoogleUser(null);
    toast.info('Disconnected', 'Signed out of Google Workspace account.');
  };

  // Fetch sheet names from the specified spreadsheet
  const handleLoadSheetMetadata = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      toast.warning('Authentication Required', 'Please sign in with Google first.');
      return;
    }

    const sheetId = extractSpreadsheetId(spreadsheetInput);
    if (!sheetId) {
      toast.error('Invalid ID', 'Please enter a valid Google Spreadsheet ID or URL.');
      return;
    }

    try {
      setIsLoadingSheets(true);
      const details = await getSpreadsheetDetails(sheetId, token);
      if (details.sheets.length > 0) {
        setAvailableSheets(details.sheets);
        setSelectedSheet(details.sheets[0]);
      }
      toast.success('Spreadsheet Located', `"${details.title}" (${details.sheets.length} sheets found)`);
    } catch (err: any) {
      toast.error('Fetch Failed', err.message || 'Unable to load sheet details.');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  // Pull live rows from Google Sheet and import
  const handlePullGoogleSheetData = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      toast.warning('Authentication Required', 'Please connect your Google Account first.');
      return;
    }

    if (currentUser.role !== 'ADMIN') {
      toast.error('Permission Denied', 'Only ADMIN role can initiate database migration.');
      return;
    }

    const sheetId = extractSpreadsheetId(spreadsheetInput);
    if (!sheetId) {
      toast.error('Invalid Spreadsheet ID', 'Please provide a valid Google Spreadsheet ID.');
      return;
    }

    setIsProcessing(true);
    try {
      const rows = await fetchSheetRows(sheetId, selectedSheet, token);
      if (rows.length < 2) {
        toast.warning('Insufficient Data', 'The selected sheet contains fewer than 2 rows (header + data).');
        setIsProcessing(false);
        return;
      }

      const headers = rows[0].map((h) => String(h || '').trim());
      const recordsToImport: Record<string, string>[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const recordObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          recordObj[h] = row[idx] || '';
        });
        recordsToImport.push(recordObj);
      }

      const report = db.migrateFromData(
        currentUser,
        recordsToImport,
        `Google Sheet API: ${sheetId} [${selectedSheet}]`
      );

      setMigrationReport(report);
      setActiveTab('report');
      toast.success(
        'Live Google Sheet Synced',
        `Imported ${report.successfullyImported} records. Duplicates skipped: ${report.duplicateRecords}.`
      );
    } catch (err: any) {
      toast.error('Sync Error', err.message || 'Failed to pull data from Google Sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export CRM cases to a brand-new Google Sheet in user's Google Drive
  const handleCreateNewGoogleSheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      toast.warning('Authentication Required', 'Please sign in with Google first.');
      return;
    }

    const allRecords = db.getBpoRecords(currentUser);
    if (allRecords.length === 0) {
      toast.warning('No Records', 'There are no BPO records to export.');
      return;
    }

    setIsProcessing(true);
    try {
      const { spreadsheetUrl, spreadsheetId } = await createGoogleSpreadsheetWithRecords(
        `CustomsFlow_Cases_${new Date().toISOString().split('T')[0]}`,
        allRecords,
        token
      );

      setCreatedSheetUrl(spreadsheetUrl);
      setSpreadsheetInput(spreadsheetId);
      toast.success('Spreadsheet Created', `Exported ${allRecords.length} records to your Google Drive!`);
    } catch (err: any) {
      toast.error('Export Error', err.message || 'Failed to create Google Spreadsheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Append records to an existing sheet (Requires confirmation as per skill)
  const handlePushRecordsToExistingSheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      toast.warning('Authentication Required', 'Please sign in with Google first.');
      return;
    }

    const sheetId = extractSpreadsheetId(spreadsheetInput);
    if (!sheetId) {
      toast.error('Invalid ID', 'Please specify a Google Spreadsheet ID.');
      return;
    }

    const allRecords = db.getBpoRecords(currentUser);
    const confirmed = window.confirm(
      `Append ${allRecords.length} records from CustomsFlow to sheet "${selectedSheet}" in Google Spreadsheet ${sheetId}?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const res = await appendRecordsToGoogleSheet(sheetId, selectedSheet, allRecords, token);
      toast.success('Sync Complete', `Appended ${res.updatedRows} rows to Google Sheet.`);
    } catch (err: any) {
      toast.error('Push Failed', err.message || 'Failed to write to Google Sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

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
      const report = db.migrateFromData(
        currentUser,
        sampleGoogleSheetData,
        'Google Sheet: 1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY'
      );
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Google Sheets Integration &amp; Data Pipeline</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Official Google API v4
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Connect live Google Spreadsheets with OAuth, pull sheets data, export cases to Google Drive, and sync historical records.
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
          onClick={() => setActiveTab('google_api')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'google_api' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Live Google Sheets API</span>
        </button>

        <button
          onClick={() => setActiveTab('bundled')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'bundled' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>1-Click Seed Migration</span>
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

      {/* 1. LIVE GOOGLE SHEETS API TAB */}
      {activeTab === 'google_api' && (
        <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm p-5 space-y-6 text-xs">
          {/* Auth Bar */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-300 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs">
                  {isGoogleConnected ? 'Google Account Connected' : 'Connect Google Workspace Account'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isGoogleConnected
                    ? `Active Session: ${googleUser?.displayName || googleUser?.email} (${googleUser?.email})`
                    : 'Sign in to access Google Sheets and Drive with read and write permissions.'}
                </p>
              </div>
            </div>

            <div>
              {isGoogleConnected ? (
                <button
                  onClick={handleGoogleSignOut}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Google Sheets API Operations Panel */}
          <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Live Google Sheets Synchronization
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Google Spreadsheet ID or URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    placeholder="e.g. 1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
                  />
                  <button
                    onClick={handleLoadSheetMetadata}
                    disabled={isLoadingSheets || !isGoogleConnected}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium text-slate-700 disabled:opacity-50"
                  >
                    {isLoadingSheets ? 'Loading...' : 'Scan Sheets'}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Default source: 1qMCwn_yvPNCE70T1As1mPUzW1fAAZiasxgdBf-JfMMY
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Sheet Tab:</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePullGoogleSheetData}
                  disabled={isProcessing || !isGoogleConnected}
                  className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded hover:bg-emerald-800 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Pull &amp; Import from Google Sheet</span>
                </button>

                <button
                  onClick={handlePushRecordsToExistingSheet}
                  disabled={isProcessing || !isGoogleConnected}
                  className="px-3.5 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50"
                  title="Appends current CRM cases to the specified Google Sheet"
                >
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                  <span>Push to Sheet</span>
                </button>
              </div>

              <button
                onClick={handleCreateNewGoogleSheet}
                disabled={isProcessing || !isGoogleConnected}
                className="px-3.5 py-2 font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Export Cases to New Google Sheet</span>
              </button>
            </div>

            {createdSheetUrl && (
              <div className="p-3 rounded bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="text-blue-900 font-medium">New Google Sheet created in your Drive:</span>
                <a
                  href={createdSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 underline flex items-center gap-1"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BUNDLED SEED MIGRATION */}
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

      {/* 3. CSV / EXCEL UPLOAD */}
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
        </div>
      )}

      {/* 4. AUDIT REPORT */}
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
