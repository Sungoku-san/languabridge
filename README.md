# LinguaBridge – AI-Powered Speech-to-English Voice Translator

LinguaBridge is a web-based AI application that allows users to speak in their native language and receive the translated output as spoken **English voice**.

Unlike conventional text-only translators, LinguaBridge prioritizes **spoken English audio** as its primary output, supported by rendered English text and live speech-recognition visualization.

---

## 📌 Conceptual Pipeline Architecture

```
Native Language Speech
        ↓
Speech Recognition (Web Speech API)
        ↓
Python Language Pre-Processing (PythonNLPEngine: Tokenization & Hesitation Cleaning)
        ↓
AI Translation (Python Flask Backend & AI Machine Translation)
        ↓
English Voice Output (Speech Synthesis API Spoken Audio)
```

---

## 🎯 Objectives & Key Features

1. **Native Language Voice Input**: Capture natural microphone input across 20+ major global languages (Spanish, French, German, Hindi, Japanese, Chinese, Arabic, Portuguese, etc.).
2. **Real-time Audio Visualizer**: Interactive canvas audio waveform showing active microphone state and volume levels.
3. **Python NLP Pre-Processing**: Cleans speech hesitation artifacts ("um", "uh", "err", "este", "मतलब"), tokenizes text, normalizes structures, and formats sentences cleanly in [`backend/nlp_engine.py`](file:///d:/project/languabridge/backend/nlp_engine.py).
4. **Contextual AI Translation**: Translates native text into clear, context-aware natural English via Python Flask backend service in [`backend/app.py`](file:///d:/project/languabridge/backend/app.py).
5. **Auto-Playing English Voice Output**: Converts English translation into spoken audio automatically using `window.speechSynthesis` with Play, Pause/Resume, Stop, Accent, Pitch, and Speed controls.
6. **Session History**: Stores recent voice translation sessions in LocalStorage with one-click audio replay.
7. **Viva Presentation Mode**: Built-in interactive architectural modal for college project defense presentations.

---

## 🛠️ Technology Stack

* **Backend**: **Python 3**, **Flask Framework**, **Flask-CORS**, `requests`, `python-dotenv`.
* **NLP Engine**: Custom Python NLP Module ([`nlp_engine.py`](file:///d:/project/languabridge/backend/nlp_engine.py)) performing tokenization, filler token stripping, stutter removal, and boundary normalization.
* **Frontend**: HTML5, CSS3 (Glassmorphism design, custom CSS properties, responsive grid), Vanilla JavaScript (ES6+).
* **Audio & Speech APIs**:
  * **Speech Recognition**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
  * **Audio Visualizer**: Web Audio API (`AudioContext`, `AnalyserNode`) + HTML5 `<canvas>`.
  * **Voice Synthesis**: Web Speech API (`SpeechSynthesis` & `SpeechSynthesisUtterance`).

---

## 📁 Project Structure

```
linguabridge/
├── backend/
│   ├── app.py               # Python Flask Web Server & Translation Proxy
│   ├── nlp_engine.py        # Python NLP Pre-processing & Cleaning Module
│   └── requirements.txt     # Python Dependencies (flask, flask-cors, requests)
├── frontend/
│   ├── index.html           # Main User Interface & Viva Modal
│   ├── css/
│   │   └── style.css        # Responsive Glassmorphism Theme & Animations
│   └── js/
│       ├── app.js           # Main controller orchestrating pipeline
│       ├── speechRec.js     # Speech recognition & mic stream handler
│       ├── nlpProcessor.js  # Frontend NLP pre-processor
│       ├── translator.js    # AI Machine translation interface
│       ├── ttsEngine.js     # English Text-to-Speech voice engine
│       ├── visualizer.js    # Canvas audio visualizer
│       └── history.js       # LocalStorage session manager
├── .env                     # Environment configuration
├── .env.example             # API key template
├── package.json             # Root runner script
└── README.md                # Comprehensive documentation
```

---

## 🚀 Installation & Running Instructions

### 1. Prerequisites
- Python 3.8+ installed on your system.
- A modern web browser with Speech Recognition & Speech Synthesis support (Google Chrome, Microsoft Edge, Safari, or Opera).

### 2. Quick Start

1. **Navigate to project folder**:
   ```bash
   cd d:/project/languabridge
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Start the LinguaBridge Python Server**:
   ```bash
   python backend/app.py
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration & API Keys

LinguaBridge works **out-of-the-box** without requiring any paid API keys using its free built-in translation pipeline.

If you wish to use an external AI API (e.g., OpenAI GPT-3.5/4), create a `.env` file in the root directory:

```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
```

All secrets remain securely on the Python server and are never exposed to client-side code.

---

## 🎓 College Viva Presentation Guide

When presenting LinguaBridge to project examiners or professors, use this summary:

> *"LinguaBridge is an AI-powered voice-to-voice translation system built with a **Python Flask backend**. First, the user selects their native language and speaks into the browser microphone. The **Speech Recognition module** captures the audio stream and converts it into text. Next, our **Python NLP Engine** cleans speech hesitation markers (like 'um' and 'uh'), tokenizes the input, and formats the sentence. The **AI Translation module** passes the cleaned text through our Python Flask backend service to obtain an accurate, context-aware English translation. Finally, the **Text-to-Speech module** passes the English text to the Web Speech Synthesis API, generating spoken English audio output automatically for the user."*
