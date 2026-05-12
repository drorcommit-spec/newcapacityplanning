import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { useState } from 'react';
import { APP_VERSION } from '../version';
import { supabase, isSupabaseEnabled } from '../services/supabase';
import bcrypt from 'bcryptjs';
import Chatbot from './Chatbot';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { teamMembers } = useData();
  const { isReadOnly } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Get current user's full data including teams
  const currentMember = teamMembers.find(m => m.id === user?.id);

  const isActive = (path: string) => location.pathname === path;
  const isSettingsActive = ['/members', '/projects', '/roles', '/teams'].includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="w-full px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧩</span>
                    <span className="text-xl font-bold text-gray-900">Puzzle</span>
                  </div>
                  <span className="text-[10px] text-gray-500 -mt-1">Solve Your Capacity Planning</span>
                </div>
              </Link>
              <div className="hidden md:flex gap-4">
                <Link 
                  to="/dashboard" 
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isActive('/dashboard') 
                      ? 'bg-blue-100 text-blue-700 font-semibold' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/capacity-planning" 
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isActive('/capacity-planning') 
                      ? 'bg-blue-100 text-blue-700 font-semibold' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  Capacity Planning
                </Link>
                <Link 
                  to="/history" 
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isActive('/history') 
                      ? 'bg-blue-100 text-blue-700 font-semibold' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  History
                </Link>
                {!isReadOnly && (
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowSettingsDropdown(true)}
                    onMouseLeave={() => setShowSettingsDropdown(false)}
                  >
                    <button 
                      className={`px-3 py-2 rounded-md flex items-center gap-1 transition-colors ${
                        isSettingsActive 
                          ? 'bg-blue-100 text-blue-700 font-semibold' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                      }`}
                    >
                      Settings
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showSettingsDropdown && (
                      <div className="absolute top-full left-0 mt-0 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <Link 
                          to="/members" 
                          className={`block px-4 py-2 text-sm ${
                            isActive('/members')
                              ? 'bg-blue-100 text-blue-700 font-semibold'
                              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setShowSettingsDropdown(false)}
                        >
                          Members
                        </Link>
                        <Link 
                          to="/projects" 
                          className={`block px-4 py-2 text-sm ${
                            isActive('/projects')
                              ? 'bg-blue-100 text-blue-700 font-semibold'
                              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setShowSettingsDropdown(false)}
                        >
                          Projects
                        </Link>
                        <Link 
                          to="/roles" 
                          className={`block px-4 py-2 text-sm ${
                            isActive('/roles')
                              ? 'bg-blue-100 text-blue-700 font-semibold'
                              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setShowSettingsDropdown(false)}
                        >
                          Resource Types
                        </Link>
                        <Link 
                          to="/teams" 
                          className={`block px-4 py-2 text-sm ${
                            isActive('/teams')
                              ? 'bg-blue-100 text-blue-700 font-semibold'
                              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setShowSettingsDropdown(false)}
                        >
                          Teams
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <button onClick={() => { setShowChangePassword(true); setPwdError(''); setPwdSuccess(''); setPwdCurrent(''); setPwdNew(''); setPwdConfirm(''); }}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 hover:underline cursor-pointer" title="Click to change password">
                  {user.fullName}
                </button>
                <span className="text-xs text-gray-500">{user.email}</span>
                {currentMember?.teams && currentMember.teams.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {currentMember.teams.map(team => (
                      <span key={team} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {team}
                      </span>
                    ))}
                  </div>
                )}
                {(!currentMember?.teams || currentMember.teams.length === 0) && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1">
                    No Team (Read-Only)
                  </span>
                )}
              </div>
              <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="w-full px-4 py-4">
        {children}
      </main>
      <footer className="fixed bottom-0 left-0 p-2 z-40">
        <div className="text-xs text-gray-400 bg-white/90 px-2 py-1 rounded shadow-sm border border-gray-200">
          <span className="font-semibold">v{APP_VERSION}</span>
          <span className="ml-2 text-gray-300">|</span>
          <span className="ml-2">{import.meta.env.DEV ? '🟢 Dev' : '🔵 Prod'}</span>
        </div>
      </footer>
      <Chatbot />

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowChangePassword(false)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-[340px]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-400 hover:text-gray-600">{'\u2715'}</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setPwdError(''); setPwdSuccess('');
              if (pwdNew.length < 8) { setPwdError('New password must be at least 8 characters'); return; }
              if (pwdNew !== pwdConfirm) { setPwdError('New passwords do not match'); return; }
              try {
                if (isSupabaseEnabled() && supabase) {
                  // Supabase mode
                  const { data: members, error: fetchErr } = await supabase
                    .from('team_members').select('password_hash').eq('id', user.id).limit(1);
                  if (fetchErr || !members || members.length === 0) { setPwdError('User not found'); return; }
                  const currentHash = members[0].password_hash || bcrypt.hashSync('12345678', 10);
                  if (!bcrypt.compareSync(pwdCurrent, currentHash)) { setPwdError('Current password is incorrect'); return; }
                  const newHash = bcrypt.hashSync(pwdNew, 10);
                  const { error: updateErr } = await supabase.from('team_members').update({ password_hash: newHash }).eq('id', user.id);
                  if (updateErr) { setPwdError('Failed to update: ' + updateErr.message); return; }
                } else {
                  // Local server mode
                  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, currentPassword: pwdCurrent, newPassword: pwdNew }),
                  });
                  const data = await res.json();
                  if (!res.ok) { setPwdError(data.error || 'Failed to change password'); return; }
                }
                setPwdSuccess('Password changed successfully!');
                setTimeout(() => setShowChangePassword(false), 1500);
              } catch { setPwdError('Cannot connect to server'); }
            }} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Current Password</label>
                <input type="password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required
                  className="w-full px-3 py-2 border rounded text-sm" placeholder="Enter current password" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">New Password</label>
                <input type="password" value={pwdNew} onChange={e => setPwdNew(e.target.value)} required minLength={8}
                  className="w-full px-3 py-2 border rounded text-sm" placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Confirm New Password</label>
                <input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required minLength={8}
                  className="w-full px-3 py-2 border rounded text-sm" placeholder="Repeat new password" />
              </div>
              {pwdError && <div className="text-red-600 text-xs bg-red-50 p-2 rounded">{pwdError}</div>}
              {pwdSuccess && <div className="text-green-600 text-xs bg-green-50 p-2 rounded">{pwdSuccess}</div>}
              <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                Change Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
