const mongoose = require('mongoose');

const ReviewVersionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileHash: { type: String, required: true }, // MD5 of filename+userId
  fileName: { type: String, required: true },
  versions: [{
    submittedAt: { type: Date, default: Date.now },
    code: { type: String, required: true },
    score: { type: Number, default: 0 },
    findings: { type: Number, default: 0 },
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true }
  }]
}, {
  timestamps: true
});

ReviewVersionSchema.index({ userId: 1, fileHash: 1 }, { unique: true });

module.exports = mongoose.model('ReviewVersion', ReviewVersionSchema);
