const {
  estimateComplexity,
  extractFileDependencies,
  calculateChangeRisk,
  calculateImpactRadar
} = require('../services/riskAnalysisService');

describe('Risk Analysis Service - Deterministic Calculations', () => {

  describe('estimateComplexity', () => {
    it('should calculate baseline complexity for simple linear code', () => {
      const code = `
        const a = 1;
        const b = 2;
        const c = a + b;
        console.log(c);
      `;
      const score = estimateComplexity(code);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(5);
    });

    it('should increase complexity score for nested loops and branches', () => {
      const complexCode = `
        function processItems(items) {
          if (!items) return null;
          for (let i = 0; i < items.length; i++) {
            if (items[i].active) {
              while (items[i].count > 0) {
                switch(items[i].type) {
                  case 'A':
                    try {
                      if (items[i].subType === 'X' || items[i].subType === 'Y') {
                        doSomething();
                      }
                    } catch (e) {
                      console.error(e);
                    }
                    break;
                  case 'B':
                    break;
                }
              }
            }
          }
        }
      `;
      const score = estimateComplexity(complexCode);
      expect(score).toBeGreaterThan(15);
    });
  });

  describe('extractFileDependencies', () => {
    it('should extract JavaScript/TypeScript require and import statements', () => {
      const jsCode = `
        const auth = require('./authService');
        import { db } from '../config/database';
        import axios from 'axios';
        const config = require('./config');
      `;
      const deps = extractFileDependencies(jsCode, 'src/controllers/userController.js');
      expect(deps).toContain('authService');
      expect(deps).toContain('database');
      expect(deps).toContain('axios');
      expect(deps).toContain('config');
    });

    it('should extract Python imports', () => {
      const pyCode = `
        import os
        import sys
        from services.auth import AuthService
        from ..models import User
      `;
      const deps = extractFileDependencies(pyCode, 'controllers/user.py');
      expect(deps).toContain('os');
      expect(deps).toContain('sys');
      expect(deps).toContain('AuthService');
      expect(deps).toContain('User');
    });

    it('should extract Go imports', () => {
      const goCode = `
        package main
        import (
          "fmt"
          "net/http"
          "github.com/gin-gonic/gin"
        )
      `;
      const deps = extractFileDependencies(goCode, 'main.go');
      expect(deps).toContain('fmt');
      expect(deps).toContain('http');
      expect(deps).toContain('gin');
    });
  });

  describe('calculateChangeRisk', () => {
    it('should return LOW risk for small, clean changes without security findings', () => {
      const files = [{
        name: 'utils.js',
        additions: 10,
        deletions: 2,
        originalContent: 'export function add(a, b) { return a + b; }'
      }];
      const findings = [{ severity: 'low', category: 'style', message: 'Add jsdoc' }];
      
      const result = calculateChangeRisk({ files, findings });
      expect(result.score).toBeLessThanOrEqual(25);
      expect(result.level).toBe('LOW');
      expect(result.contributors.security).toBe(0);
      expect(result.contributors.complexity).toBeGreaterThanOrEqual(1);
    });

    it('should calculate CRITICAL risk for large changes with critical security vulnerabilities', () => {
      const files = [
        { name: 'auth.js', additions: 150, deletions: 80, originalContent: 'for (let i = 0; i < 100; i++) { if (a && b || c) { while (d) {} } }' },
        { name: 'payment.js', additions: 300, deletions: 120, originalContent: 'for (let i = 0; i < 100; i++) { if (a && b || c) { while (d) {} } }' },
        { name: 'api.js', additions: 200, deletions: 90, originalContent: 'for (let i = 0; i < 100; i++) { if (a && b || c) { while (d) {} } }' },
        { name: 'db.js', additions: 100, deletions: 40, originalContent: 'for (let i = 0; i < 100; i++) { if (a && b || c) { while (d) {} } }' }
      ];
      const findings = [
        { severity: 'critical', category: 'security', message: 'SQL Injection in raw query' },
        { severity: 'critical', category: 'security', message: 'Hardcoded secret token' },
        { severity: 'high', category: 'security', message: 'Missing CSRF token' }
      ];
      const historyContext = { pastAverageScore: 40, recentCriticals: 3 };

      const result = calculateChangeRisk({ files, findings, historyContext });
      expect(result.score).toBeGreaterThanOrEqual(76);
      expect(result.level).toBe('CRITICAL');
      expect(result.contributors.security).toBe(30); // Max capped
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should always clamp score between 0 and 100', () => {
      const files = [];
      const findings = [];
      const emptyResult = calculateChangeRisk({ files, findings });
      expect(emptyResult.score).toBeGreaterThanOrEqual(0);
      expect(emptyResult.score).toBeLessThanOrEqual(100);

      const massiveFindings = Array(100).fill({ severity: 'critical', category: 'security', message: 'Critical bug' });
      const heavyResult = calculateChangeRisk({ files, findings: massiveFindings });
      expect(heavyResult.score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateImpactRadar', () => {
    it('should generate dependency graph nodes and edges with recommended review order', () => {
      const files = [
        {
          name: 'controllers/authController.js',
          additions: 40,
          deletions: 10,
          originalContent: "const authService = require('../services/authService');"
        },
        {
          name: 'services/authService.js',
          additions: 120,
          deletions: 30,
          originalContent: "const userModel = require('../models/userModel'); const jwt = require('jsonwebtoken');"
        },
        {
          name: 'models/userModel.js',
          additions: 15,
          deletions: 2,
          originalContent: "const mongoose = require('mongoose');"
        }
      ];

      const findings = [
        { file: 'services/authService.js', severity: 'critical', category: 'security', message: 'Weak JWT signature verification' },
        { file: 'controllers/authController.js', severity: 'medium', category: 'bug', message: 'Missing error handler' }
      ];

      const radar = calculateImpactRadar({ files, findings });

      expect(radar.files.length).toBe(3);
      expect(radar.dependencyGraph.nodes.length).toBeGreaterThanOrEqual(3);
      expect(radar.recommendedReviewOrder.length).toBe(3);

      // Verify highest priority is authService due to critical security finding + downstream coupling
      expect(radar.recommendedReviewOrder[0].filename).toBe('services/authService.js');
      expect(radar.recommendedReviewOrder[0].priority).toBe('FIRST');
      expect(radar.recommendedReviewOrder[0].riskLevel).toBe('CRITICAL');
      expect(radar.recommendedReviewOrder[0].reason).toContain('security findings');
    });
  });

});
