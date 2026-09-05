/**
 * LinguaBridge - Centralized Language Configuration & Registry
 * Single authoritative source of truth for speech recognition locales,
 * translation source/target codes, TTS locales, and sample phrases.
 */

const LANGUAGE_REGISTRY = {
  "ja-JP": {
    name: "Japanese (日本語)",
    speechCode: "ja-JP",
    translationSourceCode: "ja",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "ありがとうございます",
    sampleTranslation: "Thank you very much."
  },
  "fr-FR": {
    name: "French (Français)",
    speechCode: "fr-FR",
    translationSourceCode: "fr",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Comment allez-vous ?",
    sampleTranslation: "How are you?"
  },
  "es-ES": {
    name: "Spanish (Español)",
    speechCode: "es-ES",
    translationSourceCode: "es",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Hola, ¿cómo estás?",
    sampleTranslation: "Hello, how are you?"
  },
  "de-DE": {
    name: "German (Deutsch)",
    speechCode: "de-DE",
    translationSourceCode: "de",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Guten Tag, wie geht es Ihnen?",
    sampleTranslation: "Good day, how are you?"
  },
  "hi-IN": {
    name: "Hindi (हिंदी)",
    speechCode: "hi-IN",
    translationSourceCode: "hi",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "नमस्ते, आप कैसे हैं?",
    sampleTranslation: "Hello, how are you?"
  },
  "zh-CN": {
    name: "Chinese Mandarin (中文)",
    speechCode: "zh-CN",
    translationSourceCode: "zh",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "你好，很高兴认识你",
    sampleTranslation: "Hello, nice to meet you."
  },
  "it-IT": {
    name: "Italian (Italiano)",
    speechCode: "it-IT",
    translationSourceCode: "it",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Ciao, come stai?",
    sampleTranslation: "Hello, how are you?"
  },
  "pt-BR": {
    name: "Portuguese (Português)",
    speechCode: "pt-BR",
    translationSourceCode: "pt",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Olá, como você está?",
    sampleTranslation: "Hello, how are you?"
  },
  "ru-RU": {
    name: "Russian (Русский)",
    speechCode: "ru-RU",
    translationSourceCode: "ru",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Здравствуйте, как ваши дела?",
    sampleTranslation: "Hello, how are you?"
  },
  "ar-SA": {
    name: "Arabic (العربية)",
    speechCode: "ar-SA",
    translationSourceCode: "ar",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "مرحبا، كيف حالك؟",
    sampleTranslation: "Hello, how are you?"
  },
  "ko-KR": {
    name: "Korean (한국어)",
    speechCode: "ko-KR",
    translationSourceCode: "ko",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "안녕하세요, 만나서 반갑습니다",
    sampleTranslation: "Hello, nice to meet you."
  },
  "ta-IN": {
    name: "Tamil (தமிழ்)",
    speechCode: "ta-IN",
    translationSourceCode: "ta",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?",
    sampleTranslation: "Hello, how are you?"
  },
  "te-IN": {
    name: "Telugu (తెలుగు)",
    speechCode: "te-IN",
    translationSourceCode: "te",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "నమస్కారం, మీరు ఎలా ఉన్నారు?",
    sampleTranslation: "Hello, how are you?"
  },
  "bn-IN": {
    name: "Bengali (বাংলা)",
    speechCode: "bn-IN",
    translationSourceCode: "bn",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "হ্যালো, আপনি কেমন আছেন?",
    sampleTranslation: "Hello, how are you?"
  },
  "mr-IN": {
    name: "Marathi (मराठी)",
    speechCode: "mr-IN",
    translationSourceCode: "mr",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "नमस्कार, तुम्ही कसे आहात?",
    sampleTranslation: "Hello, how are you?"
  },
  "gu-IN": {
    name: "Gujarati (ગુજરાતી)",
    speechCode: "gu-IN",
    translationSourceCode: "gu",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "નમસ્તે, તમે કેમ છો?",
    sampleTranslation: "Hello, how are you?"
  },
  "tr-TR": {
    name: "Turkish (Türkçe)",
    speechCode: "tr-TR",
    translationSourceCode: "tr",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Merhaba, nasılsınız?",
    sampleTranslation: "Hello, how are you?"
  },
  "nl-NL": {
    name: "Dutch (Nederlands)",
    speechCode: "nl-NL",
    translationSourceCode: "nl",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Hallo, hoe gaat het met u?",
    sampleTranslation: "Hello, how are you?"
  },
  "pl-PL": {
    name: "Polish (Polski)",
    speechCode: "pl-PL",
    translationSourceCode: "pl",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Cześć, jak się masz?",
    sampleTranslation: "Hello, how are you?"
  },
  "vi-VN": {
    name: "Vietnamese (Tiếng Việt)",
    speechCode: "vi-VN",
    translationSourceCode: "vi",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Xin chào, bạn khỏe không?",
    sampleTranslation: "Hello, how are you?"
  },
  "en-US": {
    name: "English (Direct Speech Test)",
    speechCode: "en-US",
    translationSourceCode: "en",
    translationTargetCode: "en",
    ttsCode: "en-US",
    samplePhrase: "Where is the nearest hospital?",
    sampleTranslation: "Where is the nearest hospital?"
  }
};

/**
 * Get configuration object for a specific language key or code
 */
function getLanguageConfig(codeKey) {
  if (LANGUAGE_REGISTRY[codeKey]) {
    return LANGUAGE_REGISTRY[codeKey];
  }
  
  // Try matching by speechCode or sourceCode
  for (const key in LANGUAGE_REGISTRY) {
    const config = LANGUAGE_REGISTRY[key];
    if (config.speechCode === codeKey || config.translationSourceCode === codeKey) {
      return config;
    }
  }

  // Fallback default
  return LANGUAGE_REGISTRY["en-US"];
}
