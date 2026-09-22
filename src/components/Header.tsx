import React from 'react';
import { SILPAKORN_LOGO_URL } from '../data/committeeData';
import { SheetConfig } from '../types';
import { RefreshCw, FileSpreadsheet, BarChart3, CheckSquare, Lock } from 'lucide-react';

interface HeaderProps {
  activeTab: 'survey' | 'summary';
  setActiveTab: (tab: 'survey' | 'summary') => void;
  totalSubmissions: number;
  totalMembers: number;
  sheetConfig: SheetConfig;
  onOpenSheetModal: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isAdmin: boolean;
  onOpenAdminModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalSubmissions,
  totalMembers,
  sheetConfig,
  onOpenSheetModal,
  onRefreshData,
  isRefreshing,
  isAdmin,
  onOpenAdminModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & University Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-full bg-slate-100 flex items-center justify-center p-1 border border-slate-200 shrink-0">
              <img
                src={SILPAKORN_LOGO_URL}
                alt="ตราสัญลักษณ์ มหาวิทยาลัยศิลปากร"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium mb-0.5">
                <span>Silpakorn University</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                แบบสำรวจการเลือกคณะอนุกรรมการ
              </h1>
              <p className="text-xs text-slate-600">
                คณะกรรมการขับเคลื่อนการพัฒนาทรัพยากรบุคคล
              </p>
            </div>
          </div>

          {/* Right actions: Stats & Sheet link (Admin tools) */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-600 font-medium">บันทึกแล้ว:</span>
              <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                {totalSubmissions} / {totalMembers} ท่าน
              </span>
            </div>

            {/* Admin-only action buttons: Shown strictly in Admin Mode */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenSheetModal}
                  title="ตั้งค่า Google Sheet / Apps Script (เฉพาะผู้ดูแลระบบ)"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    sheetConfig.isConfigured
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="hidden xs:inline">
                    {sheetConfig.isConfigured ? 'ตั้งค่า Sheet' : 'เชื่อมต่อ Sheet'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 leading-none">
                    Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onRefreshData}
                  disabled={isRefreshing}
                  title="รีเฟรชข้อมูลล่าสุด (เฉพาะผู้ดูแลระบบ)"
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher - Large touch targets */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('survey')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'survey'
                ? 'bg-[#005F56] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>แบบสำรวจเลือกชุด</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-[#005F56] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>สรุปผลรวมและรายชื่อ ({totalSubmissions})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
