const User = require('../models/User');

// @desc    Get user preferences settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences defaultLanguage apiKeys');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user settings' });
  }
};

// @desc    Update user preferences settings
// @route   PUT /api/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const { preferences, defaultLanguage, apiKeys } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (preferences) {
      user.preferences = {
        theme: preferences.theme || user.preferences.theme,
        notifications: preferences.notifications !== undefined ? preferences.notifications : user.preferences.notifications
      };
    }

    if (defaultLanguage) {
      user.defaultLanguage = defaultLanguage;
    }

    if (apiKeys) {
      if (apiKeys.gemini !== undefined) user.apiKeys.gemini = apiKeys.gemini;
    }

    await user.save();

    res.json({
      message: 'Settings updated successfully',
      preferences: user.preferences,
      defaultLanguage: user.defaultLanguage,
      apiKeys: {
        gemini: user.apiKeys.gemini ? '********' : ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user settings' });
  }
};
