import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import API from '../services/api';
import { User, Key, Eye, EyeOff, Save, Trash, AlertTriangle, Sparkles, Copy, Check, Github, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { 
    user, 
    updateProfile, 
    generateApiKey, 
    revokeApiKey,
    fetchMe 
  } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [defaultLanguage, setDefaultLanguage] = useState(user?.defaultLanguage || 'javascript');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // GitHub connection state
  const [patToken, setPatToken] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState({ configured: false });

  const isGithubConnected = Boolean(user?.githubAccessToken || user?.githubId);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDefaultLanguage(user.defaultLanguage || 'javascript');
    }
    API.get('/auth/github/status')
      .then(res => setOauthStatus(res.data))
      .catch(() => setOauthStatus({ configured: false }));
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('defaultLanguage', defaultLanguage);
    
    if (geminiApiKey) {
      formData.append('geminiApiKey', geminiApiKey);
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      await updateProfile(formData);
      setGeminiApiKey('');
      toast.success('Profile details saved successfully!');
      fetchMe();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  const handleOAuthConnect = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const localToken = localStorage.getItem('codelens_token') || '';
    window.location.href = `${socketUrl}/api/auth/github?token=${encodeURIComponent(localToken)}&from=profile`;
  };

  const handleLinkPat = async (e) => {
    e.preventDefault();
    if (!patToken.trim()) return;

    setGithubLoading(true);
    try {
      const res = await API.post('/github/link-pat', { pat: patToken.trim() });
      toast.success(res.data?.message || 'GitHub linked successfully with PAT!');
      setPatToken('');
      setShowPatInput(false);
      await fetchMe();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Personal Access Token');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleUnlinkGithub = async () => {
    if (window.confirm('Are you sure you want to unlink your GitHub account?')) {
      setGithubLoading(true);
      try {
        await API.post('/github/unlink');
        toast.success('GitHub account unlinked');
        await fetchMe();
      } catch (err) {
        toast.error('Failed to unlink GitHub');
      } finally {
        setGithubLoading(false);
      }
    }
  };

  const handleGenerateKey = async () => {
    try {
      const newKey = await generateApiKey();
      toast.success('Generated CodeLens API key! Please copy it now.');
    } catch (err) {
      toast.error(err.message || 'Key generation failed');
    }
  };

  const handleRevokeKey = async () => {
    if (window.confirm('Are you sure you want to revoke this API key? External pipelines using this key will immediately break.')) {
      try {
        await revokeApiKey();
        toast.success('API key successfully revoked.');
      } catch (err) {
        toast.error(err.message || 'Failed to revoke key');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success('Copied API Key to clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const languagesList = [
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'Java', value: 'java' },
    { label: 'C++', value: 'cpp' },
    { label: 'C#', value: 'csharp' },
    { label: 'Go', value: 'go' },
    { label: 'PHP', value: 'php' },
    { label: 'Ruby', value: 'ruby' }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-body select-none">
      
      {/* Profile summary card */}
      <div className="bg-bg-1 border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl">
        <div className="relative group">
          <img
            src={avatarPreview || (user?.avatar ? `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${user.avatar}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=CodeLens')}
            alt="Avatar large"
            className="w-24 h-24 rounded-full border-2 border-accent bg-bg-2 object-cover"
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            Upload
            <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </label>
        </div>

        <div className="text-center md:text-left flex-1 space-y-1">
          <h2 className="text-xl font-bold text-text-1 font-display">{user?.name}</h2>
          <p className="text-sm text-text-2">{user?.email}</p>
          <div className="flex gap-2 justify-center md:justify-start pt-2 flex-wrap">
            <span className="bg-accent2/10 text-accent2 border border-accent2/20 text-xs px-2.5 py-0.5 rounded font-semibold">
              MERN Stack Engineer
            </span>
            {isGithubConnected ? (
              <span className="bg-success/10 text-success border border-success/20 text-xs px-2.5 py-0.5 rounded font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> GitHub Linked (@{user.githubUsername || user.name})
              </span>
            ) : (
              <span className="bg-bg-2 text-text-2 border border-border text-xs px-2.5 py-0.5 rounded font-semibold">
                GitHub Not Linked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Profile Edit Card */}
        <div className="bg-bg-1 border border-border rounded-xl p-6 flex flex-col shadow-xl">
          <h3 className="text-sm font-bold text-text-1 font-display mb-4 flex items-center gap-2 border-b border-border pb-2">
            <User size={16} className="text-accent" /> Profile Settings
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="text-xs text-text-2 font-semibold block mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded-lg px-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="text-xs text-text-2 font-semibold block mb-1">Primary IDE Language</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded-lg px-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent capitalize"
              >
                {languagesList.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-text-2 font-semibold block mb-1">Custom Gemini API Key (Optional)</label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  placeholder={user?.apiKeys?.gemini ? '••••••••••••••••••••' : 'Paste your API key here'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full bg-bg-2 border border-border rounded-lg pl-3 pr-10 py-2 text-xs text-text-1 focus:outline-none focus:border-accent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-2.5 text-text-2 hover:text-text-1"
                >
                  {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-text-2 mt-1 leading-relaxed">
                If blank, CodeLens uses the global system key.
              </p>
            </div>

            <div className="pt-4 mt-auto">
              <button
                type="submit"
                className="w-full bg-accent text-bg-0 hover:bg-accent/85 transition-colors py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/15"
              >
                <Save size={14} /> Save Profile Changes
              </button>
            </div>
          </form>
        </div>

        {/* GitHub & CI/CD Integrations Column */}
        <div className="space-y-6">
          
          {/* GitHub Connection Card */}
          <div className="bg-bg-1 border border-border rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-text-1 font-display flex items-center gap-2 border-b border-border pb-2">
              <Github size={16} className="text-accent" /> GitHub Integration
            </h3>

            {isGithubConnected ? (
              <div className="space-y-3">
                <div className="bg-bg-2 border border-border p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs font-bold text-text-1 font-mono">
                      Connected: @{user.githubUsername || user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleUnlinkGithub}
                    disabled={githubLoading}
                    className="text-xs text-danger hover:underline font-semibold"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-[10px] text-text-2 leading-relaxed">
                  Your GitHub account is connected. You can browse repositories and audit Pull Requests in the <strong className="text-text-1">Repositories</strong> tab.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-text-2 leading-relaxed">
                  Connect GitHub via 1-click OAuth or a Personal Access Token with <code className="text-accent bg-bg-2 px-1 py-0.5 rounded font-mono">repo</code> scope.
                </p>

                {showPatInput ? (
                  <form onSubmit={handleLinkPat} className="space-y-3 bg-bg-2 p-3.5 rounded-lg border border-border">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-text-2 block mb-1">Personal Access Token</label>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={patToken}
                        onChange={(e) => setPatToken(e.target.value)}
                        className="w-full bg-bg-0 border border-border rounded px-3 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent font-mono"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPatInput(false)}
                        className="bg-bg-1 hover:bg-border text-text-1 px-3 py-1 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={githubLoading || !patToken.trim()}
                        className="bg-accent text-bg-0 hover:bg-accent/85 px-3 py-1 rounded text-xs font-bold"
                      >
                        Save & Link
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
                    {oauthStatus.configured && (
                      <button
                        onClick={handleOAuthConnect}
                        className="w-full bg-accent text-bg-0 hover:bg-accent/85 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all"
                      >
                        <Github size={14} /> Connect with GitHub OAuth
                      </button>
                    )}
                    <button
                      onClick={() => setShowPatInput(true)}
                      className="w-full bg-bg-2 border border-border hover:bg-border text-text-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Key size={14} /> Enter Personal Access Token (PAT)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* API Tokens Management Card */}
          <div className="bg-bg-1 border border-border rounded-xl p-6 shadow-xl flex flex-col">
            <h3 className="text-sm font-bold text-text-1 font-display mb-3 flex items-center gap-2 border-b border-border pb-2">
              <Key size={16} className="text-accent2" /> CI/CD CLI Integrations
            </h3>

            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <p className="text-xs text-text-2 leading-relaxed">
                Use CodeLens API tokens inside GitHub Actions or Jenkins pipelines to trigger automated code scans.
              </p>

              <div className="bg-bg-2 border border-border p-3.5 rounded-lg space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-2 block">
                  Active CodeLens Token
                </label>

                {user?.apiKeys?.codelensApiKey ? (
                  <div className="space-y-2">
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        readOnly
                        value={user.apiKeys.codelensApiKey}
                        className="w-full bg-bg-0 border border-border rounded px-3 py-1.5 text-xs text-text-1 font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(user.apiKeys.codelensApiKey)}
                        className="bg-bg-1 border border-border p-2 rounded text-text-2 hover:text-text-1 transition-colors"
                        title="Copy Key"
                      >
                        {copiedKey ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      </button>
                    </div>
                    
                    <button
                      onClick={handleRevokeKey}
                      className="w-full bg-danger/10 hover:bg-danger text-danger hover:text-white py-1.5 rounded text-xs font-bold border border-danger/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash size={12} /> Revoke API Token
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={handleGenerateKey}
                      className="w-full bg-accent2 text-bg-0 hover:bg-accent2/85 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Sparkles size={12} /> Generate Integration Key
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Profile;
