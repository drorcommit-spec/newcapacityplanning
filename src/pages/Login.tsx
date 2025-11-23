import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Button from '../components/Button';
import Input from '../components/Input';

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Product Capacity Planning</h1>
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
      </div>
      
      {/* Credit */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">by Dror Shem-Tov</p>
      </div>
    </div>
  );
}
