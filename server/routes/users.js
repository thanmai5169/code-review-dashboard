const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

router.use(protect);

// PUT /api/users/me/explanation-level - Update explanation level preference
router.put('/me/explanation-level', async (req, res) => {
  try {
    const { explanationLevel } = req.body;
    if (!['junior', 'mid', 'senior'].includes(explanationLevel)) {
      return res.status(400).json({ message: 'Invalid explanation level' });
    }
    const user = await User.findById(req.user._id);
    user.preferences.explanationLevel = explanationLevel;
    await user.save();
    res.json({
      message: 'Explanation level updated successfully',
      explanationLevel: user.preferences.explanationLevel
    });
  } catch (error) {
    console.error('Error updating explanation level:', error);
    res.status(500).json({ message: 'Error updating explanation level' });
  }
});

module.exports = router;
