const { GoogleGenAI } = require('@google/genai');

/**
 * Initializes and returns a GoogleGenAI client.
 * Uses the user-supplied key first, then falls back to the system env key.
 *
 * @param {string|null} userKey - Optional per-user Gemini API key
 * @returns {GoogleGenAI|null}
 */
const initGemini = (userKey) => {
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in environment or user profile.');
    return null;
  }
  // @google/genai SDK — initialize with { apiKey }
  return new GoogleGenAI({ apiKey });
};

module.exports = { initGemini };
