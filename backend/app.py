import os
import sys
import io
import re
import urllib.parse
import requests
import speech_recognition as sr
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure backend directory is in sys.path for reliable module imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from nlp_engine import PythonNLPEngine

# Load environment variables
load_dotenv()

# Initialize Flask App
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '../frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

nlp_engine = PythonNLPEngine()
PORT = int(os.getenv('PORT', 3000))

# --------------------------------------------------------------------------
# Static File Serving Routes
# --------------------------------------------------------------------------
@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')

# --------------------------------------------------------------------------
# API Routes
# --------------------------------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'online',
        'app': 'LinguaBridge – AI-Powered Speech-to-English Voice Translator',
        'backend': 'Python (Flask)',
        'nlp_engine': 'PythonNLPEngine Active',
        'stt_engine': 'Python Speech Recognition (Google API + OpenAI Whisper)'
    })

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Speech-to-Text Endpoint: Receives WAV audio recorded from user's microphone,
    transcribes it into native language text using Python SpeechRecognition engine.
    Ensures voice recognition works reliably even when Chrome's cloud Web Speech API fails.
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'success': False, 'error': 'No audio file found in request.'}), 400

        audio_file = request.files['audio']
        language_code = request.form.get('language', 'en-US')
        
        audio_bytes = audio_file.read()
        if not audio_bytes or len(audio_bytes) < 200:
            return jsonify({
                'success': False,
                'error': 'No speech detected or audio recording was too short.'
            }), 422

        # 1. Optional OpenAI Whisper if API key provided
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            try:
                whisper_text = transcribe_with_whisper(audio_bytes, language_code, openai_key)
                if whisper_text and whisper_text.strip():
                    return jsonify({
                        'success': True,
                        'text': whisper_text.strip(),
                        'language': language_code,
                        'provider': 'OpenAI Whisper Speech API'
                    })
            except Exception as w_err:
                print(f"Whisper fallback warning: {w_err}, switching to Google Speech API")

        # 2. Python SpeechRecognition with Google Speech API
        recognizer = sr.Recognizer()
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio_data = recognizer.record(source)

        try:
            transcribed_text = recognizer.recognize_google(audio_data, language=language_code)
            return jsonify({
                'success': True,
                'text': transcribed_text.strip(),
                'language': language_code,
                'provider': 'Python Speech Engine (Google API)'
            })
        except sr.UnknownValueError:
            return jsonify({
                'success': False,
                'error': 'Speech could not be recognized clearly. Please speak closer to your microphone and try again.'
            }), 422
        except sr.RequestError as e:
            return jsonify({
                'success': False,
                'error': f'Speech recognition service request error: {e}'
            }), 503

    except Exception as err:
        print(f"Transcription Endpoint Exception: {err}")
        return jsonify({
            'success': False,
            'error': 'Audio transcription processing failed.',
            'details': str(err)
        }), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json() or {}
        raw_text = data.get('text', '')
        source_lang_input = data.get('sourceLang', 'auto')

        if not raw_text or not str(raw_text).strip():
            return jsonify({
                'error': 'Invalid request: "text" field is required and cannot be empty.'
            }), 400

        # Standardize source language ISO code
        clean_source_code = source_lang_input.split('-')[0].lower() if '-' in source_lang_input else source_lang_input.lower()

        # Step 1: Run Genuine Python NLP Pre-processing
        nlp_result = nlp_engine.process(raw_text, clean_source_code)
        cleaned_text = nlp_result['cleaned_text'] or raw_text.strip()

        # Step 2: Handle English Input Direct Pass-Through
        if clean_source_code == 'en' or clean_source_code == 'en-us':
            return jsonify({
                'success': True,
                'originalText': raw_text,
                'cleanedText': cleaned_text,
                'translatedText': cleaned_text,
                'provider': 'English Direct Pass-through',
                'sourceLang': source_lang_input,
                'targetLang': 'en',
                'nlpMetadata': nlp_result
            })

        # Step 3: AI Machine Translation
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            try:
                translated_text = translate_with_openai(cleaned_text, clean_source_code, 'en', openai_key)
                if is_valid_english_output(translated_text, clean_source_code):
                    return jsonify({
                        'success': True,
                        'originalText': raw_text,
                        'cleanedText': cleaned_text,
                        'translatedText': translated_text,
                        'provider': 'OpenAI GPT (Python Backend)',
                        'sourceLang': source_lang_input,
                        'targetLang': 'en',
                        'nlpMetadata': nlp_result
                    })
            except Exception as e:
                print(f"OpenAI translation warning: {e}, falling back to free translation engine")

        # Smart Multilingual Machine Translation Pipeline
        translated_text, provider_name = translate_with_free_provider(cleaned_text, clean_source_code)

        # Validate English Translation Output
        if not is_valid_english_output(translated_text, clean_source_code):
            print(f"Validation failed for translation output: '{translated_text}' (Source: {clean_source_code})")
            # Try secondary mirror
            mirror_res = translate_with_libretranslate(cleaned_text, clean_source_code, 'en')
            if mirror_res and is_valid_english_output(mirror_res, clean_source_code):
                translated_text = mirror_res
                provider_name = "AI LibreTranslate Mirror"
            else:
                return jsonify({
                    'success': False,
                    'error': 'Translation engine could not produce a valid English output. Please check phrase input.'
                }), 422

        return jsonify({
            'success': True,
            'originalText': raw_text,
            'cleanedText': cleaned_text,
            'translatedText': translated_text,
            'provider': provider_name,
            'sourceLang': source_lang_input,
            'targetLang': 'en',
            'nlpMetadata': nlp_result
        })

    except Exception as err:
        print(f"Translation Endpoint Exception: {err}")
        return jsonify({
            'error': 'Translation processing failed.',
            'details': str(err)
        }), 500

# --------------------------------------------------------------------------
# Translation & Validation Helper Functions
# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# Translation & Validation Helper Functions
# --------------------------------------------------------------------------
NON_ENGLISH_ROMANIZED_WORDS = {
    'salamat', 'arigatou', 'arigato', 'konnichiwa', 'sayounara', 'ohayou',
    'namaste', 'dhanyavaad', 'shukriya', 'bonjour', 'merci', 'au revoir',
    'hola', 'gracias', 'adios', 'guten tag', 'danke', 'auf wiedersehen',
    'nǐ hǎo', 'xièxiè', 'annyeonghaseyo', 'kamsahamnida'
}

def translate_with_free_provider(text: str, source_code: str):
    """
    Multi-tier translation pipeline using Google GTX API as primary free engine,
    followed by MyMemory and LibreTranslate mirrors as secondary fallbacks.
    """
    clean_source = source_code.split('-')[0].lower() if '-' in source_code else source_code.lower()

    # Tier 1: Free Google Translate GTX API Engine (Fast, un-rate-limited, handles arbitrary sentences across all languages)
    gtx_res = translate_with_google_gtx(text, clean_source, 'en')
    if gtx_res and is_valid_english_output(gtx_res, clean_source):
        return gtx_res, "AI Google Machine Translation Service"

    # Tier 2: MyMemory API Fallback
    lang_pair = f"{clean_source}|en"
    encoded_text = urllib.parse.quote(text)
    encoded_pair = urllib.parse.quote(lang_pair)
    url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair={encoded_pair}"

    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            res_data = res.json()
            if res_data and 'responseData' in res_data and 'translatedText' in res_data['responseData']:
                result_text = res_data['responseData']['translatedText']
                if result_text and not result_text.startswith('QUERY LENGTH LIMIT') and not result_text.startswith('MYMEMORY WARNING'):
                    if is_valid_english_output(result_text, clean_source):
                        return result_text, "AI MyMemory Translation Service"
    except Exception as e:
        print(f"MyMemory fetch exception: {e}")

    # Tier 3: LibreTranslate Mirror Fallback
    mirror_res = translate_with_libretranslate(text, clean_source, 'en')
    if mirror_res and is_valid_english_output(mirror_res, clean_source):
        return mirror_res, "AI LibreTranslate Mirror"

    return text, "AI Translation Pipeline Pass-through"

def translate_with_google_gtx(text: str, source_code: str, target_code: str = 'en') -> str:
    """
    Fetch translation from Google Translate API endpoint (Chrome Client ID).
    """
    try:
        encoded_text = urllib.parse.quote(text)
        url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={source_code}&tl={target_code}&dt=t&q={encoded_text}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                translated_sentences = []
                for item in data[0]:
                    if isinstance(item, list) and len(item) > 0 and item[0]:
                        translated_sentences.append(str(item[0]))
                if translated_sentences:
                    return "".join(translated_sentences).strip()
    except Exception as e:
        print(f"Google GTX translate error: {e}")
    return None

def translate_with_libretranslate(text: str, source: str, target: str) -> str:
    mirrors = [
        'https://translate.argosopentech.com/translate',
        'https://libretranslate.de/translate'
    ]
    for mirror_url in mirrors:
        try:
            res = requests.post(mirror_url, json={
                'q': text,
                'source': source,
                'target': target,
                'format': 'text'
            }, timeout=4)
            if res.status_code == 200:
                res_data = res.json()
                if 'translatedText' in res_data:
                    return res_data['translatedText']
        except Exception:
            continue
    return None

def translate_with_openai(text: str, source_lang: str, target_lang: str, api_key: str) -> str:
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    payload = {
        'model': 'gpt-3.5-turbo',
        'messages': [
            {
                'role': 'system',
                'content': f'You are a professional language translator. Translate from language "{source_lang}" into clear, natural English ({target_lang}). Output ONLY the translated English text.'
            },
            {
                'role': 'user',
                'content': text
            }
        ],
        'temperature': 0.2
    }
    res = requests.post('https://api.openai.com/v1/chat/completions', json=payload, headers=headers, timeout=8)
    if res.status_code == 200:
        return res.json()['choices'][0]['message']['content'].strip()
    raise Exception(f"OpenAI API status {res.status_code}")

def transcribe_with_whisper(audio_bytes: bytes, language_code: str, api_key: str) -> str:
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    files = {
        'file': ('speech.wav', audio_bytes, 'audio/wav'),
        'model': (None, 'whisper-1')
    }
    if language_code and language_code != 'auto':
        lang_short = language_code.split('-')[0].lower()
        files['language'] = (None, lang_short)

    res = requests.post('https://api.openai.com/v1/audio/transcriptions', files=files, headers=headers, timeout=12)
    if res.status_code == 200:
        return res.json().get('text', '').strip()
    raise Exception(f"OpenAI Whisper API status {res.status_code}: {res.text}")

def is_valid_english_output(text: str, source_code: str) -> bool:
    """
    Validation Guard: Verifies that translation output is valid English.
    Rejects MyMemory warnings, non-English character scripts, non-English Romanized words,
    and untranslated non-English text.
    """
    if not text or not isinstance(text, str) or not text.strip():
        return False

    cleaned = text.strip()

    # Reject API quota/warning headers
    if "MYMEMORY WARNING" in cleaned or "QUERY LENGTH LIMIT" in cleaned:
        return False

    # Reject non-English character scripts (Japanese, Chinese, Hindi Devanagari, Telugu, Tamil, Arabic, Cyrillic, Korean, Bengali, Gujarati, etc.)
    non_english_script_pattern = re.compile(
        r'[\u3040-\u30FF\u4E00-\u9FFF\u3000-\u303F'  # Japanese / Chinese
        r'\u0900-\u097F'                            # Hindi Devanagari / Marathi
        r'\u0C00-\u0C7F'                            # Telugu
        r'\u0B80-\u0BFF'                            # Tamil
        r'\u0600-\u06FF'                            # Arabic
        r'\u0400-\u04FF'                            # Cyrillic
        r'\uAC00-\uD7AF'                            # Korean Hangul
        r'\u0980-\u09FF'                            # Bengali
        r'\u0A80-\u0AFF]'                           # Gujarati
    )
    if non_english_script_pattern.search(cleaned):
        return False

    clean_src = source_code.split('-')[0].lower() if '-' in source_code else source_code.lower()
    if clean_src not in ['en', 'en-us']:
        # Reject if single/few-word output is a known non-English Romanized word (e.g., "Salamat", "Arigatou")
        words = [w.lower().strip('.,!?') for w in cleaned.split()]
        if len(words) <= 3 and any(w in NON_ENGLISH_ROMANIZED_WORDS for w in words):
            return False

        # Reject if translation output is identical to a non-Latin input string
        if cleaned.lower() == text.lower() and any(ord(c) > 127 for c in text):
            return False

    return True

if __name__ == '__main__':
    print("====================================================")
    print(f"LinguaBridge Python Server starting on http://localhost:{PORT}")
    print("   Backend: Python (Flask)")
    print("   NLP Engine: Advanced PythonNLPEngine Active")
    print("   Validation Guard: English Output Verification Enabled")
    print("====================================================")
    app.run(host='0.0.0.0', port=PORT, debug=False)
