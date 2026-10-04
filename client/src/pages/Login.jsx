import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Github, Mail, Lock, ShieldCheck, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { login, token: authStoreToken, fetchMe } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState(null);

  const [viewMode, setViewMode] = useState('login'); // 'login' or 'forgot'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Check for oauth callback token or error in query params
  useEffect(() => {
    const queryToken = searchParams.get('token');
    const err = searchParams.get('error');

    if (err === 'oauth_unconfigured') {
      setOauthError('GitHub OAuth is not configured on this server. Please sign in with email/password, or connect via Personal Access Token in your profile.');
      toast.error('GitHub OAuth credentials are not configured on this server.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (err === 'oauth_failed') {
      setOauthError('GitHub authorization failed. Please try again or sign in with your email.');
      toast.error('GitHub authorization failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (queryToken) {
      localStorage.setItem('codelens_token', queryToken);
      useAuthStore.setState({ token: queryToken, isAuthenticated: true });
      fetchMe().then(() => {
        toast.success('Successfully authenticated via GitHub!');
        navigate('/');
      });
    } else if (authStoreToken) {
      navigate('/');
    }
  }, [searchParams, authStoreToken, navigate, fetchMe]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please enter email and password');
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome to CodeLens!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    window.location.href = `${socketUrl}/api/auth/github?from=login`;
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!recoveryEmail) {
      return toast.error('Please enter email address');
    }

    setRecoveryLoading(true);
    try {
      const response = await API.post('/auth/forgot-password', { email: recoveryEmail });
      toast.success(response.data.message || 'Verification link dispatched successfully!');
      setRecoveryEmail('');
      setViewMode('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error executing recovery process');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-0 p-4 font-body select-none">
      <div className="w-full max-w-md bg-bg-1 border border-border rounded-lg shadow-2xl p-8 space-y-6">
        
        {/* Brand */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center font-display font-extrabold text-bg-0 text-2xl shadow-xl shadow-accent/20 mb-3">
            CL
          </div>
          <h1 className="text-xl font-bold font-display text-text-1">
            {viewMode === 'forgot' ? 'Reset Your Password' : 'Sign In to CodeLens'}
          </h1>
          <p className="text-xs text-text-2 mt-1">AI-Powered Code Review Bot Dashboard</p>
        </div>

        {/* OAuth Warning Banner if unconfigured */}
        {oauthError && (
          <div className="bg-bg-2 border border-border p-3.5 rounded-lg text-xs text-text-2 flex items-start gap-2.5">
            <Info size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="leading-relaxed">{oauthError}</p>
          </div>
        )}

        {viewMode === 'forgot' ? (
          /* Forgot Password View */
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <p className="text-xs text-text-2 leading-relaxed mb-2">
              Enter your email address below and we will dispatch a password recovery link to your inbox.
            </p>
            <div>
              <label className="text-xs font-semibold text-text-2 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-text-2" size={16} />
                <input
                  type="email"
                  placeholder="developer@codelens.io"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full bg-bg-2 border border-border rounded pl-10 pr-3 py-2 text-sm text-text-1 focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recoveryLoading}
              className="w-full bg-accent text-bg-0 py-2 rounded text-sm font-bold hover:bg-accent/80 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/15"
            >
              {recoveryLoading ? 'Sending link...' : 'Send Recovery Link'}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('login')}
              className="w-full bg-bg-2 hover:bg-border border border-border py-2 rounded text-xs text-text-1 font-semibold transition-colors mt-2"
            >
              Back to Login
            </button>
          </form>
        ) : (
          /* Standard Login View */
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-2 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-text-2" size={16} />
                  <input
                    type="email"
                    placeholder="developer@codelens.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-2 border border-border rounded pl-10 pr-3 py-2 text-sm text-text-1 focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-text-2 block">Password</label>
                  <button 
                    type="button"
                    onClick={() => setViewMode('forgot')}
                    className="text-[11px] text-accent hover:underline font-semibold focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-text-2" size={16} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-2 border border-border rounded pl-10 pr-3 py-2 text-sm text-text-1 focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-bg-0 py-2 rounded text-sm font-bold hover:bg-accent/80 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/15"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <hr className="w-full border-border" />
              <span className="absolute px-3 bg-bg-1 text-[10px] uppercase font-bold tracking-widest text-text-2">
                Or continue with
              </span>
            </div>

            {/* Social Authentication Providers */}
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleGithubLogin}
                className="flex items-center justify-center gap-2 bg-bg-2 hover:bg-border border border-border py-2 rounded text-sm text-text-1 font-semibold transition-colors"
              >
                <Github size={16} /> GitHub Developer Account
              </button>
            </div>

            <p className="text-xs text-text-2 text-center mt-6">
              New developer here?{' '}
              <Link to="/register" className="text-accent hover:underline font-semibold">
                Create an Account
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
};

export default Login;
