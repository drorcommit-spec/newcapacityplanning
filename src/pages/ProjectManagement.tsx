import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { ProjectType, ProjectStatus, ProjectRegion } from '../types';

export default function ProjectManagement() {
  const { projects, addProject, updateProject, allocations, teamMembers, addTeamMember, sprintProjects } = useData();
  const { canManageProjects } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getNextSprints = (count: number) => {
    const sprints = [];
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let sprint = now.getDate() <= 15 ? 1 : 2;
    
    for (let i = 0; i < count; i++) {
      sprints.push({ year, month, sprint });
      sprint++;
      if (sprint > 2) {
        sprint = 1;
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
    return sprints;
  };

  const isProjectUnallocated = (projectId: string) => {
    // Check if project is NOT assigned to any current or future sprints
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentSprint = now.getDate() <= 15 ? 1 : 2;
    const currentDate = new Date(currentYear, currentMonth - 1, currentSprint === 1 ? 1 : 16);
    
    // Check if project has any allocations in current or future sprints
    const hasCurrentOrFutureAllocations = allocations.some(a => {
      if (a.projectId !== projectId) return false;
      
      // Compare sprint dates
      const allocDate = new Date(a.year, a.month - 1, a.sprint === 1 ? 1 : 16);
      
      // Return true if allocation is in current or future sprint
      return allocDate >= currentDate;
    });
    
    if (hasCurrentOrFutureAllocations) return false;
    
    // Also check sprintProjects (projects explicitly assigned to sprints)
    if (sprintProjects) {
      for (const [sprintKey, projectIds] of Object.entries(sprintProjects)) {
        if (projectIds.includes(projectId)) {
          // Parse sprint key format: "year-month-sprint"
          const [year, month, sprint] = sprintKey.split('-').map(Number);
          const sprintDate = new Date(year, month - 1, sprint === 1 ? 1 : 16);
          
          // If project is in current or future sprint, it's assigned
          if (sprintDate >= currentDate) {
            return false;
          }
        }
      }
    }
    
    return true;
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    projectName: '',
    projectType: 'Software' as ProjectType,
    status: 'Pending' as ProjectStatus,
    pmoContact: '',
    latestStatus: '',
    activityCloseDate: '',
    region: '' as ProjectRegion | '',
  });
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [showPMOModal, setShowPMOModal] = useState(false);
  const [newPMOData, setNewPMOData] = useState({ fullName: '', email: '' });
  const [customerError, setCustomerError] = useState('');
  const [projectError, setProjectError] = useState('');

  const existingCustomers = Array.from(new Set(projects.map(p => p.customerName))).sort((a, b) => a.localeCompare(b));

  // Handle URL parameters
  useEffect(() => {
    const status = searchParams.get('status');
    const addNew = searchParams.get('addNew');
    
    if (status) {
      setFilterStatus(status);
    }
    
    if (addNew === 'true' && canManageProjects) {
      setIsModalOpen(true);
    }
  }, [searchParams, canManageProjects]);
  // Separate PMO and non-PMO members, both sorted alphabetically
  const pmoMembers = teamMembers
    .filter(m => m.role === 'PMO' && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  
  const otherMembers = teamMembers
    .filter(m => m.role !== 'PMO' && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  
  const getPMOName = (pmoId: string) => {
    const pmo = teamMembers.find(m => m.id === pmoId);
    return pmo?.fullName || pmoId;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError('');
    setProjectError('');

    const trimmedCustomer = formData.customerName.trim();
    const trimmedProject = formData.projectName.trim();

    if (!trimmedCustomer || !trimmedProject) {
      if (!trimmedCustomer) setCustomerError('Customer name is required');
      if (!trimmedProject) setProjectError('Project name is required');
      return;
    }

    // Check for duplicate customer + project combination (case-insensitive)
    const duplicateProject = projects.find(
      p => p.id !== editingId &&
           p.customerName.toLowerCase() === trimmedCustomer.toLowerCase() &&
           p.projectName.toLowerCase() === trimmedProject.toLowerCase()
    );

    if (duplicateProject) {
      setProjectError(`Project "${trimmedProject}" already exists for customer "${trimmedCustomer}"`);
      return;
    }

    const projectData = {
      customerId: crypto.randomUUID(),
      customerName: trimmedCustomer,
      projectName: trimmedProject,
      projectType: formData.projectType,
      status: formData.status,
      pmoContact: formData.pmoContact || undefined,
      latestStatus: formData.latestStatus || undefined,
      activityCloseDate: formData.activityCloseDate || undefined,
      region: formData.region || undefined,
      isArchived: false,
    };

    if (editingId) {
      updateProject(editingId, projectData);
    } else {
      addProject(projectData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      projectName: '',
      projectType: 'Software',
      status: 'Pending',
      pmoContact: '',
      latestStatus: '',
      activityCloseDate: '',
      region: '',
    });
    setIsNewCustomer(false);
    setEditingId(null);
    setIsModalOpen(false);
    setCustomerError('');
    setProjectError('');
  };

  const handleCreatePMO = () => {
    if (!newPMOData.fullName || !newPMOData.email) return;
    
    addTeamMember({
      fullName: newPMOData.fullName,
      email: newPMOData.email,
      role: 'PMO',
      isActive: true,
    });
    
    setShowPMOModal(false);
    setNewPMOData({ fullName: '', email: '' });
    alert('PMO member created! Please select them from the dropdown.');
  };

  const handleEdit = (project: typeof projects[0]) => {
    setFormData({
      customerName: project.customerName,
      projectName: project.projectName,
      projectType: project.projectType,
      status: project.status,
      pmoContact: project.pmoContact || '',
      latestStatus: project.latestStatus || '',
      activityCloseDate: project.activityCloseDate || '',
      region: project.region || '',
    });
    setEditingId(project.id);
    setIsModalOpen(true);
  };

  const handleArchive = (id: string) => {
    updateProject(id, { isArchived: true });
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/allocations/canvas?view=capacity&mode=project&projects=${projectId}`);
  };

  const filteredProjects = projects
    .filter(p => {
      if (p.isArchived) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterType !== 'all' && p.projectType !== filterType) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesProject = p.projectName.toLowerCase().includes(searchLower);
        const matchesCustomer = p.customerName.toLowerCase().includes(searchLower);
        if (!matchesProject && !matchesCustomer) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const customerCompare = a.customerName.localeCompare(b.customerName);
      if (customerCompare !== 0) return customerCompare;
      return a.projectName.localeCompare(b.projectName);
    });

  const typeOptions = [
    { value: 'AI', label: 'AI' },
    { value: 'Software', label: 'Software' },
    { value: 'Hybrid', label: 'Hybrid' },
  ];

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        {canManageProjects && (
          <Button onClick={() => setIsModalOpen(true)}>Add Project</Button>
        )}
      </div>

      <Card>
        <div className="flex gap-4 mb-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by project or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select
            label="Filter by Status"
            options={[
              { value: 'all', label: 'All Statuses' },
              ...statusOptions,
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
          <Select
            label="Filter by Type"
            options={[
              { value: 'all', label: 'All Types' },
              ...typeOptions,
            ]}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Alert</th>
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Region</th>
                <th className="text-left py-3 px-4">Close Date</th>
                <th className="text-left py-3 px-4">PMO Contact</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => (
                <tr key={project.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">
                    {project.status === 'Active' && isProjectUnallocated(project.id) && (
                      <span className="text-red-600 text-xl" title="Not assigned to any current or future sprint">
                        ❗
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {project.projectName}
                  </td>
                  <td className="py-3 px-4">{project.customerName}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {project.projectType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      project.status === 'Active' ? 'bg-green-100 text-green-800' :
                      project.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{project.region || '-'}</td>
                  <td className="py-3 px-4">{project.activityCloseDate || '-'}</td>
                  <td className="py-3 px-4">{project.pmoContact ? getPMOName(project.pmoContact) : '-'}</td>
                  <td className="py-3 px-4">
                    {canManageProjects ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(project)} className="text-blue-600 hover:text-blue-700 text-sm">
                          Edit
                        </button>
                        <button onClick={() => handleArchive(project.id)} className="text-red-600 hover:text-red-700 text-sm">
                          Archive
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-gray-500">No projects found</div>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingId ? 'Edit Project' : 'Add Project'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Project Name"
              value={formData.projectName}
              onChange={(e) => {
                setFormData({ ...formData, projectName: e.target.value });
                setProjectError('');
              }}
              required
            />
            {projectError && (
              <p className="text-red-600 text-sm mt-1">{projectError}</p>
            )}
          </div>

          {existingCustomers.length > 0 && !editingId && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewCustomer(false)}
                className={`px-3 py-1 rounded text-sm ${!isNewCustomer ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Existing Customer
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className={`px-3 py-1 rounded text-sm ${isNewCustomer ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                New Customer
              </button>
            </div>
          )}
          
          {isNewCustomer || editingId ? (
            <div>
              <Input
                label="Customer Name"
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({ ...formData, customerName: e.target.value });
                  setCustomerError('');
                }}
                required
              />
              {customerError && (
                <p className="text-red-600 text-sm mt-1">{customerError}</p>
              )}
            </div>
          ) : (
            <div>
              <Select
                label="Customer Name"
                options={[
                  { value: '', label: 'Select Customer' },
                  ...existingCustomers.map(c => ({ value: c, label: c })),
                ]}
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({ ...formData, customerName: e.target.value });
                  setCustomerError('');
                }}
                required
              />
              {customerError && (
                <p className="text-red-600 text-sm mt-1">{customerError}</p>
              )}
            </div>
          )}
          <Select
            label="Project Type"
            options={typeOptions}
            value={formData.projectType}
            onChange={(e) => setFormData({ ...formData, projectType: e.target.value as ProjectType })}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">PMO Contact</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.pmoContact}
              onChange={(e) => {
                if (e.target.value === 'NEW_PMO') {
                  setShowPMOModal(true);
                } else {
                  setFormData({ ...formData, pmoContact: e.target.value });
                }
              }}
            >
              <option value="">Select PMO Contact</option>
              <option value="NEW_PMO" className="font-semibold text-blue-600">+ New PMO Contact</option>
              {pmoMembers.length > 0 && (
                <optgroup label="PMO Resources">
                  {pmoMembers.map(pmo => (
                    <option key={pmo.id} value={pmo.id}>
                      {pmo.fullName}
                    </option>
                  ))}
                </optgroup>
              )}
              {otherMembers.length > 0 && (
                <optgroup label="Other Resources">
                  {otherMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Latest Status/Notes</label>
            <textarea
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.latestStatus}
              onChange={(e) => setFormData({ ...formData, latestStatus: e.target.value })}
            />
          </div>
          
          <Input
            label="Activity Close Date"
            type="date"
            value={formData.activityCloseDate}
            onChange={(e) => setFormData({ ...formData, activityCloseDate: e.target.value })}
          />
          
          <Select
            label="Region"
            options={[
              { value: '', label: 'Select Region' },
              { value: 'UK', label: 'UK' },
              { value: 'US', label: 'US' },
              { value: 'Canada', label: 'Canada' },
              { value: 'Israel', label: 'Israel' },
            ]}
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value as ProjectRegion | '' })}
          />
          
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showPMOModal} onClose={() => setShowPMOModal(false)} title="Create New PMO Contact">
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={newPMOData.fullName}
            onChange={(e) => setNewPMOData({ ...newPMOData, fullName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={newPMOData.email}
            onChange={(e) => setNewPMOData({ ...newPMOData, email: e.target.value })}
            required
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowPMOModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreatePMO}>
              Create PMO
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
