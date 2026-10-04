const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { exportReviewReport } = require('../controllers/exportController');

const router = express.Router();

// GET /api/export/:id?format=pdf|markdown
router.get('/:id', protect, exportReviewReport);

module.exports = router;
