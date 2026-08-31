// Lightweight notification sounds synthesized on the fly via the Web Audio
// API - no binary asset files to fetch, bundle or license. One shared
// AudioContext, created lazily on first use rather than at module load,
// since creating one before any user gesture can be blocked by browser
// autoplay policy; resuming it here covers the case where it was created
// but then suspended.
let sharedContext = null;

function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    if (!sharedContext) {
        sharedContext = new AudioContextClass();
    }

    if (sharedContext.state === "suspended") {
        sharedContext.resume().catch(() => {});
    }

    return sharedContext;
}

function playTone(audioCtx, frequency, startTime, duration, peakGain) {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Quick linear attack then an exponential decay - a soft "ding" rather
    // than an abrupt click at the start/end of the tone.
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// The field rep's incoming "visit this next" toast (Live Ops stop nudge) -
// a brighter, two-note rising chime meant to actually catch attention since
// it can arrive while the rep is on a different screen entirely.
export function playNudgeReceivedSound() {
    const audioCtx = getAudioContext();

    if (!audioCtx) {
        return;
    }

    try {
        const now = audioCtx.currentTime;
        playTone(audioCtx, 880, now, 0.16, 0.18);
        playTone(audioCtx, 1318.5, now + 0.1, 0.22, 0.16);
    } catch {
        // Audio is a nice-to-have; never let it break the toast itself.
    }
}

// The manager's own "nudge sent" confirmation - a single soft, lower tone
// so it reads as "done", not as an alert directed at them.
export function playNudgeSentSound() {
    const audioCtx = getAudioContext();

    if (!audioCtx) {
        return;
    }

    try {
        playTone(audioCtx, 660, audioCtx.currentTime, 0.14, 0.12);
    } catch {
        // Same as above.
    }
}
