import React, { useState, useEffect, useCallback } from 'react';
import { COMMITTEE_MEMBERS, SUB_COMMITTEES, DEFAULT_APPS_SCRIPT_URL } from './data/committeeData';
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

function getScriptUrlFromLocation(): string {
  if (typeof window === 'undefined') return '';
  try {
    // 1. Search params: ?appscript=... or ?script=...
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('appscript') || searchParams.get('script');
    if (fromSearch && fromSearch.includes('script.google.com')) {
      return decodeURIComponent(fromSearch).trim();
    }
    // 2. Hash params: #appscript=... or #script=...
    if (window.location.hash.includes('script=')) {
      const hashClean = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashClean);
      const fromHash = hashParams.get('appscript') || hashParams.get('script');
      if (fromHash && fromHash.includes('script.google.com')) {
        return decodeURIComponent(fromHash).trim();
      }
    }
  } catch {
    // ignore
  }
  return '';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'survey' | 'summary'>('survey');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Admin state - Strictly in-memory session; automatically logs out on page reload / refresh
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
    const fromUrl = getScriptUrlFromLocation();
    const savedUrl = fromUrl || localStorage.getItem(LOCAL_STORAGE_URL_KEY) || DEFAULT_APPS_SCRIPT_URL;
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

  // Fetch submissions from backend or direct Google Apps Script (Guarantees data loads in Incognito mode)
  const fetchSubmissions = useCallback(async (syncFromSheet = false, overrideScriptUrl?: string) => {
    setIsRefreshing(true);
    const activeScriptUrl =
      overrideScriptUrl ||
      sheetConfig.appScriptUrl ||
      getScriptUrlFromLocation() ||
      localStorage.getItem(LOCAL_STORAGE_URL_KEY) ||
      DEFAULT_APPS_SCRIPT_URL;

    try {
      // 1. First attempt backend API (if server is running)
      let backendLoaded = false;
      try {
        const query = syncFromSheet ? '?sync=true' : '';
        const res = await fetch(`/api/submissions${query}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            const cleanData = json.data.filter(
              (s: any) =>
                s &&
                s.id &&
                Number(s.memberId) > 0 &&
                String(s.memberName || '').trim().length > 0 &&
                Number(s.subCommitteeId) > 0
            );
            setSubmissions(cleanData);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
            } catch {
              // ignore
            }
            backendLoaded = true;
            return;
          }
        }
      } catch {
        // Backend not running (e.g. GitHub Pages static hosting)
      }

      // 2. Direct Google Apps Script fetch (Ensures data displays in Incognito mode & GitHub Pages)
      if (activeScriptUrl && activeScriptUrl.includes('script.google.com')) {
        try {
          const scriptRes = await fetch(activeScriptUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (scriptRes.ok) {
            const json = await scriptRes.json();
            if (json && json.status === 'success' && Array.isArray(json.data)) {
              // กรองแถวที่ถูกล้าง หรือไม่มีชื่อ/คณะอนุกรรมการ ออกอย่างเด็ดขาด
              const cleanData = json.data.filter(
                (s: any) =>
                  s &&
                  s.id &&
                  Number(s.memberId) > 0 &&
                  String(s.memberName || '').trim().length > 0 &&
                  Number(s.subCommitteeId) > 0
              );
              setSubmissions(cleanData);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
              } catch {
                // ignore
              }
              return;
            }
          }
        } catch (scriptErr) {
          console.warn('Direct Apps Script fetch notice:', scriptErr);
        }
      }

      // 3. LocalStorage fallback
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
  }, [sheetConfig.appScriptUrl]);

  // Fetch config on mount & auto-sync
  useEffect(() => {
    async function loadConfig() {
      let loadedUrl = getScriptUrlFromLocation();

      // Check static config file (essential for GitHub Pages and Incognito mode)
      if (!loadedUrl) {
        try {
          const staticRes = await fetch('./app-config.json', { cache: 'no-store' });
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            if (staticData?.appScriptUrl && typeof staticData.appScriptUrl === 'string' && staticData.appScriptUrl.trim()) {
              loadedUrl = staticData.appScriptUrl.trim();
            }
          }
        } catch {
          // ignore
        }
      }

      // Check backend API /api/config
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.appScriptUrl && typeof cfg.appScriptUrl === 'string' && cfg.appScriptUrl.trim()) {
            loadedUrl = cfg.appScriptUrl.trim();
          }
        }
      } catch (err) {
        console.warn('Config fetch skipped:', err);
      }

      // Fallback to localStorage or permanent DEFAULT_APPS_SCRIPT_URL (ensures Incognito & fresh devices remember it)
      if (!loadedUrl) {
        loadedUrl = localStorage.getItem(LOCAL_STORAGE_URL_KEY) || DEFAULT_APPS_SCRIPT_URL;
      }

      if (loadedUrl) {
        setSheetConfig((prev) => ({
          ...prev,
          appScriptUrl: loadedUrl,
          isConfigured: true,
          syncStatus: 'idle',
        }));
        try {
          localStorage.setItem(LOCAL_STORAGE_URL_KEY, loadedUrl);
        } catch {
          // ignore
        }
        fetchSubmissions(true, loadedUrl);
      } else {
        fetchSubmissions(true);
      }
    }

    // Wipe any persisted admin login so reloading or sharing links always shows normal page
    try {
      localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
    } catch {
      // ignore
    }
    setIsAdmin(false);

    loadConfig();

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
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
    const cleanUrl = url.trim();
    setSheetConfig((prev) => ({
      ...prev,
      appScriptUrl: cleanUrl,
      isConfigured: Boolean(cleanUrl || prev.spreadsheetId),
    }));
    try {
      localStorage.setItem(LOCAL_STORAGE_URL_KEY, cleanUrl);
    } catch {
      // ignore
    }

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appScriptUrl: cleanUrl }),
      });
    } catch {
      // Backend not running on static hosts
    }

    if (cleanUrl) {
      await fetchSubmissions(true, cleanUrl);
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

    // Static hosting client-side fallback (hashed verification)
    const DEFAULT_PASS_HASH = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270';
    let inputHash = '';
    try {
      const msgBuffer = new TextEncoder().encode(cleanPass);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      inputHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // ignore
    }

    const savedAdminPass = localStorage.getItem('silpakorn_admin_password');
    const isMatched = (savedAdminPass && cleanPass === savedAdminPass) || inputHash === DEFAULT_PASS_HASH;

    if (isMatched) {
      setIsAdmin(true);
      setAdminEmail(email || 'admin@silpakorn.edu');
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

    // 3. Direct Google Apps Script delete if connected (ensures entire row in Google Sheet is deleted without residual id/numbers)
    const scriptUrl = sheetConfig.appScriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (scriptUrl && scriptUrl.includes('script.google.com')) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteSubmission',
            memberId: memberId,
          }),
          mode: 'no-cors',
        });
      } catch (scriptErr) {
        console.warn('Direct Apps Script delete dispatch error:', scriptErr);
      }
    }

    // 4. Direct Google Sheets sync if connected via OAuth
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

    // Direct Google Apps Script clear all
    const scriptUrl = sheetConfig.appScriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (scriptUrl && scriptUrl.includes('script.google.com')) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clearAllSubmissions',
          }),
          mode: 'no-cors',
        });
      } catch (scriptErr) {
        console.warn('Direct Apps Script clear all error:', scriptErr);
      }
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
