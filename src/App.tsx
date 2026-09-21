import React, { useState, useEffect, useCallback } from 'react';
import { COMMITTEE_MEMBERS, SUB_COMMITTEES } from './data/committeeData';
import { SurveySubmission, SheetConfig } from './types';
import { Header } from './components/Header';
import { SubCommitteeOverview } from './components/SubCommitteeOverview';
import { SurveyForm } from './components/SurveyForm';
import { SummaryView } from './components/SummaryView';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminEditModal } from './components/AdminEditModal';
import { Users, FileSpreadsheet, ShieldAlert, Lock } from 'lucide-react';
import {
  initAuth,
  syncSubmissionToSheet,
  syncAdminConfigToSheet,
  syncAllSubmissionsToSheet,
} from './services/googleAuth';
import { User } from 'firebase/auth';

const LOCAL_STORAGE_KEY = 'silpakorn_committee_submissions';
const LOCAL_STORAGE_URL_KEY = 'silpakorn_appscript_url';
const LOCAL_STORAGE_SHEET_ID_KEY = 'silpakorn_spreadsheet_id';
const LOCAL_STORAGE_SHEET_URL_KEY = 'silpakorn_spreadsheet_url';
const LOCAL_STORAGE_ADMIN_KEY = 'silpakorn_is_admin';
const LOCAL_STORAGE_ADMIN_EMAIL_KEY = 'silpakorn_admin_email';

export default function App() {
  const [activeTab, setActiveTab] = useState<'survey' | 'summary'>('survey');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY) === 'true';
  });
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ADMIN_EMAIL_KEY) || 'admin@silpakorn.edu';
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<SurveySubmission | null>(null);

  const [submissions, setSubmissions] = useState<SurveySubmission[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    const savedUrl = localStorage.getItem(LOCAL_STORAGE_URL_KEY) || '';
    const savedSheetId = localStorage.getItem(LOCAL_STORAGE_SHEET_ID_KEY) || '';
    const savedSheetUrl = localStorage.getItem(LOCAL_STORAGE_SHEET_URL_KEY) || '';
    return {
      appScriptUrl: savedUrl,
      spreadsheetId: savedSheetId,
      spreadsheetUrl: savedSheetUrl,
      isConfigured: Boolean(savedUrl.trim() || savedSheetId.trim()),
      syncStatus: 'idle',
    };
  });

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch submissions from backend or localStorage
  const fetchSubmissions = useCallback(async (syncFromSheet = false) => {
    setIsRefreshing(true);
    try {
      const query = syncFromSheet ? '?sync=true' : '';
      const res = await fetch(`/api/submissions${query}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setSubmissions(json.data);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
          return;
        }
      }
      // Fallback for static hosting / GitHub Pages
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        try {
          setSubmissions(JSON.parse(local));
        } catch {
          // ignore
        }
      }
    } catch {
      // Backend not running (e.g. GitHub Pages static)
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        try {
          setSubmissions(JSON.parse(local));
        } catch {
          // ignore
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.appScriptUrl) {
            setSheetConfig({
              appScriptUrl: cfg.appScriptUrl,
              isConfigured: true,
              syncStatus: 'idle',
            });
            localStorage.setItem(LOCAL_STORAGE_URL_KEY, cfg.appScriptUrl);
          }
        }
      } catch (err) {
        console.warn('Config fetch skipped:', err);
      }
    }

    loadConfig();
    fetchSubmissions(true);

    const unsubscribeAuth = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );

    // Real-time polling every 8 seconds
    const interval = setInterval(() => {
      fetchSubmissions(false);
    }, 8000);

    return () => {
      clearInterval(interval);
      if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
    };
  }, [fetchSubmissions]);

  // Handle Form Submission
  const handleFormSubmit = async (formData: {
    memberId: number;
    memberRole: string;
    memberName: string;
    subCommitteeId: number;
    subCommitteeName: string;
  }): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      let updatedList: SurveySubmission[] = [];

      // 1. Post to local server if available
      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.allSubmissions) {
            updatedList = json.allSubmissions;
          }
        }
      } catch {
        // Backend not available (e.g. GitHub Pages static hosting)
      }

      // 2. If backend didn't return full list, calculate locally
      if (updatedList.length === 0) {
        const newRecord: SurveySubmission = {
          id: `sub_${Date.now()}_${formData.memberId}`,
          memberId: formData.memberId,
          memberRole: formData.memberRole,
          memberName: formData.memberName,
          subCommitteeId: formData.subCommitteeId,
          subCommitteeName: formData.subCommitteeName,
          submittedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        };

        const existingIdx = submissions.findIndex((s) => s.memberId === formData.memberId);
        if (existingIdx >= 0) {
          updatedList = [...submissions];
          updatedList[existingIdx] = newRecord;
        } else {
          updatedList = [...submissions, newRecord];
        }
      }

      setSubmissions(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      // 3. Direct client-side Apps Script fallback if needed
      if (sheetConfig.appScriptUrl) {
        try {
          fetch(sheetConfig.appScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }).catch((e) => console.warn('Direct Apps Script ping:', e));
        } catch {
          // ignore
        }
      }

      // 4. Direct client-side Google Sheet sync if OAuth token & spreadsheetId exist
      if (accessToken && sheetConfig.spreadsheetId && updatedList.length > 0) {
        const lastRecord = updatedList.find((s) => s.memberId === formData.memberId);
        if (lastRecord) {
          syncSubmissionToSheet(accessToken, sheetConfig.spreadsheetId, lastRecord).catch((e) =>
            console.warn('Direct Sheet sync warning:', e)
          );
        }
      }

      return true;
    } catch (err) {
      console.error('Submission error:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Apps Script URL
  const handleSaveSheetConfig = async (url: string) => {
    setSheetConfig((prev) => ({
      ...prev,
      appScriptUrl: url,
      isConfigured: Boolean(url.trim() || prev.spreadsheetId),
    }));
    localStorage.setItem(LOCAL_STORAGE_URL_KEY, url);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appScriptUrl: url }),
      });
    } catch {
      // Backend not running on static hosts
    }
  };

  // Connected Spreadsheet via Direct Sheets API
  const handleSpreadsheetConnected = (sheetId: string, sheetUrl: string) => {
    setSheetConfig((prev) => ({
      ...prev,
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      isConfigured: true,
    }));
    localStorage.setItem(LOCAL_STORAGE_SHEET_ID_KEY, sheetId);
    localStorage.setItem(LOCAL_STORAGE_SHEET_URL_KEY, sheetUrl);
  };

  // Manual Sync Now
  const handleManualSync = async () => {
    setIsSyncing(true);
    await fetchSubmissions(true);
    setIsSyncing(false);
  };

  // Admin Actions
  const handleAdminLogin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const savedAdminPass = localStorage.getItem('silpakorn_admin_password') || 'admin1234';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setIsAdmin(true);
          setAdminEmail(email);
          localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, 'true');
          localStorage.setItem(LOCAL_STORAGE_ADMIN_EMAIL_KEY, email);
          return { success: true };
        }
        return { success: false, message: data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
      }
    } catch {
      // Backend not running (e.g. GitHub Pages)
    }

    // Static hosting client-side fallback
    if (cleanPass === savedAdminPass || cleanPass === 'admin1234') {
      setIsAdmin(true);
      setAdminEmail(email || 'admin@silpakorn.edu');
      localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, 'true');
      localStorage.setItem(LOCAL_STORAGE_ADMIN_EMAIL_KEY, email || 'admin@silpakorn.edu');
      return { success: true };
    }
    return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
  };

  const handleUpdateAdminPassword = async (
    newEmail: string,
    newPass: string
  ): Promise<{ success: boolean; message: string; sheetSynced: boolean }> => {
    localStorage.setItem('silpakorn_admin_password', newPass);
    localStorage.setItem(LOCAL_STORAGE_ADMIN_EMAIL_KEY, newEmail);
    setAdminEmail(newEmail);
    let sheetSynced = false;

    if (accessToken && sheetConfig.spreadsheetId) {
      try {
        const directOk = await syncAdminConfigToSheet(
          accessToken,
          sheetConfig.spreadsheetId,
          newEmail,
          newPass
        );
        if (directOk) sheetSynced = true;
      } catch (e) {
        console.warn('Direct sheet sync for admin password:', e);
      }
    }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: newEmail, adminPassword: newPass }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sheetSynced) sheetSynced = true;
      }
    } catch {
      // Backend not running on static host
    }

    return {
      success: true,
      message: 'บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว',
      sheetSynced,
    };
  };

  const handleAdminSaveEdit = async (updated: {
    memberId: number;
    subCommitteeId: number;
    subCommitteeName: string;
    memberName: string;
    memberRole: string;
  }): Promise<boolean> => {
    // 1. Immediately update local state & localStorage so the UI reflects changes instantly
    let updatedList: SurveySubmission[] = [];
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.memberId === updated.memberId);
      if (idx >= 0) {
        updatedList = prev.map((s) =>
          s.memberId === updated.memberId
            ? {
                ...s,
                subCommitteeId: updated.subCommitteeId,
                subCommitteeName: updated.subCommitteeName,
                memberName: updated.memberName,
                memberRole: updated.memberRole,
                submittedAt: `${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (แก้ไขโดย Admin)`,
              }
            : s
        );
      } else {
        const newRecord: SurveySubmission = {
          id: `sub_${Date.now()}_${updated.memberId}`,
          memberId: updated.memberId,
          memberRole: updated.memberRole,
          memberName: updated.memberName,
          subCommitteeId: updated.subCommitteeId,
          subCommitteeName: updated.subCommitteeName,
          submittedAt: `${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (แก้ไขโดย Admin)`,
        };
        updatedList = [...prev, newRecord];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      return updatedList;
    });

    // 2. Sync to local backend
    try {
      await fetch(`/api/submissions/${updated.memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Backend update failed:', err);
    }

    // 3. Direct Google Sheets sync if connected
    if (accessToken && sheetConfig.spreadsheetId) {
      try {
        await syncAllSubmissionsToSheet(accessToken, sheetConfig.spreadsheetId, updatedList);
      } catch (sheetErr) {
        console.warn('Direct sheet sync on edit failed:', sheetErr);
      }
    }

    return true;
  };

  const handleAdminDeleteSubmission = async (memberId: number): Promise<boolean> => {
    // 1. Immediately remove from local state & localStorage
    let nextList: SurveySubmission[] = [];
    setSubmissions((prev) => {
      nextList = prev.filter((s) => s.memberId !== memberId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
      return nextList;
    });

    // 2. Sync to local backend
    try {
      await fetch(`/api/submissions/${memberId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend delete failed:', err);
    }

    // 3. Direct Google Sheets sync if connected
    if (accessToken && sheetConfig.spreadsheetId) {
      try {
        await syncAllSubmissionsToSheet(accessToken, sheetConfig.spreadsheetId, nextList);
      } catch (sheetErr) {
        console.warn('Direct sheet sync on delete failed:', sheetErr);
      }
    }

    return true;
  };

  const handleAdminClearAllSubmissions = async (): Promise<boolean> => {
    setSubmissions([]);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));

    try {
      await fetch('/api/submissions', {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend clear all failed:', err);
    }

    if (accessToken && sheetConfig.spreadsheetId) {
      try {
        await syncAllSubmissionsToSheet(accessToken, sheetConfig.spreadsheetId, []);
      } catch (sheetErr) {
        console.warn('Direct sheet sync on clear all failed:', sheetErr);
      }
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalSubmissions={submissions.length}
        totalMembers={COMMITTEE_MEMBERS.length}
        sheetConfig={sheetConfig}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onRefreshData={() => fetchSubmissions(true)}
        isRefreshing={isRefreshing}
        isAdmin={isAdmin}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'survey' ? (
          <div className="space-y-6">
            {/* Overview of the 3 subcommittees */}
            <SubCommitteeOverview
              subCommittees={SUB_COMMITTEES}
              submissions={submissions}
            />

            {/* The Main Survey Form */}
            <SurveyForm
              committeeMembers={COMMITTEE_MEMBERS}
              subCommittees={SUB_COMMITTEES}
              submissions={submissions}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          /* Real-time Summary Dashboard */
          <SummaryView
            committeeMembers={COMMITTEE_MEMBERS}
            subCommittees={SUB_COMMITTEES}
            submissions={submissions}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            isSheetConfigured={sheetConfig.isConfigured}
            isAdmin={isAdmin}
            onEditSubmission={(sub) => {
              setEditingSubmission(sub);
              setIsEditModalOpen(true);
            }}
            onDeleteSubmission={handleAdminDeleteSubmission}
            onClearAllSubmissions={handleAdminClearAllSubmissions}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-700 text-center sm:text-left">
            คณะกรรมการขับเคลื่อนการพัฒนาทรัพยากรบุคคล มหาวิทยาลัยศิลปากร
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              title={isAdmin ? 'ผู้ดูแลระบบ (Admin) กำลังทำงาน - คลิกเพื่อจัดการ' : 'เข้าสู่ระบบผู้ดูแลระบบ (Admin)'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-[#005F56] text-white font-bold shadow-xs hover:bg-[#004d46] ring-1 ring-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Lock className={`w-3.5 h-3.5 ${isAdmin ? 'text-emerald-300' : 'text-slate-500'}`} />
              <span>{isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ดูแลระบบ'}</span>
              {isAdmin && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Sheet Settings Modal */}
      <SheetSettingsModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        sheetConfig={sheetConfig}
        onSaveConfig={handleSaveSheetConfig}
        onSyncNow={handleManualSync}
        isSyncing={isSyncing}
        currentUser={currentUser}
        accessToken={accessToken}
        submissions={submissions}
        onSpreadsheetConnected={handleSpreadsheetConnected}
        onUserChanged={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
      />

      {/* Admin Login & Password Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        adminEmail={adminEmail}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        onUpdateAdminPassword={handleUpdateAdminPassword}
        sheetConfig={sheetConfig}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
      />

      {/* Admin Edit Submission Modal */}
      <AdminEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSubmission(null);
        }}
        submission={editingSubmission}
        subCommittees={SUB_COMMITTEES}
        onSave={handleAdminSaveEdit}
      />
    </div>
  );
}
