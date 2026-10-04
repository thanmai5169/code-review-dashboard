import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Sun, Moon, Bell, Check, Trash } from 'lucide-react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export const Navbar = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateProfile);

  const [theme, setTheme] = useState(localStorage.getItem('codelens_theme') || 'dark');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Derive page name from route
  const getPageName = () => {
    switch (location.pathname) {
      case '/': return 'Engineering Quality Dashboard';
      case '/review': return 'Code Review Workspace';
      case '/repositories': return 'GitHub Repositories & Pull Requests';
      case '/impact-radar': return 'Code Change Impact Radar';
      case '/history': return 'Review History & Snippets';
      case '/workspace': return 'Workspace Team Roster';
      case '/analytics': return 'Code Quality Analytics';
      case '/skill-growth': return 'Skill Growth & Developer Progress';
      case '/knowledge-base': return 'Team Knowledge Wiki';
      case '/leaderboard': return 'Engineering Leaderboard';
      case '/time-machine': return 'Code Time Machine';
      case '/settings': return 'System Configuration';
      case '/profile': return 'User Profile';
      default: return 'CodeLens AI Platform';
    }
  };

  // Sync theme to DOM element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('codelens_theme', theme);
  }, [theme]);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const response = await API.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.warn('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Read notification
  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  // Clear notifications
  const clearAllNotifications = async () => {
    try {
      await API.delete('/notifications');
      setNotifications([]);
      toast.success('Notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (user) {
      updateUser({ preferences: { theme: nextTheme } }).catch(() => {});
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-14 bg-bg-1 border-b border-border px-6 flex items-center justify-between select-none z-10 font-body">
      <h2 className="text-sm font-bold text-text-1 font-display">
        {getPageName()}
      </h2>

      <div className="flex items-center gap-4">
        {/* Telemetry status indicator */}
        <span className="inline-flex items-center gap-1.5 text-xs text-text-2 bg-bg-0 border border-border px-2.5 py-1 rounded-md">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          System Live
        </span>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="text-text-2 hover:text-text-1 hover:bg-bg-2 p-2 rounded-lg transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) fetchNotifications();
            }}
            className="text-text-2 hover:text-text-1 hover:bg-bg-2 p-2 rounded-lg relative transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-bg-2 border border-border rounded-xl shadow-2xl z-30 max-h-96 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-1">
                <span className="text-xs font-bold text-text-1">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-[10px] text-danger hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Trash size={10} /> Clear All
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 max-h-72 divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-text-2">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n._id} 
                      className={`px-4 py-3 text-xs flex items-start gap-2 transition-colors ${n.read ? 'opacity-60 bg-bg-0/30' : 'bg-accent2/5'}`}
                    >
                      <div className="flex-1">
                        <p className="text-text-1 font-medium">{n.message}</p>
                        <span className="text-[10px] text-text-2 block mt-1 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n._id)}
                          title="Mark as Read"
                          className="text-accent hover:bg-bg-0 p-0.5 rounded transition-colors"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
