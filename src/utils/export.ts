import * as XLSX from 'xlsx';
import { BpoRecord } from '../types';
import { formatDateDisplay } from './date';

export function exportRecordsToExcel(records: BpoRecord[], filename = 'Customs_Process_Records'): void {
  const exportData = records.map((r) => ({
    'Reference': r.reference,
    'Issue Date': formatDateDisplay(r.issue_date),
    'Team': r.team_name || 'N/A',
    'Customer': r.customer,
    'Division': r.division,
    'Issue Category': r.issue_category,
    'Permit No': r.permit_no,
    'Importer / Exporter': r.importer_exporter_name,
    'MABL / OBL / Job Ref': r.mabl_obl_job_ref || '-',
    'Error Category': r.error_category,
    'Description of Error': r.description_of_error,
    'Root Cause': r.root_cause || '-',
    'Preventive Action': r.preventive_action || '-',
    'Customs / VDP Ref': r.vdp_nod_refund_customs_reference || '-',
    'Ownership': r.ownership,
    'LSP / CS Officer': r.lsp_cs_name || '-',
    'Current Status': r.status,
    'Created By': r.created_by_name || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BPO_Customs_Records');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportRecordsToCsv(records: BpoRecord[], filename = 'Customs_Process_Records'): void {
  const headers = [
    'Reference',
    'Issue Date',
    'Team',
    'Customer',
    'Division',
    'Issue Category',
    'Permit No',
    'Importer Exporter',
    'Job Ref',
    'Error Category',
    'Description of Error',
    'Root Cause',
    'Preventive Action',
    'Customs Ref',
    'Ownership',
    'LSP Officer',
    'Status',
  ];

  const escapeCsv = (val?: string) => {
    if (!val) return '""';
    const clean = String(val).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = records.map((r) => [
    escapeCsv(r.reference),
    escapeCsv(formatDateDisplay(r.issue_date)),
    escapeCsv(r.team_name),
    escapeCsv(r.customer),
    escapeCsv(r.division),
    escapeCsv(r.issue_category),
    escapeCsv(r.permit_no),
    escapeCsv(r.importer_exporter_name),
    escapeCsv(r.mabl_obl_job_ref),
    escapeCsv(r.error_category),
    escapeCsv(r.description_of_error),
    escapeCsv(r.root_cause),
    escapeCsv(r.preventive_action),
    escapeCsv(r.vdp_nod_refund_customs_reference),
    escapeCsv(r.ownership),
    escapeCsv(r.lsp_cs_name),
    escapeCsv(r.status),
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
