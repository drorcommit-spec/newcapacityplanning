import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import bcrypt from 'bcryptjs';
import Button from '../components/Button';
import Input from '../components/Input';
import { APP_VERSION } from '../version';
import { supabase, isSupabaseEnabled } from '../services/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { teamMembers } = useData();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      if (isSupabaseEnabled() && supabase) {
        // Supabase mode: fetch password_hash from DB
        const { data: members, error: fetchErr } = await supabase
          .from('team_members')
          .select('id, full_name, email, role, is_active, password_hash')
          .ilike('email', email.trim())
          .limit(1);

        if (fetchErr) { setError('Database error: ' + fetchErr.message); return; }
        if (!members || members.length === 0) { setError('Email not found'); return; }

        const member = members[0];
        if (!member.is_active) { setError('Account is inactive'); return; }

        // If no password hash, use default
        const hash = member.password_hash || bcrypt.hashSync('12345678', 10);
        const valid = bcrypt.compareSync(password, hash);

        if (!valid) { setError('Invalid password'); return; }

        // If member had no hash, save the default one
        if (!member.password_hash) {
          await supabase.from('team_members').update({ password_hash: hash }).eq('id', member.id);
        }

        login({ id: member.id, fullName: member.full_name, email: member.email, role: member.role });
        navigate('/');
      } else {
        // Local server mode
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Login failed'); return; }
        login({ id: data.user.id, fullName: data.user.fullName, email: data.user.email, role: data.user.role });
        navigate('/');
      }
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
          <p className="text-center text-gray-600 text-sm">Solves Your Capacity Planning</p>
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
