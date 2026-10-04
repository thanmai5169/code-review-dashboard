const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getUserRepos, getRepoPulls, getPullFiles, getPullDetails, getUserProfile } = require('../services/githubService');
const { analyzePullRequest } = require('../controllers/reviewController');
const User = require('../models/User');

const router = express.Router();

router.use(protect);

// GET /api/github/repos - List user's repos
router.get('/repos', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked. Please connect via Personal Access Token or GitHub Login.' });
    }
    const repos = await getUserRepos(user.githubAccessToken);
    res.json(repos);
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    res.status(500).json({ message: 'Error retrieving GitHub repositories' });
  }
});

// GET /api/github/pulls/:owner/:repo - List PRs (open, closed, or all)
router.get('/pulls/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const state = req.query.state || 'all';
    const user = await User.findById(req.user._id);
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked.' });
    }
    const pulls = await getRepoPulls(user.githubAccessToken, owner, repo, state);
    res.json(pulls);
  } catch (error) {
    console.error('Error fetching pulls:', error.message);
    res.status(500).json({ message: 'Error retrieving pull requests' });
  }
});

// GET /api/github/pulls/:owner/:repo/:pull_number/files - Fetch changed files
router.get('/pulls/:owner/:repo/:pull_number/files', async (req, res) => {
  try {
    const { owner, repo, pull_number } = req.params;
    const user = await User.findById(req.user._id);
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked.' });
    }
    const files = await getPullFiles(user.githubAccessToken, owner, repo, parseInt(pull_number));
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error.message);
    res.status(500).json({ message: 'Error retrieving pull request files' });
  }
});

// POST /api/github/pulls/:owner/:repo/:pull_number/analyze - Direct PR Audit
router.post('/pulls/:owner/:repo/:pull_number/analyze', async (req, res) => {
  req.body.owner = req.params.owner;
  req.body.repo = req.params.repo;
  req.body.pullNumber = parseInt(req.params.pull_number);
  return analyzePullRequest(req, res);
});

// POST /api/github/link-pat - Link GitHub account using a Personal Access Token
router.post('/link-pat', async (req, res) => {
  try {
    const { pat } = req.body;
    if (!pat) {
      return res.status(400).json({ message: 'Personal Access Token is required' });
    }

    // Validate token
    const profile = await getUserProfile(pat);

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.githubAccessToken = pat;
    user.githubId = profile.id.toString();
    if (profile.avatar_url && (!user.avatar || user.avatar.startsWith('https://api.dicebear.com'))) {
      user.avatar = profile.avatar_url;
    }
    await user.save();

    res.json({
      message: 'GitHub linked successfully using Personal Access Token',
      githubUsername: profile.login,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error linking GitHub PAT:', error.message);
    res.status(400).json({ message: 'Invalid or expired GitHub Personal Access Token' });
  }
});

// POST /api/github/unlink - Unlink GitHub account
router.post('/unlink', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.githubAccessToken = undefined;
    user.githubId = undefined;
    await user.save();

    res.json({ message: 'GitHub account unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking GitHub:', error.message);
    res.status(500).json({ message: 'Error unlinking GitHub account' });
  }
});

module.exports = router;
