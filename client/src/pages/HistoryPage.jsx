import React, { useEffect, useState } from 'react';
import { useReviewStore } from '../store/reviewStore';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { SeverityBadge, SourceBadge } from '../components/Shared/Badges';
import { Search, Filter, BookOpen, Bookmark, Trash2, Calendar, Clipboard } from 'lucide-react';
import toast from 'react-hot-toast';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const { reviews, fetchReviews, pagination, toggleBookmark, fetchReviewDetails } = useReviewStore();

  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'snippets'
  const [snippets, setSnippets] = useState([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [severity, setSeverity] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  // Fetch reviews on filters or page change
  useEffect(() => {
    if (activeTab === 'history') {
      fetchReviews(page, { search, language, severity, date: dateFilter });
    } else {
      fetchUserSnippets();
    }
  }, [page, search, language, severity, dateFilter, activeTab]);

  // Fetch snippets
  const fetchUserSnippets = async () => {
    try {
      const response = await API.get('/history/snippets');
      setSnippets(response.data);
    } catch (error) {
      console.warn('Failed to load saved snippets');
    }
  };

  const handleSelectReview = async (reviewId) => {
    try {
      await fetchReviewDetails(reviewId);
      navigate('/');
    } catch (err) {
      toast.error('Failed to load review workspace details');
    }
  };

  const handleDeleteSnippet = async (snippetId) => {
    if (window.confirm('Delete this code snippet?')) {
      try {
        await API.delete(`/history/snippets/${snippetId}`);
        toast.success('Snippet removed');
        fetchUserSnippets();
      } catch (error) {
        toast.error('Failed to delete snippet');
      }
    }
  };

  const copySnippetCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Snippet copied to clipboard!');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {/* Search & Tabs Switcher */}
      <div className="bg-bg-1 border border-border p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        
        {/* Toggle tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'history' ? 'bg-bg-2 text-accent border border-border' : 'text-text-2 hover:text-text-1'}`}
          >
            <BookOpen size={14} /> Scan Run History
          </button>
          <button
            onClick={() => setActiveTab('snippets')}
            className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'snippets' ? 'bg-bg-2 text-accent2 border border-border' : 'text-text-2 hover:text-text-1'}`}
          >
            <Bookmark size={14} /> Bookmarked Snippets
          </button>
        </div>

        {/* Inputs parameters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2 text-text-2" size={14} />
            <input
              type="text"
              placeholder="Search code logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-bg-2 border border-border rounded pl-9 pr-3 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent"
            />
          </div>

          {activeTab === 'history' && (
            <>
              {/* Language filter */}
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setPage(1);
                }}
                className="bg-bg-2 border border-border rounded px-2.5 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent capitalize"
              >
                <option value="">Languages</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>

              {/* Severity filter */}
              <select
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  setPage(1);
                }}
                className="bg-bg-2 border border-border rounded px-2.5 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent capitalize"
              >
                <option value="">Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Date Filter (Calendar Picker) */}
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-bg-2 border border-border rounded px-2.5 py-1.5 text-xs text-text-1 focus:outline-none focus:border-accent scheme-dark"
                  title="Filter by audit date"
                />
                {dateFilter && (
                  <button
                    onClick={() => {
                      setDateFilter('');
                      setPage(1);
                    }}
                    className="absolute right-8 text-[10px] text-accent hover:underline font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Lists area */}
      <div className="bg-bg-1 border border-border rounded-lg shadow-xl overflow-hidden">
        {activeTab === 'history' ? (
          /* Scan Run History table */
          reviews.length === 0 ? (
            <div className="text-center py-20 text-xs text-text-2">
              No historical code audits logged. Run a scan in the workspace to populate this grid.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-2 border-b border-border text-text-2 uppercase font-bold tracking-wider text-[10px]">
                    <th className="px-6 py-3">Audit Title</th>
                    <th className="px-6 py-3">Language</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Overall Score</th>
                    <th className="px-6 py-3">Critical Warnings</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-1">
                  {reviews.map((r) => {
                    const criticalCount = r.findings?.filter(f => f.severity === 'critical').length || 0;
                    return (
                      <tr 
                        key={r._id} 
                        className="hover:bg-bg-2/30 cursor-pointer transition-colors"
                        onClick={() => handleSelectReview(r._id)}
                      >
                        <td className="px-6 py-4 font-semibold text-text-1 truncate max-w-xs">
                          {r.title}
                        </td>
                        <td className="px-6 py-4 font-mono capitalize">
                          {r.language}
                        </td>
                        <td className="px-6 py-4 text-text-2 flex items-center gap-1">
                          <Calendar size={12} /> {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold font-display px-2 py-0.5 rounded ${r.metrics.overallScore >= 85 ? 'text-success bg-success/10' : r.metrics.overallScore >= 60 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'}`}>
                            {r.metrics.overallScore}/100
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {criticalCount > 0 ? (
                            <span className="bg-danger/10 text-danger border border-danger/25 text-[10px] px-1.5 py-0.5 rounded font-bold">
                              ⚠️ {criticalCount} Critical
                            </span>
                          ) : (
                            <span className="text-text-2">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={async () => {
                              await toggleBookmark(r._id);
                              toast.success('Updated bookmark status');
                              fetchReviews(page, { search, language, severity });
                            }}
                            className="text-text-2 hover:text-warning p-1"
                            title="Toggle Bookmark"
                          >
                            <Bookmark size={14} className={r.isBookmarked ? 'fill-warning text-warning' : ''} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Paginate control */}
              {pagination.pages > 1 && (
                <div className="bg-bg-2/50 border-t border-border px-6 py-3.5 flex items-center justify-between">
                  <span className="text-xs text-text-2">
                    Page {page} of {pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="bg-bg-1 border border-border hover:bg-border disabled:opacity-40 px-3 py-1 rounded text-xs transition-all"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                      className="bg-bg-1 border border-border hover:bg-border disabled:opacity-40 px-3 py-1 rounded text-xs transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Saved Snippets List */
          snippets.length === 0 ? (
            <div className="text-center py-20 text-xs text-text-2">
              No saved snippets. Star scans or bookmark scripts to populate this vault.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {snippets.map((sn) => (
                <div key={sn._id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-bg-2/10">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-text-1">{sn.title}</h4>
                      <span className="bg-bg-2 border border-border text-text-2 font-mono text-[9px] px-1.5 py-0.5 rounded capitalize">
                        {sn.language}
                      </span>
                    </div>
                    <pre className="text-[10px] bg-bg-2 p-2 border border-border rounded font-mono text-text-2 max-h-24 overflow-y-auto max-w-2xl whitespace-pre-wrap">
                      {sn.code}
                    </pre>
                  </div>
                  <div className="flex gap-2 self-stretch md:self-auto justify-end">
                    <button
                      onClick={() => copySnippetCode(sn.code)}
                      className="bg-bg-2 border border-border hover:bg-border p-2 rounded text-text-2 hover:text-text-1"
                      title="Copy Code"
                    >
                      <Clipboard size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSnippet(sn._id)}
                      className="bg-danger/10 border border-danger/20 hover:bg-danger p-2 rounded text-danger hover:text-white"
                      title="Delete Snippet"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
};

export default HistoryPage;
