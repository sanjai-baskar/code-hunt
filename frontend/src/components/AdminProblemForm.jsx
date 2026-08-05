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
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'success' | 'error'
  const [showSmartPasteModal, setShowSmartPasteModal] = useState(false);
  const [rawPasteText, setRawPasteText] = useState('');

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

  // Explicit event propagation handlers so global listeners never intercept copy/paste in admin inputs
  const handleFieldEvents = {
    onPaste: (e) => e.stopPropagation(),
    onCopy: (e) => e.stopPropagation(),
    onCut: (e) => e.stopPropagation(),
    onContextMenu: (e) => e.stopPropagation(),
  };

  // Clipboard paste button helper
  const handlePasteFromClipboard = async (field, idx = null) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert('Clipboard is empty.');
        return;
      }
      if (idx !== null) {
        updateTestCase(idx, field, text);
      } else {
        setFormData(prev => ({ ...prev, [field]: text }));
      }
    } catch (err) {
      console.warn('Clipboard API restriction:', err);
      alert('Unable to access system clipboard automatically. Please click inside the text box and press Ctrl+V to paste.');
    }
  };

  const parseRawText = (text) => {
    if (!text || !text.trim()) return {};
    const parsed = {};

    const titleMatch = text.match(/Title:\s*(.+)/i);
    if (titleMatch) parsed.title = titleMatch[1].trim();

    const difficultyMatch = text.match(/Difficulty:\s*(.+)/i);
    if (difficultyMatch) {
      const diff = difficultyMatch[1].trim();
      if (['Easy', 'Medium', 'Hard'].includes(diff)) parsed.difficulty = diff;
    }

    const categoryMatch = text.match(/Category:\s*(.+)/i);
    if (categoryMatch) parsed.category = categoryMatch[1].trim();

    const pointsMatch = text.match(/Points:\s*(\d+)/i);
    if (pointsMatch) parsed.points = parseInt(pointsMatch[1], 10);

    const functionNameMatch =
      text.match(/Main Class Name:\s*(.+)/i) ||
      text.match(/Function Name:\s*(.+)/i);
    if (functionNameMatch) parsed.functionName = functionNameMatch[1].trim();

    const descMatch = text.match(
      /Description:\s*([\s\S]*?)(?=Starter Code:|Test Cases:|Input:|$)/i
    );
    if (descMatch && descMatch[1].trim()) {
      parsed.description = descMatch[1].trim();
    } else if (!titleMatch && !difficultyMatch && !categoryMatch) {
      const lines = text.trim().split('\n');
      if (lines.length > 1 && lines[0].length < 80 && !parsed.title) {
        parsed.title = lines[0].trim();
        parsed.description = lines.slice(1).join('\n').trim();
      } else {
        parsed.description = text.trim();
      }
    }

    const starterMatch = text.match(
      /Starter Code:\s*([\s\S]*?)(?=Test Cases:|Input:|$)/i
    );
    if (starterMatch && starterMatch[1].trim()) {
      parsed.starterCode = starterMatch[1].trim();
    }

    const testCases = [];
    const tcRegex = /Input:\s*([\s\S]*?)Output:\s*([\s\S]*?)(?=Input:|(?:\r?\n){2,}|$)/gi;
    let match;
    while ((match = tcRegex.exec(text)) !== null) {
      const input = match[1].trim();
      const output = match[2].trim();
      if (input !== '' || output !== '') {
        testCases.push({ input, output });
      }
    }
    if (testCases.length > 0) parsed.testCases = testCases;

    return parsed;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseRawText(text);
        setFormData(prev => ({ ...prev, ...parsed }));
        setUploadStatus('success');
        setTimeout(() => setUploadStatus(null), 3000);
      } catch (err) {
        console.error('File parse error:', err);
        setUploadStatus('error');
        setTimeout(() => setUploadStatus(null), 3000);
      }
    };
    reader.onerror = () => {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = null;
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="lc-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 animate-fade-in bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">{problem ? 'Edit Problem' : 'Create New Problem'}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSmartPasteModal(true)}
              className="text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-2 rounded transition-colors flex items-center gap-1.5"
            >
              📋 Smart Paste
            </button>
            <label className="cursor-pointer text-xs font-semibold text-[#45A29E] bg-[#45A29E]/10 hover:bg-[#45A29E]/20 px-3 py-2 rounded transition-colors flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Upload .txt
              <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl ml-2">✕</button>
          </div>
        </div>

        {/* Upload/Parse status banner */}
        {uploadStatus === 'success' && (
          <div className="mb-4 flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-600 text-sm px-4 py-2.5 rounded-lg animate-fade-in">
            <span>✅</span>
            <span>Content populated successfully! Fields have been updated below.</span>
          </div>
        )}
        {uploadStatus === 'error' && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 text-sm px-4 py-2.5 rounded-lg animate-fade-in">
            <span>❌</span>
            <span>Failed to read or parse the text. Please check the format and try again.</span>
          </div>
        )}

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
                {...handleFieldEvents}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-main)] font-medium mb-1.5">Difficulty</label>
              <select 
                className="lc-input" 
                value={formData.difficulty} 
                onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                {...handleFieldEvents}
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
                {...handleFieldEvents}
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
                {...handleFieldEvents}
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
                {...handleFieldEvents}
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Points awarded for solving this problem.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-[var(--text-main)] font-medium">Starter Code (Java)</label>
              <button 
                type="button" 
                onClick={() => handlePasteFromClipboard('starterCode')} 
                className="text-xs text-[#45A29E] hover:underline font-medium flex items-center gap-1"
              >
                📋 Paste Code
              </button>
            </div>
            <textarea 
              className="lc-input min-h-[150px] font-mono text-sm" 
              value={formData.starterCode} 
              onChange={e => setFormData({ ...formData, starterCode: e.target.value })}
              placeholder="import java.util.*;&#10;public class Main { ... }"
              {...handleFieldEvents}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-[var(--text-main)] font-medium">Description (Markdown Supported)</label>
              <button 
                type="button" 
                onClick={() => handlePasteFromClipboard('description')} 
                className="text-xs text-[#45A29E] hover:underline font-medium flex items-center gap-1"
              >
                📋 Paste Question Text
              </button>
            </div>
            <textarea 
              required 
              className="lc-input min-h-[120px]" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the challenge... (Supports Markdown, copy/paste, code blocks)"
              {...handleFieldEvents}
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400">Input</label>
                        <button 
                          type="button" 
                          onClick={() => handlePasteFromClipboard('input', idx)} 
                          className="text-[10px] text-[#45A29E] hover:underline font-medium"
                        >
                          📋 Paste Input
                        </button>
                      </div>
                      <textarea 
                        required 
                        className="lc-input text-xs font-mono min-h-[60px] bg-white" 
                        placeholder="e.g. 5\n1 2 3" 
                        value={tc.input} 
                        onChange={e => updateTestCase(idx, 'input', e.target.value)}
                        {...handleFieldEvents}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400">Expected Output</label>
                        <button 
                          type="button" 
                          onClick={() => handlePasteFromClipboard('output', idx)} 
                          className="text-[10px] text-[#45A29E] hover:underline font-medium"
                        >
                          📋 Paste Output
                        </button>
                      </div>
                      <textarea 
                        required 
                        className="lc-input text-xs font-mono min-h-[60px] bg-white" 
                        placeholder="e.g. 15" 
                        value={tc.output} 
                        onChange={e => updateTestCase(idx, 'output', e.target.value)}
                        {...handleFieldEvents}
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

        {/* Smart Auto-Fill Paste Modal */}
        {showSmartPasteModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="lc-card w-full max-w-xl p-6 bg-white space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold text-[var(--text-main)]">📋 Smart Auto-Fill from Pasted Question</h3>
                <button onClick={() => setShowSmartPasteModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Paste any problem text or formatted question below. Click <strong>Auto-Fill Form</strong> to automatically extract Title, Description, Starter Code, and Test Cases into the form!
              </p>
              <textarea
                className="lc-input font-mono text-xs min-h-[220px]"
                placeholder="Paste raw problem text or template here..."
                value={rawPasteText}
                onChange={(e) => setRawPasteText(e.target.value)}
                {...handleFieldEvents}
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clipText = await navigator.clipboard.readText();
                      if (clipText) setRawPasteText(clipText);
                    } catch (err) {
                      alert('Please click inside the text area and press Ctrl+V.');
                    }
                  }}
                  className="text-xs text-[#45A29E] hover:underline font-semibold flex items-center gap-1"
                >
                  📋 Paste Clipboard Content
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowSmartPasteModal(false)} className="lc-btn-secondary text-xs px-4 py-2">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseRawText(rawPasteText);
                      if (Object.keys(parsed).length > 0) {
                        setFormData(prev => ({ ...prev, ...parsed }));
                        setUploadStatus('success');
                        setTimeout(() => setUploadStatus(null), 3000);
                        setShowSmartPasteModal(false);
                        setRawPasteText('');
                      } else {
                        alert('No text found to parse.');
                      }
                    }}
                    className="lc-btn-primary text-xs px-4 py-2"
                  >
                    Auto-Fill Form
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
