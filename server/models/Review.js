const mongoose = require('mongoose');

const FindingSchema = new mongoose.Schema({
  file: { type: String, default: 'main' },
  lineStart: { type: Number, default: 1 },
  lineEnd: { type: Number, default: 1 },
  severity: { 
    type: String, 
    enum: ['critical', 'high', 'medium', 'low', 'info'], 
    default: 'medium' 
  },
  category: { 
    type: String, 
    enum: ['bug', 'security', 'performance', 'style', 'maintainability', 'intent_mismatch'], 
    default: 'bug' 
  },
  message: { type: String, required: true },
  whyItMatters: { type: String },
  suggestion: { type: String },
  fixCode: { type: String },
  status: { 
    type: String, 
    enum: ['unresolved', 'resolved'], 
    default: 'unresolved' 
  },
  resolvedAt: { type: Date }
});

const ChangedFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String },
  language: { type: String, default: 'javascript' },
  status: { type: String, enum: ['added', 'modified', 'deleted', 'renamed'], default: 'modified' },
  additions: { type: Number, default: 0 },
  deletions: { type: Number, default: 0 },
  patch: { type: String },
  originalContent: { type: String },
  optimizedContent: { type: String }
});

const FileImpactSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  impactScore: { type: Number, min: 0, max: 100, default: 0 },
  additions: { type: Number, default: 0 },
  deletions: { type: Number, default: 0 },
  issuesCount: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    info: { type: Number, default: 0 }
  },
  dependencies: [{ type: String }],
  dependents: [{ type: String }],
  reviewPriority: { type: String, default: 'FOURTH' },
  priorityRank: { type: Number, default: 99 },
  priorityReason: { type: String }
});

const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
  title: { type: String, default: 'Untitled Code Review' },
  language: { type: String, default: 'javascript' },
  originalCode: { type: String, required: true },
  optimizedCode: { type: String },
  changedFiles: [ChangedFileSchema],
  findings: [FindingSchema],
  metrics: {
    bugs: { type: Number, default: 100 },
    security: { type: Number, default: 100 },
    performance: { type: Number, default: 100 },
    style: { type: Number, default: 100 },
    maintainability: { type: Number, default: 100 },
    overallScore: { type: Number, default: 100 },
    riskScore: { type: Number, default: 0 }
  },
  riskAnalysis: {
    score: { type: Number, min: 0, max: 100, default: 0 },
    level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW', index: true },
    contributors: {
      security: { type: Number, default: 0 },
      complexity: { type: Number, default: 0 },
      fileImpact: { type: Number, default: 0 },
      changeSize: { type: Number, default: 0 },
      history: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    reasons: [{ type: String }]
  },
  impactAnalysis: {
    score: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    files: [FileImpactSchema],
    dependencyGraph: {
      nodes: [{
        id: { type: String },
        label: { type: String },
        riskLevel: { type: String },
        impactScore: { type: Number },
        isChanged: { type: Boolean, default: true },
        additions: { type: Number, default: 0 },
        deletions: { type: Number, default: 0 },
        issuesCount: { type: Number, default: 0 }
      }],
      edges: [{
        from: { type: String },
        to: { type: String },
        label: { type: String }
      }]
    },
    recommendedReviewOrder: [{
      rank: { type: Number },
      filename: { type: String },
      riskLevel: { type: String },
      priority: { type: String },
      reason: { type: String }
    }]
  },
  githubMetadata: {
    repoFullName: { type: String },
    repoOwner: { type: String },
    repoName: { type: String },
    prNumber: { type: Number },
    prTitle: { type: String },
    prUrl: { type: String },
    author: { type: String },
    headRef: { type: String },
    baseRef: { type: String },
    commitSha: { type: String }
  },
  chatHistory: [{
    role: { type: String, enum: ['user', 'model'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }],
  isBookmarked: { type: Boolean, default: false },
  sourceType: { type: String, enum: ['paste', 'file', 'github', 'precommit', 'batch'], default: 'paste' },
  explanationLevel: { type: String, enum: ['junior', 'mid', 'senior'], default: 'mid' },
  intentStatement: { type: String },
  generatedTests: { type: String },
  translationResult: {
    detectedLanguages: [{ type: String }],
    translations: [{
      original: { type: String },
      line: { type: Number },
      translated: { type: String }
    }],
    renamedVariables: [{
      original: { type: String },
      line: { type: Number },
      suggested: { type: String }
    }],
    translatedCode: { type: String }
  }
}, {
  timestamps: true
});

ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
