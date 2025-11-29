import { useState } from 'react';
import { useData } from '../context/DataContext';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Modal from './Modal';
import { ProjectType, ProjectStatus } from '../types';

interface ProjectFormProps {
  onSuccess?: (projectId: string) => void;
  onCancel?: () => void;
}

export default function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
  const { projects, addProject, teamMembers, addTeamMember } = useData();
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [showPMOModal, setShowPMOModal] = useState(false);
  const [newPMOData, setNewPMOData] = useState({ fullName: '', email: '' });
  const [formData, setFormData] = useState({
    customerName: '',
    projectName: '',
    projectType: 'Software' as ProjectType,
    status: 'Pending' as ProjectStatus,
    pmoContact: '',
    latestStatus: '',
  });
  const [customerError, setCustomerError] = useState('');
  const [projectError, setProjectError] = useState('');

  const existingCustomers = Array.from(new Set(projects.map(p => p.customerName))).sort((a, b) => a.localeCompare(b));
  
  // Separate PMO and non-PMO members, both sorted alphabetically
  const pmoMembers = teamMembers
    .filter(m => m.role === 'PMO' && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  
  const otherMembers = teamMembers
    .filter(m => m.role !== 'PMO' && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

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
      p => p.customerName.toLowerCase() === trimmedCustomer.toLowerCase() &&
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
      isArchived: false,
    };

    const newProjectId = addProject(projectData as any);
    
    if (onSuccess) {
      onSuccess(newProjectId);
    }
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
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {existingCustomers.length > 0 && (
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
        
        {isNewCustomer ? (
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
        
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit">Create Project</Button>
        </div>
      </form>

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
    </>
  );
}
