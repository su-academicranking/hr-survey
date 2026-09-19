export interface CommitteeMember {
  id: number;
  role: string;
  category: 'กรรมการ';
}

export interface SubCommittee {
  id: number;
  number: number;
  title: string;
  badgeLabel: string;
  targetCapacity: number; // default soft capacity ~7 members
  accentColor: {
    primary: string;
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
}

export interface SurveySubmission {
  id: string;
  memberId: number;
  memberRole: string;
  memberName: string;
  subCommitteeId: number;
  subCommitteeName: string;
  submittedAt: string; // ISO string or Thai formatted timestamp
}

export interface SheetConfig {
  appScriptUrl: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  isConfigured: boolean;
  lastSyncedAt?: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

export interface AdminConfig {
  email: string;
  password: string;
  lastUpdated?: string;
  syncedToSheet?: boolean;
}

