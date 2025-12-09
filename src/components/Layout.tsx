import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { useState } from 'react';
import { APP_VERSION } from '../version';
import Chatbot from './Chatbot';

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  to="/" 
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isActive('/') 
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
                <span className="text-sm font-medium text-gray-700">{user.fullName}</span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
}
