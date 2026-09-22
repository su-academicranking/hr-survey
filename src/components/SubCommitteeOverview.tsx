import React from 'react';
import { SubCommittee, SurveySubmission } from '../types';
import { Users, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatThaiTime } from '../utils/dateUtils';

interface SubCommitteeOverviewProps {
  subCommittees: SubCommittee[];
  submissions: SurveySubmission[];
  selectedCommitteeId?: number;
  onSelectCommittee?: (id: number) => void;
  isSelectionMode?: boolean;
}

export const SubCommitteeOverview: React.FC<SubCommitteeOverviewProps> = ({
  subCommittees,
  submissions,
  selectedCommitteeId,
  onSelectCommittee,
  isSelectionMode = false,
}) => {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#005F56]" />
          <span>สถานะคณะอนุกรรมการทั้ง 3 ชุด และรายชื่อผู้เลือกปัจจุบัน</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {subCommittees.map((committee) => {
          const membersInCommittee = submissions.filter(
            (s) => s.subCommitteeId === committee.id
          );
          const count = membersInCommittee.length;
          const target = committee.targetCapacity;
          const remaining = Math.max(0, target - count);
          const isSelected = selectedCommitteeId === committee.id;
          const isExpanded = expandedId === committee.id;

          // Color accents
          const isFullOrHigh = count >= target;

          return (
            <div
              key={committee.id}
              className={`rounded-xl border transition-all duration-150 flex flex-col justify-between bg-white ${
                isSelected
                  ? 'border-[#005F56] ring-2 ring-[#005F56]/30 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
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
                    <div>
                      <span className="text-xl font-extrabold text-slate-900">
                        {count}
                      </span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        / {target} ท่าน
                      </span>
                    </div>
                    {isFullOrHigh ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        เต็ม
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        ว่างอีก {remaining} ที่
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-committee Title */}
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mb-3 sm:min-h-[44px] break-words">
                  {committee.title}
                </h3>

                {/* Capacity & Balance Progress */}
                <div className="pt-2 border-t border-slate-100">
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFullOrHigh ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (count / target) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Members list preview */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleExpand(committee.id)}
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
                            <div className="font-semibold text-slate-900 flex items-center justify-between gap-1">
                              <span className="break-words">
                                {idx + 1}. {sub.memberName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                {formatThaiTime(sub.submittedAt)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 break-words leading-tight">
                              {sub.memberRole}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Button (if in selection mode) */}
              {isSelectionMode && onSelectCommittee && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 mt-auto">
                  <button
                    type="button"
                    onClick={() => onSelectCommittee(committee.id)}
                    className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-[#005F56] text-white shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isSelected ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span>{isSelected ? 'เลือกชุดนี้แล้ว' : 'คลิกเพื่อเลือกชุดนี้'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
