// Per-week sub-editor for a sprint-level cell. Opens when a user edits an allocation while
// the view is in "sprint" display mode. For sprints spanning more than one week, a "Weekly
// breakdown" checkbox (default unchecked) lets the user choose between:
// - Unchecked (default): a single % field whose value is applied uniformly to every week.
// - Checked: one input per week, so each week's percentage can be set individually.
// See .kiro/specs/variable-sprint-length.

import { useMemo, useState } from 'react';
import { WeekInfo, getWeekLabel, getWeekDayRangeLabel, getWeeksInRange, formatDDMM } from '../utils/weekUtils';

interface WeekSpanEditorProps {
  title: string;           // e.g. "Acme Corp - CRM → Alex Cohen | S2"
  weeks: WeekInfo[];       // the weeks belonging to this sprint
  initialValues: number[]; // current % per week (same order as weeks), 0 = no allocation
  // `scope` = whether the change applies to this sprint only, or this sprint and all future
  // weeks for the same member+project. Only meaningful when editing an existing allocation.
  onSave: (valuesPerWeek: number[], scope: 'current' | 'future') => void;
  onDelete?: (scope: 'current' | 'future') => void; // optional: remove allocations
  onClose: () => void;
  // Optional forward-span (only meaningful when adding to an empty cell): when provided and
  // the user opts to span, also fill these future weeks (beyond this sprint) with the same
  // uniform %. sprintLengthWeeks controls how "number of sprints" maps to weeks.
  isNew?: boolean;
  sprintLengthWeeks?: number;
  onSaveWithSpan?: (valuesPerWeek: number[], extraWeeks: WeekInfo[], pct: number) => void;
}

export default function WeekSpanEditor({ title, weeks, initialValues, onSave, onDelete, onClose, isNew, sprintLengthWeeks = 2, onSaveWithSpan }: WeekSpanEditorProps) {
  const isMultiWeek = weeks.length > 1;

  // Edit/remove scope for existing allocations: this sprint only, or this + all future.
  const isExisting = !isNew;
  const [scope, setScope] = useState<'current' | 'future'>('current');

  // Forward-span controls (new allocations only). By default the allocation covers just this
  // sprint; the user can extend it forward by a number of sprints or up to an end date.
  const canSpan = !!isNew && !!onSaveWithSpan;
  const [spanEnabled, setSpanEnabled] = useState(false);
  const [spanMode, setSpanMode] = useState<'sprints' | 'endDate'>('sprints');
  const [spanSprints, setSpanSprints] = useState(1); // additional sprints beyond this one
  const [spanEndDate, setSpanEndDate] = useState('');

  // Weeks beyond this sprint that the span covers (start the week after this sprint's last).
  const extraWeeks = useMemo<WeekInfo[]>(() => {
    if (!canSpan || !spanEnabled || weeks.length === 0) return [];
    const lastWeek = weeks[weeks.length - 1];
    const start = new Date(lastWeek.startDate + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() + 7); // first week after this sprint
    const startISO = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
    if (spanMode === 'endDate') {
      if (!spanEndDate || spanEndDate < startISO) return [];
      return getWeeksInRange(start, new Date(spanEndDate + 'T00:00:00Z'));
    }
    const totalExtraWeeks = spanSprints * sprintLengthWeeks;
    if (totalExtraWeeks <= 0) return [];
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (totalExtraWeeks - 1) * 7);
    return getWeeksInRange(start, end).slice(0, totalExtraWeeks);
  }, [canSpan, spanEnabled, spanMode, spanSprints, spanEndDate, weeks, sprintLengthWeeks]);

  // Per-week breakdown values (used when breakdown is checked, or always for single-week sprints).
  const [values, setValues] = useState<string[]>(initialValues.map(v => (v > 0 ? String(v) : '')));

  // Weekly breakdown toggle — only relevant for multi-week sprints. Default unchecked: a
  // single field applies the same % to every week in the sprint. Auto-checked on open when
  // the existing weeks already have differing values, so the user immediately sees them
  // instead of the single field silently hiding a mismatch.
  const allSame = initialValues.every(v => v === initialValues[0]);
  const [breakdown, setBreakdown] = useState(!allSame);
  const [singleValue, setSingleValue] = useState<string>(
    allSame && initialValues[0] > 0 ? String(initialValues[0]) : ''
  );

  const clampPct = (v: string) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  };

  const handleSave = () => {
    // Spanning uses a single uniform % across this sprint and the extra weeks.
    if (canSpan && spanEnabled && extraWeeks.length > 0 && onSaveWithSpan) {
      const pct = clampPct(isMultiWeek && !breakdown ? singleValue : values[0]);
      onSaveWithSpan(weeks.map(() => pct), extraWeeks, pct);
      return;
    }
    if (isMultiWeek && !breakdown) {
      const pct = clampPct(singleValue);
      onSave(weeks.map(() => pct), scope);
      return;
    }
    onSave(values.map(clampPct), scope);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-96" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-gray-900 mb-1">Edit Sprint Allocation</div>
        <div className="text-xs text-gray-600 mb-4">{title}</div>

        {isMultiWeek && !(canSpan && spanEnabled) && (
          <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={breakdown}
              onChange={e => setBreakdown(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs font-medium text-gray-700">Weekly breakdown</span>
            <span className="text-[10px] text-gray-400">(set each week individually)</span>
          </label>
        )}

        {(canSpan && spanEnabled) || (isMultiWeek && !breakdown) ? (
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-xs text-gray-700">
              <div className="font-medium">
                {canSpan && spanEnabled
                  ? `All ${weeks.length + extraWeeks.length} weeks`
                  : `All ${weeks.length} weeks`}
              </div>
              <div className="text-[10px] text-gray-400">
                {canSpan && spanEnabled
                  ? 'Same % applied to every week in the span'
                  : 'Same % applied to every week in this sprint'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="100"
                value={canSpan && spanEnabled ? (singleValue || values[0] || '') : singleValue}
                onChange={e => { setSingleValue(e.target.value); setValues(prev => prev.map((_, i) => (i === 0 ? e.target.value : prev[i]))); }}
                className="w-20 px-2 py-1.5 border rounded text-sm text-right"
                placeholder="0"
                autoFocus
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {weeks.map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="text-xs text-gray-700">
                  <div className="font-medium">{getWeekLabel(w)}</div>
                  <div className="text-[10px] text-gray-400">{getWeekDayRangeLabel(w)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="100"
                    value={values[i]}
                    onChange={e => setValues(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                    className="w-20 px-2 py-1.5 border rounded text-sm text-right"
                    placeholder="0"
                    autoFocus={i === 0}
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isExisting && (
          <div className="mb-4 border-t pt-3">
            <div className="text-xs font-medium text-gray-700 mb-1.5">Apply to</div>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input type="radio" name="wseScope" value="current" checked={scope === 'current'}
                  onChange={() => setScope('current')} className="mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-gray-900">This sprint only</div>
                  <div className="text-[11px] text-gray-500">Change just this sprint's weeks</div>
                </div>
              </label>
              <label className="flex items-start gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input type="radio" name="wseScope" value="future" checked={scope === 'future'}
                  onChange={() => setScope('future')} className="mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-gray-900">This and all future allocations</div>
                  <div className="text-[11px] text-gray-500">
                    Apply to this and every later week for this member on this project
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {canSpan && (
          <div className="mb-4 border-t pt-3">
            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
              <input type="checkbox" checked={spanEnabled} onChange={e => setSpanEnabled(e.target.checked)} className="rounded" />
              <span className="text-xs font-medium text-gray-700">Span into future sprints</span>
            </label>
            {spanEnabled && (
              <div className="space-y-2 pl-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="wseSpanMode" value="sprints" checked={spanMode === 'sprints'} onChange={() => setSpanMode('sprints')} />
                  <span className="text-xs text-gray-700">Additional sprints</span>
                  <input type="number" min="1" max="52" value={spanSprints} disabled={spanMode !== 'sprints'}
                    onChange={e => setSpanSprints(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="wseSpanMode" value="endDate" checked={spanMode === 'endDate'} onChange={() => setSpanMode('endDate')} />
                  <span className="text-xs text-gray-700">Until end date</span>
                  <input type="date" value={spanEndDate} disabled={spanMode !== 'endDate'}
                    onChange={e => setSpanEndDate(e.target.value)}
                    className="px-2 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                </label>
                <p className="text-[11px] text-gray-500">
                  {extraWeeks.length > 0
                    ? `Covers this sprint + ${extraWeeks.length} more week${extraWeeks.length !== 1 ? 's' : ''} (through ${formatDDMM(extraWeeks[extraWeeks.length - 1].startDate)}).`
                    : 'Covers this sprint only until a valid span is set.'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <div>
            {onDelete && (
              <button onClick={() => onDelete(scope)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                {scope === 'future' ? 'Remove + future' : 'Clear Sprint'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs">Cancel</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
