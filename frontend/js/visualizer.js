/**
 * LinguaBridge - Real-Time Audio Canvas Visualizer
 * Uses Web Audio API AnalyserNode when mic stream is active, or simulated visualizer.
 */
class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.isVisualizing = false;
    this.animFrameId = null;
    this.simulatedPhase = 0;
  }

  /**
   * Start visualizing live audio stream
   */
  start(stream) {
    this.stop();
    this.isVisualizing = true;

    if (stream && window.AudioContext || window.webkitAudioContext) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        
        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        this.drawRealtimeWave();
        return;
      } catch (err) {
        console.warn('Web Audio API setup error, using simulated wave:', err);
      }
    }

    // Fallback: Simulated dynamic waveform canvas animation
    this.drawSimulatedWave();
  }

  /**
   * Draw real frequency data from microphone
   */
  drawRealtimeWave() {
    if (!this.isVisualizing || !this.ctx) return;

    this.animFrameId = requestAnimationFrame(() => this.drawRealtimeWave());
    this.analyser.getByteFrequencyData(this.dataArray);

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    const barWidth = (width / this.dataArray.length) * 1.5;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * height * 0.8;
      
      const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#4f46e5');
      gradient.addColorStop(1, '#10b981');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, (height - barHeight) / 2, barWidth - 2, barHeight || 4);

      x += barWidth;
    }
  }

  /**
   * Draw simulated smooth wave when active without direct stream binding
   */
  drawSimulatedWave() {
    if (!this.isVisualizing || !this.ctx) return;

    this.animFrameId = requestAnimationFrame(() => this.drawSimulatedWave());
    this.simulatedPhase += 0.08;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.beginPath();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#4f46e5';

    for (let x = 0; x < width; x += 5) {
      const y = (height / 2) + Math.sin(x * 0.04 + this.simulatedPhase) * 15 * Math.sin(this.simulatedPhase * 0.5);
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  /**
   * Stop visualizer and clear canvas
   */
  stop() {
    this.isVisualizing = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Draw flat baseline
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#cbd5e1';
      this.ctx.lineWidth = 2;
      this.ctx.moveTo(0, this.canvas.height / 2);
      this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
      this.ctx.stroke();
    }
  }
}
