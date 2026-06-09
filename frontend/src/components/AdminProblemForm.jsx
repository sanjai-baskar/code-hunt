import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function AdminProblemForm({ problem, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    category: 'All',
    functionName: 'Main',
    starterCode: '',
    points: 100,
    testCases: [{ input: '', output: '' }]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (problem) {
      setFormData({
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        category: problem.category || 'All',
        functionName: problem.functionName || 'Main',
        starterCode: problem.starterCode || '',
        points: problem.points || 100,
        testCases: problem.testCases || [{ input: '', output: '' }]
      });
    }
  }, [problem]);

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', output: '' }]
    }));
  };

  const updateTestCase = (idx, field, val) => {
    const newCases = [...formData.testCases];
    newCases[idx][field] = val;
    setFormData(prev => ({ ...prev, testCases: newCases }));
  };

  const removeTestCase = (idx) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (problem) {
        await api.put(`/problems/${problem.id}`, formData);
      } else {
        await api.post('/problems', formData);
      }
      onSaved();
    } catch (err) {
      alert('Failed to save problem.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const newFormData = { ...formData };
      
      const titleMatch = text.match(/Title:\s*(.+)/i);
      if (titleMatch) newFormData.title = titleMatch[1].trim();

      const difficultyMatch = text.match(/Difficulty:\s*(.+)/i);
      if (difficultyMatch) {
        const diff = difficultyMatch[1].trim();
        if (['Easy', 'Medium', 'Hard'].includes(diff)) {
          newFormData.difficulty = diff;
        }
      }

      const categoryMatch = text.match(/Category:\s*(.+)/i);
      if (categoryMatch) newFormData.category = categoryMatch[1].trim();

      const functionNameMatch = text.match(/Main Class Name:\s*(.+)/i) || text.match(/Function Name:\s*(.+)/i);
      if (functionNameMatch) newFormData.functionName = functionNameMatch[1].trim();

      const descMatch = text.match(/Description:\s*([\s\S]*?)(?=Starter Code:|Test Cases:|Input:|$)/i);
      if (descMatch) newFormData.description = descMatch[1].trim();
      else if (!titleMatch && !difficultyMatch && !categoryMatch) {
         newFormData.description = text; // Fallback: just put all text in description if no headers found
      }

      const starterMatch = text.match(/Starter Code:\s*([\s\S]*?)(?=Test Cases:|Input:|$)/i);
      if (starterMatch) newFormData.starterCode = starterMatch[1].trim();

      const testCases = [];
      const tcRegex = /Input:\s*([\s\S]*?)Output:\s*([\s\S]*?)(?=Input:|$)/gi;
      let match;
      while ((match = tcRegex.exec(text)) !== null) {
        testCases.push({
          input: match[1].trim(),
          output: match[2].trim()
        });
      }
      
      if (testCases.length > 0) {
        newFormData.testCases = testCases;
      }

      setFormData(newFormData);
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="lc-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 animate-fade-in bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">{problem ? 'Edit Problem' : 'Create New Problem'}</h2>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer text-sm font-medium text-[#45A29E] bg-[#45A29E]/10 hover:bg-[#45A29E]/20 px-4 py-2 rounded transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Upload .txt
              <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Problem Title</label>
              <input 
                required 
                className="lc-input" 
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. FizzBuzz"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Difficulty</label>
              <select 
                className="lc-input" 
                value={formData.difficulty} 
                onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Category</label>
              <select 
                className="lc-input" 
                value={formData.category} 
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="All">All / General</option>
                <option value="Java">Java</option>
                <option value="Python">Python</option>
                <option value="C++">C++</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Main Class Name</label>
              <input 
                required 
                className="lc-input font-mono" 
                value={formData.functionName} 
                onChange={e => setFormData({ ...formData, functionName: e.target.value })}
                placeholder="e.g. Main"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">The student's code must define this public class (usually Main).</p>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Points</label>
              <input 
                required 
                type="number"
                min="0"
                className="lc-input font-mono" 
                value={formData.points} 
                onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                placeholder="100"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Points awarded for solving this problem.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Starter Code (Java)</label>
            <textarea 
              className="lc-input min-h-[150px] font-mono text-sm" 
              value={formData.starterCode} 
              onChange={e => setFormData({ ...formData, starterCode: e.target.value })}
              placeholder="import java.util.*;&#10;public class Main { ... }"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Description (Markdown Supported)</label>
            <textarea 
              required 
              className="lc-input min-h-[120px]" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the challenge..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-[var(--text-main)] font-medium">Test Cases (Standard Input/Output)</label>
              <button type="button" onClick={addTestCase} className="text-xs text-[#ffa116] hover:underline">+ Add Case</button>
            </div>
            <div className="space-y-3">
              {formData.testCases.map((tc, idx) => (
                <div key={idx} className="lc-card p-4 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400">Test Case #{idx + 1}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={tc.hidden || false} 
                          onChange={e => updateTestCase(idx, 'hidden', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-[#45A29E] focus:ring-[#45A29E]"
                        />
                        <span className="text-xs font-medium text-gray-600">Hidden Case</span>
                      </label>
                      {formData.testCases.length > 1 && (
                        <button type="button" onClick={() => removeTestCase(idx)} className="text-[#ef4743] hover:text-red-600">
                          <span className="text-xs font-medium">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Input</label>
                      <textarea 
                        required 
                        className="lc-input text-xs font-mono min-h-[60px] bg-white" 
                        placeholder="e.g. 5\n1 2 3" 
                        value={tc.input} 
                        onChange={e => updateTestCase(idx, 'input', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Expected Output</label>
                      <textarea 
                        required 
                        className="lc-input text-xs font-mono min-h-[60px] bg-white" 
                        placeholder="e.g. 15" 
                        value={tc.output} 
                        onChange={e => updateTestCase(idx, 'output', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="lc-btn-secondary flex-1 py-3">Cancel</button>
            <button type="submit" disabled={loading} className="lc-btn-primary flex-1 py-3">
              {loading ? 'Saving...' : problem ? 'Update Problem' : 'Create Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
