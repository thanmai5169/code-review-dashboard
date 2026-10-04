import React, { useState, useEffect } from 'react';
import { Globe, ArrowRight, Check, AlertCircle } from 'lucide-react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export const TranslatorPanel = ({ review, onApplyTranslatedCode }) => {
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (review && review.translationResult) {
      setData(review.translationResult);
    } else {
      setData(null);
    }
  }, [review]);

  const handleTranslate = async () => {
    if (!review) return;
    setLoading(true);
    try {
      toast.loading(`Translating comments/variables to ${targetLanguage}...`, { id: 'translation' });
      const response = await API.post(`/reviews/${review._id}/translate-comments`, { targetLanguage });
      setData(response.data);
      review.translationResult = response.data; // Sync local object representation
      toast.success('Translation audit completed!', { id: 'translation' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Translation failed', { id: 'translation' });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!data || !data.translatedCode) return;
    onApplyTranslatedCode(data.translatedCode);
    toast.success('Applied translations to Monaco editor!');
  };

  const languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Hindi', 'Portuguese'];

  const hasTranslations = data && ((data.translations && data.translations.length > 0) || (data.renamedVariables && data.renamedVariables.length > 0));

  return (
    <div className="bg-bg-1 border border-border rounded-lg p-5 shadow-xl space-y-4 min-h-[400px]">
      
      {/* Top Selector bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-accent" />
          <h3 className="text-sm font-bold text-text-1 font-display">Code Comment Translator</h3>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="bg-bg-2 border border-border px-3 py-1.5 rounded text-xs text-text-1 focus:outline-none focus:border-accent"
          >
            {languages.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <button
            onClick={handleTranslate}
            disabled={loading}
            className="bg-accent text-bg-0 hover:bg-accent/80 disabled:opacity-50 px-4 py-1.5 rounded text-xs font-bold transition-all shrink-0"
          >
            Translate Comments
          </button>
        </div>
      </div>

      {/* Main Results area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
          <span className="text-xs text-text-2">Auditing multilingual content...</span>
        </div>
      ) : !data ? (
        <div className="text-center py-16 space-y-2 text-text-2">
          <Globe className="mx-auto text-text-2 opacity-50" size={32} />
          <p className="text-xs">Translate foreign code comments, string literals, and variable names to your target language.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Status banner */}
          <div className="bg-accent/5 border border-accent/20 p-3.5 rounded flex items-start gap-2 text-xs text-text-1">
            <AlertCircle size={16} className="text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Languages Detected: {data.detectedLanguages?.join(', ') || 'None (already target lang)'}</p>
              <p className="text-text-2 mt-0.5">Found {data.translations?.length || 0} foreign comments and {data.renamedVariables?.length || 0} non-standard variables.</p>
            </div>
          </div>

          {/* Action apply button */}
          {hasTranslations && (
            <button
              onClick={handleApply}
              className="w-full bg-success text-bg-0 hover:bg-success/90 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-success/10"
            >
              <Check size={14} /> Apply All Translations to Editor
            </button>
          )}

          {/* Table: Comments */}
          {data.translations && data.translations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-text-2">Comment Translations</h4>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-bg-2 border-b border-border text-[9px] uppercase tracking-wider text-text-2 font-bold">
                      <th className="px-3 py-2 w-12 text-center">Line</th>
                      <th className="px-3 py-2">Original Foreign Comment</th>
                      <th className="px-3 py-2">Translated ({targetLanguage})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-1 font-mono text-[11px] bg-bg-2/10">
                    {data.translations.map((item, idx) => (
                      <tr key={idx} className="hover:bg-bg-2/30">
                        <td className="px-3 py-2 text-center text-text-2">{item.line}</td>
                        <td className="px-3 py-2 text-danger/80">{item.original}</td>
                        <td className="px-3 py-2 text-success/80">{item.translated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table: Variable Renames */}
          {data.renamedVariables && data.renamedVariables.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-text-2">Variable Rename Recommendations</h4>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-bg-2 border-b border-border text-[9px] uppercase tracking-wider text-text-2 font-bold">
                      <th className="px-3 py-2 w-12 text-center">Line</th>
                      <th className="px-3 py-2">Original Identifier</th>
                      <th className="px-3 py-2">Suggested ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-1 font-mono text-[11px] bg-bg-2/10">
                    {data.renamedVariables.map((item, idx) => (
                      <tr key={idx} className="hover:bg-bg-2/30">
                        <td className="px-3 py-2 text-center text-text-2">{item.line}</td>
                        <td className="px-3 py-2 text-warning">{item.original}</td>
                        <td className="px-3 py-2 text-success flex items-center gap-1.5">
                          <ArrowRight size={10} className="text-text-2" />
                          {item.suggested}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default TranslatorPanel;
