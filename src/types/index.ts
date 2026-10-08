/**
 * SAP-Style CRM / Customs Process Management System
 * Core Data Models & TypeScript Definitions
 */

export type UserRole = 'TEAM' | 'PCO' | 'HQ' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  team_id?: string;
  team_name?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Team {
  id: string;
  team_name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export type MasterCategory =
  | 'TEAM_NAME'
  | 'DIVISION'
  | 'ISSUE_CATEGORY'
  | 'ERROR_CATEGORY'
  | 'OWNERSHIP'
  | 'STATUS';

export interface MasterDataItem {
  id: string;
  category: MasterCategory;
  value: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProcessStatus =
  | 'Open'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Completed'
  | 'Closed';

export interface BpoRecord {
  id: string;
  reference: string; // COM-YYMMDDHHMMSS
  issue_date: string; // ISO format YYYY-MM-DD
  team_id: string;
  team_name?: string;
  customer: string;
  division: string;
  issue_category: string;
  permit_no: string;
  importer_exporter_name: string;
  mabl_obl_job_ref?: string;
  error_category: string;
  description_of_error: string;
  root_cause?: string;
  preventive_action?: string;
  vdp_nod_refund_customs_reference?: string;
  ownership: string;
  lsp_cs_name?: string;
  status: ProcessStatus | string;
  is_deleted?: boolean;
  deleted_by?: string;
  deleted_at?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
}

export interface HqRecord {
  id: string;
  bpo_id: string;
  reference: string;
  submitted_date?: string;
  permit_no?: string;
  vdp_nod_refund_customs_reference?: string;
  ownership?: string;
  approval_date?: string;
  status: ProcessStatus | string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
}

export interface StatusHistoryItem {
  id: string;
  reference: string;
  bpo_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  changed_by_name: string;
  changed_at: string;
  remarks?: string;
}

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'STATUS_CHANGE'
  | 'USER_CREATE'
  | 'USER_DISABLE'
  | 'USER_ENABLE'
  | 'MASTER_DATA_CREATE'
  | 'MASTER_DATA_UPDATE'
  | 'MASTER_DATA_DELETE'
  | 'EXPORT'
  | 'IMPORT';

export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_name: string;
  action: AuditAction;
  entity_type: 'BPO' | 'HQ' | 'USER' | 'TEAM' | 'MASTER_DATA' | 'AUTH' | 'SYSTEM';
  entity_id?: string;
  reference?: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string;
  created_at: string;
}

export interface RecordAttachment {
  id: string;
  bpo_id: string;
  reference: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export interface MigrationReport {
  timestamp: string;
  source: string;
  totalSourceRecords: number;
  successfullyImported: number;
  skippedRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
  missingRequiredFields: number;
  errors: Array<{
    row: number;
    reference?: string;
    reason: string;
  }>;
}

export interface FilterOptions {
  searchQuery: string;
  teamId?: string;
  status?: string;
  division?: string;
  issueCategory?: string;
  ownership?: string;
  startDate?: string;
  endDate?: string;
  showDeleted?: boolean;
}
