import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

export default function Setup() {
  const { teamMembers, addTeamMember } = useData();
  const navigate = useNavigate();

  const createDrorUser = () => {
    addTeamMember({
      fullName: 'Dror',
      email: 'drors@comm-it.com',
      role: 'Product Operations Manager',
      isActive: true,
    });
    alert('Dror user created! You can now login with drors@comm-it.com');
    navigate('/login');
  };

  const clearAllData = () => {
    if (confirm('This will delete ALL data. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold mb-6">Setup & Debug</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Current Team Members: {teamMembers.length}</h2>
            {teamMembers.length === 0 ? (
              <p className="text-gray-600">No team members found</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map(m => (
                  <div key={m.id} className="p-2 bg-gray-50 rounded">
                    <div><strong>Name:</strong> {m.fullName}</div>
                    <div><strong>Email:</strong> {m.email}</div>
                    <div><strong>Role:</strong> {m.role}</div>
                    <div><strong>Status:</strong> {m.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <Button onClick={createDrorUser} className="w-full">
              Create Dror User (drors@comm-it.com)
            </Button>
            <Button onClick={() => navigate('/login')} variant="secondary" className="w-full">
              Go to Login
            </Button>
            <Button onClick={clearAllData} variant="danger" className="w-full">
              Clear All Data & Restart
            </Button>
          </div>

          <div className="border-t pt-4 text-sm text-gray-600">
            <p><strong>LocalStorage Data:</strong></p>
            <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto text-xs">
              {JSON.stringify({
                teamMembers: localStorage.getItem('teamMembers'),
                authUser: localStorage.getItem('authUser'),
              }, null, 2)}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
