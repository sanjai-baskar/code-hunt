import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function AdminContestForm({ contest, problems, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    problemIds: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contest) {
      // Format dates for datetime-local input
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);
      start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
      end.setMinutes(end.getMinutes() - end.getTimezoneOffset());

      setFormData({
        title: contest.title,
        description: contest.description,
        startTime: start.toISOString().slice(0, 16),
        endTime: end.toISOString().slice(0, 16),
        problemIds: contest.problems ? contest.problems.map(p => p.id) : [],
      });
    }
  }, [contest]);

  const toggleProblem = (id) => {
    setFormData(prev => {
      const selected = prev.problemIds.includes(id);
      return {
        ...prev,
        problemIds: selected
          ? prev.problemIds.filter(pId => pId !== id)
          : [...prev.problemIds, id]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      alert('End Time must be strictly after Start Time.');
      return;
    }

    setLoading(true);
    try {
      if (contest) {
        // Assume PUT /contests/:id if editing (not strictly in plan but good to have, though admin.js doesn't have PUT yet)
        alert('Edit contest not implemented in backend yet. Creating new instead.');
      }
      await api.post('/admin/contests', {
        title: formData.title,
        description: formData.description,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        problemIds: formData.problemIds,
      });
      onSaved();
    } catch (err) {
      alert('Failed to save contest: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="lc-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 animate-fade-in bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">
            {contest ? 'Edit Contest' : 'Create New Contest'}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Contest Title</label>
            <input 
              required 
              className="lc-input" 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Weekly Coding Contest #1"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Description</label>
            <textarea 
              className="lc-input min-h-[100px]" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Rules, instructions, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Start Time</label>
              <input 
                required 
                type="datetime-local"
                className="lc-input" 
                value={formData.startTime} 
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">End Time</label>
              <input 
                required 
                type="datetime-local"
                className="lc-input" 
                value={formData.endTime} 
                min={formData.startTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Select Problems</label>
            <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto p-2 space-y-2 bg-gray-50/50">
              {problems.length === 0 ? (
                <p className="text-sm text-muted p-2">No problems available. Please create some first.</p>
              ) : (
                problems.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-[#45A29E] focus:ring-[#45A29E]"
                      checked={formData.problemIds.includes(p.id)}
                      onChange={() => toggleProblem(p.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{p.title}</p>
                      <p className="text-xs text-gray-500">Difficulty: {p.difficulty} | Points: {p.points}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="lc-btn-secondary flex-1 py-3">Cancel</button>
            <button type="submit" disabled={loading} className="lc-btn-primary flex-1 py-3">
              {loading ? 'Saving...' : contest ? 'Update Contest' : 'Create Contest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
