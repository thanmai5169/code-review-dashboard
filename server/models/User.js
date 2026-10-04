const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  githubId: { type: String },
  githubUsername: { type: String },
  githubAccessToken: { type: String },
  gitlabId: { type: String },
  avatar: { type: String },
  defaultLanguage: { type: String, default: 'javascript' },
  apiKeys: {
    gemini: { type: String },
    codelensApiKey: { type: String } // CI/CD API Key
  },
  preferences: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    notifications: { type: Boolean, default: true },
    explanationLevel: { type: String, enum: ['junior', 'mid', 'senior'], default: 'mid' }
  },
  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, {
  timestamps: true
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
