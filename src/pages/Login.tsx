import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { APP_VERSION } from '../version';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      login({
        id: data.user.id,
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.role,
      });
      navigate('/');
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">{'\u{1F9E9}'}</span>
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
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          Default password for new users: 12345678
        </p>
      </div>
      <div className="mt-8 text-center space-y-2">
        <p className="text-xs text-gray-400">
          Version {APP_VERSION} {import.meta.env.DEV ? '(Local Dev)' : '(Production)'}
        </p>
        <p className="text-sm text-gray-500">by Dror Shem-Tov</p>
      </div>
    </div>
  );
}
