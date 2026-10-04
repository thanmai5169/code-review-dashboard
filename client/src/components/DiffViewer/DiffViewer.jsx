import React, { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { Columns, Eye, FileCode, Check, ChevronDown } from 'lucide-react';

export const DiffViewer = ({ 
  originalCode, 
  optimizedCode, 
  language = 'javascript', 
  changedFiles = [], 
  currentFileName = null,
  onSelectFile = null 
}) => {
  const [splitView, setSplitView] = useState(true);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  // If changedFiles is supplied, use active file
  const activeFile = changedFiles.length > 0 
    ? (changedFiles.find(f => f.name === currentFileName) || changedFiles[selectedFileIdx] || changedFiles[0])
    : null;

  const oldCode = activeFile 
    ? (activeFile.originalContent || activeFile.patch || '')
    : (originalCode || '');

  const newCode = activeFile 
    ? (activeFile.optimizedContent || activeFile.content || oldCode)
    : (optimizedCode || originalCode || '');

  // Styling properties matching the VS Code / GitHub dark theme
  const darkThemeStyles = {
    variables: {
      dark: {
        diffViewerBackground: '#0d1117',
        diffViewerColor: '#e6edf3',
        addedBackground: 'rgba(63, 185, 80, 0.15)',
        addedColor: '#3fb950',
        removedBackground: 'rgba(248, 81, 73, 0.15)',
        removedColor: '#f85149',
        wordAddedBackground: 'rgba(63, 185, 80, 0.3)',
        wordRemovedBackground: 'rgba(248, 81, 73, 0.3)',
        addedGutterBackground: 'rgba(63, 185, 80, 0.05)',
        removedGutterBackground: 'rgba(248, 81, 73, 0.05)',
        gutterBackground: '#0d1117',
        gutterColor: '#8b949e',
        emptyLineBackground: '#0d1117',
        lineNumberColor: '#8b949e',
        diffCodeColor: '#e6edf3'
      }
    },
    line: {
      padding: '2px 0',
      fontSize: '12px',
      fontFamily: '"Fira Code", monospace'
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'added':
        return 'bg-success/15 text-success border-success/30';
      case 'deleted':
        return 'bg-danger/15 text-danger border-danger/30';
      case 'renamed':
        return 'bg-accent2/15 text-accent2 border-accent2/30';
      case 'modified':
      default:
        return 'bg-warning/15 text-warning border-warning/30';
    }
  };

  return (
    <div className="w-full h-full flex flex-col border border-border rounded-lg bg-bg-0 overflow-hidden font-body select-none">
      
      {/* Controls Header */}
      <div className="flex flex-wrap justify-between items-center bg-bg-1 px-4 py-2.5 border-b border-border gap-3">
        
        {/* File selector (if multi-file review) */}
        {changedFiles.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-2 font-mono flex items-center gap-1">
              <FileCode size={13} className="text-accent" /> File:
            </span>
            <select
              value={activeFile?.name || ''}
              onChange={(e) => {
                if (onSelectFile) onSelectFile(e.target.value);
                const idx = changedFiles.findIndex(f => f.name === e.target.value);
                if (idx !== -1) setSelectedFileIdx(idx);
              }}
              className="bg-bg-2 border border-border rounded px-2.5 py-1 text-xs text-text-1 font-mono focus:outline-none focus:border-accent"
            >
              {changedFiles.map((file, i) => (
                <option key={i} value={file.name}>
                  {file.name} (+{file.additions || 0}/-{file.deletions || 0})
                </option>
              ))}
            </select>

            {activeFile && (
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getStatusBadge(activeFile.status)}`}>
                {activeFile.status || 'modified'}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-2">⚖️ Code Diff Inspector</span>
            {activeFile && (
              <span className="text-xs font-mono text-text-1 font-bold">
                {activeFile.name}
              </span>
            )}
          </div>
        )}

        {/* View mode toggle */}
        <button
          onClick={() => setSplitView(!splitView)}
          className="flex items-center gap-1.5 bg-bg-2 border border-border hover:bg-border px-3 py-1 rounded text-xs text-text-1 font-semibold transition-all"
        >
          {splitView ? (
            <>
              <Eye size={12} /> Unified View
            </>
          ) : (
            <>
              <Columns size={12} /> Split View
            </>
          )}
        </button>
      </div>

      {/* Diff Panel */}
      <div className="flex-1 overflow-y-auto min-h-[420px]">
        {oldCode ? (
          <ReactDiffViewer
            oldValue={oldCode}
            newValue={newCode}
            splitView={splitView}
            useDarkTheme={true}
            styles={darkThemeStyles}
            leftTitle="Original Source / Diff Base"
            rightTitle="Optimized Target / Applied Fixes"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-text-2 py-24">
            No code diff data available. Run a scan or select a review session to inspect changes.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffViewer;
