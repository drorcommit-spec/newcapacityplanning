import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { UserRole } from '../types';
import { getTeams, fetchAllData } from '../services/api';

interface ResourceType {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

export default function TeamManagement() {
  const { teamMembers, addTeamMember, updateTeamMember } = useData();
  const { canManageMembers } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Product Manager' as UserRole,
    teams: [] as string[],
    managerId: '',
  });
  const [emailError, setEmailError] = useState('');
  const [showNewResourceTypeInput, setShowNewResourceTypeInput] = useState(false);
  const [newResourceTypeName, setNewResourceTypeName] = useState('');

  // Load available teams and resource types
  useEffect(() => {
    const loadData = async () => {
      try {
        const teams = await getTeams();
        setAvailableTeams(teams);
        
        const data = await fetchAllData();
        if (data.resourceRoles && data.resourceRoles.length > 0) {
          setResourceTypes(data.resourceRoles);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const directors = teamMembers.filter(m => m.role === 'Product Director' && m.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    // Check for duplicate email
    const duplicateEmail = teamMembers.find(
      m => m.email.toLowerCase() === formData.email.toLowerCase() && m.id !== editingId
    );
    
    if (duplicateEmail) {
      setEmailError('This email is already registered');
      return;
    }
    
    // Convert empty managerId to null for proper JSON serialization
    const memberData = {
      ...formData,
      managerId: formData.managerId || null,
    };
    
    if (editingId) {
      updateTeamMember(editingId, memberData);
    } else {
      addTeamMember({ ...memberData, isActive: true });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', role: 'Product Manager', teams: [], managerId: '' });
    setEmailError('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (member: typeof teamMembers[0]) => {
    setFormData({
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      teams: member.teams || [],
      managerId: member.managerId || '',
    });
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleTeamToggle = (teamName: string) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams.includes(teamName)
        ? prev.teams.filter(t => t !== teamName)
        : [...prev.teams, teamName]
    }));
  };

  const handleDeactivate = (id: string) => {
    updateTeamMember(id, { isActive: false });
  };

  const handleActivate = (id: string) => {
    updateTeamMember(id, { isActive: true });
  };

  // Get active resource types for role options
  const roleOptions = [
    { value: '__create_new__', label: '+ Create New Resource Type' },
    ...resourceTypes
      .filter(rt => !rt.isArchived)
      .map(rt => ({ value: rt.name, label: rt.name }))
  ];

  const roleFilterOptions = [
    { value: 'all', label: 'All Resource Types' },
    ...resourceTypes
      .filter(rt => !rt.isArchived)
      .map(rt => ({ value: rt.name, label: rt.name }))
  ];

  const handleCreateNewResourceType = async () => {
    if (!newResourceTypeName.trim()) {
      alert('Please enter a resource type name');
      return;
    }

    // Check for duplicates
    const duplicate = resourceTypes.find(
      rt => rt.name.toLowerCase() === newResourceTypeName.trim().toLowerCase()
    );
    if (duplicate) {
      alert('This resource type already exists');
      return;
    }

    try {
      const newResourceType: ResourceType = {
        id: crypto.randomUUID(),
        name: newResourceTypeName.trim(),
        isArchived: false,
        createdAt: new Date().toISOString()
      };

      const updatedResourceTypes = [...resourceTypes, newResourceType];
      setResourceTypes(updatedResourceTypes);

      // Save to server using proper API
      const { saveResourceRoles } = await import('../services/api');
      await saveResourceRoles(updatedResourceTypes);

      // Set the new resource type as selected
      setFormData({ ...formData, role: newResourceType.name as UserRole });
      setShowNewResourceTypeInput(false);
      setNewResourceTypeName('');
    } catch (error) {
      console.error('Failed to create resource type:', error);
      alert('Failed to create resource type');
    }
  };

  // Get unique manager IDs who are actually assigned as managers
  const activeManagerIds = new Set(
    teamMembers
      .filter(m => m.managerId)
      .map(m => m.managerId)
  );

  // Get managers who are actually managing someone
  const actualManagers = teamMembers
    .filter(m => m.isActive && activeManagerIds.has(m.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const filteredMembers = teamMembers
    .filter(member => {
      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) return false;
      
      // Manager filter
      if (managerFilter !== 'all') {
        if (managerFilter === 'no-manager') {
          if (member.managerId) return false;
        } else {
          if (member.managerId !== managerFilter) return false;
        }
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = member.fullName.toLowerCase().includes(searchLower);
        const matchesEmail = member.email.toLowerCase().includes(searchLower);
        const matchesTeams = member.teams?.some(t => t.toLowerCase().includes(searchLower));
        if (!matchesName && !matchesEmail && !matchesTeams) return false;
      }
      
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="space-y-6">
      {!canManageMembers && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You have read-only access to this page. Contact an administrator to make changes.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        {canManageMembers && <Button onClick={() => setIsModalOpen(true)}>Add Member</Button>}
      </div>

      <Card>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search by Name"
            placeholder="Search member name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            label="Filter by Resource Type"
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
          <Select
            label="Filter by Manager"
            options={[
              { value: 'all', label: 'All Managers' },
              { value: 'no-manager', label: 'No Manager' },
              ...actualManagers.map(m => ({ value: m.id, label: m.fullName }))
            ]}
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Resource Type</th>
                <th className="text-left py-3 px-4">Manager</th>
                <th className="text-left py-3 px-4">Teams</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => {
                const manager = member.managerId ? teamMembers.find(m => m.id === member.managerId) : null;
                
                return (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{member.fullName}</td>
                  <td className="py-3 px-4">{member.email}</td>
                  <td className="py-3 px-4">{member.role}</td>
                  <td className="py-3 px-4">
                    {canManageMembers ? (
                      <select
                        value={member.managerId || ''}
                        onChange={(e) => updateTeamMember(member.id, { managerId: e.target.value || null })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No Manager</option>
                        {teamMembers
                          .filter(m => m.isActive && m.id !== member.id)
                          .sort((a, b) => a.fullName.localeCompare(b.fullName))
                          .map(m => (
                            <option key={m.id} value={m.id}>
                              {m.fullName}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span>{manager ? manager.fullName : '-'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {member.teams && member.teams.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {member.teams.map(team => (
                          <span key={team} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {team}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {canManageMembers ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(member)} className="text-blue-600 hover:text-blue-700 text-sm">
                          Edit
                        </button>
                        {member.isActive ? (
                          <button onClick={() => handleDeactivate(member.id)} className="text-red-600 hover:text-red-700 text-sm">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(member.id)} className="text-green-600 hover:text-green-700 text-sm">
                            Activate
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">View Only</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {roleFilter === 'all' ? 'No team members yet' : `No members with resource type: ${roleFilter}`}
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingId ? 'Edit Team Member' : 'Add Team Member'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          {emailError && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {emailError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            {showNewResourceTypeInput ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newResourceTypeName}
                    onChange={(e) => setNewResourceTypeName(e.target.value)}
                    placeholder="Enter new resource type name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewResourceType}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewResourceTypeInput(false);
                      setNewResourceTypeName('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={formData.role}
                onChange={(e) => {
                  if (e.target.value === '__create_new__') {
                    setShowNewResourceTypeInput(true);
                  } else {
                    setFormData({ ...formData, role: e.target.value as UserRole });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Manager Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager (optional)
            </label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Manager</option>
              {teamMembers
                .filter(m => m.isActive && m.id !== editingId)
                .sort((a, b) => a.fullName.localeCompare(b.fullName))
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} {member.role ? `(${member.role})` : ''}
                  </option>
                ))}
            </select>
          </div>
          
          {/* Multi-select Teams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teams (select multiple)
            </label>
            {availableTeams.length > 0 ? (
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-gray-50">
                {availableTeams.map(team => (
                  <label key={team} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.teams.includes(team)}
                      onChange={() => handleTeamToggle(team)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">{team}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">
                No teams available. Create teams in the Teams Management screen.
              </div>
            )}
            {formData.teams.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {formData.teams.map(team => (
                  <span key={team} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1">
                    {team}
                    <button
                      type="button"
                      onClick={() => handleTeamToggle(team)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
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
    </div>
  );
}
