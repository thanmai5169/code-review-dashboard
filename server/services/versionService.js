const ReviewVersion = require('../models/ReviewVersion');
const crypto = require('crypto');

/**
 * Triggered after every review to track versions of code files
 */
const updateReviewVersion = async (userId, review) => {
  try {
    const fileName = review.title || 'Untitled Snippet';
    
    // Compute MD5 hash of (fileName + userId)
    const fileHash = crypto.createHash('md5').update(`${fileName}-${userId}`).digest('hex');

    let reviewVersion = await ReviewVersion.findOne({ userId, fileHash });
    if (!reviewVersion) {
      reviewVersion = new ReviewVersion({
        userId,
        fileHash,
        fileName,
        versions: []
      });
    }

    // Push new version entry
    reviewVersion.versions.push({
      submittedAt: review.createdAt || new Date(),
      code: review.originalCode,
      score: review.metrics?.overallScore || 100,
      findings: review.findings?.length || 0,
      reviewId: review._id
    });

    await reviewVersion.save();
  } catch (error) {
    console.error('Error updating review version:', error);
  }
};

module.exports = {
  updateReviewVersion
};
