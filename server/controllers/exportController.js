const Review = require('../models/Review');
const { generatePDFReport, generateMarkdownReport } = require('../services/exportService');

// @desc    Export code review report as PDF or Markdown
// @route   GET /api/export/:id
// @access  Private
exports.exportReviewReport = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const format = req.query.format || 'pdf';

    const review = await Review.findOne({
      _id: reviewId,
      userId: req.user._id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (format === 'markdown' || format === 'md') {
      const mdContent = generateMarkdownReport(review);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename=codelens-report-${reviewId}.md`);
      return res.send(mdContent);
    } else {
      // Default: PDF format
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=codelens-report-${reviewId}.pdf`);
      
      generatePDFReport(review, res);
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Server error generating export files' });
  }
};
