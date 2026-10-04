import React from 'react';
import { Target } from 'lucide-react';

export const IntentInput = ({ value, onChange }) => {
  return (
    <div className="bg-bg-1 border border-border px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 shadow-md w-full">
      <div className="flex items-center gap-2 shrink-0">
        <Target size={16} className="text-accent2" />
        <span className="text-xs font-bold text-text-1 uppercase tracking-wider font-display">Review Intent</span>
      </div>
      <div className="flex-grow relative">
        <input
          type="text"
          placeholder="What should this code do? (e.g. 'Sort users by signup date') [Optional]"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 200))}
          className="w-full bg-bg-2 border border-border rounded pl-3 pr-12 py-1.5 text-xs text-text-1 placeholder-text-2 focus:outline-none focus:border-accent2 transition-colors"
          maxLength={200}
        />
        <span className="absolute right-3 top-2.5 text-[9px] text-text-2 font-mono">
          {value.length}/200
        </span>
      </div>
    </div>
  );
};

export default IntentInput;
