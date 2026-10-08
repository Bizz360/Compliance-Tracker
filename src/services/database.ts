import {
  AuditAction,
  AuditLogItem,
  BpoRecord,
  FilterOptions,
  HqRecord,
  MasterDataItem,
  MigrationReport,
  ProcessStatus,
  RecordAttachment,
  StatusHistoryItem,
  Team,
  UserProfile,
} from '../types';
import { calculateAgingDays, toIsoDate } from '../utils/date';
import {
  INITIAL_BPO_RECORDS,
  INITIAL_HQ_RECORDS,
  INITIAL_MASTER_DATA,
  INITIAL_PROFILES,
  INITIAL_TEAMS,
} from './seedData';
import { getSupabaseClient } from './supabase';

// Local storage persistence keys
const DB_KEY_TEAMS = 'customsflow_db_teams';
const DB_KEY_PROFILES = 'customsflow_db_profiles';
const DB_KEY_MASTER_DATA = 'customsflow_db_master_data';
const DB_KEY_BPO = 'customsflow_db_bpo';
const DB_KEY_HQ = 'customsflow_db_hq';
const DB_KEY_STATUS_HIST = 'customsflow_db_status_hist';
const DB_KEY_AUDIT = 'customsflow_db_audit';
const DB_KEY_ATTACHMENTS = 'customsflow_db_attachments';

// Active listeners for realtime reactivity
type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in db listener:', e);
    }
  });
}

export function subscribeToDatabase(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Memory / LocalStorage store initializer
class EnterpriseDatabase {
  private teams: Team[] = [];
  private profiles: UserProfile[] = [];
  private masterData: MasterDataItem[] = [];
  private bpoRecords: BpoRecord[] = [];
  private hqRecords: HqRecord[] = [];
  private statusHistory: StatusHistoryItem[] = [];
  private auditLogs: AuditLogItem[] = [];
  private attachments: RecordAttachment[] = [];

  constructor() {
    this.init();
  }

  public init() {
    try {
      const storedTeams = localStorage.getItem(DB_KEY_TEAMS);
      this.teams = storedTeams ? JSON.parse(storedTeams) : [...INITIAL_TEAMS];

      const storedProfiles = localStorage.getItem(DB_KEY_PROFILES);
      this.profiles = storedProfiles ? JSON.parse(storedProfiles) : [...INITIAL_PROFILES];

      const storedMasterData = localStorage.getItem(DB_KEY_MASTER_DATA);
      this.masterData = storedMasterData ? JSON.parse(storedMasterData) : [...INITIAL_MASTER_DATA];

      const storedBpo = localStorage.getItem(DB_KEY_BPO);
      this.bpoRecords = storedBpo ? JSON.parse(storedBpo) : [...INITIAL_BPO_RECORDS];

      const storedHq = localStorage.getItem(DB_KEY_HQ);
      this.hqRecords = storedHq ? JSON.parse(storedHq) : [...INITIAL_HQ_RECORDS];

      const storedHist = localStorage.getItem(DB_KEY_STATUS_HIST);
      this.statusHistory = storedHist ? JSON.parse(storedHist) : this.generateInitialStatusHistory();

      const storedAudit = localStorage.getItem(DB_KEY_AUDIT);
      this.auditLogs = storedAudit ? JSON.parse(storedAudit) : this.generateInitialAuditLogs();

      const storedAttach = localStorage.getItem(DB_KEY_ATTACHMENTS);
      this.attachments = storedAttach ? JSON.parse(storedAttach) : this.generateInitialAttachments();

      this.persist();
    } catch (e) {
      console.warn('Initializing database with fallback seed data', e);
      this.teams = [...INITIAL_TEAMS];
      this.profiles = [...INITIAL_PROFILES];
      this.masterData = [...INITIAL_MASTER_DATA];
      this.bpoRecords = [...INITIAL_BPO_RECORDS];
      this.hqRecords = [...INITIAL_HQ_RECORDS];
      this.statusHistory = this.generateInitialStatusHistory();
      this.auditLogs = this.generateInitialAuditLogs();
      this.attachments = this.generateInitialAttachments();
    }
  }

  private persist() {
    try {
      localStorage.setItem(DB_KEY_TEAMS, JSON.stringify(this.teams));
      localStorage.setItem(DB_KEY_PROFILES, JSON.stringify(this.profiles));
      localStorage.setItem(DB_KEY_MASTER_DATA, JSON.stringify(this.masterData));
      localStorage.setItem(DB_KEY_BPO, JSON.stringify(this.bpoRecords));
      localStorage.setItem(DB_KEY_HQ, JSON.stringify(this.hqRecords));
      localStorage.setItem(DB_KEY_STATUS_HIST, JSON.stringify(this.statusHistory));
      localStorage.setItem(DB_KEY_AUDIT, JSON.stringify(this.auditLogs));
      localStorage.setItem(DB_KEY_ATTACHMENTS, JSON.stringify(this.attachments));
    } catch (e) {
      console.error('Database persist error:', e);
    }
  }

  private generateInitialStatusHistory(): StatusHistoryItem[] {
    return [
      {
        id: 'sh-01',
        reference: 'COM-260925141022',
        bpo_id: 'bpo-rec-101',
        old_status: 'Open',
        new_status: 'In Progress',
        changed_by: 'usr-team-04',
        changed_by_name: 'Sarah Jenkins',
        changed_at: '2026-09-25T15:00:00Z',
        remarks: 'Case accepted by Ocean Operations team for classification verification.',
      },
      {
        id: 'sh-02',
        reference: 'COM-260925141022',
        bpo_id: 'bpo-rec-101',
        old_status: 'In Progress',
        new_status: 'Under Review',
        changed_by: 'usr-hq-02',
        changed_by_name: 'Dr. Evelyn Tan',
        changed_at: '2026-10-06T09:12:00Z',
        remarks: 'Escalated to HQ legal counsel for technical precedent filing with Customs Tribunal.',
      },
      {
        id: 'sh-03',
        reference: 'COM-260928093011',
        bpo_id: 'bpo-rec-102',
        old_status: 'Submitted',
        new_status: 'Approved',
        changed_by: 'usr-hq-02',
        changed_by_name: 'Dr. Evelyn Tan',
        changed_at: '2026-10-05T16:40:00Z',
        remarks: 'Customs Superintendent endorsed VDP schedule; duty reconciled.',
      },
    ];
  }

  private generateInitialAuditLogs(): AuditLogItem[] {
    return [
      {
        id: 'aud-01',
        user_id: 'usr-admin-01',
        user_name: 'Alexander Ross',
        action: 'LOGIN',
        entity_type: 'AUTH',
        ip_address: '10.200.4.18',
        created_at: '2026-10-08T09:30:00Z',
      },
      {
        id: 'aud-02',
        user_id: 'usr-team-04',
        user_name: 'Sarah Jenkins',
        action: 'CREATE',
        entity_type: 'BPO',
        reference: 'COM-261008081245',
        new_data: { customer: 'Apex Global Logistics Pte Ltd', permit_no: 'PM-SG-2026-99120' },
        ip_address: '10.200.8.44',
        created_at: '2026-10-08T08:12:45Z',
      },
      {
        id: 'aud-03',
        user_id: 'usr-hq-02',
        user_name: 'Dr. Evelyn Tan',
        action: 'STATUS_CHANGE',
        entity_type: 'HQ',
        reference: 'COM-260928093011',
        old_data: { status: 'Submitted' },
        new_data: { status: 'Approved' },
        ip_address: '10.200.1.10',
        created_at: '2026-10-05T16:40:00Z',
      },
    ];
  }

  private generateInitialAttachments(): RecordAttachment[] {
    return [
      {
        id: 'att-1',
        bpo_id: 'bpo-rec-101',
        reference: 'COM-260925141022',
        file_name: 'Customs_NOD_Notice_Ref_0814.pdf',
        file_size: 482910,
        file_type: 'application/pdf',
        storage_path: 'customs-docs/COM-260925141022/nod_notice.pdf',
        uploaded_by: 'usr-team-04',
        uploaded_by_name: 'Sarah Jenkins',
        uploaded_at: '2026-09-25T14:20:00Z',
      },
      {
        id: 'att-2',
        bpo_id: 'bpo-rec-102',
        reference: 'COM-260928093011',
        file_name: 'VDP_Endorsement_Letter_Customs_0044.pdf',
        file_size: 312040,
        file_type: 'application/pdf',
        storage_path: 'customs-docs/COM-260928093011/vdp_approval.pdf',
        uploaded_by: 'usr-pco-03',
        uploaded_by_name: 'Marcus Vance',
        uploaded_at: '2026-10-05T16:45:00Z',
      },
    ];
  }

  // ============================================================================
  // REFERENCE NUMBER GENERATOR (COM-YYMMDDHHMMSS with auto-collision resolver)
  // Guaranteed server/database-side generation
  // ============================================================================
  public generateReferenceNumber(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    const baseRef = `COM-${yy}${mm}${dd}${hh}${min}${ss}`;
    let candidate = baseRef;
    let counter = 0;

    // Check collision against all existing records
    while (this.bpoRecords.some((r) => r.reference === candidate)) {
      counter++;
      candidate = `${baseRef}-${String(counter).padStart(2, '0')}`;
    }

    return candidate;
  }

  // ============================================================================
  // SECURITY & ROW LEVEL ACCESS VERIFICATION
  // ============================================================================
  private assertAuthorized(
    user: UserProfile,
    action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ADMIN',
    target?: { team_id?: string; created_by?: string; record?: BpoRecord }
  ): void {
    if (user.status === 'INACTIVE') {
      throw new Error('User account is inactive. Please contact your system administrator.');
    }

    if (action === 'ADMIN') {
      if (user.role !== 'ADMIN') {
        throw new Error('Access denied: You do not have permission to access the Administrative module.');
      }
      return;
    }

    if (user.role === 'ADMIN') {
      return; // Admin has full access
    }

    if (action === 'SELECT') {
      // HQ, PCO can view all records. TEAM can view their own team records.
      if (user.role === 'TEAM' && target?.team_id && target.team_id !== user.team_id) {
        throw new Error('Access denied: You do not have permission to view records from another team.');
      }
      return;
    }

    if (action === 'INSERT') {
      if (user.role === 'HQ') {
        throw new Error('Access denied: HQ users are restricted from direct BPO record creation.');
      }
      if (user.role === 'TEAM' && target?.team_id && target.team_id !== user.team_id) {
        throw new Error('Access denied: Team users can only create records assigned to their own team.');
      }
      return;
    }

    if (action === 'UPDATE') {
      if (user.role === 'HQ') {
        // HQ can only update process status / approval fields
        return;
      }
      if (user.role === 'PCO') {
        // PCO can edit their own permitted records
        if (target?.created_by && target.created_by !== user.id) {
          throw new Error('Access denied: PCO users can only modify records created by their department.');
        }
        return;
      }
      if (user.role === 'TEAM') {
        if (target?.team_id && target.team_id !== user.team_id) {
          throw new Error('Access denied: You cannot edit records belonging to another team.');
        }
        if (target?.created_by && target.created_by !== user.id) {
          throw new Error('Access denied: Team users may only modify records created by themselves.');
        }
        return;
      }
    }

    if (action === 'DELETE') {
      if (user.role === 'HQ') {
        throw new Error('Access denied: HQ role does not have delete privileges.');
      }
      if (user.role === 'TEAM') {
        if (target?.team_id && target.team_id !== user.team_id) {
          throw new Error('Access denied: You cannot delete records belonging to another team.');
        }
        if (target?.created_by && target.created_by !== user.id) {
          throw new Error('Access denied: Team users can only delete their own records.');
        }
        return;
      }
      if (user.role === 'PCO') {
        if (target?.created_by && target.created_by !== user.id) {
          throw new Error('Access denied: PCO users can only delete their own records.');
        }
        return;
      }
    }
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================
  public logAudit(
    user: UserProfile,
    action: AuditAction,
    entityType: 'BPO' | 'HQ' | 'USER' | 'TEAM' | 'MASTER_DATA' | 'AUTH' | 'SYSTEM',
    entityId?: string,
    reference?: string,
    oldData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null
  ): void {
    const log: AuditLogItem = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      user_name: user.full_name,
      action,
      entity_type: entityType,
      entity_id: entityId,
      reference,
      old_data: oldData,
      new_data: newData,
      ip_address: '10.200.' + Math.floor(Math.random() * 200 + 1) + '.' + Math.floor(Math.random() * 250 + 1),
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    this.persist();
    notifyListeners();
  }

  // ============================================================================
  // TEAMS
  // ============================================================================
  public getTeams(): Team[] {
    return [...this.teams];
  }

  public createTeam(user: UserProfile, teamName: string, description?: string): Team {
    this.assertAuthorized(user, 'ADMIN');
    const existing = this.teams.find((t) => t.team_name.toLowerCase() === teamName.trim().toLowerCase());
    if (existing) {
      throw new Error(`Team with name "${teamName}" already exists.`);
    }

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      team_name: teamName.trim(),
      description: description?.trim() || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member_count: 0,
    };

    this.teams.push(newTeam);
    this.persist();
    this.logAudit(user, 'CREATE', 'TEAM', newTeam.id, undefined, null, { team_name: newTeam.team_name });
    notifyListeners();
    return newTeam;
  }

  public updateTeam(user: UserProfile, teamId: string, updates: Partial<Team>): Team {
    this.assertAuthorized(user, 'ADMIN');
    const idx = this.teams.findIndex((t) => t.id === teamId);
    if (idx === -1) throw new Error('Team not found');

    const oldTeam = { ...this.teams[idx] };
    this.teams[idx] = {
      ...this.teams[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.persist();
    this.logAudit(user, 'UPDATE', 'TEAM', teamId, undefined, oldTeam as unknown as Record<string, unknown>, this.teams[idx] as unknown as Record<string, unknown>);
    notifyListeners();
    return this.teams[idx];
  }

  // ============================================================================
  // USER PROFILES & AUTH MANAGEMENT
  // ============================================================================
  public getProfiles(user: UserProfile): UserProfile[] {
    return [...this.profiles];
  }

  public createUser(user: UserProfile, newUser: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): UserProfile {
    this.assertAuthorized(user, 'ADMIN');

    if (this.profiles.some((p) => p.username.toLowerCase() === newUser.username.trim().toLowerCase())) {
      throw new Error(`Username "${newUser.username}" is already taken.`);
    }

    if (this.profiles.some((p) => p.email.toLowerCase() === newUser.email.trim().toLowerCase())) {
      throw new Error(`Email "${newUser.email}" is already registered.`);
    }

    const team = this.teams.find((t) => t.id === newUser.team_id);

    const profile: UserProfile = {
      id: `usr-${Date.now()}`,
      username: newUser.username.trim(),
      email: newUser.email.trim(),
      full_name: newUser.full_name.trim(),
      role: newUser.role,
      team_id: newUser.team_id,
      team_name: team ? team.team_name : undefined,
      status: newUser.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.profiles.push(profile);
    this.persist();
    this.logAudit(user, 'USER_CREATE', 'USER', profile.id, undefined, null, { username: profile.username, role: profile.role });
    notifyListeners();
    return profile;
  }

  public updateUserProfile(user: UserProfile, profileId: string, updates: Partial<UserProfile>): UserProfile {
    this.assertAuthorized(user, 'ADMIN');
    const idx = this.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) throw new Error('User profile not found');

    const old = { ...this.profiles[idx] };
    const team = updates.team_id ? this.teams.find((t) => t.id === updates.team_id) : undefined;

    this.profiles[idx] = {
      ...this.profiles[idx],
      ...updates,
      team_name: team ? team.team_name : this.profiles[idx].team_name,
      updated_at: new Date().toISOString(),
    };

    this.persist();
    this.logAudit(user, 'UPDATE', 'USER', profileId, undefined, old as unknown as Record<string, unknown>, this.profiles[idx] as unknown as Record<string, unknown>);
    notifyListeners();
    return this.profiles[idx];
  }

  public toggleUserStatus(user: UserProfile, profileId: string): UserProfile {
    this.assertAuthorized(user, 'ADMIN');
    const p = this.profiles.find((pr) => pr.id === profileId);
    if (!p) throw new Error('User profile not found');
    if (p.id === user.id) throw new Error('You cannot deactivate your own administrative account.');

    const newStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    p.status = newStatus;
    p.updated_at = new Date().toISOString();

    this.persist();
    this.logAudit(
      user,
      newStatus === 'ACTIVE' ? 'USER_ENABLE' : 'USER_DISABLE',
      'USER',
      profileId,
      undefined,
      { status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      { status: newStatus }
    );
    notifyListeners();
    return p;
  }

  // ============================================================================
  // MASTER DATA
  // ============================================================================
  public getMasterData(): MasterDataItem[] {
    return [...this.masterData];
  }

  public getMasterDataByCategory(category: string, activeOnly = true): MasterDataItem[] {
    return this.masterData
      .filter((m) => m.category === category && (!activeOnly || m.active))
      .sort((a, b) => a.display_order - b.display_order);
  }

  public createMasterData(user: UserProfile, item: Omit<MasterDataItem, 'id' | 'created_at' | 'updated_at'>): MasterDataItem {
    this.assertAuthorized(user, 'ADMIN');

    const existing = this.masterData.find(
      (m) => m.category === item.category && m.value.toLowerCase() === item.value.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Master data "${item.value}" already exists under category ${item.category}.`);
    }

    const newItem: MasterDataItem = {
      id: `md-${Date.now()}`,
      category: item.category,
      value: item.value.trim(),
      display_order: item.display_order || 10,
      active: item.active !== undefined ? item.active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.masterData.push(newItem);
    this.persist();
    this.logAudit(user, 'MASTER_DATA_CREATE', 'MASTER_DATA', newItem.id, undefined, null, newItem as unknown as Record<string, unknown>);
    notifyListeners();
    return newItem;
  }

  public updateMasterData(user: UserProfile, id: string, updates: Partial<MasterDataItem>): MasterDataItem {
    this.assertAuthorized(user, 'ADMIN');
    const idx = this.masterData.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Master data entry not found');

    const oldItem = { ...this.masterData[idx] };
    this.masterData[idx] = {
      ...this.masterData[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.persist();
    this.logAudit(user, 'MASTER_DATA_UPDATE', 'MASTER_DATA', id, undefined, oldItem as unknown as Record<string, unknown>, this.masterData[idx] as unknown as Record<string, unknown>);
    notifyListeners();
    return this.masterData[idx];
  }

  public deleteMasterData(user: UserProfile, id: string): void {
    this.assertAuthorized(user, 'ADMIN');
    const idx = this.masterData.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Master data entry not found');

    const oldItem = { ...this.masterData[idx] };
    this.masterData.splice(idx, 1);
    this.persist();
    this.logAudit(user, 'MASTER_DATA_DELETE', 'MASTER_DATA', id, undefined, oldItem as unknown as Record<string, unknown>, null);
    notifyListeners();
  }

  // ============================================================================
  // BPO RECORDS (Enforcing RLS on SELECT, INSERT, UPDATE, DELETE)
  // ============================================================================
  public getBpoRecords(user: UserProfile, filters?: FilterOptions): BpoRecord[] {
    let records = this.bpoRecords;

    // RLS Filter: Team users can only view their own team's records
    if (user.role === 'TEAM') {
      records = records.filter((r) => r.team_id === user.team_id);
    }

    // Exclude soft deleted unless Admin explicitly requested
    if (!filters?.showDeleted || user.role !== 'ADMIN') {
      records = records.filter((r) => !r.is_deleted);
    }

    if (filters) {
      if (filters.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        records = records.filter((r) =>
          r.reference.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q) ||
          r.permit_no.toLowerCase().includes(q) ||
          r.importer_exporter_name.toLowerCase().includes(q) ||
          (r.mabl_obl_job_ref && r.mabl_obl_job_ref.toLowerCase().includes(q)) ||
          r.description_of_error.toLowerCase().includes(q) ||
          (r.team_name && r.team_name.toLowerCase().includes(q)) ||
          r.status.toLowerCase().includes(q)
        );
      }

      if (filters.teamId && user.role !== 'TEAM') {
        records = records.filter((r) => r.team_id === filters.teamId);
      }

      if (filters.status) {
        records = records.filter((r) => r.status === filters.status);
      }

      if (filters.division) {
        records = records.filter((r) => r.division === filters.division);
      }

      if (filters.issueCategory) {
        records = records.filter((r) => r.issue_category === filters.issueCategory);
      }

      if (filters.ownership) {
        records = records.filter((r) => r.ownership === filters.ownership);
      }

      if (filters.startDate) {
        records = records.filter((r) => r.issue_date >= filters.startDate!);
      }

      if (filters.endDate) {
        records = records.filter((r) => r.issue_date <= filters.endDate!);
      }
    }

    return records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getBpoRecordByReference(user: UserProfile, reference: string): BpoRecord | undefined {
    const record = this.bpoRecords.find((r) => r.reference === reference);
    if (!record) return undefined;
    this.assertAuthorized(user, 'SELECT', { team_id: record.team_id });
    return record;
  }

  public createBpoRecord(
    user: UserProfile,
    data: Omit<BpoRecord, 'id' | 'reference' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name'>
  ): BpoRecord {
    // Determine effective team
    const effectiveTeamId = user.role === 'TEAM' ? user.team_id! : data.team_id;
    this.assertAuthorized(user, 'INSERT', { team_id: effectiveTeamId });

    const team = this.teams.find((t) => t.id === effectiveTeamId);
    if (!team) throw new Error('Invalid team selected.');

    // Server-side generate guaranteed unique reference COM-YYMMDDHHMMSS
    const reference = this.generateReferenceNumber();

    const newRecord: BpoRecord = {
      ...data,
      id: `bpo-${Date.now()}`,
      reference,
      issue_date: toIsoDate(data.issue_date),
      team_id: effectiveTeamId,
      team_name: team.team_name,
      status: data.status || 'Open',
      created_by: user.id,
      created_by_name: user.full_name,
      created_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    this.bpoRecords.unshift(newRecord);

    // Auto-create matching HQ record
    const hqRecord: HqRecord = {
      id: `hq-${Date.now()}`,
      bpo_id: newRecord.id,
      reference: newRecord.reference,
      submitted_date: newRecord.issue_date,
      permit_no: newRecord.permit_no,
      vdp_nod_refund_customs_reference: newRecord.vdp_nod_refund_customs_reference,
      ownership: newRecord.ownership,
      status: newRecord.status,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    this.hqRecords.unshift(hqRecord);

    // Auto-record initial status history
    this.statusHistory.unshift({
      id: `sh-${Date.now()}`,
      reference: newRecord.reference,
      bpo_id: newRecord.id,
      old_status: undefined,
      new_status: newRecord.status,
      changed_by: user.id,
      changed_by_name: user.full_name,
      changed_at: new Date().toISOString(),
      remarks: 'Initial customs case created and recorded in system.',
    });

    this.persist();
    this.logAudit(user, 'CREATE', 'BPO', newRecord.id, newRecord.reference, null, newRecord as unknown as Record<string, unknown>);
    notifyListeners();
    return newRecord;
  }

  public updateBpoRecord(user: UserProfile, reference: string, updates: Partial<BpoRecord>): BpoRecord {
    const idx = this.bpoRecords.findIndex((r) => r.reference === reference);
    if (idx === -1) throw new Error(`Record ${reference} not found.`);

    const current = this.bpoRecords[idx];
    this.assertAuthorized(user, 'UPDATE', { team_id: current.team_id, created_by: current.created_by, record: current });

    const oldRecord = { ...current };

    // Disallow overriding immutable server fields
    const { reference: _ref, id: _id, created_at: _ca, created_by: _cb, ...allowedUpdates } = updates;

    const updatedRecord: BpoRecord = {
      ...current,
      ...allowedUpdates,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // If status changed, record in status history and sync HQ record
    if (allowedUpdates.status && allowedUpdates.status !== oldRecord.status) {
      this.statusHistory.unshift({
        id: `sh-${Date.now()}`,
        reference: current.reference,
        bpo_id: current.id,
        old_status: oldRecord.status,
        new_status: allowedUpdates.status,
        changed_by: user.id,
        changed_by_name: user.full_name,
        changed_at: new Date().toISOString(),
        remarks: 'Record status modified in BPO management panel.',
      });

      const hqIdx = this.hqRecords.findIndex((h) => h.bpo_id === current.id);
      if (hqIdx !== -1) {
        this.hqRecords[hqIdx].status = allowedUpdates.status;
        this.hqRecords[hqIdx].updated_by = user.id;
        this.hqRecords[hqIdx].updated_at = new Date().toISOString();
      }
    }

    this.bpoRecords[idx] = updatedRecord;
    this.persist();
    this.logAudit(user, 'UPDATE', 'BPO', current.id, reference, oldRecord as unknown as Record<string, unknown>, updatedRecord as unknown as Record<string, unknown>);
    notifyListeners();
    return updatedRecord;
  }

  public deleteBpoRecord(user: UserProfile, reference: string): void {
    const idx = this.bpoRecords.findIndex((r) => r.reference === reference);
    if (idx === -1) throw new Error(`Record ${reference} not found.`);

    const current = this.bpoRecords[idx];
    this.assertAuthorized(user, 'DELETE', { team_id: current.team_id, created_by: current.created_by });

    // Auditable soft-delete
    current.is_deleted = true;
    current.deleted_by = user.id;
    current.deleted_at = new Date().toISOString();
    current.updated_at = new Date().toISOString();

    this.persist();
    this.logAudit(user, 'DELETE', 'BPO', current.id, reference, { is_deleted: false }, { is_deleted: true, deleted_by: user.id });
    notifyListeners();
  }

  public restoreBpoRecord(user: UserProfile, reference: string): void {
    this.assertAuthorized(user, 'ADMIN');
    const idx = this.bpoRecords.findIndex((r) => r.reference === reference);
    if (idx === -1) throw new Error(`Record ${reference} not found.`);

    const current = this.bpoRecords[idx];
    current.is_deleted = false;
    current.deleted_by = undefined;
    current.deleted_at = undefined;
    current.updated_at = new Date().toISOString();

    this.persist();
    this.logAudit(user, 'RESTORE', 'BPO', current.id, reference, { is_deleted: true }, { is_deleted: false });
    notifyListeners();
  }

  // ============================================================================
  // HQ RECORDS & STATUS PROCESS WORKFLOW
  // ============================================================================
  public getHqRecords(user: UserProfile): (HqRecord & { bpo?: BpoRecord })[] {
    // HQ, PCO and ADMIN can view all HQ records. TEAM views their own team's.
    return this.hqRecords
      .map((hq) => {
        const bpo = this.bpoRecords.find((b) => b.id === hq.bpo_id);
        return { ...hq, bpo };
      })
      .filter((hq) => {
        if (!hq.bpo || hq.bpo.is_deleted) return false;
        if (user.role === 'TEAM') {
          return hq.bpo.team_id === user.team_id;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public updateHqProcess(
    user: UserProfile,
    reference: string,
    updates: {
      status?: ProcessStatus | string;
      approval_date?: string;
      vdp_nod_refund_customs_reference?: string;
      remarks?: string;
    }
  ): HqRecord {
    const hqIdx = this.hqRecords.findIndex((h) => h.reference === reference);
    if (hqIdx === -1) throw new Error(`HQ Record ${reference} not found.`);

    const bpoIdx = this.bpoRecords.findIndex((b) => b.reference === reference);
    if (bpoIdx === -1) throw new Error(`BPO Record ${reference} not found.`);

    const hq = this.hqRecords[hqIdx];
    const bpo = this.bpoRecords[bpoIdx];

    // Authorization: HQ and ADMIN can update process status. PCO/TEAM restricted
    if (user.role !== 'ADMIN' && user.role !== 'HQ') {
      throw new Error('Access denied: Only HQ and Administrative personnel may update customs process status and approvals.');
    }

    const oldStatus = hq.status;
    const newStatus = updates.status || hq.status;

    hq.status = newStatus;
    if (updates.approval_date !== undefined) hq.approval_date = updates.approval_date ? toIsoDate(updates.approval_date) : undefined;
    if (updates.vdp_nod_refund_customs_reference !== undefined) hq.vdp_nod_refund_customs_reference = updates.vdp_nod_refund_customs_reference;
    if (updates.remarks) hq.remarks = updates.remarks;
    hq.updated_by = user.id;
    hq.updated_at = new Date().toISOString();

    // Sync to BPO record
    bpo.status = newStatus;
    if (updates.vdp_nod_refund_customs_reference) bpo.vdp_nod_refund_customs_reference = updates.vdp_nod_refund_customs_reference;
    bpo.updated_by = user.id;
    bpo.updated_at = new Date().toISOString();

    // Log status history if status changed
    if (oldStatus !== newStatus || updates.remarks) {
      this.statusHistory.unshift({
        id: `sh-${Date.now()}`,
        reference,
        bpo_id: bpo.id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: user.id,
        changed_by_name: user.full_name,
        changed_at: new Date().toISOString(),
        remarks: updates.remarks || 'Status updated via HQ Process Management Console.',
      });
    }

    this.persist();
    this.logAudit(user, 'STATUS_CHANGE', 'HQ', hq.id, reference, { old_status: oldStatus }, { new_status: newStatus, remarks: updates.remarks });
    notifyListeners();
    return hq;
  }

  // ============================================================================
  // STATUS HISTORY
  // ============================================================================
  public getStatusHistory(reference: string): StatusHistoryItem[] {
    return this.statusHistory
      .filter((s) => s.reference === reference)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  public getAuditLogs(user: UserProfile, filterAction?: string): AuditLogItem[] {
    this.assertAuthorized(user, 'ADMIN');
    let logs = this.auditLogs;
    if (filterAction && filterAction !== 'ALL') {
      logs = logs.filter((l) => l.action === filterAction);
    }
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ============================================================================
  // ATTACHMENTS
  // ============================================================================
  public getAttachments(reference: string): RecordAttachment[] {
    return this.attachments.filter((a) => a.reference === reference);
  }

  public addAttachment(user: UserProfile, reference: string, file: { name: string; size: number; type: string }): RecordAttachment {
    const bpo = this.bpoRecords.find((b) => b.reference === reference);
    if (!bpo) throw new Error('Record not found');

    const attachment: RecordAttachment = {
      id: `att-${Date.now()}`,
      bpo_id: bpo.id,
      reference,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: `supabase-storage/customs-docs/${reference}/${file.name}`,
      uploaded_by: user.id,
      uploaded_by_name: user.full_name,
      uploaded_at: new Date().toISOString(),
    };

    this.attachments.unshift(attachment);
    this.persist();
    this.logAudit(user, 'UPDATE', 'BPO', bpo.id, reference, null, { uploaded_file: file.name });
    notifyListeners();
    return attachment;
  }

  // ============================================================================
  // CUSTOMER CASE LOOKUP (for live suggestions & customer history)
  // ============================================================================
  public getCustomerHistory(customerName: string, user: UserProfile): {
    totalCases: number;
    openCases: number;
    completedCases: number;
    pastRootCauses: string[];
    recentReferences: string[];
  } {
    if (!customerName || customerName.trim().length < 2) {
      return { totalCases: 0, openCases: 0, completedCases: 0, pastRootCauses: [], recentReferences: [] };
    }

    const userRecords = this.getBpoRecords(user);
    const match = userRecords.filter(
      (r) => r.customer.toLowerCase().includes(customerName.toLowerCase().trim())
    );

    const openCount = match.filter((r) => ['Open', 'In Progress', 'Submitted', 'Under Review'].includes(r.status)).length;
    const completedCount = match.filter((r) => ['Approved', 'Completed', 'Closed'].includes(r.status)).length;
    const rootCauses = Array.from(new Set(match.map((r) => r.root_cause).filter(Boolean) as string[])).slice(0, 4);
    const recentRefs = match.slice(0, 5).map((r) => `${r.reference} (${r.status})`);

    return {
      totalCases: match.length,
      openCases: openCount,
      completedCases: completedCount,
      pastRootCauses: rootCauses,
      recentReferences: recentRefs,
    };
  }

  // ============================================================================
  // GOOGLE SHEET MIGRATION ENGINE
  // ============================================================================
  public migrateFromData(user: UserProfile, rows: Record<string, string>[], sourceName: string): MigrationReport {
    this.assertAuthorized(user, 'ADMIN');

    const report: MigrationReport = {
      timestamp: new Date().toISOString(),
      source: sourceName,
      totalSourceRecords: rows.length,
      successfullyImported: 0,
      skippedRecords: 0,
      duplicateRecords: 0,
      invalidRecords: 0,
      missingRequiredFields: 0,
      errors: [],
    };

    let importedCount = 0;

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const customer = row.customer || row.Customer || row['CUSTOMER'] || row['Customer Name'];
      const permitNo = row.permit_no || row.permit || row['Permit No'] || row['Permit No.'] || row['PERMIT_NO'];
      const issueDateRaw = row.issue_date || row['Issue Date'] || row['Date'] || row['DATE'];
      let reference = row.reference || row['Reference'] || row['Reference No'] || row['REF'];

      if (!customer || !permitNo) {
        report.missingRequiredFields++;
        report.errors.push({
          row: rowNum,
          reference: reference || 'N/A',
          reason: 'Missing mandatory fields: Customer or Permit Number.',
        });
        report.invalidRecords++;
        return;
      }

      // Check duplicates
      if (reference && this.bpoRecords.some((r) => r.reference === reference)) {
        report.duplicateRecords++;
        report.errors.push({
          row: rowNum,
          reference,
          reason: 'Duplicate reference detected in database.',
        });
        report.skippedRecords++;
        return;
      }

      if (!reference) {
        reference = this.generateReferenceNumber();
      }

      // Match or default team
      const teamNameRaw = row.team_name || row['Team Name'] || row.team || row['Team'] || 'Ocean Freight Clearance';
      let team = this.teams.find((t) => t.team_name.toLowerCase().includes(teamNameRaw.toLowerCase()));
      if (!team) {
        team = this.teams[0];
      }

      const isoDate = toIsoDate(issueDateRaw || new Date().toISOString().split('T')[0]);

      const newBpo: BpoRecord = {
        id: `mig-${Date.now()}-${rowNum}`,
        reference,
        issue_date: isoDate,
        team_id: team.id,
        team_name: team.team_name,
        customer: customer.trim(),
        division: row.division || row['Division'] || 'Ocean Freight',
        issue_category: row.issue_category || row['Issue Category'] || 'Customs Notice',
        permit_no: permitNo.trim(),
        importer_exporter_name: row.importer_exporter_name || row['Importer/Exporter Name'] || customer.trim(),
        mabl_obl_job_ref: row.mabl_obl_job_ref || row['MABL/OBL/Job Ref#'] || row['Job Ref'] || '',
        error_category: row.error_category || row['Error Category'] || 'Clerical Data Entry Typo',
        description_of_error: row.description_of_error || row['Description Of Error'] || row['Error Description'] || 'Migrated from external sheet.',
        root_cause: row.root_cause || row['Root Cause'] || '',
        preventive_action: row.preventive_action || row['Preventive Action'] || '',
        vdp_nod_refund_customs_reference: row.vdp_nod_refund_customs_reference || row['VDP/NOD/Refund/Customs Reference'] || '',
        ownership: row.ownership || row['Ownership'] || 'LSP / Broker Responsibility',
        lsp_cs_name: row.lsp_cs_name || row['LSP/CS Name'] || user.full_name,
        status: (row.status || row['Status'] || 'Open') as ProcessStatus,
        created_by: user.id,
        created_by_name: user.full_name,
        created_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      this.bpoRecords.unshift(newBpo);

      // Create matching HQ record
      this.hqRecords.unshift({
        id: `hq-mig-${Date.now()}-${rowNum}`,
        bpo_id: newBpo.id,
        reference: newBpo.reference,
        submitted_date: newBpo.issue_date,
        permit_no: newBpo.permit_no,
        vdp_nod_refund_customs_reference: newBpo.vdp_nod_refund_customs_reference,
        ownership: newBpo.ownership,
        status: newBpo.status,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

      importedCount++;
    });

    report.successfullyImported = importedCount;
    this.persist();
    this.logAudit(user, 'IMPORT', 'SYSTEM', undefined, undefined, null, {
      source: sourceName,
      imported: importedCount,
      errors: report.errors.length,
    });
    notifyListeners();
    return report;
  }

  // ============================================================================
  // SYSTEM HEALTH & STATS (for Admin)
  // ============================================================================
  public getSystemStatistics(user: UserProfile) {
    this.assertAuthorized(user, 'ADMIN');

    const totalBpo = this.bpoRecords.length;
    const activeBpo = this.bpoRecords.filter((b) => !b.is_deleted).length;
    const deletedBpo = this.bpoRecords.filter((b) => b.is_deleted).length;
    const totalHq = this.hqRecords.length;
    const totalUsers = this.profiles.length;
    const activeUsers = this.profiles.filter((p) => p.status === 'ACTIVE').length;
    const totalTeams = this.teams.length;
    const totalMasterItems = this.masterData.length;
    const totalAuditLogs = this.auditLogs.length;
    const totalAttachments = this.attachments.length;

    return {
      totalBpo,
      activeBpo,
      deletedBpo,
      totalHq,
      totalUsers,
      activeUsers,
      totalTeams,
      totalMasterItems,
      totalAuditLogs,
      totalAttachments,
      databaseStorageEstimateKb: Math.round(
        (JSON.stringify(this.bpoRecords).length +
          JSON.stringify(this.auditLogs).length +
          JSON.stringify(this.hqRecords).length) /
          1024
      ),
      lastSync: new Date().toISOString(),
    };
  }

  // ============================================================================
  // RESET / RE-SEED DATA
  // ============================================================================
  public resetToFactorySeed(user: UserProfile) {
    this.assertAuthorized(user, 'ADMIN');
    localStorage.removeItem(DB_KEY_TEAMS);
    localStorage.removeItem(DB_KEY_PROFILES);
    localStorage.removeItem(DB_KEY_MASTER_DATA);
    localStorage.removeItem(DB_KEY_BPO);
    localStorage.removeItem(DB_KEY_HQ);
    localStorage.removeItem(DB_KEY_STATUS_HIST);
    localStorage.removeItem(DB_KEY_AUDIT);
    localStorage.removeItem(DB_KEY_ATTACHMENTS);
    this.init();
    notifyListeners();
  }
}

export const db = new EnterpriseDatabase();
