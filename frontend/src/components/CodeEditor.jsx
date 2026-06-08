import React, { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ value, onChange, language = 'javascript' }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  const getExtension = (lang) => {
    switch (lang) {
      case 'python': return 'main.py';
      case 'cpp': return 'main.cpp';
      case 'c': return 'main.c';
      case 'java': default: return 'Main.java';
    }
  };

  const getMonacoLang = (lang) => {
    switch (lang) {
      case 'cpp': return 'cpp';
      case 'c': return 'c';
      case 'python': return 'python';
      case 'java': default: return 'java';
    }
  };

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Define a clean light theme that won't fight Tailwind resets
    monaco.editor.defineTheme('codehunt-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'D73A49', fontStyle: 'bold' },
        { token: 'type', foreground: 'E36209' },
        { token: 'string', foreground: '22863A' },
        { token: 'number', foreground: '005CC5' },
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'delimiter', foreground: '24292E' },
        { token: 'identifier', foreground: '24292E' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#24292E',
        'editor.lineHighlightBackground': '#F6F8FA',
        'editor.selectionBackground': '#BBDEFB',
        'editorCursor.foreground': '#F97316',
        'editor.inactiveSelectionBackground': '#E8F0FE',
        'editorLineNumber.foreground': '#BDBDBD',
        'editorLineNumber.activeForeground': '#F97316',
        'editorIndentGuide.background': '#EEEEEE',
        'editorIndentGuide.activeBackground': '#CCCCCC',
      },
    });
    monaco.editor.setTheme('codehunt-light');

    // Focus and recalculate layout after mount
    editor.focus();
    // Multiple layout passes to handle container resize race conditions
    requestAnimationFrame(() => {
      editor.layout();
      // Second pass after the DOM has fully settled
      setTimeout(() => editor.layout(), 100);
    });
  }, []);

  // Robust resize observer to keep Monaco layout in sync
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="code-editor-root">
      {/* macOS-style title bar */}
      <div className="code-editor-titlebar">
        <div className="code-editor-dots">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
        </div>
        <span className="code-editor-filename">
          {language.toUpperCase()} — {getExtension(language)}
        </span>
      </div>

      {/* Monaco Editor container */}
      <div className="code-editor-body">
        <Editor
          key={language}
          height="100%"
          language={getMonacoLang(language)}
          defaultValue={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          loading={
            <div className="code-editor-loading">
              <div className="code-editor-spinner"></div>
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: false, // We handle layout ourselves via ResizeObserver
            padding: { top: 16, bottom: 16 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            cursorStyle: 'line',
            cursorWidth: 2,
            renderLineHighlight: 'all',
            smoothScrolling: true,
            mouseWheelZoom: false,
            contextmenu: false,      // Disabled for security (right-click blocked anyway)
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'off',
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            glyphMargin: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
            // Prevent copy/paste at the editor level (security requirement)
            domReadOnly: false,
          }}
        />
      </div>
    </div>
  );
}