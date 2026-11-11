/* Coast to Coast — a 60-second, 50-state road trip. No dependencies. */
(() => {
  'use strict';

  // ---------- Easy-to-edit settings ----------
  const BRAND = 'DLRdmv';
  const EVENT = 'NADA Show 2027';
  const CTA = `In real life, ${BRAND} does the paperwork grind for you. Stop by our booth for a demo.`;
  const RUN_SECONDS = 60;
  const AUTOPILOT_SECONDS = 4;

  const STATES = ['California', 'Oregon', 'Washington', 'Alaska', 'Hawaii', 'Nevada', 'Idaho', 'Montana', 'Wyoming', 'Utah',
    'Arizona', 'New Mexico', 'Colorado', 'North Dakota', 'South Dakota', 'Nebraska', 'Kansas', 'Oklahoma', 'Texas', 'Minnesota',
    'Iowa', 'Missouri', 'Arkansas', 'Louisiana', 'Wisconsin', 'Illinois', 'Michigan', 'Indiana', 'Ohio', 'Kentucky',
    'Tennessee', 'Mississippi', 'Alabama', 'Maine', 'New Hampshire', 'Vermont', 'Massachusetts', 'Rhode Island', 'Connecticut', 'New York',
    'New Jersey', 'Pennsylvania', 'Delaware', 'Maryland', 'West Virginia', 'Virginia', 'North Carolina', 'South Carolina', 'Georgia', 'Florida'];

  const HAZARDS = [
    { label: 'REJECTED', msg: 'Title rejected!' },
    { label: 'WRONG FEE', msg: 'Wrong fee — redo it!' },
    { label: 'MISFILED', msg: 'Misfiled form!' },
    { label: 'DMV LINE', msg: 'Back of the DMV line!' },
    { label: 'LATE FEE', msg: 'Late fee!' },
    { label: 'RE-SUBMIT', msg: 'Kicked back — resubmit!' },
  ];

  // Scenery: [sky top, sky bottom, ground], starting at a given state index.
  const BIOMES = [
    { at: 0, sky: [[40, 150, 230], [200, 236, 252]], ground: [226, 200, 146], kinds: ['palm', 'palm', 'rock'] },
    { at: 7, sky: [[70, 140, 220], [255, 214, 165]], ground: [212, 150, 92], kinds: ['cactus', 'cactus', 'rock'] },
    { at: 15, sky: [[84, 166, 236], [218, 240, 252]], ground: [205, 184, 92], kinds: ['hay', 'hay', 'barn', 'oak'] },
    { at: 28, sky: [[66, 136, 208], [204, 232, 238]], ground: [76, 146, 86], kinds: ['pine', 'pine', 'oak'] },
    { at: 46, sky: [[58, 56, 140], [255, 156, 112]], ground: [58, 150, 112], kinds: ['palm', 'palm', 'oak'] },
  ];

  // ---------- World tuning ----------
  const K = 0.06;            // perspective strength
  const SPAWN_D = 120;       // distance at which things appear
  const BASE_V = 38;         // world units / second at speed 1
  const ROW_GAP = 30;        // distance between rows of objects
  const STATE_LEN = 60;      // distance between state lines
  const SHIELD_PATH = new Path2D('M12 2 21 5v6c0 6-4 10-9 12C7 21 3 17 3 11V5z');

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
  let lastSaved = -1;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const rgb = (c, k = 1) => `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`;
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
  const sfx = {
    title: (m) => tone(620 + m * 70, 0.08, 'triangle', 0.09),
    shield: (n) => tone(520 + n * 180, 0.16, 'square', 0.06),
    hit: () => { tone(140, 0.25, 'sawtooth', 0.1); tone(90, 0.35, 'square', 0.07, 0.05); },
    state: () => { tone(880, 0.07, 'sine', 0.07); tone(1175, 0.1, 'sine', 0.07, 0.07); },
    jackpot: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.08)),
    finish: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, i * 0.12)),
    end: () => { tone(392, 0.2, 'triangle', 0.09); tone(330, 0.3, 'triangle', 0.09, 0.18); },
  };
  function unlockAudio() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* no audio */ }
  }
  function paintMute() { el.mute.textContent = muted ? '🔇' : '🔊'; }

  // ---------- Layout / projection ----------
  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    horizon = H * 0.3; playerY = H * 0.8; roadHalf = Math.min(W * 0.43, 230);
  }
  function proj(d) {
    const s = 1 / (1 + Math.max(d, -8) * K);
    return { s, y: horizon + (playerY - horizon) * s };
  }
  const laneX = (lane, s) => W / 2 + (lane - 1) * (roadHalf * 2 / 3) * s;

  function biomeAt(p) {
    let i = 0;
    while (i < BIOMES.length - 1 && p >= BIOMES[i + 1].at - 3) i++;
    const cur = BIOMES[i];
    if (i === 0 || p >= cur.at) return { sky: cur.sky, ground: cur.ground, kinds: cur.kinds };
    const prev = BIOMES[i - 1], t = clamp((p - (cur.at - 3)) / 3, 0, 1);
    return {
      sky: [mix(prev.sky[0], cur.sky[0], t), mix(prev.sky[1], cur.sky[1], t)],
      ground: mix(prev.ground, cur.ground, t),
      kinds: t > 0.5 ? cur.kinds : prev.kinds,
    };
  }

  // ---------- Run lifecycle ----------
  function newRun() {
    g = {
      t: 0, intro: 1.2, timeLeft: RUN_SECONDS, dist: 0, score: 0,
      lane: 1, px: 1, speed: 0.6, clean: 0,
      state: 0, toLine: STATE_LEN, shields: 0, autopilot: 0, jackpots: 0,
      streak: 0, mult: 1, titles: 0, invuln: 0, shake: 0,
      objs: [], scen: [], parts: [], toasts: [],
      rowAcc: 0, scenAcc: 0, rowN: 0, lastTwo: false, nextShield: 4,
      finished: false, endDelay: 0,
    };
    toast('California → Florida. GO!', '#fff', 1.3);
  }

  function start() {
    unlockAudio();
    newRun();
    mode = 'play';
    lastSaved = -1;
    el.menu.hidden = el.over.hidden = el.board.hidden = true;
    el.hud.hidden = false;
    paintHud(true);
  }

  function endRun() {
    mode = 'over';
    el.hud.hidden = true;
    const n = g.state + 1;
    const rank = n >= 50 ? 'Coast-to-Coast Legend' : n >= 42 ? 'Cross-Country Closer' : n >= 30 ? 'Multi-State Pro'
      : n >= 16 ? 'Title Clerk in Training' : 'Stuck at the DMV counter';
    $('rank').textContent = rank;
    $('finalScore').textContent = fmt(g.score);
    $('finalStates').textContent = n >= 50
      ? `All 50 states titled with ${Math.ceil(g.timeLeft)}s to spare!`
      : `${n} of 50 states titled · made it to ${STATES[g.state]}`;
    $('cta').textContent = CTA;
    $('saveForm').hidden = false;
    $('name').value = store.get('c2c.name', '');
    renderBoard($('overBoard'), 5);
    el.over.hidden = false;
    if (!g.finished) sfx.end();
  }

  // ---------- Leaderboard (stored on this device) ----------
  const scores = () => store.get('c2c.scores', []);
  function saveScore(name) {
    const list = scores();
    const entry = { name, score: Math.round(g.score), states: g.state + 1, id: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    store.set('c2c.scores', list.slice(0, 25));
    store.set('c2c.name', name);
    lastSaved = entry.id;
  }
  function renderBoard(ol, limit) {
    const list = scores().slice(0, limit);
    ol.textContent = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty'; li.textContent = 'No scores yet — set the pace.';
      ol.appendChild(li);
      return;
    }
    list.forEach((s, i) => {
      const li = document.createElement('li');
      if (s.id === lastSaved) li.className = 'me';
      [['pos', i + 1], ['who', s.name], ['st', `${s.states}/50`], ['pts', fmt(s.score)]].forEach(([c, v]) => {
        const sp = document.createElement('span');
        sp.className = c; sp.textContent = v;
        li.appendChild(sp);
      });
      ol.appendChild(li);
    });
  }

  // ---------- Gameplay ----------
  function toast(text, color = '#fff', life = 1.1, big = false) {
    g.toasts.push({ text, color, life, max: life, big });
    if (g.toasts.length > 3) g.toasts.shift();
  }
  function pop(text, color, lane) {
    g.parts.push({ text, color, x: laneX(lane, 1), y: playerY - 70, vx: rnd(-12, 12), vy: -90, life: 0.8, max: 0.8 });
  }
  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(60, 240);
      g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rnd(0.3, 0.7), max: 0.7, color, r: rnd(2, 5) });
    }
  }
  function add(points, lane, color = '#fff') {
    g.score += points;
    if (lane != null) pop('+' + fmt(points), color, lane);
  }

  function spawnRow(d) {
    g.rowN++;
    if (g.rowN <= 2) return;
    const diff = clamp((RUN_SECONDS - g.timeLeft) / RUN_SECONDS, 0, 1);
    let nH = Math.random() < 0.18 ? 0 : (!g.lastTwo && Math.random() < 0.22 + diff * 0.3 ? 2 : 1);
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const free = lanes.slice(nH);
    g.lastTwo = nH === 2;
    for (let i = 0; i < nH; i++) g.objs.push({ type: 'haz', lane: lanes[i], d, hz: pick(HAZARDS) });
    let shieldLane = -1;
    if (--g.nextShield <= 0 && g.autopilot <= 0) {
      shieldLane = free[0];
      g.objs.push({ type: 'shield', lane: shieldLane, d });
      g.nextShield = 4 + ((Math.random() * 3) | 0);
    }
    for (const l of free) {
      if (l !== shieldLane && Math.random() < 0.6) g.objs.push({ type: 'title', lane: l, d });
    }
  }

  function steer(dir) {
    if (mode !== 'play' || g.finished) return;
    const n = clamp(g.lane + dir, 0, 2);
    if (n !== g.lane) { g.lane = n; tone(300, 0.03, 'sine', 0.03); }
  }

  function hit(o) {
    const lost = g.shields;
    g.shields = 0; g.streak = 0; g.mult = 1;
    g.speed = 0.35; g.clean *= 0.3; g.invuln = 1; g.shake = 0.4;
    burst(laneX(g.px, 1), playerY - 30, '#e5383b', 16);
    toast(lost ? `${o.hz.msg} ${lost} shield${lost > 1 ? 's' : ''} lost` : o.hz.msg, '#ff8a8a', 1.2);
    sfx.hit();
  }

  function jackpot() {
    g.shields = 0; g.jackpots++;
    g.autopilot = AUTOPILOT_SECONDS; g.invuln = 0;
    add(2000);
    toast('JACKPOT!', '#ffc533', 1.5, true);
    burst(W / 2, H * 0.4, '#ffc533', 40);
    sfx.jackpot();
  }

  function crossStateLine() {
    g.state++;
    g.toLine += STATE_LEN;
    add(250);
    sfx.state();
    if (g.state >= STATES.length - 1) {
      g.finished = true; g.endDelay = 2.2; g.autopilot = 0;
      const bonus = 5000 + Math.ceil(g.timeLeft) * 200;
      add(bonus);
      toast('COAST TO COAST!', '#ffc533', 2.2, true);
      toast(`All 50 states · +${fmt(bonus)}`, '#fff', 2.2);
      burst(W / 2, H * 0.4, '#ffc533', 50); burst(W / 2, H * 0.5, '#7cc4ff', 40);
      sfx.finish();
    }
  }

  function update(dt) {
    g.t += dt;
    if (g.finished) {
      g.speed = lerp(g.speed, 0.5, dt * 2);
      g.endDelay -= dt;
      if (g.endDelay <= 0) return endRun();
    } else if (g.intro > 0) {
      g.intro -= dt;
    } else {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0) { g.timeLeft = 0; return endRun(); }
    }

    // Speed: builds while you drive clean, surges on autopilot.
    if (!g.finished) {
      g.clean += dt;
      const target = g.autopilot > 0 ? 2.3 : 1 + 0.6 * clamp(g.clean / 20, 0, 1);
      g.speed = lerp(g.speed, target, clamp(dt * 2, 0, 1));
    }
    const v = g.speed * BASE_V, move = v * dt;
    g.dist += move;
    g.px = lerp(g.px, g.lane, clamp(dt * 16, 0, 1));
    g.invuln = Math.max(0, g.invuln - dt);
    g.shake = Math.max(0, g.shake - dt);
    if (g.autopilot > 0) {
      g.autopilot -= dt;
      if (g.autopilot <= 0) { g.invuln = 1.2; toast('Back to manual…', '#fff', 0.9); }
    }

    // State lines
    if (!g.finished) {
      g.toLine -= move;
      while (g.toLine <= 0 && !g.finished) crossStateLine();
    }

    // Spawning
    if (!g.finished && g.intro <= 0) {
      g.rowAcc += move;
      while (g.rowAcc >= ROW_GAP) { g.rowAcc -= ROW_GAP; spawnRow(SPAWN_D - g.rowAcc); }
    }
    g.scenAcc += move;
    while (g.scenAcc >= 13) {
      g.scenAcc -= 13;
      const b = biomeAt(g.state + 1 - g.toLine / STATE_LEN);
      const kind = Math.random() < 0.06 ? 'bill' : pick(b.kinds);
      g.scen.push({ kind, side: Math.random() < 0.5 ? -1 : 1, off: rnd(1.3, 2.5), d: SPAWN_D + 20 - g.scenAcc });
    }

    // Objects
    const auto = g.autopilot > 0;
    for (const o of g.objs) {
      o.d -= move;
      if (o.done || g.finished) continue;
      const same = Math.abs(g.px - o.lane) < 0.55;
      if (o.type === 'haz') {
        if (auto && o.d < 14) {
          o.done = true; o.approved = 0.5;
          add(150, o.lane, '#7dffa8');
        } else if (same && o.d < 2.5 && o.d > -3 && g.invuln <= 0) {
          o.done = true; o.gone = true; hit(o);
        }
      } else if (o.d < 3 && o.d > -3.5 && (same || (auto && o.d < 3))) {
        o.done = true; o.gone = true;
        if (o.type === 'title') {
          g.titles++; g.streak++;
          g.mult = Math.min(5, 1 + Math.floor(g.streak / 4));
          add(100 * g.mult, o.lane);
          sfx.title(g.mult);
        } else {
          g.shields++;
          add(300, o.lane, '#ffc533');
          sfx.shield(g.shields);
          burst(laneX(g.px, 1), playerY - 40, '#ffc533', 8);
          if (g.shields >= 3) jackpot();
          else if (g.shields === 2) toast('One more shield — press your luck!', '#ffc533', 1.1);
        }
      }
    }
    for (const o of g.objs) if (o.approved) o.approved -= dt;
    g.objs = g.objs.filter((o) => o.d > -7 && !o.gone);
    for (const s of g.scen) s.d -= move;
    g.scen = g.scen.filter((s) => s.d > -7);

    for (const p of g.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.text) p.vy += 500 * dt; }
    g.parts = g.parts.filter((p) => p.life > 0);
    for (const t of g.toasts) t.life -= dt;
    g.toasts = g.toasts.filter((t) => t.life > 0);

    paintHud(false);
  }

  let hudCache = {};
  function setText(node, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; } }
  function paintHud(force) {
    if (force) hudCache = {};
    setText(el.score, 'score', fmt(g.score));
    const secs = Math.ceil(g.timeLeft);
    setText(el.time, 'time', String(secs));
    el.time.classList.toggle('low', secs <= 10);
    setText(el.stateName, 'sn', STATES[g.state]);
    setText(el.stateCount, 'sc', `${g.state + 1} / 50`);
    setText(el.mult, 'mult', g.mult > 1 ? `×${g.mult} streak` : '');
    const auto = g.autopilot > 0;
    const shown = auto ? 3 : g.shields;
    if (hudCache.slots !== shown) {
      hudCache.slots = shown;
      [...el.slots.children].forEach((c, i) => c.classList.toggle('on', i < shown));
    }
    el.slots.classList.toggle('jackpot', auto);
    if (hudCache.auto !== auto) {
      hudCache.auto = auto;
      el.banner.hidden = !auto;
      el.banner.textContent = `${BRAND} AUTOPILOT`;
    }
    const prog = clamp((g.state + 1 - g.toLine / STATE_LEN) / (STATES.length - 1), 0.02, 1);
    el.bar.style.width = (prog * 100).toFixed(1) + '%';
  }

  // ---------- Drawing ----------
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

  function drawWorld(dist, progress, auto) {
    const b = biomeAt(progress);
    const cx = W / 2;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgb(b.sky[0])); sky.addColorStop(1, rgb(b.sky[1]));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon + 1);

    // Sun + distant hills
    ctx.fillStyle = 'rgba(255,244,200,.9)';
    ctx.beginPath(); ctx.arc(W * 0.78, horizon * 0.62, Math.min(W, H) * 0.055, 0, 7); ctx.fill();
    ctx.fillStyle = rgb(mix(b.ground, b.sky[1], 0.55));
    ctx.beginPath(); ctx.moveTo(0, horizon + 1);
    for (let x = 0; x <= W; x += 8) {
      const u = x / W * 6 + progress * 0.25;
      ctx.lineTo(x, horizon - (Math.sin(u) * 0.5 + Math.sin(u * 2.3 + 1) * 0.3 + 1) * H * 0.028);
    }
    ctx.lineTo(W, horizon + 1); ctx.closePath(); ctx.fill();

    // Ground in alternating bands (gives the sense of speed)
    const band = 12, off = dist % (band * 2);
    ctx.fillStyle = rgb(b.ground); ctx.fillRect(0, horizon, W, H - horizon);
    ctx.fillStyle = rgb(b.ground, 0.93);
    for (let d = -8 - off; d < 260; d += band * 2) {
      const y0 = proj(d + band).y, y1 = proj(d).y;
      ctx.fillRect(0, y0, W, Math.max(1, y1 - y0));
    }

    // Road
    const sB = (H - horizon) / (playerY - horizon);
    const tri = (half, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(cx, horizon); ctx.lineTo(cx + half * sB, H); ctx.lineTo(cx - half * sB, H);
      ctx.closePath(); ctx.fill();
    };
    tri(roadHalf * 1.1, '#f1f3f7');
    tri(roadHalf * 1.04, auto ? '#2b3a67' : '#3a4152');

    // Lane dashes
    ctx.fillStyle = auto ? '#ffc533' : '#e9edf5';
    const step = 10, doff = dist % step;
    for (let d = -8 - doff; d < 240; d += step) {
      const a = proj(d + 4), c = proj(d);
      for (const side of [-1, 1]) {
        const o = side * roadHalf / 3;
        ctx.beginPath();
        ctx.moveTo(cx + (o - 4) * a.s, a.y); ctx.lineTo(cx + (o + 4) * a.s, a.y);
        ctx.lineTo(cx + (o + 4) * c.s, c.y); ctx.lineTo(cx + (o - 4) * c.s, c.y);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  function drawScenery(k, x, y, u) {
    ctx.save(); ctx.translate(x, y);
    if (k === 'palm') {
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = u * 0.16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(u * 0.25, -u * 0.9, 0, -u * 1.7); ctx.stroke();
      ctx.strokeStyle = '#2e9e55'; ctx.lineWidth = u * 0.17;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.02 + i * 0.192);
        ctx.beginPath(); ctx.moveTo(0, -u * 1.7);
        ctx.quadraticCurveTo(Math.cos(a) * u * 0.6, -u * 1.7 + Math.sin(a) * u * 0.6 - u * 0.2, Math.cos(a) * u, -u * 1.7 + Math.sin(a) * u * 0.45 + u * 0.25);
        ctx.stroke();
      }
    } else if (k === 'cactus') {
      ctx.fillStyle = '#3c8f4f';
      rr(-u * 0.15, -u * 1.3, u * 0.3, u * 1.3, u * 0.15); ctx.fill();
      rr(-u * 0.5, -u * 0.9, u * 0.2, u * 0.5, u * 0.1); ctx.fill();
      rr(-u * 0.5, -u * 0.55, u * 0.45, u * 0.17, u * 0.08); ctx.fill();
      rr(u * 0.32, -u * 1.1, u * 0.2, u * 0.5, u * 0.1); ctx.fill();
      rr(u * 0.1, -u * 0.75, u * 0.42, u * 0.17, u * 0.08); ctx.fill();
    } else if (k === 'rock') {
      ctx.fillStyle = '#9a8572';
      ctx.beginPath(); ctx.moveTo(-u * 0.6, 0); ctx.lineTo(-u * 0.35, -u * 0.45); ctx.lineTo(u * 0.15, -u * 0.6); ctx.lineTo(u * 0.6, 0); ctx.closePath(); ctx.fill();
    } else if (k === 'hay') {
      ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.arc(0, -u * 0.35, u * 0.35, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b47f22'; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.arc(0, -u * 0.35, u * 0.18, 0, 7); ctx.stroke();
    } else if (k === 'barn') {
      ctx.fillStyle = '#b3312e'; ctx.fillRect(-u * 0.7, -u * 0.9, u * 1.4, u * 0.9);
      ctx.beginPath(); ctx.moveTo(-u * 0.8, -u * 0.9); ctx.lineTo(-u * 0.45, -u * 1.35); ctx.lineTo(u * 0.45, -u * 1.35); ctx.lineTo(u * 0.8, -u * 0.9); ctx.closePath();
      ctx.fillStyle = '#7d1f1d'; ctx.fill();
      ctx.fillStyle = '#f4ecec'; ctx.fillRect(-u * 0.22, -u * 0.55, u * 0.44, u * 0.55);
    } else if (k === 'pine') {
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-u * 0.07, -u * 0.3, u * 0.14, u * 0.3);
      ctx.fillStyle = '#1f6b43';
      for (let i = 0; i < 3; i++) {
        const w = u * (0.6 - i * 0.14), by = -u * (0.25 + i * 0.45);
        ctx.beginPath(); ctx.moveTo(-w, by); ctx.lineTo(0, by - u * 0.7); ctx.lineTo(w, by); ctx.closePath(); ctx.fill();
      }
    } else if (k === 'oak') {
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-u * 0.08, -u * 0.6, u * 0.16, u * 0.6);
      ctx.fillStyle = '#3f9a4a';
      ctx.beginPath(); ctx.arc(0, -u * 0.95, u * 0.5, 0, 7); ctx.arc(-u * 0.35, -u * 0.75, u * 0.32, 0, 7); ctx.arc(u * 0.35, -u * 0.75, u * 0.32, 0, 7); ctx.fill();
    } else if (k === 'bill') {
      ctx.fillStyle = '#5b6474'; ctx.fillRect(-u * 0.7, -u * 0.9, u * 0.1, u * 0.9); ctx.fillRect(u * 0.6, -u * 0.9, u * 0.1, u * 0.9);
      ctx.fillStyle = '#fff'; rr(-u * 1.05, -u * 1.75, u * 2.1, u * 0.95, u * 0.06); ctx.fill();
      ctx.fillStyle = '#1f6feb'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${u * 0.4}px system-ui, sans-serif`; ctx.fillText(BRAND, 0, -u * 1.42);
      ctx.fillStyle = '#0b1b3a'; ctx.font = `700 ${u * 0.2}px system-ui, sans-serif`; ctx.fillText('All 50 states', 0, -u * 1.03);
    }
    ctx.restore();
  }

  function drawGantry(d, name, idx) {
    if (d > SPAWN_D + 30 || d < -4) return;
    const p = proj(d), half = roadHalf * 1.16 * p.s, cx = W / 2;
    const h = roadHalf * 1.25 * p.s, sh = roadHalf * 0.42 * p.s;
    ctx.globalAlpha = clamp((SPAWN_D + 30 - d) / 30, 0, 1) * clamp((d + 4) / 5, 0, 1);
    ctx.fillStyle = '#6a7384';
    ctx.fillRect(cx - half - 3 * p.s, p.y - h, 6 * p.s, h); ctx.fillRect(cx + half - 3 * p.s, p.y - h, 6 * p.s, h);
    ctx.fillStyle = '#12703f'; rr(cx - half, p.y - h - sh * 0.2, half * 2, sh, sh * 0.12); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, 2.5 * p.s); ctx.stroke();
    if (sh > 9) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${sh * 0.42}px system-ui, sans-serif`;
      ctx.fillText(idx === STATES.length - 1 ? `${name} · ${EVENT}` : name, cx, p.y - h + sh * 0.14, half * 1.85);
      ctx.font = `700 ${sh * 0.25}px system-ui, sans-serif`;
      ctx.fillText(idx === STATES.length - 1 ? 'FINISH · 50 / 50' : `STATE LINE · ${idx + 1} / 50`, cx, p.y - h + sh * 0.56, half * 1.85);
    }
    ctx.globalAlpha = 1;
  }

  function drawObj(o, t) {
    const p = proj(o.d), x = laneX(o.lane, p.s), u = (roadHalf * 2 / 3) * p.s; // u = lane width here
    ctx.globalAlpha = clamp((SPAWN_D - o.d) / 20, 0, 1);
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(x, p.y, u * 0.34, u * 0.08, 0, 0, 7); ctx.fill();

    if (o.type === 'haz') {
      const ok = o.approved !== undefined;
      const w = u * 0.84, hgt = u * 0.5, top = p.y - u * 0.72;
      ctx.fillStyle = '#5b6474';
      ctx.fillRect(x - w * 0.4, top + hgt * 0.5, u * 0.05, u * 0.72 - hgt * 0.5); ctx.fillRect(x + w * 0.4 - u * 0.05, top + hgt * 0.5, u * 0.05, u * 0.72 - hgt * 0.5);
      // striped barricade board
      ctx.save();
      rr(x - w / 2, top, w, hgt, u * 0.06); ctx.clip();
      ctx.fillStyle = ok ? '#2fbf71' : '#fff'; ctx.fillRect(x - w / 2, top, w, hgt);
      if (!ok) {
        ctx.fillStyle = '#e5383b';
        for (let i = -2; i < 9; i++) {
          const sx = x - w / 2 + i * w * 0.16;
          ctx.beginPath(); ctx.moveTo(sx, top + hgt); ctx.lineTo(sx + w * 0.08, top + hgt); ctx.lineTo(sx + w * 0.08 + hgt, top); ctx.lineTo(sx + hgt, top); ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
      // label plate
      ctx.fillStyle = ok ? '#eafff1' : '#fff';
      rr(x - w * 0.43, top + hgt * 0.2, w * 0.86, hgt * 0.6, u * 0.04); ctx.fill();
      if (u > 26) {
        ctx.fillStyle = ok ? '#12703f' : '#c1121f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${hgt * 0.36}px system-ui, sans-serif`;
        ctx.fillText(ok ? 'APPROVED' : o.hz.label, x, top + hgt * 0.52, w * 0.8);
      }
    } else if (o.type === 'title') {
      const bob = Math.sin(t * 5 + o.lane + o.d * 0.05) * u * 0.04;
      const w = u * 0.36, hgt = u * 0.46, top = p.y - u * 0.66 + bob;
      ctx.fillStyle = '#fff'; rr(x - w / 2, top, w, hgt, u * 0.04); ctx.fill();
      ctx.strokeStyle = '#1f6feb'; ctx.lineWidth = Math.max(1, u * 0.025); ctx.stroke();
      ctx.fillStyle = '#b8c4dc';
      for (let i = 0; i < 3; i++) ctx.fillRect(x - w * 0.34, top + hgt * (0.16 + i * 0.15), w * (i === 2 ? 0.4 : 0.68), hgt * 0.06);
      ctx.fillStyle = '#2fbf71'; ctx.beginPath(); ctx.arc(x + w * 0.2, top + hgt * 0.74, w * 0.2, 0, 7); ctx.fill();
    } else {
      const bob = Math.sin(t * 4 + o.d * 0.05) * u * 0.05;
      const sc = u * 0.6 / 24;
      ctx.save();
      ctx.translate(x - 12 * sc, p.y - u * 0.82 + bob); ctx.scale(sc, sc);
      ctx.shadowColor = '#ffc533'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffc533'; ctx.fill(SHIELD_PATH);
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke(SHIELD_PATH);
      ctx.strokeStyle = '#0b1b3a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(7.5, 12.5); ctx.lineTo(11, 16); ctx.lineTo(16.5, 8.5); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawCar(px, tilt, auto, blink) {
    const x = laneX(px, 1), w = roadHalf * 2 / 3 * 0.58, h = w * 1.75, y = playerY - h * 0.55;
    ctx.save();
    ctx.translate(x, y + h / 2); ctx.rotate(tilt); ctx.translate(0, -h / 2);
    if (blink) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, h * 0.55, w * 0.62, h * 0.52, 0, 0, 7); ctx.fill();
    if (auto) { ctx.shadowColor = '#ffc533'; ctx.shadowBlur = 28; }
    ctx.fillStyle = '#12151c';
    for (const [sx, sy] of [[-1, 0.14], [1, 0.14], [-1, 0.68], [1, 0.68]]) { rr(sx * w * 0.5 - w * 0.08, h * sy, w * 0.16, h * 0.2, w * 0.05); ctx.fill(); }
    const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    body.addColorStop(0, '#1857c4'); body.addColorStop(0.5, '#3d8bff'); body.addColorStop(1, '#1857c4');
    ctx.fillStyle = body; rr(-w / 2, 0, w, h, w * 0.26); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.fillRect(-w * 0.07, h * 0.02, w * 0.14, h * 0.96);
    ctx.fillStyle = '#0d2247'; rr(-w * 0.37, h * 0.2, w * 0.74, h * 0.2, w * 0.1); ctx.fill();
    rr(-w * 0.35, h * 0.68, w * 0.7, h * 0.13, w * 0.08); ctx.fill();
    ctx.fillStyle = '#2a6fe0'; rr(-w * 0.37, h * 0.4, w * 0.74, h * 0.28, w * 0.05); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-w * 0.07, h * 0.4, w * 0.14, h * 0.28);
    ctx.fillStyle = '#fff7c2'; rr(-w * 0.42, h * 0.015, w * 0.22, h * 0.05, w * 0.03); ctx.fill(); rr(w * 0.2, h * 0.015, w * 0.22, h * 0.05, w * 0.03); ctx.fill();
    ctx.fillStyle = '#ff3b3b'; rr(-w * 0.42, h * 0.935, w * 0.24, h * 0.045, w * 0.03); ctx.fill(); rr(w * 0.18, h * 0.935, w * 0.24, h * 0.045, w * 0.03); ctx.fill();
    ctx.restore();
  }

  function render(now) {
    const play = mode === 'play' && g;
    const t = now / 1000;
    ctx.save();
    if (play && g.shake > 0) ctx.translate(rnd(-1, 1) * g.shake * 16, rnd(-1, 1) * g.shake * 10);

    const dist = g && mode !== 'menu' ? g.dist : attract;
    const progress = g && mode !== 'menu' ? g.state + 1 - g.toLine / STATE_LEN : 0;
    const auto = !!(g && mode !== 'menu' && g.autopilot > 0);
    drawWorld(dist, progress, auto);

    if (g && mode !== 'menu') {
      const items = [];
      for (const s of g.scen) items.push({ d: s.d, s });
      for (const o of g.objs) items.push({ d: o.d, o });
      for (let i = 0; i < 2; i++) {
        const idx = g.state + 1 + i;
        if (idx < STATES.length && !g.finished) items.push({ d: g.toLine + i * STATE_LEN, gi: idx });
      }
      items.sort((a, b) => b.d - a.d);
      for (const it of items) {
        if (it.s) {
          const p = proj(it.s.d);
          ctx.globalAlpha = clamp((SPAWN_D + 20 - it.s.d) / 25, 0, 1);
          drawScenery(it.s.kind, W / 2 + it.s.side * roadHalf * it.s.off * p.s, p.y, roadHalf * 0.55 * p.s);
          ctx.globalAlpha = 1;
        } else if (it.o) drawObj(it.o, t);
        else drawGantry(it.d, STATES[it.gi], it.gi);
      }

      if (auto) { // speed streaks
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const sx = (Math.sin(i * 91.7 + Math.floor(t * 14)) * 0.5 + 0.5) * W, sy = horizon + ((i * 137 + t * 900) % (H - horizon));
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (sx - W / 2) * 0.05, sy + 46); ctx.stroke();
        }
      }
      drawCar(g.px, (g.lane - g.px) * 0.22, auto, g.invuln > 0 && !auto && Math.floor(t * 14) % 2 === 0);

      for (const p of g.parts) {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        if (p.text) {
          ctx.font = '900 20px system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 4; ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
        } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;

      if (auto) { // gold frame while the product does the work
        const a = 0.3 + Math.sin(t * 10) * 0.12;
        const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
        gr.addColorStop(0, 'rgba(255,197,51,0)'); gr.addColorStop(1, `rgba(255,197,51,${a})`);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      g.toasts.forEach((ts, i) => {
        ctx.globalAlpha = clamp(ts.life / 0.3, 0, 1);
        const size = ts.big ? Math.min(W * 0.13, 58) : Math.min(W * 0.052, 22);
        ctx.font = `900 ${size}px system-ui, sans-serif`;
        const y = H * 0.4 + i * 34 + (ts.big ? -10 : 14);
        ctx.strokeStyle = 'rgba(5,13,31,.8)'; ctx.lineWidth = size * 0.22; ctx.lineJoin = 'round';
        ctx.strokeText(ts.text, W / 2, y, W * 0.92); ctx.fillStyle = ts.color; ctx.fillText(ts.text, W / 2, y, W * 0.92);
      });
      ctx.globalAlpha = 1;
    } else {
      drawCar(1 + Math.sin(t * 0.8) * 0.6, Math.cos(t * 0.8) * 0.08, false, false);
    }
    ctx.restore();
  }

  // ---------- Main loop ----------
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (mode === 'play') update(dt);
    else attract += dt * BASE_V * 0.8;
    render(now);
    requestAnimationFrame(frame);
  }

  // ---------- Input / UI wiring ----------
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    steer(e.clientX - r.left < r.width / 2 ? -1 : 1);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft' || e.key === 'a') steer(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd') steer(1);
    else if ((e.key === ' ' || e.key === 'Enter') && mode !== 'play') { e.preventDefault(); start(); }
  });
  document.addEventListener('touchmove', (e) => { if (mode === 'play') e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  $('play').addEventListener('click', start);
  $('again').addEventListener('click', start);
  $('showBoard').addEventListener('click', () => { renderBoard($('menuBoard'), 10); el.menu.hidden = true; el.board.hidden = false; });
  $('closeBoard').addEventListener('click', () => { el.board.hidden = true; el.menu.hidden = false; });
  el.mute.addEventListener('click', () => { muted = !muted; store.set('c2c.muted', muted); paintMute(); unlockAudio(); });
  $('saveForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('name').value.trim().toUpperCase().slice(0, 14) || 'PLAYER';
    saveScore(name);
    $('name').blur();
    $('saveForm').hidden = true;
    renderBoard($('overBoard'), 5);
  });
  $('share').addEventListener('click', async () => {
    const text = `I titled ${g.state + 1} of 50 states and scored ${fmt(g.score)} in ${BRAND} Coast to Coast. Beat that!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); $('share').textContent = 'Copied!'; setTimeout(() => { $('share').textContent = 'Share my score'; }, 1500); }
    } catch (err) { /* share cancelled */ }
  });

  $('eventTag').textContent = `${BRAND} · ${EVENT}`;
  document.querySelectorAll('.brand').forEach((n) => { n.textContent = BRAND; });
  paintMute();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();
  requestAnimationFrame(frame);

  // Offline support when served from a website (skipped inside the native app shell).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.__c2c = { get run() { return g; }, get mode() { return mode; }, steer }; // test hook
})();
