import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { 
  Award, 
  Flame, 
  Zap, 
  ShieldAlert, 
  Award as BadgeIcon, 
  Lightbulb, 
  Code2, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import API from '../services/api';

export const SkillGrowthPage = () => {
  const [stats, setStats] = useState(null);
  const [weaknessData, setWeaknessData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [growthRes, weaknessRes] = await Promise.all([
        API.get('/analytics/skill-growth'),
        API.get('/analytics/weakness-report')
      ]);
      setStats(growthRes.data);
      setWeaknessData(weaknessRes.data?.weaknesses || []);
    } catch (err) {
      console.warn('Failed to load growth tracking details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3 font-body">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
        <span className="text-xs text-text-2">Compiling developer skill telemetry...</span>
      </div>
    );
  }

  const hasData = stats && stats.weeklyStats && stats.weeklyStats.length > 0;
  const latestStat = hasData ? stats.weeklyStats[stats.weeklyStats.length - 1] : null;

  // Radar chart data from latest week stats or baseline
  const radarData = latestStat ? [
    { subject: 'Bugs', A: Math.max(100 - (latestStat.categoryBreakdown?.bugs * 6 || 0), 20), fullMark: 100 },
    { subject: 'Security', A: Math.max(100 - (latestStat.categoryBreakdown?.security * 6 || 0), 20), fullMark: 100 },
    { subject: 'Performance', A: Math.max(100 - (latestStat.categoryBreakdown?.performance * 6 || 0), 20), fullMark: 100 },
    { subject: 'Style', A: Math.max(100 - (latestStat.categoryBreakdown?.style * 6 || 0), 20), fullMark: 100 },
    { subject: 'Overall', A: latestStat.averageScore || 100, fullMark: 100 }
  ] : [
    { subject: 'Bugs', A: 100, fullMark: 100 },
    { subject: 'Security', A: 100, fullMark: 100 },
    { subject: 'Performance', A: 100, fullMark: 100 },
    { subject: 'Style', A: 100, fullMark: 100 },
    { subject: 'Overall', A: 100, fullMark: 100 }
  ];

  // Line chart progression
  const lineChartData = stats?.weeklyStats?.map(w => ({
    date: new Date(w.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: w.averageScore
  })) || [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none font-body">
      
      {/* Page Header */}
      <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-1 font-display flex items-center gap-2">
            <Award className="text-accent" size={22} /> Developer Skill Growth & Learning
          </h1>
          <p className="text-xs text-text-2 mt-1">
            Tracks weekly code quality trends, active review streaks, badge achievements, and AI-recommended habits.
          </p>
        </div>
        
        {/* Streak details */}
        <div className="bg-bg-2 border border-border px-4 py-2 rounded-xl flex items-center gap-3">
          <Flame className="text-orange-500 animate-pulse" size={26} />
          <div>
            <span className="text-[9px] uppercase font-bold text-text-2 tracking-wider block">Active Streak</span>
            <span className="text-lg font-extrabold text-text-1">{stats?.streakDays || 0} Days</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        /* Empty state with helpful guide */
        <div className="bg-bg-1 border border-border rounded-xl p-10 text-center shadow-xl space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <Compass size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-1">No Skill Telemetry Yet</h3>
            <p className="text-xs text-text-2 max-w-md mx-auto mt-1 leading-relaxed">
              Skill progression, quality trends, and weakness reports are automatically computed from your code review history. Complete your first review to unlock personalized telemetry!
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/review"
              className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-accent/15 transition-all"
            >
              <Code2 size={14} /> Start Code Review
            </Link>
            <Link
              to="/repositories"
              className="bg-bg-2 border border-border hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
            >
              <TrendingUp size={14} /> Audit GitHub PR
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Line Chart: Score progression */}
            <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-accent" /> Weekly Quality Score Trend
              </h3>
              {lineChartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-20 text-xs text-text-2">
                  No progression data available yet. Complete more reviews!
                </div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="date" stroke="#8b949e" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="#8b949e" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '12px', color: '#e6edf3', borderRadius: '8px' }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#58a6ff" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Radar Chart: Skill Pentagon */}
            <div className="bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-accent2" /> Skill Pentagon (Latest Week)
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#30363d" />
                    <PolarAngleAxis dataKey="subject" stroke="#8b949e" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#30363d" fontSize={8} />
                    <Radar name="Quality" dataKey="A" stroke="#bc8cff" fill="#bc8cff" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Row: Weaknesses & Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Badges Shelf */}
            <div className="lg:col-span-1 bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-1.5">
                <BadgeIcon size={14} className="text-accent2" /> Badge Shelf
              </h3>
              {(!stats?.badges || stats.badges.length === 0) ? (
                <div className="flex-grow flex flex-col items-center justify-center py-8 text-center text-xs text-text-2 gap-2">
                  <Zap size={24} className="text-text-2 opacity-30" />
                  <span className="max-w-[200px]">Complete zero-critical audits or maintain streaks to unlock badges!</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {stats.badges.map((badge, idx) => (
                    <div 
                      key={idx} 
                      className="bg-bg-2 border border-border p-3.5 rounded-lg text-center flex flex-col items-center gap-2 hover:border-accent2 transition-all cursor-default"
                    >
                      <span className="text-2xl">{badge.includes('🔒') ? '🔒' : badge.includes('🏆') ? '🏆' : '🔥'}</span>
                      <span className="text-[10px] font-bold text-text-1">{badge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weakness & Habits Reports */}
            <div className="lg:col-span-2 bg-bg-1 border border-border p-6 rounded-xl shadow-xl flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-danger" /> Top Weakness & Habits Report
              </h3>
              {weaknessData.length === 0 ? (
                <div className="flex-grow flex items-center justify-center py-10 text-xs text-text-2">
                  No critical weakness patterns detected in recent audits. Keep writing clean code!
                </div>
              ) : (
                <div className="space-y-4">
                  {weaknessData.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="bg-bg-2 border border-border p-4 rounded-xl flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-danger/20 text-danger bg-danger/10">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-text-2 font-mono">
                          {item.count} findings recorded
                        </span>
                      </div>
                      <p className="text-xs text-text-1 mt-1 leading-relaxed italic flex items-start gap-2 bg-bg-0/50 p-2.5 rounded-lg border border-border/60">
                        <Lightbulb size={14} className="text-warning shrink-0 mt-0.5" />
                        "{item.tip}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
};

export default SkillGrowthPage;
