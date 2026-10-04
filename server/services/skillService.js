const SkillProgress = require('../models/SkillProgress');
const Review = require('../models/Review');
const User = require('../models/User');
const { initGemini } = require('../config/gemini');

// Helper to get start of week (Monday)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Triggered after every review to recalculate user metrics, streaks, and check badges
 */
const updateSkillProgress = async (userId, newReview) => {
  try {
    const startOfWeekDate = getStartOfWeek(newReview.createdAt || new Date());
    
    // Find or create SkillProgress
    let progress = await SkillProgress.findOne({ userId });
    if (!progress) {
      progress = await SkillProgress.create({
        userId,
        weeklyStats: [],
        streakDays: 1,
        badges: []
      });
    }

    // Recalculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReview = await Review.findOne({ userId, _id: { $ne: newReview._id } }).sort({ createdAt: -1 });
    if (lastReview) {
      const lastReviewDate = new Date(lastReview.createdAt);
      lastReviewDate.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(today - lastReviewDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Increment streak
        progress.streakDays += 1;
      } else if (diffDays > 1) {
        // Reset streak
        progress.streakDays = 1;
      }
    } else {
      progress.streakDays = 1;
    }

    // Fetch reviews from this week to calculate stats
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(endOfWeekDate.getDate() + 7);
    
    const weeklyReviews = await Review.find({
      userId,
      createdAt: { $gte: startOfWeekDate, $lt: endOfWeekDate }
    });

    // Compute metrics
    const totalReviews = weeklyReviews.length;
    let sumScore = 0;
    const breakdown = { bugs: 0, security: 0, performance: 0, style: 0 };
    
    weeklyReviews.forEach((r) => {
      sumScore += r.metrics?.overallScore || 100;
      r.findings?.forEach((f) => {
        const cat = f.category === 'bug' ? 'bugs' : f.category === 'security' ? 'security' : f.category === 'performance' ? 'performance' : f.category === 'style' ? 'style' : null;
        if (cat) {
          breakdown[cat] += 1;
        }
      });
    });

    const averageScore = totalReviews > 0 ? Math.round(sumScore / totalReviews) : 100;
    
    // Top weakness
    let topWeakness = 'none';
    let maxCount = 0;
    Object.keys(breakdown).forEach((cat) => {
      if (breakdown[cat] > maxCount) {
        maxCount = breakdown[cat];
        topWeakness = cat;
      }
    });

    // Find previous week's average to calculate improvement
    let improvement = 0;
    const lastWeekStart = new Date(startOfWeekDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastWeekStats = progress.weeklyStats.find(
      (s) => s.week.getTime() === lastWeekStart.getTime()
    );
    if (lastWeekStats) {
      improvement = averageScore - lastWeekStats.averageScore;
    }

    // Update or add weeklyStats entry
    const weekIdx = progress.weeklyStats.findIndex(
      (s) => s.week.getTime() === startOfWeekDate.getTime()
    );

    const statEntry = {
      week: startOfWeekDate,
      totalReviews,
      categoryBreakdown: breakdown,
      averageScore,
      topWeakness,
      improvement
    };

    if (weekIdx > -1) {
      progress.weeklyStats[weekIdx] = statEntry;
    } else {
      progress.weeklyStats.push(statEntry);
    }

    // Badge Checks
    const badges = new Set(progress.badges || []);
    
    // Badge 1: "Security Streak 🔒" (5 consecutive reviews with 0 security findings)
    const userReviews = await Review.find({ userId }).sort({ createdAt: -1 }).limit(5);
    if (userReviews.length === 5) {
      const hasSecurityIssues = userReviews.some((r) =>
        r.findings?.some((f) => f.category === 'security')
      );
      if (!hasSecurityIssues) {
        badges.add('Security Streak 🔒');
      }
    }

    // Badge 2: "Zero Critical Week 🏆" (At least 3 reviews in a week with 0 critical findings)
    const hasCritical = weeklyReviews.some((r) =>
      r.findings?.some((f) => f.severity === 'critical')
    );
    if (totalReviews >= 3 && !hasCritical) {
      badges.add('Zero Critical Week 🏆');
    }

    // Badge 3: "Active Audit Streak 🔥" (Streak days reaches 5 or more)
    if (progress.streakDays >= 5) {
      badges.add('Active Audit Streak 🔥');
    }

    progress.badges = Array.from(badges);
    await progress.save();
  } catch (error) {
    console.error('Error updating skill progress:', error);
  }
};

/**
 * Generate a Gemini-personalized tip for a given weakness category & count
 */
const getGeminiWeaknessTip = async (category, count, userKey = null) => {
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return 'Be mindful of your syntax and variable checks.';

  const { GoogleGenAI } = require('@google/genai');
  const client = new GoogleGenAI({ apiKey });

  const prompt = `The developer has made ${category} errors ${count} times in the past month.
In exactly 2 sentences, give them the single most important habit to fix this.
Be direct and practical, not generic. Do not use markdown syntax.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text.trim();
  } catch (err) {
    console.error('Error fetching weakness tip from Gemini:', err);
    return 'Implement strict type checking and run unit test coverage suites frequently.';
  }
};

module.exports = {
  updateSkillProgress,
  getStartOfWeek,
  getGeminiWeaknessTip
};
