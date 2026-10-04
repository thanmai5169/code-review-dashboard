import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export const Register = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      return toast.error('Please enter name, email and password');
    }

    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully. Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-0 p-4 font-body select-none">
      <div className="w-full max-w-md bg-bg-1 border border-border rounded-lg shadow-2xl p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center font-display font-extrabold text-bg-0 text-2xl shadow-xl shadow-accent/20 mb-3">
            CL
          </div>
          <h1 className="text-xl font-bold font-display text-text-1">Create Developer Profile</h1>
          <p className="text-xs text-text-2 mt-1">Get instant feedback on code structures</p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-2 block mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-text-2" size={16} />
              <input
                type="text"
                placeholder="Linus Torvalds"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded pl-10 pr-3 py-2 text-sm text-text-1 focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

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
            <label className="text-xs font-semibold text-text-2 block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-text-2" size={16} />
              <input
                type="password"
                placeholder="Minimum 6 characters"
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
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="text-xs text-text-2 text-center mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-accent hover:underline font-semibold">
            Sign In here
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Register;
