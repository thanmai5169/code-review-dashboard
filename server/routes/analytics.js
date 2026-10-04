const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Review = require('../models/Review');
const SkillProgress = require('../models/SkillProgress');
const User = require('../models/User');
const { getGeminiWeaknessTip, updateSkillProgress } = require('../services/skillService');

const router = express.Router();

router.use(protect);

// GET /api/analytics/dashboard - Real enterprise dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user reviews
    const userReviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .select('title language metrics findings riskAnalysis impactAnalysis githubMetadata createdAt sourceType');

    const totalReviews = userReviews.length;

    if (totalReviews === 0) {
      return res.json({
        hasData: false,
        totalReviews: 0,
        codeHealth: {
          overallQuality: 0,
          reviewRisk: 0,
          security: 0,
          maintainability: 0,
          performance: 0
        },
        issueCounts: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0
        },
        recentReviews: [],
        topRiskyModules: [],
        trends: {
          qualityOverTime: [],
          riskOverTime: []
        },
        recurringCategories: []
      });
    }

    // Compute Health Metrics across real reviews
    let sumQuality = 0;
    let sumRisk = 0;
    let sumSecurity = 0;
    let sumMaintainability = 0;
    let sumPerformance = 0;

    const issueCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const categoryCounts = { bug: 0, security: 0, performance: 0, style: 0, maintainability: 0, intent_mismatch: 0 };
    const riskyModulesMap = new Map();

    userReviews.forEach(r => {
      sumQuality += (r.metrics?.overallScore ?? 100);
      sumRisk += (r.riskAnalysis?.score ?? r.metrics?.riskScore ?? 0);
      sumSecurity += (r.metrics?.security ?? 100);
      sumMaintainability += (r.metrics?.maintainability ?? 100);
      sumPerformance += (r.metrics?.performance ?? 100);

      // Count findings
      (r.findings || []).forEach(f => {
        if (issueCounts[f.severity] !== undefined) {
          issueCounts[f.severity]++;
        }
        if (categoryCounts[f.category] !== undefined) {
          categoryCounts[f.category]++;
        }
      });

      // Extract high risk files from impact analysis
      if (r.impactAnalysis && Array.isArray(r.impactAnalysis.files)) {
        r.impactAnalysis.files.forEach(f => {
          if (f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH' || f.impactScore > 40) {
            const current = riskyModulesMap.get(f.filename) || {
              filename: f.filename,
              impactScore: f.impactScore,
              riskLevel: f.riskLevel,
              issues: f.issuesCount?.critical + f.issuesCount?.high || 0,
              occurrences: 0,
              lastReviewId: r._id,
              lastReviewTitle: r.title
            };
            current.occurrences++;
            current.impactScore = Math.max(current.impactScore, f.impactScore);
            riskyModulesMap.set(f.filename, current);
          }
        });
      }
    });

    const codeHealth = {
      overallQuality: Math.round(sumQuality / totalReviews),
      reviewRisk: Math.round(sumRisk / totalReviews),
      security: Math.round(sumSecurity / totalReviews),
      maintainability: Math.round(sumMaintainability / totalReviews),
      performance: Math.round(sumPerformance / totalReviews)
    };

    // Trends over time (chronological)
    const chronological = [...userReviews].reverse().slice(-15);
    const qualityOverTime = chronological.map(r => ({
      date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: r.metrics?.overallScore || 100,
      title: r.title
    }));
    const riskOverTime = chronological.map(r => ({
      date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      risk: r.riskAnalysis?.score ?? r.metrics?.riskScore ?? 0,
      title: r.title
    }));

    // Recent reviews table data (last 8)
    const recentReviews = userReviews.slice(0, 8).map(r => {
      const crits = r.findings?.filter(f => f.severity === 'critical').length || 0;
      const highs = r.findings?.filter(f => f.severity === 'high').length || 0;
      return {
        _id: r._id,
        title: r.title,
        sourceType: r.sourceType,
        language: r.language,
        createdAt: r.createdAt,
        qualityScore: r.metrics?.overallScore ?? 100,
        riskScore: r.riskAnalysis?.score ?? 0,
        riskLevel: r.riskAnalysis?.level ?? 'LOW',
        criticalIssues: crits,
        highIssues: highs,
        totalIssues: r.findings?.length || 0,
        github: r.githubMetadata
      };
    });

    const topRiskyModules = Array.from(riskyModulesMap.values())
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 6);

    const recurringCategories = Object.keys(categoryCounts).map(cat => ({
      name: cat === 'intent_mismatch' ? 'Intent Mismatch' : cat.charAt(0).toUpperCase() + cat.slice(1),
      count: categoryCounts[cat]
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    res.json({
      hasData: true,
      totalReviews,
      codeHealth,
      issueCounts,
      recentReviews,
      topRiskyModules,
      trends: {
        qualityOverTime,
        riskOverTime
      },
      recurringCategories
    });
  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    res.status(500).json({ message: 'Error compiling dashboard statistics' });
  }
});

// GET /api/analytics/recurring-issues - Most frequent problems across MongoDB history
router.get('/recurring-issues', async (req, res) => {
  try {
    const userId = req.user._id;
    const userReviews = await Review.find({ userId }).select('title findings createdAt');

    if (!userReviews || userReviews.length === 0) {
      return res.json({ recurringIssues: [] });
    }

    // Group issues by normalized message pattern
    const issueMap = new Map();

    userReviews.forEach(r => {
      (r.findings || []).forEach(f => {
        // Normalize message to aggregate similar problems
        const normalizedMsg = f.message
          .replace(/\[RESOLVED\]\s*/i, '')
          .replace(/['"`][^'"`]+['"`]/g, '`IDENTIFIER`')
          .trim();

        if (normalizedMsg.length < 5) return;

        const current = issueMap.get(normalizedMsg) || {
          message: normalizedMsg,
          category: f.category,
          severity: f.severity,
          count: 0,
          whyItMatters: f.whyItMatters || f.suggestion || 'Review recommendations',
          reviews: []
        };

        current.count++;
        if (!current.reviews.some(rev => rev.id.toString() === r._id.toString())) {
          current.reviews.push({
            id: r._id,
            title: r.title,
            file: f.file || 'main',
            line: f.lineStart
          });
        }

        issueMap.set(normalizedMsg, current);
      });
    });

    const recurringIssues = Array.from(issueMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ recurringIssues });
  } catch (error) {
    console.error('Recurring issues error:', error);
    res.status(500).json({ message: 'Error retrieving recurring issues' });
  }
});

// GET /api/analytics/summary - Aggregated summary stats
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const scoreTrend = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('createdAt metrics.overallScore title');
    
    const chronologicalTrend = scoreTrend.reverse().map(r => ({
      date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: r.metrics?.overallScore || 100,
      title: r.title
    }));

    const userReviews = await Review.find({ userId }).select('findings metrics');
    let categoryDistribution = { bug: 0, security: 0, performance: 0, style: 0, maintainability: 0 };
    let severityDistribution = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let totalReviews = userReviews.length;
    let scoreSum = 0;

    userReviews.forEach(review => {
      scoreSum += review.metrics?.overallScore || 100;
      (review.findings || []).forEach(finding => {
        if (categoryDistribution[finding.category] !== undefined) {
          categoryDistribution[finding.category]++;
        }
        if (severityDistribution[finding.severity] !== undefined) {
          severityDistribution[finding.severity]++;
        }
      });
    });

    const averageScore = totalReviews > 0 ? Math.round(scoreSum / totalReviews) : 100;

    const categoryData = [
      { name: 'Bugs', value: categoryDistribution.bug },
      { name: 'Security', value: categoryDistribution.security },
      { name: 'Performance', value: categoryDistribution.performance },
      { name: 'Maintainability', value: categoryDistribution.maintainability },
      { name: 'Style', value: categoryDistribution.style }
    ];

    const severityData = [
      { name: 'Critical', value: severityDistribution.critical, color: '#f85149' },
      { name: 'High', value: severityDistribution.high, color: '#d29922' },
      { name: 'Medium', value: severityDistribution.medium, color: '#bc8cff' },
      { name: 'Low', value: severityDistribution.low, color: '#58a6ff' },
      { name: 'Info', value: severityDistribution.info, color: '#3fb950' }
    ];

    const mistakeKeywords = ['null', 'undefined', 'password', 'loop', 'query', 'xss', 'sql', 'async', 'memory', 'indent', 'complexity', 'token'];
    let mistakeCounts = {};
    mistakeKeywords.forEach(kw => { mistakeCounts[kw] = 0; });

    userReviews.forEach(review => {
      (review.findings || []).forEach(f => {
        const msg = (f.message || '').toLowerCase();
        mistakeKeywords.forEach(kw => {
          if (msg.includes(kw)) {
            mistakeCounts[kw]++;
          }
        });
      });
    });

    const heatmapData = Object.keys(mistakeCounts).map(kw => ({
      keyword: kw.toUpperCase(),
      count: mistakeCounts[kw]
    }));

    res.json({
      averageScore,
      totalReviews,
      scoreTrend: chronologicalTrend,
      categories: categoryData,
      severities: severityData,
      mistakesHeatmap: heatmapData
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    res.status(500).json({ message: 'Error aggregating analytics details' });
  }
});

// GET /api/analytics/skill-growth - Retrieve weekly skill progress stats
router.get('/skill-growth', async (req, res) => {
  try {
    const userId = req.user._id;
    let progress = await SkillProgress.findOne({ userId });

    // Auto-backfill from existing reviews if missing or empty
    if (!progress || !progress.weeklyStats || progress.weeklyStats.length === 0) {
      const userReviews = await Review.find({ userId }).sort({ createdAt: 1 });
      if (userReviews.length > 0) {
        for (const rev of userReviews) {
          await updateSkillProgress(userId, rev);
        }
        progress = await SkillProgress.findOne({ userId });
      }
    }

    if (!progress) {
      return res.json({ weeklyStats: [], streakDays: 0, badges: [] });
    }
    res.json(progress);
  } catch (error) {
    console.error('Error fetching skill growth:', error);
    res.status(500).json({ message: 'Error retrieving skill growth progress' });
  }
});

// GET /api/analytics/weakness-report - Get top 3 repeated mistake categories with AI tips
router.get('/weakness-report', async (req, res) => {
  try {
    const userId = req.user._id;
    let progress = await SkillProgress.findOne({ userId });
    
    // Auto-backfill if missing
    if (!progress || !progress.weeklyStats || progress.weeklyStats.length === 0) {
      const userReviews = await Review.find({ userId }).sort({ createdAt: 1 });
      if (userReviews.length > 0) {
        for (const rev of userReviews) {
          await updateSkillProgress(userId, rev);
        }
        progress = await SkillProgress.findOne({ userId });
      }
    }

    if (!progress || !progress.weeklyStats || progress.weeklyStats.length === 0) {
      return res.json({ weaknesses: [] });
    }

    const totalBreakdown = { bugs: 0, security: 0, performance: 0, style: 0 };
    const recentStats = progress.weeklyStats.slice(-4); 
    
    recentStats.forEach(stat => {
      const cb = stat.categoryBreakdown || {};
      totalBreakdown.bugs += cb.bugs || 0;
      totalBreakdown.security += cb.security || 0;
      totalBreakdown.performance += cb.performance || 0;
      totalBreakdown.style += cb.style || 0;
    });

    const sortedCategories = Object.keys(totalBreakdown)
      .map(cat => ({ category: cat, count: totalBreakdown[cat] }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const user = await User.findById(userId);
    const userApiKey = user?.apiKeys?.gemini || null;

    const weaknessesWithTips = await Promise.all(
      sortedCategories.map(async (item) => {
        const tip = await getGeminiWeaknessTip(item.category, item.count, userApiKey);
        return {
          category: item.category,
          count: item.count,
          tip
        };
      })
    );

    res.json({ weaknesses: weaknessesWithTips });
  } catch (error) {
    console.error('Error compiling weakness report:', error);
    res.status(500).json({ message: 'Error compiling weakness report' });
  }
});

module.exports = router;
