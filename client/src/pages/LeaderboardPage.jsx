import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import API from '../services/api';
import { Award, ShieldCheck, Flame, RefreshCw, Star, TrendingUp } from 'lucide-react';

export const LeaderboardPage = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const response = await API.get(`/workspaces/${activeWorkspace._id}/leaderboard`, {
        params: { period }
      });
      setData(response.data);
    } catch (err) {
      console.warn('Failed to load workspace leaderboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Polling: refresh every 5 minutes
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [activeWorkspace, period]);

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3 font-body">
        <Award className="mx-auto text-accent animate-pulse" size={36} />
        <h3 className="text-sm font-bold text-text-1">No Workspace Selected</h3>
        <p className="text-xs text-text-2">Join or select a workspace to view your team's code health leaderboard.</p>
      </div>
    );
  }

  const rankings = data?.rankings || [];
  const mostImproved = data?.mostImproved || null;

  // Podium arrangement: 2nd place, 1st place, 3rd place
  const topThree = rankings.slice(0, 3);
  const podiumList = [];
  if (topThree[1]) podiumList.push({ ...topThree[1], rank: 2 }); // 2nd place
  if (topThree[0]) podiumList.push({ ...topThree[0], rank: 1 }); // 1st place
  if (topThree[2]) podiumList.push({ ...topThree[2], rank: 3 }); // 3rd place

  const remainingRankings = rankings.slice(3);

  const medalEmojis = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };

  const getPodiumStyling = (rank) => {
    if (rank === 1) return 'border-amber-400 bg-amber-500/5 h-44 shadow-lg shadow-amber-500/5';
    if (rank === 2) return 'border-slate-300 bg-slate-400/5 h-36';
    return 'border-amber-700 bg-amber-800/5 h-32';
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 select-none font-body">
      
      {/* Header toolbar */}
      <div className="bg-bg-1 border border-border p-6 rounded-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-1 font-display flex items-center gap-2">
            <Award className="text-amber-400" size={20} /> Team Code Health Leaderboard
          </h2>
          <p className="text-xs text-text-2 mt-1">
            Compare average review scores, streaks, and focus metrics in <strong>"{activeWorkspace.name}"</strong>.
          </p>
        </div>

        <div className="flex bg-bg-2 rounded p-0.5 border border-border shrink-0">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${period === 'week' ? 'bg-accent text-bg-0' : 'text-text-2 hover:text-text-1'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${period === 'month' ? 'bg-accent text-bg-0' : 'text-text-2'}`}
          >
            Monthly
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <RefreshCw size={24} className="text-accent animate-spin" />
          <span className="text-xs text-text-2">Calculating team ranks...</span>
        </div>
      ) : rankings.length === 0 ? (
        <div className="py-20 border border-dashed border-border rounded-lg text-center text-xs text-text-2">
          No leaderboard history found. Run audits inside the workspace to populate statistics.
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Most improved showcase banner */}
          {mostImproved && (
            <div className="bg-bg-1 border border-border p-4 rounded-lg flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3 text-xs">
                <TrendingUp className="text-success" size={20} />
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider block">Most Improved Developer</span>
                  <span className="text-text-1 font-bold">
                    🚀 {mostImproved.name} (+{mostImproved.delta} pts gain this period!)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Podium section for top 3 */}
          {podiumList.length > 0 && (
            <div className="flex items-end justify-center gap-4 sm:gap-6 pt-6">
              {podiumList.map((player) => (
                <div 
                  key={player.userId}
                  className={`w-28 sm:w-36 border border-border rounded-lg flex flex-col items-center justify-between p-4 ${getPodiumStyling(player.rank)}`}
                >
                  <div className="flex flex-col items-center text-center space-y-1">
                    <span className="text-xl">{medalEmojis[player.rank]}</span>
                    <img
                      src={player.user.avatar ? `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${player.user.avatar}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${player.user.name}`}
                      alt="Avatar podium"
                      className="w-10 h-10 rounded-full border border-border bg-bg-2"
                    />
                    <p className="text-[11px] font-bold text-text-1 truncate max-w-[90px] sm:max-w-[120px]">
                      {player.user.name}
                    </p>
                  </div>

                  <div className="text-center">
                    <span className="text-sm font-extrabold text-text-1">{player.averageScore}</span>
                    <span className="text-[9px] text-text-2 block">Score</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rankings Table */}
          <div className="bg-bg-1 border border-border rounded-lg shadow-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-2 border-b border-border text-text-2 uppercase font-bold text-[9px] tracking-wider">
                  <th className="px-6 py-3 text-center w-16">Rank</th>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3 text-center">Avg Score</th>
                  <th className="px-6 py-3 text-center">Total Reviews</th>
                  <th className="px-6 py-3 text-center">Clean Streak</th>
                  <th className="px-6 py-3">Top Weakness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-1">
                {rankings.map((player, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr key={player.userId} className="hover:bg-bg-2/30">
                      <td className="px-6 py-4 text-center font-bold font-mono">
                        {rank <= 3 ? medalEmojis[rank] : `#${rank}`}
                      </td>
                      
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img
                          src={player.user.avatar ? `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${player.user.avatar}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${player.user.name}`}
                          alt="Avatar row"
                          className="w-7 h-7 rounded-full border border-border bg-bg-2"
                        />
                        <div>
                          <p className="font-bold">{player.user.name}</p>
                          <p className="text-[9px] text-text-2">{player.user.email}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-accent font-mono">
                        {player.averageScore}/100
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-text-2 font-mono">
                        {player.totalReviews}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded font-bold text-[10px]">
                          <ShieldCheck size={10} />
                          {player.cleanStreak}
                        </div>
                      </td>

                      <td className="px-6 py-4 capitalize">
                        {player.mostCommonWeakness === 'none' ? (
                          <span className="text-success text-[10px] font-bold">None 🌟</span>
                        ) : (
                          <span className="text-warning text-[10px] font-bold border border-warning/15 bg-warning/5 px-2 py-0.5 rounded">
                            {player.mostCommonWeakness}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};

export default LeaderboardPage;
