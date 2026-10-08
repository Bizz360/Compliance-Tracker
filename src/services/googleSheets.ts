import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';
import { BpoRecord } from '../types';
import { formatDateDisplay } from '../utils/date';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token storage (NEVER store access token in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

export function getCachedGoogleUser(): User | null {
  return cachedGoogleUser;
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function isGoogleSheetsConnected(): boolean {
  return Boolean(cachedAccessToken);
}

export async function signInWithGoogleSheets(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain OAuth access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sheets sign-in error:', error);
    throw error;
  }
}

export async function signOutGoogleSheets(): Promise<void> {
  cachedAccessToken = null;
  cachedGoogleUser = null;
}

/**
 * Fetch sheet titles and structure from a Google Spreadsheet
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: string[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to fetch spreadsheet (status ${response.status})`);
  }

  const data = await response.json();
  const title = data.properties?.title || 'Google Sheet';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');
  return { title, sheets };
}

/**
 * Fetch rows from a specific sheet range
 */
export async function fetchSheetRows(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<string[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(`${sheetName}!A1:Z5000`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to read values from sheet ${sheetName}`);
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Create a new Google Spreadsheet and write records into it
 */
export async function createGoogleSpreadsheetWithRecords(
  title: string,
  records: BpoRecord[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || `CustomsFlow_Cases_${new Date().toISOString().split('T')[0]}`,
      },
      sheets: [
        {
          properties: {
            title: 'BPO_Cases',
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to create new Google Spreadsheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare headers and rows
  const headers = [
    'Reference',
    'Issue Date',
    'Team Name',
    'Customer',
    'Division',
    'Issue Category',
    'Permit No',
    'Importer/Exporter Name',
    'MABL/OBL/Job Ref#',
    'Error Category',
    'Description Of Error',
    'Root Cause',
    'Preventive Action',
    'VDP/NOD/Refund/Customs Reference',
    'Ownership',
    'LSP/CS Name',
    'Status',
  ];

  const rows = records.map((r) => [
    r.reference,
    formatDateDisplay(r.issue_date),
    r.team_name || '',
    r.customer,
    r.division,
    r.issue_category,
    r.permit_no,
    r.importer_exporter_name,
    r.mabl_obl_job_ref || '',
    r.error_category,
    r.description_of_error,
    r.root_cause || '',
    r.preventive_action || '',
    r.vdp_nod_refund_customs_reference || '',
    r.ownership,
    r.lsp_cs_name || '',
    r.status,
  ]);

  const values = [headers, ...rows];

  // 3. Write data
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/BPO_Cases!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!appendRes.ok) {
    console.warn('Appended initial rows error, spreadsheet created at:', spreadsheetUrl);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Append or update records to an existing Google Spreadsheet
 */
export async function appendRecordsToGoogleSheet(
  spreadsheetId: string,
  sheetName: string,
  records: BpoRecord[],
  accessToken: string
): Promise<{ updatedRows: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const rows = records.map((r) => [
    r.reference,
    formatDateDisplay(r.issue_date),
    r.team_name || '',
    r.customer,
    r.division,
    r.issue_category,
    r.permit_no,
    r.importer_exporter_name,
    r.mabl_obl_job_ref || '',
    r.error_category,
    r.description_of_error,
    r.root_cause || '',
    r.preventive_action || '',
    r.vdp_nod_refund_customs_reference || '',
    r.ownership,
    r.lsp_cs_name || '',
    r.status,
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to append records to Google Sheet.');
  }

  const resData = await response.json();
  return { updatedRows: resData.updates?.updatedRows || rows.length };
}

/**
 * Helper to extract ID from either raw ID or full Google Sheets URL
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}
