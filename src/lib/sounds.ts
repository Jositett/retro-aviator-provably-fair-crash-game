// Simple Web Audio API sound effects generator
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.type = type;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may not be available in some environments
  }
};

export const sounds = {
  // Betting placed sound - ascending tone
  placeBet: () => {
    playTone(400, 0.1, 'sine', 0.25);
    setTimeout(() => playTone(600, 0.1, 'sine', 0.25), 60);
  },

  // Flight start - whoosh effect
  flightStart: () => {
    playTone(800, 0.15, 'square', 0.2);
    setTimeout(() => playTone(1200, 0.1, 'sine', 0.15), 50);
  },

  // Multiplier increasing (short tick)
  tick: () => {
    playTone(1000, 0.05, 'sine', 0.15);
  },

  // Crash sound - descending tones with noise
  crash: () => {
    // Main crash low tone
    playTone(200, 0.4, 'square', 0.35);
    setTimeout(() => playTone(120, 0.3, 'sine', 0.3), 80);
    
    // High frequency impact
    playTone(800, 0.15, 'triangle', 0.2);
  },

  // Cashout success - ascending ding
  cashout: () => {
    playTone(600, 0.1, 'sine', 0.3);
    setTimeout(() => playTone(800, 0.15, 'sine', 0.35), 70);
    setTimeout(() => playTone(1000, 0.2, 'sine', 0.3), 120);
  },

  // Preparation starting - beep
  prepStart: () => {
    playTone(550, 0.2, 'sine', 0.2);
  },

  // Countdown tick (each second)
  countdownTick: () => {
    playTone(700, 0.08, 'sine', 0.2);
  },
};
