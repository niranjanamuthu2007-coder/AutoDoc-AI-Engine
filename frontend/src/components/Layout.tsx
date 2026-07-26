import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRepository } from '../context/RepositoryContext';
import { 
  LayoutDashboard, 
  Code2, 
  MessageSquare, 
  FileDown, 
  LogOut, 
  Layers, 
  ChevronDown, 
  FolderGit2, 
  Activity 
} from 'lucide-react';
interface LayoutProps {
  children: React.ReactNode;
}
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { repositories, activeRepo, setActiveRepoById, isLoading } = useRepository();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const navItems = [
    { name: 'AI Workspace', path: '/workspace', icon: LayoutDashboard },
    { name: 'API Analysis', path: '/analysis', icon: Code2, disabled: !activeRepo },
    { name: 'AI Chat Space', path: '/chat', icon: MessageSquare, disabled: !activeRepo },
    { name: 'Reports', path: '/reports', icon: FileDown, disabled: !activeRepo },
  ];
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Section */}
      <aside className="w-64 bg-darkSidebar text-slate-300 flex flex-col justify-between border-r border-slate-900/50 flex-shrink-0 z-30">
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-glow">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">AutoDoc AI</h1>
              <span className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">Platform Engine</span>
            </div>
          </div>
          {/* Repository Selector Dropdown */}
          <div className="p-4 border-b border-slate-800/40 relative">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-2 px-1">Selected Repository</span>
            {isLoading ? (
              <div className="h-10 bg-slate-800/30 rounded-lg animate-pulse"></div>
            ) : repositories.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-900/40 border border-slate-800/50 p-2.5 rounded-lg text-center font-medium">
                No repositories scanned.
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/60 transition-all border border-slate-800/50 p-2.5 rounded-lg text-left"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderGit2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-200 truncate">{activeRepo?.name}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* Dropdown Container */}
                {dropdownOpen && (
                  <div className="absolute left-4 right-4 top-[78px] mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                    <div className="max-h-48 overflow-y-auto">
                      {repositories.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => {
                            setActiveRepoById(repo.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-800 transition-colors flex items-center justify-between ${
                            activeRepo?.id === repo.id ? 'bg-slate-800/70 text-white font-bold' : 'text-slate-400'
                          }`}
                        >
                          <span className="truncate mr-2">{repo.name}</span>
                          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-brand-900/60 text-brand-300 border border-brand-800/30">
                            {repo.framework || 'Python'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.disabled ? '#' : item.path}
                  onClick={(e) => item.disabled && e.preventDefault()}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      item.disabled 
                        ? 'opacity-40 cursor-not-allowed text-slate-600' 
                        : isActive && location.pathname === item.path
                          ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20 shadow-glow font-semibold' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`
                  }
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        {/* Footer: User Details + Logout Button */}
        <div className="p-4 border-t border-slate-800/60 space-y-3">
          {user && (
            <div className="flex items-center gap-3 bg-slate-900/20 p-2.5 rounded-lg border border-slate-800/20">
              <img 
                src={user.picture || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
                alt="Profile" 
                className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-red-950/20 hover:text-red-400 transition-colors p-2.5 rounded-lg border border-slate-800 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden bg-workspaceBg">
        {/* Workspace Sub Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700">Active Workspace</span>
            {activeRepo && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded">
                  {activeRepo.name}
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-brand-100 text-brand-700 px-2 py-0.5 rounded border border-brand-200/30">
                  {activeRepo.framework}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
              v1.0.0 Stable
            </span>
          </div>
        </header>
        {/* Content Body Slot */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
