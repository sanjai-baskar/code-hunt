import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ value, onChange, language = 'javascript' }) {
  return (
    <div className="w-full h-full editor-panel">
      <div className="bg-[#f0f0f0] px-4 py-2 flex items-center gap-2 border-b border-[#e5e5e5]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
        </div>
        <span className="text-[10px] text-gray-500 font-mono ml-2 uppercase tracking-widest">
          {language} — Main.java
        </span>
      </div>
      <Editor
        height="calc(100% - 32px)"
        language={language}
        theme="light"
        defaultValue={value}
        onChange={(val) => onChange(val)}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
          padding: { top: 16 }
        }}
      />
    </div>
  );
}
