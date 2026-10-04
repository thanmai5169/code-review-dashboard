import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReviewStore } from '../store/reviewStore';
import ImpactRadarView from '../components/ImpactRadar/ImpactRadarView';
import { Radar, Play, ArrowLeft, History } from 'lucide-react';

export const ImpactRadarPage = () => {
  const navigate = useNavigate();
  const { currentReview, fetchReviews, reviews, fetchReviewDetails } = useReviewStore();

  useEffect(() => {
    if (!currentReview) {
      fetchReviews(1);
    }
  }, [currentReview]);

  // If no currentReview, try to load latest review
  useEffect(() => {
    if (!currentReview && reviews.length > 0) {
      fetchReviewDetails(reviews[0]._id);
    }
  }, [reviews, currentReview]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-body">
      {!currentReview ? (
        <div className="bg-bg-1 border border-border p-12 rounded-xl text-center space-y-4 shadow-xl">
          <Radar size={48} className="text-accent opacity-50 mx-auto" />
          <h2 className="text-lg font-bold font-display text-text-1">No Active Code Review Loaded</h2>
          <p className="text-xs text-text-2 max-w-md mx-auto leading-relaxed">
            Run a new audit or select a past review from your history to explore the full interactive Code Change Impact Radar.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/review')}
              className="bg-accent text-bg-0 hover:bg-accent/85 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-accent/15"
            >
              <Play size={12} fill="currentColor" /> Run New Audit
            </button>
            <button
              onClick={() => navigate('/history')}
              className="bg-bg-2 border border-border hover:bg-border text-text-1 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <History size={14} /> Review History
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/review')}
              className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={14} /> Back to Code Workspace
            </button>

            <span className="text-xs text-text-2 font-mono">
              Audit: <strong className="text-text-1">{currentReview.title}</strong>
            </span>
          </div>

          <ImpactRadarView
            review={currentReview}
            onSelectFile={(file) => navigate('/review')}
          />
        </div>
      )}
    </div>
  );
};

export default ImpactRadarPage;
