const PDFDocument = require('pdfkit');
const path = require('path');

/**
 * Generates a clean PDF document for a Code Review session and writes it to a response stream
 */
const generatePDFReport = (review, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Pipe to response
  doc.pipe(res);

  // --- Title Header ---
  doc.fillColor('#0d1117').rect(0, 0, 600, 100).fill();
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('CodeLens Review Report', 50, 30);
  
  doc.fillColor('#8b949e')
     .font('Helvetica')
     .fontSize(10)
     .text(`Generated on: ${new Date(review.createdAt).toLocaleDateString()}`, 50, 65)
     .text(`Language: ${review.language.toUpperCase()}  |  Source: ${review.sourceType.toUpperCase()}`, 350, 65);

  doc.moveDown(4);

  // --- Summary Scorecard ---
  doc.fillColor('#161b22')
     .rect(50, 120, 500, 80)
     .fill();

  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text('Review Scorecard', 70, 130);

  doc.fillColor('#e6edf3')
     .font('Helvetica')
     .fontSize(10)
     .text(`Overall Score: ${review.metrics.overallScore}/100`, 70, 160)
     .text(`Bugs: ${review.metrics.bugs}/100`, 200, 160)
     .text(`Security: ${review.metrics.security}/100`, 300, 160)
     .text(`Performance: ${review.metrics.performance}/100`, 400, 160)
     .text(`Style: ${review.metrics.style}/100`, 500, 160);

  doc.moveDown(6);

  // --- Findings Title ---
  doc.fillColor('#333333')
     .font('Helvetica-Bold')
     .fontSize(16)
     .text(`Findings & Issues (${review.findings.length})`, 50, 220);

  doc.moveDown();

  let currentY = 240;

  review.findings.forEach((finding, idx) => {
    // Check page boundaries
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }

    const severityColors = {
      critical: '#f85149',
      high: '#d29922',
      medium: '#bc8cff',
      low: '#58a6ff'
    };

    // Draw box for finding
    const boxHeight = 100;
    doc.fillColor('#f6f8fa')
       .rect(50, currentY, 500, boxHeight)
       .fill();

    // Draw severity marker
    doc.fillColor(severityColors[finding.severity] || '#58a6ff')
       .rect(50, currentY, 5, boxHeight)
       .fill();

    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(`[${finding.category.toUpperCase()}] Severity: ${finding.severity.toUpperCase()} (Lines ${finding.lineStart}-${finding.lineEnd})`, 70, currentY + 10);

    doc.font('Helvetica')
       .fontSize(9)
       .text(`Issue: ${finding.message}`, 70, currentY + 30, { width: 460 });

    doc.font('Helvetica-Oblique')
       .text(`Suggestion: ${finding.suggestion}`, 70, currentY + 65, { width: 460 });

    currentY += boxHeight + 15;
  });

  // --- Add Page for Code Diff ---
  doc.addPage();
  doc.fillColor('#333333')
     .font('Helvetica-Bold')
     .fontSize(16)
     .text('Optimized Code Preview', 50, 50);

  doc.moveDown();

  // Draw code block
  doc.fillColor('#0d1117')
     .rect(50, 80, 500, 680)
     .fill();

  doc.fillColor('#a6acb9')
     .font('Courier')
     .fontSize(7.5)
     .text(review.optimizedCode || review.originalCode, 60, 95, {
       width: 480,
       height: 650,
       ellipsis: '... (truncated)'
     });

  // Complete doc
  doc.end();
};

/**
 * Generates an analysis report formatted in Markdown syntax
 */
const generateMarkdownReport = (review) => {
  const severityEmojis = {
    critical: '🔴 CRITICAL',
    high: '🔶 HIGH',
    medium: '🟡 MEDIUM',
    low: '🔵 LOW'
  };

  const categoryEmojis = {
    bug: '🐛 Bug',
    security: '🛡️ Security',
    performance: '⚡ Performance',
    style: '🎨 Style'
  };

  let md = `# CodeLens Code Review Report: ${review.title}
Generated on: ${new Date(review.createdAt).toLocaleDateString()}
Language: \`${review.language}\`
Overall Quality Score: **${review.metrics.overallScore}/100**

---

## 📊 Summary Scorecard
| Metric | Score |
| :--- | :--- |
| **Bugs** | ${review.metrics.bugs}/100 |
| **Security** | ${review.metrics.security}/100 |
| **Performance** | ${review.metrics.performance}/100 |
| **Style** | ${review.metrics.style}/100 |
| **Overall Score** | **${review.metrics.overallScore}/100** |

---

## 🔍 Findings & Recommendations (${review.findings.length} issues)

`;

  review.findings.forEach((finding, idx) => {
    md += `### ${idx + 1}. [${categoryEmojis[finding.category] || finding.category}] Line ${finding.lineStart}-${finding.lineEnd}
- **Severity**: ${severityEmojis[finding.severity] || finding.severity}
- **Message**: ${finding.message}
- **Recommendation**: ${finding.suggestion}

\`\`\`${review.language}
// Fix code proposal
${finding.fixCode || '// No direct fix code snippet available'}
\`\`\`

`;
  });

  md += `---

## 💡 Optimized Code
Below is the full version of the code with recommendations applied:

\`\`\`${review.language}
${review.optimizedCode || review.originalCode}
\`\`\`
`;

  return md;
};

module.exports = {
  generatePDFReport,
  generateMarkdownReport
};
