import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function StudentLogin() {
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
      if (data.user.role !== 'student') {
        setError('Please use the Admin login page.');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = () => {
    setEmail('student@codehunt.com');
    setPassword('student123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
      <div className="w-full max-w-md p-8 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-main)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#ffa116] mb-2">Code Hunt</h1>
          <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-widest mb-1">Student Portal</p>
          <p className="text-[var(--text-muted)] text-xs">Sign in to start your challenges</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[var(--text-main)] text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              required
              className="lc-input"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[var(--text-main)] text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              className="lc-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="lc-btn-primary w-full py-3 mt-6 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Enter Arena'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="text-sm">
            <span className="text-[var(--text-muted)]">Don't have an account? </span>
            <Link to="/signup" className="text-[#ffa116] hover:underline font-medium">
              Register Now
            </Link>
          </div>
          <Link to="/" className="text-[10px] text-[var(--text-muted)] hover:text-[#ffa116] uppercase tracking-widest font-bold mt-2">
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
