import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export const VoiceSummary = ({ review }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  // Generate summary text
  useEffect(() => {
    if (!review) return;

    const score = review.metrics?.overallScore ?? 100;
    const findingsCount = review.findings?.length ?? 0;
    const criticalCount = review.findings?.filter(f => f.severity === 'critical').length ?? 0;
    const highCount = review.findings?.filter(f => f.severity === 'high').length ?? 0;
    const topFinding = review.findings?.[0];

    // Calculate top category for improvements
    const categoryCounts = review.findings?.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {}) || {};
    const topCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, 'bug');

    let text = `Your ${review.language} code scored ${score} out of 100. `;
    if (findingsCount > 0) {
      text += `We found ${findingsCount} issues, including ${criticalCount} critical and ${highCount} high severity issues. `;
      if (topFinding) {
        text += `The top issue is: ${topFinding.message} on line ${topFinding.lineStart}. `;
      }
    } else {
      text += `No issues were found in your code. `;
    }

    if (score > 80) {
      text += `Great work overall!`;
    } else {
      text += `You should focus on improving your ${topCategory} issues.`;
    }

    setSummaryText(text);
  }, [review]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        // Prefer an English voice as default
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        setSelectedVoice(defaultVoice.name);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeak = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!summaryText) return;

    const utterance = new SpeechSynthesisUtterance(summaryText);
    const voiceObj = voices.find(v => v.name === selectedVoice);
    if (voiceObj) {
      utterance.voice = voiceObj;
    }
    utterance.rate = rate;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-bg-1 border border-border rounded-lg p-3 shadow-md space-y-2 w-full">
      <div className="flex items-center justify-between">
        <button
          onClick={handleSpeak}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
            isPlaying 
              ? 'bg-danger text-white hover:bg-danger/80 animate-pulse' 
              : 'bg-accent text-bg-0 hover:bg-accent/80'
          }`}
          title="Speak Audit Summary"
        >
          {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {isPlaying ? 'Stop Speech' : 'Listen to Summary'}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-text-2 hover:text-text-1 p-1.5 rounded bg-bg-2 border border-border"
          title="Speech Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {showSettings && (
        <div className="p-3 bg-bg-2 border border-border rounded text-xs space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-text-2 font-bold uppercase tracking-wider block">Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-bg-1 border border-border rounded px-2 py-1 text-xs text-text-1 focus:outline-none"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-2 font-bold uppercase tracking-wider">
              <span>Speed</span>
              <span>{rate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-accent bg-bg-1 h-1 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Accessible Summary Panel */}
      <details className="group border border-border/60 rounded bg-bg-2/30">
        <summary className="list-none flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-text-2 cursor-pointer select-none">
          <span>View Text Summary</span>
          <ChevronDown size={12} className="group-open:hidden text-text-2" />
          <ChevronUp size={12} className="hidden group-open:block text-text-2" />
        </summary>
        <div className="px-3 pb-2 pt-1 border-t border-border/40 text-xs text-text-2 leading-relaxed">
          {summaryText}
        </div>
      </details>
    </div>
  );
};

export default VoiceSummary;
