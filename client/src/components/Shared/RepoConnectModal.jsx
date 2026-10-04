import React, { useState, useEffect } from 'react';
import { useReviewStore } from '../../store/reviewStore';
import { useAuthStore } from '../../store/authStore';
import API from '../../services/api';
import { GitBranch, GitPullRequest, Search, FileCode, Check, RefreshCw, Key, Github, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export const RepoConnectModal = ({ isOpen, onClose }) => {
  const { analyzePullRequest } = useReviewStore();
  const { user, fetchMe } = useAuthStore();
  const [repos, setRepos] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null); // { owner, name }
  const [loading, setLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [patToken, setPatToken] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);
  const [oauthStatus, setOauthStatus] = useState({ configured: false });

  const isConnected = Boolean(user?.githubAccessToken || user?.githubId);

  // Fetch repositories if connected
  const fetchRepos = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const response = await API.get('/github/repos');
      setRepos(response.data || []);
    } catch (error) {
      console.warn('Failed to load GitHub repos in modal:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      API.get('/auth/github/status')
        .then(res => setOauthStatus(res.data))
        .catch(() => setOauthStatus({ configured: false }));

      if (isConnected) {
        fetchRepos();
      }
      setSelectedRepo(null);
      setPulls([]);
    }
  }, [isOpen, user]);

  const handleOAuthConnect = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const localToken = localStorage.getItem('codelens_token') || '';
    window.location.href = `${socketUrl}/api/auth/github?token=${encodeURIComponent(localToken)}&from=modal`;
  };

  const handleLinkPat = async (e) => {
    e.preventDefault();
    if (!patToken.trim()) return;

    setLoading(true);
    try {
      await API.post('/github/link-pat', { pat: patToken.trim() });
      toast.success('GitHub Personal Access Token connected!');
      setPatToken('');
      setShowPatInput(false);
      await fetchMe();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Personal Access Token');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = async (repo) => {
    setLoading(true);
    setSelectedRepo({ owner: repo.owner.login, name: repo.name });
    try {
      const response = await API.get(`/github/pulls/${repo.owner.login}/${repo.name}`);
      setPulls(response.data || []);
    } catch (error) {
      toast.error('Error fetching repo pull requests');
      setSelectedRepo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPull = async (pull) => {
    onClose();
    try {
      toast.loading(`Auditing PR #${pull.number}: ${pull.title}...`, { id: 'pr_audit' });
      await analyzePullRequest(selectedRepo.owner, selectedRepo.name, pull.number, null);
      toast.success('PR Code Review & Impact Radar complete!', { id: 'pr_audit' });
    } catch (error) {
      toast.error(error.message || 'PR analysis failed', { id: 'pr_audit' });
    }
  };

  if (!isOpen) return null;

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-body">
      <div className="w-full max-w-xl bg-bg-1 border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-bg-1">
          <h3 className="text-sm font-bold text-text-1 font-display flex items-center gap-2">
            <GitBranch size={16} className="text-accent" /> Connect GitHub Pull Request
          </h3>
          <button onClick={onClose} className="text-text-2 hover:text-text-1 text-xs">
            ✕
          </button>
        </div>

        {!isConnected ? (
          /* Connect Account Prompt */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
              <Github size={28} />
            </div>
            <h4 className="text-sm font-bold text-text-1">GitHub Account Not Linked</h4>
            <p className="text-xs text-text-2 max-w-sm mx-auto leading-relaxed">
              Connect your GitHub account to browse repositories and audit Pull Requests directly within CodeLens.
            </p>

            {showPatInput ? (
              <form onSubmit={handleLinkPat} className="space-y-3 max-w-sm mx-auto pt-2 text-left">
                <div>
                  <label className="text-[11px] font-semibold text-text-2 block mb-1">GitHub Personal Access Token</label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    className="w-full bg-bg-2 border border-border rounded px-3 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent font-mono"
                    required
                    autoFocus
                  />
                  <p className="text-[10px] text-text-2 mt-1">Requires classic token with <code className="text-accent">repo</code> scope.</p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPatInput(false)}
                    className="bg-bg-2 hover:bg-border text-text-1 px-3 py-1.5 rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !patToken.trim()}
                    className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50"
                  >
                    {loading ? 'Validating...' : 'Save & Connect'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
                {oauthStatus.configured && (
                  <button
                    onClick={handleOAuthConnect}
                    className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow"
                  >
                    <Github size={14} /> Connect with GitHub OAuth
                  </button>
                )}
                <button
                  onClick={() => setShowPatInput(true)}
                  className="bg-bg-2 border border-border hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Key size={14} /> Enter Personal Access Token (PAT)
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search / Context info */}
            <div className="p-4 bg-bg-2 border-b border-border flex items-center justify-between">
              {!selectedRepo ? (
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 text-text-2" size={14} />
                  <input
                    type="text"
                    placeholder="Search repository..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full bg-bg-0 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <div className="flex justify-between w-full items-center">
                  <span className="text-xs font-semibold text-text-1">
                    Repo: <span className="text-accent font-mono">{selectedRepo.owner}/{selectedRepo.name}</span>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRepo(null);
                      setPulls([]);
                    }}
                    className="text-[11px] text-accent hover:underline font-semibold"
                  >
                    ← Back to Repositories
                  </button>
                </div>
              )}
            </div>

            {/* Lists Area */}
            <div className="flex-1 overflow-y-auto min-h-[320px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <RefreshCw size={20} className="text-accent animate-spin" />
                  <span className="text-xs text-text-2">Fetching GitHub contents...</span>
                </div>
              ) : !selectedRepo ? (
                filteredRepos.length === 0 ? (
                  <div className="text-center py-20 text-xs text-text-2">No repositories found.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo)}
                        className="w-full text-left px-6 py-3.5 hover:bg-bg-2/50 flex items-center justify-between group transition-colors"
                      >
                        <div className="space-y-0.5 truncate max-w-[360px]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-1 group-hover:text-accent truncate">
                              {repo.name}
                            </span>
                            {repo.private ? <Lock size={10} className="text-text-2" /> : <Globe size={10} className="text-text-2" />}
                          </div>
                          <p className="text-[10px] text-text-2 truncate">
                            {repo.description || 'No description provided'}
                          </p>
                        </div>
                        <span className="text-[10px] text-text-2 group-hover:text-accent font-semibold">
                          Select →
                        </span>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                pulls.length === 0 ? (
                  <div className="text-center py-20 text-xs text-text-2">No open Pull Requests found for this repository.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {pulls.map((pull) => (
                      <button
                        key={pull.id}
                        onClick={() => handleSelectPull(pull)}
                        className="w-full text-left px-6 py-3.5 hover:bg-bg-2/50 flex items-center justify-between group transition-colors gap-3"
                      >
                        <div className="flex gap-3 items-start truncate">
                          <GitPullRequest size={16} className="text-success shrink-0 mt-0.5" />
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-text-1 group-hover:text-success truncate">
                              #{pull.number} {pull.title}
                            </h4>
                            <p className="text-[10px] text-text-2 mt-0.5">
                              Opened by: <span className="text-text-1">{pull.user.login}</span> | Branch: <span className="font-mono text-accent">{pull.head.ref}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-bg-0 bg-accent hover:bg-accent/85 font-bold px-2.5 py-1 rounded shadow shrink-0">
                          Audit PR
                        </span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default RepoConnectModal;
