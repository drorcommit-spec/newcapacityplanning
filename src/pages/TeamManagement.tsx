import { useState } from 'react';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { UserRole } from '../types';

export default function TeamManagement() {
  const { teamMembers, addTeamMember, updateTeamMember } = useData();
  const { canWrite } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Product Manager' as UserRole,
    team: '',
  });
  const [emailError, setEmailError] = useState('');

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
    
    if (editingId) {
      updateTeamMember(editingId, formData);
    } else {
      addTeamMember({ ...formData, isActive: true });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', role: 'Product Manager', team: '' });
    setEmailError('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (member: typeof teamMembers[0]) => {
    setFormData({
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      team: member.team || '',
    });
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleDeactivate = (id: string) => {
    updateTeamMember(id, { isActive: false });
  };

  const roleOptions = [
    { value: 'VP Product', label: 'VP Product' },
    { value: 'Product Director', label: 'Product Director' },
    { value: 'Product Manager', label: 'Product Manager' },
    { value: 'Product Operations Manager', label: 'Product Operations Manager' },
    { value: 'PMO', label: 'PMO' },
  ];

  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    ...roleOptions,
  ];

  const filteredMembers = teamMembers
    .filter(member => {
      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = member.fullName.toLowerCase().includes(searchLower);
        const matchesEmail = member.email.toLowerCase().includes(searchLower);
        const matchesTeam = member.team?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesEmail && !matchesTeam) return false;
      }
      
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const teamOptions = [
    { value: '', label: 'No Team' },
    ...directors.map(d => ({ value: d.fullName, label: d.fullName })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        {canWrite && <Button onClick={() => setIsModalOpen(true)}>Add Team Member</Button>}
      </div>

      <Card>
        <div className="mb-4">
          <Select
            label="Filter by Role"
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Team</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{member.fullName}</td>
                  <td className="py-3 px-4">{member.email}</td>
                  <td className="py-3 px-4">{member.role}</td>
                  <td className="py-3 px-4">{member.team || '-'}</td>
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
                        {member.isActive && (
                          <button onClick={() => handleDeactivate(member.id)} className="text-red-600 hover:text-red-700 text-sm">
                            Deactivate
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {roleFilter === 'all' ? 'No team members yet' : `No members with role: ${roleFilter}`}
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
          <Select
            label="Role"
            options={roleOptions}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
          />
          {(formData.role === 'Product Manager' || formData.role === 'Product Operations Manager') && (
            <Select
              label={formData.role === 'Product Manager' ? 'Product Director' : 'Team'}
              options={teamOptions}
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            />
          )}
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
