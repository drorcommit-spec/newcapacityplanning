import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ALLOWED_ROLES = ['Product Manager', 'Product Director'];

interface ProjectInput {
  projectId: string;
  selected: boolean;
  capacity: number;
  sprintCount: number;
  startYear: number;
  startMonth: number;
  startSprint: number;
}

export interface Suggestion {
  projectId: string;
  memberId: string;
  year: number;
  month: number;
  sprint: number;
  percentage: number;
}

interface PuzzleMeProps {
  onSuggestionsReady: (suggestions: Suggestion[]) => void;
  onClose: () => void;
}

export default function PuzzleMe({ onSuggestionsReady, onClose }: PuzzleMeProps) {
  const { projects, allocations, teamMembers } = useData();
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curSprint = now.getDate() <= 15 ? 1 : 2;

  const [includeUnsigned, setIncludeUnsigned] = useState(false);
  const [projectInputs, setProjectInputs] = useState<ProjectInput[]>([]);
  const [step, setStep] = useState<'setup' | 'running' | 'done'>('setup');

  // Eligible employees
  const eligibleMembers = useMemo(() =>
    teamMembers.filter(m => m.isActive && m.role && ALLOWED_ROLES.some(r => m.role.toLowerCase().includes(r.toLowerCase())))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers]
  );

  // Projects that need allocation (red + optionally yellow)
  const eligibleProjects = useMemo(() => {
    const active = projects.filter(p => !p.isArchived && (p.status === 'Active' || p.status === 'Pending' || p.status === 'New Signed Off'));

    return active.filter(p => {
      const hasFuture = allocations.some(a => {
        if (a.projectId !== p.id) return false;
        if (a.year > curYear) return true;
        if (a.year === curYear && a.month > curMonth) return true;
        if (a.year === curYear && a.month === curMonth && a.sprint >= curSprint) return true;
        return false;
      });
      const hasSigned = !!p.activityCloseDate;

      // Red: signed but no resources
      if (hasSigned && !hasFuture) return true;
      // Yellow: has resources but not signed (include if toggle is on)
      if (!hasSigned && includeUnsigned) return true;
      // Yellow: no resources, no sign-off
      if (!hasSigned && !hasFuture && includeUnsigned) return true;

      return false;
    }).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [projects, allocations, includeUnsigned, curYear, curMonth, curSprint]);

  // Initialize project inputs when eligible projects change
  useMemo(() => {
    setProjectInputs(eligibleProjects.map(p => {
      const name = p.projectName.toLowerCase();
      // Smart defaults based on project name
      let defaultCapacity = 20;
      let defaultSprints = 2;
      if (name.includes('mvp')) { defaultCapacity = 30; defaultSprints = 3; }
      else if (name.includes('poc')) { defaultCapacity = 15; defaultSprints = 2; }
      else if (name.includes('assess')) { defaultCapacity = 15; defaultSprints = 1; }

      return {
        projectId: p.id,
        selected: false,
        capacity: p.requiredCapacity || defaultCapacity,
        sprintCount: p.plannedSprintCount || defaultSprints,
        startYear: p.plannedStartYear || curYear,
        startMonth: p.plannedStartMonth || curMonth,
        startSprint: p.plannedStartSprint || curSprint,
      };
    }));
  }, [eligibleProjects]);

  const updateInput = (projectId: string, updates: Partial<ProjectInput>) => {
    setProjectInputs(prev => prev.map(p => p.projectId === projectId ? { ...p, ...updates } : p));
  };

  const selectedCount = projectInputs.filter(p => p.selected).length;

  const runSimulation = () => {
    setStep('running');
    const selected = projectInputs.filter(p => p.selected);
    const suggestions: Suggestion[] = [];

    // Build capacity map: memberId -> sprintKey -> used%
    const capacityUsed: Record<string, Record<string, number>> = {};
    for (const m of eligibleMembers) {
      capacityUsed[m.id] = {};
    }

    // Fill in existing allocations
    for (const a of allocations) {
      if (capacityUsed[a.productManagerId]) {
        const key = `${a.year}-${a.month}-${a.sprint}`;
        capacityUsed[a.productManagerId][key] = (capacityUsed[a.productManagerId][key] || 0) + a.allocationPercentage;
      }
    }

    // Build customer history: which employees worked on which customers before
    const customerHistory: Record<string, Set<string>> = {}; // customerId -> Set<memberId>
    for (const a of allocations) {
      const proj = projects.find(p => p.id === a.projectId);
      if (proj) {
        const custKey = proj.customerName.toLowerCase();
        if (!customerHistory[custKey]) customerHistory[custKey] = new Set();
        customerHistory[custKey].add(a.productManagerId);
      }
    }

    // For each selected project, find the BEST SINGLE employee for ALL sprints
    for (const input of selected) {
      const proj = projects.find(p => p.id === input.projectId);
      const custKey = proj?.customerName.toLowerCase() || '';
      const prevMembers = customerHistory[custKey] || new Set();

      // Generate all sprint keys for this project
      const sprintKeys: { year: number; month: number; sprint: number; key: string }[] = [];
      let y = input.startYear, m = input.startMonth, s = input.startSprint;
      for (let i = 0; i < input.sprintCount; i++) {
        sprintKeys.push({ year: y, month: m, sprint: s, key: `${y}-${m}-${s}` });
        s++;
        if (s > 2) { s = 1; m++; }
        if (m > 12) { m = 1; y++; }
      }

      // Score each employee: can they handle ALL sprints?
      let bestMember: string | null = null;
      let bestScore = -Infinity;

      for (const member of eligibleMembers) {
        const memberCap = member.capacity ?? 100;
        let canFitAll = true;
        let totalAvailable = 0;

        for (const sk of sprintKeys) {
          const used = capacityUsed[member.id][sk.key] || 0;
          const available = memberCap - used;
          if (available < input.capacity) {
            canFitAll = false;
            break;
          }
          totalAvailable += available;
        }

        if (!canFitAll) continue;

        // Score: priority to employees who worked on this customer before
        const hasCustHistory = prevMembers.has(member.id) ? 1000 : 0;
        // Secondary: most average available capacity (balanced load)
        const avgAvailable = totalAvailable / sprintKeys.length;
        const score = hasCustHistory + avgAvailable;

        if (score > bestScore) {
          bestScore = score;
          bestMember = member.id;
        }
      }

      // Fallback: if no one can fit ALL sprints, find best partial fit
      if (!bestMember) {
        let bestPartialScore = -Infinity;
        for (const member of eligibleMembers) {
          const memberCap = member.capacity ?? 100;
          let fittingSprints = 0;
          for (const sk of sprintKeys) {
            const used = capacityUsed[member.id][sk.key] || 0;
            if (memberCap - used >= input.capacity) fittingSprints++;
          }
          const hasCustHistory = prevMembers.has(member.id) ? 1000 : 0;
          const score = hasCustHistory + fittingSprints * 10;
          if (score > bestPartialScore && fittingSprints > 0) {
            bestPartialScore = score;
            bestMember = member.id;
          }
        }
      }

      // Create suggestions for all sprints with the chosen employee
      if (bestMember) {
        for (const sk of sprintKeys) {
          const used = capacityUsed[bestMember][sk.key] || 0;
          const memberCap = (eligibleMembers.find(mm => mm.id === bestMember)?.capacity ?? 100);
          const available = memberCap - used;
          const pct = Math.min(input.capacity, Math.max(available, 0));
          if (pct > 0) {
            suggestions.push({
              projectId: input.projectId,
              memberId: bestMember,
              year: sk.year, month: sk.month, sprint: sk.sprint,
              percentage: pct,
            });
            capacityUsed[bestMember][sk.key] = used + pct;
          }
        }
      }
    }

    setTimeout(() => {
      setStep('done');
      onSuggestionsReady(suggestions);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧩</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Puzzle Me</h2>
              <p className="text-xs text-gray-500">Auto-suggest resource allocations for unassigned projects</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {step === 'running' && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <div className="animate-spin text-4xl">🧩</div>
            <div className="text-lg font-semibold text-gray-700">Solving the puzzle...</div>
            <div className="text-sm text-gray-500">Finding the best resource allocation</div>
          </div>
        )}

        {step === 'setup' && (
          <>
            {/* Toggle */}
            <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeUnsigned} onChange={e => setIncludeUnsigned(e.target.checked)} className="rounded text-purple-600" />
                <span>Include unsigned projects (yellow)</span>
              </label>
              <span className="text-xs text-gray-400 ml-auto">{eligibleProjects.length} eligible · {selectedCount} selected</span>
            </div>

            {/* Project list */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {eligibleProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No projects need allocation</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-2 w-8">
                        <input type="checkbox"
                          checked={selectedCount === eligibleProjects.length && eligibleProjects.length > 0}
                          onChange={e => setProjectInputs(prev => prev.map(p => ({ ...p, selected: e.target.checked })))}
                          className="rounded" />
                      </th>
                      <th className="text-left py-2">Project</th>
                      <th className="text-center py-2 w-20">Capacity %</th>
                      <th className="text-center py-2 w-20">Sprints</th>
                      <th className="text-center py-2 w-32">Starting from</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectInputs.map(input => {
                      const p = projects.find(pr => pr.id === input.projectId);
                      if (!p) return null;
                      const light = p.activityCloseDate ? '🔴' : '🟡';
                      return (
                        <tr key={input.projectId} className={`border-b ${input.selected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                          <td className="py-2">
                            <input type="checkbox" checked={input.selected}
                              onChange={e => updateInput(input.projectId, { selected: e.target.checked })}
                              className="rounded text-purple-600" />
                          </td>
                          <td className="py-2">
                            <span className="mr-1">{light}</span>
                            <span className="text-gray-500 text-xs">{p.customerName}</span>
                            <span className="mx-1 text-gray-300">·</span>
                            <span className="font-medium text-gray-800">{p.projectName}</span>
                          </td>
                          <td className="py-2 text-center">
                            <input type="number" min="5" max="100" step="5" value={input.capacity}
                              onChange={e => updateInput(input.projectId, { capacity: Number(e.target.value) })}
                              disabled={!input.selected}
                              className="w-16 px-1 py-0.5 border rounded text-xs text-center disabled:opacity-40" />
                          </td>
                          <td className="py-2 text-center">
                            <input type="number" min="1" max="24" value={input.sprintCount}
                              onChange={e => updateInput(input.projectId, { sprintCount: Number(e.target.value) })}
                              disabled={!input.selected}
                              className="w-14 px-1 py-0.5 border rounded text-xs text-center disabled:opacity-40" />
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <select value={input.startMonth} disabled={!input.selected}
                                onChange={e => updateInput(input.projectId, { startMonth: Number(e.target.value) })}
                                className="px-1 py-0.5 border rounded text-xs disabled:opacity-40">
                                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                              </select>
                              <select value={input.startSprint} disabled={!input.selected}
                                onChange={e => updateInput(input.projectId, { startSprint: Number(e.target.value) })}
                                className="px-1 py-0.5 border rounded text-xs disabled:opacity-40">
                                <option value={1}>S1</option>
                                <option value={2}>S2</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
              <button onClick={runSimulation} disabled={selectedCount === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                🧩 Run Simulation ({selectedCount} project{selectedCount !== 1 ? 's' : ''})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
