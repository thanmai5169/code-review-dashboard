const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'reviewer', 'developer'], default: 'developer' }
  }],
  customRules: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
