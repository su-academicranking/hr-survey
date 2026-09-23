import React, { useState, useEffect } from 'react';
import { CommitteeMember, SubCommittee, SurveySubmission } from '../types';
import { Check, AlertCircle, Send, UserCheck, ShieldCheck, X } from 'lucide-react';

interface SurveyFormProps {
  committeeMembers: CommitteeMember[];
  subCommittees: SubCommittee[];
  submissions: SurveySubmission[];
  onSubmit: (submission: {
    memberId: number;
    memberRole: string;
    memberName: string;
    subCommitteeId: number;
    subCommitteeName: string;
  }) => Promise<boolean>;
  isSubmitting: boolean;
}

export const SurveyForm: React.FC<SurveyFormProps> = ({
  committeeMembers,
  subCommittees,
  submissions,
  onSubmit,
  isSubmitting,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<number | 'other' | ''>('');
  const [customRole, setCustomRole] = useState('');
  const [memberName, setMemberName] = useState('');
  const [selectedSubCommitteeId, setSelectedSubCommitteeId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Filter out committee members who have already made a submission (ตัดส่วนที่เลือกแล้วออก)
  const availableMembers = committeeMembers.filter(
    (member) => !submissions.some((s) => s.memberId === member.id)
  );
  const isAllFilled = availableMembers.length === 0;

  // Selected committee object
  const selectedSubCommittee = subCommittees.find(
    (c) => c.id === selectedSubCommitteeId
  );

  // Resolved role string for selected member
  const pendingMemberRole =
    selectedMemberId === 'other'
      ? customRole.trim()
      : committeeMembers.find((m) => m.id === Number(selectedMemberId))?.role || '';

  // Check if all subcommittees are full
  const allSubCommitteesFull = subCommittees.every((c) => {
    const count = submissions.filter((s) => s.subCommitteeId === c.id).length;
    return count >= c.targetCapacity;
  });

  // Automatically deselect if the currently selected committee becomes full
  useEffect(() => {
    if (selectedSubCommitteeId) {
      const selectedComm = subCommittees.find((c) => c.id === selectedSubCommitteeId);
      if (selectedComm) {
        const count = submissions.filter((s) => s.subCommitteeId === selectedComm.id).length;
        if (count >= selectedComm.targetCapacity) {
          setSelectedSubCommitteeId(null);
          setIsConfirmDialogOpen(false);
        }
      }
    }
  }, [submissions, selectedSubCommitteeId, subCommittees]);

  // Handle ESC key to close confirmation dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConfirmDialogOpen && !isSubmitting) {
        setIsConfirmDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfirmDialogOpen, isSubmitting]);

  // Validation before opening confirmation dialog
  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedMemberId) {
      setErrorMessage('กรุณาเลือกตำแหน่งกรรมการ');
      return;
    }

    if (selectedMemberId === 'other' && !customRole.trim()) {
      setErrorMessage('กรุณาระบุตำแหน่งกรรมการ');
      return;
    }

    if (!memberName.trim()) {
      setErrorMessage('กรุณาระบุชื่อ-นามสกุล ของกรรมการ');
      return;
    }

    if (!selectedSubCommitteeId) {
      setErrorMessage('กรุณาเลือกคณะอนุกรรมการ 1 ชุดที่ต้องการสังกัด');
      return;
    }

    if (selectedMemberId === 'other') {
      const existingOther = submissions.find(
        (s) =>
          s.memberName.trim().toLowerCase() === memberName.trim().toLowerCase() &&
          s.memberId > 20
      );
      if (existingOther) {
        setErrorMessage('ชื่อกรรมการท่านนี้ได้ทำการเลือกคณะอนุกรรมการไปแล้ว (เลือกได้ตำแหน่งละ 1 ชุดเท่านั้น)');
        return;
      }
    } else {
      const member = committeeMembers.find((m) => m.id === Number(selectedMemberId));
      if (!member) {
        setErrorMessage('ข้อมูลกรรมการไม่ถูกต้อง');
        return;
      }
      const alreadyTaken = submissions.some((s) => s.memberId === member.id);
      if (alreadyTaken) {
        setErrorMessage('ตำแหน่งนี้ได้ทำการเลือกคณะอนุกรรมการไปแล้ว (สามารถเลือกได้เพียงตำแหน่งละ 1 ชุดเท่านั้น)');
        return;
      }
    }

    const subCommittee = subCommittees.find((c) => c.id === selectedSubCommitteeId);
    if (!subCommittee) {
      setErrorMessage('ข้อมูลคณะอนุกรรมการไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const currentCount = submissions.filter((s) => s.subCommitteeId === subCommittee.id).length;
    if (currentCount >= subCommittee.targetCapacity) {
      setErrorMessage(
        `คณะอนุกรรมการชุดที่ ${subCommittee.number} (${subCommittee.title}) ครบตามจำนวนโควต้าแล้ว (${subCommittee.targetCapacity} ท่าน) กรุณาเลือกคณะอนุกรรมการชุดอื่น`
      );
      setSelectedSubCommitteeId(null);
      return;
    }

    // All validation passed -> Open confirmation dialog
    setIsConfirmDialogOpen(true);
  };

  // User confirms submission inside dialog
  const handleConfirmSubmit = async () => {
    if (!selectedSubCommitteeId) return;

    let memberIdToSubmit: number;
    let memberRoleToSubmit: string;

    if (selectedMemberId === 'other') {
      const currentMax = submissions.reduce((max, s) => Math.max(max, s.memberId), 20);
      memberIdToSubmit = currentMax + 1;
      memberRoleToSubmit = customRole.trim();
    } else {
      const member = committeeMembers.find((m) => m.id === Number(selectedMemberId));
      if (!member) {
        setErrorMessage('ข้อมูลกรรมการไม่ถูกต้อง');
        setIsConfirmDialogOpen(false);
        return;
      }
      memberIdToSubmit = member.id;
      memberRoleToSubmit = member.role;
    }

    const subCommittee = subCommittees.find((c) => c.id === selectedSubCommitteeId);
    if (!subCommittee) {
      setErrorMessage('ข้อมูลคณะอนุกรรมการไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setIsConfirmDialogOpen(false);
      return;
    }

    const success = await onSubmit({
      memberId: memberIdToSubmit,
      memberRole: memberRoleToSubmit,
      memberName: memberName.trim(),
      subCommitteeId: subCommittee.id,
      subCommitteeName: subCommittee.title,
    });

    if (success) {
      setIsConfirmDialogOpen(false);
      setSuccessMessage(
        `บันทึกข้อมูลสำเร็จ: ท่านได้เลือก "${subCommittee.badgeLabel}" เรียบร้อยแล้ว`
      );
      // Reset form fields
      setSelectedMemberId('');
      setMemberName('');
      setCustomRole('');
      setSelectedSubCommitteeId(null);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 6000);
    } else {
      setIsConfirmDialogOpen(false);
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Form Header */}
      <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>แบบฟอร์มการเลือกคณะอนุกรรมการ</span>
        </h2>
      </div>

      <form onSubmit={handleInitiateSubmit} className="p-5 sm:p-7 space-y-6">
        {/* Step 1: Member Identification */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
            <span className="w-6 h-6 rounded-full bg-[#005F56] text-white flex items-center justify-center text-xs font-bold shrink-0">
              1
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              ข้อมูลกรรมการ
            </h3>
          </div>

          {/* Member Role Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label
                htmlFor="memberRoleSelect"
                className="text-xs sm:text-sm font-semibold text-slate-800"
              >
                ตำแหน่งกรรมการตามคำสั่ง (20 ตำแหน่ง) <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                คงเหลือให้เลือก {availableMembers.length} จาก {committeeMembers.length} ตำแหน่ง
              </span>
            </div>

            <select
              id="memberRoleSelect"
              value={selectedMemberId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'other') {
                  setSelectedMemberId('other');
                } else if (val === '') {
                  setSelectedMemberId('');
                } else {
                  setSelectedMemberId(Number(val));
                }
              }}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56] transition-all cursor-pointer"
              required
            >
              <option value="">
                {isAllFilled
                  ? '-- ทุกตำแหน่งตามคำสั่งได้บันทึกครบถ้วนแล้ว --'
                  : '-- กรุณาเลือกตำแหน่งกรรมการของท่าน --'}
              </option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id}. {member.role}
                </option>
              ))}
              <option value="other">อื่นๆ (โปรดระบุ)</option>
            </select>

            {/* Custom Role Input when "อื่นๆ (โปรดระบุ)" is selected */}
            {selectedMemberId === 'other' && (
              <div className="mt-3 space-y-1.5">
                <label
                  htmlFor="customRoleInput"
                  className="block text-xs sm:text-sm font-semibold text-slate-800"
                >
                  ระบุตำแหน่งกรรมการ <span className="text-rose-600">*</span>
                </label>
                <input
                  id="customRoleInput"
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="พิมพ์ระบุตำแหน่งกรรมการของท่าน"
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56] transition-all"
                  required
                />
              </div>
            )}
          </div>

          {/* Member Full Name */}
          <div>
            <label
              htmlFor="memberNameInput"
              className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
            >
              ชื่อ-นามสกุล ของกรรมการ <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                id="memberNameInput"
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="ตัวอย่าง: ศาสตราจารย์ ดร.สมชาย ใจดี หรือ นายสมศักดิ์ รักเรียน"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#005F56] focus:border-[#005F56] transition-all"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              ระบุคำนำหน้าชื่อ และชื่อ-นามสกุล
            </p>
          </div>
        </div>

        {/* Step 2: Sub-Committee Selection */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-150">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#005F56] text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                เลือกคณะอนุกรรมการที่ประสงค์จะสังกัด (เลือก 1 ชุด) <span className="text-rose-600">*</span>
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              คลิกที่ปุ่มเพื่อเลือก (ปิดรับเมื่อครบโควต้า)
            </span>
          </div>

          {allSubCommitteesFull && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>ทุกคณะอนุกรรมการมีผู้แสดงความจำนงครบตามโควต้าแล้ว (ครบ 20 ท่าน)</span>
            </div>
          )}

          {/* 3 Big, Touch-Friendly Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {subCommittees.map((committee) => {
              const currentMembers = submissions.filter(
                (s) => s.subCommitteeId === committee.id
              );
              const count = currentMembers.length;
              const target = committee.targetCapacity;
              const isFull = count >= target;
              const isSelected = selectedSubCommitteeId === committee.id;

              return (
                <button
                  key={committee.id}
                  type="button"
                  disabled={isFull}
                  onClick={() => {
                    if (!isFull) {
                      setSelectedSubCommitteeId(committee.id);
                    }
                  }}
                  className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isFull
                      ? 'border-slate-200 bg-slate-50/70 cursor-not-allowed select-none'
                      : isSelected
                      ? 'border-[#005F56] bg-emerald-50/50 shadow-sm ring-1 ring-[#005F56] cursor-pointer'
                      : 'border-slate-250 bg-white hover:border-slate-400 hover:bg-slate-50/70 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* ตัดเฉพาะส่วนที่เลือก: หากครบโควต้าแล้ว ให้ตัดส่วนที่เลือก (วงกลมวิทยุ) ออก */}
                    {!isFull && (
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isSelected
                            ? 'border-[#005F56] bg-[#005F56] text-white'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    )}

                    {/* แสดงรายละเอียดชื่อชุดอนุกรรมการเหมือนเดิม */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${committee.accentColor.badgeBg} ${committee.accentColor.badgeText}`}
                        >
                          ชุดที่ {committee.number}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {committee.badgeLabel.split(':')[1]?.trim() || ''}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {committee.title}
                      </h4>
                    </div>
                  </div>

                  {/* Quota on Button แสดงเหมือนเดิม */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">
                        เลือกแล้ว
                      </span>
                      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {count} / {target} ท่าน
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Big Action Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-xl bg-[#005F56] hover:bg-[#004d46] active:bg-[#003d37] text-white text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังบันทึกข้อมูลลงระบบ...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>ยืนยันการเลือกคณะอนุกรรมการ</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog Popup (Dialog04 style with expanded dimensions and responsive mobile layout) */}
      {isConfirmDialogOpen && selectedSubCommittee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isSubmitting && setIsConfirmDialogOpen(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl p-5 sm:p-8 max-w-lg sm:max-w-xl w-full max-h-[92vh] overflow-y-auto relative flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button X with generous touch target */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsConfirmDialogOpen(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Centered Green Check Icon in Circle */}
            <div className="flex justify-center mb-3.5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 shadow-2xs">
                <Check className="h-7 w-7 text-green-600 stroke-[2.5]" />
              </div>
            </div>

            {/* Dialog Header / Title */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              ยืนยันการเลือกคณะอนุกรรมการ
            </h3>

            {/* Dialog Question & Prominently Highlighted Committee Title */}
            <div className="mt-2.5 w-full text-xs sm:text-sm text-slate-600 leading-relaxed text-center">
              <span>ท่านยืนยันที่จะเลือกคณะอนุกรรมการ</span>
              <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-slate-900 text-left sm:text-center shadow-2xs">
                <div className="flex items-center sm:justify-center gap-1.5 mb-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${selectedSubCommittee.accentColor.badgeBg} ${selectedSubCommittee.accentColor.badgeText}`}
                  >
                    ชุดที่ {selectedSubCommittee.number}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm sm:text-base leading-snug break-words">
                  {selectedSubCommittee.title}
                </p>
              </div>
              <p className="mt-2 font-semibold text-slate-700 text-xs sm:text-sm">
                หรือไม่?
              </p>
            </div>

            {/* Member Details Preview Card */}
            <div className="mt-4 w-full p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-left text-xs sm:text-sm space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-start justify-start gap-1 sm:gap-2.5 pb-2 border-b border-slate-200/70 text-left">
                <span className="text-slate-500 font-medium shrink-0 text-left">ชื่อ-นามสกุล กรรมการ:</span>
                <span className="font-bold text-slate-900 break-words text-left">{memberName.trim()}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-start gap-1 sm:gap-2.5 text-left">
                <span className="text-slate-500 font-medium shrink-0 text-left">ตำแหน่งกรรมการตามคำสั่ง:</span>
                <span className="font-semibold text-slate-800 break-words text-left">{pendingMemberRole}</span>
              </div>
            </div>

            {/* Dialog Footer with 'ยืนยัน' and 'ไม่ยืนยัน' buttons */}
            <div className="flex w-full flex-col sm:flex-row gap-2.5 sm:gap-3.5 mt-6">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="w-full sm:w-1/2 py-3 px-5 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>ยืนยัน</span>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmDialogOpen(false)}
                className="w-full sm:w-1/2 py-3 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-sm sm:text-base transition-all cursor-pointer text-center"
              >
                ไม่ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
