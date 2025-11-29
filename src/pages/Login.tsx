import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { APP_VERSION } from '../version';

export default function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { teamMembers } = useData();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) return;

    const member = teamMembers.find(m => m.email.toLowerCase() === email.toLowerCase() && m.isActive);
    
    if (!member) {
      setError('Email not found or account is inactive. Please contact your administrator.');
      return;
    }
    
    login({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
    });
    
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">🧩</span>
            <h1 className="text-3xl font-bold text-gray-900">Puzzle</h1>
          </div>
          <p className="text-center text-gray-600 text-sm">Solve Your Capacity Planning</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
        <p className="text-sm text-gray-600 text-center mt-4">
          Use your registered email to login
        </p>
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => alert('Coming soon! Sign up functionality will be available in the next release.')}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Need to create an account? Sign Up.
          </button>
        </div>
      </div>
      
      {/* Version and Credit */}
      <div className="mt-8 text-center space-y-2">
        <p className="text-xs text-gray-400">Version {APP_VERSION}</p>
        <p className="text-sm text-gray-500">by Dror Shem-Tov</p>
      </div>
    </div>
  );
}
