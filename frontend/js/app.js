/**
 * LinguaBridge - Main Application Controller
 * Orchestrates the 5-step speech-to-English voice translation pipeline:
 * Native Speech -> Speech Recognition -> Python NLP -> AI Translation -> English Voice Output
 */
document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------------------------
  // 1. Module Initializations
  // --------------------------------------------------------------------------
  const visualizer = new AudioVisualizer('audioVisualizerCanvas');
  const speechRec = new SpeechRecognitionEngine();
  const nlp = new NLPProcessor();
  const translator = new AITranslator();
  const tts = new TTSEngine();
  const historyMgr = new HistoryManager();

  // --------------------------------------------------------------------------
  // 2. DOM Element Selectors
  // --------------------------------------------------------------------------
  const nativeLanguageSelect = document.getElementById('nativeLanguageSelect');
  const btnMicRecord = document.getElementById('btnMicRecord');
  const micIcon = document.getElementById('micIcon');
  const micGlow = document.getElementById('micGlow');
  const micZone = document.querySelector('.mic-interaction-zone');
  const micHint = document.getElementById('micHint');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const toastAlert = document.getElementById('toastAlert');
  const toastMessage = document.getElementById('toastMessage');

  // Network Status Element
  const netStatusBadge = document.getElementById('netStatusBadge');
  const netStatusText = document.getElementById('netStatusText');

  // Sample Phrases Container
  const samplePillsContainer = document.getElementById('samplePillsContainer');

  // Recognized Card Elements
  const recognizedTextarea = document.getElementById('recognizedTextarea');
  const recognizedLangTag = document.getElementById('recognizedLangTag');
  const charCountInfo = document.getElementById('charCountInfo');
  const btnClearText = document.getElementById('btnClearText');
  const btnManualTranslate = document.getElementById('btnManualTranslate');

  // Translation Card & Python NLP Insights Elements
  const translationDisplay = document.getElementById('translationDisplay');
  const btnCopyTranslation = document.getElementById('btnCopyTranslation');
  const nlpInsightsBox = document.getElementById('nlpInsightsBox');
  const nlpTokenCount = document.getElementById('nlpTokenCount');
  const nlpIntent = document.getElementById('nlpIntent');
  const nlpRulesList = document.getElementById('nlpRulesList');

  // Voice Output Card Elements
  const soundwaveBox = document.getElementById('soundwaveBox');
  const waveStatusText = document.getElementById('waveStatusText');
  const audioStateBadge = document.getElementById('audioStateBadge');
  const btnPlayVoice = document.getElementById('btnPlayVoice');
  const btnPauseVoice = document.getElementById('btnPauseVoice');
  const btnStopVoice = document.getElementById('btnStopVoice');
  const voiceSelect = document.getElementById('voiceSelect');
  const rateRange = document.getElementById('rateRange');
  const rateVal = document.getElementById('rateVal');
  const pitchRange = document.getElementById('pitchRange');
  const pitchVal = document.getElementById('pitchVal');
  const chkAutoplay = document.getElementById('chkAutoplay');

  // History & Header Elements
  const historyList = document.getElementById('historyList');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const btnVivaModal = document.getElementById('btnVivaModal');
  const vivaModal = document.getElementById('vivaModal');
  const btnCloseViva = document.getElementById('btnCloseViva');
  const btnCloseVivaBtn = document.getElementById('btnCloseVivaBtn');

  // Step Pills
  const stepPills = [
    document.getElementById('stepPill1'),
    document.getElementById('stepPill2'),
    document.getElementById('stepPill3'),
    document.getElementById('stepPill4'),
    document.getElementById('stepPill5')
  ];

  // Pipeline State Memory
  let currentRecognizedText = '';
  let currentTranslatedText = '';
  let isPipelineProcessing = false;

  // --------------------------------------------------------------------------
  // Dynamic Sample Phrases Rendering
  // --------------------------------------------------------------------------
  function renderSamplePhrases() {
    if (!samplePillsContainer) return;
    
    const sampleKeys = ["ja-JP", "fr-FR", "es-ES", "de-DE", "hi-IN", "zh-CN", "ko-KR", "ar-SA", "ta-IN", "te-IN", "ru-RU", "en-US"];
    
    samplePillsContainer.innerHTML = sampleKeys.map(key => {
      const cfg = LANGUAGE_REGISTRY[key];
      if (!cfg) return '';
      const flagEmoji = getFlagEmoji(key);
      const shortText = cfg.samplePhrase.length > 20 ? cfg.samplePhrase.substring(0, 18) + '...' : cfg.samplePhrase;
      return `<button class="pill-btn" onclick="injectSamplePhrase('${escapeHtml(cfg.samplePhrase)}', '${key}')">${flagEmoji} "${escapeHtml(shortText)}"</button>`;
    }).join('');
  }

  function getFlagEmoji(key) {
    const flags = {
      "ja-JP": "🇯🇵", "fr-FR": "🇫🇷", "es-ES": "🇪🇸", "de-DE": "🇩🇪",
      "hi-IN": "🇮🇳", "zh-CN": "🇨🇳", "it-IT": "🇮🇹", "pt-BR": "🇧🇷",
      "ru-RU": "🇷🇺", "ar-SA": "🇸🇦", "ko-KR": "🇰🇷", "ta-IN": "🇮🇳",
      "te-IN": "🇮🇳", "bn-IN": "🇮🇳", "mr-IN": "🇮🇳", "gu-IN": "🇮🇳",
      "tr-TR": "🇹🇷", "nl-NL": "🇳🇱", "pl-PL": "🇵🇱", "vi-VN": "🇻🇳", "en-US": "🇺🇸"
    };
    return flags[key] || "🌐";
  }

  // Synchronize language tag badge on load
  function syncLanguageBadge() {
    if (nativeLanguageSelect && recognizedLangTag) {
      const selOpt = nativeLanguageSelect.options[nativeLanguageSelect.selectedIndex];
      if (selOpt) {
        recognizedLangTag.textContent = selOpt.text;
      }
    }
  }

  renderSamplePhrases();
  syncLanguageBadge();

  // --------------------------------------------------------------------------
  // Network Status Monitor
  // --------------------------------------------------------------------------
  function updateNetworkStatus() {
    if (navigator.onLine) {
      netStatusBadge.className = 'network-badge online';
      netStatusText.textContent = 'Online';
    } else {
      netStatusBadge.className = 'network-badge offline';
      netStatusText.textContent = 'Offline Mode (Local Voice Ready)';
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // --------------------------------------------------------------------------
  // 3. Populate TTS Voice Options & Prioritize Neural Human Voices
  // --------------------------------------------------------------------------
  function populateVoiceList() {
    const voices = tts.getVoices();
    voiceSelect.innerHTML = '';
    
    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      const isNatural = tts.isNaturalVoice(voice);
      option.textContent = `${isNatural ? '🌟 [Neural Natural Voice] ' : '🔊 '}${voice.name} (${voice.lang})`;
      if (tts.selectedVoice && tts.selectedVoice.name === voice.name) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
  }

  populateVoiceList();
  setTimeout(populateVoiceList, 600);

  // --------------------------------------------------------------------------
  // 4. Pipeline Status & Step Pill Controller
  // --------------------------------------------------------------------------
  function updateStatus(state, message, isError = false) {
    statusText.textContent = message;

    // Reset status badge classes
    statusBadge.className = 'status-badge';

    if (isError) {
      statusBadge.classList.add('state-listening'); // red error state
      showToast(message, true);
    } else {
      switch (state) {
        case 'READY':
          statusBadge.classList.add('state-ready');
          break;
        case 'LISTENING':
          statusBadge.classList.add('state-listening');
          break;
        case 'PROCESSING':
        case 'TRANSLATING':
        case 'GENERATING':
          statusBadge.classList.add('state-processing');
          break;
        case 'COMPLETED':
        case 'PLAYING':
          statusBadge.classList.add('state-success');
          break;
      }
    }
  }

  function setStepActive(stepIndex) {
    stepPills.forEach((pill, idx) => {
      if (idx < stepIndex) {
        pill.className = 'step-item completed';
      } else if (idx === stepIndex) {
        pill.className = 'step-item active';
      } else {
        pill.className = 'step-item';
      }
    });
  }

  function showToast(msg, isError = false) {
    toastMessage.textContent = msg;
    if (isError) {
      toastAlert.classList.add('error-state');
    } else {
      toastAlert.classList.remove('error-state');
    }
    toastAlert.classList.remove('hidden');

    setTimeout(() => {
      toastAlert.classList.add('hidden');
    }, 8000);
  }

  window.closeToast = () => {
    toastAlert.classList.add('hidden');
  };

  // --------------------------------------------------------------------------
  // 5. Speech Recognition Events Configuration
  // --------------------------------------------------------------------------
  speechRec.onStartCallback = (stream) => {
    micZone.classList.add('listening');
    micIcon.className = 'fa-solid fa-microphone-slash';
    micHint.textContent = 'Listening... Speak naturally in your native language';
    updateStatus('LISTENING', 'Listening to microphone...');
    setStepActive(1);
    visualizer.start(stream);
  };

  speechRec.onResultCallback = (data) => {
    if (data.combinedText) {
      recognizedTextarea.value = data.combinedText;
      updateCharCount();
      currentRecognizedText = data.combinedText;
      setStepActive(2);
      updateStatus('PROCESSING', 'Speech recognized...');
    }
  };

  speechRec.onProcessingCallback = (msg) => {
    updateStatus('PROCESSING', msg || 'Transcribing speech with Python Speech Engine...');
    micHint.textContent = 'Transcribing voice audio... Please wait';
  };

  speechRec.onErrorCallback = (errorMsg, errType) => {
    micZone.classList.remove('listening');
    micIcon.className = 'fa-solid fa-microphone';
    micHint.textContent = 'Click the microphone button to speak';
    visualizer.stop();
    updateStatus('READY', 'Listening halted', true);
    showToast(errorMsg, true);

    if (errType === 'network') {
      recognizedTextarea.focus();
    }
  };

  speechRec.onEndCallback = () => {
    micZone.classList.remove('listening');
    micIcon.className = 'fa-solid fa-microphone';
    micHint.textContent = 'Click the microphone button to start speaking';
    visualizer.stop();

    const textToProcess = recognizedTextarea.value.trim();
    if (textToProcess && textToProcess.length > 0) {
      executePipeline(textToProcess);
    } else {
      updateStatus('READY', 'Ready to listen');
      setStepActive(0);
    }
  };

  // --------------------------------------------------------------------------
  // 6. Core 5-Step Pipeline Execution Logic
  // --------------------------------------------------------------------------
  async function executePipeline(rawInputText) {
    if (isPipelineProcessing) return;
    isPipelineProcessing = true;

    try {
      const selectedKey = nativeLanguageSelect.value;
      const langConfig = getLanguageConfig(selectedKey);

      // STEP 3: Language Processing & Cleaning
      updateStatus('PROCESSING', 'Running Python NLP tokenization & hesitation cleaning...');
      setStepActive(2);
      
      const nlpResult = nlp.process(rawInputText);
      const cleanedText = nlpResult.cleanedText;

      if (nlpResult.wasModified) {
        recognizedTextarea.value = cleanedText;
        updateCharCount();
      }

      // STEP 4: AI Machine Translation
      updateStatus('TRANSLATING', 'Translating into natural English...');
      setStepActive(3);

      translationDisplay.className = 'translation-output-box placeholder';
      translationDisplay.innerHTML = '<p><i class="fa-solid fa-spinner fa-spin"></i> Performing AI Translation...</p>';

      const translationRes = await translator.translate(cleanedText, selectedKey);

      if (!translationRes.success || !translationRes.translatedText) {
        throw new Error(translationRes.error || 'Translation failed to produce valid English output.');
      }

      currentTranslatedText = translationRes.translatedText;
      
      // Display English Translation
      translationDisplay.className = 'translation-output-box';
      translationDisplay.textContent = currentTranslatedText;

      // Render Python NLP Insights Panel
      renderNLPInsights(translationRes.nlpMetadata || nlpResult);
      
      // Enable Voice playback control buttons
      btnPlayVoice.disabled = false;
      btnStopVoice.disabled = false;

      // STEP 5: Natural English Voice Output Generation & Auto-Play
      updateStatus('GENERATING', 'Generating Natural English Voice Output...');
      setStepActive(4);

      // Save Session to LocalStorage History
      historyMgr.addSession({
        sourceLangName: langConfig.name,
        sourceLangCode: langConfig.speechCode,
        nativeText: cleanedText,
        englishText: currentTranslatedText
      });
      renderHistory();

      // Trigger automatic voice playback if auto-play is enabled
      if (chkAutoplay.checked) {
        setTimeout(() => {
          triggerVoiceOutput(currentTranslatedText);
        }, 300);
      } else {
        updateStatus('COMPLETED', 'Translation completed. Click Play Voice to hear natural audio.');
        waveStatusText.textContent = 'English Voice Ready (Click Play)';
        audioStateBadge.textContent = 'Audio Ready';
        audioStateBadge.className = 'badge-tag tag-emerald';
        isPipelineProcessing = false;
      }

    } catch (err) {
      console.error('Pipeline execution error:', err);
      updateStatus('READY', 'Pipeline error', true);
      translationDisplay.className = 'translation-output-box placeholder';
      translationDisplay.textContent = 'Translation notice: ' + (err.message || 'Check phrase input.');
      showToast(err.message || 'An error occurred during translation.', true);
      isPipelineProcessing = false;
    }
  }

  /**
   * Render Python NLP Insights metadata drawer
   */
  function renderNLPInsights(metadata) {
    if (!metadata) return;

    nlpTokenCount.textContent = metadata.token_count || metadata.tokenCount || 0;
    nlpIntent.textContent = metadata.intent || 'General Statement';

    const rules = metadata.rules_applied || metadata.rulesApplied || ['Standard token normalization'];
    nlpRulesList.innerHTML = rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('');

    nlpInsightsBox.classList.remove('hidden');
  }

  // --------------------------------------------------------------------------
  // Helper: Sample Phrase Injector
  // --------------------------------------------------------------------------
  window.injectSamplePhrase = (text, langCode) => {
    nativeLanguageSelect.value = langCode;
    const selectedOption = nativeLanguageSelect.options[nativeLanguageSelect.selectedIndex];
    recognizedLangTag.textContent = selectedOption.text;

    recognizedTextarea.value = text;
    updateCharCount();
    executePipeline(text);
  };

  // --------------------------------------------------------------------------
  // 7. TTS Engine Playback Controls & Callbacks
  // --------------------------------------------------------------------------
  function triggerVoiceOutput(text) {
    if (!text) return;
    
    // Ensure TTS receives ONLY verified final English translation text
    waveStatusText.textContent = 'Playing Natural English Voice Output...';
    soundwaveBox.classList.add('playing');
    audioStateBadge.textContent = 'Voice Playing';
    audioStateBadge.className = 'badge-tag tag-purple';

    btnPlayVoice.disabled = true;
    btnPauseVoice.disabled = false;
    btnStopVoice.disabled = false;

    tts.speak(text);
  }

  tts.onStartCallback = () => {
    updateStatus('PLAYING', 'Playing Natural English Voice Output...');
    soundwaveBox.classList.add('playing');
  };

  tts.onEndCallback = () => {
    updateStatus('COMPLETED', 'Natural English voice playback completed');
    soundwaveBox.classList.remove('playing');
    waveStatusText.textContent = 'English Audio Standby';
    audioStateBadge.textContent = 'Audio Standby';
    audioStateBadge.className = 'badge-tag tag-purple';
    
    btnPlayVoice.disabled = !currentTranslatedText;
    btnPauseVoice.disabled = true;
    btnStopVoice.disabled = true;
    isPipelineProcessing = false;
  };

  tts.onPauseCallback = () => {
    soundwaveBox.classList.remove('playing');
    waveStatusText.textContent = 'Audio Paused';
    btnPauseVoice.innerHTML = '<i class="fa-solid fa-play"></i><span>Resume</span>';
  };

  tts.onResumeCallback = () => {
    soundwaveBox.classList.add('playing');
    waveStatusText.textContent = 'Playing Natural English Voice Output...';
    btnPauseVoice.innerHTML = '<i class="fa-solid fa-pause"></i><span>Pause</span>';
  };

  tts.onErrorCallback = (err) => {
    soundwaveBox.classList.remove('playing');
    showToast(err, true);
    btnPlayVoice.disabled = !currentTranslatedText;
    btnPauseVoice.disabled = true;
    btnStopVoice.disabled = true;
    isPipelineProcessing = false;
  };

  // --------------------------------------------------------------------------
  // 8. User Event Listeners
  // --------------------------------------------------------------------------

  // Microphone Record Toggle Button
  btnMicRecord.addEventListener('click', () => {
    if (speechRec.isListening) {
      speechRec.stop();
    } else {
      const selectedLang = nativeLanguageSelect.value;
      const langCfg = getLanguageConfig(selectedLang);
      speechRec.start(langCfg.speechCode);
    }
  });

  // Language Dropdown Selector Change
  nativeLanguageSelect.addEventListener('change', () => {
    const selectedOption = nativeLanguageSelect.options[nativeLanguageSelect.selectedIndex];
    recognizedLangTag.textContent = selectedOption.text;
  });

  // Character Counter & Manual Editing
  function updateCharCount() {
    const len = recognizedTextarea.value.length;
    charCountInfo.textContent = `${len} character${len === 1 ? '' : 's'}`;
  }

  recognizedTextarea.addEventListener('input', updateCharCount);

  // Clear Recognized Text
  btnClearText.addEventListener('click', () => {
    recognizedTextarea.value = '';
    updateCharCount();
    translationDisplay.className = 'translation-output-box placeholder';
    translationDisplay.textContent = 'The translated English text will be displayed here as supporting text while voice output is generated...';
    nlpInsightsBox.classList.add('hidden');
    currentRecognizedText = '';
    currentTranslatedText = '';
    tts.stop();
    btnPlayVoice.disabled = true;
    btnPauseVoice.disabled = true;
    btnStopVoice.disabled = true;
    updateStatus('READY', 'Ready to listen');
    setStepActive(0);
  });

  // Manual Re-Translate Button
  btnManualTranslate.addEventListener('click', () => {
    const text = recognizedTextarea.value.trim();
    if (text) {
      executePipeline(text);
    } else {
      showToast('Please speak or type text into the recognized speech box first.', true);
    }
  });

  // Copy Translation Button
  btnCopyTranslation.addEventListener('click', () => {
    if (currentTranslatedText) {
      navigator.clipboard.writeText(currentTranslatedText).then(() => {
        showToast('English translation copied to clipboard!');
      });
    }
  });

  // Audio Playback Controls
  btnPlayVoice.addEventListener('click', () => {
    if (tts.isPaused) {
      tts.resume();
    } else if (currentTranslatedText) {
      triggerVoiceOutput(currentTranslatedText);
    }
  });

  btnPauseVoice.addEventListener('click', () => {
    if (tts.isPlaying && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    }
  });

  btnStopVoice.addEventListener('click', () => {
    tts.stop();
  });

  // Voice Selection Dropdown Change
  voiceSelect.addEventListener('change', () => {
    const idx = voiceSelect.value;
    if (idx !== '') {
      tts.setVoiceByIndex(parseInt(idx, 10));
    }
  });

  // Speed Rate & Pitch Sliders
  rateRange.addEventListener('input', (e) => {
    const val = e.target.value;
    rateVal.textContent = `${val}x`;
    tts.setRate(val);
  });

  pitchRange.addEventListener('input', (e) => {
    const val = e.target.value;
    pitchVal.textContent = val;
    tts.setPitch(val);
  });

  // Theme Toggle Button
  btnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    btnThemeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });

  // Viva Architecture Modal Controls
  btnVivaModal.addEventListener('click', () => vivaModal.classList.remove('hidden'));
  btnCloseViva.addEventListener('click', () => vivaModal.classList.add('hidden'));
  btnCloseVivaBtn.addEventListener('click', () => vivaModal.classList.add('hidden'));
  vivaModal.addEventListener('click', (e) => {
    if (e.target === vivaModal) vivaModal.classList.add('hidden');
  });

  // --------------------------------------------------------------------------
  // 9. History Manager Functions & Render
  // --------------------------------------------------------------------------
  function renderHistory() {
    const items = historyMgr.getHistory();
    if (items.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <i class="fa-solid fa-microphone-lines"></i>
          <p>No recent translations yet. Speak into the microphone above to create your first translated voice session!</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = items.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-header">
          <span class="history-lang"><i class="fa-solid fa-globe"></i> ${escapeHtml(item.sourceLangName)}</span>
          <span class="history-time">${escapeHtml(item.timestamp)}</span>
        </div>
        <p class="history-native">"${escapeHtml(item.nativeText)}"</p>
        <p class="history-english">🔊 "${escapeHtml(item.englishText)}"</p>
        <button class="btn-replay-audio" onclick="replayHistoryVoice('${escapeHtml(item.englishText).replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-play"></i> Replay Audio
        </button>
      </div>
    `).join('');
  }

  window.replayHistoryVoice = (text) => {
    currentTranslatedText = text;
    translationDisplay.className = 'translation-output-box';
    translationDisplay.textContent = text;
    btnPlayVoice.disabled = false;
    btnStopVoice.disabled = false;
    triggerVoiceOutput(text);
  };

  btnClearHistory.addEventListener('click', () => {
    historyMgr.clearHistory();
    renderHistory();
    showToast('Translation history cleared.');
  });

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // Initial history render
  renderHistory();
  updateStatus('READY', 'Ready to listen');

});
