const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmailAlert } = require('../services/notificationService');

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_codelens_321',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// @desc    Update user profile & preferences
// @route   PUT /api/auth/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.defaultLanguage = req.body.defaultLanguage || user.defaultLanguage;
    
    if (req.body.preferences) {
      user.preferences = {
        theme: req.body.preferences.theme || user.preferences.theme,
        notifications: req.body.preferences.notifications !== undefined ? req.body.preferences.notifications : user.preferences.notifications
      };
    }

    if (req.body.geminiApiKey !== undefined) {
      user.apiKeys.gemini = req.body.geminiApiKey;
    }

    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      githubUsername: updatedUser.githubUsername,
      githubId: updatedUser.githubId,
      defaultLanguage: updatedUser.defaultLanguage,
      preferences: updatedUser.preferences,
      apiKeys: {
        gemini: updatedUser.apiKeys.gemini ? '********' : '',
        codelensApiKey: updatedUser.apiKeys.codelensApiKey
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @desc    Generate a CodeLens API Key for CI/CD integrations
// @route   POST /api/auth/apikey
// @access  Private
exports.generateApiKey = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const apiKey = 'cl_' + crypto.randomBytes(24).toString('hex');
    user.apiKeys.codelensApiKey = apiKey;
    await user.save();

    res.json({ apiKey });
  } catch (error) {
    console.error('Generate API Key error:', error);
    res.status(500).json({ message: 'Server error generating API key' });
  }
};

// @desc    Revoke the CodeLens API Key
// @route   DELETE /api/auth/apikey
// @access  Private
exports.revokeApiKey = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.apiKeys.codelensApiKey = undefined;
    await user.save();

    res.json({ message: 'API Key revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error revoking API key' });
  }
};

// @desc    Handle GitHub OAuth Callback and return JWT
// @access  Private/OAuth
exports.githubCallbackSuccess = (req, res) => {
  try {
    const token = generateToken(req.user._id);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    // Redirect back to repositories with connected status & auth token
    const redirectUrl = `${clientUrl}/repositories?token=${token}&github_connected=true`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub callback redirect error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/repositories?error=oauth_failed`);
  }
};

// @desc    Initiate forgot password recovery email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const frontendHost = process.env.CLIENT_URL || process.env.VITE_SOCKET_URL || 'http://localhost:5173';
    const resetUrl = `${frontendHost}/reset-password?token=${token}`;

    await sendEmailAlert(
      user.email,
      'CodeLens: Reset Your Password',
      `You are receiving this email because you requested the reset of the password for your CodeLens account.\n\n` +
      `Please click on the following link to complete the process within one hour:\n\n` +
      `${resetUrl}\n\n` +
      `If you did not request this, please ignore this email and your password will remain unchanged.\n`
    );

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing forgot password request' });
  }
};

// @desc    Reset password using valid token
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};
