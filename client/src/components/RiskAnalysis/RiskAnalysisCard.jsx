import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Cpu, 
  Layers, 
  FileDiff, 
  History, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp
} from 'lucide-react';

export const RiskAnalysisCard = ({ riskAnalysis }) => {
  if (!riskAnalysis) {
    return (
      <div className="bg-bg-1 border border-border p-6 rounded-lg text-center text-xs text-text-2">
        No Risk Analysis data available. Run a review scan first.
      </div>
    );
  }

  const { score = 0, level = 'LOW', contributors = {}, reasons = [] } = riskAnalysis;

  const getRiskTheme = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
        return {
          badge: 'bg-danger/20 text-danger border-danger/40',
          gauge: 'text-danger stroke-danger',
          border: 'border-danger/30 bg-danger/5'
        };
      case 'HIGH':
        return {
          badge: 'bg-warning/20 text-warning border-warning/40',
          gauge: 'text-warning stroke-warning',
          border: 'border-warning/30 bg-warning/5'
        };
      case 'MEDIUM':
        return {
          badge: 'bg-accent2/20 text-accent2 border-accent2/40',
          gauge: 'text-accent2 stroke-accent2',
          border: 'border-accent2/30 bg-accent2/5'
        };
      case 'LOW':
      default:
        return {
          badge: 'bg-success/20 text-success border-success/40',
          gauge: 'text-success stroke-success',
          border: 'border-success/30 bg-success/5'
        };
    }
  };

  const theme = getRiskTheme(level);

  const contributorItems = [
    { label: 'Security Factors', value: contributors.security || 0, max: 30, icon: <ShieldAlert size={14} className="text-danger" /> },
    { label: 'Structural Complexity', value: contributors.complexity || 0, max: 25, icon: <Cpu size={14} className="text-warning" /> },
    { label: 'File & Module Impact', value: contributors.fileImpact || 0, max: 20, icon: <Layers size={14} className="text-accent" /> },
    { label: 'Change Volume / Diff Size', value: contributors.changeSize || 0, max: 15, icon: <FileDiff size={14} className="text-accent2" /> },
    { label: 'Historical Flakiness', value: contributors.history || 0, max: 10, icon: <History size={14} className="text-text-2" /> }
  ];

  return (
    <div className="bg-bg-1 border border-border rounded-lg p-6 shadow-xl space-y-6 font-body">
      
      {/* Top Header & Gauge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-1 font-display">
              Deterministic Risk Analysis
            </h3>
          </div>
          <p className="text-xs text-text-2 mt-1">
            Calculated score combining security posture, AST complexity, blast radius, and change volume.
          </p>
        </div>

        {/* Circular Gauge / Score Badge */}
        <div className="flex items-center gap-4 bg-bg-2 border border-border px-5 py-3 rounded-xl shrink-0">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider block">Review Risk</span>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <span className="text-3xl font-extrabold font-display text-text-1">{score}</span>
              <span className="text-xs text-text-2 font-mono">/ 100</span>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${theme.badge}`}>
            {level} RISK
          </span>
        </div>
      </div>

      {/* Why is this PR/Change Risky? (Real Reasons) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-1.5">
          <HelpCircle size={14} className="text-accent" /> Why is this change risky?
        </h4>

        {reasons.length === 0 ? (
          <div className="bg-bg-2 border border-border p-4 rounded-lg text-xs text-success flex items-center gap-2">
            <CheckCircle2 size={16} /> Clean change scope with low regression surface.
          </div>
        ) : (
          <div className="bg-bg-2/60 border border-border p-4 rounded-lg space-y-2">
            {reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-text-1">
                <span className="text-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Contributors Breakdown Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-2 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-accent2" /> Risk Contributors Breakdown
        </h4>

        <div className="bg-bg-2 border border-border rounded-lg divide-y divide-border overflow-hidden">
          {contributorItems.map((item, idx) => (
            <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-bg-1/40 transition-colors">
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span className="text-xs font-semibold text-text-1">{item.label}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Visual Progress Pill */}
                <div className="w-24 sm:w-36 h-2 bg-bg-0 border border-border rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                  />
                </div>
                
                <span className="text-xs font-mono font-bold text-text-1 min-w-[36px] text-right">
                  +{item.value}
                </span>
              </div>
            </div>
          ))}

          {/* Total Footer */}
          <div className="px-4 py-3 bg-bg-1 flex items-center justify-between text-xs font-bold">
            <span className="text-text-1 uppercase tracking-wider">Total Risk Index</span>
            <span className="font-mono text-sm text-accent">{score} / 100</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RiskAnalysisCard;
