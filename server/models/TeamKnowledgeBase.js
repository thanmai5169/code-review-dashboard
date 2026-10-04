const mongoose = require('mongoose');

const TeamKnowledgeBaseSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  entries: [{
    category: { type: String, enum: ['bug', 'security', 'performance', 'style', 'intent_mismatch'], default: 'style' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    codeExample: { type: String, default: '' },
    occurrenceCount: { type: Number, default: 1 },
    contributingReviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('TeamKnowledgeBase', TeamKnowledgeBaseSchema);
