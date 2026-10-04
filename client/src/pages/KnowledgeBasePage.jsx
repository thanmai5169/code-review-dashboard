import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import API from '../services/api';
import Editor from '@monaco-editor/react';
import { BookOpen, Pin, PinOff, Search, Eye, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const KnowledgeBasePage = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const currentUser = useAuthStore((state) => state.user);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(''); // '' | 'bug' | 'security' | 'performance' | 'style'

  const fetchWiki = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const response = await API.get(`/workspaces/${activeWorkspace._id}/knowledge-base`, {
        params: { category, search }
      });
      setEntries(response.data || []);
    } catch (err) {
      console.warn('Failed to load wiki knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWiki();
  }, [activeWorkspace, category]); // Re-fetch on workspace or category changes

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWiki();
  };

  const handlePinToggle = async (entryId) => {
    if (!activeWorkspace) return;
    try {
      const response = await API.put(`/workspaces/${activeWorkspace._id}/knowledge-base/${entryId}/pin`);
      toast.success(response.data.message || 'Updated pin status');
      // Update locally
      setEntries(prev => prev.map(e => e._id === entryId ? { ...e, isPinned: response.data.entry.isPinned } : e));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle pin state');
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3 font-body">
        <BookOpen className="mx-auto text-accent animate-pulse" size={36} />
        <h3 className="text-sm font-bold text-text-1">No Workspace Selected</h3>
        <p className="text-xs text-text-2">Use the switcher on the sidebar to select a workspace and build your team wiki.</p>
      </div>
    );
  }

  // Check if current user is admin/owner
  const isOwner = activeWorkspace.ownerId === currentUser?._id || activeWorkspace.ownerId?._id === currentUser?._id;
  const userMember = activeWorkspace.members?.find(m => m.userId === currentUser?._id || m.userId?._id === currentUser?._id);
  const isAdmin = isOwner || userMember?.role === 'admin';

  const categoryLabels = {
    bug: '🐛 Bugs',
    security: '🛡️ Security',
    performance: '⚡ Performance',
    style: '🎨 Style Guide',
    intent_mismatch: '⚠️ Intent Mismatch'
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 select-none font-body">
      
      {/* Page Header */}
      <div className="bg-bg-1 border border-border p-6 rounded-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-1 font-display flex items-center gap-2">
            <BookOpen className="text-accent" size={18} /> Workspace Team Knowledge Base
          </h2>
          <p className="text-xs text-text-2 mt-1">
            Gemini synthesizes recurring patterns found in reviews into common wiki guidelines.
          </p>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <div className="bg-bg-1 border border-border rounded-lg p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-text-2" size={14} />
          <input
            type="text"
            placeholder="Search wiki articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-2 border border-border rounded pl-9 pr-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent"
          />
        </form>

        {/* Category Filters */}
        <div className="flex bg-bg-2 rounded p-0.5 border border-border overflow-x-auto max-w-full">
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1 rounded text-xs font-semibold shrink-0 ${category === '' ? 'bg-accent text-bg-0' : 'text-text-2 hover:text-text-1'}`}
          >
            All Entries
          </button>
          {Object.keys(categoryLabels).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-semibold shrink-0 ${category === cat ? 'bg-accent text-bg-0' : 'text-text-2'}`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Card list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <RefreshCw className="text-accent animate-spin" size={24} />
          <span className="text-xs text-text-2">Fetching team guidelines...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-20 border border-dashed border-border rounded-lg text-center text-xs text-text-2">
          No wiki patterns matched yet. Submit more review scans in <strong>"{activeWorkspace.name}"</strong> to build guidelines!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entries.map((entry) => {
            const isRecent = new Date() - new Date(entry.createdAt) < 7 * 24 * 60 * 60 * 1000;
            return (
              <div 
                key={entry._id} 
                className={`bg-bg-1 border rounded-lg p-5 shadow-xl flex flex-col justify-between gap-4 transition-all hover:scale-[1.01] hover:border-accent/40 ${
                  entry.isPinned ? 'border-accent/30 bg-accent/2' : 'border-border'
                }`}
              >
                
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border border-accent2/25 bg-accent2/10 text-accent2">
                      {categoryLabels[entry.category] || entry.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Pinned status badge */}
                      {entry.isPinned && <Pin size={12} className="text-accent shrink-0" />}
                      
                      {/* Recency badge */}
                      {isRecent && <span className="bg-success/15 border border-success/30 text-success text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">New</span>}
                      
                      {/* Pinned toggle for admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handlePinToggle(entry._id)}
                          className="text-text-2 hover:text-accent transition-colors"
                          title={entry.isPinned ? 'Unpin Entry' : 'Pin Entry'}
                        >
                          {entry.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-extrabold text-text-1 leading-snug">
                    {entry.title}
                  </h4>
                  <p className="text-xs text-text-2 leading-relaxed">
                    {entry.description}
                  </p>
                </div>

                {/* Code proposal box */}
                {entry.codeExample && (
                  <div className="border border-border rounded overflow-hidden h-36 bg-bg-2">
                    <Editor
                      height="100%"
                      value={entry.codeExample}
                      language="javascript"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 10.5,
                        theme: 'vs-dark',
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        automaticLayout: true
                      }}
                    />
                  </div>
                )}

                {/* Footer details */}
                <div className="border-t border-border/60 pt-3 flex items-center justify-between text-[10px] text-text-2">
                  <span className="bg-bg-2 px-2 py-0.5 border border-border rounded font-mono">
                    Seen in {entry.occurrenceCount} reviews
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Eye size={10} /> Created: {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default KnowledgeBasePage;
