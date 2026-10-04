const fs = require('fs');
const path = require('path');
const Review = require('../models/Review');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { analyzeCode, streamFollowUpChat } = require('../services/geminiService');
const { calculateChangeRisk, calculateImpactRadar } = require('../services/riskAnalysisService');
const { getPullDetails, getPullFiles } = require('../services/githubService');
const { emitScanProgress, getIO } = require('../socket/reviewSocket');
const { sendEmailAlert } = require('../services/notificationService');
const { handlePostReviewAutomations } = require('../services/automationService');

// Helper to simulate smooth progress events for UI scanner
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// @desc    Analyze code snippet from direct paste
// @route   POST /api/reviews/analyze
// @access  Private
exports.analyzePaste = async (req, res) => {
  try {
    const { code, language, title, workspaceId, explanationLevel, intentStatement } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ message: 'Code content is required' });
    }

    let customRules = [];
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        customRules = workspace.customRules || [];
      }
    }

    emitScanProgress(userId, 'Parsing AST & syntax structure...', 15);
    await delay(300);

    emitScanProgress(userId, 'Executing deep security & vulnerability audit...', 40);
    await delay(300);

    emitScanProgress(userId, 'Analyzing performance, maintainability & complexity...', 65);
    await delay(300);

    emitScanProgress(userId, 'Calculating Code Change Impact Radar & Risk Analysis...', 85);

    const user = await User.findById(userId);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;
    
    // 1. Run Gemini Code Analysis
    const analysis = await analyzeCode(
      code,
      language || 'javascript',
      customRules,
      userApiKey,
      explanationLevel || user.preferences?.explanationLevel || 'mid',
      intentStatement || '',
      title || 'main'
    );

    const findings = (analysis.findings || []).map(f => ({
      ...f,
      status: 'unresolved',
      file: f.file || 'main'
    }));

    const filesArray = [{
      name: title || 'main',
      path: title || 'main',
      language: language || 'javascript',
      status: 'modified',
      additions: code.split('\n').length,
      deletions: 0,
      originalContent: code,
      optimizedContent: analysis.optimizedCode || code
    }];

    // 2. Fetch User Historical Context
    const recentReviews = await Review.find({ userId }).sort({ createdAt: -1 }).limit(5).select('metrics findings');
    let pastAverageScore = 100;
    let recentCriticals = 0;
    if (recentReviews.length > 0) {
      const sum = recentReviews.reduce((acc, r) => acc + (r.metrics?.overallScore || 100), 0);
      pastAverageScore = Math.round(sum / recentReviews.length);
      recentCriticals = recentReviews.reduce((acc, r) => acc + (r.findings?.filter(f => f.severity === 'critical').length || 0), 0);
    }

    const historyContext = { pastAverageScore, recentCriticals };

    // 3. Compute Deterministic Risk Analysis & Impact Radar
    const riskAnalysis = calculateChangeRisk({ files: filesArray, findings, historyContext });
    const impactAnalysis = calculateImpactRadar({ files: filesArray, findings, historyContext });

    const metrics = {
      bugs: analysis.metrics?.bugs ?? 100,
      security: analysis.metrics?.security ?? 100,
      performance: analysis.metrics?.performance ?? 100,
      style: analysis.metrics?.style ?? 100,
      maintainability: analysis.metrics?.maintainability ?? 100,
      overallScore: analysis.metrics?.overallScore ?? 100,
      riskScore: riskAnalysis.score
    };

    emitScanProgress(userId, 'Audit complete', 100);

    // 4. Save to MongoDB
    const review = await Review.create({
      userId,
      workspaceId: workspaceId || null,
      title: title || 'Snippet Review',
      language: language || 'javascript',
      originalCode: code,
      optimizedCode: analysis.optimizedCode || code,
      changedFiles: filesArray,
      findings,
      metrics,
      riskAnalysis,
      impactAnalysis,
      sourceType: 'paste',
      explanationLevel: explanationLevel || user.preferences?.explanationLevel || 'mid',
      intentStatement: intentStatement || ''
    });

    await handlePostReviewAutomations(review);

    res.status(201).json(review);
  } catch (error) {
    console.error('Code paste analysis error:', error);
    emitScanProgress(req.user._id, 'Scan failed: ' + error.message, 0);
    res.status(500).json({ message: error.message || 'Error during code analysis' });
  }
};

// @desc    Analyze code snippet from uploaded file
// @route   POST /api/reviews/upload
// @access  Private
exports.analyzeFileUpload = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workspaceId, title, explanationLevel, intentStatement } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a code file' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    
    const extMap = {
      '.js': 'javascript', '.jsx': 'javascript',
      '.ts': 'typescript', '.tsx': 'typescript',
      '.py': 'python', '.java': 'java',
      '.cpp': 'cpp', '.c': 'c', '.h': 'c',
      '.cs': 'csharp', '.go': 'go',
      '.rb': 'ruby', '.php': 'php',
      '.html': 'html', '.css': 'css', '.json': 'json'
    };
    const detectedLang = extMap[ext] || 'javascript';

    const code = fs.readFileSync(filePath, 'utf8');
    fs.unlinkSync(filePath);

    let customRules = [];
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        customRules = workspace.customRules || [];
      }
    }

    emitScanProgress(userId, 'Parsing uploaded file...', 20);
    await delay(300);

    emitScanProgress(userId, 'Running security & performance scan...', 50);
    await delay(300);

    emitScanProgress(userId, 'Calculating Impact Radar & Risk Analysis...', 80);

    const user = await User.findById(userId);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;
    const analysis = await analyzeCode(
      code,
      detectedLang,
      customRules,
      userApiKey,
      explanationLevel || user.preferences?.explanationLevel || 'mid',
      intentStatement || '',
      originalName
    );

    const findings = (analysis.findings || []).map(f => ({
      ...f,
      status: 'unresolved',
      file: f.file || originalName
    }));

    const filesArray = [{
      name: originalName,
      path: originalName,
      language: detectedLang,
      status: 'modified',
      additions: code.split('\n').length,
      deletions: 0,
      originalContent: code,
      optimizedContent: analysis.optimizedCode || code
    }];

    const recentReviews = await Review.find({ userId }).sort({ createdAt: -1 }).limit(5).select('metrics findings');
    let pastAverageScore = 100;
    let recentCriticals = 0;
    if (recentReviews.length > 0) {
      const sum = recentReviews.reduce((acc, r) => acc + (r.metrics?.overallScore || 100), 0);
      pastAverageScore = Math.round(sum / recentReviews.length);
      recentCriticals = recentReviews.reduce((acc, r) => acc + (r.findings?.filter(f => f.severity === 'critical').length || 0), 0);
    }

    const historyContext = { pastAverageScore, recentCriticals };
    const riskAnalysis = calculateChangeRisk({ files: filesArray, findings, historyContext });
    const impactAnalysis = calculateImpactRadar({ files: filesArray, findings, historyContext });

    const metrics = {
      bugs: analysis.metrics?.bugs ?? 100,
      security: analysis.metrics?.security ?? 100,
      performance: analysis.metrics?.performance ?? 100,
      style: analysis.metrics?.style ?? 100,
      maintainability: analysis.metrics?.maintainability ?? 100,
      overallScore: analysis.metrics?.overallScore ?? 100,
      riskScore: riskAnalysis.score
    };

    emitScanProgress(userId, 'Scan complete', 100);

    const review = await Review.create({
      userId,
      workspaceId: workspaceId || null,
      title: title || originalName || 'Uploaded File Review',
      language: detectedLang,
      originalCode: code,
      optimizedCode: analysis.optimizedCode || code,
      changedFiles: filesArray,
      findings,
      metrics,
      riskAnalysis,
      impactAnalysis,
      sourceType: 'file',
      explanationLevel: explanationLevel || user.preferences?.explanationLevel || 'mid',
      intentStatement: intentStatement || ''
    });

    await handlePostReviewAutomations(review);

    res.status(201).json(review);
  } catch (error) {
    console.error('File upload analysis error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    emitScanProgress(req.user._id, 'Scan failed: ' + error.message, 0);
    res.status(500).json({ message: error.message || 'Error parsing uploaded file' });
  }
};

// @desc    Analyze multiple code files together for cross-file issues & Impact Radar
// @route   POST /api/reviews/analyze-batch
// @access  Private
exports.analyzeBatch = async (req, res) => {
  try {
    const { files, workspaceId, title } = req.body; // files: [{ name, content, language, additions, deletions, patch }]
    const userId = req.user._id;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'A non-empty files array is required' });
    }

    let customRules = [];
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        customRules = workspace.customRules || [];
      }
    }

    emitScanProgress(userId, 'Resolving cross-module references...', 15);
    await delay(300);

    emitScanProgress(userId, `Parsing multi-file tree (${files.length} files)...`, 35);
    await delay(300);

    emitScanProgress(userId, 'Running comprehensive multi-file audit...', 65);
    await delay(300);

    emitScanProgress(userId, 'Synthesizing Impact Radar & Dependency Topology...', 85);

    let compoundCode = '';
    files.forEach((f) => {
      compoundCode += `\n\n--- FILE: ${f.name} (Language: ${f.language || 'javascript'}) ---\n${f.content || f.patch || ''}`;
    });

    const user = await User.findById(userId);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;
    const analysis = await analyzeCode(
      compoundCode,
      'multi-file context',
      [...customRules, 'Identify structural cross-file inconsistencies, import mismatching, or duplicated APIs.'],
      userApiKey
    );

    const findings = (analysis.findings || []).map(f => ({
      ...f,
      status: 'unresolved',
      file: f.file || files[0].name
    }));

    const changedFiles = files.map(f => ({
      name: f.name,
      path: f.path || f.name,
      language: f.language || 'javascript',
      status: f.status || 'modified',
      additions: f.additions || (f.content ? f.content.split('\n').length : 0),
      deletions: f.deletions || 0,
      patch: f.patch || '',
      originalContent: f.content || '',
      optimizedContent: f.content || ''
    }));

    const recentReviews = await Review.find({ userId }).sort({ createdAt: -1 }).limit(5).select('metrics findings');
    let pastAverageScore = 100;
    let recentCriticals = 0;
    if (recentReviews.length > 0) {
      const sum = recentReviews.reduce((acc, r) => acc + (r.metrics?.overallScore || 100), 0);
      pastAverageScore = Math.round(sum / recentReviews.length);
      recentCriticals = recentReviews.reduce((acc, r) => acc + (r.findings?.filter(f => f.severity === 'critical').length || 0), 0);
    }

    const historyContext = { pastAverageScore, recentCriticals };
    const riskAnalysis = calculateChangeRisk({ files: changedFiles, findings, historyContext });
    const impactAnalysis = calculateImpactRadar({ files: changedFiles, findings, historyContext });

    const metrics = {
      bugs: analysis.metrics?.bugs ?? 100,
      security: analysis.metrics?.security ?? 100,
      performance: analysis.metrics?.performance ?? 100,
      style: analysis.metrics?.style ?? 100,
      maintainability: analysis.metrics?.maintainability ?? 100,
      overallScore: analysis.metrics?.overallScore ?? 100,
      riskScore: riskAnalysis.score
    };

    emitScanProgress(userId, 'Batch scan complete', 100);

    const review = await Review.create({
      userId,
      workspaceId: workspaceId || null,
      title: title || `Batch Review (${files.length} files)`,
      language: files[0].language || 'javascript',
      originalCode: compoundCode,
      optimizedCode: analysis.optimizedCode || compoundCode,
      changedFiles,
      findings,
      metrics,
      riskAnalysis,
      impactAnalysis,
      sourceType: 'batch'
    });

    await handlePostReviewAutomations(review);

    if (files.length > 5 && user.preferences?.notifications) {
      await sendEmailAlert(
        user.email,
        `CodeLens: Multi-file review complete: "${review.title}"`,
        `Your multi-file code review of ${files.length} files is complete. Overall quality score: ${review.metrics.overallScore}/100. Risk level: ${review.riskAnalysis.level}.`
      );
    }

    res.status(201).json(review);
  } catch (error) {
    console.error('Batch scan analysis error:', error);
    emitScanProgress(req.user._id, 'Scan failed: ' + error.message, 0);
    res.status(500).json({ message: error.message || 'Error processing batch files' });
  }
};

// @desc    Analyze full GitHub Pull Request
// @route   POST /api/reviews/analyze-pr
// @access  Private
exports.analyzePullRequest = async (req, res) => {
  try {
    const { owner, repo, pullNumber, workspaceId } = req.body;
    const userId = req.user._id;

    if (!owner || !repo || !pullNumber) {
      return res.status(400).json({ message: 'Owner, repository, and pull number are required' });
    }

    const user = await User.findById(userId);
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account is not connected' });
    }

    emitScanProgress(userId, `Fetching PR #${pullNumber} metadata from GitHub...`, 10);
    const prDetails = await getPullDetails(user.githubAccessToken, owner, repo, pullNumber);
    
    emitScanProgress(userId, 'Downloading changed files & diff patches...', 25);
    const files = await getPullFiles(user.githubAccessToken, owner, repo, pullNumber);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No changed files found in this Pull Request' });
    }

    let customRules = [];
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        customRules = workspace.customRules || [];
      }
    }

    emitScanProgress(userId, `Running deep AI audit on ${files.length} PR files...`, 55);
    let compoundCode = '';
    files.forEach((f) => {
      compoundCode += `\n\n--- FILE: ${f.name} (${f.status}, +${f.additions}/-${f.deletions}) ---\n${f.content || f.patch || ''}`;
    });

    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;
    const analysis = await analyzeCode(
      compoundCode,
      'multi-file pull request',
      [...customRules, `PR Title: ${prDetails.title}`, 'Analyze cross-file logic, API compatibility, and security vulnerabilities.'],
      userApiKey,
      user.preferences?.explanationLevel || 'mid',
      prDetails.title
    );

    emitScanProgress(userId, 'Computing Code Change Impact Radar & Risk Analysis...', 85);

    const findings = (analysis.findings || []).map(f => ({
      ...f,
      status: 'unresolved',
      file: f.file || (files[0] ? files[0].name : 'main')
    }));

    const changedFiles = files.map(f => ({
      name: f.name,
      path: f.path || f.name,
      language: f.language || 'javascript',
      status: f.status || 'modified',
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      patch: f.patch || '',
      originalContent: f.content || '',
      optimizedContent: f.content || ''
    }));

    const recentReviews = await Review.find({ userId }).sort({ createdAt: -1 }).limit(5).select('metrics findings');
    let pastAverageScore = 100;
    let recentCriticals = 0;
    if (recentReviews.length > 0) {
      const sum = recentReviews.reduce((acc, r) => acc + (r.metrics?.overallScore || 100), 0);
      pastAverageScore = Math.round(sum / recentReviews.length);
      recentCriticals = recentReviews.reduce((acc, r) => acc + (r.findings?.filter(f => f.severity === 'critical').length || 0), 0);
    }

    const historyContext = { pastAverageScore, recentCriticals };
    const riskAnalysis = calculateChangeRisk({ files: changedFiles, findings, historyContext });
    const impactAnalysis = calculateImpactRadar({ files: changedFiles, findings, historyContext });

    const metrics = {
      bugs: analysis.metrics?.bugs ?? 100,
      security: analysis.metrics?.security ?? 100,
      performance: analysis.metrics?.performance ?? 100,
      style: analysis.metrics?.style ?? 100,
      maintainability: analysis.metrics?.maintainability ?? 100,
      overallScore: analysis.metrics?.overallScore ?? 100,
      riskScore: riskAnalysis.score
    };

    emitScanProgress(userId, 'Pull Request audit complete', 100);

    const review = await Review.create({
      userId,
      workspaceId: workspaceId || null,
      title: `PR #${pullNumber}: ${prDetails.title} (${owner}/${repo})`,
      language: files[0]?.language || 'javascript',
      originalCode: compoundCode,
      optimizedCode: analysis.optimizedCode || compoundCode,
      changedFiles,
      findings,
      metrics,
      riskAnalysis,
      impactAnalysis,
      sourceType: 'github',
      githubMetadata: {
        repoFullName: `${owner}/${repo}`,
        repoOwner: owner,
        repoName: repo,
        prNumber: pullNumber,
        prTitle: prDetails.title,
        prUrl: prDetails.html_url,
        author: prDetails.user?.login || 'unknown',
        headRef: prDetails.head?.ref,
        baseRef: prDetails.base?.ref,
        commitSha: prDetails.head?.sha
      }
    });

    await handlePostReviewAutomations(review);

    res.status(201).json(review);
  } catch (error) {
    console.error('PR analysis error:', error);
    emitScanProgress(req.user._id, 'PR Scan failed: ' + error.message, 0);
    res.status(500).json({ message: error.message || 'Error auditing Pull Request' });
  }
};

// @desc    Get Risk Analysis for a review
// @route   GET /api/reviews/:id/risk
// @access  Private
exports.getReviewRisk = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user._id });
    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }
    res.json({
      riskAnalysis: review.riskAnalysis,
      metrics: review.metrics
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving risk analysis' });
  }
};

// @desc    Get Impact Radar analysis for a review
// @route   GET /api/reviews/:id/impact
// @access  Private
exports.getReviewImpact = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user._id });
    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }
    res.json({
      impactAnalysis: review.impactAnalysis,
      changedFiles: review.changedFiles
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving impact analysis' });
  }
};

// @desc    Get Findings/Issues for a review
// @route   GET /api/reviews/:id/issues
// @access  Private
exports.getReviewIssues = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user._id });
    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }
    res.json({
      findings: review.findings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving issues' });
  }
};

// @desc    Toggle finding resolved state
// @route   PUT /api/reviews/:id/findings/:findingId/resolve
// @access  Private
exports.resolveFinding = async (req, res) => {
  try {
    const { id, findingId } = req.params;
    const review = await Review.findOne({ _id: id, userId: req.user._id });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const finding = review.findings.id(findingId);
    if (!finding) {
      return res.status(404).json({ message: 'Finding not found' });
    }

    // Toggle status while strictly PRESERVING original category and severity
    if (finding.status === 'resolved') {
      finding.status = 'unresolved';
      finding.resolvedAt = null;
    } else {
      finding.status = 'resolved';
      finding.resolvedAt = new Date();
    }

    await review.save();
    res.json({ message: 'Finding status updated', finding, findings: review.findings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating finding resolution' });
  }
};

// @desc    Send follow-up question and stream answer
// @route   POST /api/reviews/:id/chat
// @access  Private
exports.chatFollowUp = async (req, res) => {
  try {
    const { message } = req.body;
    const reviewId = req.params.id;
    const userId = req.user._id;

    if (!message) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }

    review.chatHistory.push({ role: 'user', content: message });
    await review.save();

    const io = getIO();
    const chatRoom = `review_${reviewId}`;

    const user = await User.findById(userId);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;

    res.json({ message: 'Streaming response started' });

    await streamFollowUpChat(
      review,
      message,
      (chunk) => {
        io.to(chatRoom).emit('chat_chunk', { text: chunk });
      },
      async (completeText) => {
        const updatedReview = await Review.findById(reviewId);
        updatedReview.chatHistory.push({ role: 'model', content: completeText });
        await updatedReview.save();
        
        io.to(chatRoom).emit('chat_done', { completeText });
      },
      (err) => {
        io.to(chatRoom).emit('chat_error', { error: err.message });
      },
      userApiKey
    );

  } catch (error) {
    console.error('Chat follow up error:', error);
    res.status(500).json({ message: error.message || 'Error starting chat' });
  }
};

// @desc    Bookmark or unbookmark a review
// @route   PUT /api/reviews/:id/bookmark
// @access  Private
exports.toggleBookmark = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isBookmarked = !review.isBookmarked;
    await review.save();

    res.json({ isBookmarked: review.isBookmarked });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling bookmark' });
  }
};

// @desc    Update optimized code and findings (used when user applies fixes)
// @route   PUT /api/reviews/:id/apply-fix
// @access  Private
exports.applyFix = async (req, res) => {
  try {
    const { optimizedCode, findingId, findings, metrics, changedFiles } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (optimizedCode !== undefined) review.optimizedCode = optimizedCode;
    if (findings !== undefined) review.findings = findings;
    if (metrics !== undefined) review.metrics = metrics;
    if (changedFiles !== undefined) review.changedFiles = changedFiles;

    if (findingId) {
      const targetFinding = review.findings.id(findingId);
      if (targetFinding) {
        targetFinding.status = 'resolved';
        targetFinding.resolvedAt = new Date();
      }
    }

    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error applying edit updates' });
  }
};

// @desc    Generate unit tests for a review session
// @route   POST /api/reviews/:id/generate-tests
// @access  Private
exports.generateTestsController = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }

    const user = await User.findById(req.user._id);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;

    const testCode = await require('../services/geminiService').generateTests(
      review.originalCode,
      review.language,
      review.findings,
      userApiKey
    );

    review.generatedTests = testCode;
    await review.save();

    res.json({ generatedTests: testCode });
  } catch (error) {
    console.error('Error generating tests:', error);
    res.status(500).json({ message: error.message || 'Error generating unit tests' });
  }
};

// @desc    Translate comments and strings inside code review
// @route   POST /api/reviews/:id/translate-comments
// @access  Private
exports.translateCommentsController = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { targetLanguage } = req.body;
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }

    const user = await User.findById(req.user._id);
    const userApiKey = user.apiKeys ? user.apiKeys.gemini : null;

    const translationResult = await require('../services/geminiService').translateComments(
      review.originalCode,
      targetLanguage || 'english',
      userApiKey
    );

    review.translationResult = translationResult;
    await review.save();

    res.json(translationResult);
  } catch (error) {
    console.error('Error translating comments:', error);
    res.status(500).json({ message: error.message || 'Error translating comments' });
  }
};
