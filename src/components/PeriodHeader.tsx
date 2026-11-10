// Shared Month > Week > Sprint header used by all capacity views.
// See .kiro/specs/variable-sprint-length.
//
// Two render modes:
// - "table": emits <thead> rows using colspan (Timeline, Puzzle matrix).
// - "flex":  emits banded <div> rows with computed widths (Staff cards, Dashboard swimlanes).
//
// The week grid is universal; the Sprint row is optional (toggleable) and follows the
// per-project sprint length numbering rules from weekUtils.

import React from 'react';
import {
  WeekInfo,
  Sprint,
  SprintLengthWeeks,
  groupWeeksIntoSprints,
  getSprintTitleLabel,
  getSprintDayRangeLabel,
  getMonthWeekLabel,
  getWeekDayRangeLabel,
  weekKey,
} from '../utils/weekUtils';

interface CommonProps {
  weeks: WeekInfo[];
  sprintLengthWeeks: SprintLengthWeeks;
  showSprintRow?: boolean;
}

interface TableProps extends CommonProps {
  mode: 'table';
  /** Content for the top-left corner cell (spans all header rows). */
  leadingLabel?: React.ReactNode;
  /** Columns per week (e.g. Puzzle repeats member sub-columns under each week). Default 1. */
  colsPerWeek?: number;
  /** Optional classes for sticky/styled header integration. */
  theadClassName?: string;
  leadingClassName?: string;
  weekThClassName?: string;
}

interface FlexProps extends CommonProps {
  mode: 'flex';
  colWidth: number; // px per week column
  gap: number;      // px gap between columns
}

type PeriodHeaderProps = TableProps | FlexProps;

export default function PeriodHeader(props: PeriodHeaderProps) {
  const { weeks, sprintLengthWeeks, showSprintRow = true } = props;
  const sprints = groupWeeksIntoSprints(weeks, sprintLengthWeeks);

  if (props.mode === 'table') {
    const cpw = props.colsPerWeek ?? 1;
    return (
      <thead className={props.theadClassName}>
        {/* MONTH + WEEK (combined: "Aug 2026 · W2" / "09-13") */}
        <tr className="bg-gray-50 border-b text-[10px]">
          {props.leadingLabel !== undefined && (
            <th
              rowSpan={showSprintRow ? 2 : 1}
              className={props.leadingClassName ?? 'text-left px-3 py-2 border-r align-bottom'}
            >
              {props.leadingLabel}
            </th>
          )}
          {weeks.map(w => (
            <th
              key={weekKey(w)}
              colSpan={cpw}
              className={props.weekThClassName ?? 'text-center px-2 py-1.5 border-r border-l-2 border-l-gray-300'}
            >
              <div className="font-semibold">{getMonthWeekLabel(w)}</div>
              <div className="text-[9px] text-gray-400">{getWeekDayRangeLabel(w)}</div>
            </th>
          ))}
        </tr>
        {/* SPRINT (optional, dominant styling: "Aug. Sprint 1" / "01-15") */}
        {showSprintRow && (
          <tr className="bg-blue-100 border-b-2 border-blue-300 text-[11px]">
            {sprints.map((s, i) => (
              <th
                key={i}
                colSpan={s.weeks.length * cpw}
                className="text-center px-1 py-1.5 border-r border-l-2 border-l-blue-300 font-bold text-blue-800"
              >
                <div>{getSprintTitleLabel(s)}</div>
                <div className="text-[9px] font-medium text-blue-500">{getSprintDayRangeLabel(s)}</div>
              </th>
            ))}
          </tr>
        )}
      </thead>
    );
  }

  // flex mode
  const { colWidth, gap } = props;
  const spanWidth = (count: number) => count * colWidth + (count - 1) * gap;

  return (
    <div>
      {/* MONTH + WEEK (combined: "Aug 2026 · W2" / "09-13") */}
      <div className="flex mb-1.5" style={{ gap }}>
        {weeks.map(w => (
          <div
            key={weekKey(w)}
            style={{ width: colWidth }}
            className="flex-shrink-0 text-center bg-gray-50 rounded-md py-1 border-b"
          >
            <div className="text-[11px] font-semibold text-gray-700">{getMonthWeekLabel(w)}</div>
            <div className="text-[9px] text-gray-400">{getWeekDayRangeLabel(w)}</div>
          </div>
        ))}
      </div>
      {/* SPRINT (optional, dominant styling: "Aug. Sprint 1" / "01-15") */}
      {showSprintRow && (
        <div className="flex mb-3" style={{ gap }}>
          {sprints.map((s: Sprint, i: number) => (
            <div
              key={i}
              style={{ width: spanWidth(s.weeks.length) }}
              className="flex-shrink-0 text-center bg-blue-100 border-2 border-blue-300 rounded-md py-1.5 text-[12px] font-bold text-blue-800"
            >
              <div>{getSprintTitleLabel(s)}</div>
              <div className="text-[9px] font-medium text-blue-500">{getSprintDayRangeLabel(s)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
