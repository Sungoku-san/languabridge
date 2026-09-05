/**
 * LinguaBridge - Text-to-Speech (TTS) Engine Module
 * Converts translated English text into natural human-like spoken English voice output.
 * Prioritizes Neural and High-Definition Natural Speech Synthesis voices.
 */
class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSupported = !!this.synth;
    
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 0.95; // Natural conversational human speed rate
    this.pitch = 1.02; // Warm human vocal pitch

    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;

    // Event Callbacks
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onPauseCallback = null;
    this.onResumeCallback = null;
    this.onErrorCallback = null;

    if (this.isSupported) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  /**
   * Load available browser Speech Synthesis voices & prioritize Natural Human voices
   */
  loadVoices() {
    if (!this.isSupported) return;
    
    const allVoices = this.synth.getVoices();
    // Filter for English voices (en-US, en-GB, en-AU, en-IN, etc.)
    const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));

    // Sort voices so Neural / High-Definition Natural voices appear first
    this.voices = (englishVoices.length > 0 ? englishVoices : allVoices).sort((a, b) => {
      const aNatural = this.isNaturalVoice(a);
      const bNatural = this.isNaturalVoice(b);
      if (aNatural && !bNatural) return -1;
      if (!aNatural && bNatural) return 1;
      return a.name.localeCompare(b.name);
    });

    // Automatically select the highest quality Neural / Natural voice available
    if (this.voices.length > 0) {
      const preferred = this.voices.find(v => this.isNaturalVoice(v));
      this.selectedVoice = preferred || this.voices[0];
    }
  }

  /**
   * Helper: Check if voice is a high quality Natural / Neural Human Voice
   */
  isNaturalVoice(voice) {
    if (!voice || !voice.name) return false;
    const name = voice.name.toLowerCase();
    return (
      name.includes('natural') ||
      name.includes('google') ||
      name.includes('neural') ||
      name.includes('online') ||
      name.includes('samantha') ||
      name.includes('jenny') ||
      name.includes('aria') ||
      name.includes('guy') ||
      name.includes('karen') ||
      name.includes('daniel')
    );
  }

  /**
   * Get list of English voices for UI dropdown
   */
  getVoices() {
    return this.voices;
  }

  /**
   * Select a voice by index
   */
  setVoiceByIndex(index) {
    if (this.voices[index]) {
      this.selectedVoice = this.voices[index];
    }
  }

  /**
   * Set playback speech rate (0.5 to 2.0)
   */
  setRate(value) {
    this.rate = parseFloat(value) || 0.95;
  }

  /**
   * Set voice pitch (0.5 to 1.5)
   */
  setPitch(value) {
    this.pitch = parseFloat(value) || 1.02;
  }

  /**
   * Speak English text using natural voice synthesis
   * @param {string} text - English text to speak
   */
  speak(text) {
    if (!this.isSupported) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Text-to-Speech audio output is not supported by your browser.');
      }
      return false;
    }

    if (!text || !text.trim()) {
      return false;
    }

    // Stop any ongoing speech playback
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      if (this.onStartCallback) this.onStartCallback();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      if (this.onEndCallback) this.onEndCallback();
    };

    utterance.onerror = (event) => {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      console.error('TTS Audio playback error:', event);
      if (this.onErrorCallback) {
        this.onErrorCallback('Audio playback error occurred.');
      }
    };

    utterance.onpause = () => {
      this.isPaused = true;
      if (this.onPauseCallback) this.onPauseCallback();
    };

    utterance.onresume = () => {
      this.isPaused = false;
      if (this.onResumeCallback) this.onResumeCallback();
    };

    this.currentUtterance = utterance;
    
    try {
      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error('Error invoking SpeechSynthesis:', err);
      if (this.onErrorCallback) this.onErrorCallback('Failed to play English voice output.');
      return false;
    }
  }

  /**
   * Pause speech output
   */
  pause() {
    if (this.isSupported && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isPaused = true;
      if (this.onPauseCallback) this.onPauseCallback();
    }
  }

  /**
   * Resume paused speech output
   */
  resume() {
    if (this.isSupported && this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
      if (this.onResumeCallback) this.onResumeCallback();
    }
  }

  /**
   * Stop speech output completely
   */
  stop() {
    if (this.isSupported && (this.synth.speaking || this.synth.pending)) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    if (this.onEndCallback) this.onEndCallback();
  }
}
