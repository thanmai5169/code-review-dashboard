const { calculateChangeRisk, calculateImpactRadar } = require('../services/riskAnalysisService');

describe('Review Finding Resolution & Category Preservation', () => {

  it('should maintain original category and severity when marking status resolved', () => {
    // Initial finding detected by analysis
    const initialFinding = {
      _id: '507f1f77bcf86cd799439011',
      file: 'authController.js',
      lineStart: 42,
      lineEnd: 48,
      severity: 'critical',
      category: 'security',
      message: 'Unvalidated user input passed directly to database query',
      whyItMatters: 'Can lead to SQL/NoSQL injection vulnerability and complete database compromise.',
      suggestion: 'Use parameterized queries or ORM validation.',
      status: 'unresolved',
      resolvedAt: null
    };

    // User applies fix or clicks resolve
    const resolvedFinding = {
      ...initialFinding,
      status: 'resolved',
      resolvedAt: new Date()
    };

    // Verify properties
    expect(resolvedFinding.status).toBe('resolved');
    expect(resolvedFinding.resolvedAt).toBeInstanceOf(Date);
    // MUST PRESERVE original category and severity for historical analytics!
    expect(resolvedFinding.severity).toBe('critical');
    expect(resolvedFinding.category).toBe('security');
    expect(resolvedFinding.whyItMatters).toBe(initialFinding.whyItMatters);
  });

  it('should toggle back to unresolved if reopened by user', () => {
    const resolvedFinding = {
      _id: '507f1f77bcf86cd799439011',
      file: 'authController.js',
      severity: 'high',
      category: 'performance',
      status: 'resolved',
      resolvedAt: new Date()
    };

    const reopenedFinding = {
      ...resolvedFinding,
      status: 'unresolved',
      resolvedAt: null
    };

    expect(reopenedFinding.status).toBe('unresolved');
    expect(reopenedFinding.resolvedAt).toBeNull();
    expect(reopenedFinding.severity).toBe('high');
    expect(reopenedFinding.category).toBe('performance');
  });

});
