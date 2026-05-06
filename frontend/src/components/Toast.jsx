import React from 'react';

export default function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast ${toast.type === 'error' ? 'toast-error' : toast.type === 'success' ? 'toast-success' : ''}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : '🔔'}
            </span>
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
