import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { useReviewStore } from '../store/reviewStore';
import { useAuthStore } from '../store/authStore';
import { 
  GitBranch, 
  GitPullRequest, 
  Search, 
  Github, 
  Key, 
  Lock, 
  Globe, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
  GitCommit,
  GitMerge
} from 'lucide-react';
import toast from 'react-hot-toast';

export const RepositoriesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchMe } = useAuthStore();
  const { analyzePullRequest } = useReviewStore();

  const [repos, setRepos] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [prStateFilter, setPrStateFilter] = useState('all'); // 'all', 'open', 'closed'
  const [patToken, setPatToken] = useState('');
  const [showPatModal, setShowPatModal] = useState(false);
  const [oauthStatus, setOauthStatus] = useState({ configured: false, callbackUrl: '' });
  const [loading, setLoading] = useState(false);
  const [pullsLoading, setPullsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const isConnected = !!user?.githubAccessToken || !!user?.githubId;

  // Check OAuth configuration status
  const checkOAuthStatus = async () => {
    try {
      const res = await API.get('/auth/github/status');
      setOauthStatus(res.data);
    } catch (err) {
      setOauthStatus({ configured: false, callbackUrl: '' });
    }
  };

  // Handle OAuth callback parameters in URL
  useEffect(() => {
    const isGithubConnected = searchParams.get('github_connected');
    const oauthError = searchParams.get('error');
    const tokenParam = searchParams.get('token');

    if (tokenParam) {
      localStorage.setItem('codelens_token', tokenParam);
      useAuthStore.setState({ token: tokenParam, isAuthenticated: true });
    }

    if (isGithubConnected === 'true') {
      fetchMe().then(() => {
        toast.success('GitHub account connected successfully!');
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError === 'oauth_unconfigured') {
      toast(
        'GitHub OAuth is not configured on this server. Please connect using a Personal Access Token below.',
        { icon: 'ℹ️', duration: 6000 }
      );
      setShowPatModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError === 'oauth_failed') {
      toast.error('GitHub authentication failed or was cancelled. Please try again or use a Personal Access Token.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkOAuthStatus();
  }, [searchParams, fetchMe]);

  const fetchRepos = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const response = await API.get('/github/repos');
      setRepos(response.data || []);
    } catch (error) {
      console.warn('Failed to load GitHub repos:', error);
      toast.error('Failed to load GitHub repositories. Please check or refresh your GitHub connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [user]);

  const fetchPullsForRepo = async (repo, state = prStateFilter) => {
    if (!repo) return;
    setPullsLoading(true);
    try {
      const response = await API.get(`/github/pulls/${repo.owner.login}/${repo.name}?state=${state}`);
      setPulls(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch Pull Requests for this repository');
      setPulls([]);
    } finally {
      setPullsLoading(false);
    }
  };

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    await fetchPullsForRepo(repo, prStateFilter);
  };

  const handleStateFilterChange = async (newState) => {
    setPrStateFilter(newState);
    if (selectedRepo) {
      await fetchPullsForRepo(selectedRepo, newState);
    }
  };

  const handleOAuthConnect = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const localToken = localStorage.getItem('codelens_token') || '';
    window.location.href = `${socketUrl}/api/auth/github?token=${encodeURIComponent(localToken)}&from=repositories`;
  };

  const handleLinkPat = async (e) => {
    e.preventDefault();
    if (!patToken.trim()) return;

    setLoading(true);
    try {
      const res = await API.post('/github/link-pat', { pat: patToken.trim() });
      toast.success(res.data?.message || 'GitHub linked successfully with Personal Access Token!');
      setPatToken('');
      setShowPatModal(false);
      await fetchMe();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid GitHub Personal Access Token');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (window.confirm('Are you sure you want to disconnect your GitHub account?')) {
      try {
        await API.post('/github/unlink');
        toast.success('GitHub disconnected');
        setRepos([]);
        setSelectedRepo(null);
        setPulls([]);
        await fetchMe();
      } catch (error) {
        toast.error('Failed to unlink GitHub');
      }
    }
  };

  const handleAuditPR = async (pull) => {
    setAuditLoading(true);
    try {
      toast.loading(`Auditing PR #${pull.number}: ${pull.title}...`, { id: 'pr_audit' });
      await analyzePullRequest(selectedRepo.owner.login, selectedRepo.name, pull.number, null);
      toast.success('PR Code Review & Impact Radar complete!', { id: 'pr_audit' });
      navigate('/review');
    } catch (error) {
      toast.error(error.message || 'PR Audit failed', { id: 'pr_audit' });
    } finally {
      setAuditLoading(false);
    }
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-body select-none">
      
      {/* Header Banner */}
      <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-text-1 flex items-center gap-2">
            <GitBranch className="text-accent" size={22} /> GitHub Repositories & Pull Requests
          </h1>
          <p className="text-xs text-text-2 mt-1">
            Connect repositories to audit incoming Pull Requests, calculate Code Change Impact Radar, and inspect diffs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-success font-semibold flex items-center gap-1.5 bg-success/10 border border-success/20 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} /> Connected ({user.githubUsername || user.name})
              </span>
              <button
                onClick={handleUnlink}
                className="text-xs text-danger hover:underline font-semibold"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {oauthStatus.configured && (
                <button
                  onClick={handleOAuthConnect}
                  className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-accent/15 transition-all"
                >
                  <Github size={14} /> Connect with GitHub
                </button>
              )}
              <button
                onClick={() => setShowPatModal(true)}
                className="bg-bg-2 border border-border hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Key size={14} /> {oauthStatus.configured ? 'Use Access Token (PAT)' : 'Connect with Personal Access Token'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!isConnected ? (
        /* Connect prompt */
        <div className="bg-bg-1 border border-border p-12 rounded-xl text-center space-y-5 shadow-xl max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <Github size={36} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-1 font-display">Connect Your GitHub Account</h3>
            <p className="text-xs text-text-2 max-w-md mx-auto mt-1 leading-relaxed">
              Connect via GitHub OAuth or a Personal Access Token (PAT) to browse repositories, inspect pull request diffs, and calculate blast-radius topologies.
            </p>
          </div>

          {/* Connection Mode Badges */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            {oauthStatus.configured ? (
              <button
                onClick={handleOAuthConnect}
                className="bg-accent text-bg-0 hover:bg-accent/85 px-5 py-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-accent/15 transition-all"
              >
                <Github size={16} /> 1-Click GitHub OAuth Connect
              </button>
            ) : null}

            <button
              onClick={() => setShowPatModal(true)}
              className="bg-bg-2 border border-border hover:bg-border text-text-1 px-5 py-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 transition-all"
            >
              <Key size={16} className="text-accent" /> Connect with Personal Access Token (PAT)
            </button>
          </div>

          {!oauthStatus.configured && (
            <div className="bg-bg-2 border border-border/80 p-4 rounded-lg text-left text-xs space-y-1.5 max-w-lg mx-auto">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-[11px] uppercase tracking-wider">
                <Info size={13} /> Personal Access Token (PAT) Mode Active
              </div>
              <p className="text-text-2 leading-relaxed text-[11px]">
                OAuth credentials (<code className="text-text-1">GITHUB_CLIENT_ID</code> / <code className="text-text-1">GITHUB_CLIENT_SECRET</code>) are not configured on this server. You can connect immediately using a standard GitHub Personal Access Token with <code className="text-accent bg-bg-0 px-1 py-0.5 rounded">repo</code> scope.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Connected Repository Browser */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Repositories List (5 cols) */}
          <div className="lg:col-span-5 bg-bg-1 border border-border rounded-xl shadow-xl overflow-hidden flex flex-col min-h-[520px]">
            <div className="p-4 border-b border-border bg-bg-2/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-2">
                  Repositories ({repos.length})
                </span>
                <button
                  onClick={fetchRepos}
                  className="text-text-2 hover:text-accent p-1 transition-colors"
                  title="Refresh Repositories"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-text-2" size={14} />
                <input
                  type="text"
                  placeholder="Search repository..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full bg-bg-0 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {loading && repos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <RefreshCw size={20} className="text-accent animate-spin" />
                  <span className="text-xs text-text-2">Fetching GitHub repositories...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-2">
                  No matching repositories found.
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const isSelected = selectedRepo?.name === repo.name && selectedRepo?.owner?.login === repo.owner?.login;
                  return (
                    <div
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className={`p-4 hover:bg-bg-2/50 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected ? 'bg-bg-2 border-l-2 border-accent' : ''
                      }`}
                    >
                      <div className="space-y-1 truncate max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-1 truncate">{repo.name}</span>
                          {repo.private ? (
                            <Lock size={10} className="text-text-2" />
                          ) : (
                            <Globe size={10} className="text-text-2" />
                          )}
                        </div>
                        <p className="text-[10px] text-text-2 truncate">
                          {repo.description || 'No description provided'}
                        </p>
                      </div>

                      <ArrowRight size={14} className={`text-text-2 transition-transform ${isSelected ? 'text-accent translate-x-1' : ''}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pull Requests Pane (7 cols) */}
          <div className="lg:col-span-7 bg-bg-1 border border-border rounded-xl shadow-xl p-6 flex flex-col justify-between min-h-[520px]">
            {!selectedRepo ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-20">
                <GitPullRequest size={36} className="text-text-2 opacity-40" />
                <h3 className="text-sm font-bold text-text-1">No Repository Selected</h3>
                <p className="text-xs text-text-2 max-w-sm">
                  Choose a repository from the left panel to view and audit its Pull Requests.
                </p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                
                {/* PR Pane Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider block">
                      Repository
                    </span>
                    <a
                      href={`https://github.com/${selectedRepo.owner.login}/${selectedRepo.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-text-1 font-mono hover:text-accent inline-flex items-center gap-1.5"
                    >
                      {selectedRepo.owner.login}/{selectedRepo.name} <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-lg border border-border">
                    {['all', 'open', 'closed'].map((state) => (
                      <button
                        key={state}
                        onClick={() => handleStateFilterChange(state)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
                          prStateFilter === state 
                            ? 'bg-accent text-bg-0 shadow' 
                            : 'text-text-2 hover:text-text-1'
                        }`}
                      >
                        {state} ({state === 'all' ? pulls.length : pulls.filter(p => p.state === state).length})
                      </button>
                    ))}
                  </div>
                </div>

                {/* PR Listing */}
                {pullsLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2">
                    <RefreshCw size={20} className="text-accent animate-spin" />
                    <span className="text-xs text-text-2">Fetching pull requests from GitHub...</span>
                  </div>
                ) : pulls.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-bg-2 border border-border flex items-center justify-center text-text-2">
                      <GitPullRequest size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-1">
                        No {prStateFilter !== 'all' ? prStateFilter : ''} Pull Requests Found
                      </h4>
                      <p className="text-xs text-text-2 max-w-sm mt-1 leading-relaxed">
                        This repository currently has no {prStateFilter !== 'all' ? prStateFilter : ''} Pull Requests on GitHub.
                      </p>
                    </div>

                    {/* Helpful instructions to create a test PR */}
                    <div className="bg-bg-2 border border-border p-4 rounded-xl text-left text-xs max-w-md w-full space-y-2">
                      <span className="font-bold text-text-1 flex items-center gap-1.5 text-[11px]">
                        <GitCommit size={14} className="text-accent" /> How to create a test PR to audit:
                      </span>
                      <ol className="list-decimal list-inside text-text-2 space-y-1 text-[11px] leading-relaxed">
                        <li>Go to your repo on GitHub: <a href={`https://github.com/${selectedRepo.owner.login}/${selectedRepo.name}`} target="_blank" rel="noreferrer" className="text-accent hover:underline font-mono">github.com/{selectedRepo.owner.login}/{selectedRepo.name}</a></li>
                        <li>Create a branch or edit any file in the browser.</li>
                        <li>Open a <strong>New Pull Request</strong>.</li>
                        <li>Come back here and click <strong>Refresh</strong>!</li>
                      </ol>
                    </div>

                    <a
                      href={`https://github.com/${selectedRepo.owner.login}/${selectedRepo.name}/compare`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow transition-all"
                    >
                      <GitPullRequest size={14} /> Open New PR on GitHub <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[440px]">
                    {pulls.map((pull) => {
                      const isOpen = pull.state === 'open';
                      const isMerged = pull.merged_at !== null;
                      
                      return (
                        <div
                          key={pull.id}
                          className="bg-bg-2/50 border border-border p-4 rounded-xl hover:border-text-2 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              {isOpen ? (
                                <GitPullRequest size={18} className="text-success shrink-0 mt-0.5" />
                              ) : isMerged ? (
                                <GitMerge size={18} className="text-accent2 shrink-0 mt-0.5" />
                              ) : (
                                <GitPullRequest size={18} className="text-danger shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-text-1 leading-snug">
                                    #{pull.number} {pull.title}
                                  </h4>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                    isOpen 
                                      ? 'bg-success/10 text-success border-success/20' 
                                      : isMerged 
                                      ? 'bg-accent2/10 text-accent2 border-accent2/20' 
                                      : 'bg-danger/10 text-danger border-danger/20'
                                  }`}>
                                    {isOpen ? 'Open' : isMerged ? 'Merged' : 'Closed'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-text-2 mt-1">
                                  Opened by: <span className="text-text-1 font-semibold">{pull.user?.login}</span> · Branch: <span className="font-mono text-accent">{pull.head?.ref}</span> → <span className="font-mono text-text-2">{pull.base?.ref}</span>
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleAuditPR(pull)}
                              disabled={auditLoading}
                              className="bg-accent text-bg-0 hover:bg-accent/85 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
                            >
                              <Play size={12} fill="currentColor" /> Audit PR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* PAT Modal */}
      {showPatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-1 border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-1 font-display flex items-center gap-2">
                <Key size={16} className="text-accent" /> Connect GitHub Access Token (PAT)
              </h3>
              <button onClick={() => setShowPatModal(false)} className="text-text-2 hover:text-text-1 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkPat} className="space-y-4">
              <div>
                <label className="text-xs text-text-2 font-semibold block mb-1">GitHub Personal Access Token</label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={patToken}
                  onChange={(e) => setPatToken(e.target.value)}
                  className="w-full bg-bg-2 border border-border rounded-lg px-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent font-mono"
                  required
                  autoFocus
                />
                <div className="text-[10px] text-text-2 mt-2 leading-relaxed bg-bg-2/60 p-2.5 rounded border border-border/60 space-y-1">
                  <span className="font-bold text-text-1 block">How to generate a token:</span>
                  <p>1. Go to GitHub &gt; <strong>Settings</strong> &gt; <strong>Developer settings</strong> &gt; <strong>Personal access tokens (classic)</strong>.</p>
                  <p>2. Select the <code className="bg-bg-0 px-1 py-0.2 rounded text-accent font-mono">repo</code> scope checkbox.</p>
                  <p>3. Generate token, paste it here, and click Save.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPatModal(false)}
                  className="bg-bg-2 hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !patToken.trim()}
                  className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? 'Validating Token...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RepositoriesPage;
