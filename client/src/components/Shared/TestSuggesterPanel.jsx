import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, RefreshCw, FileCode, Check } from 'lucide-react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export const TestSuggesterPanel = ({ review }) => {
  const [testCode, setTestCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (review && review.generatedTests) {
      setTestCode(review.generatedTests);
    } else {
      setTestCode('');
    }
  }, [review]);

  const generateTests = async () => {
    if (!review) return;
    setLoading(true);
    try {
      toast.loading('Generating unit tests using Gemini...', { id: 'gen_tests' });
      const response = await API.post(`/reviews/${review._id}/generate-tests`);
      setTestCode(response.data.generatedTests);
      // Update the current review object locally
      review.generatedTests = response.data.generatedTests;
      toast.success('Unit tests generated successfully!', { id: 'gen_tests' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate unit tests', { id: 'gen_tests' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!testCode) return;
    navigator.clipboard.writeText(testCode);
    setCopied(true);
    toast.success('Tests copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTestFile = () => {
    if (!testCode || !review) return;
    const lang = review.language || 'javascript';
    let ext = 'js';
    let prefix = '';
    let suffix = '.test';
    
    if (lang === 'python') {
      ext = 'py';
      prefix = 'test_';
      suffix = '';
    } else if (lang === 'typescript') {
      ext = 'ts';
      suffix = '.test';
    } else if (lang === 'go') {
      ext = 'go';
      suffix = '_test';
    } else if (lang === 'java') {
      ext = 'java';
      suffix = 'Test';
    } else if (lang === 'cpp') {
      ext = 'cpp';
      suffix = '_test';
    }

    const cleanTitle = review.title ? review.title.replace(/\.[^/.]+$/, "") : 'code';
    const filename = `${prefix}${cleanTitle}${suffix}.${ext}`;
    const blob = new Blob([testCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded test file: ${filename}`);
  };

  const getFrameworkName = () => {
    const lang = (review?.language || 'javascript').toLowerCase();
    if (lang.includes('python')) return 'pytest';
    if (lang.includes('java')) return 'JUnit';
    if (lang.includes('go')) return 'go test';
    if (lang.includes('cpp') || lang.includes('c++')) return 'Google Test';
    if (lang.includes('csharp') || lang.includes('c#')) return 'NUnit';
    return 'Jest';
  };

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-text-2 gap-2">
        <FileCode size={32} className="animate-pulse text-accent" />
        <span className="text-xs">Run a review audit first to enable unit test generation.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-1 border border-border rounded-lg overflow-hidden min-h-[400px]">
      {/* Header Toolbar */}
      <div className="px-4 py-2 border-b border-border bg-bg-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-1 uppercase tracking-wider font-display">Unit Tests Proposer</span>
          <span className="bg-accent/15 border border-accent/30 text-accent font-bold px-2 py-0.5 rounded text-[10px]">
            {getFrameworkName()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {testCode ? (
            <>
              <button
                onClick={copyToClipboard}
                className="bg-bg-1 border border-border hover:bg-border text-text-2 hover:text-text-1 px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadTestFile}
                className="bg-bg-1 border border-border hover:bg-border text-text-2 hover:text-text-1 px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <Download size={12} /> Download
              </button>
            </>
          ) : null}
          <button
            onClick={generateTests}
            disabled={loading}
            className="bg-accent text-bg-0 hover:bg-accent/80 disabled:opacity-50 px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {testCode ? 'Regenerate Tests' : 'Suggest Unit Tests'}
          </button>
        </div>
      </div>

      {/* Code Editor body */}
      <div className="flex-grow min-h-0 bg-bg-2 h-[350px]">
        {testCode ? (
          <Editor
            height="100%"
            language={review.language === 'python' ? 'python' : 'javascript'}
            value={testCode}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              theme: 'vs-dark',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-2 gap-2 py-20">
            <FileCode size={36} className="text-text-2" />
            <p className="text-xs">No tests generated yet.</p>
            <button
              onClick={generateTests}
              disabled={loading}
              className="mt-2 bg-accent2 text-bg-0 hover:bg-accent2/90 disabled:opacity-50 px-4 py-1.5 rounded text-xs font-bold transition-all"
            >
              Generate unit tests for this code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSuggesterPanel;
