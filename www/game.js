/* Coast to Coast — a 60-second, 50-state road trip. No dependencies. */
(() => {
  'use strict';

  // ---------- Easy-to-edit settings ----------
  const BRAND = 'DLR50';      // the product
  const COMPANY = 'DLRdmv';   // the company
  const EVENT = 'NADA Show 2027';
  const CTA = 'Out-of-state titling, done in days, not months. Get a demo at dlr50.com.';
  const PLATE = 'DLR50';      // text on the car's license plate
  const BUILD = 'v13';         // shown at the bottom of the menu so you can tell which version a phone has loaded
  const RUN_SECONDS = 90;      // also the length of the temp tag, one day per second
  // Shared leaderboard: paste the web-app URL from tools/leaderboard-apps-script.gs here.
  // Left empty, scores are kept on each device only.
  const LEADERBOARD_URL = 'https://script.google.com/macros/s/AKfycbzsyOw5PdQncpDxe5r4MZOq8ffiLWyVVcnJaP_rZ_LxjrxyDlMxTmdcu0cz_mk0kC32MQ/exec';
  const MAX_HITS = 4;         // hurdles the car can take before it is totaled
  const AUTOPILOT_SECONDS = 4;

  // The route: a real drive from Northern California to Orlando in which every state borders
  // the one before it. Two short pass-throughs are not checkpoints (Maine to Massachusetts via
  // the New Hampshire coast, Connecticut to New Jersey via New York City). Hawaii and Alaska
  // cannot be driven to, so those deals go by ship and by ferry. Each entry: name, scenery, note.
  const ROUTE = [
    ['California', 'coast'], ['Hawaii', 'coast', 'BY SHIP FROM OAKLAND'], ['Oregon', 'rain'], ['Washington', 'rain'],
    ['Alaska', 'snow', 'BY FERRY FROM BELLINGHAM'], ['Idaho', 'forest'], ['Montana', 'forest'], ['Wyoming', 'forest'],
    ['Utah', 'desert'], ['Nevada', 'desert'], ['Arizona', 'desert'], ['New Mexico', 'desert'], ['Colorado', 'forest'],
    ['Kansas', 'plains'], ['Oklahoma', 'plains'], ['Texas', 'plains'], ['Louisiana', 'south'], ['Arkansas', 'south'],
    ['Missouri', 'plains'], ['Nebraska', 'night'], ['South Dakota', 'night'], ['North Dakota', 'night'],
    ['Minnesota', 'night'], ['Wisconsin', 'plains'], ['Iowa', 'plains'], ['Illinois', 'plains'], ['Indiana', 'plains'],
    ['Michigan', 'plains'], ['Ohio', 'plains'], ['Pennsylvania', 'autumn'], ['New York', 'autumn'], ['Vermont', 'autumn'],
    ['New Hampshire', 'autumn'], ['Maine', 'autumn'], ['Massachusetts', 'autumn'], ['Rhode Island', 'autumn'],
    ['Connecticut', 'autumn'], ['New Jersey', 'autumn'], ['Delaware', 'autumn'], ['Maryland', 'autumn'],
    ['West Virginia', 'autumn'], ['Kentucky', 'south'], ['Virginia', 'south'], ['North Carolina', 'south'],
    ['South Carolina', 'south'], ['Georgia', 'dusk'], ['Tennessee', 'dusk'], ['Mississippi', 'dusk'], ['Alabama', 'dusk'],
    ['Florida', 'florida'],
  ];
  const STATES = ROUTE.map((r) => r[0]);
  // A landmark that stands beside the road once in each of these states.
  const LANDMARKS = { California: 'bridge', Washington: 'needle', Utah: 'butte', Arizona: 'butte', Texas: 'derrick', Oklahoma: 'derrick',
    Missouri: 'arch', Illinois: 'skyline', 'New York': 'liberty', Maine: 'lighthouse', Massachusetts: 'lighthouse',
    'Rhode Island': 'lighthouse', 'South Carolina': 'peach', Georgia: 'peach', Alabama: 'rocket', Florida: 'rocket' };
  const CLOSED = { label: 'CLOSED', msg: 'Window closed. Take a number!' };
  const SNAIL = { label: 'SNAIL MAIL', msg: 'Rear-ended the snail mail!' };

  // The story: one out-of-state deal is passed from desk to desk as the car crosses the country.
  // Each desk has its own headaches (in the words prospects use on sales calls), its own DLR50 fix
  // as a power-up, and one line for the recap on the results screen. `from` is the position in ROUTE.
  const DESKS = [
    { id: 'fni', name: 'F&I desk', short: 'F&I DESK', from: 0, tag: 'Quote it right. Sign it once.', power: 'accufee',
      fix: 'AccuFee™ quotes exact fees and Smart Forms flag every signature.',
      haz: [{ label: 'WRONG FEE', msg: "Not $800 — it's actually $925!" }, { label: 'GOOGLING IT', msg: 'Googling state rules and hoping…' },
        { label: 'RE-SIGN', msg: 'Missed signature. Customer has to come back.' }, { label: 'BLANK FORM', msg: 'Signed a blank form. Compliance problem.' }] },
    { id: 'title', name: 'Title desk', short: 'TITLE DESK', from: 12, tag: 'Build the packet. Beat the returns.', power: 'eqa',
      fix: 'eQA Corrections show exactly what to fix before the packet is mailed.',
      haz: [{ label: 'RETURNED', msg: 'Packet returned. Again.' }, { label: 'DUPE TITLE', msg: 'Duplicate title nightmare!' },
        { label: 'MORE HOOPS', msg: 'More hoops to jump through!' }, { label: 'TITLE BRAND', msg: 'Unknown title brand on the trade!' }] },
    { id: 'office', name: "Controller's office", short: 'CONTROLLER', from: 25, tag: 'Protect the profit.', power: 'lien',
      fix: 'Safety Margin™ covers the unknowns, so there is nothing to write off.',
      haz: [{ label: 'LATE PENALTY', msg: 'Late penalty. Who eats the cost?' }, { label: 'WRITE-OFF', msg: 'Another write-off this month.' },
        { label: 'LIEN ISSUE', msg: 'Lien not perfected. Funding at risk.' }, { label: 'CHASING $$', msg: 'Chasing the customer for a check.' }] },
    { id: 'gm', name: "GM's office", short: "GM'S OFFICE", from: 38, tag: 'Keep the customer happy.', power: 'timeline',
      fix: 'A live timeline answers “where are my plates?” in seconds.',
      haz: [{ label: 'NO ETA', msg: '“Where are my plates?!”' }, { label: 'ANGRY CALL', msg: 'Customer on line one. Again.' },
        { label: 'BAD REVIEW', msg: 'One star: “still no plates.”' }, { label: 'IN THE DARK', msg: 'Weeks with zero visibility.' }] },
  ];
  const deskIndex = (stateIdx) => { let i = 0; while (i < DESKS.length - 1 && stateIdx >= DESKS[i + 1].from) i++; return i; };
  // How each power-up looks and what it is called.
  const POWERS = {
    accufee: { a: '#8dffb4', b: '#1f9e5c', dark: '#12703f', glow: [70, 214, 138], text: '$', small: 'ACCUFEE' },
    eqa: { a: '#ffc08a', b: '#e0641a', dark: '#a8480f', glow: [245, 138, 60], text: 'eQA', small: '' },
    lien: { a: '#d6c2ff', b: '#7a4fd6', dark: '#4b2c96', glow: [150, 110, 255], text: 'LIEN', small: 'VERIFIED' },
    timeline: { a: '#a8e4ff', b: '#1b8fc6', dark: '#0d5a86', glow: [60, 170, 230], text: 'ETA', small: 'TIMELINE' },
  };

  // States prospects call the hardest. They get more obstacles and double state-line points,
  // and a Fast Fact pops up as you enter. These come from sales-call notes, NOT verified
  // rules: have a title expert check each line before the show.
  const FAST_FACTS = {
    California: 'Smog and VIN checks, late fees',
    Colorado: 'Taxes are set county by county',
    Pennsylvania: 'No online title application',
    'Rhode Island': 'VIN check at a police station',
    'New Hampshire': 'Carbon-copy paper forms',
    'North Carolina': 'Fee math can take all day',
    Florida: 'Tax reciprocity rules',
  };

  // Shout-outs when a streak multiplier is reached (×2, ×3, ×4, ×5) and at state milestones.
  const CALLOUTS = ['Penny perfect!', 'Clean packet!', 'First-time approval!', 'Registration master!'];
  const MILESTONES = {
    10: ['10 states down', 'No Googling required.'],
    25: ['Halfway there', 'Herding cats like a pro.'],
    40: ['40 states titled', 'Hope-and-pray method not needed.'],
  };
  // Paint jobs, unlocked by total stars earned across runs. b = body shades, c = cabin, s = stripes.
  const PAINTS = [
    { id: 'blue', name: 'DLR Blue', need: 0, b: ['#7fd8fb', '#25aae2', '#1580b6', '#0d5a86'], c: ['#63cdf8', '#1b8fc6'], s: 'rgba(255,255,255,.92)' },
    { id: 'white', name: 'Temp Tag White', need: 2, b: ['#ffffff', '#eef1f6', '#c9d0dc', '#9aa3b3'], c: ['#f4f6fa', '#b9c1cf'], s: '#25aae2' },
    { id: 'beige', name: 'DMV Beige', need: 4, b: ['#f1e3c4', '#d9c49a', '#b89f72', '#8f7a55'], c: ['#e6d5b0', '#a8926a'], s: '#6b5a3c' },
    { id: 'navy', name: 'Midnight Navy', need: 7, b: ['#4a49a8', '#2b2a7a', '#1b1a58', '#101040'], c: ['#3a3990', '#17174f'], s: '#25aae2' },
    { id: 'gold', name: 'Safety Margin Gold', need: 10, b: ['#fff0a8', '#ffc533', '#e09a00', '#a86e00'], c: ['#ffe07a', '#c98a00'], s: '#23226b' },
  ];
  const STAR_AT = [15, 30, 50]; // states needed for 1, 2 and 3 stars

  // "I'm a…" picker on the menu; tailors the message on the results screen.
  const ROLES = [
    { id: 'clerk', label: 'Title Clerk', desk: 1, perk: 'Streak bonus builds faster. Titles count double at the Title desk.', streakStep: 3,
      line: 'Pre-filled forms and clear checklists mean fewer returns.' },
    { id: 'office', label: 'Controller', desk: 2, perk: "Start with one shield. Titles count double in the Controller's office.", startShields: 1,
      line: 'Fewer write-offs and full oversight of every deal.' },
    { id: 'finance', label: 'Finance', desk: 0, perk: 'Higher top speed. Titles count double at the F&I desk.', speed: 1.1,
      line: 'Exact fees at the point of sale, without slowing the deal.' },
    { id: 'gm', label: 'GM', desk: 3, perk: "Car takes one extra hit. Titles count double in the GM's office.", extraHits: 1,
      line: 'Fewer headaches for your team and a healthier bottom line.' },
  ];

  // The look of each kind of scenery used in ROUTE.
  const SUNSET = { top: [40, 32, 104], mid: [196, 84, 122], hor: [255, 176, 98], near: [38, 104, 82], far: [124, 138, 108],
    m1: [128, 74, 126], m2: [52, 48, 94], amp: 0.5, jag: 0.1, mesa: 0, sunY: 0.86, sunR: 1.9, sun: [255, 226, 160], cloud: 0.75, warm: 1 };
  const BIOME = {
    coast: { kinds: ['palm', 'palm', 'palm', 'rock'],
      top: [22, 112, 214], mid: [86, 172, 240], hor: [206, 236, 250], near: [224, 190, 124], far: [242, 224, 172],
      m1: [150, 190, 222], m2: [104, 158, 176], amp: 0.8, jag: 0.15, mesa: 0, sunY: 0.5, sunR: 1, sun: [255, 249, 222], cloud: 0.9, warm: 0 },
    snow: { fx: 'snow', kinds: ['snowpine', 'snowpine', 'snowpine', 'rock'],
      top: [52, 124, 200], mid: [150, 196, 232], hor: [234, 243, 250], near: [222, 233, 245], far: [244, 248, 252],
      m1: [200, 216, 236], m2: [148, 174, 206], amp: 1.5, jag: 0.85, mesa: 0, sunY: 0.62, sunR: 0.9, sun: [255, 252, 240], cloud: 0.9, warm: 0 },
    forest: { kinds: ['pine', 'pine', 'pine', 'oak'],
      top: [34, 102, 186], mid: [106, 166, 218], hor: [216, 236, 238], near: [50, 126, 70], far: [122, 178, 124],
      m1: [136, 170, 196], m2: [56, 104, 98], amp: 1.3, jag: 0.75, mesa: 0, sunY: 0.5, sunR: 0.9, sun: [255, 250, 230], cloud: 0.8, warm: 0 },
    desert: { kinds: ['cactus', 'cactus', 'rock', 'cactus'],
      top: [34, 112, 206], mid: [132, 186, 234], hor: [255, 224, 176], near: [198, 116, 62], far: [234, 172, 112],
      m1: [214, 150, 118], m2: [172, 92, 60], amp: 1.15, jag: 0.1, mesa: 1, sunY: 0.42, sunR: 1.1, sun: [255, 244, 200], cloud: 0.35, warm: 0.2 },
    plains: { kinds: ['hay', 'hay', 'barn', 'oak', 'turbine'],
      top: [40, 124, 224], mid: [116, 184, 246], hor: [226, 243, 253], near: [168, 166, 58], far: [216, 208, 122],
      m1: [156, 196, 178], m2: [128, 170, 96], amp: 0.35, jag: 0, mesa: 0, sunY: 0.45, sunR: 1, sun: [255, 250, 226], cloud: 1, warm: 0 },
    autumn: { kinds: ['maple', 'maple', 'pine', 'maple', 'oak'],
      top: [44, 112, 196], mid: [120, 176, 226], hor: [230, 238, 232], near: [84, 134, 60], far: [152, 178, 110],
      m1: [186, 158, 146], m2: [156, 98, 58], amp: 0.85, jag: 0.25, mesa: 0, sunY: 0.5, sunR: 1, sun: [255, 248, 224], cloud: 0.85, warm: 0 },
    south: { kinds: ['oak', 'oak', 'pine', 'oak', 'barn'],
      top: [52, 108, 198], mid: [156, 186, 222], hor: [255, 230, 186], near: [58, 130, 68], far: [142, 180, 110],
      m1: [156, 182, 170], m2: [70, 120, 94], amp: 0.45, jag: 0.05, mesa: 0, sunY: 0.64, sunR: 1.35, sun: [255, 236, 188], cloud: 0.8, warm: 0.35 },
    rain: { fx: 'rain', kinds: ['pine', 'pine', 'pine', 'oak'],
      top: [58, 78, 108], mid: [112, 134, 158], hor: [182, 196, 204], near: [40, 104, 66], far: [96, 140, 112],
      m1: [112, 134, 152], m2: [44, 82, 80], amp: 1.3, jag: 0.75, mesa: 0, sunY: 0.5, sunR: 0.6, sun: [214, 222, 230], cloud: 1, warm: 0 },
    night: { fx: 'night', kinds: ['hay', 'barn', 'oak', 'turbine', 'hay'],
      top: [6, 10, 36], mid: [18, 26, 68], hor: [58, 60, 112], near: [34, 50, 44], far: [44, 58, 66],
      m1: [30, 36, 72], m2: [16, 20, 48], amp: 0.35, jag: 0, mesa: 0, sunY: 0.36, sunR: 0.8, sun: [226, 232, 255], cloud: 0.12, warm: 0 },
    dusk: { kinds: ['oak', 'oak', 'pine', 'oak'], ...SUNSET },
    florida: { kinds: ['palm', 'palm', 'oak', 'palm'], ...SUNSET },
  };
  const BLEND = 0.25; // share of a state over which the scenery fades into the next one

  // ---------- World tuning ----------
  const K = 0.035;            // perspective strength
  const SPAWN_D = 120;       // distance at which things appear
  const BASE_V = 38;         // world units / second at speed 1
  const ROW_GAP = 36;        // distance between rows of objects
  const STATE_LEN = 86;      // distance between state lines
  const SHIELD_PATH = new Path2D('M12 2 21 5v6c0 6-4 10-9 12C7 21 3 17 3 11V5z');
  const DISPLAY = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif';
  const font = (px, weight = 800) => `${weight >= 700 ? 'italic ' : ''}${weight} ${px}px ${DISPLAY}`;

  const $ = (id) => document.getElementById(id);
  const cv = $('game');
  const ctx = cv.getContext('2d');
  const el = {
    hud: $('hud'), score: $('score'), time: $('time'), slots: $('slots'), mult: $('mult'),
    stateName: $('stateName'), stateCount: $('stateCount'), bar: $('bar'), banner: $('banner'),
    menu: $('menu'), over: $('over'), board: $('board'), mute: $('mute'),
  };

  let W = 0, H = 0, horizon = 0, playerY = 0, roadHalf = 0;
  let mode = 'menu';
  let g = null;              // current run
  let attract = 0;           // road scroll while on menus
  let cam = 0;               // 0 = menu framing, 1 = driving framing
  let lastSaved = -1;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const rgb = (c, a) => (a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  // ---------- Sound ----------
  let ac = null;
  let muted = store.get('c2c.muted', false);
  function tone(freq, dur, type = 'square', vol = 0.06, delay = 0) {
    if (muted || !ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), a = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    a.gain.setValueAtTime(vol, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, cutoff) {
    if (muted || !ac) return;
    const n = (ac.sampleRate * dur) | 0, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), a = ac.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; a.gain.value = vol;
    src.connect(f).connect(a).connect(ac.destination); src.start();
  }
  // Engine: two oscillators through a filter; pitch and brightness follow the car's speed.
  let eng = null;
  function engineStart() {
    if (!ac || eng) return;
    try {
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), gn = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.Q.value = 2; gn.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(gn).connect(ac.destination); o1.start(); o2.start();
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain();
      ns.buffer = nb; ns.loop = true; nf.type = 'bandpass'; nf.Q.value = 0.6; ng.gain.value = 0;
      ns.connect(nf).connect(ng).connect(ac.destination); ns.start();
      eng = { o1, o2, f, gn, nf, ng };
    } catch (e) { eng = null; }
  }
  function engineSet(speed, on) {
    if (!eng) return;
    const t = ac.currentTime, hz = (44 + speed * 36) * (1 + Math.sin(t * 9) * 0.015);
    eng.nf.frequency.setTargetAtTime(380 + speed * 520, t, 0.15);
    eng.ng.gain.setTargetAtTime(on && !muted ? 0.01 + speed * 0.016 : 0, t, 0.15);
    eng.o1.frequency.setTargetAtTime(hz, t, 0.1);
    eng.o2.frequency.setTargetAtTime(hz * 0.5, t, 0.1);
    eng.f.frequency.setTargetAtTime(240 + speed * 330, t, 0.12);
    eng.gn.gain.setTargetAtTime(on && !muted ? 0.055 : 0, t, 0.15);
  }
  // Theme song: plays from the first tap and loops. If the file is missing, the synth loop below is used during runs.
  const SONG_URLS = ['audio/perfect-it.mp3', 'audio/PERFECT%20IT.mp3', 'audio/Perfect%20It.mp3', 'audio/perfect%20it.mp3'];
  let song = null, songReady = false, songNote = '';
  (function loadSong(i) {
    if (i >= SONG_URLS.length) { song = null; return; }
    try {
      const a = new Audio(SONG_URLS[i]); a.loop = true; a.volume = 0.42; a.preload = 'auto';
      a.setAttribute('playsinline', ''); a.style.display = 'none'; document.body.appendChild(a);
      a.addEventListener('canplay', () => { songReady = true; }, { once: true });
      a.addEventListener('error', () => { songNote = `could not load ${SONG_URLS[i]}`; a.remove(); if (song === a) song = null; loadSong(i + 1); }, { once: true });
      song = a;
    } catch (e) { song = null; }
  })(0);
  function songPlay() {
    // iPhones do not load audio until a tap asks it to play, so do not wait for it to be "ready" first.
    if (!song || muted || !song.paused || document.hidden) return;
    const started = song.play();
    if (started && started.then) started.then(() => { songNote = ''; musicStop(); }).catch((e) => { songNote = `play refused: ${e && e.name}`; });
  }
  function songPause() { if (song) song.pause(); }

  // Fallback music: a simple driving loop, scheduled a little ahead of time.
  let music = null;
  function musicStart() {
    if (song) return songPlay();
    if (!ac || music) return;
    try {
      const out = ac.createGain(); out.gain.value = 0.55; out.connect(ac.destination);
      const roots = [110, 87.31, 130.81, 98], arp = [1, 1.5, 2, 1.5, 3, 2, 1.5, 2], spb = 60 / 126 / 2;
      let step = 0, next = ac.currentTime + 0.1;
      const note = (f, t, dur, type, vol, cut) => {
        const o = ac.createOscillator(), a = ac.createGain(), lp = ac.createBiquadFilter();
        o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cut;
        a.gain.setValueAtTime(vol, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(lp).connect(a).connect(out); o.start(t); o.stop(t + dur + 0.02);
      };
      const tick = () => {
        if (next < ac.currentTime) next = ac.currentTime + 0.05;
        while (next < ac.currentTime + 0.25) {
          const r = roots[Math.floor(step / 8) % 4];
          if (!muted) {
            note(r, next, spb * 0.9, 'sawtooth', 0.05, 500);
            note(r * 2 * arp[step % 8], next, spb * 0.7, 'triangle', 0.03, 2400);
            if (step % 4 === 2) note(r * 4, next, spb * 0.4, 'square', 0.01, 3000);
          }
          step++; next += spb;
        }
      };
      music = { id: setInterval(tick, 80), out };
    } catch (e) { music = null; }
  }
  function musicStop() {
    if (!music) return;
    clearInterval(music.id);
    try { music.out.gain.setTargetAtTime(0, ac.currentTime, 0.08); } catch (e) { /* ignore */ }
    music = null;
  }
  const buzz = (pattern) => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported */ } };

  const sfx = {
    smash: () => { noise(0.22, 0.28, 2600); tone(120, 0.1, 'square', 0.05); },
    crash: () => { noise(0.8, 0.4, 1100); tone(70, 0.6, 'sawtooth', 0.1); },
    title: (m) => { tone(620 + m * 70, 0.07, 'triangle', 0.09); tone((620 + m * 70) * 1.5, 0.1, 'triangle', 0.07, 0.05); },
    skid: () => noise(0.16, 0.06, 6000),
    whoosh: () => noise(0.3, 0.07, 900),
    shield: (n) => tone(520 + n * 180, 0.16, 'square', 0.06),
    cover: () => { tone(330, 0.12, 'triangle', 0.09); tone(247, 0.2, 'triangle', 0.08, 0.1); },
    hit: () => { tone(140, 0.25, 'sawtooth', 0.1); tone(90, 0.35, 'square', 0.07, 0.05); },
    state: () => { tone(880, 0.07, 'sine', 0.07); tone(1175, 0.1, 'sine', 0.07, 0.07); },
    jackpot: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.08)),
    finish: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, i * 0.12)),
    end: () => { tone(392, 0.2, 'triangle', 0.09); tone(330, 0.3, 'triangle', 0.09, 0.18); },
  };
  function unlockAudio() {
    try {
      // Play like a game or music app, so the iPhone's ring/silent switch does not mute the sound effects.
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* no audio */ }
  }
  const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500h3.500L12 5.500v13l-4.500-4H4z" fill="currentColor"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500h3.500L12 5.500v13l-4.500-4H4z" fill="currentColor"/><path d="m16 9.500 5 5m0-5-5 5"/></svg>';
  function paintMute() { el.mute.innerHTML = muted ? ICON_OFF : ICON_ON; }

  // ---------- Layout / projection ----------
  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    roadHalf = Math.min(W * 0.43, 230);
    frameCamera();
  }
  function frameCamera() {
    const e = cam * cam * (3 - 2 * cam);
    horizon = H * lerp(0.29, 0.3, e);
    playerY = H * lerp(0.43, 0.8, e);
  }
  function proj(d) {
    const s = 1 / (1 + Math.max(d, -14) * K);
    return { s, y: horizon + (playerY - horizon) * s };
  }
  let curveNow = 0; // how hard the road ahead bends: -1 (left) to 1 (right)
  const cxAt = (s) => W / 2 + curveNow * roadHalf * 1.5 * (1 - Math.min(s, 1)) ** 2; // road centre at a given depth scale
  const laneX = (lane, s) => cxAt(s) + (lane - 1) * (roadHalf * 2 / 3) * s;

  function biomeAt(p) {
    const i = clamp(Math.floor(p), 0, ROUTE.length - 1), f = p - Math.floor(p);
    const cur = BIOME[ROUTE[i][1]], next = BIOME[ROUTE[Math.min(i + 1, ROUTE.length - 1)][1]];
    if (cur === next || f <= 1 - BLEND) return cur;
    let t = (f - (1 - BLEND)) / BLEND;
    t = t * t * (3 - 2 * t);
    const out = { kinds: t > 0.5 ? next.kinds : cur.kinds, fx: t > 0.5 ? next.fx : cur.fx };
    for (const k in cur) {
      if (k === 'kinds' || k === 'fx') continue;
      out[k] = Array.isArray(cur[k]) ? mix(cur[k], next[k], t) : lerp(cur[k], next[k], t);
    }
    return out;
  }

  // ---------- Run lifecycle ----------
  function newRun() {
    g = {
      t: 0, intro: 1.2, timeLeft: RUN_SECONDS, dist: 0, score: 0,
      lane: 1, tx: 1, px: 1, speed: 0.45, clean: 0,
      health: MAX_HITS + (role().extraHits || 0), maxHealth: MAX_HITS + (role().extraHits || 0), crashed: false, expired: false, spin: 0, hint: 4,
      deskHits: [0, 0, 0, 0], deskTitles: [0, 0, 0, 0],
      magnet: 0, nextPower: 7, nextTruck: 5, plazaAt: -1, lmDone: -1, skid: 0, toldDamage: false, closeCalls: 0, hits: 0, bestMult: 1, warned: false,
      curve: 0, curveTarget: 0, curveLeft: 320, heading: 0,
      state: 0, toLine: STATE_LEN, shields: role().startShields || 0, autopilot: 0, jackpots: 0,
      streak: 0, mult: 1, titles: 0, invuln: 0, shake: 0, flash: 0,
      objs: [], scen: [], parts: [], toasts: [], queue: [],
      rowAcc: 0, scenAcc: 0, rowN: 0, lastTwo: false, nextShield: 4,
      finished: false, endDelay: 0, sinceLine: 9,
    };
    toast('NorCal → Orlando. GO!', '#fff', 1.9, false, 'Title all 50 before the temp tag expires');
    toast(`FIRST STOP: ${DESKS[0].name.toUpperCase()}`, '#ffc533', 2, false, DESKS[0].tag);
  }

  let howThenPlay = false;
  function showHow(thenPlay) {
    howThenPlay = thenPlay;
    el.menu.hidden = true; $('howto').hidden = false;
  }
  function start() {
    unlockAudio();
    if (!store.get('c2c.seenHow', false)) return showHow(true); // first run: show the rules once
    begin();
  }
  function begin() {
    unlockAudio();
    engineStart();
    musicStart();
    drag = null;
    newRun();
    buildHealth();
    mode = 'play';
    lastSaved = -1;
    el.menu.hidden = el.over.hidden = el.board.hidden = $('howto').hidden = $('paused').hidden = true;
    el.hud.hidden = false;
    el.mute.hidden = true;
    $('pause').hidden = false;
    paintHud(true);
  }
  function pause() {
    if (mode !== 'play' || g.finished) return;
    mode = 'paused';
    engineSet(0, false); musicStop(); songPause();
    $('paused').hidden = false; $('pause').hidden = true; el.mute.hidden = false;
  }
  function resume() {
    if (mode !== 'paused') return;
    mode = 'play';
    $('paused').hidden = true; $('pause').hidden = false; el.mute.hidden = true;
    musicStart();
  }
  function toMenu() {
    mode = 'menu';
    engineSet(0, false); musicStop();
    el.over.hidden = $('paused').hidden = el.hud.hidden = $('pause').hidden = true;
    el.menu.hidden = false; el.mute.hidden = false;
    paintPaints();
  }

  function endRun() {
    mode = 'over';
    engineSet(0, false); musicStop();
    $('pause').hidden = true;
    el.hud.hidden = true;
    el.mute.hidden = false;
    const n = g.state + 1;
    const rank = g.crashed ? 'Totaled by Red Tape' : n >= 50 ? "The Dealer's DMV" : n >= 42 ? 'Registration Master' : n >= 30 ? 'Unsung Hero of the Title Desk'
      : n >= 20 ? 'Herding Cats' : n >= 10 ? 'Googling Everything' : 'Hope-and-Pray Method';
    $('rank').textContent = rank;
    $('finalScore').textContent = fmt(g.score);
    $('finalStates').textContent = n >= 50
      ? `All 50 states titled with ${Math.ceil(g.timeLeft)} days left on the temp tag!`
      : g.crashed ? `Car totaled in ${STATES[g.state]} · ${n} of 50 states titled`
      : `Temp tag expired in ${STATES[g.state]} · ${n} of 50 states titled`;
    // Stars, personal best, run stats and paint unlocks
    const stars = STAR_AT.filter((t) => n >= t).length;
    [...$('stars').children].forEach((c, i) => { c.classList.remove('on'); if (i < stars) { void c.getBoundingClientRect(); c.classList.add('on'); } });
    const best = store.get('c2c.best', 0), score = Math.round(g.score);
    $('bestTag').hidden = !(score > best && best > 0);
    if (score > best) store.set('c2c.best', score);
    $('stats').textContent = `${g.titles} titles · best streak ×${g.bestMult} · ${g.jackpots} jackpot${g.jackpots === 1 ? '' : 's'} · ${g.closeCalls} close call${g.closeCalls === 1 ? '' : 's'}`;
    const before = store.get('c2c.stars', 0), after = before + stars;
    store.set('c2c.stars', after);
    const won = PAINTS.filter((pt) => pt.need > before && pt.need <= after);
    const nextPaint = PAINTS.find((pt) => pt.need > after);
    $('unlock').hidden = !(won.length || nextPaint);
    $('unlock').textContent = won.length ? `New paint unlocked: ${won.map((pt) => pt.name).join(', ')}. Pick it in the garage.`
      : nextPaint ? `${nextPaint.need - after} more star${nextPaint.need - after === 1 ? '' : 's'} unlocks ${nextPaint.name} paint.` : '';
    // Deal recap: how each desk fared, and what DLR50 does about it
    const recap = $('recap'); recap.textContent = '';
    const reached = deskIndex(g.state);
    DESKS.forEach((dk, i) => {
      const row = document.createElement('div'), head = document.createElement('b'), stat = document.createElement('span'), fix = document.createElement('p');
      const hits = g.deskHits[i];
      row.className = 'desk' + (i === role().desk ? ' home' : '') + (i > reached ? ' off' : hits ? ' hurt' : ' clean');
      head.textContent = dk.name;
      stat.textContent = i > reached ? 'not reached' : hits ? `${hits} hit${hits > 1 ? 's' : ''}` : 'clean';
      fix.textContent = dk.fix;
      row.append(head, stat, fix);
      recap.appendChild(row);
    });
    $('cta').textContent = `${role().line} Get a demo at dlr50.com.`;
    $('overBoard').hidden = true; // the top scores appear once this score is saved
    fetchRemote();
    $('saveForm').hidden = false;
    $('name').value = store.get('c2c.name', '');
    renderBoard($('overBoard'), 3, 'today');
    el.over.hidden = false;
  }

  // ---------- Leaderboard (stored on this device) ----------
  let remoteScores = store.get('c2c.remote', null);
  let pendingEntry = null; // the score just saved here, shown until the shared list includes it
  let boardScope = 'today'; // 'today' or 'all' (the whole event)
  const playedAt = (x) => (x.when ? Date.parse(x.when) : x.id > 1.5e12 ? x.id : 0);
  const isToday = (x) => new Date(playedAt(x)).toDateString() === new Date().toDateString();
  function scores(scope) {
    const all = allScores();
    return scope === 'today' ? all.filter(isToday) : all;
  }
  function allScores() {
    const local = store.get('c2c.scores', []);
    if (!LEADERBOARD_URL || !remoteScores) return local;
    const list = remoteScores.slice();
    if (pendingEntry && !list.some((x) => x.id === pendingEntry.id)) list.push(pendingEntry);
    return list.sort((a, b) => b.score - a.score);
  }
  async function fetchRemote() {
    if (!LEADERBOARD_URL) return;
    try {
      const list = await (await fetch(LEADERBOARD_URL, { cache: 'no-store' })).json();
      if (!Array.isArray(list)) return;
      remoteScores = list.slice(0, 200);
      store.set('c2c.remote', remoteScores);
      renderBoard($('overBoard'), 3, 'today'); renderBoard($('menuBoard'), 10);
    } catch (e) { /* offline: keep showing the last list we had */ }
  }
  // Tester feedback: goes to the same Google Sheet (a "Feedback" tab). Without one, it is handed to the
  // phone's share sheet or copied, so the tester can send it along themselves.
  async function sendFeedback(text, who) {
    const note = { type: 'feedback', text: text.slice(0, 1000), name: who.slice(0, 40), role: role().label, when: new Date().toISOString(),
      lastRun: g ? `${Math.round(g.score)} pts, ${g.state + 1}/50` : 'none' };
    if (LEADERBOARD_URL) {
      try {
        await fetch(LEADERBOARD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(note) });
        return 'Sent. Thank you!';
      } catch (e) { /* fall through */ }
    }
    const msg = `Coast to Coast feedback${note.name ? ' from ' + note.name : ''}: ${note.text}`;
    try { if (navigator.share) { await navigator.share({ text: msg }); return 'Thanks!'; } } catch (e) { /* cancelled */ }
    try { await navigator.clipboard.writeText(msg); return 'Copied. Paste it into a text or email to us.'; } catch (e) { return 'Could not send. Please tell us in person!'; }
  }
  function postRemote(entry) {
    if (!LEADERBOARD_URL) return;
    fetch(LEADERBOARD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(entry) })
      .then(fetchRemote).catch(() => {});
  }
  function saveScore(name) {
    const list = scores();
    const entry = { name, role: role().label, score: Math.round(g.score), states: g.state + 1, id: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    store.set('c2c.scores', list.slice(0, 25));
    store.set('c2c.name', name);
    lastSaved = entry.id;
    pendingEntry = entry;
    postRemote(entry);
  }
  function renderBoard(ol, limit, scope = boardScope) {
    const list = scores(scope).slice(0, limit);
    ol.textContent = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty'; li.textContent = scope === 'today' ? 'No scores yet today — set the pace.' : 'No scores yet — set the pace.';
      ol.appendChild(li);
      return;
    }
    list.forEach((s, i) => {
      const li = document.createElement('li');
      if (s.id === lastSaved) li.className = 'me';
      [['pos', i + 1], ['who', s.name], ['st', `${s.role ? s.role + ' · ' : ''}${s.states}/50`], ['pts', fmt(s.score)]].forEach(([c, v]) => {
        const sp = document.createElement('span');
        sp.className = c; sp.textContent = v;
        li.appendChild(sp);
      });
      ol.appendChild(li);
    });
  }

  // ---------- Gameplay ----------
  // On-screen messages: one small message (in a fixed bar under the HUD) and one big headline at most.
  function toast(text, color = '#fff', life = 1.1, big = false, sub = '') {
    const m = { text, sub, color, life, max: life, big };
    const cur = g.toasts.find((x) => x.big === big);
    if (!big && cur && cur.max - cur.life < 0.9) { // let the current one be read first, then show this
      g.queue.push(m); if (g.queue.length > 2) g.queue.shift();
      return;
    }
    g.toasts = g.toasts.filter((x) => x.big !== big);
    g.toasts.push(m);
  }
  function pop(text, color, lane) {
    g.parts = g.parts.filter((p) => !p.text); // one score pop at a time
    g.parts.push({ text, color, x: laneX(lane, 1), y: playerY - 110, vx: rnd(-12, 12), vy: -90, life: 0.8, max: 0.8 });
  }
  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(60, 260);
      g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rnd(0.3, 0.75), max: 0.75, color, r: rnd(2, 5.5) });
    }
  }
  function add(points, lane, color = '#fff') {
    g.score += points;
    if (lane != null) pop('+' + fmt(points), color, lane);
  }

  function spawnRow(d) {
    g.rowN++;
    if (g.rowN <= 1) return;
    const elapsed = RUN_SECONDS - g.timeLeft;
    const diff = clamp(Math.max(elapsed / RUN_SECONDS, g.state / (STATES.length - 1)), 0, 1);
    const calm = elapsed < 7; // opening stretch: titles and shields only
    const at = Math.min(STATES.length - 1, Math.floor(g.state + 1 - g.toLine / STATE_LEN + d / STATE_LEN));
    const tough = !!FAST_FACTS[STATES[at]]; // the state this row will be standing in
    const truck = g.objs.find((o) => o.truck && !o.done && o.d > -5);
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);

    // DMV checkpoint: the first row inside each tough state. Two windows closed, one open.
    const firstRowHere = tough && at !== g.plazaAt;
    if (tough) g.plazaAt = at;
    if (firstRowHere && at > 0 && at < STATES.length - 1 && !calm && !truck) {
      g.lastTwo = true;
      g.objs.push({ type: 'plaza', d, open: lanes[2] });
      for (let i = 0; i < 2; i++) g.objs.push({ type: 'haz', lane: lanes[i], d, hz: CLOSED });
      g.objs.push({ type: 'title', lane: lanes[2], d });
      return;
    }

    let nH = calm || Math.random() < (tough ? 0.08 : 0.28 - diff * 0.2) ? 0 : (!g.lastTwo && Math.random() < 0.04 + diff * diff * 0.42 + (tough ? 0.1 : 0) ? 2 : 1);
    if (truck) nH = Math.min(nH, 1); // never let a truck plus a row close every lane
    const free = lanes.slice(nH);
    g.lastTwo = nH === 2;
    for (let i = 0; i < nH; i++) g.objs.push({ type: 'haz', lane: lanes[i], d, hz: pick(DESKS[deskIndex(at)].haz) });

    const taken = new Set();
    if (!truck && !calm && elapsed > 12 && nH <= 1 && --g.nextTruck <= 0) { // slow snail-mail truck that lingers in its lane
      const l = free[free.length - 1];
      taken.add(l);
      g.objs.push({ type: 'haz', truck: true, rel: 0.5, lane: l, d, hz: SNAIL });
      g.nextTruck = 6 + ((Math.random() * 5) | 0);
    }
    const open = () => free.find((l) => !taken.has(l));
    if (--g.nextShield <= 0 && g.autopilot <= 0 && open() != null) {
      const l = open(); taken.add(l);
      g.objs.push({ type: 'shield', lane: l, d });
      g.nextShield = 4 + ((Math.random() * 3) | 0);
    }
    if (--g.nextPower <= 0 && open() != null) { // product power-ups; repairs only show up when the car is damaged
      const l = open(); taken.add(l);
      const damaged = g.health < g.maxHealth;
      g.objs.push({ type: 'power', kind: damaged && Math.random() < 0.6 ? 'eqa' : DESKS[deskIndex(at)].power, lane: l, d });
      g.nextPower = damaged ? 6 + ((Math.random() * 3) | 0) : 11 + ((Math.random() * 6) | 0);
    }
    for (const l of free) {
      if (!taken.has(l) && Math.random() < 0.6) g.objs.push({ type: 'title', lane: l, d });
    }
  }

  function steer(dir) { // one-lane nudge (keyboard taps and tests); touch uses drag steering below
    if (mode !== 'play' || g.finished) return;
    g.tx = clamp(Math.round(g.tx) + dir, 0, 2);
  }

  function smash(o) { // every hurdle the car touches breaks apart
    const x = laneX(o.lane, 1), y = playerY - 40;
    for (let i = 0; i < 14; i++) {
      g.parts.push({ rect: true, x: x + rnd(-34, 34), y: y + rnd(-26, 14), vx: rnd(-260, 260), vy: rnd(-460, -140), life: rnd(0.6, 1), max: 1,
        color: pick(['#e5383b', '#ffffff', '#e5383b', '#566072']), w: rnd(12, 28), h: rnd(5, 9), rot: rnd(0, 6), vr: rnd(-14, 14) });
    }
    sfx.smash();
  }

  function hit(o) {
    smash(o);
    const x = laneX(g.px, 1);
    if (g.invuln > 0) return; // still recovering from the last one: it breaks, but no extra damage
    g.deskHits[deskIndex(g.state)]++;
    if (g.shields > 0) { // Safety Margin: the shields are spent covering the hit
      g.shields = 0; g.invuln = 0.6; g.shake = 0.15;
      burst(x, playerY - 30, '#ffc533', 16);
      toast('Safety Margin™ covered it', '#ffc533', 1.4, false, 'Rainy-day fund spent');
      sfx.cover();
      return;
    }
    g.health--; g.hits++; g.streak = 0; g.mult = 1;
    buzz(70);
    g.speed = 0.4; g.clean *= 0.5; g.invuln = 0.8; g.shake = 0.4;
    burst(x, playerY - 30, '#ff5a5f', 18);
    if (g.health <= 0) return crash();
    toast(o.hz.msg, '#ff9a9a', 1.6, false, g.health === 1 ? 'One more hit and the car is totaled!' : g.toldDamage ? '' : 'Damage slows you down. Grab an eQA to repair.');
    g.toldDamage = true;
    sfx.hit();
  }

  function expire() {
    g.finished = true; g.expired = true; g.endDelay = 2; g.autopilot = 0;
    toast('TAG EXPIRED!', '#ff6b6b', 2, true, 'Days, not months, remember?');
    buzz([60, 40, 60]);
    sfx.end();
  }

  function crash() {
    buzz([90, 40, 180]);
    g.finished = true; g.crashed = true; g.endDelay = 2.2; g.autopilot = 0; g.shake = 0.7;
    toast('TOTALED!', '#ff6b6b', 2.2, true, 'Too much red tape.');
    burst(laneX(g.px, 1), playerY - 30, '#ffb347', 30);
    sfx.crash();
  }

  function power(o) {
    buzz(12); sfx.shield(2);
    if (o.kind === 'accufee') {
      g.magnet = 7; add(200, o.lane, '#8dffb4');
      toast('AccuFee™', '#8dffb4', 1.7, false, 'Every title, down to the penny');
    } else if (o.kind === 'lien') {
      add(750, o.lane, '#d6c2ff');
      toast('Verified Proof of Lien', '#d6c2ff', 1.7, false, 'Lender audit satisfied. Deal funded.');
    } else if (o.kind === 'timeline') {
      g.timeLeft = Math.min(RUN_SECONDS, g.timeLeft + 5); add(200, o.lane, '#a8e4ff');
      toast('Live Timeline', '#a8e4ff', 1.7, false, 'No more waiting in the dark. +5 days');
    } else if (g.health < g.maxHealth) {
      g.health++;
      toast('eQA Corrections', '#ffb36b', 1.7, false, 'Fixed before it went out. Top speed restored.');
    } else {
      add(500, o.lane, '#ffb36b');
      toast('eQA Corrections', '#ffb36b', 1.5, false, 'Clean packet bonus');
    }
  }

  function jackpot() {
    buzz([30, 30, 30, 30, 90]);
    g.shields = 0; g.jackpots++;
    g.autopilot = AUTOPILOT_SECONDS; g.invuln = 0; g.flash = 0.5;
    add(2000);
    toast('JACKPOT!', '#ffc533', 1.3, true);
    toast(`${BRAND}™ FULL-SERVICE`, '#ffc533', AUTOPILOT_SECONDS, false, 'We do everything else.');
    burst(W / 2, H * 0.42, '#ffc533', 46);
    burst(W / 2, H * 0.42, '#fff3b0', 20);
    sfx.jackpot();
  }

  function crossStateLine() {
    g.state++;
    g.sinceLine = 0;
    g.toLine += STATE_LEN;
    const fact = FAST_FACTS[STATES[g.state]];
    add(fact ? 500 : 250);
    const desk = DESKS[deskIndex(g.state)];
    if (desk.from === g.state) { // the deal moves to the next desk
      toast(`DEAL PASSED TO: ${desk.name.toUpperCase()}`, '#ffc533', 2.3, false, desk.tag + (deskIndex(g.state) === role().desk ? ' Your desk: titles ×2.' : ''));
      g.flash = 0.25;
    }
    if (fact && g.state < STATES.length - 1) {
      toast(`FAST FACT · ${STATES[g.state].toUpperCase()}`, '#7fd8fb', 2.2, false, fact);
    } else if (MILESTONES[g.state + 1]) {
      toast(MILESTONES[g.state + 1][0], '#ffc533', 1.8, false, MILESTONES[g.state + 1][1]);
    }
    sfx.state(); sfx.whoosh();
    if (g.state >= STATES.length - 1) {
      g.finished = true; g.endDelay = 2.4; g.autopilot = 0; g.flash = 0.5;
      const bonus = 5000 + Math.ceil(g.timeLeft) * 200;
      add(bonus);
      toast('COAST TO COAST!', '#ffc533', 2.4, true, `All 50 states · +${fmt(bonus)}`);
      burst(W / 2, H * 0.4, '#ffc533', 50); burst(W / 2, H * 0.5, '#8ccaff', 40);
      sfx.finish();
    }
  }

  function update(dt) {
    g.t += dt;
    if (g.finished) {
      g.speed = lerp(g.speed, g.crashed ? 0 : 0.5, dt * (g.crashed ? 4 : 2));
      g.endDelay -= dt;
      if (g.endDelay <= 0) return endRun();
    } else if (g.intro > 0) {
      g.intro -= dt;
    } else {
      g.timeLeft -= dt;
      if (!g.warned && g.timeLeft <= 15) { g.warned = true; toast('Temp tag expires in 15 days!', '#ff9a9a', 1.8, false, 'Floor it.'); }
      if (g.timeLeft <= 0) { g.timeLeft = 0; expire(); }
    }

    // Speed: builds while you drive clean, surges on autopilot.
    if (!g.finished) {
      g.clean += dt;
      const dmg = g.maxHealth - g.health; // each hit costs 7% of top speed until it is repaired
      const target = g.autopilot > 0 ? 2.1 : (0.8 + 0.6 * clamp(g.clean / 30, 0, 1)) * (role().speed || 1) * (1 - 0.07 * dmg);
      g.speed = lerp(g.speed, target, clamp(dt * 2, 0, 1));
    }
    const v = g.speed * BASE_V, move = v * dt;
    g.dist += move;
    if (!g.finished) {
      if (keys.left) g.tx -= dt * 3.4;
      if (keys.right) g.tx += dt * 3.4;
      g.tx = clamp(g.tx, -0.12, 2.12);
    }
    g.px = lerp(g.px, g.tx, clamp(dt * 20, 0, 1));
    g.lane = Math.round(g.tx);
    g.hint = Math.max(0, g.hint - dt);
    g.skid = Math.max(0, g.skid - dt);
    if (!g.finished && g.skid <= 0 && Math.abs(g.tx - g.px) > 0.6) { g.skid = 0.5; sfx.skid(); }
    g.sinceLine += dt;

    // Winding road: straights alternate with bends that even each other out.
    g.curveLeft -= move;
    if (g.curveLeft <= 0) {
      g.curveLeft = rnd(120, 210);
      g.curveTarget = g.curveTarget !== 0 ? 0 : (g.heading > 0 ? -1 : 1) * pick([0.55, 0.8, 1]);
    }
    g.curve = lerp(g.curve, g.finished ? 0 : g.curveTarget, clamp(dt * 0.9, 0, 1));
    g.heading += g.curve * move * 0.004;
    if (g.crashed) g.spin += dt * 10 * clamp(g.endDelay / 2, 0, 1);
    if (g.maxHealth - g.health >= 2 && !g.finished && Math.random() < dt * (g.health === 1 ? 20 : 7)) {
      g.parts.push({ smoke: true, x: laneX(g.px, 1) + rnd(-12, 12), y: playerY - 26, vx: rnd(-18, 18), vy: rnd(40, 90), life: 0.8, max: 0.8, color: '#3d424d', r: rnd(6, 12) });
    }
    engineSet(g.speed, true);
    g.invuln = Math.max(0, g.invuln - dt);
    g.magnet = Math.max(0, g.magnet - dt);
    g.shake = Math.max(0, g.shake - dt);
    g.flash = Math.max(0, g.flash - dt);
    if (g.autopilot > 0) {
      g.autopilot -= dt;
      if (g.autopilot <= 0) { g.invuln = 1.2; toast('Back in the driver’s seat', '#7fd8fb', 1.4, false, 'Self-Service: your deal, your pace'); }
    }

    // State lines
    if (!g.finished) {
      g.toLine -= move;
      while (g.toLine <= 0 && !g.finished) crossStateLine();
    }

    // Spawning
    if (!g.finished && g.intro <= 0) {
      g.rowAcc += move;
      const prog = clamp(g.state / (STATES.length - 1), 0, 1), gap = lerp(ROW_GAP, 25, prog * prog); // rows close up late in the trip
      while (g.rowAcc >= gap) { g.rowAcc -= gap; spawnRow(SPAWN_D - g.rowAcc); }
    }
    g.scenAcc += move;
    while (g.scenAcc >= 11) {
      g.scenAcc -= 11;
      const sd = SPAWN_D + 20 - g.scenAcc; // pick scenery for the state it will stand in, not the one we are in
      const pos = g.state + 1 - g.toLine / STATE_LEN + sd / STATE_LEN, si = Math.min(STATES.length - 1, Math.floor(pos)), fr = pos - Math.floor(pos);
      const lm = LANDMARKS[STATES[si]];
      if (lm && g.lmDone !== si && fr > 0.3 && fr < 0.6) { // one landmark per state, on the side away from the next sign
        g.lmDone = si;
        g.scen.push({ kind: lm, side: (si + 1) % 2 ? 1 : -1, off: 2.7, d: sd, size: 2.3, seed: 1 });
        continue;
      }
      const sc = makeScenery(biomeAt(pos), sd);
      for (let k = 0; k < 3; k++) { // nothing grows in front of a "Welcome to" sign
        const lineD = g.toLine + k * STATE_LEN, signSide = (g.state + 1 + k) % 2 ? -1 : 1;
        if (sd > lineD - 40 && sd < lineD + 10 && sc.side === signSide) sc.side = -signSide;
      }
      g.scen.push(sc);
    }

    // Objects
    const auto = g.autopilot > 0;
    for (const o of g.objs) {
      o.d -= move * (o.rel || 1);
      if (o.type === 'plaza' || o.done || g.finished) continue;
      const same = Math.abs(g.px - o.lane) < 0.55;
      if (o.type === 'haz') {
        if (auto) { // Full-Service: every hurdle in sight is approved straight away, not at the last second
          o.done = true; o.approved = true;
          add(150);
        } else if (Math.abs(g.px - o.lane) < 0.62 && o.d < 2.5 && o.d > -3) {
          o.done = true; o.gone = true; hit(o);
        } else if (!o.near && o.d < -1.5) { // squeaked past right beside it
          o.near = true;
          if (!auto && Math.abs(g.px - o.lane) < 1.02) { g.closeCalls++; g.score += 50; pop('CLOSE CALL +50', '#7fd8fb', g.px); }
        }
      } else if (o.d < 3 && o.d > -3.5 && (same || auto || (g.magnet > 0 && o.type === 'title'))) {
        o.done = true; o.gone = true;
        if (!same) g.parts.push({ zap: true, x: laneX(o.lane, 1), y: playerY - 70, x2: laneX(g.px, 1), vx: 0, vy: 0, life: 0.22, max: 0.22, color: o.type === 'title' ? '#8dffb4' : '#ffc533' });
        if (o.type === 'title') {
          g.titles++; g.streak++;
          const was = g.mult;
          g.mult = Math.min(5, 1 + Math.floor(g.streak / (role().streakStep || 4)));
          if (g.mult > was) { g.bestMult = Math.max(g.bestMult, g.mult); toast(CALLOUTS[g.mult - 2], '#8dffb4', 1.2, false, `×${g.mult} streak`); }
          else if (g.titles % 20 === 0) toast("It's like a little DMV Christmas!", '#8dffb4', 1.3);
          const di = deskIndex(g.state), home = di === role().desk; // your own desk pays double
          g.deskTitles[di]++;
          add(100 * g.mult * (home ? 2 : 1), o.lane, home ? '#ffc533' : '#fff');
          burst(laneX(g.px, 1), playerY - 60, '#bfe0ff', 5);
          sfx.title(g.mult);
        } else if (o.type === 'power') {
          power(o);
        } else {
          buzz(10);
          g.shields++;
          add(300, o.lane, '#ffc533');
          sfx.shield(g.shields);
          burst(laneX(g.px, 1), playerY - 60, '#ffc533', 12);
          if (g.shields >= 3) jackpot();
          else if (g.shields === 2) toast('One more shield — press your luck!', '#ffc533', 1.1);
        }
      }
    }
    g.objs = g.objs.filter((o) => o.d > -13 && !o.gone);
    for (const s of g.scen) s.d -= move;
    g.scen = g.scen.filter((s) => s.d > -13);

    for (const p of g.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rect) p.rot += p.vr * dt; if (!p.text && !p.smoke && !p.zap) p.vy += 520 * dt; }
    g.parts = g.parts.filter((p) => p.life > 0);
    for (const t of g.toasts) t.life -= dt;
    g.toasts = g.toasts.filter((t) => t.life > 0);
    if (g.queue.length) { // hand over to the next queued message as soon as the current one has had its time
      const cur = g.toasts.find((x) => !x.big);
      if (!cur) g.toasts.push(g.queue.shift());
      else if (cur.max - cur.life >= 0.9) cur.life = Math.min(cur.life, 0.15);
    }

    paintHud(false);
  }

  function makeScenery(b, d) {
    const kind = Math.random() < 0.05 ? 'bill' : pick(b.kinds);
    const far = kind === 'barn' || kind === 'turbine' || kind === 'bill';
    return { kind, side: Math.random() < 0.5 ? -1 : 1, off: far ? rnd(1.75, 2.4) : rnd(1.32, 2.7), d, size: rnd(0.85, 1.2), seed: Math.random() * 10 };
  }

  function buildHealth() {
    const box = $('health'); box.textContent = '';
    for (let i = 0; i < g.health; i++) box.appendChild(document.createElement('i'));
  }
  let hudCache = {};
  function setText(node, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; } }
  function paintHud(force) {
    if (force) hudCache = {};
    setText(el.score, 'score', fmt(g.score));
    const secs = Math.ceil(g.timeLeft);
    setText(el.time, 'time', String(secs));
    el.time.classList.toggle('low', secs <= 15);
    const lost = (g.maxHealth - g.health) * 7;
    setText($('buff'), 'buff', g.magnet > 0 ? `AccuFee™ ${Math.ceil(g.magnet)}s` : lost ? `Damaged: top speed −${lost}%` : '');
    $('buff').classList.toggle('bad', g.magnet <= 0 && lost > 0);
    setText(el.stateName, 'sn', STATES[g.state]);
    setText(el.stateCount, 'sc', `${g.state + 1} / 50`);
    const dk = deskIndex(g.state);
    setText(el.mult, 'mult', g.mult > 1 ? `×${g.mult} STREAK` : DESKS[dk].short + (dk === role().desk ? ' ×2' : ''));
    if (hudCache.health !== g.health) {
      hudCache.health = g.health;
      [...$('health').children].forEach((c, i) => c.classList.toggle('lost', i >= g.health));
      $('health').classList.toggle('low', g.health === 1);
    }
    const auto = g.autopilot > 0;
    const shown = auto ? 3 : g.shields;
    if (hudCache.slots !== shown) {
      hudCache.slots = shown;
      [...el.slots.children].forEach((c, i) => c.classList.toggle('on', i < shown));
    }
    el.slots.classList.toggle('jackpot', auto);
    if (hudCache.auto !== auto) {
      hudCache.auto = auto;
      el.banner.hidden = true;
      el.banner.textContent = `${BRAND}™ FULL-SERVICE`;
    }
    const prog = clamp((g.state + 1 - g.toLine / STATE_LEN) / (STATES.length - 1), 0.02, 1);
    el.bar.style.width = (prog * 100).toFixed(1) + '%';
  }

  // ---------- Drawing helpers ----------
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function poly(color, pts) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function disc(color, x, y, r) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function oval(color, x, y, rx, ry) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
  function vgrad(y0, y1, stops) {
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function hgrad(x0, x1, stops) {
    const gr = ctx.createLinearGradient(x0, 0, x1, 0);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function glow(x, y, r, c, a) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgb(c, a)); gr.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function makeCloud(col) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 140;
    const x = c.getContext('2d');
    for (const [px, py, r] of [[80, 92, 46], [130, 70, 58], [186, 78, 52], [236, 94, 40], [110, 100, 44], [170, 104, 48], [52, 106, 30], [268, 106, 28]]) {
      const gr = x.createRadialGradient(px, py - r * 0.25, r * 0.1, px, py, r);
      gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.65, `rgba(${col},.9)`); gr.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    x.globalCompositeOperation = 'destination-out';
    const e = x.createLinearGradient(0, 96, 0, 126);
    e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = e; x.fillRect(0, 96, 320, 44);
    return c;
  }
  const CLOUD_WHITE = makeCloud('255,255,255');
  const CLOUD_WARM = makeCloud('255,178,150');
  const CLOUDS = [[0.05, 0.3, 0.5, 1], [0.42, 0.52, 0.34, 0.6], [0.7, 0.2, 0.42, 0.8], [0.95, 0.6, 0.3, 0.5], [1.2, 0.36, 0.46, 0.9]];

  function ridge(u, seed, jag, mesa) {
    const smooth = (Math.sin(u * 1.3 + seed) * 0.5 + Math.sin(u * 2.9 + seed * 2.1) * 0.3 + Math.sin(u * 6.1 + seed * 0.7) * 0.2) * 0.5 + 0.5;
    const t1 = Math.abs((((u * 1.7 + seed) % 2) + 2) % 2 - 1), t2 = Math.abs((((u * 4.3 + seed * 3) % 2) + 2) % 2 - 1);
    let h = lerp(smooth, (t1 * 0.65 + t2 * 0.35) * 0.85 + smooth * 0.25, jag);
    if (mesa > 0) h = lerp(h, Math.round(h * 2.6) / 2.6, mesa * 0.85);
    return h;
  }
  function drawRidge(color, amp, seed, scroll, b, lift) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, horizon + 2);
    for (let x = 0; x <= W + 6; x += 6) ctx.lineTo(x, horizon - lift - ridge(x / W * 5 + scroll, seed, b.jag, b.mesa) * amp);
    ctx.lineTo(W, horizon + 2); ctx.closePath(); ctx.fill();
  }

  // ---------- World ----------
  let rainAmt = 0, snowAmt = 0, nightAmt = 0, headX = 0;
  const ease = (v, on) => v + clamp((on ? 1 : 0) - v, -0.02, 0.02);
  function drawWeather(t) { // rain and snow fall in front of everything
    if (rainAmt > 0.01) {
      ctx.fillStyle = `rgba(40,60,90,${0.14 * rainAmt})`; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(205,222,255,${0.38 * rainAmt})`; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < 46; i++) {
        const x = ((i * 97.3 + t * 260) % (W + 80)) - 40, y = ((i * 53.7 + t * 900 * (0.8 + (i % 5) * 0.1)) % (H + 60)) - 30;
        ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22);
      }
      ctx.stroke();
    }
    if (snowAmt > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * snowAmt})`;
      for (let i = 0; i < 60; i++) {
        const x = ((i * 71.3 + Math.sin(t * 0.8 + i) * 18 + t * 20) % (W + 20)) - 10, y = ((i * 39.1 + t * (70 + (i % 7) * 14)) % (H + 20)) - 10;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, 7); ctx.fill();
      }
    }
  }

  function drawWorld(dist, progress, auto, t, heading) {
    const b = biomeAt(progress);
    rainAmt = ease(rainAmt, b.fx === 'rain'); snowAmt = ease(snowAmt, b.fx === 'snow'); nightAmt = ease(nightAmt, b.fx === 'night');
    const cx = W / 2, span = playerY - horizon;

    // Sky
    ctx.fillStyle = vgrad(0, horizon, [[0, rgb(b.top)], [0.62, rgb(b.mid)], [1, rgb(b.hor)]]);
    ctx.fillRect(0, 0, W, horizon + 2);

    if (nightAmt > 0.01) { // stars
      ctx.fillStyle = `rgba(255,255,255,${0.9 * nightAmt})`;
      for (let i = 0; i < 70; i++) {
        const x = (i * 137.5 + heading * -60) % W, y = (i * 61.7) % (horizon * 0.92), r = 0.6 + (i % 3) * 0.5;
        ctx.globalAlpha = 0.5 + Math.sin(t * 2 + i) * 0.4; ctx.beginPath(); ctx.arc((x + W) % W, y, r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Sun with bloom
    const sx = W * 0.76, sy = horizon * b.sunY, sr = Math.min(W, H) * 0.048 * b.sunR;
    ctx.globalCompositeOperation = 'lighter';
    glow(sx, sy, sr * 7, b.sun, 0.42);
    glow(sx, sy, sr * 2.6, b.sun, 0.55);
    ctx.globalCompositeOperation = 'source-over';
    disc(rgb(mix(b.sun, [255, 255, 255], 0.5)), sx, sy, sr);

    // Clouds
    for (const [x0, y0, w0, sp] of CLOUDS) {
      const x = (((x0 + progress * 0.035 * sp + t * 0.004 * sp) % 1.5) - 0.3) * W, w = W * w0, y = horizon * y0;
      if (b.warm < 1) { ctx.globalAlpha = b.cloud * (1 - b.warm); ctx.drawImage(CLOUD_WHITE, x, y, w, w * 0.44); }
      if (b.warm > 0) { ctx.globalAlpha = b.cloud * b.warm; ctx.drawImage(CLOUD_WARM, x, y, w, w * 0.44); }
    }
    ctx.globalAlpha = 1;

    // Layered mountains (far layer hazier)
    drawRidge(rgb(mix(b.m1, b.hor, 0.35)), H * 0.085 * b.amp, 1.3, progress * 0.1 + heading * 0.5, b, H * 0.006);
    drawRidge(rgb(b.m2), H * 0.05 * b.amp, 4.1, progress * 0.28 + heading, b, 0);

    // Ground with depth haze and scrolling bands
    ctx.fillStyle = vgrad(horizon, H, [[0, rgb(mix(b.far, b.hor, 0.5))], [0.22, rgb(b.far)], [1, rgb(b.near)]]);
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.fillStyle = 'rgba(0,0,0,.045)';
    const band = 12, off = dist % (band * 2);
    for (let d = -14 - off; d < 260; d += band * 2) {
      const y0 = proj(d + band).y, y1 = proj(d).y;
      ctx.fillRect(0, y0, W, Math.max(0.5, y1 - y0));
    }

    // Road: verge, kerbs, asphalt, markings
    const sB = (H - horizon) / span;
    const wedge = (h0, h1, fill) => { // a band of road between two half-widths, following the bend
      const N = 30, pts = [];
      for (let k = 0; k <= N; k++) { const sc = sB * k / N; pts.push([cxAt(sc), sc]); }
      ctx.fillStyle = fill; ctx.beginPath();
      pts.forEach(([c, sc], k) => { const x = c + h0 * sc, y = horizon + span * sc; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      for (let k = N; k >= 0; k--) ctx.lineTo(pts[k][0] + h1 * pts[k][1], horizon + span * pts[k][1]);
      ctx.closePath(); ctx.fill();
    };
    wedge(-roadHalf * 1.42, roadHalf * 1.42, 'rgba(0,0,0,.09)');
    const seg = 7, koff = dist % (seg * 2);
    const kerbA = auto ? '#ffc533' : '#25aae2', kerbB = '#f4f6fb';
    let i = 0;
    for (let d = -14 - koff; d < 230; d += seg, i++) {
      const a = proj(d + seg), c = proj(d);
      ctx.fillStyle = i % 2 ? kerbA : kerbB;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cxAt(a.s) + side * roadHalf * 0.99 * a.s, a.y); ctx.lineTo(cxAt(a.s) + side * roadHalf * 1.1 * a.s, a.y);
        ctx.lineTo(cxAt(c.s) + side * roadHalf * 1.1 * c.s, c.y); ctx.lineTo(cxAt(c.s) + side * roadHalf * 0.99 * c.s, c.y);
        ctx.closePath(); ctx.fill();
      }
    }
    const asphaltFar = mix(auto ? [52, 64, 130] : [86, 92, 108], b.hor, 0.35);
    wedge(-roadHalf, roadHalf, vgrad(horizon, H, [[0, rgb(asphaltFar)], [0.3, auto ? '#2a3570' : '#4a5062'], [1, auto ? '#161d4a' : '#2b2f3c']]));
    // subtle asphalt banding for speed
    ctx.fillStyle = 'rgba(255,255,255,.028)';
    for (let d = -14 - off; d < 200; d += band * 2) {
      const a = proj(d + band), c = proj(d);
      ctx.beginPath();
      ctx.moveTo(cxAt(a.s) - roadHalf * a.s, a.y); ctx.lineTo(cxAt(a.s) + roadHalf * a.s, a.y);
      ctx.lineTo(cxAt(c.s) + roadHalf * c.s, c.y); ctx.lineTo(cxAt(c.s) - roadHalf * c.s, c.y);
      ctx.closePath(); ctx.fill();
    }
    wedge(roadHalf * 0.915, roadHalf * 0.945, 'rgba(255,255,255,.9)');
    wedge(-roadHalf * 0.945, -roadHalf * 0.915, 'rgba(255,255,255,.9)');

    ctx.fillStyle = auto ? '#ffd24d' : 'rgba(255,255,255,.92)';
    const step = 10, doff = dist % step;
    for (let d = -14 - doff; d < 240; d += step) {
      const a = proj(d + 4.4), c = proj(d);
      for (const side of [-1, 1]) {
        const o = side * roadHalf / 3;
        ctx.beginPath();
        ctx.moveTo(cxAt(a.s) + (o - 3.4) * a.s, a.y); ctx.lineTo(cxAt(a.s) + (o + 3.4) * a.s, a.y);
        ctx.lineTo(cxAt(c.s) + (o + 3.4) * c.s, c.y); ctx.lineTo(cxAt(c.s) + (o - 3.4) * c.s, c.y);
        ctx.closePath(); ctx.fill();
      }
    }

    // Distance haze over the far ground and road
    ctx.fillStyle = vgrad(horizon, horizon + span * 0.3, [[0, rgb(b.hor, 0.78)], [1, rgb(b.hor, 0)]]);
    ctx.fillRect(0, horizon, W, span * 0.3);
    if (nightAmt > 0.01) { // darkness, then the car's headlights on the road
      ctx.fillStyle = `rgba(4,8,30,${0.42 * nightAmt})`; ctx.fillRect(0, horizon, W, H - horizon);
      const far = 0.3, yFar = horizon + span * far;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = vgrad(yFar, playerY, [[0, 'rgba(255,244,200,0)'], [1, `rgba(255,244,200,${0.3 * nightAmt})`]]);
      ctx.beginPath(); ctx.moveTo(headX - roadHalf * 0.18, playerY - 30); ctx.lineTo(headX + roadHalf * 0.18, playerY - 30);
      ctx.lineTo(cxAt(far) + roadHalf * far * 1.2, yFar); ctx.lineTo(cxAt(far) - roadHalf * far * 1.2, yFar); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    return b;
  }

  // Landmarks; returns false when `k` is not one of them.
  function drawLandmark(k, u, t) {
    if (k === 'bridge') {
      const red = '#c8402f', dk = '#8f2a1f';
      ctx.fillStyle = dk; ctx.fillRect(-u * 1.6, -u * 0.95, u * 3.2, u * 0.1);
      for (const sx of [-0.28, 0.28]) { ctx.fillStyle = sx < 0 ? red : dk; ctx.fillRect(u * sx - u * 0.07, -u * 2.5, u * 0.14, u * 2.5); }
      ctx.fillStyle = dk; for (const yy of [0.6, 1.2, 1.8, 2.35]) ctx.fillRect(-u * 0.3, -u * yy, u * 0.6, u * 0.09);
      ctx.strokeStyle = red; ctx.lineWidth = u * 0.045;
      ctx.beginPath(); ctx.moveTo(-u * 1.6, -u * 0.95); ctx.quadraticCurveTo(-u * 0.8, -u * 1.1, -u * 0.28, -u * 2.5);
      ctx.moveTo(u * 1.6, -u * 0.95); ctx.quadraticCurveTo(u * 0.8, -u * 1.1, u * 0.28, -u * 2.5); ctx.stroke();
    } else if (k === 'needle') {
      poly('#eef2f7', [-u * 0.28, 0, -u * 0.1, 0, -u * 0.03, -u * 2.1]); poly('#b9c3d1', [u * 0.28, 0, u * 0.1, 0, u * 0.03, -u * 2.1]);
      poly('#cfd6e0', [-u * 0.1, 0, u * 0.1, 0, u * 0.04, -u * 2.2, -u * 0.04, -u * 2.2]);
      oval('#f58a3c', 0, -u * 2.25, u * 0.5, u * 0.1); oval('#eef2f7', 0, -u * 2.32, u * 0.38, u * 0.09);
      poly('#cfd6e0', [-u * 0.03, -u * 2.35, u * 0.03, -u * 2.35, 0, -u * 3]);
    } else if (k === 'butte') {
      poly('#8f3f2a', [-u * 1.2, 0, -u * 0.9, -u * 0.5, -u * 0.55, -u * 0.6, -u * 0.5, -u * 1.5, u * 0.45, -u * 1.5, u * 0.55, -u * 0.6, u * 0.95, -u * 0.5, u * 1.25, 0]);
      poly('#c0603f', [-u * 1.2, 0, -u * 0.9, -u * 0.5, -u * 0.55, -u * 0.6, -u * 0.5, -u * 1.5, -u * 0.05, -u * 1.5, -u * 0.1, -u * 0.6, -u * 0.3, 0]);
    } else if (k === 'derrick') {
      ctx.strokeStyle = '#343946'; ctx.lineWidth = u * 0.06; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-u * 0.45, 0); ctx.lineTo(-u * 0.08, -u * 2.1); ctx.lineTo(u * 0.08, -u * 2.1); ctx.lineTo(u * 0.45, 0);
      for (let i = 0; i < 4; i++) {
        const y0 = -u * i * 0.5, y1 = -u * (i + 1) * 0.5, w0 = 0.45 - i * 0.09, w1 = 0.45 - (i + 1) * 0.09;
        ctx.moveTo(-u * w0, y0); ctx.lineTo(u * w1, y1); ctx.moveTo(u * w0, y0); ctx.lineTo(-u * w1, y1); ctx.moveTo(-u * w1, y1); ctx.lineTo(u * w1, y1);
      }
      ctx.stroke();
      ctx.fillStyle = '#343946'; ctx.fillRect(-u * 0.14, -u * 2.3, u * 0.28, u * 0.2);
    } else if (k === 'arch') {
      ctx.lineCap = 'butt'; ctx.strokeStyle = hgrad(-u * 1.2, u * 1.2, [[0, '#eef2f7'], [0.5, '#b9c3d1'], [1, '#7f8a9c']]); ctx.lineWidth = u * 0.17;
      ctx.beginPath(); ctx.moveTo(-u * 1.1, 0); ctx.bezierCurveTo(-u * 0.9, -u * 3.4, u * 0.9, -u * 3.4, u * 1.1, 0); ctx.stroke();
    } else if (k === 'skyline') {
      [1.2, 2.1, 1.6, 2.8, 1.9, 1.3, 2.3].forEach((h, i) => {
        const x = -u * 1.4 + i * u * 0.4;
        ctx.fillStyle = i % 2 ? '#3a4a6b' : '#2b3854'; ctx.fillRect(x, -u * h, u * 0.38, u * h);
        ctx.fillStyle = 'rgba(255,226,140,.85)';
        for (let r = 0; r < h * 4 - 1; r++) for (let c = 0; c < 2; c++) if ((i * 7 + r * 3 + c) % 3) ctx.fillRect(x + u * (0.07 + c * 0.16), -u * h + u * (0.12 + r * 0.24), u * 0.08, u * 0.1);
      });
      poly('#2b3854', [-u * 0.04, -u * 2.8, u * 0.02, -u * 2.8, -u * 0.01, -u * 3.3]);
    } else if (k === 'liberty') {
      ctx.fillStyle = '#b9a98a'; ctx.fillRect(-u * 0.4, -u * 0.9, u * 0.8, u * 0.9); ctx.fillStyle = '#9c8c6e'; ctx.fillRect(0, -u * 0.9, u * 0.4, u * 0.9);
      ctx.fillStyle = '#cdbf9f'; ctx.fillRect(-u * 0.5, -u, u, u * 0.12);
      poly('#5fae9a', [-u * 0.3, -u, u * 0.3, -u, u * 0.16, -u * 2.1, -u * 0.16, -u * 2.1]); poly('#458a79', [0, -u, u * 0.3, -u, u * 0.16, -u * 2.1, 0, -u * 2.1]);
      disc('#5fae9a', 0, -u * 2.25, u * 0.16);
      ctx.strokeStyle = '#5fae9a'; ctx.lineWidth = u * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(0, -u * 2.3); ctx.lineTo(u * i * 0.1, -u * 2.55); } ctx.stroke();
      ctx.lineWidth = u * 0.1; ctx.beginPath(); ctx.moveTo(u * 0.12, -u * 2); ctx.lineTo(u * 0.34, -u * 2.75); ctx.stroke();
      disc('#ffc533', u * 0.36, -u * 2.85, u * 0.09);
    } else if (k === 'lighthouse') {
      const hw = (h) => 0.3 - 0.12 * h / 1.9;
      poly('#f4f6fa', [-u * 0.3, 0, u * 0.3, 0, u * 0.18, -u * 1.9, -u * 0.18, -u * 1.9]); poly('#d5dce6', [0, 0, u * 0.3, 0, u * 0.18, -u * 1.9, 0, -u * 1.9]);
      for (const [a, b] of [[0.35, 0.75], [1.1, 1.5]]) poly('#d8322f', [-u * hw(a), -u * a, u * hw(a), -u * a, u * hw(b), -u * b, -u * hw(b), -u * b]);
      ctx.fillStyle = '#2b313d'; ctx.fillRect(-u * 0.22, -u * 1.98, u * 0.44, u * 0.08);
      ctx.fillStyle = '#ffe58a'; ctx.fillRect(-u * 0.13, -u * 2.25, u * 0.26, u * 0.27);
      poly('#d8322f', [-u * 0.2, -u * 2.25, u * 0.2, -u * 2.25, 0, -u * 2.5]);
      ctx.globalCompositeOperation = 'lighter'; glow(0, -u * 2.12, u * 0.9, [255, 236, 160], 0.5 + Math.sin(t * 3) * 0.25); ctx.globalCompositeOperation = 'source-over';
    } else if (k === 'peach') {
      poly('#9aa5b6', [-u * 0.35, 0, -u * 0.08, -u * 1.1, u * 0.08, -u * 1.1, u * 0.35, 0, u * 0.25, 0, 0, -u * 0.8, -u * 0.25, 0]);
      ctx.fillStyle = '#b9c3d1'; ctx.fillRect(-u * 0.08, -u * 1.3, u * 0.16, u * 1.3);
      const gr = ctx.createRadialGradient(-u * 0.2, -u * 1.95, u * 0.1, 0, -u * 1.75, u * 0.7);
      gr.addColorStop(0, '#ffd27a'); gr.addColorStop(0.6, '#ff9a4a'); gr.addColorStop(1, '#e0562c');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -u * 1.75, u * 0.62, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(180,60,30,.6)'; ctx.lineWidth = u * 0.04; ctx.beginPath(); ctx.arc(-u * 0.5, -u * 1.75, u * 0.7, -0.9, 0.9); ctx.stroke();
      ctx.fillStyle = '#3f9a4a'; ctx.beginPath(); ctx.ellipse(u * 0.16, -u * 2.4, u * 0.22, u * 0.09, -0.5, 0, 7); ctx.fill();
    } else if (k === 'rocket') {
      ctx.strokeStyle = '#6f7a8c'; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(-u * 0.45, 0); ctx.lineTo(-u * 0.45, -u * 2.2);
      for (let i = 0; i < 5; i++) { ctx.moveTo(-u * 0.45, -u * i * 0.44); ctx.lineTo(-u * 0.2, -u * (i * 0.44 + 0.22)); ctx.lineTo(-u * 0.45, -u * (i + 1) * 0.44); }
      ctx.stroke();
      ctx.fillStyle = '#f4f6fa'; rr(-u * 0.16, -u * 2.2, u * 0.32, u * 2, u * 0.05); ctx.fill(); ctx.fillStyle = '#d5dce6'; ctx.fillRect(0, -u * 2.2, u * 0.16, u * 2);
      poly('#f4f6fa', [-u * 0.16, -u * 2.2, u * 0.16, -u * 2.2, 0, -u * 2.75]);
      poly('#d8322f', [-u * 0.16, -u * 0.2, -u * 0.36, -u * 0.2, -u * 0.16, -u * 0.7]); poly('#d8322f', [u * 0.16, -u * 0.2, u * 0.36, -u * 0.2, u * 0.16, -u * 0.7]);
      ctx.fillStyle = '#23226b'; ctx.fillRect(-u * 0.16, -u * 1.5, u * 0.32, u * 0.12);
    } else return false;
    return true;
  }

  // Roadside scenery, drawn around a ground point; u is the size unit.
  function drawScenery(sc, x, y, u, t) {
    const k = sc.kind;
    u *= sc.size;
    ctx.save(); ctx.translate(x, y);
    oval('rgba(0,0,0,.2)', u * 0.18, 0, u * (k === 'barn' || k === 'bill' ? 1.1 : 0.55), u * 0.1);
    if (drawLandmark(k, u, t)) {
      // drawn above
    } else if (k === 'palm') {
      const lean = (sc.seed % 1 - 0.5) * 0.5;
      const tx = u * lean, ty = -u * 1.9;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#6f4a26'; ctx.lineWidth = u * 0.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(u * lean * 0.1, -u, tx, ty); ctx.stroke();
      ctx.strokeStyle = '#a57a48'; ctx.lineWidth = u * 0.08;
      ctx.beginPath(); ctx.moveTo(-u * 0.04, 0); ctx.quadraticCurveTo(u * lean * 0.1 - u * 0.04, -u, tx - u * 0.03, ty); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.08 - i * 0.196), len = u * (i % 2 ? 1.0 : 1.2);
        const ex = tx + Math.cos(a) * len, ey = ty - Math.sin(a) * len * 0.5 + u * 0.42;
        const mx = tx + Math.cos(a) * len * 0.5, my = ty - Math.sin(a) * len * 0.75 - u * 0.2;
        ctx.fillStyle = i % 2 ? '#1f8a4c' : '#37b368';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx, my - u * 0.14, ex, ey);
        ctx.quadraticCurveTo(mx, my + u * 0.16, tx, ty); ctx.fill();
      }
      disc('#5b3a1c', tx - u * 0.07, ty + u * 0.06, u * 0.08); disc('#5b3a1c', tx + u * 0.08, ty + u * 0.09, u * 0.07);
    } else if (k === 'cactus') {
      const path = (dx) => {
        ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, -u * 1.3);
        ctx.moveTo(dx, -u * 0.5); ctx.lineTo(dx - u * 0.42, -u * 0.5); ctx.lineTo(dx - u * 0.42, -u * 0.92);
        ctx.moveTo(dx, -u * 0.72); ctx.lineTo(dx + u * 0.4, -u * 0.72); ctx.lineTo(dx + u * 0.4, -u * 1.12);
        ctx.stroke();
      };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#256b41'; ctx.lineWidth = u * 0.28; path(0);
      ctx.strokeStyle = '#3f9a5c'; ctx.lineWidth = u * 0.15; path(-u * 0.04);
      ctx.strokeStyle = '#6cc081'; ctx.lineWidth = u * 0.04; path(-u * 0.08);
    } else if (k === 'rock') {
      poly('#8d735f', [-u * 0.7, 0, -u * 0.42, -u * 0.5, u * 0.1, -u * 0.72, u * 0.5, -u * 0.38, u * 0.75, 0]);
      poly('#c2a68a', [-u * 0.7, 0, -u * 0.42, -u * 0.5, u * 0.1, -u * 0.72, -u * 0.02, -u * 0.3, -u * 0.25, 0]);
    } else if (k === 'hay') {
      ctx.fillStyle = '#b98a2a'; rr(-u * 0.05, -u * 0.72, u * 0.62, u * 0.72, u * 0.3); ctx.fill();
      disc('#e8be58', -u * 0.05, -u * 0.36, u * 0.36);
      ctx.strokeStyle = '#c4952f'; ctx.lineWidth = u * 0.04;
      for (const r of [0.26, 0.15, 0.05]) { ctx.beginPath(); ctx.arc(-u * 0.05, -u * 0.36, u * r, 0, 7); ctx.stroke(); }
    } else if (k === 'barn') {
      // silo
      ctx.fillStyle = hgrad(u * 0.75, u * 1.25, [[0, '#dfe5ee'], [1, '#9aa5b6']]); ctx.fillRect(u * 0.75, -u * 1.5, u * 0.5, u * 1.5);
      ctx.fillStyle = '#7f8a9c'; ctx.beginPath(); ctx.arc(u, -u * 1.5, u * 0.25, Math.PI, 0); ctx.fill();
      // barn
      ctx.fillStyle = '#c33b36'; ctx.fillRect(-u * 0.8, -u * 0.95, u * 1.5, u * 0.95);
      ctx.fillStyle = '#a02a27'; ctx.fillRect(u * 0.25, -u * 0.95, u * 0.45, u * 0.95);
      poly('#7a1d1b', [-u * 0.9, -u * 0.92, -u * 0.62, -u * 1.32, -u * 0.28, -u * 1.52, u * 0.2, -u * 1.52, u * 0.52, -u * 1.32, u * 0.8, -u * 0.92]);
      ctx.fillStyle = '#f6efe9'; ctx.fillRect(-u * 0.36, -u * 0.6, u * 0.56, u * 0.6);
      ctx.strokeStyle = '#c33b36'; ctx.lineWidth = u * 0.045;
      ctx.beginPath(); ctx.moveTo(-u * 0.34, -u * 0.58); ctx.lineTo(u * 0.18, -u * 0.02); ctx.moveTo(u * 0.18, -u * 0.58); ctx.lineTo(-u * 0.34, -u * 0.02); ctx.stroke();
      ctx.fillStyle = '#f6efe9'; ctx.fillRect(-u * 0.18, -u * 1.22, u * 0.24, u * 0.2);
    } else if (k === 'turbine') {
      poly('#eef2f7', [-u * 0.05, 0, u * 0.05, 0, u * 0.025, -u * 2.6, -u * 0.025, -u * 2.6]);
      poly('#b9c3d1', [0, 0, u * 0.05, 0, u * 0.025, -u * 2.6, 0, -u * 2.6]);
      ctx.save(); ctx.translate(0, -u * 2.6); ctx.rotate(t * 1.6 + sc.seed);
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI * 2 / 3);
        poly('#f7f9fc', [0, -u * 0.05, u * 1.05, -u * 0.012, u * 1.05, u * 0.012, 0, u * 0.07]);
      }
      ctx.restore();
      disc('#d5dce6', 0, -u * 2.6, u * 0.08);
    } else if (k === 'pine' || k === 'snowpine') {
      const snow = k === 'snowpine';
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(-u * 0.07, -u * 0.35, u * 0.14, u * 0.35);
      for (let i = 0; i < 3; i++) {
        const w = u * (0.64 - i * 0.15), by = -u * (0.28 + i * 0.5), top = by - u * 0.8;
        poly(snow ? '#3d8f78' : '#35a064', [-w, by, 0, top, 0, by]);
        poly(snow ? '#22625a' : '#1c6a44', [0, by, 0, top, w, by]);
        if (snow) {
          poly('#ffffff', [-w * 0.62, by - u * 0.3, 0, top, 0, by - u * 0.22, -w * 0.3, by - u * 0.38]);
          poly('#d5e3f2', [0, by - u * 0.22, 0, top, w * 0.62, by - u * 0.3, w * 0.3, by - u * 0.38]);
        }
      }
    } else if (k === 'maple') {
      const c = [['#a8401c', '#e06a2b', '#f6a04a'], ['#96262a', '#d4433a', '#f07f62'], ['#b07a0c', '#e3ac27', '#f7d566']][(sc.seed * 3 | 0) % 3];
      ctx.fillStyle = '#4e3520'; ctx.fillRect(-u * 0.08, -u * 0.7, u * 0.16, u * 0.7);
      disc(c[0], 0, -u * 1.02, u * 0.56); disc(c[0], u * 0.4, -u * 0.84, u * 0.36); disc(c[0], -u * 0.42, -u * 0.82, u * 0.36);
      disc(c[1], -u * 0.12, -u * 1.12, u * 0.42); disc(c[1], -u * 0.44, -u * 0.88, u * 0.25);
      disc(c[2], -u * 0.22, -u * 1.26, u * 0.2);
    } else if (k === 'oak') {
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(-u * 0.08, -u * 0.7, u * 0.16, u * 0.7);
      disc('#2a7a44', 0, -u * 1.02, u * 0.56); disc('#2a7a44', u * 0.4, -u * 0.84, u * 0.36); disc('#2a7a44', -u * 0.42, -u * 0.82, u * 0.36);
      disc('#46a659', -u * 0.12, -u * 1.12, u * 0.42); disc('#46a659', -u * 0.44, -u * 0.88, u * 0.25);
      disc('#73c874', -u * 0.22, -u * 1.26, u * 0.2);
    } else if (k === 'bill') {
      ctx.fillStyle = '#4c5566'; ctx.fillRect(-u * 0.72, -u * 0.95, u * 0.1, u * 0.95); ctx.fillRect(u * 0.62, -u * 0.95, u * 0.1, u * 0.95);
      ctx.fillStyle = '#0b1b3a'; rr(-u * 1.12, -u * 1.92, u * 2.24, u * 1.12, u * 0.08); ctx.fill();
      ctx.fillStyle = vgrad(-u * 1.86, -u * 0.86, [[0, '#2b2a7a'], [1, '#17174f']]); rr(-u * 1.06, -u * 1.86, u * 2.12, u, u * 0.05); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = font(u * 0.56); ctx.fillText(BRAND + '™', 0, -u * 1.48, u * 1.9);
      ctx.fillStyle = '#4cc4f5'; ctx.font = font(u * 0.26, 700); ctx.fillText('ALL 50 STATES', 0, -u * 1.08, u * 1.9);
    }
    ctx.restore();
  }

  function drawGantry(d, name, idx, fadeIn = 1) {
    if (d > SPAWN_D + 30 || d < -9) return;
    const p = proj(d), s = p.s, cx = cxAt(s), half = roadHalf * 1.2 * s;
    const h = roadHalf * 1.42 * s, sh = roadHalf * 0.46 * s, pw = Math.max(1.5, 9 * s);
    const finish = idx === STATES.length - 1, tough = !finish && !!FAST_FACTS[name];
    ctx.globalAlpha = clamp((SPAWN_D + 30 - d) / 30, 0, 1) * clamp((d + 9) / 5, 0, 1) * fadeIn;
    if (!finish) { // a "Welcome to" sign on the shoulder (alternating sides) and a painted line across the road
      const p2 = proj(d + 1.4), side = idx % 2 ? -1 : 1, note = ROUTE[idx][2];
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath();
      ctx.moveTo(cxAt(p2.s) - roadHalf * p2.s, p2.y); ctx.lineTo(cxAt(p2.s) + roadHalf * p2.s, p2.y);
      ctx.lineTo(cx + roadHalf * s, p.y); ctx.lineTo(cx - roadHalf * s, p.y); ctx.closePath(); ctx.fill();
      const bw = roadHalf * 1.4 * s, bh = roadHalf * 0.72 * s, x0 = cx + side * roadHalf * 1.17 * s - (side < 0 ? bw : 0), by = p.y - roadHalf * 1.3 * s;
      const cut = Math.max(0, -x0, x0 + bw - W) / bw; // fade the sign out as it slides off the edge instead of showing half a name
      ctx.globalAlpha *= clamp(1 - cut * 4, 0, 1);
      for (const f of [0.22, 0.78]) {
        ctx.fillStyle = hgrad(x0 + bw * f - pw / 2, x0 + bw * f + pw / 2, [[0, '#aab3c2'], [0.5, '#e6ebf2'], [1, '#6f7a8c']]);
        ctx.fillRect(x0 + bw * f - pw / 2, by + bh * 0.5, pw, p.y - by - bh * 0.5);
      }
      oval('rgba(0,0,0,.22)', x0 + bw / 2, p.y, bw * 0.42, bw * 0.05);
      ctx.fillStyle = vgrad(by, by + bh, tough ? [[0, '#f58a3c'], [1, '#c2531a']] : [[0, '#1e9a58'], [1, '#0e6a3a']]);
      rr(x0, by, bw, bh, bh * 0.12); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, 3 * s);
      rr(x0 + 3 * s, by + 3 * s, bw - 6 * s, bh - 6 * s, bh * 0.09); ctx.stroke();
      if (bh > 16) {
        const mx = x0 + bw / 2;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = tough ? '#fff3d6' : '#c9f3da'; ctx.font = font(bh * 0.17, 600);
        ctx.fillText(note || 'WELCOME TO', mx, by + bh * 0.2, bw * 0.88);
        ctx.fillStyle = '#fff'; ctx.font = font(bh * 0.36);
        ctx.fillText(name.toUpperCase(), mx, by + bh * 0.5, bw * 0.88);
        ctx.fillStyle = tough ? '#fff3d6' : '#c9f3da'; ctx.font = font(bh * 0.17, 600);
        ctx.fillText(tough ? `TOUGH STATE · 2× · ${idx + 1} OF 50` : `STATE ${idx + 1} OF 50`, mx, by + bh * 0.81, bw * 0.88);
      }
      ctx.globalAlpha = 1;
      return;
    }
    for (const side of [-1, 1]) {
      const x = cx + side * half;
      ctx.fillStyle = hgrad(x - pw / 2, x + pw / 2, [[0, '#aab3c2'], [0.5, '#e6ebf2'], [1, '#6f7a8c']]);
      ctx.fillRect(x - pw / 2, p.y - h, pw, h);
      oval('rgba(0,0,0,.25)', x, p.y, pw * 1.6, pw * 0.4);
    }
    const top = p.y - h;
    if (finish) {
      const n = 16, cw = half * 2 / n, ch = sh * 0.32;
      for (let r = 0; r < 2; r++) for (let c = 0; c < n; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#111' : '#fff';
        ctx.fillRect(cx - half + c * cw, top - ch * 2 + r * ch, cw + 0.5, ch + 0.5);
      }
    } else {
      ctx.fillStyle = '#8791a3'; ctx.fillRect(cx - half, top, half * 2, Math.max(1, sh * 0.1));
    }
    const sw = half * 1.5, sy = top + sh * 0.16;
    ctx.fillStyle = finish ? vgrad(sy, sy + sh, [[0, '#2a7cf5'], [1, '#1246a8']]) : vgrad(sy, sy + sh, tough ? [[0, '#f58a3c'], [1, '#c2531a']] : [[0, '#1e9a58'], [1, '#0e6a3a']]);
    rr(cx - sw / 2, sy, sw, sh, sh * 0.14); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, 3 * s);
    rr(cx - sw / 2 + 3 * s, sy + 3 * s, sw - 6 * s, sh - 6 * s, sh * 0.1); ctx.stroke();
    if (sh > 9) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = font(sh * 0.5);
      ctx.fillText(finish ? `${name.toUpperCase()} · ${EVENT.toUpperCase()}` : name.toUpperCase(), cx, sy + sh * 0.4, sw * 0.9);
      ctx.fillStyle = finish ? '#ffc533' : tough ? '#fff3d6' : '#c9f3da'; ctx.font = font(sh * 0.24, 600);
      ctx.fillText(finish ? 'FINISH  ·  50 OF 50' : ROUTE[idx][2] ? `${ROUTE[idx][2]}  ·  ${idx + 1} OF 50` : tough ? `TOUGH STATE  ·  2× POINTS  ·  ${idx + 1} OF 50` : `STATE LINE  ·  ${idx + 1} OF 50`, cx, sy + sh * 0.78, sw * 0.9);
    }
    ctx.globalAlpha = 1;
  }

  // DMV checkpoint: a counter roof across the road with a lamp over each lane.
  function drawPlaza(o) {
    const p = proj(o.d), s = p.s, cx = cxAt(s), half = roadHalf * 1.12 * s, h = roadHalf * 1.2 * s, rh = roadHalf * 0.36 * s;
    ctx.globalAlpha = clamp((SPAWN_D - o.d) / 20, 0, 1) * clamp((o.d + 9) / 5, 0, 1);
    ctx.fillStyle = '#8f8672';
    for (const f of [-1, -1 / 3, 1 / 3, 1]) { const w = Math.max(1.5, (Math.abs(f) === 1 ? 9 : 5) * s); ctx.fillRect(cx + half * f - w / 2, p.y - h, w, h); }
    ctx.fillStyle = vgrad(p.y - h - rh, p.y - h, [[0, '#efe6cf'], [1, '#cfc4a8']]); ctx.fillRect(cx - half - 8 * s, p.y - h - rh, half * 2 + 16 * s, rh);
    ctx.fillStyle = '#8f8672'; ctx.fillRect(cx - half - 8 * s, p.y - h - 3 * s, half * 2 + 16 * s, Math.max(1, 4 * s));
    if (rh > 9) {
      ctx.fillStyle = '#23226b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(rh * 0.5);
      ctx.fillText('DMV · TAKE A NUMBER', cx, p.y - h - rh * 0.5, half * 1.8);
    }
    for (let l = 0; l < 3; l++) {
      const x = laneX(l, s), on = l === o.open, y = p.y - h + rh * 0.34, c = on ? [80, 255, 150] : [255, 70, 70];
      ctx.globalCompositeOperation = 'lighter'; glow(x, y, rh * 0.7, c, 0.6); ctx.globalCompositeOperation = 'source-over';
      disc(rgb(mix(c, [255, 255, 255], 0.3)), x, y, Math.max(1.5, rh * 0.15));
      if (rh > 14) { ctx.fillStyle = on ? '#b9ffd3' : '#ffc0c0'; ctx.font = font(rh * 0.26, 700); ctx.fillText(on ? 'OPEN' : 'CLOSED', x, y + rh * 0.42); }
    }
    ctx.globalAlpha = 1;
  }

  function drawObj(o, t) {
    const p = proj(o.d), x = laneX(o.lane, p.s), lane = (roadHalf * 2 / 3) * p.s;
    const fade = clamp((SPAWN_D - o.d) / 20, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, p.y);

    if (o.truck) { // slow snail-mail truck
      const u = lane * 0.86 / 100, ok = !!o.approved;
      ctx.scale(u, u);
      oval('rgba(0,0,0,.34)', 0, 2, 56, 10);
      ctx.fillStyle = '#0b0d12'; rr(-46, -20, 20, 22, 5); ctx.fill(); rr(26, -20, 20, 22, 5); ctx.fill();
      ctx.fillStyle = vgrad(-118, -18, [[0, '#ffffff'], [1, '#d5dbe6']]); rr(-50, -118, 100, 100, 6); ctx.fill();
      ctx.strokeStyle = '#9aa5b6'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -116); ctx.lineTo(0, -20); ctx.stroke();
      ctx.fillStyle = ok ? '#1f9e5c' : '#23226b'; ctx.fillRect(-50, -100, 100, 30);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(21);
      if (lane > 24) ctx.fillText(ok ? 'E-FILED ✓' : o.hz.label, 0, -84, 92);
      ctx.fillStyle = '#eef2f7'; ctx.fillRect(-16, -60, 32, 22);
      ctx.strokeStyle = '#23226b'; ctx.lineWidth = 2; ctx.strokeRect(-16, -60, 32, 22);
      ctx.beginPath(); ctx.moveTo(-16, -60); ctx.lineTo(0, -47); ctx.lineTo(16, -60); ctx.stroke();
      ctx.fillStyle = '#2b313d'; rr(-52, -22, 104, 9, 3); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; glow(-40, -27, 16, [255, 40, 50], 0.5); glow(40, -27, 16, [255, 40, 50], 0.5); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ff4b4f'; rr(-48, -31, 14, 7, 2); ctx.fill(); rr(34, -31, 14, 7, 2); ctx.fill();
      ctx.restore();
      return;
    }
    if (o.type === 'haz') {
      const u = lane * 0.9 / 100, ok = !!o.approved;
      ctx.scale(u, u);
      oval('rgba(0,0,0,.3)', 0, 0, 52, 8);
      if (!ok) { ctx.globalCompositeOperation = 'lighter'; glow(0, -6, 70, [255, 60, 60], 0.22); ctx.globalCompositeOperation = 'source-over'; }
      // A-frame legs
      for (const sx of [-1, 1]) {
        poly('#39414f', [sx * 38, -78, sx * 44, -78, sx * 50, 0, sx * 43, 0]);
        poly('#566072', [sx * 38, -78, sx * 41, -78, sx * 46, 0, sx * 43, 0]);
      }
      const stripes = (y, h, r) => {
        ctx.save(); rr(-50, y, 100, h, r); ctx.clip();
        ctx.fillStyle = ok ? vgrad(y, y + h, [[0, '#46d68a'], [1, '#1f9e5c']]) : vgrad(y, y + h, [[0, '#ffffff'], [1, '#dfe4ec']]);
        ctx.fillRect(-50, y, 100, h);
        if (!ok) {
          ctx.fillStyle = vgrad(y, y + h, [[0, '#ff4b4f'], [1, '#c81e2b']]);
          for (let i = -1; i < 7; i++) {
            const sx = -50 + i * 18;
            ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + 9, y + h); ctx.lineTo(sx + 9 + h, y); ctx.lineTo(sx + h, y); ctx.closePath(); ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-50, y, 100, 1.6);
        ctx.restore();
      };
      stripes(-34, 15, 3);
      stripes(-80, 38, 5);
      // label plate
      ctx.fillStyle = ok ? '#f0fff5' : '#fff'; rr(-43, -74.500, 86, 27, 3); ctx.fill();
      ctx.strokeStyle = ok ? '#1f9e5c' : '#c81e2b'; ctx.lineWidth = 1.6; ctx.stroke();
      if (lane > 24) {
        ctx.fillStyle = ok ? '#0e6a3a' : '#c1121f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = font(21);
        ctx.fillText(ok ? 'APPROVED ✓' : o.hz.label, 0, -60, 80);
      }
      // warning lights
      const on = ok || Math.floor(t * 5 + o.lane) % 2 === 0;
      for (const sx of [-1, 1]) {
        ctx.fillStyle = '#2b313d'; ctx.fillRect(sx * 38 - 4, -86, 8, 6);
        const lc = ok ? [80, 255, 150] : [255, 170, 30];
        if (on) { ctx.globalCompositeOperation = 'lighter'; glow(sx * 38, -90, 18, lc, 0.75); ctx.globalCompositeOperation = 'source-over'; }
        disc(on ? rgb(mix(lc, [255, 255, 255], 0.35)) : '#8a5a10', sx * 38, -90, 5);
      }
    } else if (o.type === 'title') {
      const u = lane * 0.44 / 100;
      const bob = Math.sin(t * 4.5 + o.lane * 2 + o.d * 0.05) * 9;
      ctx.scale(u, u);
      oval('rgba(0,0,0,.26)', 0, 0, 46, 9);
      ctx.translate(0, -112 + bob);
      ctx.globalCompositeOperation = 'lighter'; glow(0, 0, 120, [120, 190, 255], 0.3); ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(Math.sin(t * 3 + o.d * 0.07) * 0.09);
      ctx.fillStyle = '#0d2a66'; rr(-40, -52, 84, 108, 9); ctx.fill();       // depth edge
      ctx.fillStyle = vgrad(-54, 54, [[0, '#ffffff'], [1, '#e3ebf8']]); rr(-44, -56, 84, 108, 9); ctx.fill();
      ctx.save(); rr(-44, -56, 84, 108, 9); ctx.clip();
      ctx.fillStyle = vgrad(-56, -30, [[0, '#4cc4f5'], [1, '#1c93cc']]); ctx.fillRect(-44, -56, 84, 27);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(19);
      if (lane > 30) ctx.fillText('TITLE', -2, -42);
      ctx.fillStyle = '#b3c1dc';
      rr(-34, -18, 64, 7, 3.500); ctx.fill(); rr(-34, -3, 64, 7, 3.500); ctx.fill(); rr(-34, 12, 34, 7, 3.500); ctx.fill();
      disc('#d9651a', 20, 32, 14); disc('#f58a3c', 20, 32, 10.500);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(14, 32); ctx.lineTo(18.500, 36.500); ctx.lineTo(26, 27); ctx.stroke();
    } else if (o.type === 'power') {
      const u = lane * 0.6 / 100, pw = POWERS[o.kind], bob = Math.sin(t * 4 + o.d * 0.05) * 8;
      ctx.scale(u, u);
      oval('rgba(0,0,0,.26)', 0, 0, 40, 8);
      ctx.translate(0, -92 + bob);
      ctx.globalCompositeOperation = 'lighter'; glow(0, 0, 112, pw.glow, 0.45); ctx.globalCompositeOperation = 'source-over';
      disc(pw.dark, 2, 4, 46);
      ctx.fillStyle = vgrad(-46, 46, [[0, pw.a], [1, pw.b]]);
      ctx.beginPath(); ctx.arc(0, 0, 46, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = font(pw.text.length > 1 ? 34 : 50); ctx.fillText(pw.text, 0, pw.small ? -7 : 2, 80);
      if (pw.small) { ctx.font = font(14, 700); ctx.fillText(pw.small, 0, 24, 78); }
    } else {
      const u = lane * 0.62 / 100;
      const bob = Math.sin(t * 4 + o.d * 0.05) * 8, pulse = 0.5 + Math.sin(t * 6) * 0.5;
      ctx.scale(u, u);
      oval('rgba(0,0,0,.26)', 0, 0, 40, 8);
      ctx.translate(0, -92 + bob);
      ctx.globalCompositeOperation = 'lighter';
      glow(0, 0, 105 + pulse * 14, [255, 190, 40], 0.5);
      ctx.save(); ctx.rotate(t * 0.9);
      ctx.fillStyle = 'rgba(255,214,90,.16)';
      for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -96); ctx.lineTo(11, -96); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.scale(4.2, 4.2); ctx.translate(-12, -12.500);
      ctx.fillStyle = '#9a6200'; ctx.save(); ctx.translate(0.5, 0.9); ctx.fill(SHIELD_PATH); ctx.restore();
      ctx.fillStyle = vgrad(2, 23, [[0, '#fff0a8'], [0.45, '#ffc533'], [1, '#f59a00']]); ctx.fill(SHIELD_PATH);
      ctx.strokeStyle = '#fff8dc'; ctx.lineWidth = 1.1; ctx.stroke(SHIELD_PATH);
      ctx.save(); ctx.clip(SHIELD_PATH); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(3, 2, 9, 21); ctx.restore();
      ctx.strokeStyle = '#0b1b3a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(7.500, 12.500); ctx.lineTo(11, 16); ctx.lineTo(16.500, 8.500); ctx.stroke();
    }
    ctx.restore();
  }

  // Rear view of the player's car. Unit space: 100 wide, wheels on y = 0.
  function drawCar(px, lean, auto, blink, braking, t, dmg = 0) {
    const x = laneX(px, 1), u = (roadHalf * 2 / 3) * 0.8 / 100, pt = paint();
    ctx.save();
    ctx.translate(x, playerY + Math.sin(t * 38) * 0.5);
    ctx.scale(u, u);
    oval('rgba(0,0,0,.38)', 0, 2, 60, 11);
    if (auto) {
      ctx.globalCompositeOperation = 'lighter';
      glow(0, -4, 120, [255, 190, 40], 0.55);
      for (const sx of [-22, 22]) { // boost flames
        const len = 46 + Math.sin(t * 50 + sx) * 12;
        ctx.fillStyle = vgrad(-6, len, [[0, 'rgba(255,255,255,.95)'], [0.3, 'rgba(255,200,60,.8)'], [1, 'rgba(255,120,0,0)']]);
        ctx.beginPath(); ctx.moveTo(sx - 7, -8); ctx.quadraticCurveTo(sx, len * 1.5, sx + 7, -8); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.rotate(lean);
    if (blink) ctx.globalAlpha = 0.4;

    // tyres
    ctx.fillStyle = '#0b0d12'; rr(-51, -24, 22, 25, 6); ctx.fill(); rr(29, -24, 22, 25, 6); ctx.fill();
    ctx.fillStyle = '#1c2029'; ctx.fillRect(-46, -22, 3, 21); ctx.fillRect(-39, -22, 3, 21); ctx.fillRect(36, -22, 3, 21); ctx.fillRect(43, -22, 3, 21);

    // cabin + rear glass
    ctx.fillStyle = vgrad(-72, -44, [[0, pt.c[0]], [1, pt.c[1]]]);
    ctx.beginPath(); ctx.moveTo(-40, -44); ctx.quadraticCurveTo(-33, -70, -24, -71); ctx.lineTo(24, -71); ctx.quadraticCurveTo(33, -70, 40, -44); ctx.closePath(); ctx.fill();
    ctx.fillStyle = vgrad(-66, -46, [[0, '#0a1630'], [1, '#2c4f86']]);
    ctx.beginPath(); ctx.moveTo(-33, -47); ctx.quadraticCurveTo(-28, -65, -21, -66); ctx.lineTo(21, -66); ctx.quadraticCurveTo(28, -65, 33, -47); ctx.closePath(); ctx.fill();
    poly('rgba(255,255,255,.2)', [-18, -66, -6, -66, -16, -47, -29, -47]);
    // mirrors
    ctx.fillStyle = pt.c[1]; rr(-49, -55, 10, 6, 2); ctx.fill(); rr(39, -55, 10, 6, 2); ctx.fill();

    // body
    ctx.fillStyle = vgrad(-48, -6, [[0, pt.b[0]], [0.22, pt.b[1]], [0.7, pt.b[2]], [1, pt.b[3]]]);
    ctx.beginPath();
    ctx.moveTo(-52, -16); ctx.lineTo(-52, -36); ctx.quadraticCurveTo(-51, -46, -41, -47);
    ctx.lineTo(41, -47); ctx.quadraticCurveTo(51, -46, 52, -36); ctx.lineTo(52, -16);
    ctx.quadraticCurveTo(52, -8, 44, -8); ctx.lineTo(-44, -8); ctx.quadraticCurveTo(-52, -8, -52, -16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(-40, -46, 80, 2, 1); ctx.fill();
    // racing stripes
    ctx.fillStyle = pt.s; ctx.fillRect(-9, -47, 6, 23); ctx.fillRect(3, -47, 6, 23);
    ctx.fillRect(-8, -71, 5, 5); ctx.fillRect(3, -71, 5, 5);

    // tail lights
    const lit = braking ? 1 : 0.55;
    ctx.globalCompositeOperation = 'lighter';
    glow(-34, -34, 26, [255, 40, 50], 0.5 * lit); glow(34, -34, 26, [255, 40, 50], 0.5 * lit);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#5c0b14'; rr(-22, -36, 44, 5, 2); ctx.fill();
    ctx.fillStyle = vgrad(-39, -30, [[0, braking ? '#ffb0b0' : '#ff6a72'], [1, '#e0142a']]);
    rr(-48, -39, 27, 9, 4); ctx.fill(); rr(21, -39, 27, 9, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(-45, -37.500, 12, 2.500, 1); ctx.fill(); rr(24, -37.500, 12, 2.500, 1); ctx.fill();

    // plate
    ctx.fillStyle = '#f7f9fc'; rr(-15, -27, 30, 11, 2); ctx.fill();
    ctx.fillStyle = '#23226b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 9px ${DISPLAY}`; ctx.fillText(PLATE, 0, -21, 27);

    // bumper + exhausts
    ctx.fillStyle = '#0f1420'; rr(-44, -15, 88, 9, 3.500); ctx.fill();
    disc('#7b8596', -22, -10, 3.600); disc('#12151c', -22, -10, 2.200);
    disc('#7b8596', 22, -10, 3.600); disc('#12151c', 22, -10, 2.200);

    // visible damage, worse with every hit
    if (dmg > 0) {
      poly('rgba(8,12,22,.34)', [14, -46, 40, -46, 46, -38, 30, -30, 18, -36]);
      ctx.strokeStyle = 'rgba(10,14,24,.8)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(28, -45); ctx.lineTo(37, -37); ctx.lineTo(32, -30); ctx.moveTo(37, -37); ctx.lineTo(46, -34); ctx.stroke();
    }
    if (dmg > 1) {
      ctx.fillStyle = '#1a0508'; rr(-48, -39, 27, 9, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-46, -37); ctx.lineTo(-28, -32); ctx.moveTo(-38, -38.500); ctx.lineTo(-33, -31); ctx.stroke();
    }
    if (dmg > 2) {
      poly('rgba(8,12,22,.4)', [-40, -46, -12, -46, -20, -34, -44, -32]);
      ctx.save(); ctx.translate(-44, -14); ctx.rotate(0.15); ctx.fillStyle = '#0f1420'; rr(0, 0, 90, 9, 3.500); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }

  function drawOverlays(t, auto) {
    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of g.parts) {
      if (p.text || p.rect || p.smoke || p.zap) continue;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      disc(p.color, p.x, p.y, p.r);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of g.parts) {
      if (p.smoke) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.55; disc(p.color, p.x, p.y, p.r * (2 - p.life / p.max)); }
      if (p.zap) { // a pickup flying in from another lane
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.strokeStyle = p.color; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lerp(p.x2, p.x, p.life / p.max), playerY - 70); ctx.lineTo(p.x2, playerY - 54); ctx.stroke();
      }
      if (!p.rect) continue;
      ctx.globalAlpha = clamp(p.life / p.max * 2, 0, 1);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const p of g.parts) {
      if (!p.text) continue;
      ctx.globalAlpha = clamp(p.life / p.max * 1.6, 0, 1);
      ctx.font = font(26);
      ctx.strokeStyle = 'rgba(5,13,31,.75)'; ctx.lineWidth = 5; ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    if (auto) { // warp streaks + gold frame while the product does the work
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const ang = (i * 2.399 + Math.floor(t * 12 + i) * 0.7) % (Math.PI * 2);
        const ph = (t * 2.4 + i * 0.37) % 1, r0 = 60 + ph * H * 0.5, r1 = r0 + 40 + ph * 90;
        const cx = cxAt(0), cy = horizon;
        if (Math.sin(ang) < -0.1) continue;
        ctx.strokeStyle = `rgba(255,230,160,${0.5 * (1 - ph)})`; ctx.lineWidth = 1 + ph * 2.500;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      const a = 0.32 + Math.sin(t * 10) * 0.1;
      const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.72);
      gr.addColorStop(0, 'rgba(255,197,51,0)'); gr.addColorStop(1, `rgba(255,197,51,${a})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    if (g.shake > 0) { // red hit flash
      const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      gr.addColorStop(0, 'rgba(229,56,59,0)'); gr.addColorStop(1, `rgba(229,56,59,${g.shake * 1.4})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    if (g.flash > 0) { ctx.fillStyle = `rgba(255,244,200,${g.flash * 0.9})`; ctx.fillRect(0, 0, W, H); }

    if (g.hint > 0) { // how to steer, shown for the first few seconds
      const a = clamp(g.hint, 0, 1), y = H * 0.93, dx = Math.sin(t * 3) * 46;
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = 'rgba(8,18,42,.7)'; rr(W / 2 - 132, y - 22, 264, 44, 22); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(19, 700);
      ctx.fillText('◀   DRAG TO STEER   ▶', W / 2, y + 1);
      ctx.globalAlpha = a * 0.5; disc('#7fd8fb', W / 2 + dx, y, 15);
      ctx.globalAlpha = 1;
    }

    // messages
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const ts of g.toasts) {
      const age = ts.max - ts.life, a = clamp(ts.life / 0.25, 0, 1) * clamp(age / 0.12, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      if (ts.big) { // headline in the middle of the screen
        const size = Math.min(W * 0.2, 92), sc = 1 + clamp(1 - age / 0.16, 0, 1) * 0.6;
        ctx.translate(W / 2, H * 0.4); ctx.scale(sc, sc); ctx.rotate(-0.05);
        ctx.font = font(size);
        ctx.strokeStyle = 'rgba(5,13,31,.9)'; ctx.lineWidth = size * 0.2;
        ctx.strokeText(ts.text, 0, 0, W * 0.92);
        ctx.fillStyle = ts.color === '#ffc533' ? vgrad(-size / 2, size / 2, [[0, '#fff6c4'], [0.5, '#ffc533'], [1, '#ff9500']]) : ts.color;
        ctx.fillText(ts.text, 0, 0, W * 0.92);
        if (ts.sub) {
          ctx.font = font(24, 700); ctx.lineWidth = 6;
          ctx.strokeText(ts.sub, 0, size * 0.72, W * 0.9); ctx.fillStyle = '#fff'; ctx.fillText(ts.sub, 0, size * 0.72, W * 0.9);
        }
      } else { // message bar: fixed spot in the sky, solid backing so it never fights the road
        const maxW = W - 36, y = Math.max(H * 0.2, 168) + (ts.sub ? 12 : 0);
        ctx.font = font(22);
        const w1 = Math.min(ctx.measureText(ts.text).width, maxW - 32);
        ctx.font = `600 16px ${DISPLAY}`;
        const w2 = ts.sub ? Math.min(ctx.measureText(ts.sub).width, maxW - 32) : 0;
        const bw = Math.max(w1, w2) + 36, bh = ts.sub ? 58 : 38;
        // pops in with a bounce and a slight tilt, then settles
        const k = clamp(age / 0.22, 0, 1), pop = 1 + Math.sin(k * Math.PI) * 0.16 - (1 - k) * 0.3;
        ctx.translate(W / 2, y); ctx.scale(pop, pop); ctx.rotate(-0.025 + (1 - k) * -0.05);
        ctx.shadowColor = 'rgba(0,6,30,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(8,18,42,.9)'; rr(-bw / 2, -bh / 2, bw, bh, 16); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = ts.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = ts.color; ctx.font = font(22);
        ctx.fillText(ts.text, 0, ts.sub ? -11 : 1, maxW - 32);
        if (ts.sub) { ctx.fillStyle = '#e6edfb'; ctx.font = `600 16px ${DISPLAY}`; ctx.fillText(ts.sub, 0, 14, maxW - 32); }
      }
      ctx.restore();
    }
  }

  function render(now) {
    const live = g && mode !== 'menu';
    const t = now / 1000;
    ctx.save();
    if (live && mode === 'play' && g.shake > 0) ctx.translate(rnd(-1, 1) * g.shake * 16, rnd(-1, 1) * g.shake * 10);

    const dist = live ? g.dist : attract;
    const progress = live ? g.state + 1 - g.toLine / STATE_LEN : 0;
    const auto = !!(live && g.autopilot > 0);
    curveNow = live ? g.curve : Math.sin(t * 0.35) * 0.7;
    headX = laneX(live ? g.px : 1 + Math.sin(t * 0.7) * 0.45, 1);
    drawWorld(dist, progress, auto, t, live ? g.heading : t * 0.02);

    const items = [];
    const scen = live ? g.scen : menuScen;
    for (const s of scen) items.push({ d: s.d, s });
    if (live) {
      for (const o of g.objs) items.push({ d: o.d, o });
      for (let i = 0; i < 1; i++) {
        const idx = g.state + 1 + i;
        if (idx < STATES.length && !g.finished) items.push({ d: g.toLine + i * STATE_LEN, gi: idx });
      }
    }
    items.sort((a, b) => b.d - a.d);
    for (const it of items) {
      if (it.s) {
        const p = proj(it.s.d);
        ctx.globalAlpha = clamp((SPAWN_D + 20 - it.s.d) / 25, 0, 1);
        drawScenery(it.s, cxAt(p.s) + it.s.side * roadHalf * it.s.off * p.s, p.y, roadHalf * 0.6 * p.s, t);
        ctx.globalAlpha = 1;
      } else if (it.o) { if (it.o.type === 'plaza') drawPlaza(it.o); else drawObj(it.o, t); }
      else drawGantry(it.d, STATES[it.gi], it.gi, clamp(g.sinceLine / 0.5, 0, 1));
    }

    if (live) {
      if (g.magnet > 0) {
        ctx.strokeStyle = `rgba(141,255,180,${0.5 + Math.sin(t * 10) * 0.25})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(laneX(g.px, 1), playerY - 4, roadHalf * 0.36 + Math.sin(t * 6) * 4, roadHalf * 0.1, 0, 0, 7); ctx.stroke();
      }
      drawCar(g.px, g.crashed ? g.spin : clamp((g.tx - g.px) * 0.3, -0.2, 0.2), auto, g.invuln > 0 && !auto && Math.floor(t * 14) % 2 === 0, g.shake > 0 || g.speed < 0.8, t, g.maxHealth - g.health);
      drawWeather(t);
      drawOverlays(t, auto);
    } else {
      drawCar(1 + Math.sin(t * 0.7) * 0.45, Math.cos(t * 0.7) * 0.05, false, false, false, t);
      drawWeather(t);
    }
    ctx.restore();

    // soft vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.5, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(4,10,30,0)'); vg.addColorStop(1, 'rgba(4,10,30,.34)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  // ---------- Main loop ----------
  let menuScen = [];
  let menuAcc = 0;
  function updateMenu(dt) {
    const move = dt * BASE_V * 0.8;
    attract += move; menuAcc += move;
    while (menuAcc >= 11) { menuAcc -= 11; menuScen.push(makeScenery(BIOME.coast, SPAWN_D + 20 - menuAcc)); }
    for (const s of menuScen) s.d -= move;
    menuScen = menuScen.filter((s) => s.d > -13);
  }

  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const target = mode === 'menu' ? 0 : 1;
    if (cam !== target) { cam = clamp(cam + Math.sign(target - cam) * dt * 1.8, 0, 1); frameCamera(); }
    if (mode === 'play') update(dt);
    else if (mode === 'menu') updateMenu(dt);
    render(now);
    requestAnimationFrame(frame);
  }

  // ---------- Input / UI wiring ----------
  // Thumb steering: put a thumb anywhere and slide; the car follows the slide.
  let drag = null;
  const keys = {};
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (mode !== 'play' || g.finished) return;
    drag = { id: e.pointerId, x: e.clientX, tx: g.tx };
    g.hint = Math.min(g.hint, 0.6);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || mode !== 'play' || g.finished) return;
    g.tx = clamp(drag.tx + (e.clientX - drag.x) / (roadHalf * 2 / 3) * 1.2, -0.12, 2.12);
  });
  const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    else if ((e.key === ' ' || e.key === 'Enter') && mode !== 'play') { e.preventDefault(); start(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });
  document.addEventListener('visibilitychange', () => { // silence the engine when the page is in the background
    if (document.hidden) { pause(); songPause(); } else if (mode !== 'paused') songPlay();
    if (!ac) return;
    try { if (document.hidden) { pause(); ac.suspend(); } else ac.resume(); } catch (err) { /* ignore */ }
  });
  document.addEventListener('touchmove', (e) => { if (mode === 'play') e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  $('play').addEventListener('click', start);
  $('again').addEventListener('click', start);
  $('toMenu').addEventListener('click', toMenu);
  $('quit').addEventListener('click', toMenu);
  $('resume').addEventListener('click', resume);
  $('pause').addEventListener('click', pause);
  $('showHow').addEventListener('click', () => showHow(false));
  let fbFrom = null;
  const openFeedback = (from) => { fbFrom = from; from.hidden = true; $('fbStatus').textContent = ''; $('feedback').hidden = false; };
  $('showFb').addEventListener('click', () => openFeedback(el.menu));
  $('overFb').addEventListener('click', () => openFeedback(el.over));
  $('fbCancel').addEventListener('click', () => { $('feedback').hidden = true; if (fbFrom) fbFrom.hidden = false; });
  $('fbForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('fbText').value.trim();
    if (!text) { $('fbStatus').textContent = 'Type an idea first.'; return; }
    $('fbStatus').textContent = 'Sending…';
    $('fbStatus').textContent = await sendFeedback(text, $('fbName').value.trim());
    $('fbText').value = '';
  });
  $('howGo').addEventListener('click', () => {
    store.set('c2c.seenHow', true);
    $('howto').hidden = true;
    if (howThenPlay) begin(); else el.menu.hidden = false;
  });
  $('showBoard').addEventListener('click', () => { fetchRemote(); renderBoard($('menuBoard'), 10); el.menu.hidden = true; el.board.hidden = false; });
  $('closeBoard').addEventListener('click', () => { el.board.hidden = true; el.menu.hidden = false; });
  el.mute.addEventListener('click', () => { muted = !muted; store.set('c2c.muted', muted); paintMute(); unlockAudio(); if (muted) songPause(); else if (mode !== 'paused') songPlay(); });
  // Browsers only allow sound after a tap, and iPhones only count the end of the tap.
  for (const ev of ['pointerup', 'touchend', 'click']) {
    document.addEventListener(ev, () => { unlockAudio(); if (mode !== 'paused') songPlay(); }, { passive: true });
  }
  $('saveForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('name').value.trim().toUpperCase().slice(0, 14) || 'PLAYER';
    saveScore(name);
    $('name').blur();
    $('saveForm').hidden = true;
    $('overBoard').hidden = false;
    renderBoard($('overBoard'), 3, 'today');
  });
  $('share').addEventListener('click', async () => {
    const text = `I titled ${g.state + 1} of 50 states and scored ${fmt(g.score)} in Coast to Coast by ${BRAND}. Beat that!`;
    try {
      const url = location.href.split('#')[0];
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); $('share').textContent = 'Copied!'; setTimeout(() => { $('share').textContent = 'Share my score'; }, 1500); }
    } catch (err) { /* share cancelled */ }
  });

  let roleId = store.get('c2c.role', ROLES[0].id);
  function role() { return ROLES.find((r) => r.id === roleId) || ROLES[0]; }
  ROLES.forEach((r) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = r.label; b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { roleId = r.id; store.set('c2c.role', roleId); paintRoles(); });
    $('roles').appendChild(b);
  });
  function paintRoles() {
    [...$('roles').children].forEach((b, i) => { const on = ROLES[i].id === role().id; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    $('roleInfo').textContent = role().perk;
  }
  paintRoles();

  let paintId = store.get('c2c.paint', PAINTS[0].id);
  function paint() { return PAINTS.find((pt) => pt.id === paintId) || PAINTS[0]; }
  PAINTS.forEach((pt) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', pt.name);
    b.style.background = `linear-gradient(180deg, ${pt.b[0]}, ${pt.b[1]} 40%, ${pt.b[3]})`;
    b.dataset.need = pt.need;
    b.addEventListener('click', () => {
      if (store.get('c2c.stars', 0) >= pt.need) { paintId = pt.id; store.set('c2c.paint', paintId); }
      paintPaints(pt);
    });
    $('paints').appendChild(b);
  });
  function paintPaints(tapped) {
    const have = store.get('c2c.stars', 0);
    [...$('paints').children].forEach((b, i) => {
      b.classList.toggle('on', PAINTS[i].id === paint().id);
      b.classList.toggle('locked', have < PAINTS[i].need);
    });
    $('paintInfo').textContent = tapped && have < tapped.need
      ? `${tapped.name}: earn ${tapped.need - have} more star${tapped.need - have === 1 ? '' : 's'} to unlock.`
      : `${paint().name} · you have ${have} star${have === 1 ? '' : 's'}`;
  }
  paintPaints();
  // Tap the version label to see what the sound system is doing (for troubleshooting on a phone).
  const audioStatus = () => `${BUILD} · song ${song ? (song.error ? 'error ' + song.error.code : song.paused ? 'not playing' : 'playing') + ' (loaded ' + song.readyState + '/4)' : 'missing'}`
    + `${songNote ? ' · ' + songNote : ''} · effects ${ac ? ac.state : 'not started'} · ${muted ? 'muted' : 'sound on'}`;
  $('build').textContent = BUILD;
  $('build').addEventListener('click', () => { $('build').textContent = audioStatus(); });
  $('boardKicker').textContent = LEADERBOARD_URL ? EVENT : 'This device';
  const paintTabs = () => [...$('boardTabs').children].forEach((b) => b.classList.toggle('on', b.dataset.scope === boardScope));
  [...$('boardTabs').children].forEach((b) => b.addEventListener('click', () => { boardScope = b.dataset.scope; paintTabs(); renderBoard($('menuBoard'), 10); }));
  paintTabs();
  fetchRemote();
  $('chip').textContent = `50 states · one ${RUN_SECONDS}-day temp tag`;
  $('eventTag').textContent = `${BRAND}™ by ${COMPANY} · ${EVENT}`;
  document.querySelectorAll('.brand').forEach((n) => { n.textContent = BRAND; });
  paintMute();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();
  for (let i = 0; i < 160; i++) updateMenu(0.05); // pre-fill the roadside for the menu
  if (document.fonts && document.fonts.load) { document.fonts.load(font(20)); document.fonts.load(font(20, 600)); }
  requestAnimationFrame(frame);

  // Offline support when served from a website (skipped inside the native app shell).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.__c2c = { get run() { return g; }, get mode() { return mode; }, steer, pause, resume }; // test hook
})();
