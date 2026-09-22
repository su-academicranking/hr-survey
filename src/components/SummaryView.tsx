import React, { useState, useMemo } from 'react';
import { CommitteeMember, SubCommittee, SurveySubmission } from '../types';
import { formatThaiDateTime, formatThaiTime } from '../utils/dateUtils';
import {
  Users,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  Edit3,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SummaryViewProps {
  committeeMembers: CommitteeMember[];
  subCommittees: SubCommittee[];
  submissions: SurveySubmission[];
  onOpenSheetModal: () => void;
  isSheetConfigured: boolean;
  isAdmin?: boolean;
  onEditSubmission?: (submission: SurveySubmission) => void;
  onDeleteSubmission?: (memberId: number) => Promise<boolean>;
  onClearAllSubmissions?: () => Promise<boolean>;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  committeeMembers,
  subCommittees,
  submissions,
  onOpenSheetModal,
  isSheetConfigured,
  isAdmin = false,
  onEditSubmission,
  onDeleteSubmission,
  onClearAllSubmissions,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unselected'>('all');
  const [deletingSubmission, setDeletingSubmission] = useState<SurveySubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [expandedCommitteeId, setExpandedCommitteeId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleExpandCommittee = (id: number) => {
    setExpandedCommitteeId((prev) => (prev === id ? null : id));
  };

  const totalMembers = committeeMembers.length;
  const totalSubmissions = submissions.length;
  // Find members who have not selected yet
  const unselectedMembers = useMemo(() => {
    return committeeMembers.filter(
      (member) => !submissions.some((s) => s.memberId === member.id)
    );
  }, [committeeMembers, submissions]);

  const remainingCount = unselectedMembers.length;

  // Copy plain text summary to clipboard
  const handleCopySummary = () => {
    let text = `สรุปผลการเลือกคณะอนุกรรมการ มหาวิทยาลัยศิลปากร\n`;
    text += `คณะกรรมการขับเคลื่อนการพัฒนาทรัพยากรบุคคล\n`;
    text += `จำนวนผู้เลือกแล้ว: ${totalSubmissions} / ${totalMembers} ท่าน (${Math.round(
      (totalSubmissions / totalMembers) * 100
    )}%)\n\n`;

    subCommittees.forEach((comm) => {
      const members = submissions.filter((s) => s.subCommitteeId === comm.id);
      const remaining = Math.max(0, comm.targetCapacity - members.length);
      text += `[ชุดที่ ${comm.number}] ${comm.title}\n`;
      text += `  • จำนวนผู้เลือก: ${members.length} ท่าน (เป้าหมาย ~${comm.targetCapacity} ท่าน | คงเหลือ ${remaining} ที่นั่ง)\n`;
      if (members.length === 0) {
        text += `  - ยังไม่มีผู้เลือก\n`;
      } else {
        members.forEach((m, idx) => {
          text += `  ${idx + 1}. ${m.memberName} (${m.memberRole})\n`;
        });
      }
      text += `\n`;
    });

    if (unselectedMembers.length > 0) {
      text += `[กรรมการที่ยังไม่ได้เลือก: ${unselectedMembers.length} ท่าน]\n`;
      unselectedMembers.forEach((m, idx) => {
        text += `  ${idx + 1}. ${m.role}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ลำดับ',
      'ตำแหน่งกรรมการ (ตามคำสั่ง)',
      'ชื่อ-นามสกุล',
      'ชุดคณะอนุกรรมการ',
      'ชื่อคณะอนุกรรมการ',
      'วันเวลาที่บันทึก',
    ];

    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.memberRole.replace(/"/g, '""')}"`,
      `"${s.memberName.replace(/"/g, '""')}"`,
      `"ชุดที่ ${s.subCommitteeId}"`,
      `"${s.subCommitteeName.replace(/"/g, '""')}"`,
      `"${formatThaiDateTime(s.submittedAt)}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ผลการเลือกคณะอนุกรรมการ_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Admin Mode Banner */}
      {isAdmin && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#005F56] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-emerald-950">
                โหมดผู้ดูแลระบบ (Admin Mode) เปิดใช้งานอยู่
              </p>
              <p className="text-[11px] sm:text-xs text-emerald-800">
                ท่านสามารถคลิกปุ่ม <span className="font-bold underline">"แก้ไข"</span> ในตารางด้านล่างเพื่อเปลี่ยนคณะอนุกรรมการ หรือคลิก <span className="font-bold underline">"ลบ"</span> เพื่อรีเซ็ตรายการให้กรรมการเลือกใหม่
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {totalSubmissions > 0 && onClearAllSubmissions && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างข้อมูลทั้งหมด ({totalSubmissions})</span>
              </button>
            )}
            <span className="px-2.5 py-1 rounded-md bg-emerald-200/70 text-emerald-900 font-bold text-xs border border-emerald-300">
              สิทธิ์แก้ไขผลการเลือก
            </span>
          </div>
        </div>
      )}

      {/* Top Stat Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">กรรมการทั้งหมด</p>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {totalMembers} <span className="text-xs font-normal text-slate-500">ท่าน</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-700 font-medium">เลือกแล้ว</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {totalSubmissions}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({Math.round((totalSubmissions / totalMembers) * 100)}%)
            </span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-700 font-medium">ยังไม่เลือก</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {remainingCount} <span className="text-xs font-normal text-slate-500">ท่าน</span>
          </p>
        </div>
      </div>

      {/* Real-time Sub-Committee Capacity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {subCommittees.map((committee) => {
          const membersInCommittee = submissions.filter(
            (s) => s.subCommitteeId === committee.id
          );
          const count = membersInCommittee.length;
          const target = committee.targetCapacity;
          const isExpanded = expandedCommitteeId === committee.id;
          const isFullOrHigh = count >= target;

          return (
            <div
              key={committee.id}
              className="rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all duration-150 flex flex-col justify-between bg-white"
            >
              <div className="p-4">
                {/* Header Badge & Number */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${committee.accentColor.badgeBg} ${committee.accentColor.badgeText}`}
                  >
                    ชุดที่ {committee.number}
                  </span>

                  <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900">
                      {count}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1">
                      / {target} ท่าน
                    </span>
                  </div>
                </div>

                {/* Sub-committee Title */}
                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-3 min-h-[44px]">
                  {committee.title}
                </h3>

                {/* Capacity & Balance Progress */}
                <div className="pt-2 border-t border-slate-100">
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFullOrHigh ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (count / target) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Members list preview */}
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleExpandCommittee(committee.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>รายชื่อผู้เลือกชุดนี้</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                        {count}
                      </span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {membersInCommittee.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1 text-center bg-slate-50 rounded">
                          ยังไม่มีผู้เลือกชุดนี้
                        </p>
                      ) : (
                        membersInCommittee.map((sub, idx) => (
                          <div
                            key={sub.id}
                            className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-150 flex flex-col gap-0.5"
                          >
                            <div className="font-semibold text-slate-900 flex items-center justify-between">
                              <span>
                                {idx + 1}. {sub.memberName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {formatThaiTime(sub.submittedAt)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              {sub.memberRole}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar & Member List Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#005F56] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            รายนามทั้ง 3 คณะอนุกรรมการ ({totalSubmissions})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unselected')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'unselected'
                ? 'bg-[#005F56] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ยังไม่ได้เลือก ({remainingCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>คัดลอกข้อความสรุป</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด CSV</span>
          </button>
        </div>
      </div>

      {/* View 1: 3 Sub-committees Summary Cards with Member Tables */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {subCommittees.map((committee, idx) => {
              const members = submissions.filter(
                (s) => s.subCommitteeId === committee.id
              );
              const count = members.length;
              const target = committee.targetCapacity;
              const remaining = Math.max(0, target - count);

              return (
                <div
                  key={committee.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                >
                  {/* Committee Card Header */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold ${committee.accentColor.badgeBg} ${committee.accentColor.badgeText}`}
                        >
                          ชุดที่ {committee.number}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {committee.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                      <div className="text-right">
                        <span className="text-xl sm:text-2xl font-black text-slate-900">
                          {count}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">/ {target} ท่าน</span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                          count >= target
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {remaining === 0 ? 'เต็ม' : `ว่าง ${remaining} ที่นั่ง`}
                      </span>
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="p-4 sm:p-5">
                    {members.length === 0 ? (
                      <p className="text-xs sm:text-sm text-slate-400 italic text-center py-6">
                        ยังไม่มีกรรมการท่านใดเลือกชุดนี้
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                              <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                              <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                              <th className="py-2.5 px-3">ตำแหน่งกรรมการตามคำสั่ง</th>
                              <th className="py-2.5 px-3 text-right">วันเวลาที่เลือก</th>
                              {isAdmin && (
                                <th className="py-2.5 px-3 text-center w-36">
                                  จัดการ (Admin)
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-normal">
                            {members.map((sub, itemIdx) => (
                              <tr
                                key={sub.id}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="py-3 px-3 text-center text-slate-500 font-medium">
                                  {itemIdx + 1}
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-900">
                                  {sub.memberName}
                                </td>
                                <td className="py-3 px-3 text-slate-700">
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs">
                                    {sub.memberRole}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/80 border border-slate-200/60 text-slate-700 text-xs font-medium">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{formatThaiDateTime(sub.submittedAt)}</span>
                                  </span>
                                </td>
                                {isAdmin && (
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (onEditSubmission) {
                                            onEditSubmission(sub);
                                          }
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#005F56] border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                        title="แก้ไขการเลือกนี้"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>แก้ไข</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDeletingSubmission(sub);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                        title="ลบรายการเพื่อเปิดให้เลือกใหม่"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>ลบ</span>
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Unselected Committee Members */}
      {activeTab === 'unselected' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                รายชื่อกรรมการที่ยังไม่ได้เลือกคณะอนุกรรมการ ({unselectedMembers.length} ท่าน)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                รายนามตามคำสั่งคณะกรรมการขับเคลื่อนการพัฒนาทรัพยากรบุคคล
              </p>
            </div>
          </div>

          {unselectedMembers.length === 0 ? (
            <div className="py-10 text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
              <p className="font-bold text-base">
                กรรมการทุกท่านได้เลือกคณะอนุกรรมการครบถ้วนแล้ว (20/20 ท่าน)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {unselectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 text-xs sm:text-sm"
                >
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    {member.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 leading-tight">
                      {member.role}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                      ยังไม่ได้บันทึกการเลือก
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* In-App Delete Confirmation Modal (solves window.confirm iframe restriction) */}
      {deletingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">ยืนยันการลบผลการเลือก</h4>
                <p className="text-xs text-slate-500">ลำดับที่ {deletingSubmission.memberId}: {deletingSubmission.memberRole}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs sm:text-sm space-y-1.5">
              <div>
                <span className="text-slate-500">ชื่อกรรมการ: </span>
                <strong className="text-slate-900 font-bold">{deletingSubmission.memberName}</strong>
              </div>
              <div>
                <span className="text-slate-500">คณะอนุกรรมการปัจจุบัน: </span>
                <span className="text-[#005F56] font-semibold">{deletingSubmission.subCommitteeName}</span>
              </div>
              <div className="pt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>เมื่อยืนยันลบ กรรมการท่านนี้จะสามารถเข้ามากรอกเลือกใหม่ได้ทันที</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  const target = deletingSubmission;
                  setIsDeleting(true);
                  try {
                    if (onDeleteSubmission) {
                      await onDeleteSubmission(target.memberId);
                    }
                    setToastMessage(`ลบผลการเลือกของ "${target.memberName}" สำเร็จแล้ว`);
                    setTimeout(() => setToastMessage(null), 3500);
                  } finally {
                    setIsDeleting(false);
                    setDeletingSubmission(null);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Confirm Clear All Submissions Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการล้างข้อมูลการเลือกทั้งหมด?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ข้อมูลการเลือกทั้งหมด ({totalSubmissions} รายการ) จะถูกรีเซ็ตเป็น 0 เพื่อเริ่มระบบใหม่
                </p>
              </div>
            </div>

            <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">ผลกระทบจากการดำเนินการ:</p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-800 text-[11px]">
                <li>รายชื่อที่เลือกแล้วทั้งหมดจะถูกล้างออกจากระบบ</li>
                <li>จำนวนผู้เลือกจะกลับเป็น 0 ท่าน (ว่าง 20 ท่าน)</li>
                <li>กรรมการทุกท่านสามารถเข้ามากรอกเลือกใหม่ได้</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={async () => {
                  setIsClearingAll(true);
                  try {
                    if (onClearAllSubmissions) {
                      await onClearAllSubmissions();
                    }
                    setToastMessage('ล้างข้อมูลการเลือกทั้งหมดเรียบร้อยแล้ว');
                    setTimeout(() => setToastMessage(null), 3500);
                  } finally {
                    setIsClearingAll(false);
                    setIsClearAllModalOpen(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingAll ? 'กำลังล้าง...' : 'ยืนยันล้างข้อมูลทั้งหมด'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm animate-in slide-in-from-bottom-3 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
