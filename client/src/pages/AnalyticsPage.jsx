import React, { useState, useEffect } from 'react';
import API from '../services/api';
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
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { TrendingUp, Award, Activity, AlertCircle } from 'lucide-react';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const response = await API.get('/analytics/summary');
      setData(response.data);
    } catch (error) {
      console.warn('Failed to load quality analytics metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
        <span className="text-xs text-text-2">Calculating quality metrics...</span>
      </div>
    );
  }

  if (!data || data.totalReviews === 0) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-3">
        <AlertCircle className="mx-auto text-accent2" size={40} />
        <h2 className="text-sm font-bold text-text-1">No Quality Analytics Found</h2>
        <p className="text-xs text-text-2">Run reviews in the workspace first to build data metrics.</p>
      </div>
    );
  }

  // Color mappings
  const COLORS = ['#f85149', '#d29922', '#bc8cff', '#58a6ff'];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {/* High Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-1 border border-border p-5 rounded-lg flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-2 block">Average Code Score</span>
            <span className="text-2xl font-bold font-display text-text-1 mt-0.5 block">{data.averageScore}/100</span>
          </div>
        </div>

        <div className="bg-bg-1 border border-border p-5 rounded-lg flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-full bg-accent2/10 flex items-center justify-center text-accent2">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-2 block">Scans Audit Count</span>
            <span className="text-2xl font-bold font-display text-text-1 mt-0.5 block">{data.totalReviews} Total</span>
          </div>
        </div>

        <div className="bg-bg-1 border border-border p-5 rounded-lg flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-2 block">System Health Status</span>
            <span className="text-xs font-bold text-success border border-success/35 bg-success/5 px-2 py-0.5 mt-1.5 rounded inline-block">
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart: Score Trend */}
        <div className="bg-bg-1 border border-border p-6 rounded-lg flex flex-col shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4">Overall Score Trend (Chronological)</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="date" stroke="#8b949e" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#8b949e" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '12px', color: '#e6edf3' }}
                />
                <Line type="monotone" dataKey="score" stroke="#58a6ff" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Categories */}
        <div className="bg-bg-1 border border-border p-6 rounded-lg flex flex-col shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4">Issues by Category</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" fontSize={10} />
                <YAxis stroke="#8b949e" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '12px', color: '#e6edf3' }}
                />
                <Bar dataKey="value" fill="#bc8cff" radius={[4, 4, 0, 0]}>
                  {data.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Severities */}
        <div className="bg-bg-1 border border-border p-6 rounded-lg flex flex-col shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4">Severity Ratios</h3>
          <div className="w-full h-64 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.severities}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.severities.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '12px', color: '#e6edf3' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend indicators */}
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-2 text-xs">
              {data.severities.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-border shrink-0" style={{ backgroundColor: s.color }} />
                  <div>
                    <p className="font-semibold text-text-1">{s.name}</p>
                    <p className="text-[10px] text-text-2">{s.value} incidents</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CSS Heatmap: Mistakes Heatmap */}
        <div className="bg-bg-1 border border-border p-6 rounded-lg flex flex-col shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 mb-4">Mistakes Heatmap (Keyword frequency)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1 items-center">
            {data.mistakesHeatmap.map((item, idx) => {
              // Calculate density color bg opacity
              const maxCount = Math.max(...data.mistakesHeatmap.map(i => i.count), 1);
              const ratio = item.count / maxCount;
              
              let densityColor = 'bg-accent/5 border-border text-text-2';
              if (ratio > 0.8) densityColor = 'bg-danger/25 border-danger/40 text-danger';
              else if (ratio > 0.5) densityColor = 'bg-warning/20 border-warning/35 text-warning';
              else if (ratio > 0.2) densityColor = 'bg-accent/20 border-accent/35 text-accent';

              return (
                <div 
                  key={idx} 
                  className={`border rounded-lg p-3 text-center transition-all ${densityColor}`}
                  title={`${item.count} occurrences found across review logs`}
                >
                  <span className="text-[9px] uppercase font-bold tracking-wide block truncate">{item.keyword}</span>
                  <span className="text-lg font-bold font-display mt-0.5 block">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AnalyticsPage;
