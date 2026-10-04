import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import toast from 'react-hot-toast';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      return toast.error('Please enter all password fields');
    }
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters long');
    }
    if (!token) {
      return toast.error('Invalid or missing password reset token');
    }

    setLoading(true);
    try {
      const response = await API.post(`/auth/reset-password/${token}`, { password });
      toast.success(response.data.message || 'Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-0 p-4 font-body select-none">
      <div className="w-full max-w-md bg-bg-1 border border-border rounded-lg shadow-2xl p-8">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center font-display font-extrabold text-bg-0 text-2xl shadow-xl shadow-accent/20 mb-3">
            CL
          </div>
          <h1 className="text-xl font-bold font-display text-text-1 font-semibold">Reset Your Password</h1>
          <p className="text-xs text-text-2 mt-1">Enter your new developer credentials below</p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-2 block mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-text-2" size={16} />
              <input
                type="password"
                placeholder="New Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded pl-10 pr-3 py-2 text-sm text-text-1 focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-2 block mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-text-2" size={16} />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded pl-10 pr-3 py-2 text-sm text-text-1 focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-accent text-bg-0 py-2 rounded text-sm font-bold hover:bg-accent/80 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/15 disabled:opacity-50"
          >
            {loading ? 'Updating password...' : 'Update Password'}
          </button>
        </form>

        <p className="text-xs text-text-2 text-center mt-6">
          <Link to="/login" className="text-accent hover:underline font-semibold">
            Back to Login Screen
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ResetPassword;
