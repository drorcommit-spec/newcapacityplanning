import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { usePermissions } from '../hooks/usePermissions';
import { fetchAllData, saveResourceRoles } from '../services/api';

interface Role {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

export default function RoleManagement() {
  const { canManageResourceTypes } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [rolesLoaded, setRolesLoaded] = useState(false);

  // Load roles from server
  useEffect(() => {
    fetchAllData()
      .then(data => {
        if (data.resourceRoles && data.resourceRoles.length > 0) {
          setRoles(data.resourceRoles);
        } else {
          // Initialize with default roles if none exist
          const defaultRoles: Role[] = [
            { id: '1', name: 'VP Product', isArchived: false, createdAt: new Date().toISOString() },
            { id: '2', name: 'Product Director', isArchived: false, createdAt: new Date().toISOString() },
            { id: '3', name: 'Product Manager', isArchived: false, createdAt: new Date().toISOString() },
            { id: '4', name: 'Product Operations Manager', isArchived: false, createdAt: new Date().toISOString() },
            { id: '5', name: 'PMO', isArchived: false, createdAt: new Date().toISOString() },
          ];
          setRoles(defaultRoles);
        }
        setRolesLoaded(true);
      })
      .catch(error => {
        console.error('Failed to load roles:', error);
        setRolesLoaded(true);
      });
  }, []);

  // Save roles to server whenever they change
  useEffect(() => {
    if (!rolesLoaded || roles.length === 0) return;
    
    saveResourceRoles(roles).catch(error => {
      console.error('Failed to save roles:', error);
    });
  }, [roles, rolesLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = roleName.trim();
    if (!trimmedName) {
      setError('Resource type name is required');
      return;
    }

    // Check for duplicate names
    const duplicate = roles.find(
      r => r.name.toLowerCase() === trimmedName.toLowerCase() && r.id !== editingId
    );
    if (duplicate) {
      setError('A resource type with this name already exists');
      return;
    }

    if (editingId) {
      // Update existing role
      setRoles(roles.map(r => r.id === editingId ? { ...r, name: trimmedName } : r));
    } else {
      // Create new role
      const newRole: Role = {
        id: crypto.randomUUID(),
        name: trimmedName,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      setRoles([...roles, newRole]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setRoleName('');
  };

  const handleEdit = (role: Role) => {
    setEditingId(role.id);
    setRoleName(role.name);
    setError('');
    setIsModalOpen(true);
  };

  const handleArchive = (id: string) => {
    if (confirm('Archive this resource type? It will no longer appear in dropdowns.')) {
      setRoles(roles.map(r => r.id === id ? { ...r, isArchived: true } : r));
    }
  };

  const handleUnarchive = (id: string) => {
    setRoles(roles.map(r => r.id === id ? { ...r, isArchived: false } : r));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setRoleName('');
    setError('');
    setIsModalOpen(true);
  };

  const filteredRoles = roles
    .filter(r => showArchived || !r.isArchived)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {!canManageResourceTypes && (
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
        <h1 className="text-3xl font-bold text-gray-900">Resource Types</h1>
        {canManageResourceTypes && <Button onClick={openCreateModal}>Create Resource Type</Button>}
      </div>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Manage resource types used throughout the platform
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show Archived
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource Type Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {canManageResourceTypes && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoles.map((role) => (
                <tr key={role.id} className={role.isArchived ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      role.isArchived 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {role.isArchived ? 'Archived' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </td>
                  {canManageResourceTypes && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {!role.isArchived && (
                          <>
                            <button
                              onClick={() => handleEdit(role)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleArchive(role.id)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              Archive
                            </button>
                          </>
                        )}
                        {role.isArchived && (
                          <button
                            onClick={() => handleUnarchive(role.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Unarchive
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredRoles.length === 0 && (
                <tr>
                  <td colSpan={canManageResourceTypes ? 4 : 3} className="px-6 py-4 text-center text-gray-500">
                    No resource types found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setRoleName('');
          setError('');
        }}
        title={editingId ? 'Edit Resource Type' : 'Create New Resource Type'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Resource Type Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g., Designer, Developer, QA Engineer"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setRoleName('');
                setError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
