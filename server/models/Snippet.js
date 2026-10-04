const mongoose = require('mongoose');

const SnippetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  code: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  tags: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Snippet', SnippetSchema);
