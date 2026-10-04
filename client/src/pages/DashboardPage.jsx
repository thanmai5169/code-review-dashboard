import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useReviewStore } from '../store/reviewStore';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Radar, 
  Sparkles, 
  AlertTriangle, 
  ArrowRight, 
  Code2, 
  GitPullRequest, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Play, 
  FileCode,
  Github,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { fetchReviewDetails } = useReviewStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await API.get('/analytics/dashboard');
      setData(response.data);
    } catch (error) {
      console.warn('Failed to load dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenReview = async (reviewId) => {
    try {
      await fetchReviewDetails(reviewId);
      navigate('/review');
    } catch (err) {
      toast.error('Failed to load review workspace');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span className="text-xs text-text-2">Loading CodeLens telemetry...</span>
      </div>
    );
  }

  // Empty state for new accounts (No fake statistics)
  if (!data || !data.hasData || data.totalReviews === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 font-body">
        <div className="bg-bg-1 border border-border p-8 rounded-xl text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <Code2 size={32} />
          </div>
          <h2 className="text-xl font-bold font-display text-text-1">Welcome to CodeLens</h2>
          <p className="text-xs text-text-2 max-w-md mx-auto leading-relaxed">
            An intelligent code review platform that doesn't just find problems — it explains risk, predicts impact, and helps developers write resilient software.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/review')}
              className="bg-accent text-bg-0 hover:bg-accent/85 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-accent/15 transition-all"
            >
              <Play size={14} fill="currentColor" /> Start Your First Code Audit
            </button>
            <button
              onClick={() => navigate('/repositories')}
              className="bg-bg-2 border border-border hover:bg-border text-text-1 px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Github size={14} /> Connect GitHub PR
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg-1 border border-border p-5 rounded-lg space-y-2">
            <Radar className="text-accent" size={20} />
            <h3 className="text-xs font-bold text-text-1">Impact Radar</h3>
            <p className="text-[11px] text-text-2">No historical reviews yet. Audits will automatically construct dependency topologies.</p>
          </div>
          <div className="bg-bg-1 border border-border p-5 rounded-lg space-y-2">
            <ShieldAlert className="text-warning" size={20} />
            <h3 className="text-xs font-bold text-text-1">Deterministic Risk</h3>
            <p className="text-[11px] text-text-2">Risk calculations analyze security findings, cyclomatic AST complexity, and blast radius.</p>
          </div>
          <div className="bg-bg-1 border border-border p-5 rounded-lg space-y-2">
            <Sparkles className="text-accent2" size={20} />
            <h3 className="text-xs font-bold text-text-1">Developer Learning</h3>
            <p className="text-[11px] text-text-2">Tracks recurring mistake categories across real reviews without fabricating metrics.</p>
          </div>
        </div>
      </div>
    );
  }

  const { codeHealth, issueCounts, recentReviews, topRiskyModules, trends, recurringCategories } = data;

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-success bg-success/10 border-success/20';
    if (score >= 60) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-danger bg-danger/10 border-danger/20';
  };

  const getRiskColor = (lvl) => {
    if (lvl === 'CRITICAL') return 'text-danger bg-danger/10 border-danger/25';
    if (lvl === 'HIGH') return 'text-warning bg-warning/10 border-warning/25';
    if (lvl === 'MEDIUM') return 'text-accent2 bg-accent2/10 border-accent2/25';
    return 'text-success bg-success/10 border-success/25';
  };

  const CATEGORY_COLORS = ['#58a6ff', '#bc8cff', '#f85149', '#d29922', '#3fb950'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-body select-none">
      
      {/* Top Banner & Quick Trigger */}
      <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-2">
              Code Health Platform
            </span>
          </div>
          <h1 className="text-xl font-bold font-display text-text-1 mt-1">
            Engineering Quality Dashboard
          </h1>
          <p className="text-xs text-text-2 mt-0.5">
            Active telemetry aggregated across <span className="text-accent font-semibold">{data.totalReviews}</span> recorded code reviews.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/repositories')}
            className="bg-bg-2 border border-border hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Github size={14} /> Audit GitHub PR
          </button>
          <button
            onClick={() => navigate('/review')}
            className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-accent/15 transition-all"
          >
            <Play size={12} fill="currentColor" /> Run New Audit
          </button>
        </div>
      </div>

      {/* Code Health 5 Scorecards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-2">
          Code Health Indices
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-bg-1 border border-border p-4 rounded-xl shadow-md flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider">Overall Quality</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-2xl font-extrabold font-display ${codeHealth.overallQuality >= 80 ? 'text-success' : codeHealth.overallQuality >= 60 ? 'text-warning' : 'text-danger'}`}>
                {codeHealth.overallQuality}
              </span>
              <span className="text-xs text-text-2 font-mono">/ 100</span>
            </div>
          </div>

          <div className="bg-bg-1 border border-border p-4 rounded-xl shadow-md flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider">Review Risk</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-2xl font-extrabold font-display ${codeHealth.reviewRisk > 50 ? 'text-danger' : codeHealth.reviewRisk > 25 ? 'text-warning' : 'text-success'}`}>
                {codeHealth.reviewRisk}
              </span>
              <span className="text-xs text-text-2 font-mono">/ 100</span>
            </div>
          </div>

          <div className="bg-bg-1 border border-border p-4 rounded-xl shadow-md flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider">Security Shield</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-extrabold font-display text-text-1">{codeHealth.security}</span>
              <span className="text-xs text-text-2 font-mono">/ 100</span>
            </div>
          </div>

          <div className="bg-bg-1 border border-border p-4 rounded-xl shadow-md flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider">Maintainability</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-extrabold font-display text-text-1">{codeHealth.maintainability}</span>
              <span className="text-xs text-text-2 font-mono">/ 100</span>
            </div>
          </div>

          <div className="bg-bg-1 border border-border p-4 rounded-xl shadow-md flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider">Performance</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-extrabold font-display text-text-1">{codeHealth.performance}</span>
              <span className="text-xs text-text-2 font-mono">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Severity Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg-1 border border-danger/25 p-4 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-danger tracking-wider block">Critical Issues</span>
            <span className="text-2xl font-black font-display text-text-1 mt-1 block">{issueCounts.critical}</span>
          </div>
          <span className="text-2xl">🚨</span>
        </div>

        <div className="bg-bg-1 border border-warning/25 p-4 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-warning tracking-wider block">High Issues</span>
            <span className="text-2xl font-black font-display text-text-1 mt-1 block">{issueCounts.high}</span>
          </div>
          <span className="text-2xl">⚠️</span>
        </div>

        <div className="bg-bg-1 border border-accent2/25 p-4 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-accent2 tracking-wider block">Medium Issues</span>
            <span className="text-2xl font-black font-display text-text-1 mt-1 block">{issueCounts.medium}</span>
          </div>
          <span className="text-2xl">🟡</span>
        </div>

        <div className="bg-bg-1 border border-border p-4 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-accent tracking-wider block">Low Issues</span>
            <span className="text-2xl font-black font-display text-text-1 mt-1 block">{issueCounts.low}</span>
          </div>
          <span className="text-2xl">🔵</span>
        </div>
      </div>

      {/* Grid: Recent Reviews Table & Top Risky Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Reviews (8 cols) */}
        <div className="lg:col-span-8 bg-bg-1 border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-2">
              <Clock size={14} className="text-accent" /> Recent Code Reviews
            </h3>
            <button
              onClick={() => navigate('/history')}
              className="text-[11px] text-accent hover:underline font-semibold flex items-center gap-1"
            >
              View Full History <ArrowRight size={12} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-2 border-b border-border text-text-2 uppercase font-bold text-[9px] tracking-wider">
                  <th className="px-6 py-3">Audit Target</th>
                  <th className="px-4 py-3 text-center">Quality</th>
                  <th className="px-4 py-3 text-center">Risk Level</th>
                  <th className="px-4 py-3 text-center">Issues</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-1">
                {recentReviews.map((rev) => (
                  <tr
                    key={rev._id}
                    onClick={() => handleOpenReview(rev._id)}
                    className="hover:bg-bg-2/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3.5 max-w-xs">
                      <div className="font-bold text-text-1 truncate">{rev.title}</div>
                      <div className="text-[10px] text-text-2 font-mono flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{rev.language}</span>
                        {rev.github?.prNumber && (
                          <span className="text-accent">PR #{rev.github.prNumber}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${getScoreColor(rev.qualityScore)}`}>
                        {rev.qualityScore}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRiskColor(rev.riskLevel)}`}>
                        {rev.riskLevel}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono font-semibold text-text-2 text-[11px]">
                      {rev.criticalIssues > 0 ? (
                        <span className="text-danger font-bold">⚠️ {rev.criticalIssues} Crit</span>
                      ) : (
                        <span>{rev.totalIssues} items</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-right text-[10px] text-text-2 font-mono">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Impact Radar: Highest-Risk Modules (4 cols) */}
        <div className="lg:col-span-4 bg-bg-1 border border-border rounded-xl shadow-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-2">
                <Radar size={14} className="text-accent2" /> Impact Radar: Risky Files
              </h3>
              <button
                onClick={() => navigate('/impact-radar')}
                className="text-[11px] text-accent hover:underline font-semibold"
              >
                Radar View
              </button>
            </div>

            {topRiskyModules.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-2 italic">
                No high-risk modules flagged in recent audits.
              </div>
            ) : (
              <div className="space-y-3">
                {topRiskyModules.map((mod, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenReview(mod.lastReviewId)}
                    className="p-3 bg-bg-2 border border-border rounded-lg hover:border-text-2 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-text-1 font-mono truncate max-w-[180px]">
                        {mod.filename}
                      </h4>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getRiskColor(mod.riskLevel)}`}>
                        {mod.impactScore} pts
                      </span>
                    </div>
                    <div className="text-[10px] text-text-2 flex justify-between">
                      <span>Seen in {mod.occurrences} review(s)</span>
                      <span className="text-accent hover:underline">Inspect →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <button
              onClick={() => navigate('/impact-radar')}
              className="w-full bg-bg-2 hover:bg-border text-text-1 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Radar size={14} className="text-accent" /> Open Full Impact Radar
            </button>
          </div>
        </div>

      </div>

      {/* Developer Trends: Quality Over Time & Recurring Issue Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Quality & Risk Trends Line Chart */}
        <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-accent" /> Developer Trends: Quality vs Risk
          </h3>
          <div className="w-full h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.qualityOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="date" stroke="#8b949e" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#8b949e" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '12px', color: '#e6edf3' }}
                />
                <Line type="monotone" dataKey="score" stroke="#58a6ff" strokeWidth={2.5} name="Quality Score" activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recurring Categories Bar Chart */}
        <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-2">
            <Zap size={14} className="text-accent2" /> Recurring Issue Categories
          </h3>
          <div className="w-full h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recurringCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" fontSize={10} />
                <YAxis stroke="#8b949e" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '12px', color: '#e6edf3' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {recurringCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
