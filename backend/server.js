const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'LinguaBridge – AI-Powered Speech-to-English Voice Translator',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Translation API Endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'en' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request: "text" field is required and cannot be empty.'
      });
    }

    const trimmedText = text.trim();

    // Check if user has configured OpenAI Key in environment
    if (process.env.OPENAI_API_KEY) {
      try {
        const translatedText = await translateWithOpenAI(trimmedText, sourceLang, targetLang);
        return res.json({
          success: true,
          originalText: trimmedText,
          translatedText,
          provider: 'OpenAI GPT (Configured Key)',
          sourceLang,
          targetLang
        });
      } catch (err) {
        console.warn('OpenAI translation failed, falling back to public translation provider:', err.message);
      }
    }

    // Default robust fallback translation using MyMemory / Free Translation API
    const translatedText = await translateWithFreeProvider(trimmedText, sourceLang, targetLang);

    return res.json({
      success: true,
      originalText: trimmedText,
      translatedText,
      provider: 'LinguaBridge Free AI Translation Pipeline',
      sourceLang,
      targetLang
    });

  } catch (error) {
    console.error('Translation Endpoint Error:', error);
    return res.status(500).json({
      error: 'Translation processing failed. Please try again or check network connection.',
      details: error.message
    });
  }
});

/**
 * Free translation provider using MyMemory API with automated fallback
 */
async function translateWithFreeProvider(text, sourceLang, targetLang) {
  // Normalize source language code format (e.g. 'es-ES' -> 'es', 'hi-IN' -> 'hi')
  const cleanSourceCode = sourceLang.split('-')[0].toLowerCase();
  const cleanTargetCode = targetLang.split('-')[0].toLowerCase();

  // If source and target language are the same, return text
  if (cleanSourceCode === cleanTargetCode) {
    return text;
  }

  const langPair = `${cleanSourceCode}|${cleanTargetCode}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

  try {
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();

    if (data && data.responseData && data.responseData.translatedText) {
      let resultText = data.responseData.translatedText;
      // Filter out MyMemory error strings if quota reached on specific pairs
      if (resultText && !resultText.startsWith('QUERY LENGTH LIMIT EXCEEDED') && !resultText.startsWith('MYMEMORY WARNING')) {
        return resultText;
      }
    }

    // Secondary fallback: LibreTranslate public API mirror
    const fallbackResult = await translateWithLibreTranslate(text, cleanSourceCode, cleanTargetCode);
    if (fallbackResult) {
      return fallbackResult;
    }

    // Ultimate fallback if remote service is unavailable: Return clean input text
    return text;
  } catch (err) {
    console.warn('MyMemory fetch failed:', err.message);
    // Try secondary LibreTranslate mirror
    try {
      const fallbackResult = await translateWithLibreTranslate(text, cleanSourceCode, cleanTargetCode);
      if (fallbackResult) return fallbackResult;
    } catch (e) {
      console.warn('Secondary fallback failed:', e.message);
    }
    return text;
  }
}

/**
 * Secondary LibreTranslate public mirror helper
 */
async function translateWithLibreTranslate(text, source, target) {
  const mirrors = [
    'https://translate.argosopentech.com/translate',
    'https://libretranslate.de/translate'
  ];

  for (const mirrorUrl of mirrors) {
    try {
      const response = await fetch(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: source,
          target: target,
          format: 'text'
        }),
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          return data.translatedText;
        }
      }
    } catch (e) {
      // Continue to next mirror
    }
  }
  return null;
}

/**
 * OpenAI API Translator integration
 */
async function translateWithOpenAI(text, sourceLang, targetLang) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional language translator. Translate the given text accurately from language "${sourceLang}" into clear, natural English (${targetLang}). Output ONLY the translated text without commentary or quotation marks.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Fallback route for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 LinguaBridge Server active on http://localhost:${PORT}`);
  console.log(`   Pipeline: Native Speech -> Speech Recognition -> NLP -> AI Translation -> English Voice`);
  console.log(`====================================================`);
});
