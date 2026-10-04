const { calculateChangeRisk, calculateImpactRadar, estimateComplexity } = require('../services/riskAnalysisService');

describe('Edge Cases & Defensive Fallbacks', () => {

  describe('Empty Code & Files Handling', () => {
    it('should safely process empty code without throwing errors', () => {
      const emptyCode = '';
      const complexity = estimateComplexity(emptyCode);
      expect(complexity).toBe(1);

      const files = [{ name: 'empty.js', additions: 0, deletions: 0, originalContent: '' }];
      const findings = [];

      const risk = calculateChangeRisk({ files, findings });
      expect(risk.score).toBeLessThanOrEqual(25);
      expect(risk.level).toBe('LOW');

      const impact = calculateImpactRadar({ files, findings });
      expect(impact.files.length).toBe(1);
      expect(impact.score).toBe(0);
    });
  });

  describe('Syntax Errors / Malformed Snippets', () => {
    it('should safely analyze malformed syntax without crashing', () => {
      const malformedCode = `
        function brokenFunc( {
          const x = 
          if if if () {
            // Unclosed brackets and illegal tokens
      `;
      const complexity = estimateComplexity(malformedCode);
      expect(typeof complexity).toBe('number');
      expect(complexity).toBeGreaterThan(0);

      const files = [{ name: 'broken.js', additions: 7, deletions: 0, originalContent: malformedCode }];
      const findings = [{ severity: 'high', category: 'bug', message: 'Syntax error in function definition' }];

      const risk = calculateChangeRisk({ files, findings });
      expect(risk.score).toBeDefined();
      expect(risk.contributors.complexity).toBeDefined();
    });
  });

  describe('Large Files (> 1000 lines)', () => {
    it('should handle large files (>1000 lines) gracefully within score limits', () => {
      const largeContent = Array(1200).fill('console.log("line item");').join('\n');
      const files = [{
        name: 'largeBundle.js',
        additions: 1200,
        deletions: 400,
        originalContent: largeContent
      }];
      const findings = [
        { severity: 'medium', category: 'maintainability', message: 'File exceeds recommended 500 LOC threshold' }
      ];

      const risk = calculateChangeRisk({ files, findings });
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(risk.contributors.changeSize).toBe(15); // Max capped
    });
  });

  describe('Zero Findings / Clean Code (Score 100 Quality)', () => {
    it('should assign LOW risk and zero security deductions for pristine code', () => {
      const cleanContent = `
        /**
         * Pure function with clean types
         */
        export const add = (a: number, b: number): number => {
          return a + b;
        };
      `;
      const files = [{ name: 'math.ts', additions: 6, deletions: 0, originalContent: cleanContent }];
      const findings = [];

      const risk = calculateChangeRisk({ files, findings });
      expect(risk.score).toBeLessThanOrEqual(25);
      expect(risk.level).toBe('LOW');
      expect(risk.contributors.security).toBe(0);
    });
  });

});
