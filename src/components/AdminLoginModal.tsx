import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Key,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Save,
  RefreshCw,
  LogOut,
  Settings,
} from 'lucide-react';
import { SheetConfig } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  adminEmail: string;
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  onLogout: () => void;
  onUpdateAdminPassword: (
    newEmail: string,
    newPass: string
  ) => Promise<{ success: boolean; message: string; sheetSynced: boolean }>;
  sheetConfig: SheetConfig;
  onOpenSheetModal?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  adminEmail,
  onLogin,
  onLogout,
  onUpdateAdminPassword,
  sheetConfig,
  onOpenSheetModal,
}) => {
  const [emailInput, setEmailInput] = useState('admin@silpakorn.edu');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Settings sub-view for updating password & syncing to Google Sheet
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [newEmail, setNewEmail] = useState(adminEmail || 'admin@silpakorn.edu');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!emailInput.trim()) {
      setErrorMsg('กรุณาระบุอีเมลผู้ดูแลระบบ');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMsg('กรุณาระบุรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onLogin(emailInput.trim(), passwordInput.trim());
      if (res.success) {
        setSuccessMsg('เข้าสู่ระบบผู้ดูแลระบบสำเร็จ');
        setTimeout(() => {
          onClose();
          setPasswordInput('');
          setSuccessMsg(null);
        }, 900);
      } else {
        setErrorMsg(res.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: admin1234)');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePasswordToSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newEmail.trim()) {
      setErrorMsg('กรุณาระบุอีเมลผู้ดูแลระบบ');
      return;
    }
    if (!newPassword.trim()) {
      setErrorMsg('กรุณาระบุรหัสผ่านใหม่');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await onUpdateAdminPassword(newEmail.trim(), newPassword.trim());
      if (result.success) {
        setSuccessMsg(
          result.sheetSynced
            ? 'บันทึกรหัสผ่านใหม่และซิงก์ลง Google Sheet เรียบร้อยแล้ว!'
            : 'บันทึกรหัสผ่านใหม่ในระบบเรียบร้อยแล้ว (จะซิงก์ลง Sheet ทันทีเมื่อเชื่อมต่อ)'
        );
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(result.message || 'เกิดข้อผิดพลาดในการบันทึกรหัสผ่าน');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกรหัสผ่าน');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#005F56] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#005F56]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#005F56]">
              {isAdmin ? 'จัดการผู้ดูแลระบบ (Admin)' : 'เข้าสู่ระบบผู้ดูแลระบบ (Admin)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* If already logged in as Admin */}
          {isAdmin ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>สถานะ: ผู้ดูแลระบบ</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5 truncate max-w-[200px]">
                    {adminEmail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-white text-emerald-900 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>

              {/* Quick Sheet Config Button for Admin */}
              {onOpenSheetModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSheetModal();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>ตั้งค่าการเชื่อมต่อ Google Sheet / Apps Script</span>
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${sheetConfig.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {sheetConfig.isConfigured ? 'เชื่อมต่อแล้ว' : 'ตั้งค่า'} &rarr;
                  </span>
                </button>
              )}

              {/* Password update on Google Sheet toggle */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordSettings(!showPasswordSettings)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#005F56]" />
                    <span>เปลี่ยนรหัสผ่าน & บันทึกลง Google Sheet</span>
                  </span>
                  <span className="text-slate-400">{showPasswordSettings ? '▲ ปิด' : '▼ เปิด'}</span>
                </button>

                {showPasswordSettings && (
                  <form onSubmit={handleSavePasswordToSheet} className="mt-3 space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>บันทึกรหัสผ่านใหม่ลง Google Sheet</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ระบบจะบันทึกอีเมลและรหัสผ่านใหม่ลงในแท็บ "การตั้งค่าผู้ดูแลระบบ" บน Google Sheet ของท่านอัตโนมัติ
                    </p>

                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700 text-xs">
                        อีเมลผู้ดูแลระบบ
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700 text-xs">
                        รหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="อย่างน้อย 4 ตัวอักษร"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700 text-xs">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
                        required
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingPassword}
                        className="px-4 py-2 rounded-xl bg-[#005F56] hover:bg-[#004d46] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingPassword ? 'กำลังบันทึกลง Sheet...' : 'บันทึกรหัสผ่านลง Google Sheet'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">สิทธิ์ของผู้ดูแลระบบ (Admin):</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>สามารถคลิกแก้ไขคณะอนุกรรมการหรือข้อมูลที่กรรมการเลือกแล้วได้</li>
                  <li>สามารถลบหรือรีเซ็ตรายการเพื่อให้กรรมการเลือกใหม่ได้</li>
                  <li>ข้อมูลที่แก้ไขจะถูกซิงก์ตรงกับ Google Sheet ทันที</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Login Form matching the user's uploaded image exactly */
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-800">
                  อีเมลผู้ดูแลระบบ (Admin Email)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ระบุอีเมลผู้ดูแลระบบ"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-800">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="ระบุรหัสผ่าน"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56] transition-all"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 pl-1">
                  * รหัสผ่านเริ่มต้น: <span className="font-mono text-slate-600">admin1234</span>
                </p>
              </div>

              {/* Bottom Actions matching screenshot */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-full sm:rounded-xl bg-[#005F56] hover:bg-[#004d46] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
