'use strict';
// SCC-stijl geluidsengine.
// Konami's SCC-chip had 5 wavetable-kanalen met golfvormen van 32 samples (8-bit).
// Die golfvormen bouwen we hier na als PeriodicWave, inclusief de 'trapjes' van de
// 8-bit samples. Drums en effecten klinken via een PSG-achtige blok/ruisgenerator.
const SCC = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf, song = null, muted = false;
  const waves = {};

  // 32-sample golfvormen, waarden -1..1 (worden gekwantiseerd naar 8-bit)
  const WAVES = {
    lead:  n => (n < 10 ? 0.5 : 0) + (n / 31) * 1.2 - 0.85,           // 'brass': zaagtand met pulsrand
    pad:   n => Math.sin(2 * Math.PI * n / 32) * 0.6 + ((n / 31) * 2 - 1) * 0.4,
    bass:  n => { const t = n < 16 ? n / 8 - 1 : 3 - n / 8; return Math.max(-0.75, Math.min(0.75, t)) / 0.75; },
    pulse: n => (n < 8 ? 1 : -1),                                      // 25% puls voor arpeggio's
    bell:  n => Math.sin(2 * Math.PI * n / 32) * 0.6 + Math.sin(6 * Math.PI * n / 32) * 0.4,
  };

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function buildWave(fn) {
    const N = 32, s = [];
    for (let n = 0; n < N; n++) s.push(Math.round(Math.max(-1, Math.min(1, fn(n))) * 127) / 127);
    // 4x 'zero-order hold' zodat de trapjes (het korrelige SCC-karakter) meekomen
    const U = 4, M = N * U, HARM = 48;
    const re = new Float32Array(HARM + 1), im = new Float32Array(HARM + 1);
    for (let k = 1; k <= HARM; k++) {
      let a = 0, b = 0;
      for (let m = 0; m < M; m++) {
        const v = s[(m / U) | 0], ph = 2 * Math.PI * k * m / M;
        a += v * Math.cos(ph); b += v * Math.sin(ph);
      }
      re[k] = a * 2 / M; im[k] = b * 2 / M;
    }
    return ctx.createPeriodicWave(re, im);
  }

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
    for (const k in WAVES) waves[k] = buildWave(WAVES[k]);
    // PSG-achtige ruis: sample-and-hold geeft het 'krakerige' AY-3-8910 geluid
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < d.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; }
    return true;
  }

  function unlock() { if (init() && ctx.state === 'suspended') ctx.resume(); }

  // ---------- stemmen ----------
  function tone(dest, t, dur, freq, wave, vol, env = {}) {
    const o = ctx.createOscillator();
    if (waves[wave]) o.setPeriodicWave(waves[wave]); else o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    const a = env.a ?? 0.004, d = env.d ?? 0.12, s = env.s ?? 0.6, r = env.r ?? 0.05;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(vol, t + a);
    gn.gain.setTargetAtTime(vol * s, t + a, d / 3);
    gn.gain.setTargetAtTime(0, t + dur, r / 3);
    if (env.vib && dur > 0.22) {
      // vertraagde vibrato, typisch voor Konami-leads
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.8;
      lg.gain.setValueAtTime(0, t);
      lg.gain.setValueAtTime(0, t + 0.16);
      lg.gain.linearRampToValueAtTime(freq * env.vib, t + 0.36);
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + r * 3 + 0.05);
    }
    o.connect(gn); gn.connect(dest);
    o.start(t); o.stop(t + dur + r * 3 + 0.05);
  }

  function noiseHit(dest, t, dur, vol, f0, f1, type = 'bandpass') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = 0.8;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(gn); gn.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  function kick(dest, t, vol) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(gn); gn.connect(dest);
    o.start(t); o.stop(t + 0.2);
  }

  const DRUM = {
    k: (d, t, v) => kick(d, t, v * 1.6),
    s: (d, t, v) => { noiseHit(d, t, 0.14, v * 1.1, 2500, 900); kick(d, t, v * 0.35); },
    h: (d, t, v) => noiseHit(d, t, 0.035, v * 0.45, 9000, 7000, 'highpass'),
    o: (d, t, v) => noiseHit(d, t, 0.16, v * 0.4, 8000, 6000, 'highpass'),
  };

  // ---------- sequencer ----------
  function playSong(def, onEnd) {
    if (!init()) return;
    stopSong();
    const bus = ctx.createGain();
    bus.connect(musicBus);
    const idx = new Array(def.length);
    def.ch.forEach(c => c.ev.forEach(e => {
      const s = ((e.s % def.length) + def.length) % def.length;
      (idx[s] || (idx[s] = [])).push([c, e]);
    }));
    song = { def, bus, idx, step: 0, next: ctx.currentTime + 0.08, dt: 60 / def.bpm / 4, onEnd };
    song.timer = setInterval(pump, 25);
    pump();
  }

  function pump() {
    const s = song;
    if (!s) return;
    while (s.next < ctx.currentTime + 0.15) {
      const list = s.idx[s.step];
      if (list) for (const [c, e] of list) {
        const vol = c.vol * (e.v ?? 1);
        if (c.drum) DRUM[e.n](s.bus, s.next, vol);
        else tone(s.bus, s.next, e.d * s.dt * (c.gate ?? 0.9), mtof(e.n), c.wave, vol, c.env);
      }
      s.next += s.dt;
      if (++s.step >= s.def.length) {
        if (s.def.loop) s.step = 0;
        else {
          clearInterval(s.timer); song = null;
          if (s.onEnd) setTimeout(s.onEnd, Math.max(0, (s.next - ctx.currentTime) * 1000));
          return;
        }
      }
    }
  }

  function stopSong() {
    if (!song) return;
    clearInterval(song.timer);
    const b = song.bus;
    b.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    setTimeout(() => b.disconnect(), 400);
    song = null;
  }

  // ---------- MML-parser ----------
  // o<n> octaaf, < > octaaf omlaag/omhoog, l<n> standaardlengte, r rust,
  // c..b met + / # / - , lengte 1/2/4/8/16 met punt(en), ^<len> verlengt vorige noot.
  function mml(str) {
    const ev = [], s = str.toLowerCase();
    let t = 0, L = 4, o = 4, i = 0;
    const num = () => { const m = s.slice(i).match(/^\d+/); if (m) { i += m[0].length; return +m[0]; } return null; };
    const len = () => {
      let st = 16 / (num() || L), add = st / 2;
      while (s[i] === '.') { st += add; add /= 2; i++; }
      return st;
    };
    while (i < s.length) {
      const c = s[i++];
      if ('cdefgab'.includes(c)) {
        let n = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[c];
        while (s[i] === '+' || s[i] === '#') { n++; i++; }
        while (s[i] === '-') { n--; i++; }
        const d = len();
        ev.push({ s: t, d, n: 12 * (o + 1) + n });
        t += d;
      } else if (c === 'r') t += len();
      else if (c === '^') { const d = len(); ev[ev.length - 1].d += d; t += d; }
      else if (c === 'o') o = num();
      else if (c === '<') o--;
      else if (c === '>') o++;
      else if (c === 'l') L = num();
    }
    ev.total = t;
    return ev;
  }

  // ---------- generatoren voor begeleiding ----------
  const CH = {
    Dm: [2, [0, 3, 7]], D: [2, [0, 4, 7]], C: [0, [0, 4, 7]], C7: [0, [0, 4, 7, 10]],
    Bb: [10, [0, 4, 7]], A: [9, [0, 4, 7]], A7: [9, [0, 4, 7, 10]], F: [5, [0, 4, 7]],
    Gm: [7, [0, 3, 7]], Am: [9, [0, 3, 7]], Em: [4, [0, 3, 7]], B: [11, [0, 4, 7]],
    B7: [11, [0, 4, 7, 10]],
  };
  // halve maat = 8 zestienden
  function bassLine(chords, base = 36, sixteenths = false) {
    const ev = [];
    chords.forEach((c, i) => {
      const root = base + CH[c][0];
      if (sixteenths) for (let k = 0; k < 8; k++) ev.push({ s: i * 8 + k, d: 1, n: root + (k % 4 === 2 ? 12 : 0), v: k % 2 ? 0.75 : 1 });
      else for (let k = 0; k < 4; k++) ev.push({ s: i * 8 + k * 2, d: 2, n: root + (k % 2 ? 12 : 0) });
    });
    return ev;
  }
  function arpLine(chords, base = 60) {
    const ev = [];
    chords.forEach((c, i) => {
      let r = CH[c][0]; if (r >= 7) r -= 12;
      const tones = [...CH[c][1], 12];
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let k = 0; k < 8; k++) ev.push({ s: i * 8 + k, d: 1, n: base + r + tones[order[k] % tones.length] });
    });
    return ev;
  }
  function padLine(chords, base = 60, which = 1) {
    return chords.map((c, i) => {
      let r = CH[c][0]; if (r >= 7) r -= 12;
      return { s: i * 8, d: 8, n: base + r + CH[c][1][which] };
    });
  }
  function drumLine(bars, boss = false) {
    const ev = [];
    for (let b = 0; b < bars; b++) {
      const o = b * 16, fill = (b % 8) === 7;
      for (let k = 0; k < 16; k++) {
        if (fill && k >= 8) { if (k % 2 === 0 || k >= 12) ev.push({ s: o + k, n: 's', v: 0.6 + k / 40 }); continue; }
        if (k === 0 || k === 8 || (boss && (k === 6 || k === 14 || k === 10))) ev.push({ s: o + k, n: 'k' });
        if (k === 4 || k === 12) ev.push({ s: o + k, n: 's' });
        if (boss ? true : k % 2 === 0) ev.push({ s: o + k, n: k % 4 === 2 ? 'o' : 'h', v: k % 4 === 0 ? 1 : 0.6 });
      }
    }
    return ev;
  }
  const echo = (ev, delay) => ev.map(e => ({ s: e.s + delay, d: e.d, n: e.n }));

  // ---------- muziek ----------
  const LEAD_ENV = { a: 0.005, d: 0.25, s: 0.75, r: 0.06, vib: 0.012 };
  const PLUCK = { a: 0.002, d: 0.09, s: 0.25, r: 0.03 };
  const BASS_ENV = { a: 0.003, d: 0.1, s: 0.55, r: 0.03 };
  const PAD_ENV = { a: 0.04, d: 0.4, s: 0.7, r: 0.1, vib: 0.006 };

  // Stage-thema: heroïsch D-mineur, 16 maten
  const STAGE_LEAD = mml(
    'o5 l8 d4 a4 g f e d | c4 e f d2 | d4 a4 b- a g a | f4. e d2 |' +
    'd4 a4 g f e d | c4 e g >c4< b- g | a4 f a >d4 c+< a | >d2.< r4 |' +
    'f4 g a b-4 a g | a4 f d e2 | g4 a b- >c4< b- a | b-4 g e f2 |' +
    'f g a b- >c d e f< | >e4 d c d4< a4 | b-4 a g a4 c+4 | d2. r4');
  const STAGE_CHORDS = ['Dm', 'Dm', 'C', 'Dm', 'Bb', 'Bb', 'Dm', 'Dm', 'Dm', 'Dm', 'C', 'C7', 'F', 'A7', 'Dm', 'Dm',
    'Gm', 'Gm', 'Dm', 'A', 'C', 'C7', 'C7', 'F', 'F', 'F', 'Am', 'Dm', 'Gm', 'A7', 'Dm', 'Dm'];

  // Eindbaas: opgejaagd E-mineur, 8 maten
  const BOSS_LEAD = mml(
    'o5 l8 e b e >c< b a g f+ | g e f+ d+ e4 b4 | e b e >c d c< b a | b4 >c4 d+4 e4< |' +
    '>e d c< b a g f+ g | a f+ d+ f+ b2 | >c< b a g f+ e d+ f+ | e2 d+4 f+4');
  const BOSS_CHORDS = ['Em', 'Em', 'Em', 'B7', 'Em', 'Am', 'B7', 'B7', 'C', 'Am', 'B7', 'B7', 'Am', 'B7', 'Em', 'B7'];

  const TRACKS = {
    stage: {
      bpm: 150, length: 256, loop: true, ch: [
        { wave: 'lead', vol: 0.30, env: LEAD_ENV, ev: STAGE_LEAD },
        { wave: 'pad', vol: 0.10, env: LEAD_ENV, ev: echo(STAGE_LEAD, 3) },
        { wave: 'bass', vol: 0.34, env: BASS_ENV, gate: 0.8, ev: bassLine(STAGE_CHORDS) },
        { wave: 'pulse', vol: 0.07, env: PLUCK, ev: arpLine(STAGE_CHORDS, 72) },
        { wave: 'pad', vol: 0.09, env: PAD_ENV, gate: 0.98, ev: padLine(STAGE_CHORDS, 60) },
        { drum: true, vol: 0.32, ev: drumLine(16) },
      ],
    },
    boss: {
      bpm: 168, length: 128, loop: true, ch: [
        { wave: 'lead', vol: 0.30, env: LEAD_ENV, ev: BOSS_LEAD },
        { wave: 'bell', vol: 0.09, env: LEAD_ENV, ev: echo(BOSS_LEAD, 2).map(e => ({ ...e, n: e.n - 12 })) },
        { wave: 'bass', vol: 0.34, env: BASS_ENV, gate: 0.7, ev: bassLine(BOSS_CHORDS, 36, true) },
        { wave: 'pulse', vol: 0.07, env: PLUCK, ev: arpLine(BOSS_CHORDS, 76) },
        { wave: 'pad', vol: 0.09, env: PAD_ENV, gate: 0.98, ev: padLine(BOSS_CHORDS, 64, 2) },
        { drum: true, vol: 0.34, ev: drumLine(8, true) },
      ],
    },
    start: {
      bpm: 140, length: 30, loop: false, ch: [
        { wave: 'lead', vol: 0.32, env: LEAD_ENV, ev: mml('o5 l8 d a >d< a >f4 e4 d2') },
        { wave: 'pad', vol: 0.14, env: LEAD_ENV, ev: mml('o5 l8 r a >d f a4 g4 f+2') },
        { wave: 'bass', vol: 0.34, env: BASS_ENV, ev: mml('o3 l8 d >d< d >d< b- >b-< a >a< d2') },
        { drum: true, vol: 0.3, ev: [{ s: 0, n: 'k' }, { s: 8, n: 's' }, { s: 12, n: 's' }, { s: 14, n: 's' }, { s: 16, n: 'k' }, { s: 16, n: 'o' }] },
      ],
    },
    clear: {
      bpm: 150, length: 52, loop: false, ch: [
        { wave: 'lead', vol: 0.32, env: LEAD_ENV, ev: mml('o4 l8 a >d f+ a l4 >d< a8 >d8 l2 f+ l8 e d c+ e l1 d') },
        { wave: 'pad', vol: 0.14, env: PAD_ENV, ev: mml('o4 l8 r4 a >d l4 f+ f+8 a8 l2 a l8 g f+ e g l1 f+') },
        { wave: 'bass', vol: 0.34, env: BASS_ENV, ev: mml('o3 l4 d a d a d2 a2 d1') },
        { drum: true, vol: 0.3, ev: [0, 8, 16, 24, 32].map(s => ({ s, n: 'k' })).concat([4, 12, 20, 28].map(s => ({ s, n: 's' }))) },
      ],
    },
    gameover: {
      bpm: 100, length: 52, loop: false, ch: [
        { wave: 'lead', vol: 0.3, env: LEAD_ENV, ev: mml('o5 l4 a g f e l2 d c+ l1 d') },
        { wave: 'pad', vol: 0.12, env: PAD_ENV, ev: mml('o4 l2 f e d e l1 f') },
        { wave: 'bass', vol: 0.32, env: BASS_ENV, ev: mml('o3 l2 d c <b- a l1 >d') },
      ],
    },
  };

  // ---------- geluidseffecten (PSG-stijl) ----------
  function sweep(type, f0, f1, dur, vol, wave) {
    if (!ctx || muted) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), gn = ctx.createGain();
    if (wave) o.setPeriodicWave(waves[wave]); else o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn); gn.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, f0, f1) { if (ctx && !muted) noiseHit(sfxBus, ctx.currentTime, dur, vol, f0, f1, 'lowpass'); }
  function arp(notes, step, vol, wave) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    notes.forEach((n, i) => tone(sfxBus, t + i * step, step * 0.9, mtof(n), wave, vol, { a: 0.002, d: 0.05, s: 0.7, r: 0.02 }));
  }

  const sfx = {
    shoot: () => sweep('square', 1400, 500, 0.06, 0.10),
    fire: () => { sweep('square', 700, 160, 0.09, 0.10); noise(0.08, 0.12, 3000, 800); },
    blade: () => sweep('sawtooth', 300, 1500, 0.12, 0.08),
    flame: () => noise(0.12, 0.18, 5000, 600),
    hit: () => sweep('square', 320, 90, 0.05, 0.12),
    crystal: () => sweep('square', 1800, 2400, 0.04, 0.09),
    explode: () => noise(0.35, 0.4, 2500, 100),
    big: () => { noise(1.0, 0.6, 1800, 50); sweep('sine', 130, 30, 0.6, 0.5); },
    power: () => arp([72, 76, 79, 84, 88], 0.05, 0.2, 'pulse'),
    feather: () => arp([84, 88, 91, 96, 91, 96], 0.04, 0.18, 'bell'),
    phoenix: () => arp([60, 64, 67, 72, 76, 79, 84, 88, 91, 96], 0.035, 0.22, 'lead'),
    die: () => { sweep('square', 900, 50, 0.8, 0.2); noise(0.6, 0.3, 1500, 100); },
    roar: () => { sweep('sawtooth', 95, 38, 1.3, 0.3); noise(1.3, 0.3, 700, 90); },
    eshot: () => sweep('triangle', 900, 380, 0.05, 0.07),
    shield: () => sweep('square', 200, 900, 0.12, 0.13),
    pause: () => arp([76, 72], 0.06, 0.2, 'pulse'),
    extend: () => arp([72, 76, 79, 84, 79, 84], 0.07, 0.2, 'lead'),
  };

  return {
    unlock, playSong, stopSong, sfx, TRACKS,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    get muted() { return muted; },
    pause() { if (ctx) ctx.suspend(); },
    resume() { if (ctx) ctx.resume(); },
  };
})();
