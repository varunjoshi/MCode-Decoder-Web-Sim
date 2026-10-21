// Web Audio Engine for Morse Code Sound Synthesis, Audio Visualizer, and Mic Decoder

class MorseAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.oscillator = null;
    this.envelopeGain = null;
    this.analyser = null;
    this.filter = null;
    
    this.frequency = 750; // standard 750Hz CW sidetone
    this.waveform = 'sine'; // 'sine', 'triangle', 'square' (piezo)
    this.volume = 0.5;
    this.isMuted = false;
    this.isPlayingContinuous = false;

    // Mic decoder properties
    this.micStream = null;
    this.micSource = null;
    this.micAnalyser = null;
    this.isListeningMic = false;
    this.micCallback = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master volume node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

    // Analyser node for Oscilloscope & FFT
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  setFrequency(freq) {
    this.frequency = Math.max(200, Math.min(2000, freq));
    if (this.oscillator) {
      this.oscillator.frequency.setTargetAtTime(this.frequency, this.ctx.currentTime, 0.01);
    }
  }

  setWaveform(type) {
    this.waveform = type;
    if (this.oscillator) {
      this.oscillator.type = type;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : this.volume, this.ctx.currentTime, 0.01);
    }
  }

  // Play a realistic mechanical tactile switch click (Arduino button press)
  playMechanicalClick(isRelease = false) {
    try {
      this.init();
      if (this.isMuted) return;

      const bufferSize = this.ctx.sampleRate * 0.015; // 15ms burst
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * (isRelease ? 0.2 : 0.3)));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const clickFilter = this.ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.value = isRelease ? 1800 : 2600;
      clickFilter.Q.value = 3.5;

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.015);

      noise.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.masterGain);

      noise.start();
    } catch (e) {
      console.warn("Audio click failed", e);
    }
  }

  // Start continuous tone (e.g. while key is pressed down)
  startTone() {
    this.init();
    if (this.isPlayingContinuous) return;

    try {
      const now = this.ctx.currentTime;
      this.oscillator = this.ctx.createOscillator();
      this.oscillator.type = this.waveform;
      this.oscillator.frequency.setValueAtTime(this.frequency, now);

      this.envelopeGain = this.ctx.createGain();
      // Smooth attack ramp to prevent speaker pops
      this.envelopeGain.gain.setValueAtTime(0.0001, now);
      this.envelopeGain.gain.exponentialRampToValueAtTime(1.0, now + 0.008);

      this.oscillator.connect(this.envelopeGain);
      this.envelopeGain.connect(this.masterGain);

      this.oscillator.start(now);
      this.isPlayingContinuous = true;
    } catch (e) {
      console.warn("startTone failed", e);
    }
  }

  // Stop continuous tone
  stopTone() {
    if (!this.isPlayingContinuous || !this.oscillator || !this.envelopeGain) return;

    try {
      const now = this.ctx.currentTime;
      // Smooth decay ramp
      this.envelopeGain.gain.cancelScheduledValues(now);
      this.envelopeGain.gain.setValueAtTime(this.envelopeGain.gain.value, now);
      this.envelopeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

      const osc = this.oscillator;
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_) {}
      }, 20);

      this.oscillator = null;
      this.envelopeGain = null;
      this.isPlayingContinuous = false;
    } catch (e) {
      console.warn("stopTone failed", e);
      this.isPlayingContinuous = false;
    }
  }

  // Play a timed beep (dot = duration, dash = 3 * duration)
  playBeep(durationMs) {
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = this.waveform;
      osc.frequency.setValueAtTime(this.frequency, now);

      const gain = this.ctx.createGain();
      const durSec = durationMs / 1000;
      const attack = 0.006;
      const release = 0.01;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(1.0, now + attack);
      gain.gain.setValueAtTime(1.0, now + durSec - release);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + durSec + 0.01);
    } catch (e) {
      console.warn("playBeep failed", e);
    }
  }

  // Tone burst for Dot
  playDot(unitDurationMs = 90) {
    this.playBeep(unitDurationMs);
  }

  // Tone burst for Dash
  playDash(unitDurationMs = 90) {
    this.playBeep(unitDurationMs * 3);
  }

  // Special alert sound (e.g. for buffer clear or reset)
  playChime(type = 'success') {
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      } else if (type === 'delete') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.15);
      } else if (type === 'clear') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(this.volume * 0.7, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'clear' ? 0.28 : 0.18));

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn("playChime error", e);
    }
  }

  // Get waveform data for Oscilloscope
  getTimeDomainData(dataArray) {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(dataArray);
    }
  }

  // Get frequency data for Spectrum Visualizer
  getFrequencyData(dataArray) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }
  }

  // Microphone audio decoder: detect Morse tones from room audio or speaker
  async startMicDecoding(onSignalCallback) {
    this.init();
    this.micCallback = onSignalCallback;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);

      // Narrow Bandpass filter around target CW frequency (e.g. 700-800Hz)
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = this.frequency;
      bandpass.Q.value = 8.0; // High Q to isolate Morse beep frequency

      this.micAnalyser = this.ctx.createAnalyser();
      this.micAnalyser.fftSize = 512;

      this.micSource.connect(bandpass);
      bandpass.connect(this.micAnalyser);

      this.isListeningMic = true;
      this._pollMicAudio();
      return true;
    } catch (err) {
      console.error("Microphone access denied or failed", err);
      return false;
    }
  }

  stopMicDecoding() {
    this.isListeningMic = false;
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  _pollMicAudio() {
    if (!this.isListeningMic || !this.micAnalyser) return;

    const bufferLength = this.micAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.micAnalyser.getByteFrequencyData(dataArray);

    // Calculate energy around peak bin
    let maxVal = 0;
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxVal) maxVal = dataArray[i];
    }

    const threshold = 85; // amplitude threshold for beep detection
    const isBeeping = maxVal > threshold;

    if (this.micCallback) {
      this.micCallback(isBeeping, maxVal);
    }

    requestAnimationFrame(() => this._pollMicAudio());
  }
}

export const soundEngine = new MorseAudioEngine();
