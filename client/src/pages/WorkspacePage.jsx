import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { Users, Mail, UserPlus, Trash2, Shield, User, Briefcase, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import LeaderboardPage from './LeaderboardPage';

export const WorkspacePage = () => {
  const currentUser = useAuthStore((state) => state.user);
  
  const { 
    activeWorkspace, 
    inviteMember, 
    removeMember,
    fetchWorkspaces 
  } = useWorkspaceStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'leaderboard'

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <Briefcase className="mx-auto text-accent animate-pulse" size={36} />
        <h3 className="text-sm font-bold text-text-1">No Workspace Selected</h3>
        <p className="text-xs text-text-2">Use the switcher on the sidebar to choose or create a team workspace.</p>
      </div>
    );
  }

  // Check if current user is admin/owner
  const isOwner = activeWorkspace.ownerId === currentUser?._id || activeWorkspace.ownerId?._id === currentUser?._id;
  const userMember = activeWorkspace.members?.find(m => m.userId === currentUser?._id || m.userId?._id === currentUser?._id);
  const isAdmin = isOwner || userMember?.role === 'admin';

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await inviteMember(email, role);
      setEmail('');
      setRole('developer');
      toast.success(`Invite sent successfully to ${email}`);
    } catch (error) {
      toast.error(error.message || 'Invitation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId, memberName) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      try {
        await removeMember(userId);
        toast.success(`${memberName} has been removed.`);
      } catch (error) {
        toast.error(error.message || 'Failed to remove member');
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Workspace Summary Box */}
      <div className="bg-bg-1 border border-border p-6 rounded-lg shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Briefcase className="text-accent2" size={18} />
          <h2 className="text-lg font-bold text-text-1 font-display">{activeWorkspace.name}</h2>
        </div>
        <p className="text-xs text-text-2">
          {activeWorkspace.description || 'No description provided for this team workspace.'}
        </p>
        <div className="text-[10px] text-text-2 pt-2">
          Owner: <span className="text-text-1 font-semibold">{activeWorkspace.ownerId?.name || 'Administrator'}</span>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'roster' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-text-2 hover:text-text-1'
          }`}
        >
          <Users size={14} /> Team Roster & Invites
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'leaderboard' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-text-2 hover:text-text-1'
          }`}
        >
          <Award size={14} /> Code Health Leaderboard
        </button>
      </div>

      {activeTab === 'leaderboard' ? (
        <LeaderboardPage />
      ) : (
        /* Grid: Members list & Invite panels */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Members Roster Table */}
          <div className="lg:col-span-2 bg-bg-1 border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border bg-bg-2/30 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-2">
                <Users size={14} className="text-accent" /> Team Members ({activeWorkspace.members?.length || 1})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-2 border-b border-border text-text-2 uppercase font-bold text-[10px] tracking-widest">
                    <th className="px-6 py-3">Member Details</th>
                    <th className="px-6 py-3">Access Level</th>
                    {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-1">
                  {activeWorkspace.members?.map((member) => {
                    const mUser = member.userId;
                    if (!mUser) return null;
                    
                    const isCurrentMemberOwner = activeWorkspace.ownerId === mUser._id || activeWorkspace.ownerId?._id === mUser._id;

                    return (
                      <tr key={mUser._id} className="hover:bg-bg-2/20">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <img
                            src={mUser.avatar ? `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${mUser.avatar}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=CodeLens'}
                            alt="Member avatar"
                            className="w-8 h-8 rounded-full border border-border bg-bg-2"
                          />
                          <div>
                            <p className="font-bold text-text-1">{mUser.name}</p>
                            <p className="text-[10px] text-text-2">{mUser.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${isCurrentMemberOwner ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : member.role === 'admin' ? 'bg-red-500/10 text-red-300 border-red-500/20' : member.role === 'reviewer' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
                            {isCurrentMemberOwner ? <Shield size={10} /> : null}
                            {isCurrentMemberOwner ? 'Owner' : member.role}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            {!isCurrentMemberOwner && mUser._id !== currentUser?._id && (
                              <button
                                onClick={() => handleRemove(mUser._id, mUser.name)}
                                className="text-text-2 hover:text-danger p-1 rounded transition-colors"
                                title="Revoke Membership"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite Member Drawer */}
          <div className="bg-bg-1 border border-border rounded-lg p-6 shadow-xl h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-2 border-b border-border pb-2">
              <UserPlus size={14} className="text-accent2" /> Add Team Member
            </h3>

            {isAdmin ? (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs text-text-2 font-semibold block mb-1">Developer Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-text-2" size={14} />
                    <input
                      type="email"
                      placeholder="teammate@codelens.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-bg-2 border border-border rounded pl-9 pr-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-2 font-semibold block mb-1">Workspace Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent capitalize"
                  >
                    <option value="developer">Developer (read only reviews)</option>
                    <option value="reviewer">Reviewer (comment/runs audits)</option>
                    <option value="admin">Administrator (full control)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-accent text-bg-0 hover:bg-accent/80 transition-all py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  Send Invite
                </button>
              </form>
            ) : (
              <div className="py-6 text-center text-xs text-text-2 flex flex-col items-center gap-2">
                <Shield size={24} className="text-warning" />
                <span>Workspace invitations are restricted to Administrators.</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default WorkspacePage;
