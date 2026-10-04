import React from 'react';

export const SeverityBadge = ({ severity }) => {
  const sev = severity ? severity.toLowerCase() : 'low';
  
  const styles = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    info: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  };

  const labels = {
    critical: '🔴 Critical',
    high: '🔶 High',
    medium: '🟡 Medium',
    low: '🔵 Low',
    info: '🟢 Info'
  };

  const styleClass = styles[sev] || styles.low;
  const label = labels[sev] || severity;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${styleClass}`}>
      {label}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  const cat = category ? category.toLowerCase() : 'style';

  const styles = {
    bug: 'bg-red-600/10 text-red-300 border-red-500/20',
    security: 'bg-purple-600/10 text-purple-300 border-purple-500/20',
    performance: 'bg-amber-600/10 text-amber-300 border-amber-500/20',
    maintainability: 'bg-cyan-600/10 text-cyan-300 border-cyan-500/20',
    style: 'bg-blue-600/10 text-blue-300 border-blue-500/20',
    intent_mismatch: 'bg-pink-600/10 text-pink-300 border-pink-500/20'
  };

  const icons = {
    bug: '🐛',
    security: '🛡️',
    performance: '⚡',
    maintainability: '🏗️',
    style: '🎨',
    intent_mismatch: '⚠️'
  };

  const labels = {
    bug: 'Bug',
    security: 'Security',
    performance: 'Performance',
    maintainability: 'Maintainability',
    style: 'Style',
    intent_mismatch: 'Intent Mismatch'
  };

  const styleClass = styles[cat] || styles.style;
  const icon = icons[cat] || '💡';
  const label = labels[cat] || (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Style');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styleClass}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </span>
  );
};

export const SourceBadge = ({ source }) => {
  const src = source ? source.toLowerCase() : 'paste';

  const styles = {
    paste: 'bg-gray-700/30 text-gray-300 border-gray-600/30',
    file: 'bg-teal-700/20 text-teal-300 border-teal-600/30',
    github: 'bg-indigo-700/20 text-indigo-300 border-indigo-600/30',
    batch: 'bg-sky-700/20 text-sky-300 border-sky-600/30',
    precommit: 'bg-purple-700/20 text-purple-300 border-purple-600/30'
  };

  const icons = {
    paste: '📋',
    file: '📁',
    github: '🐙',
    batch: '📦',
    precommit: '⚡'
  };

  const styleClass = styles[src] || styles.paste;
  const icon = icons[src] || '📝';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styleClass}`}>
      <span className="mr-1">{icon}</span>
      {source ? source.toUpperCase() : 'PASTE'}
    </span>
  );
};
