/**
 * LinguaBridge - Natural Language Processing (NLP) Processor Module
 * Cleans speech recognition artifacts, removes hesitation tokens, normalizes sentence syntax.
 */
class NLPProcessor {
  constructor() {
    // List of common speech hesitation filler words across major languages
    this.fillerWords = [
      /\b(um|uh|err|erm|hmm|aaa|aaaa|eee|ooo|like|you know|i mean)\b/gi,
      /\b(este|eh|ehm|o sea|bueno)\b/gi, // Spanish fillers
      /\b(euh|bah|ben|hein|du coup)\b/gi, // French fillers
      /\b(äh|ähm|halt|sozusagen)\b/gi, // German fillers
      /\b(uhm|मतलब|अह|उम)\b/gi // Hindi fillers
    ];
  }

  /**
   * Process and clean native recognized text before sending to translation engine
   * @param {string} text - Raw speech recognition output
   * @returns {Object} Cleaned text result with metadata
   */
  process(text) {
    if (!text || typeof text !== 'string') {
      return {
        cleanedText: '',
        originalText: '',
        tokenCount: 0,
        cleaned: false
      };
    }

    let cleaned = text.trim();

    // 1. Remove hesitation filler words
    this.fillerWords.forEach(regex => {
      cleaned = cleaned.replace(regex, '');
    });

    // 2. Remove stuttered duplicate adjacent words (e.g., "the the", "yo yo")
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

    // 3. Normalize multiple whitespace characters
    cleaned = cleaned.replace(/\s+/g, ' ');

    // 4. Remove unneeded leading & trailing speech noise symbols
    cleaned = cleaned.replace(/^[\s,.?!:-]+/, '');
    cleaned = cleaned.replace(/[\s,;:.-]+$/, '');

    // 5. Ensure sentence capital letter formatting
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    // 6. Ensure sentence ending punctuation if missing
    if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    const tokenCount = cleaned.split(/\s+/).filter(Boolean).length;

    return {
      originalText: text,
      cleanedText: cleaned,
      tokenCount: tokenCount,
      wasModified: cleaned !== text
    };
  }
}
