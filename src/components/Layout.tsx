import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { APP_VERSION } from '../version';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAllocationsDropdown, setShowAllocationsDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-blue-600">
                Capacity Planning
              </Link>
              <div className="hidden md:flex gap-4">
                <Link to="/" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  Dashboard
                </Link>
                <Link to="/team" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  Team
                </Link>
                <Link to="/projects" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  Projects
                </Link>
                <div 
                  className="relative"
                  onMouseEnter={() => setShowAllocationsDropdown(true)}
                  onMouseLeave={() => setShowAllocationsDropdown(false)}
                >
                  <button className="text-gray-700 hover:text-blue-600 px-3 py-2 flex items-center gap-1">
                    Allocations
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showAllocationsDropdown && (
                    <div className="absolute top-full left-0 mt-0 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <Link 
                        to="/allocations/rawdata" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => setShowAllocationsDropdown(false)}
                      >
                        Allocation Rawdata
                      </Link>
                      <Link 
                        to="/allocations/canvas" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => setShowAllocationsDropdown(false)}
                      >
                        Allocation Board
                      </Link>
                    </div>
                  )}
                </div>
                <Link to="/history" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  History
                </Link>
                <Link to="/capacity-planning" className="text-gray-700 hover:text-blue-600 px-3 py-2 font-semibold">
                  Capacity Planning
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.fullName}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{user.role}</span>
              <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="fixed bottom-0 right-0 p-2">
        <span className="text-xs text-gray-400">v{APP_VERSION}</span>
      </footer>
    </div>
  );
}
