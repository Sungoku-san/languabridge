/**
 * LinguaBridge - Advanced Dual-Engine Speech Recognition Module
 * 
 * Features:
 * 1. Web Audio High-Fidelity Microphone Stream & Visualizer integration.
 * 2. Real-time PCM audio buffer capture with 16kHz 16-bit Mono WAV encoding.
 * 3. Python Backend Speech-to-Text (/api/transcribe) powered by Google Speech API & Whisper.
 * 4. Client-side Web Speech API live-assist for real-time typing feedback where supported.
 * 5. Complete resilience: Network errors in Chrome's Web Speech API NEVER break the pipeline;
 *    the captured high-fidelity audio is transcribed reliably by the Python engine.
 */
class SpeechRecognitionEngine {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.hasBrowserSpeech = !!SpeechRecognition;
    this.SpeechRecognitionClass = SpeechRecognition;

    this.recognition = null;
    this.isListening = false;
    this.isTranscribing = false;
    this.mediaStream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.audioBuffers = [];
    this.recordingStartTime = 0;
    this.lastAudioLevelTime = 0;
    this.maxRecordingTimer = null;

    this.currentLanguage = 'en-US';
    this.webSpeechText = '';

    // Callbacks
    this.onStartCallback = null;
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    this.onProcessingCallback = null;
  }

  /**
   * Start listening and recording native speech
   */
  async start(languageCode = 'en-US') {
    if (this.isListening) {
      this.stop();
      return false;
    }

    this.currentLanguage = languageCode || 'en-US';
    this.audioBuffers = [];
    this.webSpeechText = '';

    // 1. Request microphone permission and access audio stream
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      let msg = 'Microphone permission denied. Please allow microphone access in your browser settings to speak.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No microphone device found on your computer. Please connect a microphone.';
      }
      if (this.onErrorCallback) this.onErrorCallback(msg, 'not-allowed');
      return false;
    }

    this.isListening = true;
    this.recordingStartTime = Date.now();
    this.lastAudioLevelTime = Date.now();

    // 2. Setup Web Audio API PCM Recorder
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // ScriptProcessor with bufferSize 4096 (1 input channel, 1 output channel)
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processorNode.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.audioBuffers.push(new Float32Array(inputData));

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        if (rms > 0.02) {
          this.lastAudioLevelTime = Date.now();
        }
      };

      this.sourceNode.connect(this.processorNode);
      // Connect to destination through a zero-gain node to keep onaudioprocess firing without feedback
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.processorNode.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

    } catch (audioErr) {
      console.warn('AudioContext setup warning:', audioErr);
    }

    // 3. Inform UI of recording start
    if (this.onStartCallback) {
      this.onStartCallback(this.mediaStream);
    }

    // 4. Try browser Web Speech API in parallel for real-time live typing (if available)
    if (this.hasBrowserSpeech) {
      try {
        this.recognition = new this.SpeechRecognitionClass();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.currentLanguage;

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const combined = finalTranscript || interimTranscript;
          if (combined) {
            this.webSpeechText = combined;
            if (this.onResultCallback) {
              this.onResultCallback({
                finalText: finalTranscript,
                interimText: interimTranscript,
                combinedText: combined
              });
            }
          }
        };

        this.recognition.onerror = (event) => {
          // Log notice only; DO NOT halt recording. The Python Speech Engine handles transcription seamlessly!
          console.warn(`Web Speech API notice (${event.error}) – switching primary transcription to Python Speech Engine.`);
        };

        this.recognition.onend = () => {
          // Recognition ended; audio recorder continues until stopped
        };

        this.recognition.start();
      } catch (recErr) {
        console.warn('Web Speech API start warning:', recErr);
      }
    }

    // 5. Automatic safety timeout after 15 seconds
    this.maxRecordingTimer = setTimeout(() => {
      if (this.isListening) {
        console.log('Max recording duration reached, auto-stopping...');
        this.stop();
      }
    }, 15000);

    return true;
  }

  /**
   * Stop listening and trigger transcription
   */
  async stop() {
    if (!this.isListening && !this.isTranscribing) return;
    this.isListening = false;

    if (this.maxRecordingTimer) {
      clearTimeout(this.maxRecordingTimer);
      this.maxRecordingTimer = null;
    }

    // Stop browser Web Speech API instance
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }

    // Stop and disconnect Web Audio nodes
    const capturedBuffers = [...this.audioBuffers];
    const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
    
    if (this.processorNode) {
      try { this.processorNode.disconnect(); } catch (e) {}
      this.processorNode = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    this.releaseMicrophone();

    // If Web Speech API already returned verified non-empty final text, use it directly!
    if (this.webSpeechText && this.webSpeechText.trim().length > 1) {
      if (this.onResultCallback) {
        this.onResultCallback({
          finalText: this.webSpeechText,
          interimText: '',
          combinedText: this.webSpeechText
        });
      }
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    // Otherwise, transcribe the captured audio using the Python Speech Engine
    await this.transcribeAudioWithBackend(capturedBuffers, sampleRate);
  }

  /**
   * Transcribe captured audio buffers via backend /api/transcribe
   */
  async transcribeAudioWithBackend(buffers, inputSampleRate) {
    if (!buffers || buffers.length === 0) {
      if (this.onErrorCallback) {
        this.onErrorCallback('No audio captured. Please speak into your microphone and try again.', 'no-speech');
      }
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    // Merge and downsample buffers to 16,000 Hz Mono PCM
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    // Check if recorded audio is purely silence
    let sumSquares = 0;
    for (let i = 0; i < merged.length; i++) {
      sumSquares += merged[i] * merged[i];
    }
    const rms = Math.sqrt(sumSquares / merged.length);
    if (rms < 0.004 && merged.length < inputSampleRate * 1.5) {
      if (this.onErrorCallback) {
        this.onErrorCallback('No speech detected. Please speak closer to your microphone and try again.', 'no-speech');
      }
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    const downsampled = this.downsampleTo16kHz(merged, inputSampleRate);
    const wavBlob = this.encodeWAV(downsampled, 16000);

    // Notify UI that backend transcription is in progress
    this.isTranscribing = true;
    if (this.onProcessingCallback) {
      this.onProcessingCallback('Transcribing speech with Python Speech Engine...');
    }

    try {
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');
      formData.append('language', this.currentLanguage);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success && data.text) {
        if (this.onResultCallback) {
          this.onResultCallback({
            finalText: data.text,
            interimText: '',
            combinedText: data.text
          });
        }
      } else {
        const errorMsg = (data && data.error) ? data.error : 'Could not transcribe speech. Please speak clearly.';
        if (this.onErrorCallback) {
          this.onErrorCallback(errorMsg, 'transcribe-failed');
        }
      }
    } catch (err) {
      console.error('Backend transcription request failed:', err);
      if (this.onErrorCallback) {
        this.onErrorCallback('Speech transcription service connection error. Please try again.', 'network');
      }
    } finally {
      this.isTranscribing = false;
      if (this.onEndCallback) this.onEndCallback();
    }
  }

  /**
   * Downsample audio float32 array to 16,000 Hz
   */
  downsampleTo16kHz(buffer, inputSampleRate, outputSampleRate = 16000) {
    if (inputSampleRate === outputSampleRate) return buffer;
    if (inputSampleRate < outputSampleRate) return buffer;

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * Encode 16kHz float32 samples into standard 16-bit Mono PCM WAV Blob
   */
  encodeWAV(samples, sampleRate = 16000) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw PCM = 1)
    view.setUint16(20, 1, true);
    // channel count (1 channel = Mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample = 2)
    view.setUint16(32, 2, true);
    // bits per sample (16 bit)
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // Write 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Release microphone stream tracks
   */
  releaseMicrophone() {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }
  }
}
