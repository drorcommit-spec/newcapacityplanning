import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { usePermissions } from '../hooks/usePermissions';
import { fetchAllData, saveTeams } from '../services/api';

interface Team {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

export default function TeamsManagement() {
  const { canWrite } = usePermissions();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  useEffect(() => {
    fetchAllData()
      .then(data => {
        if (data.teams && data.teams.length > 0) {
          setTeams(data.teams);
        }
        setTeamsLoaded(true);
      })
      .catch(error => {
        console.error('Failed to load teams:', error);
        setTeamsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!teamsLoaded) return;
    
    saveTeams(teams).catch(error => {
      console.error('Failed to save teams:', error);
    });
  }, [teams, teamsLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setError('Team name is required');
      return;
    }

    const duplicate = teams.find(
      t => t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editingId
    );
    if (duplicate) {
      setError('A team with this name already exists');
      return;
    }

    if (editingId) {
      setTeams(teams.map(t => t.id === editingId ? { ...t, name: trimmedName } : t));
    } else {
      const newTeam: Team = {
        id: crypto.randomUUID(),
        name: trimmedName,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      setTeams([...teams, newTeam]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setTeamName('');
  };

  const handleEdit = (team: Team) => {
    setEditingId(team.id);
    setTeamName(team.name);
    setError('');
    setIsModalOpen(true);
  };

  const handleArchive = (id: string) => {
    setTeams(teams.map(t => t.id === id ? { ...t, isArchived: true } : t));
  };

  const handleUnarchive = (id: string) => {
    setTeams(teams.map(t => t.id === id ? { ...t, isArchived: false } : t));
  };

  const handleAdd = () => {
    setEditingId(null);
    setTeamName('');
    setError('');
    setIsModalOpen(true);
  };

  const activeTeams = teams.filter(t => !t.isArchived);
  const archivedTeams = teams.filter(t => t.isArchived);
  const displayTeams = showArchived ? archivedTeams : activeTeams;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-1">Manage team names for member assignment</p>
        </div>
        {canWrite && (
          <Button onClick={handleAdd}>
            Add Team
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={!showArchived ? 'primary' : 'secondary'}
          onClick={() => setShowArchived(false)}
        >
          Active ({activeTeams.length})
        </Button>
        <Button
          variant={showArchived ? 'primary' : 'secondary'}
          onClick={() => setShowArchived(true)}
        >
          Archived ({archivedTeams.length})
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Team Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                {canWrite && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayTeams.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    {showArchived ? 'No archived teams' : 'No teams yet. Click "Add Team" to create one.'}
                  </td>
                </tr>
              ) : (
                displayTeams.map(team => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {team.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {!team.isArchived && (
                          <button
                            onClick={() => handleEdit(team)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        )}
                        {team.isArchived ? (
                          <button
                            onClick={() => handleUnarchive(team.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(team.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
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
          setTeamName('');
          setError('');
        }}
        title={editingId ? 'Edit Team' : 'Add Team'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Input
            label="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g., Product Team, Engineering Team"
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setTeamName('');
                setError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Save Changes' : 'Add Team'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
