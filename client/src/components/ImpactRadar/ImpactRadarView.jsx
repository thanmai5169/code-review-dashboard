import React, { useState } from 'react';
import { 
  Radar, 
  ShieldAlert, 
  Layers, 
  ArrowRight, 
  FileCode, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  ListOrdered,
  Eye,
  GitCommit,
  Sparkles,
  Info
} from 'lucide-react';

export const ImpactRadarView = ({ review, onSelectFile }) => {
  const impactAnalysis = review?.impactAnalysis;
  const riskAnalysis = review?.riskAnalysis;
  const files = impactAnalysis?.files || [];
  const dependencyGraph = impactAnalysis?.dependencyGraph || { nodes: [], edges: [] };
  const recommendedOrder = impactAnalysis?.recommendedReviewOrder || [];

  const [selectedNodeId, setSelectedNodeId] = useState(
    recommendedOrder.length > 0 ? recommendedOrder[0].filename : (files[0]?.filename || null)
  );

  if (!impactAnalysis || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-1 border border-border rounded-lg text-center space-y-3">
        <Radar size={36} className="text-accent2 opacity-50 animate-pulse" />
        <h3 className="text-sm font-bold text-text-1">No Impact Radar Data</h3>
        <p className="text-xs text-text-2 max-w-sm">
          Run a code review or multi-file PR audit to generate the interactive dependency graph and recommended review order.
        </p>
      </div>
    );
  }

  const selectedFile = files.find(f => f.filename === selectedNodeId) || files[0];
  const selectedNode = dependencyGraph.nodes?.find(n => n.id === selectedNodeId) || {
    id: selectedFile?.filename,
    label: selectedFile?.filename?.split('/').pop(),
    riskLevel: selectedFile?.riskLevel || 'LOW',
    impactScore: selectedFile?.impactScore || 20,
    isChanged: true
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-danger/15 text-danger border-danger/30';
      case 'HIGH':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'MEDIUM':
        return 'bg-accent2/15 text-accent2 border-accent2/30';
      case 'LOW':
      default:
        return 'bg-success/15 text-success border-success/30';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'FIRST':
        return 'bg-danger text-bg-0';
      case 'SECOND':
        return 'bg-warning text-bg-0';
      case 'THIRD':
        return 'bg-accent2 text-bg-0';
      default:
        return 'bg-accent text-bg-0';
    }
  };

  // Node position helper for clean visual layout
  const nodes = dependencyGraph.nodes || [];
  const totalNodes = nodes.length;
  const radius = Math.min(220, Math.max(140, totalNodes * 28));
  const centerX = 320;
  const centerY = 240;

  const nodePositions = new Map();
  nodes.forEach((node, idx) => {
    const angle = (idx / totalNodes) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    nodePositions.set(node.id, { x, y });
  });

  return (
    <div className="space-y-6 select-none font-body">
      
      {/* Signature Header Banner */}
      <div className="bg-bg-1 border border-border p-6 rounded-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">
              Signature AI Architecture
            </span>
          </div>
          <h2 className="text-xl font-bold text-text-1 font-display mt-1 flex items-center gap-2">
            <Radar className="text-accent" size={22} /> Code Change Impact Radar
          </h2>
          <p className="text-xs text-text-2 mt-1 max-w-2xl leading-relaxed">
            Deterministic risk prediction, blast radius tracking, structural dependency topology, and recommended review prioritization.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-bg-2 border border-border px-4 py-2.5 rounded-lg shrink-0">
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-text-2 tracking-wider block">Total Impact Score</span>
            <span className="text-2xl font-extrabold font-display text-text-1">{impactAnalysis.score}/100</span>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-extrabold border ${getRiskBadge(impactAnalysis.riskLevel)}`}>
            {impactAnalysis.riskLevel} RISK
          </span>
        </div>
      </div>

      {/* Main Radar Layout: Interactive Graph + Node Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Dependency & Impact Graph (7 cols) */}
        <div className="lg:col-span-7 bg-bg-1 border border-border rounded-lg p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-2">
              <Layers size={14} className="text-accent2" /> Dependency & Impact Topology
            </h3>
            <span className="text-[11px] text-text-2 font-mono">
              {nodes.length} nodes · {dependencyGraph.edges?.length || 0} links
            </span>
          </div>

          <p className="text-[11px] text-text-2 mb-3">
            💡 Click any node to inspect its change scope, blast radius, security findings, and downstream dependents.
          </p>

          {/* SVG Canvas Graph */}
          <div className="flex-1 bg-bg-0 border border-border rounded-lg overflow-hidden relative flex items-center justify-center min-h-[460px]">
            <svg viewBox="0 0 640 480" className="w-full h-full max-h-[480px]">
              <defs>
                <radialGradient id="radarGrid" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0d1117" stopOpacity="0" />
                </radialGradient>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b949e" opacity="0.6" />
                </marker>
              </defs>

              {/* Background Radar Rings */}
              <circle cx={centerX} cy={centerY} r="220" fill="url(#radarGrid)" stroke="#30363d" strokeDasharray="4 4" strokeWidth="1" />
              <circle cx={centerX} cy={centerY} r="150" fill="none" stroke="#30363d" strokeDasharray="4 4" strokeWidth="1" />
              <circle cx={centerX} cy={centerY} r="80" fill="none" stroke="#30363d" strokeWidth="1" opacity="0.6" />
              <line x1={centerX} y1="20" x2={centerX} y2="460" stroke="#30363d" strokeWidth="0.5" opacity="0.4" />
              <line x1="20" y1={centerY} x2="620" y2={centerY} stroke="#30363d" strokeWidth="0.5" opacity="0.4" />

              {/* Edges */}
              {(dependencyGraph.edges || []).map((edge, idx) => {
                const fromPos = nodePositions.get(edge.from);
                const toPos = nodePositions.get(edge.to);
                if (!fromPos || !toPos) return null;

                const isHighlight = selectedNodeId === edge.from || selectedNodeId === edge.to;

                return (
                  <g key={idx}>
                    <line
                      x1={fromPos.x}
                      y1={fromPos.y}
                      x2={toPos.x}
                      y2={toPos.y}
                      stroke={isHighlight ? '#58a6ff' : '#30363d'}
                      strokeWidth={isHighlight ? 2 : 1}
                      strokeOpacity={isHighlight ? 0.9 : 0.4}
                      markerEnd="url(#arrow)"
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const pos = nodePositions.get(node.id) || { x: centerX, y: centerY };
                const isSelected = selectedNodeId === node.id;
                const isCritical = node.riskLevel === 'CRITICAL';
                const isHigh = node.riskLevel === 'HIGH';

                let nodeColor = '#3fb950'; // LOW
                if (isCritical) nodeColor = '#f85149';
                else if (isHigh) nodeColor = '#d29922';
                else if (node.riskLevel === 'MEDIUM') nodeColor = '#bc8cff';

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer transition-all hover:scale-105"
                  >
                    {/* Pulsing ring for critical/high nodes */}
                    {(isCritical || isHigh) && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelected ? 26 : 22}
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth="1.5"
                        opacity="0.4"
                        className="animate-ping"
                        style={{ transformOrigin: `${pos.x}px ${pos.y}px`, animationDuration: '3s' }}
                      />
                    )}

                    {/* Outer node glow */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? 20 : 16}
                      fill={isSelected ? '#161b22' : '#0d1117'}
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 3 : 2}
                    />

                    {/* Center Icon / Text */}
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      fill={nodeColor}
                      fontSize={isSelected ? "11" : "9"}
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      {node.impactScore}
                    </text>

                    {/* Node Label */}
                    <text
                      x={pos.x}
                      y={pos.y + (isSelected ? 34 : 28)}
                      textAnchor="middle"
                      fill={isSelected ? '#e6edf3' : '#8b949e'}
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontFamily="Inter"
                    >
                      {node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Canvas Legend */}
            <div className="absolute bottom-3 left-3 bg-bg-1/90 backdrop-blur-sm border border-border px-3 py-2 rounded text-[10px] space-y-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" /> Critical</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent2" /> Medium</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Low</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Node Details Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-bg-1 border border-border rounded-lg p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-2 block">
                  Inspecting Module
                </span>
                <h3 className="text-base font-bold text-text-1 font-mono break-all mt-0.5">
                  {selectedFile?.filename || selectedNode?.label}
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded text-[11px] font-extrabold border shrink-0 ${getRiskBadge(selectedFile?.riskLevel || selectedNode?.riskLevel)}`}>
                {selectedFile?.riskLevel || selectedNode?.riskLevel} RISK
              </span>
            </div>

            {/* Score & Review Order Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-2 border border-border p-3 rounded-lg text-center">
                <span className="text-[10px] text-text-2 uppercase font-bold block">File Impact Score</span>
                <span className="text-2xl font-extrabold font-display text-text-1 mt-0.5 block">
                  {selectedFile?.impactScore ?? selectedNode?.impactScore ?? 0}/100
                </span>
              </div>
              <div className="bg-bg-2 border border-border p-3 rounded-lg text-center flex flex-col justify-center items-center">
                <span className="text-[10px] text-text-2 uppercase font-bold block">Review Priority</span>
                <span className={`mt-1 text-xs font-extrabold px-3 py-0.5 rounded font-mono ${getPriorityBadge(selectedFile?.reviewPriority)}`}>
                  {selectedFile?.reviewPriority || 'STANDARD'}
                </span>
              </div>
            </div>

            {/* Diff Lines & Issues Breakdown */}
            <div className="bg-bg-2/50 border border-border p-4 rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-2 font-semibold">Diff Volume:</span>
                <span className="font-mono text-text-1 font-bold">
                  <span className="text-success">+{selectedFile?.additions || 0}</span> / <span className="text-danger">-{selectedFile?.deletions || 0}</span> lines
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-2">
                <span className="text-text-2 font-semibold">Detected Findings:</span>
                <div className="flex gap-1.5 font-mono text-[10px] font-bold">
                  {selectedFile?.issuesCount?.critical > 0 && (
                    <span className="bg-danger/15 text-danger px-1.5 py-0.2 rounded border border-danger/20">
                      {selectedFile.issuesCount.critical} Critical
                    </span>
                  )}
                  {selectedFile?.issuesCount?.high > 0 && (
                    <span className="bg-warning/15 text-warning px-1.5 py-0.2 rounded border border-warning/20">
                      {selectedFile.issuesCount.high} High
                    </span>
                  )}
                  {selectedFile?.issuesCount?.medium > 0 && (
                    <span className="bg-accent2/15 text-accent2 px-1.5 py-0.2 rounded border border-accent2/20">
                      {selectedFile.issuesCount.medium} Medium
                    </span>
                  )}
                  {(!selectedFile?.issuesCount?.critical && !selectedFile?.issuesCount?.high && !selectedFile?.issuesCount?.medium) && (
                    <span className="text-success flex items-center gap-1"><CheckCircle2 size={12} /> Clean</span>
                  )}
                </div>
              </div>
            </div>

            {/* Priority Rationale */}
            {selectedFile?.priorityReason && (
              <div className="bg-bg-2 border border-border p-3.5 rounded-lg space-y-1 text-xs">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider block flex items-center gap-1">
                  <Info size={12} /> Priority Rationale:
                </span>
                <p className="text-text-1 leading-relaxed italic">
                  "{selectedFile.priorityReason}"
                </p>
              </div>
            )}

            {/* Dependencies & Downstream Blast Radius */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider block">
                Direct Dependencies ({selectedFile?.dependencies?.length || 0})
              </span>
              {(!selectedFile?.dependencies || selectedFile.dependencies.length === 0) ? (
                <span className="text-xs text-text-2 italic block">No external dependencies detected.</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedFile.dependencies.map((dep, i) => (
                    <span key={i} className="bg-bg-2 border border-border text-text-1 text-[11px] px-2 py-0.5 rounded font-mono">
                      {dep}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider block">
                Downstream Dependents ({selectedFile?.dependents?.length || 0})
              </span>
              {(!selectedFile?.dependents || selectedFile.dependents.length === 0) ? (
                <span className="text-xs text-text-2 italic block">No files in scope depend on this module.</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedFile.dependents.map((dep, i) => (
                    <span key={i} className="bg-accent2/10 border border-accent2/25 text-accent2 text-[11px] px-2 py-0.5 rounded font-mono">
                      {dep}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {onSelectFile && (
            <button
              onClick={() => onSelectFile(selectedFile?.filename)}
              className="mt-6 w-full bg-accent text-bg-0 hover:bg-accent/80 font-bold py-2 rounded text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Eye size={14} /> Open in Code Workspace
            </button>
          )}
        </div>

      </div>

      {/* Recommended Review Order (Signature differentiating section) */}
      <div className="bg-bg-1 border border-border rounded-lg p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-2">
            <ListOrdered size={16} className="text-accent" /> Recommended Review Order
          </h3>
          <span className="text-[11px] text-text-2">
            Topologically sorted by severity blast radius & downstream coupling
          </span>
        </div>

        <div className="space-y-3">
          {recommendedOrder.map((item, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedNodeId(item.filename)}
              className={`p-4 rounded-lg border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
                selectedNodeId === item.filename 
                  ? 'border-accent bg-accent/5 ring-1 ring-accent/30' 
                  : 'border-border bg-bg-2/30 hover:border-text-2 hover:bg-bg-2/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-bg-2 border border-border text-text-1 flex items-center justify-center font-display text-xs font-bold shrink-0 mt-0.5">
                  {item.rank}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-text-1 font-mono">{item.filename}</h4>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold font-mono ${getPriorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${getRiskBadge(item.riskLevel)}`}>
                      {item.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-text-2 mt-1 leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(item.filename);
                  if (onSelectFile) onSelectFile(item.filename);
                }}
                className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 shrink-0 self-end md:self-auto"
              >
                Inspect <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ImpactRadarView;
