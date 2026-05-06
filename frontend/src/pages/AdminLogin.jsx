import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'admin') {
        setError('Unauthorized. This portal is for Administrators only.');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = () => {
    setEmail('admin@codehunt.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
      <div className="w-full max-w-md p-8 bg-[var(--bg-card)] rounded-xl shadow-2xl border-2 border-[var(--border-main)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">Admin<span className="text-[#ffa116]">Hub</span></h1>
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-tighter mb-1">Command Center</p>
          <p className="text-[var(--text-muted)] text-xs">Secure access for platform moderators</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[var(--text-main)] text-sm font-semibold mb-1">Admin Email</label>
            <input
              type="email"
              required
              className="lc-input border-2 focus:border-[var(--text-main)]"
              placeholder="admin@codehunt.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[var(--text-main)] text-sm font-semibold mb-1">Security Key</label>
            <input
              type="password"
              required
              className="lc-input border-2 focus:border-[var(--text-main)]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-6 bg-[var(--text-main)] text-white font-black rounded-lg hover:bg-black transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
          >
            {loading ? 'Authenticating...' : 'Authorize Access'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}
