import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(data.user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full lc-card p-8 border-border bg-surface">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2">Code<span className="text-brand">Hunt</span></h1>
          <p className="text-muted font-medium">Join the Arena</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full lc-input bg-input border-border text-foreground focus:border-brand"
              required
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full lc-input bg-input border-border text-foreground focus:border-brand"
              required
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full lc-input bg-input border-border text-foreground focus:border-brand"
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Account Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full lc-input bg-input border-border text-foreground focus:border-brand appearance-none"
            >
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full lc-btn-primary py-3.5 text-lg shadow-[0_0_20px_rgba(255,161,22,0.2)] disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-border flex flex-col items-center gap-4">
          <div className="text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:underline font-medium">
              Sign In
            </Link>
          </div>
          <Link to="/" className="text-[10px] text-muted hover:text-brand uppercase tracking-widest font-bold mt-2 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
