import React, { useState } from 'react';
import { SeverityBadge, CategoryBadge } from '../Shared/Badges';
import { 
  ShieldCheck, 
  Bug, 
  Zap, 
  Eye, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Filter, 
  Search,
  Check,
  RotateCcw,
  FileCode,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ReviewPanel = ({ 
  review, 
  onFocusLine, 
  onApplyFix, 
  onToggleResolve,
  selectedFileFilter,
  onClearFileFilter 
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'unresolved' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFixFinding, setPreviewFixFinding] = useState(null);

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-1 border border-border rounded-lg text-text-2 text-xs space-y-2">
        <FileCode size={32} className="opacity-40" />
        <span>No audit findings available. Run a review to inspect issues.</span>
      </div>
    );
  }

  const { findings = [], metrics = {}, summary = '', riskAnalysis } = review;

  // Filter findings based on user controls
  const filteredFindings = findings.filter(f => {
    const sevMatch = selectedSeverity === 'all' || f.severity === selectedSeverity;
    const catMatch = selectedCategory === 'all' || f.category === selectedCategory;
    const statMatch = selectedStatus === 'all' || 
      (selectedStatus === 'resolved' && f.status === 'resolved') ||
      (selectedStatus === 'unresolved' && f.status !== 'resolved');
    
    const fileMatch = !selectedFileFilter || selectedFileFilter === 'all' || 
      (f.file && f.file.toLowerCase().includes(selectedFileFilter.toLowerCase()));

    const searchMatch = !searchQuery || 
      (f.message && f.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.suggestion && f.suggestion.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.whyItMatters && f.whyItMatters.toLowerCase().includes(searchQuery.toLowerCase()));

    return sevMatch && catMatch && statMatch && fileMatch && searchMatch;
  });

  const getMetricColor = (val) => {
    if (val >= 90) return 'text-success border-success/25 bg-success/5';
    if (val >= 70) return 'text-warning border-warning/25 bg-warning/5';
    return 'text-danger border-danger/25 bg-danger/5';
  };

  const unresolvedCount = findings.filter(f => f.status !== 'resolved').length;
  const resolvedCount = findings.filter(f => f.status === 'resolved').length;

  return (
    <div className="space-y-6 font-body select-none">
      
      {/* Metrics Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        <div className={`p-3 border rounded-lg text-center ${getMetricColor(metrics.overallScore)}`}>
          <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 block">Quality</span>
          <span className="text-xl font-extrabold font-display mt-0.5 block">{metrics.overallScore}</span>
        </div>
        <div className="p-3 border border-border bg-bg-1 rounded-lg text-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-text-2 block">Bugs</span>
          <span className="text-lg font-bold text-text-1 mt-0.5 block">{metrics.bugs}/100</span>
        </div>
        <div className="p-3 border border-border bg-bg-1 rounded-lg text-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-text-2 block">Security</span>
          <span className="text-lg font-bold text-text-1 mt-0.5 block">{metrics.security}/100</span>
        </div>
        <div className="p-3 border border-border bg-bg-1 rounded-lg text-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-text-2 block">Maintain</span>
          <span className="text-lg font-bold text-text-1 mt-0.5 block">{metrics.maintainability ?? 100}/100</span>
        </div>
        <div className="p-3 border border-border bg-bg-1 rounded-lg text-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-text-2 block">Speed</span>
          <span className="text-lg font-bold text-text-1 mt-0.5 block">{metrics.performance}/100</span>
        </div>
        <div className="p-3 border border-border bg-bg-1 rounded-lg text-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-text-2 block">Style</span>
          <span className="text-lg font-bold text-text-1 mt-0.5 block">{metrics.style}/100</span>
        </div>
      </div>

      {/* AI Assessment Summary */}
      {summary && (
        <div className="bg-bg-1 border border-border p-4 rounded-lg text-xs leading-relaxed text-text-2 shadow-sm">
          <strong className="text-text-1 block mb-1 flex items-center gap-1.5">
            <Sparkles size={14} className="text-accent" /> AI Executive Assessment:
          </strong>
          {summary}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-bg-1 border border-border p-4 rounded-lg space-y-3 shadow-md">
        
        {/* Top search & status tab */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 text-text-2" size={13} />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded pl-8 pr-2 py-1 text-xs text-text-1 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex bg-bg-2 rounded p-0.5 border border-border text-xs w-full sm:w-auto justify-center">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded font-bold transition-all ${selectedStatus === 'all' ? 'bg-accent text-bg-0' : 'text-text-2'}`}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('unresolved')}
              className={`px-3 py-1 rounded font-bold transition-all ${selectedStatus === 'unresolved' ? 'bg-danger text-white' : 'text-text-2'}`}
            >
              Unresolved ({unresolvedCount})
            </button>
            <button
              onClick={() => setSelectedStatus('resolved')}
              className={`px-3 py-1 rounded font-bold transition-all ${selectedStatus === 'resolved' ? 'bg-success text-bg-0' : 'text-text-2'}`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
          <div className="flex flex-wrap gap-2.5">
            {/* Severity */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-bg-2 border border-border rounded px-2 py-1 text-xs text-text-1 focus:outline-none focus:border-accent capitalize"
            >
              <option value="all">All Severities</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🔶 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🔵 Low</option>
              <option value="info">🟢 Info</option>
            </select>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-bg-2 border border-border rounded px-2 py-1 text-xs text-text-1 focus:outline-none focus:border-accent capitalize"
            >
              <option value="all">All Categories</option>
              <option value="bug">🐛 Bugs</option>
              <option value="security">🛡️ Security</option>
              <option value="performance">⚡ Performance</option>
              <option value="maintainability">🏗️ Maintainability</option>
              <option value="style">🎨 Style</option>
              <option value="intent_mismatch">⚠️ Intent Mismatch</option>
            </select>
          </div>

          <span className="text-[11px] font-mono text-text-2">
            Showing {filteredFindings.length} of {findings.length} findings
          </span>
        </div>

        {selectedFileFilter && (
          <div className="flex items-center justify-between bg-accent/10 border border-accent/25 px-3 py-1.5 rounded text-xs text-accent">
            <span>Filtered by file: <strong>{selectedFileFilter}</strong></span>
            {onClearFileFilter && (
              <button onClick={onClearFileFilter} className="underline text-[11px] font-bold">
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Findings Cards List */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="py-12 border border-dashed border-border rounded-lg text-center text-xs text-text-2">
            No audit findings match the active filters.
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isResolved = finding.status === 'resolved';

            return (
              <div
                key={finding._id}
                className={`bg-bg-1 border rounded-lg overflow-hidden flex flex-col md:flex-row transition-all group ${
                  isResolved ? 'border-success/30 bg-success/2 opacity-75' : 'border-border hover:border-text-2'
                }`}
              >
                {/* Left severity indicator border */}
                <div 
                  className={`w-1.5 shrink-0 ${
                    isResolved ? 'bg-success' :
                    finding.severity === 'critical' ? 'bg-danger' :
                    finding.severity === 'high' ? 'bg-warning' :
                    finding.severity === 'medium' ? 'bg-accent2' :
                    finding.severity === 'info' ? 'bg-emerald-500' : 'bg-accent'
                  }`}
                />

                <div className="p-4 flex-1 space-y-2.5">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={finding.severity} />
                      <CategoryBadge category={finding.category} />
                      
                      {finding.file && (
                        <span className="text-[10px] text-accent font-mono bg-bg-2 px-2 py-0.5 rounded border border-border">
                          {finding.file}
                        </span>
                      )}

                      <span className="text-[10px] text-text-2 font-mono">
                        Lines {finding.lineStart} - {finding.lineEnd}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onFocusLine(finding.lineStart, finding.file)}
                        className="text-[10px] text-accent font-semibold flex items-center gap-1 hover:underline"
                        title="Focus line in editor"
                      >
                        <Eye size={11} /> Jump to Code
                      </button>

                      {/* Status Toggle Button */}
                      <button
                        onClick={() => onToggleResolve && onToggleResolve(finding._id)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded border flex items-center gap-1 transition-all ${
                          isResolved 
                            ? 'bg-success text-bg-0 border-success' 
                            : 'bg-bg-2 hover:bg-border text-text-2 hover:text-text-1 border-border'
                        }`}
                      >
                        {isResolved ? (
                          <>
                            <CheckCircle2 size={11} /> Resolved
                          </>
                        ) : (
                          <>
                            <Circle size={11} /> Mark Resolved
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Finding Message */}
                  <h4 className={`text-xs font-bold leading-snug ${isResolved ? 'text-text-2 line-through' : 'text-text-1'}`}>
                    {finding.message}
                  </h4>

                  {/* Why It Matters */}
                  {finding.whyItMatters && (
                    <div className="bg-bg-2/50 border border-border/80 px-3 py-2 rounded text-[11px] text-text-2 leading-relaxed">
                      <strong className="text-text-1 font-semibold block mb-0.5 flex items-center gap-1">
                        <Info size={11} className="text-accent" /> Why this matters:
                      </strong>
                      {finding.whyItMatters}
                    </div>
                  )}

                  {/* Suggested Fix Description */}
                  {finding.suggestion && (
                    <div className="bg-bg-2/30 px-3 py-1.5 rounded text-[11px] text-text-2 border-l-2 border-accent leading-relaxed italic">
                      💡 <strong>Suggested Fix:</strong> {finding.suggestion}
                    </div>
                  )}

                  {/* Action Buttons: Quick Fix */}
                  {finding.fixCode && (
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setPreviewFixFinding(finding)}
                        className="bg-bg-2 hover:bg-border text-text-1 border border-border text-[10px] font-semibold px-2.5 py-1 rounded transition-all"
                      >
                        Preview Fix Diff
                      </button>

                      <button
                        onClick={() => {
                          if (onApplyFix) {
                            onApplyFix(finding._id, finding.fixCode, finding.lineStart, finding.lineEnd, finding.file);
                          }
                        }}
                        className="bg-accent2/15 hover:bg-accent2 text-accent2 hover:text-bg-0 border border-accent2/30 text-[10px] font-bold px-3 py-1 rounded transition-all flex items-center gap-1"
                      >
                        <Sparkles size={11} /> Apply AI Quick Fix
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Fix Preview Modal */}
      {previewFixFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-1 border border-border rounded-xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-1 font-display flex items-center gap-2">
                <Sparkles size={16} className="text-accent2" /> Preview AI Suggested Fix
              </h3>
              <button onClick={() => setPreviewFixFinding(null)} className="text-text-2 hover:text-text-1 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-text-2 uppercase font-bold block">
                Target: {previewFixFinding.file || 'main'} (Lines {previewFixFinding.lineStart}-{previewFixFinding.lineEnd})
              </span>
              <p className="text-xs text-text-1 font-semibold">{previewFixFinding.message}</p>
              
              <div className="bg-bg-0 border border-border rounded-lg p-3 overflow-x-auto max-h-60">
                <pre className="text-xs font-mono text-success whitespace-pre-wrap">
                  {previewFixFinding.fixCode}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setPreviewFixFinding(null)}
                className="bg-bg-2 hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onApplyFix) {
                    onApplyFix(
                      previewFixFinding._id, 
                      previewFixFinding.fixCode, 
                      previewFixFinding.lineStart, 
                      previewFixFinding.lineEnd, 
                      previewFixFinding.file
                    );
                  }
                  setPreviewFixFinding(null);
                }}
                className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-accent/15"
              >
                <Check size={14} /> Apply Recommendation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewPanel;
