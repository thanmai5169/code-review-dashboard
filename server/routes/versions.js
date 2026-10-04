const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const ReviewVersion = require('../models/ReviewVersion');

const router = express.Router();

router.use(protect);

// GET /api/reviews/versions - Get list of versioned files for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const history = await ReviewVersion.find({ userId }).select('fileName fileHash versions.score versions.submittedAt');
    res.json(history);
  } catch (error) {
    console.error('Error fetching versions index:', error);
    res.status(500).json({ message: 'Error retrieving file versions index' });
  }
});

// GET /api/reviews/versions/:fileHash - Get version timeline for a specific file
router.get('/:fileHash', async (req, res) => {
  try {
    const userId = req.user._id;
    const { fileHash } = req.params;

    const fileHistory = await ReviewVersion.findOne({ userId, fileHash })
      .populate('versions.reviewId', 'title language createdAt');

    if (!fileHistory) {
      return res.status(404).json({ message: 'Version history not found for this file' });
    }

    res.json(fileHistory);
  } catch (error) {
    console.error('Error fetching file versions:', error);
    res.status(500).json({ message: 'Error retrieving version history' });
  }
});

// GET /api/reviews/versions/:fileHash/diff?v1=0&v2=2 - Return two version code content for comparison
router.get('/:fileHash/diff', async (req, res) => {
  try {
    const userId = req.user._id;
    const { fileHash } = req.params;
    const { v1, v2 } = req.query;

    if (v1 === undefined || v2 === undefined) {
      return res.status(400).json({ message: 'Both v1 and v2 version indices are required' });
    }

    const fileHistory = await ReviewVersion.findOne({ userId, fileHash });
    if (!fileHistory) {
      return res.status(404).json({ message: 'Version history not found' });
    }

    const idx1 = parseInt(v1);
    const idx2 = parseInt(v2);

    const version1 = fileHistory.versions[idx1];
    const version2 = fileHistory.versions[idx2];

    if (!version1 || !version2) {
      return res.status(404).json({ message: 'Target version index not found' });
    }

    res.json({
      v1: {
        submittedAt: version1.submittedAt,
        score: version1.score,
        findings: version1.findings,
        code: version1.code
      },
      v2: {
        submittedAt: version2.submittedAt,
        score: version2.score,
        findings: version2.findings,
        code: version2.code
      }
    });
  } catch (error) {
    console.error('Error calculating versions diff:', error);
    res.status(500).json({ message: 'Error calculating diff' });
  }
});

module.exports = router;
