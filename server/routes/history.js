const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getReviewsHistory,
  getReviewById,
  saveSnippet,
  getSnippets,
  deleteSnippet
} = require('../controllers/historyController');

const router = express.Router();

router.use(protect);

// Reviews history queries
router.get('/reviews', getReviewsHistory);
router.get('/reviews/:id', getReviewById);

// Snippets CRUD
router.post('/snippets', saveSnippet);
router.get('/snippets', getSnippets);
router.delete('/snippets/:id', deleteSnippet);

module.exports = router;
