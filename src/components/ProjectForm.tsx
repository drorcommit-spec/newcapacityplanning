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
    maxCapacityPercentage: '',
    pmoContact: '',
    latestStatus: '',
  });

  const existingCustomers = Array.from(new Set(projects.map(p => p.customerName))).sort((a, b) => a.localeCompare(b));
  const pmoMembers = teamMembers
    .filter(m => m.role === 'PMO' && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

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
      isArchived: false,
    };

    const newProjectId = crypto.randomUUID();
    addProject({ ...projectData, id: newProjectId } as any);
    
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
