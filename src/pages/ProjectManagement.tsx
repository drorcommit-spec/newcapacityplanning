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
  const { projects, addProject, updateProject, allocations, teamMembers, addTeamMember } = useData();
  const { canWrite } = usePermissions();
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
    // Check only the CURRENT sprint
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentSprint = now.getDate() <= 15 ? 1 : 2;
    
    return !allocations.some(
      a => a.projectId === projectId && 
           a.year === currentYear && 
           a.month === currentMonth && 
           a.sprint === currentSprint
    );
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
    maxCapacityPercentage: '',
    pmoContact: '',
    latestStatus: '',
    activityCloseDate: '',
    region: '' as ProjectRegion | '',
  });
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [showPMOModal, setShowPMOModal] = useState(false);
  const [newPMOData, setNewPMOData] = useState({ fullName: '', email: '' });
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [showEmailImportModal, setShowEmailImportModal] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [emailImportLoading, setEmailImportLoading] = useState(false);
  const [emailImportResult, setEmailImportResult] = useState<any>(null);

  const existingCustomers = Array.from(new Set(projects.map(p => p.customerName))).sort((a, b) => a.localeCompare(b));

  // Handle URL parameters
  useEffect(() => {
    const status = searchParams.get('status');
    const addNew = searchParams.get('addNew');
    
    if (status) {
      setFilterStatus(status);
    }
    
    if (addNew === 'true' && canWrite) {
      setIsModalOpen(true);
    }
  }, [searchParams, canWrite]);
  const pmoMembers = teamMembers
    .filter(m => m.role === 'PMO' && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  
  const getPMOName = (pmoId: string) => {
    const pmo = teamMembers.find(m => m.id === pmoId);
    return pmo?.fullName || pmoId;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectData = {
      customerId: crypto.randomUUID(),
      customerName: formData.customerName,
      projectName: formData.projectName,
      projectType: formData.projectType,
      status: formData.status,
      maxCapacityPercentage: formData.maxCapacityPercentage ? Number(formData.maxCapacityPercentage) : undefined,
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
      maxCapacityPercentage: '',
      pmoContact: '',
      latestStatus: '',
      activityCloseDate: '',
      region: '',
    });
    setIsNewCustomer(false);
    setEditingId(null);
    setIsModalOpen(false);
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
      maxCapacityPercentage: project.maxCapacityPercentage?.toString() || '',
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const errors: string[] = [];
      let successCount = 0;

      try {
        // Parse CSV
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        // Skip header row
        const dataLines = lines.slice(1);

        dataLines.forEach((line, index) => {
          try {
            // Parse CSV line (handle quoted values)
            const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
            
            if (values.length < 2) {
              errors.push(`Row ${index + 2}: Insufficient data (need at least customer and project)`);
              return;
            }

            const [customer, project, type, status, maxCapacity] = values;

            if (!customer || !project) {
              errors.push(`Row ${index + 2}: Customer and Project are required`);
              return;
            }

            // Validate type
            const projectType = (type && ['AI', 'Software', 'Hybrid'].includes(type)) ? type as ProjectType : 'Software';
            
            // Validate status
            const projectStatus = (status && ['Pending', 'Active', 'Inactive', 'Completed'].includes(status)) ? status as ProjectStatus : 'Pending';

            // Parse max capacity
            const maxCapacityNum = maxCapacity ? parseInt(maxCapacity) : undefined;

            // Add project
            addProject({
              customerId: crypto.randomUUID(),
              customerName: customer,
              projectName: project,
              projectType: projectType,
              status: projectStatus,
              maxCapacityPercentage: maxCapacityNum,
              isArchived: false,
            });

            successCount++;
          } catch (err) {
            errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        });

        setImportResults({ success: successCount, errors });
        
        // Clear file input
        e.target.value = '';
      } catch (err) {
        alert('Error reading file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };

    reader.readAsText(file);
  };

  const handleEmailImport = async () => {
    if (!emailContent.trim()) {
      alert('Please paste email content');
      return;
    }

    setEmailImportLoading(true);
    setEmailImportResult(null);

    try {
      const response = await fetch('http://localhost:3002/api/import/hubspot-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailContent }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import email');
      }

      setEmailImportResult(result);
      setEmailContent('');
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      alert('Error importing email: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setEmailImportLoading(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Customers & Projects</h1>
        {canWrite && (
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import CSV/Excel
              </span>
            </label>
            <Button onClick={() => setShowEmailImportModal(true)} variant="secondary">
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Import from Email
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>Add Project</Button>
          </div>
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
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Region</th>
                <th className="text-left py-3 px-4">Max Capacity</th>
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
                      <span className="text-red-600 text-xl" title="No allocations for current sprint">
                        ❗
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{project.customerName}</td>
                  <td 
                    className="py-3 px-4 cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={() => handleProjectClick(project.id)}
                    title="Click to view allocations"
                  >
                    {project.projectName}
                  </td>
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
                  <td className="py-3 px-4">{project.maxCapacityPercentage ? `${project.maxCapacityPercentage}%` : '-'}</td>
                  <td className="py-3 px-4">{project.activityCloseDate || '-'}</td>
                  <td className="py-3 px-4">{project.pmoContact ? getPMOName(project.pmoContact) : '-'}</td>
                  <td className="py-3 px-4">
                    {canWrite ? (
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
            <Input
              label="Customer Name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
          ) : (
            <Select
              label="Customer Name"
              options={[
                { value: '', label: 'Select Customer' },
                ...existingCustomers.map(c => ({ value: c, label: c })),
              ]}
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
          )}
          
          <Input
            label="Project Name"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            required
          />
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
          <Input
            label="Max Capacity (%) - Multiple PMs can be allocated"
            type="number"
            min="0"
            max="10000"
            step="10"
            value={formData.maxCapacityPercentage}
            onChange={(e) => setFormData({ ...formData, maxCapacityPercentage: e.target.value })}
            placeholder="e.g., 300 for 3 PMs"
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
              {pmoMembers.map(pmo => (
                <option key={pmo.id} value={pmo.id}>
                  {pmo.fullName}
                </option>
              ))}
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

      <Modal isOpen={importResults !== null} onClose={() => setImportResults(null)} title="Import Results">
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded">
            <p className="text-green-800 font-medium">
              Successfully imported {importResults?.success || 0} project(s)
            </p>
          </div>
          
          {importResults && importResults.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded max-h-60 overflow-y-auto">
              <p className="text-red-800 font-medium mb-2">Errors ({importResults.errors.length}):</p>
              <ul className="text-sm text-red-700 space-y-1">
                {importResults.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
            <p className="font-medium mb-2">Expected CSV Format:</p>
            <code className="block bg-white p-2 rounded">
              customer,project,Type,status,Max Capacity<br/>
              Acme Corp,Project Alpha,Software,Active,300<br/>
              TechCo,Platform,AI,Pending,200
            </code>
          </div>
          
          <div className="flex justify-end">
            <Button type="button" onClick={() => setImportResults(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEmailImportModal} onClose={() => setShowEmailImportModal(false)} title="Import from HubSpot Email">
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
            <p className="font-medium mb-2">How to use:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Forward or copy the HubSpot deal notification email</li>
              <li>Paste the entire email content below</li>
              <li>Click "Import" to automatically create the project</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Paste HubSpot email content here..."
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {emailImportResult && (
            <div className="bg-green-50 p-4 rounded">
              <p className="text-green-800 font-medium mb-2">✅ Project Created Successfully!</p>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Customer:</strong> {emailImportResult.project?.customerName}</p>
                <p><strong>Project:</strong> {emailImportResult.project?.projectName}</p>
                <p><strong>Type:</strong> {emailImportResult.project?.projectType}</p>
                <p><strong>Region:</strong> {emailImportResult.project?.region || 'Not specified'}</p>
                {emailImportResult.project?.activityCloseDate && (
                  <p><strong>Close Date:</strong> {new Date(emailImportResult.project.activityCloseDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setShowEmailImportModal(false);
                setEmailContent('');
                setEmailImportResult(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleEmailImport}
              disabled={emailImportLoading || !emailContent.trim()}
            >
              {emailImportLoading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
