const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  analyzePaste,
  analyzeFileUpload,
  analyzeBatch,
  analyzePullRequest,
  getReviewRisk,
  getReviewImpact,
  getReviewIssues,
  resolveFinding,
  chatFollowUp,
  toggleBookmark,
  applyFix,
  generateTestsController,
  translateCommentsController
} = require('../controllers/reviewController');
const { getReviewsHistory, getReviewById } = require('../controllers/historyController');

const router = express.Router();

// Apply auth middleware to all review endpoints
router.use(protect);

router.get('/', getReviewsHistory);
router.post('/analyze', analyzePaste);
router.post('/upload', upload.single('codeFile'), analyzeFileUpload);
router.post('/analyze-batch', analyzeBatch);
router.post('/analyze-pr', analyzePullRequest);

router.get('/:id', getReviewById);
router.get('/:id/risk', getReviewRisk);
router.get('/:id/impact', getReviewImpact);
router.get('/:id/issues', getReviewIssues);
router.put('/:id/findings/:findingId/resolve', resolveFinding);

router.post('/:id/chat', chatFollowUp);
router.put('/:id/bookmark', toggleBookmark);
router.put('/:id/apply-fix', applyFix);
router.post('/:id/generate-tests', generateTestsController);
router.post('/:id/translate-comments', translateCommentsController);

module.exports = router;
