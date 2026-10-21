// Web Audio Engine for Pure-Logic Morse Decoder
// Generates:
// 1. 700 Hz CW sidetone with smooth anti-click envelope
// 2. Realistic mechanical key clicks (press & release)
// 3. Relay/Flip-flop latch click on U6 trigger
// 4. Decode chime & error buzzer

class PureLogicAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.cwOsc = null;
    this.cwGain = null;
    this.isMuted = false;
    this.volume = 0.6;
    this.cwFrequency = 700; // Standard 700 Hz CW pitch
    this.isToneActive = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setFrequency(freq) {
    this.cwFrequency = Math.max(300, Math.min(1200, freq));
    if (this.cwOsc) {
      this.cwOsc.frequency.setTargetAtTime(this.cwFrequency, this.ctx.currentTime, 0.01);
    }
  }

  // Start continuous CW sidetone
  startTone() {
    this.ensureContext();
    if (!this.ctx || this.isToneActive) return;

    try {
      this.cwOsc = this.ctx.createOscillator();
      this.cwGain = this.ctx.createGain();

      this.cwOsc.type = 'sine';
      this.cwOsc.frequency.setValueAtTime(this.cwFrequency, this.ctx.currentTime);

      // Smooth attack ramp to prevent audible click
      this.cwGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.cwGain.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 0.006);

      this.cwOsc.connect(this.cwGain);
      this.cwGain.connect(this.masterGain);

      this.cwOsc.start();
      this.isToneActive = true;
    } catch (e) {
      console.warn("Audio tone start error:", e);
    }
  }

  // Stop continuous CW sidetone
  stopTone() {
    if (!this.ctx || !this.isToneActive || !this.cwGain) return;

    try {
      const now = this.ctx.currentTime;
      // Smooth release ramp to prevent audible pop
      this.cwGain.gain.cancelScheduledValues(now);
      this.cwGain.gain.setValueAtTime(this.cwGain.gain.value, now);
      this.cwGain.gain.linearRampToValueAtTime(0, now + 0.008);

      const osc = this.cwOsc;
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_) {}
      }, 20);

      this.isToneActive = false;
      this.cwOsc = null;
      this.cwGain = null;
    } catch (e) {
      console.warn("Audio tone stop error:", e);
    }
  }

  // Play mechanical key contact click
  playKeyClick(isDown) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = isDown ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(isDown ? 180 : 260, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.015);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isDown ? 800 : 1200, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (_) {}
  }

  // Play digital latch relay snap
  playLatchClick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.018);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (_) {}
  }

  // Play subtle decode notification chime
  playDecodeChime(letter) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch slightly based on character code
      const baseNote = 523.25; // C5
      const offset = ((letter.charCodeAt(0) - 65) % 12) * 20;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseNote + offset, now);
      osc.frequency.exponentialRampToValueAtTime((baseNote + offset) * 1.5, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  // Play warning buzzer on ERR
  playErrorBuzz() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (_) {}
  }
}

export const pureLogicAudio = new PureLogicAudio();
