import React, { useState, useEffect } from 'react';
import { useReviewStore } from '../store/reviewStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { detectLanguage } from '../utils/langDetect';
import { useSocket } from '../hooks/useSocket';
import CodeEditor from '../components/Editor/CodeEditor';
import ReviewPanel from '../components/ReviewPanel/ReviewPanel';
import DiffViewer from '../components/DiffViewer/DiffViewer';
import ImpactRadarView from '../components/ImpactRadar/ImpactRadarView';
import RiskAnalysisCard from '../components/RiskAnalysis/RiskAnalysisCard';
import ChatContext from '../components/ChatContext/ChatContext';
import RepoConnectModal from '../components/Shared/RepoConnectModal';
import ExplanationToggle from '../components/Shared/ExplanationToggle';
import IntentInput from '../components/Shared/IntentInput';
import VoiceSummary from '../components/Shared/VoiceSummary';
import TestSuggesterPanel from '../components/Shared/TestSuggesterPanel';
import TranslatorPanel from '../components/Shared/TranslatorPanel';
import { useDropzone } from 'react-dropzone';
import { 
  Play, 
  UploadCloud, 
  Github, 
  Download, 
  Bookmark, 
  BookmarkCheck,
  Eye,
  MessageSquare,
  FileCode,
  FileDown,
  Globe,
  Plus,
  Radar,
  ShieldAlert,
  ListOrdered,
  Layers,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ReviewPage = () => {
  const { 
    currentReview, 
    scanProgress, 
    analyzePaste, 
    analyzeUpload, 
    toggleBookmark, 
    applyFixInReview,
    resolveFinding,
    fetchReviewDetails
  } = useReviewStore();

  const { activeWorkspace } = useWorkspaceStore();

  // Initialize Socket.io connection (and join rooms when review updates)
  useSocket(currentReview?._id);

  const [code, setCode] = useState('// Paste code or inspect changes...\n\nfunction calculateSum(a, b) {\n  return a + b;\n}');
  const [language, setLanguage] = useState('javascript');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'radar' | 'risk' | 'editor' | 'diff' | 'chat' | 'tests' | 'translate'
  const [isGithubOpen, setIsGithubOpen] = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const [intentStatement, setIntentStatement] = useState('');
  const [explanationLevel, setExplanationLevel] = useState('mid');
  const [selectedFileFilter, setSelectedFileFilter] = useState(null);

  // Sync editor value with loaded review
  useEffect(() => {
    if (currentReview) {
      setCode(currentReview.originalCode || '');
      setLanguage(currentReview.language || 'javascript');
      setIntentStatement(currentReview.intentStatement || '');
      setExplanationLevel(currentReview.explanationLevel || 'mid');
      if (currentReview.impactAnalysis?.files?.length > 0) {
        setSelectedFileFilter(currentReview.impactAnalysis.files[0].filename);
      }
    }
  }, [currentReview]);

  // Handle dropzone uploads
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('codeFile', file);
    if (activeWorkspace) {
      formData.append('workspaceId', activeWorkspace._id);
    }
    formData.append('title', file.name);
    formData.append('explanationLevel', explanationLevel);
    formData.append('intentStatement', intentStatement);

    try {
      toast.loading('Uploading and analyzing file with Impact Radar...', { id: 'file_scan' });
      await analyzeUpload(formData);
      toast.success('Analysis complete!', { id: 'file_scan' });
      setActiveTab('overview');
    } catch (error) {
      toast.error(error.message || 'File scan failed', { id: 'file_scan' });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    maxFiles: 1
  });

  const handleRunReview = async () => {
    if (!code.trim()) return toast.error('Code workspace is empty');

    try {
      const workspaceId = activeWorkspace ? activeWorkspace._id : null;
      toast.loading('Running Gemini analysis & Impact Radar...', { id: 'scan' });
      await analyzePaste(code, language, workspaceId, explanationLevel, intentStatement);
      toast.success('Review complete!', { id: 'scan' });
      setActiveTab('overview');
    } catch (err) {
      toast.error(err.message || 'Analysis failed', { id: 'scan' });
    }
  };

  const handleCodeChange = (newVal) => {
    setCode(newVal);
    const detected = detectLanguage(newVal);
    if (detected !== language) {
      setLanguage(detected);
    }
  };

  const handleToggleResolve = async (findingId) => {
    try {
      await resolveFinding(findingId);
      toast.success('Finding resolution updated');
    } catch (err) {
      toast.error('Failed to update finding status');
    }
  };

  const handleApplyFix = async (findingId, fixCode, lineStart, lineEnd, targetFile) => {
    if (!currentReview) return;

    let newOptimizedCode;
    if (lineStart === undefined || lineEnd === undefined) {
      newOptimizedCode = fixCode;
    } else {
      const codeLines = code.split('\n');
      const fixLines = fixCode.split('\n');
      codeLines.splice(lineStart - 1, lineEnd - lineStart + 1, ...fixLines);
      newOptimizedCode = codeLines.join('\n');
    }
    setCode(newOptimizedCode);

    // Update findings: mark target resolved while PRESERVING original category & severity
    const updatedFindings = currentReview.findings.map(f => 
      f._id === findingId 
        ? { ...f, status: 'resolved', resolvedAt: new Date() } 
        : f
    );

    const updatedMetrics = { ...currentReview.metrics };
    updatedMetrics.overallScore = Math.min(100, (updatedMetrics.overallScore || 80) + 4);

    await applyFixInReview(findingId, newOptimizedCode, updatedFindings, updatedMetrics, currentReview.changedFiles);
    toast.success('AI recommendation applied and marked as resolved!');
  };

  const handleFocusLine = (lineStart, targetFile) => {
    if (targetFile) {
      setSelectedFileFilter(targetFile);
    }
    setActiveTab('editor');
    toast(`Focused line ${lineStart}`, { icon: '📍' });
  };

  const handleExport = (format) => {
    if (!currentReview) return;
    setExportDropdown(false);
    
    const token = localStorage.getItem('codelens_token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    window.open(`${socketUrl}/api/export/${currentReview._id}?format=${format}&Authorization=Bearer ${token}`);
  };

  const handleBookmarkToggle = async () => {
    if (!currentReview) return;
    try {
      const isBookmarked = await toggleBookmark(currentReview._id);
      toast.success(isBookmarked ? 'Review bookmarked!' : 'Removed bookmark.');
    } catch (error) {
      toast.error('Failed to update bookmark.');
    }
  };

  const isScanning = scanProgress.percentage > 0 && scanProgress.percentage < 100;

  return (
    <div 
      {...getRootProps()}
      className={`p-6 min-h-[calc(100vh-56px)] flex flex-col gap-6 select-none font-body ${isDragActive ? 'bg-accent/5 border-2 border-dashed border-accent' : ''}`}
    >
      <input {...getInputProps()} />

      {/* Hidden upload dropzone indicator */}
      {isDragActive && (
        <div className="absolute inset-0 z-40 bg-bg-0/80 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-3">
            <UploadCloud size={48} className="text-accent animate-bounce mx-auto" />
            <h2 className="text-lg font-bold text-text-1">Drop file to scan</h2>
            <p className="text-xs text-text-2">Accepts JS, TS, PY, C++, Java, Go files</p>
          </div>
        </div>
      )}

      {/* Top Toolbar panel */}
      <div className="bg-bg-1 border border-border px-4 py-3 rounded-xl flex flex-wrap items-center justify-between shadow-md gap-3">
        
        {/* Left tools: Language, PR connect, File upload */}
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-bg-2 border border-border px-3 py-1.5 rounded-lg text-xs text-text-1 font-mono focus:outline-none focus:border-accent capitalize"
            disabled={isScanning}
          >
            <option value="javascript">🟡 JavaScript</option>
            <option value="typescript">🔵 TypeScript</option>
            <option value="python">🟢 Python</option>
            <option value="java">🟠 Java</option>
            <option value="cpp">🔴 C++</option>
            <option value="csharp">🟣 C#</option>
            <option value="go">🥏 Go</option>
            <option value="php">🐘 PHP</option>
            <option value="ruby">💎 Ruby</option>
          </select>

          <button
            onClick={() => setIsGithubOpen(true)}
            className="bg-bg-2 border border-border hover:bg-border text-text-2 hover:text-text-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            disabled={isScanning}
          >
            <Github size={14} /> Connect PR
          </button>

          <label className="bg-bg-2 border border-border hover:bg-border text-text-2 hover:text-text-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
            <UploadCloud size={14} /> File Upload
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  onDrop(e.target.files);
                }
              }} 
            />
          </label>
        </div>

        {/* Right actions: Explanation Level, Voice, Bookmark, Export, Run Audit */}
        <div className="flex items-center gap-2 flex-wrap">
          <ExplanationToggle level={explanationLevel} onChange={setExplanationLevel} />
          {currentReview && <VoiceSummary review={currentReview} />}

          {currentReview && (
            <button
              onClick={handleBookmarkToggle}
              className="bg-bg-2 border border-border hover:bg-border text-text-2 hover:text-text-1 p-2 rounded-lg transition-colors"
              title="Bookmark Review"
            >
              {currentReview.isBookmarked ? (
                <BookmarkCheck size={14} className="text-warning" />
              ) : (
                <Bookmark size={14} />
              )}
            </button>
          )}

          {currentReview && (
            <div className="relative">
              <button
                onClick={() => setExportDropdown(!exportDropdown)}
                className="bg-bg-2 border border-border hover:bg-border text-text-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} /> Export Report
              </button>
              {exportDropdown && (
                <div className="absolute right-0 mt-1 w-40 bg-bg-2 border border-border rounded-lg shadow-2xl z-30 overflow-hidden divide-y divide-border">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-border text-text-1 flex items-center gap-1.5"
                  >
                    <FileDown size={12} className="text-danger" /> PDF Document
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-border text-text-1 flex items-center gap-1.5"
                  >
                    <FileCode size={12} className="text-accent" /> Markdown Layout
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleRunReview}
            disabled={isScanning}
            className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-accent/15 disabled:opacity-50"
          >
            <Play size={12} fill="currentColor" /> {isScanning ? 'Scanning...' : 'Run Audit Scan'}
          </button>
        </div>
      </div>

      {/* Intent statement input */}
      <IntentInput value={intentStatement} onChange={setIntentStatement} />

      {/* Progress notification banner */}
      {isScanning && (
        <div className="bg-bg-1 border border-accent/30 p-4 rounded-xl shadow-lg flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs font-mono font-bold text-text-1 mb-1">
              <span>{scanProgress.status || 'Scanning code...'}</span>
              <span>{scanProgress.percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all duration-300" style={{ width: `${scanProgress.percentage}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Review Tab Navigation Bar */}
      <div className="bg-bg-1 border border-border rounded-xl p-1.5 shadow-md flex gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'overview' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <Sparkles size={14} /> Executive Overview
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'radar' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <Radar size={14} /> Impact Radar
        </button>

        <button
          onClick={() => setActiveTab('risk')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'risk' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <ShieldAlert size={14} /> Risk Analysis
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'issues' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <Layers size={14} /> Issues ({currentReview?.findings?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'diff' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <Eye size={14} /> Code Diff
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'editor' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <FileCode size={14} /> Monaco Workspace
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'chat' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <MessageSquare size={14} /> AI Chat
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tests' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <Plus size={14} /> Unit Tests
        </button>

        <button
          onClick={() => setActiveTab('translate')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'translate' ? 'bg-accent text-bg-0 shadow-sm' : 'text-text-2 hover:text-text-1 hover:bg-bg-2'
          }`}
        >
          <Globe size={14} /> Translate
        </button>
      </div>

      {/* Main Tab Content Display */}
      <div className="flex-1 min-h-[500px]">
        
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <ReviewPanel
                review={currentReview}
                onFocusLine={handleFocusLine}
                onApplyFix={handleApplyFix}
                onToggleResolve={handleToggleResolve}
                selectedFileFilter={selectedFileFilter}
                onClearFileFilter={() => setSelectedFileFilter(null)}
              />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <RiskAnalysisCard riskAnalysis={currentReview?.riskAnalysis} />
            </div>
          </div>
        )}

        {activeTab === 'radar' && (
          <ImpactRadarView
            review={currentReview}
            onSelectFile={(filename) => {
              setSelectedFileFilter(filename);
              setActiveTab('diff');
            }}
          />
        )}

        {activeTab === 'risk' && (
          <div className="max-w-4xl mx-auto">
            <RiskAnalysisCard riskAnalysis={currentReview?.riskAnalysis} />
          </div>
        )}

        {activeTab === 'issues' && (
          <ReviewPanel
            review={currentReview}
            onFocusLine={handleFocusLine}
            onApplyFix={handleApplyFix}
            onToggleResolve={handleToggleResolve}
            selectedFileFilter={selectedFileFilter}
            onClearFileFilter={() => setSelectedFileFilter(null)}
          />
        )}

        {activeTab === 'diff' && (
          <DiffViewer
            originalCode={currentReview?.originalCode}
            optimizedCode={currentReview?.optimizedCode}
            language={language}
            changedFiles={currentReview?.changedFiles || []}
            currentFileName={selectedFileFilter}
            onSelectFile={setSelectedFileFilter}
          />
        )}

        {activeTab === 'editor' && (
          <div className="h-[600px] bg-bg-1 border border-border rounded-xl p-4 shadow-xl">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              language={language}
              findings={currentReview?.findings || []}
              onApplyFix={handleApplyFix}
              isScanning={isScanning}
              scanningStatus={scanProgress.status}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[600px] bg-bg-1 border border-border rounded-xl p-4 shadow-xl">
            <ChatContext />
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="bg-bg-1 border border-border rounded-xl p-6 shadow-xl">
            <TestSuggesterPanel review={currentReview} />
          </div>
        )}

        {activeTab === 'translate' && (
          <div className="bg-bg-1 border border-border rounded-xl p-6 shadow-xl">
            <TranslatorPanel 
              review={currentReview} 
              onApplyTranslatedCode={(translatedCode) => {
                setCode(translatedCode);
                setActiveTab('editor');
                if (currentReview) {
                  currentReview.originalCode = translatedCode;
                }
              }} 
            />
          </div>
        )}

      </div>

      {/* GitHub connection selector modal */}
      <RepoConnectModal
        isOpen={isGithubOpen}
        onClose={() => setIsGithubOpen(false)}
      />
    </div>
  );
};

export default ReviewPage;
