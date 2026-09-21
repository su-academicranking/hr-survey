import React, { useState, useEffect } from 'react';
import { APPS_SCRIPT_TEMPLATE } from '../data/committeeData';
import { SheetConfig, SurveySubmission } from '../types';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LogOut,
  PlusCircle,
  Link as LinkIcon,
  ShieldAlert,
  Code2,
  KeyRound,
  ArrowRight,
  Share2,
} from 'lucide-react';
import {
  googleSignIn,
  logout,
  createSurveySpreadsheet,
  initializeExistingSpreadsheet,
  extractSpreadsheetId,
} from '../services/googleAuth';
import { User } from 'firebase/auth';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetConfig: SheetConfig;
  onSaveConfig: (url: string) => Promise<void>;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
  currentUser: User | null;
  accessToken: string | null;
  submissions?: SurveySubmission[];
  onSpreadsheetConnected?: (sheetId: string, sheetUrl: string) => void;
  onUserChanged: (user: User | null, token: string | null) => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  sheetConfig,
  onSaveConfig,
  onSyncNow,
  isSyncing,
  currentUser,
  accessToken,
  submissions = [],
  onSpreadsheetConnected,
  onUserChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'appscript' | 'directSheet'>('appscript');
  const [urlInput, setUrlInput] = useState(sheetConfig.appScriptUrl || '');
  const [existingSheetInput, setExistingSheetInput] = useState(
    sheetConfig.spreadsheetUrl || sheetConfig.spreadsheetId || ''
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isConnectingExisting, setIsConnectingExisting] = useState(false);
  const [connectedSheetUrl, setConnectedSheetUrl] = useState<string | null>(
    sheetConfig.spreadsheetUrl || null
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [sheetSuccessMessage, setSheetSuccessMessage] = useState<string | null>(null);
  const [copiedHostname, setCopiedHostname] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    if (sheetConfig.appScriptUrl) {
      setUrlInput(sheetConfig.appScriptUrl);
    }
  }, [sheetConfig.appScriptUrl]);

  if (!isOpen) return null;

  const handleSaveAppScript = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig(urlInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getShareLink = () => {
    if (typeof window === 'undefined') return '';
    const script = urlInput.trim() || sheetConfig.appScriptUrl || '';
    const base = window.location.origin + window.location.pathname;
    if (script) {
      return `${base}#appscript=${encodeURIComponent(script)}`;
    }
    return base;
  };

  const handleCopyShareLink = () => {
    const link = getShareLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setSheetSuccessMessage(null);
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChanged(result.user, result.accessToken);
        setSheetSuccessMessage('เข้าสู่ระบบด้วย Google และให้สิทธิ์เรียบร้อยแล้ว');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // User closed or cancelled popup window
        return;
      }
      console.warn('Google Sign in issue:', err);
      setAuthError(err.message || 'ไม่สามารถลงชื่อเข้าใช้ Google ได้');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    onUserChanged(null, null);
    setConnectedSheetUrl(null);
    setAuthError(null);
    setSheetSuccessMessage(null);
  };

  // Option 1: Create a new spreadsheet automatically via API
  const handleCreateSheetWithAPI = async () => {
    if (!accessToken) {
      setAuthError('กรุณาลงชื่อเข้าใช้ Google ก่อนดำเนินการ');
      return;
    }
    setIsCreatingSheet(true);
    setAuthError(null);
    setSheetSuccessMessage(null);
    try {
      const result = await createSurveySpreadsheet(accessToken);
      setConnectedSheetUrl(result.spreadsheetUrl);
      setExistingSheetInput(result.spreadsheetUrl);
      if (onSpreadsheetConnected) {
        onSpreadsheetConnected(result.spreadsheetId, result.spreadsheetUrl);
      }
      setSheetSuccessMessage('สร้างไฟล์ Google Sheet ใหม่ใน Drive และตั้งค่าหัวตารางเรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error('Create sheet error:', err);
      setAuthError(err.message || 'เกิดข้อผิดพลาดในการสร้าง Google Sheet');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Option 2: Connect an existing spreadsheet (or one created via sheet.new)
  const handleConnectExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setAuthError('กรุณาลงชื่อเข้าใช้บัญชี Google ก่อน เพื่ออนุญาตให้ระบบเข้าถึงและเขียนข้อมูลลงในไฟล์');
      return;
    }
    if (!existingSheetInput.trim()) {
      setAuthError('กรุณาระบุ Google Sheet URL หรือ Spreadsheet ID');
      return;
    }

    setIsConnectingExisting(true);
    setAuthError(null);
    setSheetSuccessMessage(null);

    try {
      const result = await initializeExistingSpreadsheet(
        accessToken,
        existingSheetInput.trim(),
        submissions
      );
      setConnectedSheetUrl(result.spreadsheetUrl);
      if (onSpreadsheetConnected) {
        onSpreadsheetConnected(result.spreadsheetId, result.spreadsheetUrl);
      }
      setSheetSuccessMessage(
        `เชื่อมต่อ Google Sheet สำเร็จ! พร้อมจัดรูปแบบหัวตารางและซิงก์ข้อมูล ${submissions.length} รายการเรียบร้อยแล้ว`
      );
    } catch (err: any) {
      console.error('Connect existing error:', err);
      setAuthError(err.message || 'ไม่สามารถเชื่อมต่อ Google Sheet นี้ได้');
    } finally {
      setIsConnectingExisting(false);
    }
  };

  const isScopeError = authError && authError.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT');
  const isUnauthorizedDomain =
    authError && (authError.includes('unauthorized-domain') || authError.includes('auth/unauthorized-domain'));

  const handleCopyHostname = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedHostname(true);
      setTimeout(() => setCopiedHostname(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                ตั้งค่าเชื่อมต่อ Google Sheets & Apps Script
              </h3>
              <p className="text-xs text-slate-300">
                ซิงก์ผลการเลือกคณะอนุกรรมการแบบเรียลไทม์ลงใน Google Spreadsheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('appscript')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'appscript'
                ? 'border-[#005F56] text-[#005F56]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>วิธีที่ 1: Google Apps Script (แนะนำสูงสุด)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directSheet')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'directSheet'
                ? 'border-[#005F56] text-[#005F56]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>วิธีที่ 2: Google Sheets API / OAuth</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* TAB 1: Google Apps Script Web App */}
          {activeTab === 'appscript' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-emerald-900">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs sm:text-sm">ทำไมวิธีนี้ถึงเป็นวิธีที่ดีที่สุด?</p>
                    <p className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed">
                      Google Apps Script Web App ทำหน้าที่เป็น API ตรง ไม่ต้องขอสิทธิ์ Scope ในเครื่องผู้ใช้
                      โทเค็นไม่หมดอายุ และกรรมการทั้ง 20 ท่านสามารถส่งคำตอบได้ทันทีโดยไม่ต้องล็อกอินบัญชี Google
                    </p>
                  </div>
                </div>
              </div>

              {sheetConfig.isConfigured ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <p className="font-bold text-slate-900">กำลังเชื่อมต่อกับ Google Apps Script</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                        {sheetConfig.appScriptUrl}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="px-3 py-1.5 rounded-lg bg-[#005F56] hover:bg-[#004d46] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ทันที'}</span>
                  </button>
                </div>
              ) : null}

              {/* Step by step */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 text-xs">
                  ขั้นตอนการติดตั้ง (ทำเพียงครั้งเดียว ประมาณ 1 นาที):
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-xs pl-1 leading-relaxed">
                  <li>
                    เปิด Google Sheet ของท่าน (หรือกด{' '}
                    <a
                      href="https://sheet.new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#005F56] font-bold underline inline-flex items-center gap-0.5"
                    >
                      sheet.new <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    เพื่อสร้างชีตใหม่)
                  </li>
                  <li>
                    ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong>
                  </li>
                  <li>
                    กดปุ่ม <strong>"คัดลอกโค้ด Apps Script"</strong> ด้านล่าง แล้ววางแทนที่โค้ดเดิมทั้งหมดในหน้าต่างสคริปต์
                  </li>
                  <li>
                    กดบันทึก (Save) แล้วคลิกปุ่ม <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong>
                  </li>
                  <li>
                    เลือกประเภท: <strong>เว็บแอป (Web app)</strong> และตั้งค่า <strong>ผู้มีสิทธิ์เข้าถึง (Who has access)</strong>: เป็น <strong>ทุกคน (Anyone)</strong>
                  </li>
                  <li>
                    กด <strong>Deploy</strong> แล้วคัดลอก <strong>Web App URL</strong> นำมาวางในช่องด้านล่าง แล้วกด <strong>บันทึก</strong>
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div className="bg-slate-900 rounded-xl p-3.5 text-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-emerald-400">
                    AppsScript.gs (สร้างหัวตารางและรับข้อมูลอัตโนมัติ)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>คัดลอกเรียบร้อย</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกโค้ด</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono overflow-x-auto text-slate-400 max-h-32 bg-slate-950 p-2.5 rounded-lg">
                  {APPS_SCRIPT_TEMPLATE.slice(0, 480)}...
                </pre>
              </div>

              {/* Form URL */}
              <form onSubmit={handleSaveAppScript} className="space-y-3 pt-2 border-t border-slate-200">
                <label
                  htmlFor="appScriptUrlInput"
                  className="block font-bold text-slate-900 text-xs"
                >
                  วาง Web App URL ของ Google Apps Script ที่นี่:
                </label>
                <div className="flex gap-2">
                  <input
                    id="appScriptUrlInput"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#005F56] hover:bg-[#004d46] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึก</span>
                  </button>
                </div>

                {savedSuccess && (
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    บันทึกและจดจำลิงก์เรียบร้อยแล้ว! ระบบจะจดจำในระบบและซิงก์ข้อมูลทันที
                  </p>
                )}

                {(sheetConfig.appScriptUrl || urlInput.trim()) && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>จดจำลิงก์ Google Apps Script แล้ว (พร้อมใช้ในโหมดไม่ระบุตัวตน)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005F56] hover:bg-[#004d46] text-white font-bold text-xs transition-all shadow-2xs shrink-0 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{copiedShareLink ? 'คัดลอกลิงก์สำเร็จแล้ว!' : 'คัดลอกลิงก์แชร์ให้กรรมการ'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      ลิงก์แชร์นี้จะฝังการเชื่อมต่อ Google Sheets ไปด้วยโดยอัตโนมัติ ทำให้กรรมการท่านอื่นที่เปิดผ่าน <strong>โหมดไม่ระบุตัวตน (Incognito)</strong> หรือเปิดบนโทรศัพท์มือถือ/คอมพิวเตอร์เครื่องอื่น สามารถแสดงข้อมูลคณะกรรมการและผลการเลือกได้ทันทีโดยไม่ต้องตั้งค่าใหม่
                    </p>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: Direct Google Sheets API / OAuth */}
          {activeTab === 'directSheet' && (
            <div className="space-y-5">
              {/* Account Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      บัญชี Google ที่เชื่อมต่อ
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                      ใช้สำหรับการเข้าถึงและจัดการสเปรดชีตผ่าน Google Sheets API
                    </p>
                  </div>

                  {currentUser ? (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                          {currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium">เข้าสู่ระบบแล้ว</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs flex items-center gap-1 transition-colors"
                        title="ออกจากระบบ"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isSigningIn}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-2 shadow-2xs transition-colors self-start sm:self-auto"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      <span>{isSigningIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ด้วย Google'}</span>
                    </button>
                  )}
                </div>

                {/* Scope Error Box with Clear Fix Guidance */}
                {isScopeError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">
                          สาเหตุข้อผิดพลาด: สิทธิ์ของโทเค็นไม่ครอบคลุมการสร้างไฟล์ใน Google Drive
                        </p>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          เนื่องจาก Google บัญชีเดิมยังไม่ได้ยินยอมสิทธิ์ (Scope) การจัดการไฟล์ใน Drive
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200 text-xs">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleGoogleLogout();
                          await handleGoogleLogin();
                        }}
                        className="px-3 py-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors"
                      >
                        กดออกจากระบบ แล้วเข้าใหม่เพื่อยืนยันสิทธิ์
                      </button>
                      <span className="text-rose-600 text-[11px]">หรือใช้วิธีวางลิงก์ Google Sheet ด้านล่าง (แนะนำ)</span>
                    </div>
                  </div>
                )}

                {isUnauthorizedDomain && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (auth/unauthorized-domain)</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      เนื่องจากคุณเปิดเว็บผ่านโดเมน <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900 font-semibold">{typeof window !== 'undefined' ? window.location.hostname : ''}</code> ซึ่งเป็นโดเมนภายนอก Firebase จึงบล็อกเพื่อความปลอดภัย
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-200/80 hover:bg-amber-200 text-amber-900 font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedHostname ? 'คัดลอกชื่อโดเมนแล้ว!' : 'คัดลอกชื่อโดเมน'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('appscript')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#005F56] hover:bg-[#004d46] text-white font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>หรือใช้วิธี Google Apps Script (ไม่ต้องตั้งค่าโดเมน)</span>
                      </button>
                    </div>
                  </div>
                )}

                {authError && !isScopeError && !isUnauthorizedDomain && (
                  <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {authError}
                  </p>
                )}

                {sheetSuccessMessage && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sheetSuccessMessage}</span>
                  </p>
                )}
              </div>

              {/* Sub-section A: Connect Existing Sheet (The best & fastest workaround for 403) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-[#005F56]" />
                    <span>ระบุ Google Sheet URL หรือ ID ที่มีอยู่แล้ว (แนะนำและทำได้ทันที)</span>
                  </h4>
                  <a
                    href="https://sheet.new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005F56] hover:underline"
                  >
                    <span>คลิกเพื่อสร้างชีตใหม่ที่ sheet.new</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-600">
                  เปิด Google Sheet ใหม่หรือใช้ไฟล์เดิมที่มีอยู่ จากนั้นคัดลอกลิงก์หรือรหัส Spreadsheet ID มาวาง แล้วกดเชื่อมต่อ
                  ระบบจะใส่หัวตารางและซิงก์ข้อมูลให้ทันที
                </p>

                <form onSubmit={handleConnectExistingSheet} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={existingSheetInput}
                      onChange={(e) => setExistingSheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit หรือ Spreadsheet ID"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
                    />
                    <button
                      type="submit"
                      disabled={isConnectingExisting || !currentUser}
                      className="px-4 py-2.5 rounded-xl bg-[#005F56] hover:bg-[#004d46] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isConnectingExisting ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ & บันทึก'}</span>
                    </button>
                  </div>

                  {!currentUser && (
                    <p className="text-[11px] text-amber-700">
                      * กรุณากดลงชื่อเข้าใช้ด้วย Google ด้านบนก่อน เพื่อให้ระบบมีสิทธิ์เขียนข้อมูลลงใน Sheet ของท่าน
                    </p>
                  )}
                </form>

                {connectedSheetUrl && (
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                      เชื่อมต่อกับ Google Sheet แล้ว
                    </span>
                    <a
                      href={connectedSheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#005F56] font-bold underline inline-flex items-center gap-1"
                    >
                      <span>เปิด Google Sheet ที่เชื่อมต่อ</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Sub-section B: Automatic Creation Button */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">
                      สร้างไฟล์ Google Sheet ใหม่อัตโนมัติใน Google Drive
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      ระบบจะส่งคำสั่งสร้างไฟล์ชื่อ "ผลการเลือกคณะอนุกรรมการ - มหาวิทยาลัยศิลปากร" ลงใน Drive ของท่านโดยตรง
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateSheetWithAPI}
                    disabled={isCreatingSheet || !currentUser}
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isCreatingSheet ? 'กำลังสร้าง...' : 'สร้างไฟล์อัตโนมัติ'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
