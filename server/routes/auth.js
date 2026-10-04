const express = require('express');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const { isGitHubConfigured, callbackURL } = require('../config/passport');
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  generateApiKey,
  revokeApiKey,
  githubCallbackSuccess,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// Avatar upload configuration
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit for avatars
});

// Auth endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, avatarUpload.single('avatar'), updateProfile);
router.post('/apikey', protect, generateApiKey);
router.delete('/apikey', protect, revokeApiKey);

// GET /api/auth/github/status - Public endpoint to check OAuth availability
router.get('/github/status', (req, res) => {
  const configured = Boolean(
    passport._strategies && 
    passport._strategies.github && 
    isGitHubConfigured
  );
  
  res.json({
    configured,
    callbackUrl: callbackURL,
    clientIdConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID.trim() !== '')
  });
});

// GET /api/auth/github - Initiate GitHub OAuth flow
router.get('/github', (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const hasStrategy = Boolean(passport._strategies && passport._strategies.github);

  if (!hasStrategy) {
    // If request comes from browser navigation, redirect to frontend with helpful query
    if (req.accepts('html')) {
      const fromLogin = req.query.from === 'login';
      const redirectTarget = fromLogin ? '/login?error=oauth_unconfigured' : '/repositories?error=oauth_unconfigured';
      return res.redirect(`${clientUrl}${redirectTarget}`);
    }

    return res.status(400).json({
      configured: false,
      message: 'GitHub OAuth is not configured on this server. Please connect your GitHub account using a Personal Access Token in your profile or connection modal.'
    });
  }

  // Pass user JWT token (if already logged in) via OAuth state parameter for secure account linking
  const state = req.query.token || req.query.state || '';
  passport.authenticate('github', { 
    scope: ['user:email', 'repo'],
    state
  })(req, res, next);
});

// GET /api/auth/github/callback - OAuth Callback handler
router.get('/github/callback', (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const hasStrategy = Boolean(passport._strategies && passport._strategies.github);

  if (!hasStrategy) {
    return res.redirect(`${clientUrl}/repositories?error=oauth_unconfigured`);
  }

  passport.authenticate('github', { 
    failureRedirect: `${clientUrl}/repositories?error=oauth_failed`, 
    session: false 
  })(req, res, next);
}, githubCallbackSuccess);

module.exports = router;
