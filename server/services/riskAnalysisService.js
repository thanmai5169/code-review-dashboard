/**
 * CodeLens - Risk Analysis & Code Change Impact Radar Engine
 * Deterministic calculation of change risk, file impacts, dependency graphs,
 * and review priorities.
 */

// Complexity indicators regex for basic static estimation
const COMPLEXITY_PATTERNS = [
  /\b(for|while|do)\s*\(/g,
  /\b(if|else\s+if)\s*\(/g,
  /\b(switch|case)\b/g,
  /\b(try|catch|finally)\b/g,
  /\.map\(|\.filter\(|\.reduce\(|\.forEach\(/g,
  /function\b|\bconst\s+\w+\s*=\s*\([^)]*\)\s*=>/g,
  /class\s+\w+/g,
  /async\s+function|await\s+/g
];

/**
 * Estimate cyclomatic/structural complexity of a code string
 * @param {string} code 
 * @returns {number} complexity score (1-50)
 */
function estimateComplexity(code) {
  if (!code || typeof code !== 'string' || !code.trim()) return 1;
  let matchesCount = 0;
  COMPLEXITY_PATTERNS.forEach(pat => {
    const matches = code.match(pat);
    if (matches) matchesCount += matches.length;
  });

  const lineCount = code.split('\n').filter(l => l.trim().length > 0).length;
  const nestingDepth = (code.match(/\{/g) || []).length;

  const score = Math.round((matchesCount * 2.5) + (lineCount * 0.05) + (nestingDepth * 0.3));
  return Math.min(50, Math.max(1, score));
}

/**
 * Helper to extract raw dependency names from a single code snippet line by line
 */
function extractSingleFileDeps(content) {
  if (!content || typeof content !== 'string') return [];
  const deps = new Set();
  const lines = content.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) return;

    // 1. JS / TS: import ... from '...', require('...'), export ... from '...'
    const jsMatches = trimmed.matchAll(/(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\)|export\s+.*?from\s+['"]([^'"]+)['"])/g);
    for (const match of jsMatches) {
      const impPath = match[1] || match[2] || match[3];
      if (impPath) {
        const base = impPath.split('/').pop().replace(/\.[a-zA-Z0-9]+$/, '');
        deps.add(base);
      }
    }

    // 2. Python: from x.y import a, b OR import x, y
    const pyFromMatch = trimmed.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)$/);
    if (pyFromMatch) {
      const mod = pyFromMatch[1].split('.').pop();
      if (mod) deps.add(mod);
      pyFromMatch[2].split(',').forEach(item => {
        const clean = item.trim().split(/\s+as\s+/)[0].trim();
        if (clean) deps.add(clean);
      });
    }

    const pyImpMatch = trimmed.match(/^import\s+([a-zA-Z0-9_.,\s]+)$/);
    if (pyImpMatch) {
      pyImpMatch[1].split(',').forEach(item => {
        const clean = item.trim().split(/\s+as\s+/)[0].split('.').pop().trim();
        if (clean) deps.add(clean);
      });
    }

    // 3. Java / C#: import ...; using ...;
    const javaMatch = trimmed.match(/^(?:import\s+(?:static\s+)?([a-zA-Z0-9_.]+);|using\s+([a-zA-Z0-9_.]+);)/);
    if (javaMatch) {
      const imp = (javaMatch[1] || javaMatch[2] || '').split('.').pop();
      if (imp) deps.add(imp);
    }

    // 4. Go: import "..."
    const goMatch = trimmed.match(/^import\s+"([^"]+)"/);
    if (goMatch) {
      deps.add(goMatch[1].split('/').pop());
    }
    const goSingleInBlock = trimmed.match(/^"([^"]+)"/);
    if (goSingleInBlock) {
      deps.add(goSingleInBlock[1].split('/').pop());
    }
  });

  return Array.from(deps).filter(d => d && d.length > 1);
}

/**
 * Extract dependencies and imports from source code
 * Supports JavaScript/TypeScript, Python, Java, C#, Go, C/C++
 * Handles both extractFileDependencies(filesArray) and extractFileDependencies(code, filename)
 */
function extractFileDependencies(filesOrCode, filename) {
  if (typeof filesOrCode === 'string') {
    return extractSingleFileDeps(filesOrCode);
  }

  const files = Array.isArray(filesOrCode) ? filesOrCode : [];
  const fileNames = files.map(f => f.name || f.filename || 'unknown');
  const depMap = new Map();

  fileNames.forEach(name => {
    depMap.set(name, { dependencies: [], dependents: [] });
  });

  files.forEach(file => {
    const fileName = file.name || file.filename || 'unknown';
    const content = file.content || file.originalContent || file.patch || '';
    const deps = extractSingleFileDeps(content);

    const resolvedDeps = [];
    deps.forEach(dep => {
      const matched = fileNames.find(fn => fn.toLowerCase().includes(dep.toLowerCase()));
      if (matched && matched !== fileName) {
        resolvedDeps.push(matched);
      } else if (dep.length > 2 && !['react', 'fs', 'path', 'http', 'os', 'express', 'mongoose', 'sys', 'util', 'lodash'].includes(dep.toLowerCase())) {
        resolvedDeps.push(dep);
      }
    });

    const curr = depMap.get(fileName);
    if (curr) {
      curr.dependencies = resolvedDeps;
    }
  });

  // Backfill dependents
  files.forEach(file => {
    const fileName = file.name || file.filename || 'unknown';
    const entry = depMap.get(fileName);
    if (entry && entry.dependencies) {
      entry.dependencies.forEach(dep => {
        const target = depMap.get(dep);
        if (target && !target.dependents.includes(fileName)) {
          target.dependents.push(fileName);
        }
      });
    }
  });

  return depMap;
}

/**
 * Deterministic Risk Calculation for the overall change
 */
function calculateChangeRisk({ files = [], findings = [], historyContext = {} }) {
  const normFiles = Array.isArray(files) && files.length > 0 ? files : [{ name: 'main', content: '' }];
  const normFindings = Array.isArray(findings) ? findings : [];

  // 1. Security Score (0 - 30)
  let secScore = 0;
  let secCount = 0;
  let critCount = 0;
  let highCount = 0;

  normFindings.forEach(f => {
    const isSec = f.category === 'security';
    if (isSec) {
      secCount++;
      if (f.severity === 'critical') secScore += 15;
      else if (f.severity === 'high') secScore += 10;
      else if (f.severity === 'medium') secScore += 5;
      else if (f.severity === 'low') secScore += 2;
    }
    if (f.severity === 'critical') critCount++;
    if (f.severity === 'high') highCount++;
  });
  const security = Math.min(30, secScore);

  // 2. Complexity Score (0 - 25)
  let maxComplexity = 0;
  let totalComplexity = 0;
  let complexFileNames = [];

  normFiles.forEach(f => {
    const c = estimateComplexity(f.content || f.originalContent || f.patch || '');
    totalComplexity += c;
    if (c > maxComplexity) maxComplexity = c;
    if (c >= 12) complexFileNames.push(f.name || f.filename || 'source');
  });

  const avgComplexity = totalComplexity / Math.max(1, normFiles.length);
  const multiFileBoost = normFiles.length > 1 ? Math.min(6, normFiles.length * 1.5) : 0;
  const complexity = Math.min(25, Math.max(1, Math.round(maxComplexity * 0.4 + avgComplexity * 0.4 + multiFileBoost)));

  // 3. File Impact & Dependencies (0 - 20)
  const depMap = extractFileDependencies(normFiles);
  let crossFileRefCoupling = 0;
  if (depMap instanceof Map) {
    depMap.forEach((val) => {
      crossFileRefCoupling += (val.dependencies.length + val.dependents.length);
    });
  }

  const fileCountScore = Math.min(10, normFiles.length * 2.5);
  const depCouplingScore = Math.min(10, crossFileRefCoupling * 2);
  const fileImpact = Math.min(20, fileCountScore + depCouplingScore);

  // 4. Change Size (0 - 15)
  let totalAdditions = 0;
  let totalDeletions = 0;

  normFiles.forEach(f => {
    totalAdditions += (f.additions || 0);
    totalDeletions += (f.deletions || 0);
    if (!f.additions && !f.deletions && (f.content || f.originalContent)) {
      const lines = (f.content || f.originalContent).split('\n').filter(l => l.trim().length > 0).length;
      totalAdditions += lines;
    }
  });

  const totalLinesModified = totalAdditions + totalDeletions;
  let changeSize = 0;
  if (totalLinesModified > 500) changeSize = 15;
  else if (totalLinesModified > 250) changeSize = 12;
  else if (totalLinesModified > 100) changeSize = 8;
  else if (totalLinesModified > 40) changeSize = 5;
  else if (totalLinesModified > 10) changeSize = 3;
  else if (totalLinesModified > 0) changeSize = 1;

  // 5. Historical Context (0 - 10)
  let fromAvg = 0;
  let fromCrits = 0;
  if (historyContext.pastAverageScore && historyContext.pastAverageScore < 70) {
    fromAvg = Math.round((70 - historyContext.pastAverageScore) * 0.3);
  }
  if (historyContext.recentCriticals && historyContext.recentCriticals > 0) {
    fromCrits = historyContext.recentCriticals * 3;
  }
  const history = Math.min(10, fromAvg + fromCrits);

  // Calculate Total (0 - 100)
  const total = Math.min(100, Math.max(0, security + complexity + fileImpact + changeSize + history));

  // Determine Risk Level
  let level = 'LOW';
  if (total >= 76) level = 'CRITICAL';
  else if (total >= 51) level = 'HIGH';
  else if (total >= 26) level = 'MEDIUM';

  // Build Explanatory Reasons
  const reasons = [];
  reasons.push(`${normFiles.length} file(s) changed across the scope`);
  reasons.push(`${totalLinesModified} lines modified (+${totalAdditions} additions / -${totalDeletions} deletions)`);

  if (secCount > 0) {
    reasons.push(`${secCount} security finding(s) detected requiring review`);
  }
  if (critCount > 0) {
    reasons.push(`${critCount} critical vulnerability/bug identified`);
  }
  if (complexFileNames.length > 0) {
    reasons.push(`High structural complexity detected in ${complexFileNames.slice(0, 3).join(', ')}`);
  }
  if (crossFileRefCoupling > 0) {
    reasons.push(`${crossFileRefCoupling} cross-file module dependencies & linkages affected`);
  }
  if (history > 5) {
    reasons.push(`Historical issue frequency in touched module paths increases regression risk`);
  }

  return {
    score: total,
    level,
    contributors: {
      security,
      complexity,
      fileImpact,
      changeSize,
      history,
      total
    },
    reasons
  };
}

/**
 * Calculate per-file impact, dependency graph, and recommended review order
 */
function calculateImpactRadar({ files = [], findings = [], historyContext = {} }) {
  const normFiles = Array.isArray(files) && files.length > 0 ? files : [{ name: 'main', content: '' }];
  const normFindings = Array.isArray(findings) ? findings : [];
  const depMap = extractFileDependencies(normFiles);

  // 1. Calculate Per-File Impact
  const fileImpacts = normFiles.map(file => {
    const filename = file.name || file.filename || 'source';
    const depInfo = (depMap instanceof Map ? depMap.get(filename) : null) || { dependencies: [], dependents: [] };

    const fileFindings = normFindings.filter(f => {
      if (!f.file || f.file === 'main' || normFiles.length === 1) return true;
      return f.file.toLowerCase().includes(filename.toLowerCase()) || filename.toLowerCase().includes(f.file.toLowerCase());
    });

    const issuesCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    fileFindings.forEach(f => {
      if (issuesCount[f.severity] !== undefined) {
        issuesCount[f.severity]++;
      }
    });

    const adds = file.additions || (file.content ? file.content.split('\n').filter(l => l.trim().length > 0).length : 0);
    const dels = file.deletions || 0;
    const complexity = estimateComplexity(file.content || file.originalContent || file.patch || '');

    // Edge case: empty clean file
    if (adds === 0 && dels === 0 && fileFindings.length === 0 && complexity <= 1) {
      return {
        filename,
        riskLevel: 'LOW',
        impactScore: 0,
        additions: 0,
        deletions: 0,
        issuesCount,
        dependencies: depInfo.dependencies,
        dependents: depInfo.dependents,
        complexity: 1,
        findingsCount: 0
      };
    }

    // Deterministic File Impact Score (0 - 100)
    let score = 0;
    score += (issuesCount.critical * 35);
    score += (issuesCount.high * 18);
    score += (issuesCount.medium * 8);
    score += (issuesCount.low * 3);
    score += Math.min(20, (adds + dels) * 0.15);
    score += Math.min(15, complexity * 0.4);
    score += Math.min(15, (depInfo.dependents.length * 6) + (depInfo.dependencies.length * 3));

    let impactScore = Math.min(100, Math.max(5, Math.round(score)));

    let riskLevel = 'LOW';
    if (issuesCount.critical > 0 || impactScore >= 76) {
      riskLevel = 'CRITICAL';
      impactScore = Math.max(76, impactScore);
    } else if (issuesCount.high > 0 || impactScore >= 51) {
      riskLevel = 'HIGH';
      impactScore = Math.max(51, impactScore);
    } else if (impactScore >= 26) {
      riskLevel = 'MEDIUM';
    }

    return {
      filename,
      riskLevel,
      impactScore,
      additions: adds,
      deletions: dels,
      issuesCount,
      dependencies: depInfo.dependencies,
      dependents: depInfo.dependents,
      complexity,
      findingsCount: fileFindings.length
    };
  });

  // 2. Determine Recommended Review Order
  const sorted = [...fileImpacts].sort((a, b) => {
    if (b.issuesCount.critical !== a.issuesCount.critical) {
      return b.issuesCount.critical - a.issuesCount.critical;
    }
    if (b.impactScore !== a.impactScore) {
      return b.impactScore - a.impactScore;
    }
    return b.dependents.length - a.dependents.length;
  });

  const priorityLabels = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH'];

  const recommendedReviewOrder = sorted.map((file, idx) => {
    const priority = priorityLabels[idx] || `${idx + 1}TH`;
    
    let reason = '';
    if (file.issuesCount.critical > 0) {
      reason = `Contains ${file.issuesCount.critical} critical security findings that require immediate validation before dependent files.`;
    } else if (file.riskLevel === 'CRITICAL' || file.riskLevel === 'HIGH') {
      if (file.dependents.length > 0) {
        reason = `High impact core service with ${file.dependents.length} dependent module(s) relying on its interface.`;
      } else {
        reason = `Significant risk profile with ${file.impactScore}/100 impact score and ${file.findingsCount} issue(s).`;
      }
    } else if (file.dependencies.length > 0) {
      reason = `Moderate impact module integrating ${file.dependencies.length} external dependency links.`;
    } else {
      reason = `Low-risk self-contained module with minimal downstream blast radius.`;
    }

    return {
      rank: idx + 1,
      filename: file.filename,
      riskLevel: file.riskLevel,
      priority,
      reason
    };
  });

  // Assign priority labels back to fileImpacts
  fileImpacts.forEach(fi => {
    const match = recommendedReviewOrder.find(r => r.filename === fi.filename);
    if (match) {
      fi.reviewPriority = match.priority;
      fi.priorityRank = match.rank;
      fi.priorityReason = match.reason;
    }
  });

  // 3. Construct Dependency Graph (Nodes and Edges)
  const nodes = [];
  const edges = [];
  const registeredNodeIds = new Set();

  fileImpacts.forEach(fi => {
    registeredNodeIds.add(fi.filename);
    nodes.push({
      id: fi.filename,
      label: fi.filename.split('/').pop(),
      riskLevel: fi.riskLevel,
      impactScore: fi.impactScore,
      isChanged: true,
      additions: fi.additions,
      deletions: fi.deletions,
      issuesCount: fi.findingsCount
    });
  });

  // Add edges and any referenced external dependency nodes
  fileImpacts.forEach(fi => {
    fi.dependencies.forEach(dep => {
      if (!registeredNodeIds.has(dep)) {
        registeredNodeIds.add(dep);
        nodes.push({
          id: dep,
          label: dep.split('/').pop(),
          riskLevel: 'LOW',
          impactScore: 15,
          isChanged: false,
          additions: 0,
          deletions: 0,
          issuesCount: 0
        });
      }

      edges.push({
        from: fi.filename,
        to: dep,
        label: 'imports'
      });
    });
  });

  // Overall Impact Score & Level for the whole change
  const nonZeroImpacts = fileImpacts.filter(f => f.impactScore > 0);
  let overallImpactScore = 0;
  if (nonZeroImpacts.length > 0) {
    const avgImpact = fileImpacts.reduce((acc, f) => acc + f.impactScore, 0) / fileImpacts.length;
    const maxImpact = Math.max(...fileImpacts.map(f => f.impactScore), 0);
    overallImpactScore = Math.min(100, Math.round((maxImpact * 0.6) + (avgImpact * 0.4)));
  }

  let overallRiskLevel = 'LOW';
  if (overallImpactScore >= 76) overallRiskLevel = 'CRITICAL';
  else if (overallImpactScore >= 51) overallRiskLevel = 'HIGH';
  else if (overallImpactScore >= 26) overallRiskLevel = 'MEDIUM';

  return {
    score: overallImpactScore,
    riskLevel: overallRiskLevel,
    files: fileImpacts,
    dependencyGraph: {
      nodes,
      edges
    },
    recommendedReviewOrder
  };
}

module.exports = {
  estimateComplexity,
  extractFileDependencies,
  calculateChangeRisk,
  calculateImpactRadar
};
