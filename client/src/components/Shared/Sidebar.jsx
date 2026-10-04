import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { 
  LayoutDashboard,
  Code2, 
  GitBranch,
  History, 
  Radar,
  BarChart3, 
  Award,
  BookOpen,
  Users, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Plus,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Sidebar = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const { 
    workspaces, 
    activeWorkspace, 
    fetchWorkspaces, 
    setActiveWorkspace, 
    createWorkspace 
  } = useWorkspaceStore();

  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showCreateWsInput, setShowCreateWsInput] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    try {
      await createWorkspace(newWsName, 'Team engineering workspace');
      setNewWsName('');
      setShowCreateWsInput(false);
      toast.success('Workspace created successfully!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={17} /> },
    { name: 'Code Review', path: '/review', icon: <Code2 size={17} /> },
    { name: 'Repositories', path: '/repositories', icon: <GitBranch size={17} /> },
    { name: 'Review History', path: '/history', icon: <History size={17} /> },
    { name: 'Impact Radar', path: '/impact-radar', icon: <Radar size={17} /> },
    { name: 'Quality Analytics', path: '/analytics', icon: <BarChart3 size={17} /> },
    { name: 'Learning & Skills', path: '/skill-growth', icon: <Award size={17} /> },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: <BookOpen size={17} /> },
    { name: 'Workspace Members', path: '/workspace', icon: <Users size={17} /> },
    { name: 'Configuration', path: '/settings', icon: <Settings size={17} /> },
  ];

  return (
    <aside className="w-60 bg-bg-1 border-r border-border flex flex-col h-screen select-none z-20 font-body">
      {/* Brand Logo */}
      <div className="h-14 border-b border-border flex items-center px-5 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-extrabold text-bg-0 text-base shadow-lg shadow-accent/20">
          CL
        </div>
        <div className="flex flex-col">
          <span className="font-display font-extrabold text-base text-text-1 tracking-wider leading-none">
            CodeLens
          </span>
          <span className="text-[9px] text-text-2 font-mono tracking-widest uppercase mt-0.5">
            AI Code Radar
          </span>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3.5 py-3 border-b border-border relative">
        <label className="text-[9px] uppercase font-bold tracking-widest text-text-2 block mb-1">
          Active Workspace
        </label>
        <button
          onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          className="w-full flex items-center justify-between bg-bg-2 hover:bg-border border border-border px-3 py-1.5 rounded-lg text-xs text-text-1 font-medium transition-colors"
        >
          <span className="truncate flex items-center gap-2">
            <Briefcase size={13} className="text-accent" />
            {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
          </span>
          <ChevronDown size={13} className="text-text-2" />
        </button>

        {showWorkspaceDropdown && (
          <div className="absolute left-3.5 right-3.5 mt-1 bg-bg-2 border border-border rounded-lg shadow-2xl z-30 max-h-60 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws._id}
                onClick={() => {
                  setActiveWorkspace(ws);
                  setShowWorkspaceDropdown(false);
                  toast.success(`Active workspace: ${ws.name}`);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-border text-text-1 font-medium transition-colors truncate flex items-center gap-2 ${activeWorkspace?._id === ws._id ? 'border-l-2 border-accent bg-bg-1 font-bold text-accent' : ''}`}
              >
                {ws.name}
              </button>
            ))}
            
            <div className="border-t border-border p-2">
              {showCreateWsInput ? (
                <form onSubmit={handleCreateWorkspace} className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Workspace name..."
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="w-full bg-bg-0 border border-border px-2 py-1 rounded text-xs text-text-1 focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  <button type="submit" className="bg-accent text-bg-0 px-2 py-1 rounded text-xs font-bold hover:bg-accent/80">
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowCreateWsInput(true)}
                  className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-border hover:border-text-2 rounded text-[11px] text-text-2 hover:text-text-1 font-semibold transition-colors"
                >
                  <Plus size={12} /> New Workspace
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-bg-2 text-accent border-l-2 border-accent pl-2.5 shadow-sm'
                  : 'text-text-2 hover:bg-bg-2/70 hover:text-text-1'
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-3.5 border-t border-border flex items-center justify-between gap-3 bg-bg-0/30">
        <NavLink to="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1 group">
          <img
            src={user?.avatar ? `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${user.avatar}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=CodeLens'}
            alt="User avatar"
            className="w-7 h-7 rounded-full border border-border group-hover:border-accent bg-bg-2 object-cover"
          />
          <div className="truncate">
            <p className="text-xs font-bold text-text-1 group-hover:text-accent truncate leading-none">
              {user?.name || 'Developer'}
            </p>
            <p className="text-[10px] text-text-2 truncate mt-0.5">
              {user?.email || 'dev@codelens.io'}
            </p>
          </div>
        </NavLink>
        <button
          onClick={() => {
            logout();
            navigate('/login');
            toast.success('Logged out successfully');
          }}
          title="Sign Out"
          className="text-text-2 hover:text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-all"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
