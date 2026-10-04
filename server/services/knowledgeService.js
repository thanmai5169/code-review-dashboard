const TeamKnowledgeBase = require('../models/TeamKnowledgeBase');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');

// Calculate keyword overlap similarity ratio (Jaccard-like index)
const getSimilarity = (str1, str2) => {
  const words1 = new Set((str1 || '').toLowerCase().match(/\w+/g) || []);
  const words2 = new Set((str2 || '').toLowerCase().match(/\w+/g) || []);
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  return intersection.size / Math.max(words1.size, words2.size, 1);
};

/**
 * Summarizes a recurring issue using Gemini to write it as a team guideline
 */
const generateWikiContent = async (message, userKey = null) => {
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      title: 'Guideline: Enforce code quality checks',
      description: `Verify findings similar to: ${message}. Keep code implementations clear.`
    };
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = `Summarize this recurring code issue for a team wiki in exactly 2 sentences:
"${message}"
Write it as a team guideline (what developers SHOULD do), not a warning. Do not use markdown syntax.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text.trim();
    // Split into title (first sentence or main clause) and description
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const title = sentences[0] ? `${sentences[0]}.` : 'Team Guideline';
    const description = text;

    return { title, description };
  } catch (error) {
    console.error('Error generating wiki content via Gemini:', error);
    return {
      title: 'Guideline: Resolve Code Pattern Issues',
      description: `Always refactor structures matching the pattern: ${message}`
    };
  }
};

/**
 * Core automation called after every saved review in a workspace
 */
const updateKnowledgeBase = async (workspaceId, review) => {
  try {
    if (!review.findings || review.findings.length === 0) return;

    // Fetch user Gemini Key if available
    const user = await User.findById(review.userId);
    const userApiKey = user?.apiKeys?.gemini || null;

    // Find or create workspace knowledge base document
    let kb = await TeamKnowledgeBase.findOne({ workspaceId });
    if (!kb) {
      kb = await TeamKnowledgeBase.create({
        workspaceId,
        entries: []
      });
    }

    for (const finding of review.findings) {
      let matchedEntry = null;

      // Find matching entry by category & message similarity
      for (const entry of kb.entries) {
        if (entry.category === finding.category) {
          const sim = getSimilarity(entry.description, finding.message);
          if (sim > 0.3) {
            matchedEntry = entry;
            break;
          }
        }
      }

      if (matchedEntry) {
        // Increment occurrence
        matchedEntry.occurrenceCount += 1;
        
        if (!matchedEntry.contributingReviews.includes(review._id)) {
          matchedEntry.contributingReviews.push(review._id);
        }

        // If occurrence reaches 3, synthesize proper guidelines using Gemini
        if (matchedEntry.occurrenceCount === 3) {
          const wiki = await generateWikiContent(finding.message, userApiKey);
          matchedEntry.title = wiki.title;
          matchedEntry.description = wiki.description;
          if (finding.fixCode) {
            matchedEntry.codeExample = finding.fixCode;
          }
        }

        // Auto-pin entries with occurrenceCount >= 5
        if (matchedEntry.occurrenceCount >= 5) {
          matchedEntry.isPinned = true;
        }
      } else {
        // Create draft entry with occurrenceCount = 1
        const draftTitle = `Guideline Draft: ${finding.message.slice(0, 40)}...`;
        kb.entries.push({
          category: finding.category,
          title: draftTitle,
          description: finding.message,
          codeExample: finding.fixCode || '',
          occurrenceCount: 1,
          contributingReviews: [review._id],
          isPinned: false,
          createdAt: new Date()
        });
      }
    }

    await kb.save();
  } catch (error) {
    console.error('Error updating knowledge base:', error);
  }
};

module.exports = {
  updateKnowledgeBase
};
