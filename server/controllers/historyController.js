const Review = require('../models/Review');
const Snippet = require('../models/Snippet');

// @desc    Get historical reviews with filtering & pagination
// @route   GET /api/reviews
// @access  Private
exports.getReviewsHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, language, severity, workspaceId, bookmarked, date } = req.query;

    // Build query object
    let query = { userId };

    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    if (bookmarked === 'true') {
      query.isBookmarked = true;
    }

    if (language) {
      query.language = language.toLowerCase();
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (severity) {
      // Find reviews where at least one finding matches this severity
      query['findings.severity'] = severity.toLowerCase();
    }

    if (date) {
      // Parse the local date string and create a UTC day range
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Execute queries
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-originalCode -optimizedCode -chatHistory'); // Exclude heavy code payloads for tables

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ message: 'Server error retrieving history' });
  }
};

// @desc    Get single review session details
// @route   GET /api/reviews/:id
// @access  Private
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review session not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Fetch review details error:', error);
    res.status(500).json({ message: 'Server error retrieving review' });
  }
};

// @desc    Save a standalone code snippet
// @route   POST /api/snippets
// @access  Private
exports.saveSnippet = async (req, res) => {
  try {
    const { title, code, language, reviewId, tags } = req.body;
    const userId = req.user._id;

    if (!title || !code) {
      return res.status(400).json({ message: 'Title and code contents are required' });
    }

    const snippet = await Snippet.create({
      userId,
      title,
      code,
      language: language || 'javascript',
      reviewId: reviewId || null,
      tags: tags || []
    });

    res.status(201).json(snippet);
  } catch (error) {
    console.error('Save snippet error:', error);
    res.status(500).json({ message: 'Server error saving snippet' });
  }
};

// @desc    Get all saved user snippets
// @route   GET /api/snippets
// @access  Private
exports.getSnippets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tag, search } = req.query;

    let query = { userId };

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const snippets = await Snippet.find(query).sort({ createdAt: -1 });
    res.json(snippets);
  } catch (error) {
    console.error('Get snippets error:', error);
    res.status(500).json({ message: 'Server error fetching snippets' });
  }
};

// @desc    Delete a saved user snippet
// @route   DELETE /api/snippets/:id
// @access  Private
exports.deleteSnippet = async (req, res) => {
  try {
    const snippet = await Snippet.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!snippet) {
      return res.status(404).json({ message: 'Snippet not found' });
    }

    res.json({ message: 'Snippet deleted successfully' });
  } catch (error) {
    console.error('Delete snippet error:', error);
    res.status(500).json({ message: 'Server error deleting snippet' });
  }
};
