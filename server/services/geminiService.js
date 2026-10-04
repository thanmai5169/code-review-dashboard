const { initGemini } = require('../config/gemini');

// Model to use across all Gemini calls
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Clean model output by stripping markdown block wrappers (e.g. ```json ... ```)
 */
const cleanJsonResponse = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
};

/**
 * Builds the prompt template for the code review scan
 */
const buildReviewPrompt = (code, language, customRules = [], explanationLevel = 'mid', intentStatement = '', fileName = 'main') => {
  let intentSnippet = '';
  if (intentStatement) {
    intentSnippet = `
CRITICAL INSTRUCTION:
The developer's stated intent for this code is:
'${intentStatement}'
Evaluate whether the code achieves this intent.
Add finding(s) with category 'intent_mismatch' and severity 'critical' or 'high' if the code does NOT achieve the stated goal.
`;
  }

  let levelInstruction = '';
  if (explanationLevel === 'junior') {
    levelInstruction = `For the message, whyItMatters, and suggestion fields: Explain in clear, friendly educational language. Link to standard best-practice patterns. Assume the developer is learning.`;
  } else if (explanationLevel === 'senior') {
    levelInstruction = `For the message, whyItMatters, and suggestion fields: Be extremely concise and technical. Issue + rationale + fix directly.`;
  } else {
    levelInstruction = `For the message, whyItMatters, and suggestion fields: Standard industry code review style. Clear rationale on why it matters and actionable fix.`;
  }

  return `
You are an expert ${language} code reviewer for an enterprise engineering team. 
Analyze the following code and return ONLY a valid JSON object with no markdown, no conversational text, just raw JSON.

JSON structure:
{
  "findings": [
    {
      "file": "<filename or 'main'>",
      "lineStart": <number>,
      "lineEnd": <number>,
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": "bug" | "security" | "performance" | "style" | "maintainability" | "intent_mismatch",
      "message": "<what the issue is>",
      "whyItMatters": "<impact on security, reliability, latency, or maintainability>",
      "suggestion": "<actionable fix description>",
      "fixCode": "<the corrected replacement code snippet for this specific line range>"
    }
  ],
  "optimizedCode": "<entire code rewritten with all fixes applied>",
  "metrics": {
    "bugs": <0-100 score where 100 is bug-free>,
    "security": <0-100 score where 100 is secure>,
    "performance": <0-100 score where 100 is high performance>,
    "style": <0-100 score where 100 is idiomatic>,
    "maintainability": <0-100 score where 100 is highly maintainable>,
    "overallScore": <0-100 weighted quality score>
  },
  "summary": "<2-3 sentence executive assessment summarizing risks, overall quality, and recommended priorities>"
}

${intentSnippet}

Tone and Explanation Directive:
${levelInstruction}

Audit Categories:
1. BUGS: null/undefined dereferences, off-by-one, unhandled exceptions, race conditions, edge cases
2. SECURITY: injection (SQL/NoSQL/Command), XSS, secret leaks, SSRF, broken auth, insecure crypto
3. PERFORMANCE: O(n²) bottlenecks, unindexed queries, blocking I/O, memory leaks, redundant work
4. MAINTAINABILITY: high cyclomatic complexity, tight coupling, dead code, poor modularity
5. STYLE: naming conventions, formatting, idiomatic patterns

${customRules.length > 0 ? 'Workspace-Specific Rules to Enforce:\n' + customRules.join('\n') : ''}

Code to review (${language}, target file: ${fileName}):
\`\`\`${language}
${code}
\`\`\`
`;
};

/**
 * Calls Gemini to analyze the code.
 * Uses @google/genai SDK: client.models.generateContent()
 */
const analyzeCode = async (code, language, customRules = [], userKey = null, explanationLevel = 'mid', intentStatement = '', fileName = 'main') => {
  const client = initGemini(userKey);
  if (!client) {
    throw new Error('Gemini API client is not initialized. Key is missing.');
  }

  const prompt = buildReviewPrompt(code, language, customRules, explanationLevel, intentStatement, fileName);

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = result.text;
    const cleanedText = cleanJsonResponse(text);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Gemini API execution error, attempting fallback text generation:', error);
    try {
      const resultFallback = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });

      const textFallback = resultFallback.text;
      const cleaned = cleanJsonResponse(textFallback);
      return JSON.parse(cleaned);
    } catch (fallbackError) {
      console.error('Gemini fallback scan failed:', fallbackError);
      throw new Error(`AI scan failed: ${fallbackError.message}`);
    }
  }
};

/**
 * Handles the follow-up chat conversation with streaming response.
 * Uses @google/genai SDK: client.models.generateContentStream()
 */
const streamFollowUpChat = async (review, newQuestion, onChunk, onDone, onError, userKey = null) => {
  const client = initGemini(userKey);
  if (!client) {
    return onError(new Error('Gemini API client is not initialized. Key is missing.'));
  }

  const systemPrompt = `You are CodeLens, an enterprise AI code reviewer.
The code under review (${review.language}):
\`\`\`
${review.originalCode}
\`\`\`

The scan findings are:
${JSON.stringify(review.findings, null, 2)}

The overall code metrics are:
${JSON.stringify(review.metrics, null, 2)}

The risk analysis is:
${JSON.stringify(review.riskAnalysis, null, 2)}

Provide helpful, technical answers to the user's questions about this code review. Limit code blocks to target parts of suggestions.`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready to answer questions about this code review.' }] },
    ...review.chatHistory.map((chat) => ({
      role: chat.role === 'model' ? 'model' : 'user',
      parts: [{ text: chat.content }]
    })),
    { role: 'user', parts: [{ text: newQuestion }] }
  ];

  try {
    const stream = await client.models.generateContentStream({
      model: GEMINI_MODEL,
      contents
    });

    let completeText = '';
    for await (const chunk of stream) {
      const textChunk = chunk.text ?? '';
      completeText += textChunk;
      if (textChunk) onChunk(textChunk);
    }

    onDone(completeText);
  } catch (error) {
    console.error('Gemini Chat Stream Error:', error);
    onError(error);
  }
};

/**
 * Generate unit tests for a code snippet based on its findings
 */
const generateTests = async (code, language, findings = [], userKey = null) => {
  const client = initGemini(userKey);
  if (!client) {
    throw new Error('Gemini API client is not initialized. Key is missing.');
  }

  let framework = 'Jest';
  const langLower = (language || '').toLowerCase();
  if (langLower.includes('python')) framework = 'pytest';
  else if (langLower.includes('java')) framework = 'JUnit';
  else if (langLower.includes('go')) framework = 'go test';
  else if (langLower.includes('cpp') || langLower.includes('c++')) framework = 'Google Test';
  else if (langLower.includes('csharp') || langLower.includes('c#')) framework = 'NUnit';

  const prompt = `
Generate production-ready unit tests for the following ${language} code.
Use the ${framework} framework.
Cover: happy paths, edge cases, error handling, and test for the following detected findings:
${findings.map((f, i) => `${i + 1}. ${f.message} (lines ${f.lineStart}-${f.lineEnd})`).join('\n') || 'none'}

Return ONLY the test code, no explanation, no markdown fences. Do NOT wrap it in \`\`\`${language} ... \`\`\`.

Code:
${code}
`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    return result.text;
  } catch (error) {
    console.error('Error generating tests:', error);
    throw error;
  }
};

/**
 * Translate comments and strings not in the target language and suggest variable renames
 */
const translateComments = async (code, targetLanguage = 'english', userKey = null) => {
  const client = initGemini(userKey);
  if (!client) {
    throw new Error('Gemini API client is not initialized. Key is missing.');
  }

  const prompt = `
Analyze this code. Find all comments and string literals that are NOT in ${targetLanguage}.
Return a valid JSON object matching the schema below. No markdown wrappers, no explanations.

Schema:
{
  "detectedLanguages": ["Spanish", "Hindi"],
  "translations": [
    { "original": "# ordenar usuarios", "line": 12, "translated": "# sort users" }
  ],
  "renamedVariables": [
    { "original": "usuarioActivo", "line": 8, "suggested": "activeUser" }
  ],
  "translatedCode": "<entire code with all translations applied to comments, string literals, and suggested variables renamed>"
}

Code:
${code}
`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const cleanedText = cleanJsonResponse(result.text);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Error translating comments:', error);
    return {
      detectedLanguages: [],
      translations: [],
      renamedVariables: [],
      translatedCode: code
    };
  }
};

/**
 * Quick risk assessment of code for pre-commit hooks
 */
const quickRiskAssessment = async (code, language = 'javascript', userKey = null) => {
  const client = initGemini(userKey);
  if (!client) {
    throw new Error('Gemini API client is not initialized. Key is missing.');
  }

  const prompt = `
Quick risk assessment of this ${language} code. Check for syntax issues, security vulnerabilities, or major performance bugs.
Return ONLY a valid JSON object. No markdown, no explanations, max 200 tokens.

Schema:
{
  "riskScore": 0-100,
  "blockCommit": boolean (true if riskScore > 70),
  "criticalCount": number,
  "topIssue": { "line": number, "message": "string" } or null,
  "estimatedReviewTime": "<30s|1min|2min+>"
}

Code:
${code}
`;

  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 200
      }
    });

    const cleanedText = cleanJsonResponse(result.text);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Error in quick risk assessment:', error);
    return {
      riskScore: 30,
      blockCommit: false,
      criticalCount: 0,
      topIssue: null,
      estimatedReviewTime: '<30s'
    };
  }
};

module.exports = {
  analyzeCode,
  streamFollowUpChat,
  generateTests,
  translateComments,
  quickRiskAssessment
};
