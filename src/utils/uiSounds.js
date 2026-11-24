
let audioContext = null;

export function playMenuClick() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Short electronic terminal click
    oscillator.type = "triangle";

    oscillator.frequency.setValueAtTime(850, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      530,
      now + 0.065
    );

    // Quick attack and decay
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      0.045,
      now + 0.004
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.075
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.08);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };

  } catch (error) {
    console.warn("UI sound unavailable:", error);
  }
}
