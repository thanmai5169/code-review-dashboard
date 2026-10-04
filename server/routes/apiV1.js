const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { analyzeCode, quickRiskAssessment } = require('../services/geminiService');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Review = require('../models/Review');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limit: 20 calls/hour per API key/IP for risk check
const riskCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP/key to 20 requests per windowMs
  message: { error: 'Rate limit exceeded: 20 risk checks per hour maximum' }
});

// POST /api/v1/review - CI/CD Integration review endpoint
router.post('/review', protect, async (req, res) => {
  try {
    const { code, language, workspaceId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code content is required' });
    }

    let customRules = [];
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        customRules = workspace.customRules || [];
      }
    }

    // Call Gemini review scan directly
    const user = await User.findById(req.user._id);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;
    const analysis = await analyzeCode(code, language || 'javascript', customRules, userApiKey);

    res.json({
      success: true,
      metrics: analysis.metrics,
      summary: analysis.summary,
      findings: analysis.findings
    });

  } catch (error) {
    console.error('CI/CD API analysis error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error executing AI code scan' });
  }
});

// POST /api/v1/risk-check - Quick pre-commit risk assessment
router.post('/risk-check', protect, riskCheckLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code content is required' });
    }

    // Automatically decode base64 if sent in base64 format (no spaces, standard base64 format)
    let decodedCode = code;
    if (typeof code === 'string' && code.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/) && !code.includes(' ')) {
      try {
        decodedCode = Buffer.from(code, 'base64').toString('utf8');
      } catch (err) {
        // Fallback to original string if decode fails
      }
    }

    const user = await User.findById(req.user._id);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;

    const riskResult = await quickRiskAssessment(decodedCode, language || 'javascript', userApiKey);

    // Save lightweight review audit log
    await Review.create({
      userId: req.user._id,
      title: 'Pre-Commit Risk Check',
      language: language || 'javascript',
      originalCode: decodedCode,
      optimizedCode: decodedCode,
      findings: riskResult.topIssue ? [{
        lineStart: riskResult.topIssue.line || 1,
        lineEnd: riskResult.topIssue.line || 1,
        severity: 'critical',
        category: 'bug',
        message: riskResult.topIssue.message,
        suggestion: 'Verify this finding before committing.',
        fixCode: ''
      }] : [],
      metrics: {
        bugs: 100 - riskResult.riskScore,
        security: 100 - riskResult.riskScore,
        performance: 100 - riskResult.riskScore,
        style: 100 - riskResult.riskScore,
        overallScore: 100 - riskResult.riskScore
      },
      sourceType: 'precommit'
    });

    res.json(riskResult);
  } catch (error) {
    console.error('Risk check error:', error);
    res.status(500).json({ error: error.message || 'Error during pre-commit risk evaluation' });
  }
});

module.exports = router;
