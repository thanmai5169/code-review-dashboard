const mongoose = require('mongoose');

const SkillProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  weeklyStats: [{
    week: { type: Date, required: true },
    totalReviews: { type: Number, default: 0 },
    categoryBreakdown: {
      bugs: { type: Number, default: 0 },
      security: { type: Number, default: 0 },
      performance: { type: Number, default: 0 },
      style: { type: Number, default: 0 }
    },
    averageScore: { type: Number, default: 0 },
    topWeakness: { type: String, default: 'none' },
    improvement: { type: Number, default: 0 } // % change from previous week
  }],
  streakDays: { type: Number, default: 0 },
  badges: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('SkillProgress', SkillProgressSchema);
