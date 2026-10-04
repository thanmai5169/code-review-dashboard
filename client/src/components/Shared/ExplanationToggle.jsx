import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Award } from 'lucide-react';
import toast from 'react-hot-toast';

export const ExplanationToggle = () => {
  const { user, updateExplanationLevel } = useAuthStore();
  const currentLevel = user?.preferences?.explanationLevel || 'mid';

  const handleLevelChange = async (level) => {
    try {
      await updateExplanationLevel(level);
      toast.success(`Review complexity set to ${level.toUpperCase()}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update preference');
    }
  };

  const levels = [
    { value: 'junior', label: 'Junior 👶', description: 'Beginner-friendly explanations & analogies' },
    { value: 'mid', label: 'Mid 🧑‍💻', description: 'Standard technical explanations & fixes' },
    { value: 'senior', label: 'Senior 🧙‍♂️', description: 'Concise one-liners' }
  ];

  return (
    <div className="flex items-center gap-2 bg-bg-2 border border-border px-2 py-1 rounded-lg">
      <div className="hidden sm:flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-text-2 mr-1">
        <Award size={12} className="text-accent" /> Depth:
      </div>
      <div className="flex items-center gap-1">
        {levels.map((lvl) => {
          const isActive = currentLevel === lvl.value;
          return (
            <button
              key={lvl.value}
              onClick={() => handleLevelChange(lvl.value)}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-all truncate ${
                isActive 
                  ? 'bg-accent text-bg-0 shadow' 
                  : 'text-text-2 hover:text-text-1 hover:bg-bg-1'
              }`}
              title={lvl.description}
            >
              {lvl.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExplanationToggle;
