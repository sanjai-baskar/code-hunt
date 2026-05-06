import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
      <div className="w-full max-w-md p-8 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-main)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#ffa116] mb-2">Code Hunt</h1>
          <p className="text-[var(--text-muted)] text-sm">Join the community and start coding</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-[var(--text-main)] text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              className="lc-input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[var(--text-main)] text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              required
              className="lc-input"
              placeholder="Enter your email"
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ffa116] hover:bg-[#ffb84d] text-black font-bold py-3 rounded-lg transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-[var(--text-muted)]">Already have an account? </span>
          <Link to="/login" className="text-[#ffa116] hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
