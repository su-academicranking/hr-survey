import React, { useState, useEffect } from 'react';
import { SubCommittee, SurveySubmission } from '../types';
import { X, Edit3, CheckCircle2, AlertCircle, Save, Check } from 'lucide-react';

interface AdminEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SurveySubmission | null;
  subCommittees: SubCommittee[];
  onSave: (updated: {
    memberId: number;
    subCommitteeId: number;
    subCommitteeName: string;
    memberName: string;
    memberRole: string;
  }) => Promise<boolean>;
}

export const AdminEditModal: React.FC<AdminEditModalProps> = ({
  isOpen,
  onClose,
  submission,
  subCommittees,
  onSave,
}) => {
  const [selectedSubCommitteeId, setSelectedSubCommitteeId] = useState<number>(1);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (submission) {
      setSelectedSubCommitteeId(submission.subCommitteeId);
      setMemberName(submission.memberName);
      setMemberRole(submission.memberRole);
      setErrorMsg(null);
    }
  }, [submission]);

  if (!isOpen || !submission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      setErrorMsg('กรุณาระบุชื่อ-นามสกุลผู้เลือก');
      return;
    }

    const selectedSub = subCommittees.find((s) => s.id === selectedSubCommitteeId);
    if (!selectedSub) {
      setErrorMsg('กรุณาเลือกคณะอนุกรรมการ');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const ok = await onSave({
        memberId: submission.memberId,
        subCommitteeId: selectedSub.id,
        subCommitteeName: selectedSub.title,
        memberName: memberName.trim(),
        memberRole: memberRole.trim(),
      });
      if (ok) {
        onClose();
      } else {
        setErrorMsg('ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                แก้ไขรายการที่เลือก (โหมดผู้ดูแลระบบ)
              </h3>
              <p className="text-xs text-slate-300">
                ลำดับที่ {submission.memberId}: {submission.memberRole}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              ชื่อ-นามสกุล ของกรรมการ/ผู้แทน:
            </label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
              required
            />
          </div>

          {/* Member Role */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              ตำแหน่งกรรมการ (ตามคำสั่งมหาวิทยาลัย):
            </label>
            <input
              type="text"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56]"
              required
            />
          </div>

          {/* Select Sub-committee */}
          <div className="space-y-2 pt-2">
            <label className="block font-bold text-slate-800">
              เลือกคณะอนุกรรมการชุดใหม่:
            </label>
            <div className="space-y-2">
              {subCommittees.map((sub) => {
                const isSelected = selectedSubCommitteeId === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubCommitteeId(sub.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#005F56] bg-emerald-50/50 shadow-xs ring-1 ring-[#005F56]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                        isSelected
                          ? 'border-[#005F56] bg-[#005F56] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sub.accentColor.badgeBg} ${sub.accentColor.badgeText}`}
                        >
                          {sub.badgeLabel}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 text-xs leading-snug">
                        {sub.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#005F56] hover:bg-[#004d46] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
