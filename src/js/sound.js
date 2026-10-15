/* ============================================================
   TicTic ADHD — Sound (§6: chime, foghorn; Web Audio, no assets)
   ============================================================ */
import { S } from './store.js';

let ctx = null;
function ac() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, dur, when = 0, type = 'sine', gainV = 0.08) {
  const a = ac();
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + when);
  g.gain.linearRampToValueAtTime(gainV, a.currentTime + when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + dur);
  o.connect(g); g.connect(a.destination);
  o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05);
}

export function enabled() { return S.settings.sfx !== false; }

export const sfx = {
  complete() { if (!enabled()) return; try { tone(660, 0.15); tone(880, 0.25, 0.12); } catch (e) {} },
  start() { if (!enabled()) return; try { tone(440, 0.1); } catch (e) {} },
  undo() { if (!enabled()) return; try { tone(300, 0.1, 0, 'triangle', 0.06); } catch (e) {} },
  drift() { if (!enabled()) return; try { tone(240, 0.12, 0, 'triangle', 0.06); } catch (e) {} },
  foghorn() {
    if (!enabled() || !S.lighthouse?.foghorn) return;
    try { tone(98, 0.7, 0, 'sawtooth', 0.06); tone(147, 0.7, 0.05, 'sawtooth', 0.05); tone(98, 0.7, 0.8, 'sawtooth', 0.06); } catch (e) {}
  },
};

/* Speech synthesis voice cues (§5.5 — toggleable) */
export function say(text) {
  if (!S.settings.voiceCues || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = S.settings.lang === 'fa' ? 'fa-IR' : 'en-US';
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
