import React, { useRef, useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { SeverityBadge, CategoryBadge } from '../Shared/Badges';
import { Sparkles, Undo2, Check } from 'lucide-react';

export const CodeEditor = ({ 
  code, 
  onChange, 
  language = 'javascript', 
  theme = 'vs-dark',
  findings = [],
  onApplyFix,
  isScanning = false,
  scanningStatus = ''
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const [popover, setPopover] = useState(null); // { finding, x, y, lineStart, lineEnd }

  // Sync decorations when findings or editor loads
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || findings.length === 0) {
      // Clear decorations if no findings
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Map findings to Monaco decoration objects
    const newDecorations = findings.map(f => {
      let severityClass = 'monaco-highlight-low';
      if (f.severity === 'critical') severityClass = 'monaco-highlight-critical';
      else if (f.severity === 'high') severityClass = 'monaco-highlight-high';
      else if (f.severity === 'medium') severityClass = 'monaco-highlight-medium';

      return {
        range: new monaco.Range(f.lineStart, 1, f.lineEnd, 100),
        options: {
          isWholeLine: true,
          className: severityClass,
          glyphMarginClassName: 'monaco-glyph-margin',
          minimap: { color: f.severity === 'critical' ? '#f85149' : '#d29922', position: 1 }
        }
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [findings, editorRef.current]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to mouse click events to launch suggestion popovers
    editor.onMouseDown((e) => {
      const target = e.target;
      if (target && target.position) {
        const line = target.position.lineNumber;
        
        // Find if a finding covers this line
        const matchedFinding = findings.find(
          (f) => line >= f.lineStart && line <= f.lineEnd
        );

        if (matchedFinding) {
          // Calculate click coordinates for absolute positioned box
          const pixelCoords = editor.getScrolledVisiblePosition(target.position);
          const editorDom = editor.getDomNode();
          if (editorDom && pixelCoords) {
            const rect = editorDom.getBoundingClientRect();
            setPopover({
              finding: matchedFinding,
              x: pixelCoords.left + rect.left + 50,
              y: pixelCoords.top + rect.top - 40,
              lineStart: matchedFinding.lineStart,
              lineEnd: matchedFinding.lineEnd
            });
          }
        } else {
          setPopover(null);
        }
      }
    });

    // Close popover on editor text changes
    editor.onDidChangeModelContent(() => {
      setPopover(null);
    });
  };

  const executeApplyFix = () => {
    if (!popover || !editorRef.current || !monacoRef.current) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const { finding, lineStart, lineEnd } = popover;

    const range = new monaco.Range(lineStart, 1, lineEnd, 1000);
    const id = { major: 1, minor: 1 };
    const text = finding.fixCode || '';

    // Apply change with Undo support
    const edit = { identifier: id, range, text, forceMoveMarkers: true };
    editor.executeEdits("codelens-ai-fix", [edit]);
    
    // Notify parent to mark finding as resolved in database / state
    if (onApplyFix) {
      onApplyFix(finding._id, editor.getValue());
    }

    setPopover(null);
  };

  return (
    <div className="relative w-full h-full border border-border rounded-lg bg-bg-2 overflow-hidden flex flex-col">
      {/* Editor top headers */}
      <div className="flex justify-between items-center bg-bg-1 px-4 py-2 border-b border-border text-xs text-text-2 font-mono">
        <span>📂 editor_workspace ({language})</span>
        {isScanning && <span className="text-accent animate-pulse">⚡ Scanning...</span>}
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative">
        {/* Animated Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none bg-accent/5">
            {/* The sweeping neon line */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent shadow-md shadow-accent/50 animate-scan"></div>
            
            <div className="absolute inset-0 flex items-center justify-center bg-bg-0/60 backdrop-blur-[1px]">
              <div className="bg-bg-1 border border-border px-6 py-4 rounded-lg shadow-2xl flex flex-col items-center gap-3 max-w-xs text-center">
                <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
                <div>
                  <p className="text-xs font-bold text-text-1">{scanningStatus || 'Analyzing...'}</p>
                  <p className="text-[10px] text-text-2 mt-1">Contacting Google Gemini 1.5 Flash</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <MonacoEditor
          height="100%"
          language={language}
          theme={theme}
          value={code}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: '"Fira Code", monospace',
            fontLigatures: true,
            minimap: { enabled: true },
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: isScanning,
            glyphMargin: true,
            folding: true,
            automaticLayout: true
          }}
        />

        {/* Suggestion Popover popup */}
        {popover && (
          <div 
            style={{ left: `${popover.x - 300}px`, top: `${popover.y - 120}px` }}
            className="absolute z-40 w-96 bg-bg-1 border-2 border-accent2/40 rounded-lg shadow-2xl p-4 text-xs text-text-1 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={popover.finding.severity} />
                <CategoryBadge category={popover.finding.category} />
              </div>
              <button 
                onClick={() => setPopover(null)}
                className="text-[10px] text-text-2 hover:text-text-1"
              >
                Close
              </button>
            </div>

            <p className="font-semibold mb-2 leading-relaxed text-text-1">
              {popover.finding.message}
            </p>

            <div className="bg-bg-2 p-2 rounded border border-border max-h-24 overflow-y-auto mb-3 font-mono text-[10px]">
              <span className="text-text-2 block mb-1">💡 Proposed Change:</span>
              <pre className="text-accent2">{popover.finding.suggestion}</pre>
            </div>

            {popover.finding.fixCode && (
              <button
                onClick={executeApplyFix}
                className="w-full bg-accent2 text-bg-0 hover:bg-accent2/80 py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1"
              >
                <Sparkles size={12} /> Apply AI Fix
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
