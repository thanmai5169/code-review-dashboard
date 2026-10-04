import React, { useState, useEffect } from 'react';
import API from '../services/api';
import DiffViewer from '../components/DiffViewer/DiffViewer';
import { History, Calendar, Award, TrendingUp, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export const TimeMachinePage = () => {
  const [filesList, setFilesList] = useState([]);
  const [selectedHash, setSelectedHash] = useState('');
  const [timeline, setTimeline] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState({ v1: null, v2: null }); // indices
  const [diffData, setDiffData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);

  // Fetch files list on mount
  useEffect(() => {
    const fetchIndex = async () => {
      try {
        setLoadingList(true);
        const response = await API.get('/reviews/versions');
        setFilesList(response.data || []);
        if (response.data?.length > 0) {
          setSelectedHash(response.data[0].fileHash);
        }
      } catch (err) {
        console.warn('Failed to load version history:', err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchIndex();
  }, []);

  // Fetch timeline when selected file changes
  useEffect(() => {
    if (!selectedHash) return;
    const fetchTimeline = async () => {
      try {
        setLoadingTimeline(true);
        const response = await API.get(`/reviews/versions/${selectedHash}`);
        setTimeline(response.data);
        setSelectedVersions({ v1: null, v2: null });
        setDiffData(null);
      } catch (err) {
        toast.error('Failed to load file timeline');
      } finally {
        setLoadingTimeline(false);
      }
    };
    fetchTimeline();
  }, [selectedHash]);

  // Fetch diff data when two bubbles are selected
  useEffect(() => {
    if (selectedVersions.v1 === null || selectedVersions.v2 === null) return;
    const fetchDiff = async () => {
      try {
        setLoadingDiff(true);
        const { v1, v2 } = selectedVersions;
        const response = await API.get(`/reviews/versions/${selectedHash}/diff?v1=${v1}&v2=${v2}`);
        setDiffData(response.data);
      } catch (err) {
        toast.error('Failed to calculate diff content');
      } finally {
        setLoadingDiff(false);
      }
    };
    fetchDiff();
  }, [selectedVersions, selectedHash]);

  const selectVersion = (idx) => {
    setSelectedVersions(prev => {
      if (prev.v1 === null) return { v1: idx, v2: prev.v2 };
      if (prev.v2 === null && idx !== prev.v1) return { v1: prev.v1, v2: idx };
      // If both are selected, reset and select first
      return { v1: idx, v2: null };
    });
  };

  const getScoreColor = (score) => {
    if (score < 50) return 'bg-danger text-white border-danger';
    if (score < 75) return 'bg-warning text-bg-0 border-warning';
    return 'bg-success text-bg-0 border-success';
  };

  // Compute milestones
  const getTimelineMilestone = () => {
    if (!timeline || timeline.versions.length < 2) return null;
    const v = timeline.versions;
    const startScore = v[0].score;
    const endScore = v[v.length - 1].score;
    const diff = endScore - startScore;
    
    return {
      startScore,
      endScore,
      diff,
      improvementText: diff >= 0 ? `+${diff} pts ↑` : `${diff} pts ↓`
    };
  };

  const milestone = getTimelineMilestone();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none font-body">
      
      {/* Header */}
      <div className="bg-bg-1 border border-border p-6 rounded-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-1 font-display flex items-center gap-2">
            <History className="text-accent" size={20} /> Code Review Time Machine
          </h2>
          <p className="text-xs text-text-2 mt-1">
            Compare score progression history and review visual side-by-side code diffs across submissions.
          </p>
        </div>

        {/* Dropdown File selector */}
        {!loadingList && filesList.length > 0 && (
          <select
            value={selectedHash}
            onChange={(e) => setSelectedHash(e.target.value)}
            className="bg-bg-2 border border-border px-3 py-1.5 rounded text-xs text-text-1 focus:outline-none focus:border-accent"
          >
            {filesList.map(f => (
              <option key={f.fileHash} value={f.fileHash}>{f.fileName}</option>
            ))}
          </select>
        )}
      </div>

      {loadingList || loadingTimeline ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <RefreshCw size={24} className="text-accent animate-spin" />
          <span className="text-xs text-text-2">Traveling through time...</span>
        </div>
      ) : filesList.length === 0 ? (
        <div className="text-center py-20 text-xs text-text-2">
          No version history recorded yet. Submit reviews of the same file title to track versions.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Milestone stats */}
          {milestone && (
            <div className="bg-bg-1 border border-border p-5 rounded-lg shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-success" size={20} />
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider block">Score Journey</span>
                  <span className="text-xs text-text-1 font-semibold">
                    v1 score: <strong className="text-danger">{milestone.startScore}</strong> to latest: <strong className="text-success">{milestone.endScore}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider">Overall Improvement:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${milestone.diff >= 0 ? 'bg-success/15 text-success border border-success/20' : 'bg-danger/15 text-danger border border-danger/20'}`}>
                  {milestone.improvementText}
                </span>
              </div>
            </div>
          )}

          {/* Timeline visualization */}
          <div className="bg-bg-1 border border-border rounded-lg p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-1.5">
              <Layers size={14} className="text-accent2" /> Version Submission Timeline
            </h3>
            
            <p className="text-[11px] text-text-2">
              💡 Select any two bubbles to calculate a side-by-side git code diff comparison.
            </p>

            <div className="relative pt-6 pb-2 overflow-x-auto">
              {/* Horizontal Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
              
              {/* Timeline bubbles */}
              <div className="relative flex justify-between gap-12 px-6 z-10 min-w-[500px]">
                {timeline?.versions?.map((ver, idx) => {
                  const isV1 = selectedVersions.v1 === idx;
                  const isV2 = selectedVersions.v2 === idx;
                  const isSelected = isV1 || isV2;

                  return (
                    <button
                      key={idx}
                      onClick={() => selectVersion(idx)}
                      className={`flex flex-col items-center gap-2 bg-bg-1 border rounded-xl px-4 py-3 shrink-0 transition-all ${
                        isSelected 
                          ? 'border-accent ring-2 ring-accent/30 scale-105 shadow-lg' 
                          : 'border-border hover:border-text-2 hover:scale-102'
                      }`}
                    >
                      <span className="text-[10px] text-text-2 font-semibold font-mono flex items-center gap-1">
                        <Calendar size={10} /> {new Date(ver.submittedAt).toLocaleDateString()}
                      </span>
                      
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono border shadow ${getScoreColor(ver.score)}`}>
                        {ver.score}
                      </div>

                      <div className="text-center">
                        <p className="text-[10px] font-bold text-text-1">Version {idx + 1}</p>
                        <p className="text-[9px] text-text-2">{ver.findings} findings</p>
                      </div>
                      
                      {/* Badge indicator */}
                      {isV1 && <span className="bg-accent text-bg-0 font-bold text-[8px] px-1.5 py-0.2 rounded-full uppercase">Source v1</span>}
                      {isV2 && <span className="bg-accent2 text-bg-0 font-bold text-[8px] px-1.5 py-0.2 rounded-full uppercase">Target v2</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Diff Viewer panel */}
          {selectedVersions.v1 !== null && selectedVersions.v2 !== null && (
            <div className="bg-bg-1 border border-border rounded-lg p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
                <h4 className="text-xs font-bold text-text-1 font-display">
                  Comparing Version {selectedVersions.v1 + 1} with Version {selectedVersions.v2 + 1}
                </h4>
                
                {/* Delta calculation */}
                {diffData && (
                  <div className="text-xs flex items-center gap-2">
                    <span className="text-text-2">Score delta:</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      diffData.v2.score - diffData.v1.score >= 0 
                        ? 'bg-success/15 text-success' 
                        : 'bg-danger/15 text-danger'
                    }`}>
                      {diffData.v2.score - diffData.v1.score >= 0 ? '+' : ''}
                      {diffData.v2.score - diffData.v1.score} points
                    </span>
                  </div>
                )}
              </div>

              {loadingDiff ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <RefreshCw size={20} className="text-accent animate-spin" />
                  <span className="text-xs text-text-2">Calculating diff blocks...</span>
                </div>
              ) : diffData ? (
                <div className="border border-border rounded overflow-hidden">
                  <DiffViewer
                    originalCode={diffData.v1.code}
                    optimizedCode={diffData.v2.code}
                    language={timeline?.versions?.[0]?.reviewId?.language || 'javascript'}
                  />
                </div>
              ) : null}
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default TimeMachinePage;
