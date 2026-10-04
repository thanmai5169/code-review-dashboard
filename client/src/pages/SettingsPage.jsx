import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { Settings, Save, AlertTriangle, Plus, Trash, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import PreCommitSetup from '../components/Shared/PreCommitSetup';

export const SettingsPage = () => {
  const currentUser = useAuthStore((state) => state.user);
  
  const { 
    activeWorkspace, 
    updateCustomRules,
    fetchWorkspaces 
  } = useWorkspaceStore();

  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Load rules when activeWorkspace changes
  useEffect(() => {
    if (activeWorkspace) {
      setRules(activeWorkspace.customRules || []);
    }
  }, [activeWorkspace]);

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <Settings className="mx-auto text-accent animate-pulse" size={36} />
        <h3 className="text-sm font-bold text-text-1">No Workspace Configured</h3>
        <p className="text-xs text-text-2">Create or choose a team workspace to customize review audit parameters.</p>
      </div>
    );
  }

  // Check administration credentials
  const isOwner = activeWorkspace.ownerId === currentUser?._id || activeWorkspace.ownerId?._id === currentUser?._id;
  const userMember = activeWorkspace.members?.find(m => m.userId === currentUser?._id || m.userId?._id === currentUser?._id);
  const isAdmin = isOwner || userMember?.role === 'admin';

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!newRule.trim()) return;

    if (rules.includes(newRule.trim())) {
      return toast.error('Rule already exists');
    }

    setRules([...rules, newRule.trim()]);
    setNewRule('');
  };

  const handleRemoveRule = (indexToRemove) => {
    setRules(rules.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveRules = async () => {
    setLoading(true);
    try {
      await updateCustomRules(rules);
      toast.success('Workspace custom review rules saved!');
    } catch (error) {
      toast.error('Failed to update guidelines');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="bg-bg-1 border border-border p-6 rounded-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-1 font-display flex items-center gap-2">
            <Settings className="text-accent" size={18} /> Review Rules Configurator
          </h2>
          <p className="text-xs text-text-2 mt-1">
            Feed custom instructions directly to the Gemini AI engine. These guidelines will enforce coding standards across scans in <span className="text-accent font-semibold">"{activeWorkspace.name}"</span>.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSaveRules}
            disabled={loading}
            className="bg-accent text-bg-0 hover:bg-accent/80 transition-all px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-accent/15"
          >
            <Save size={14} /> Save Guidelines
          </button>
        )}
      </div>

      {/* Rules Manager layout */}
      <div className="bg-bg-1 border border-border rounded-lg p-6 shadow-xl space-y-6">
        
        {/* Rules Input form */}
        {isAdmin ? (
          <form onSubmit={handleAddRule} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Always prefer async/await over promises.then() callbacks"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              className="flex-grow bg-bg-2 border border-border rounded px-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="bg-accent2 text-bg-0 hover:bg-accent2/85 px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            >
              <Plus size={14} /> Add Instruction
            </button>
          </form>
        ) : (
          <div className="bg-warning/15 border border-warning/25 p-3.5 rounded text-xs text-warning flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>View Only Mode:</strong> Guidelines are locked. Only Workspace Administrators can modify the review instructions.
            </p>
          </div>
        )}

        {/* Rules listing cards */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-widest text-text-2 block">
            Custom Guidelines ({rules.length})
          </label>

          {rules.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded text-center text-xs text-text-2">
              No custom review rules declared yet. Add standard guidelines to direct the AI reviewers.
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div 
                  key={idx} 
                  className="bg-bg-2 border border-border p-3.5 rounded flex items-center justify-between gap-3 text-xs text-text-1 group"
                >
                  <div className="flex gap-2 items-start leading-relaxed">
                    <Check className="text-success shrink-0 mt-0.5" size={14} />
                    <span>{rule}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="text-text-2 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Delete Guideline"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <PreCommitSetup apiKey={currentUser?.integrationKey} />

    </div>
  );
};

export default SettingsPage;
