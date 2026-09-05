/**
 * LinguaBridge - AI Machine Translation Module with English Output Validation
 * Interfaces with Python Flask backend /api/translate with client-side fallback & strict validation guard.
 */
class AITranslator {
  constructor() {
    this.apiEndpoint = '/api/translate';
  }

  /**
   * Translate text into English
   * @param {string} text - Native language text to translate
   * @param {string} sourceLangKey - Language registry key (e.g. 'ja-JP', 'fr-FR', 'hi-IN')
   * @returns {Promise<Object>} Translation result
   */
  async translate(text, sourceLangKey = 'es-ES') {
    if (!text || !text.trim()) {
      return { success: false, error: 'Empty text provided' };
    }

    const trimmed = text.trim();
    const config = getLanguageConfig(sourceLangKey);

    // 1. Direct Pass-through for English Input
    if (config.translationSourceCode === 'en') {
      return {
        success: true,
        translatedText: trimmed,
        provider: 'English Direct Pass-through',
        nlpMetadata: {
          original_text: trimmed,
          cleaned_text: trimmed,
          token_count: trimmed.split(/\s+/).length,
          was_modified: false,
          rules_applied: ['English direct pass-through'],
          intent: trimmed.endsWith('?') ? 'Question / Query' : 'General Statement'
        }
      };
    }

    // 2. Send request to Python Flask backend server
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: trimmed,
          sourceLang: config.translationSourceCode,
          targetLang: 'en'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.translatedText) {
          if (this.isValidEnglishOutput(data.translatedText, config.translationSourceCode)) {
            return {
              success: true,
              translatedText: data.translatedText,
              provider: data.provider || 'AI Machine Translation Service',
              nlpMetadata: data.nlpMetadata || null
            };
          }
        }
      }
    } catch (err) {
      console.warn('Backend translation service unreachable, attempting client-side fallback:', err.message);
    }

    // 3. Client-side fallback API if online
    if (navigator.onLine) {
      const clientFallback = await this.fallbackDirectClientTranslate(trimmed, config.translationSourceCode);
      if (clientFallback.success && this.isValidEnglishOutput(clientFallback.translatedText, config.translationSourceCode)) {
        return clientFallback;
      }
    }

    // 4. Client-side phrasebook lookup for common offline samples
    if (config.samplePhrase && (trimmed.toLowerCase().includes(config.samplePhrase.toLowerCase()) || config.samplePhrase.toLowerCase().includes(trimmed.toLowerCase()))) {
      return {
        success: true,
        translatedText: config.sampleTranslation,
        provider: 'Phrasebook Match'
      };
    }

    return {
      success: false,
      error: 'Translation engine could not produce a valid English translation. Please check phrase input.'
    };
  }

  /**
   * Client-side fallback translation via Google GTX or MyMemory API
   */
  async fallbackDirectClientTranslate(text, sourceCode) {
    // Try Google GTX endpoint first
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceCode)}&tl=en&dt=t&q=${encodeURIComponent(text)}`;
      const gtxRes = await fetch(gtxUrl);
      if (gtxRes.ok) {
        const data = await gtxRes.json();
        if (Array.isArray(data) && data[0]) {
          const translated = data[0].map(item => item[0]).join('').trim();
          if (translated) {
            return {
              success: true,
              translatedText: translated,
              provider: 'Direct Client Google GTX Translation'
            };
          }
        }
      }
    } catch (e) {
      console.warn('Client Google GTX fallback failed:', e);
    }

    // Try MyMemory endpoint
    const langPair = `${sourceCode}|en`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const translated = data.responseData.translatedText;
          if (!translated.startsWith('QUERY LENGTH LIMIT') && !translated.startsWith('MYMEMORY WARNING')) {
            return {
              success: true,
              translatedText: translated,
              provider: 'Direct Client Fallback Translation'
            };
          }
        }
      }
    } catch (err) {
      console.error('Client MyMemory fallback failed:', err);
    }

    return { success: false };
  }

  /**
   * Validation Guard: Ensures translation output is valid English
   */
  isValidEnglishOutput(text, sourceCode) {
    if (!text || typeof text !== 'string' || !text.trim()) return false;

    const cleaned = text.trim();

    // Reject MyMemory warnings/quota headers
    if (cleaned.includes('MYMEMORY WARNING') || cleaned.includes('QUERY LENGTH LIMIT')) {
      return false;
    }

    // Reject non-English scripts (Japanese, Devanagari, Cyrillic, Arabic, Chinese, Korean, Tamil, Telugu, Bengali, Gujarati, Marathi)
    const nonEnglishScriptPattern = /[\u3040-\u30FF\u4E00-\u9FFF\u3000-\u303F\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0600-\u06FF\u0400-\u04FF\uAC00-\uD7AF\u0980-\u09FF\u0A80-\u0AFF]/;
    if (nonEnglishScriptPattern.test(cleaned)) {
      return false;
    }

    const nonEnglishRomanized = ['salamat', 'arigatou', 'arigato', 'konnichiwa', 'sayounara', 'ohayou', 'namaste', 'dhanyavaad', 'shukriya', 'bonjour', 'merci', 'au revoir', 'hola', 'gracias', 'adios', 'guten tag', 'danke', 'auf wiedersehen'];
    const cleanSrc = (sourceCode || '').split('-')[0].toLowerCase();
    if (cleanSrc !== 'en') {
      const words = cleaned.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?]/g, ''));
      if (words.length <= 3 && words.some(w => nonEnglishRomanized.includes(w))) {
        return false;
      }
    }

    return true;
  }
}
