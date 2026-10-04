const { updateSkillProgress } = require('./skillService');
const { updateReviewVersion } = require('./versionService');
const { updateKnowledgeBase } = require('./knowledgeService');

/**
 * Executes background tasks asynchronously after a code review is completed
 */
const handlePostReviewAutomations = async (review) => {
  try {
    // Run post-review updates concurrently
    await Promise.all([
      updateSkillProgress(review.userId, review),
      updateReviewVersion(review.userId, review),
      review.workspaceId ? updateKnowledgeBase(review.workspaceId, review) : Promise.resolve()
    ]);
    console.log(`Successfully completed post-review automations for review: ${review._id}`);
  } catch (error) {
    console.error('Error executing post-review automations:', error);
  }
};

module.exports = {
  handlePostReviewAutomations
};
