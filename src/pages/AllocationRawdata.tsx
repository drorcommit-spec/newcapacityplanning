import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Select from '../components/Select';
import Input from '../components/Input';
import ProjectForm from '../components/ProjectForm';
import { calculateDaysFromPercentage, getMonthsInYear, getSprintsInMonth, getMonthName } from '../utils/dateUtils';

export default function AllocationRawdata() {
  const { teamMembers, projects, allocations, addAllocation, updateAllocation, deleteAllocation } = useData();
  const { user } = useAuth();
  const { canWrite } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentDate.getMonth() + 1);
  const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'member' | 'project'>('flat');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [lastSelectedPM, setLastSelectedPM] = useState<string>('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [pendingAllocation, setPendingAllocation] = useState<any>(null);
  const [keepFormOpen, setKeepFormOpen] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  
  const currentSprint = currentDate.getDate() <= 15 ? 1 : 2;
  
  const [formData, setFormData] = useState({
    projectId: '',
    productManagerId: '',
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    sprint: currentSprint,
    allocationPercentage: '',
  });

  const activeProjects = projects
    .filter(p => !p.isArchived)
    .sort((a, b) => {
      const customerCompare = a.customerName.localeCompare(b.customerName);
      if (customerCompare !== 0) return customerCompare;
      return a.projectName.localeCompare(b.projectName);
    });
  const activeManagers = teamMembers
    .filter(m => m.isActive && m.role !== 'PMO')
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const filteredAllocations = useMemo(() => {
    return allocations.filter(a => {
      if (a.year !== selectedYear) return false;
      if (selectedMonth !== null && a.month !== selectedMonth) return false;
      if (selectedSprint !== null && a.sprint !== selectedSprint) return false;
      if (selectedProject && a.projectId !== selectedProject) return false;
      return true;
    });
  }, [allocations, selectedYear, selectedMonth, selectedSprint, selectedProject]);

  // Group by Member
  const groupedByMember = useMemo(() => {
    const groups = new Map<string, typeof filteredAllocations>();
    filteredAllocations.forEach(alloc => {
      if (!groups.has(alloc.productManagerId)) {
        groups.set(alloc.productManagerId, []);
      }
      groups.get(alloc.productManagerId)!.push(alloc);
    });
    
    return Array.from(groups.entries()).map(([pmId, allocs]) => {
      const pm = activeManagers.find(m => m.id === pmId);
      const totalPercentage = allocs.reduce((sum, a) => sum + a.allocationPercentage, 0);
      const totalDays = allocs.reduce((sum, a) => sum + a.allocationDays, 0);
      return {
        id: pmId,
        name: pm?.fullName || 'Unknown',
        totalPercentage,
        totalDays,
        allocations: allocs.sort((a, b) => {
          const projA = activeProjects.find(p => p.id === a.projectId);
          const projB = activeProjects.find(p => p.id === b.projectId);
          return (projA?.projectName || '').localeCompare(projB?.projectName || '');
        }),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAllocations, activeManagers, activeProjects]);

  // Group by Project
  const groupedByProject = useMemo(() => {
    const groups = new Map<string, typeof filteredAllocations>();
    filteredAllocations.forEach(alloc => {
      if (!groups.has(alloc.projectId)) {
        groups.set(alloc.projectId, []);
      }
      groups.get(alloc.projectId)!.push(alloc);
    });
    
    return Array.from(groups.entries()).map(([projectId, allocs]) => {
      const project = activeProjects.find(p => p.id === projectId);
      const totalPercentage = allocs.reduce((sum, a) => sum + a.allocationPercentage, 0);
      const totalDays = allocs.reduce((sum, a) => sum + a.allocationDays, 0);
      return {
        id: projectId,
        name: project?.projectName || 'Unknown',
        customer: project?.customerName || '-',
        totalPercentage,
        totalDays,
        allocations: allocs.sort((a, b) => {
          const pmA = activeManagers.find(m => m.id === a.productManagerId);
          const pmB = activeManagers.find(m => m.id === b.productManagerId);
          return (pmA?.fullName || '').localeCompare(pmB?.fullName || '');
        }),
      };
    }).sort((a, b) => {
      const customerCompare = a.customer.localeCompare(b.customer);
      if (customerCompare !== 0) return customerCompare;
      return a.name.localeCompare(b.name);
    });
  }, [filteredAllocations, activeProjects, activeManagers]);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    if (viewMode === 'member') {
      setExpandedGroups(new Set(groupedByMember.map(g => g.id)));
    } else if (viewMode === 'project') {
      setExpandedGroups(new Set(groupedByProject.map(g => g.id)));
    }
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const checkCapacityWarning = (allocationData: any) => {
    const project = projects.find(p => p.id === allocationData.projectId);
    if (!project || !project.maxCapacityPercentage) return false;

    // Calculate total allocation for this project in this sprint
    const existingAllocations = allocations.filter(
      a => a.projectId === allocationData.projectId &&
           a.year === allocationData.year &&
           a.month === allocationData.month &&
           a.sprint === allocationData.sprint &&
           a.id !== editingId
    );

    const totalAllocation = existingAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0) + allocationData.allocationPercentage;

    if (totalAllocation > project.maxCapacityPercentage) {
      setWarningMessage(
        `Warning: Total allocation (${totalAllocation}%) exceeds project max capacity (${project.maxCapacityPercentage}%). Do you want to continue?`
      );
      return true;
    }
    return false;
  };

  const saveAllocation = (allocationData: any, keepOpen: boolean = false) => {
    if (!user) return;

    if (editingId) {
      updateAllocation(editingId, allocationData, user.id);
    } else {
      addAllocation(allocationData, user.id);
    }

    setLastSelectedPM(allocationData.productManagerId);
    
    if (keepOpen) {
      // Keep form open and reset only the project and percentage
      setFormData(prev => ({
        ...prev,
        projectId: '',
        allocationPercentage: '',
      }));
    } else {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent, keepOpen: boolean = false) => {
    e.preventDefault();
    if (!user) return;

    const percentage = Number(formData.allocationPercentage);
    const allocationData = {
      projectId: formData.projectId,
      productManagerId: formData.productManagerId,
      year: formData.year,
      month: formData.month,
      sprint: formData.sprint,
      allocationPercentage: percentage,
      allocationDays: calculateDaysFromPercentage(percentage),
    };

    // Check for duplicate allocation
    const duplicate = allocations.find(
      a => a.projectId === allocationData.projectId &&
           a.productManagerId === allocationData.productManagerId &&
           a.year === allocationData.year &&
           a.month === allocationData.month &&
           a.sprint === allocationData.sprint &&
           a.id !== editingId
    );

    if (duplicate) {
      alert('Error: An allocation already exists for this member, project, and sprint. Please edit the existing allocation instead.');
      return;
    }

    setKeepFormOpen(keepOpen);

    if (checkCapacityWarning(allocationData)) {
      setPendingAllocation(allocationData);
      setShowWarning(true);
    } else {
      saveAllocation(allocationData, keepOpen);
    }
  };

  const handleWarningConfirm = () => {
    if (pendingAllocation) {
      saveAllocation(pendingAllocation, keepFormOpen);
    }
    setShowWarning(false);
    setPendingAllocation(null);
    setKeepFormOpen(false);
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setPendingAllocation(null);
  };

  const resetForm = () => {
    const now = new Date();
    setFormData({
      projectId: '',
      productManagerId: lastSelectedPM,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      sprint: now.getDate() <= 15 ? 1 : 2,
      allocationPercentage: '',
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (alloc: typeof allocations[0]) => {
    setFormData({
      projectId: alloc.projectId,
      productManagerId: alloc.productManagerId,
      year: alloc.year,
      month: alloc.month,
      sprint: alloc.sprint,
      allocationPercentage: alloc.allocationPercentage.toString(),
    });
    setEditingId(alloc.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    if (confirm('Delete this allocation?')) {
      deleteAllocation(id, user.id);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    return { value: year.toString(), label: year.toString() };
  });

  const monthOptions = [
    { value: 'all', label: 'All Months' },
    ...getMonthsInYear().map(m => ({ value: m.toString(), label: getMonthName(m) })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sprint Allocation Planning</h1>
        {canWrite && <Button onClick={() => setIsModalOpen(true)}>Add Allocation</Button>}
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <Select
            label="Year"
            options={yearOptions}
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          />
          <Select
            label="Month"
            options={monthOptions}
            value={selectedMonth?.toString() || 'all'}
            onChange={(e) => setSelectedMonth(e.target.value === 'all' ? null : Number(e.target.value))}
          />
          <Select
            label="Sprint"
            options={[
              { value: 'all', label: 'Both Sprints' },
              { value: '1', label: 'Sprint 1' },
              { value: '2', label: 'Sprint 2' },
            ]}
            value={selectedSprint?.toString() || 'all'}
            onChange={(e) => setSelectedSprint(e.target.value === 'all' ? null : Number(e.target.value))}
          />
          <Select
            label="Project"
            options={[
              { value: '', label: 'All Projects' },
              ...activeProjects.map(p => ({ value: p.id, label: `${p.customerName} - ${p.projectName}` })),
            ]}
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value || null)}
          />
        </div>

        <div className="flex justify-between items-center mb-4 pt-4 border-t">
          <Select
            label="View"
            options={[
              { value: 'flat', label: 'Flat List' },
              { value: 'member', label: 'Group by Member' },
              { value: 'project', label: 'Group by Project' },
            ]}
            value={viewMode}
            onChange={(e) => {
              setViewMode(e.target.value as 'flat' | 'member' | 'project');
              setExpandedGroups(new Set());
            }}
          />
          {viewMode !== 'flat' && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={expandAll}>Expand All</Button>
              <Button variant="secondary" onClick={collapseAll}>Collapse All</Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {/* Flat List View */}
          {viewMode === 'flat' && (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Product Manager</th>
                  <th className="text-left py-3 px-4">Project</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Sprint</th>
                  <th className="text-left py-3 px-4">Allocation</th>
                  <th className="text-left py-3 px-4">Days</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map(alloc => {
                  const pm = activeManagers.find(m => m.id === alloc.productManagerId);
                  const project = activeProjects.find(p => p.id === alloc.projectId);
                  return (
                    <tr key={alloc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{pm?.fullName || 'Unknown'}</td>
                      <td className="py-3 px-4">{project?.projectName || 'Unknown'}</td>
                      <td className="py-3 px-4">{project?.customerName || '-'}</td>
                      <td className="py-3 px-4">
                        {alloc.year} - {getMonthName(alloc.month)} - S{alloc.sprint}
                      </td>
                      <td className="py-3 px-4">{alloc.allocationPercentage}%</td>
                      <td className="py-3 px-4">{alloc.allocationDays} days</td>
                      <td className="py-3 px-4">
                        {canWrite && (
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(alloc)} className="text-blue-600 hover:text-blue-700 text-sm">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(alloc.id)} className="text-red-600 hover:text-red-700 text-sm">
                              Delete
                            </button>
                          </div>
                        )}
                        {!canWrite && <span className="text-gray-400 text-sm">View Only</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Group by Member View */}
          {viewMode === 'member' && (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-8"></th>
                  <th className="text-left py-3 px-4">Product Manager / Project</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Sprint</th>
                  <th className="text-left py-3 px-4">Allocation</th>
                  <th className="text-left py-3 px-4">Days</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedByMember.map(group => (
                  <>
                    <tr key={group.id} className="border-b bg-blue-50 font-semibold cursor-pointer hover:bg-blue-100" onClick={() => toggleGroup(group.id)}>
                      <td className="py-3 px-4">
                        <span className="text-blue-600">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
                      </td>
                      <td className="py-3 px-4">{group.name}</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">{group.totalPercentage}%</td>
                      <td className="py-3 px-4">{group.totalDays} days</td>
                      <td className="py-3 px-4">-</td>
                    </tr>
                    {expandedGroups.has(group.id) && group.allocations.map(alloc => {
                      const project = activeProjects.find(p => p.id === alloc.projectId);
                      return (
                        <tr key={alloc.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 pl-8">{project?.projectName || 'Unknown'}</td>
                          <td className="py-3 px-4">{project?.customerName || '-'}</td>
                          <td className="py-3 px-4">
                            {alloc.year} - {getMonthName(alloc.month)} - S{alloc.sprint}
                          </td>
                          <td className="py-3 px-4">{alloc.allocationPercentage}%</td>
                          <td className="py-3 px-4">{alloc.allocationDays} days</td>
                          <td className="py-3 px-4">
                            {canWrite && (
                              <div className="flex gap-2">
                                <button onClick={() => handleEdit(alloc)} className="text-blue-600 hover:text-blue-700 text-sm">
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(alloc.id)} className="text-red-600 hover:text-red-700 text-sm">
                                  Delete
                                </button>
                              </div>
                            )}
                            {!canWrite && <span className="text-gray-400 text-sm">View Only</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          )}

          {/* Group by Project View */}
          {viewMode === 'project' && (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-8"></th>
                  <th className="text-left py-3 px-4">Project / Product Manager</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Sprint</th>
                  <th className="text-left py-3 px-4">Allocation</th>
                  <th className="text-left py-3 px-4">Days</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedByProject.map(group => (
                  <>
                    <tr key={group.id} className="border-b bg-green-50 font-semibold cursor-pointer hover:bg-green-100" onClick={() => toggleGroup(group.id)}>
                      <td className="py-3 px-4">
                        <span className="text-green-600">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
                      </td>
                      <td className="py-3 px-4">{group.name}</td>
                      <td className="py-3 px-4">{group.customer}</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">{group.totalPercentage}%</td>
                      <td className="py-3 px-4">{group.totalDays} days</td>
                      <td className="py-3 px-4">-</td>
                    </tr>
                    {expandedGroups.has(group.id) && group.allocations.map(alloc => {
                      const pm = activeManagers.find(m => m.id === alloc.productManagerId);
                      return (
                        <tr key={alloc.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 pl-8">{pm?.fullName || 'Unknown'}</td>
                          <td className="py-3 px-4">-</td>
                          <td className="py-3 px-4">
                            {alloc.year} - {getMonthName(alloc.month)} - S{alloc.sprint}
                          </td>
                          <td className="py-3 px-4">{alloc.allocationPercentage}%</td>
                          <td className="py-3 px-4">{alloc.allocationDays} days</td>
                          <td className="py-3 px-4">
                            {canWrite && (
                              <div className="flex gap-2">
                                <button onClick={() => handleEdit(alloc)} className="text-blue-600 hover:text-blue-700 text-sm">
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(alloc.id)} className="text-red-600 hover:text-red-700 text-sm">
                                  Delete
                                </button>
                              </div>
                            )}
                            {!canWrite && <span className="text-gray-400 text-sm">View Only</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          )}

          {filteredAllocations.length === 0 && (
            <div className="text-center py-8 text-gray-500">No allocations found</div>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingId ? 'Edit Allocation' : 'Add Allocation'}>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <Select
            label="Product Manager"
            options={[
              { value: '', label: 'Select PM' },
              ...activeManagers.map(m => ({ value: m.id, label: m.fullName })),
            ]}
            value={formData.productManagerId}
            onChange={(e) => setFormData({ ...formData, productManagerId: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Project</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.projectId}
              onChange={(e) => {
                if (e.target.value === 'NEW_PROJECT') {
                  setShowNewProjectModal(true);
                } else {
                  setFormData({ ...formData, projectId: e.target.value });
                }
              }}
              required
            >
              <option value="">Select Project</option>
              <option value="NEW_PROJECT" className="font-semibold text-blue-600">+ New Project</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.customerName} - {p.projectName}
                </option>
              ))}
            </select>
          </div>
          <Select
            label="Year"
            options={yearOptions}
            value={formData.year.toString()}
            onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
          />
          <Select
            label="Month"
            options={getMonthsInYear().map(m => ({ value: m.toString(), label: getMonthName(m) }))}
            value={formData.month.toString()}
            onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
          />
          <Select
            label="Sprint"
            options={getSprintsInMonth().map(s => ({ value: s.toString(), label: `Sprint ${s}` }))}
            value={formData.sprint.toString()}
            onChange={(e) => setFormData({ ...formData, sprint: Number(e.target.value) })}
          />
          <Input
            label="Allocation Percentage"
            type="number"
            min="0"
            max="100"
            step="5"
            value={formData.allocationPercentage}
            onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })}
            required
          />
          {formData.allocationPercentage && (
            <div className="text-sm text-gray-600">
              = {calculateDaysFromPercentage(Number(formData.allocationPercentage))} days
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            {!editingId && (
              <Button 
                type="button" 
                onClick={(e: any) => handleSubmit(e, true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Add & Add Another
              </Button>
            )}
            <Button type="submit">{editingId ? 'Update' : 'Add & Close'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showWarning} onClose={handleWarningCancel} title="Capacity Warning">
        <div className="space-y-4">
          <div className="text-gray-700">{warningMessage}</div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={handleWarningCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleWarningConfirm}>
              Continue Anyway
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showNewProjectModal} 
        onClose={() => setShowNewProjectModal(false)} 
        title="Create New Project"
      >
        <ProjectForm
          onSuccess={(projectId) => {
            setFormData({ ...formData, projectId });
            setShowNewProjectModal(false);
          }}
          onCancel={() => setShowNewProjectModal(false)}
        />
      </Modal>
    </div>
  );
}
