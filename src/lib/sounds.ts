// Simple Web Audio API sound effects generator
let audioContext: AudioContext | null = null;
let contextInitialized = false;

const initAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return;
    }
  }

  // Resume context if suspended (autoplay restriction)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Context resume failed - audio will be disabled
    });
  }

  if (!contextInitialized) {
    contextInitialized = true;
    // Remove listeners after context initialized
    document.removeEventListener('click', handleUserGesture);
    document.removeEventListener('touchstart', handleUserGesture);
  }
};

const handleUserGesture = () => {
  initAudioContext();
};

const getAudioContext = (): AudioContext | null => {
  // Only use existing context - never create new one outside of user gesture
  if (!contextInitialized) {
    return null;
  }
  
  // Resume context if it was suspended
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => null);
  }

  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return; // Audio not available
    
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
    playTone(400, 0.1, 'sine', 0.4);
    setTimeout(() => playTone(600, 0.1, 'sine', 0.4), 60);
  },

  // Flight start - whoosh effect (loud and clear)
  flightStart: () => {
    playTone(600, 0.2, 'square', 0.6);
    setTimeout(() => playTone(900, 0.15, 'square', 0.55), 40);
    setTimeout(() => playTone(1200, 0.2, 'sine', 0.5), 80);
  },

  // Multiplier increasing (short tick)
  tick: () => {
    playTone(1000, 0.05, 'sine', 0.35);
  },

  // Crash sound - dramatic explosion (loud impact)
  crash: () => {
    // Initial impact - low frequency
    playTone(150, 0.5, 'square', 0.7);
    // Descending impact
    setTimeout(() => playTone(100, 0.4, 'sine', 0.65), 100);
    // High frequency explosion
    setTimeout(() => playTone(900, 0.3, 'triangle', 0.6), 200);
    // Final rumble
    setTimeout(() => playTone(80, 0.3, 'square', 0.55), 280);
  },

  // Cashout success - ascending ding
  cashout: () => {
    playTone(600, 0.12, 'sine', 0.5);
    setTimeout(() => playTone(800, 0.15, 'sine', 0.55), 70);
    setTimeout(() => playTone(1000, 0.2, 'sine', 0.5), 120);
  },

  // Preparation starting - beep
  prepStart: () => {
    playTone(550, 0.2, 'sine', 0.4);
  },

  // Countdown tick (each second)
  countdownTick: () => {
    playTone(700, 0.08, 'sine', 0.35);
  },
};

// Initialize audio context on first user gesture
if (typeof document !== 'undefined') {
  document.addEventListener('click', handleUserGesture, { once: true });
  document.addEventListener('touchstart', handleUserGesture, { once: true });
}
