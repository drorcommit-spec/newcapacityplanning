import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { UserRole } from '../types';

interface Role {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

export default function TeamManagement() {
  const { teamMembers, addTeamMember, updateTeamMember } = useData();
  const { canWrite } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRole, setSearchRole] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Product Manager' as UserRole,
    teams: [] as string[],
    managerId: '',
    capacity: 100,
  });
  const [emailError, setEmailError] = useState('');
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [roleError, setRoleError] = useState('');
  const [isCreatingNewTeam, setIsCreatingNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  // Load roles from server
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const { fetchAllData } = await import('../services/api');
        const data = await fetchAllData();
        if (data.resourceRoles && data.resourceRoles.length > 0) {
          setAvailableRoles(data.resourceRoles);
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };
    loadRoles();
    
    // Reload roles periodically to catch updates from RoleManagement
    const interval = setInterval(loadRoles, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get all unique roles from RoleManagement system
  const getExistingRoles = () => {
    return availableRoles
      .filter(r => !r.isArchived)
      .map(r => r.name)
      .sort();
  };

  // Get all unique teams from existing team members
  const getExistingTeams = () => {
    const teams = teamMembers
      .flatMap(m => m.teams || [])
      .filter(t => t && t.trim() !== '') as string[];
    return Array.from(new Set(teams)).sort();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setRoleError('');
    setTeamError('');
    
    // Check for duplicate email
    const duplicateEmail = teamMembers.find(
      m => m.email.toLowerCase() === formData.email.toLowerCase() && m.id !== editingId
    );
    
    if (duplicateEmail) {
      setEmailError('This email is already registered');
      return;
    }

    // If creating a new role, validate and save it
    let finalRole = formData.role;
    if (isCreatingNewRole) {
      const trimmedRole = newRoleName.trim();
      if (!trimmedRole) {
        setRoleError('Resource type name cannot be empty');
        return;
      }
      
      // Check if role already exists (case-insensitive)
      const existingRoles = getExistingRoles();
      const roleExists = existingRoles.some(
        r => r.toLowerCase() === trimmedRole.toLowerCase()
      );
      
      if (roleExists) {
        setRoleError('This resource type already exists');
        return;
      }
      
      // Save new role to RoleManagement system
      const newRole: Role = {
        id: crypto.randomUUID(),
        name: trimmedRole,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      const updatedRoles = [...availableRoles, newRole];
      setAvailableRoles(updatedRoles);
      localStorage.setItem('resourceRoles', JSON.stringify(updatedRoles));
      
      finalRole = trimmedRole;
    }

    // If creating a new team, validate it
    let finalTeams = formData.teams;
    if (isCreatingNewTeam) {
      const trimmedTeam = newTeamName.trim();
      if (!trimmedTeam) {
        setTeamError('Team name cannot be empty');
        return;
      }
      
      // Check if team already exists (case-insensitive)
      const existingTeams = getExistingTeams();
      const teamExists = existingTeams.some(
        t => t.toLowerCase() === trimmedTeam.toLowerCase()
      );
      
      if (teamExists) {
        setTeamError('This team already exists');
        return;
      }
      
      finalTeams = [trimmedTeam];
    }
    
    if (editingId) {
      updateTeamMember(editingId, { ...formData, role: finalRole, teams: finalTeams });
    } else {
      addTeamMember({ ...formData, role: finalRole, teams: finalTeams, isActive: true });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', role: 'Product Manager', teams: [], managerId: '', capacity: 100 });
    setEmailError('');
    setRoleError('');
    setTeamError('');
    setIsCreatingNewRole(false);
    setNewRoleName('');
    setIsCreatingNewTeam(false);
    setNewTeamName('');
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
      capacity: member.capacity ?? 100,
    });
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleDeactivate = (id: string) => {
    updateTeamMember(id, { isActive: false });
  };

  const handleActivate = (id: string) => {
    updateTeamMember(id, { isActive: true });
  };

  const existingRoles = getExistingRoles();
  const roleOptions = [
    ...existingRoles.map(role => ({ value: role, label: role })),
    { value: '__CREATE_NEW__', label: '+ Create New Resource Type' },
  ];

  const roleFilterOptions = [
    { value: 'all', label: 'All Resource Types' },
    ...existingRoles.map(role => ({ value: role, label: role })),
  ];

  const filteredMembers = teamMembers
    .filter(member => {
      // Active/Inactive filter
      if (!showInactive && !member.isActive) return false;
      
      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) return false;
      
      // Search by name filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = member.fullName.toLowerCase().includes(searchLower);
        const matchesEmail = member.email.toLowerCase().includes(searchLower);
        const matchesTeam = member.teams?.some(t => t.toLowerCase().includes(searchLower));
        if (!matchesName && !matchesEmail && !matchesTeam) return false;
      }
      
      // Search by role filter
      if (searchRole) {
        const roleLower = searchRole.toLowerCase();
        if (!member.role.toLowerCase().includes(roleLower)) return false;
      }
      
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const existingTeams = getExistingTeams();
  const teamOptions = [
    { value: '', label: 'No Team' },
    ...existingTeams.map(team => ({ value: team, label: team })),
    { value: '__CREATE_NEW__', label: '+ Create New Team' },
  ];

  // Manager options - all active members except the one being edited
  const managerOptions = [
    { value: '', label: 'No Manager' },
    ...teamMembers
      .filter(m => m.isActive && m.id !== editingId)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(m => ({ value: m.id, label: m.fullName })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        {canWrite && <Button onClick={() => setIsModalOpen(true)}>Add Member</Button>}
      </div>

      <Card>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search by Name/Email/Team"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Input
            label="Search by Resource Type"
            placeholder="Search resource type..."
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
          />
          <Select
            label="Filter by Resource Type"
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Show inactive members</span>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Resource Type</th>
                <th className="text-left py-3 px-4">Manager</th>
                <th className="text-left py-3 px-4">Team</th>
                <th className="text-left py-3 px-4">Capacity</th>
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
                    <td className="py-3 px-4">{manager ? manager.fullName : '-'}</td>
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
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{member.capacity ?? 100}%</span>
                    </td>
                    <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                    </td>
                    <td className="py-3 px-4">
                      {canWrite ? (
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
            <Select
              label="Resource Type"
              options={roleOptions}
              value={isCreatingNewRole ? '__CREATE_NEW__' : formData.role}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setIsCreatingNewRole(true);
                  setNewRoleName('');
                  setRoleError('');
                } else {
                  setIsCreatingNewRole(false);
                  setNewRoleName('');
                  setRoleError('');
                  setFormData({ ...formData, role: e.target.value as UserRole });
                }
              }}
            />
            {isCreatingNewRole && (
              <div className="mt-2">
                <Input
                  label="New Resource Type Name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Enter resource type name..."
                  required
                />
                {roleError && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded mt-1">
                    {roleError}
                  </div>
                )}
              </div>
            )}
          </div>
          <Select
            label="Manager"
            options={managerOptions}
            value={formData.managerId}
            onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Member's available capacity (0-100%). Default is 100%.</p>
          </div>
          <div>
            <Select
              label="Team"
              options={teamOptions}
              value={isCreatingNewTeam ? '__CREATE_NEW__' : (formData.teams.length > 0 ? formData.teams[0] : '')}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setIsCreatingNewTeam(true);
                  setNewTeamName('');
                  setTeamError('');
                } else {
                  setIsCreatingNewTeam(false);
                  setNewTeamName('');
                  setTeamError('');
                  setFormData({ ...formData, teams: e.target.value ? [e.target.value] : [] });
                }
              }}
            />
            {isCreatingNewTeam && (
              <div className="mt-2">
                <Input
                  label="New Team Name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  required
                />
                {teamError && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded mt-1">
                    {teamError}
                  </div>
                )}
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
