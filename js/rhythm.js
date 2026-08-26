// Cookie Factory - リズムレーン制御
const HIT_ZONE_PROGRESS = 0.82;
const MAX_LANES = 5;
const BASE_SPAWN_MS = 900;

// ===== BPM変化(テンポの波)=====
// 一定時間ごとにテンポが速くなったり遅くなったりする。速い間は判定が厳しくなり、
// 遅い間は楽になる「息継ぎ」区間になる。リズムセンサー強化で振れ幅を弱められる。
const BPM_PHASES = [
  { type: 'normal', dur: 16000 },
  { type: 'high', dur: 7000 },
  { type: 'normal', dur: 16000 },
  { type: 'low', dur: 7000 }
];
const BPM_CYCLE_TOTAL = BPM_PHASES.reduce((a, p) => a + p.dur, 0);
const BPM_PROFILE = {
  normal: { travelMult: 1, spawnMult: 1, bpm: 120, label: null },
  high: { travelMult: 0.62, spawnMult: 0.72, bpm: 185, label: '⚡ BPM UP! テンポが速くなった!' },
  low: { travelMult: 1.4, spawnMult: 1.3, bpm: 75, label: '🐢 BPM DOWN テンポがゆっくりに…' }
};

const RhythmEngine = (() => {
  let state = null;
  let container = null;
  let bannerEl = null;
  let lanes = []; // { el, trackEl, notes: [], spawnTimer }
  let rafId = null;
  let lastTs = null;
  let running = false;
  let onHit = () => {};
  let onAchievements = () => {};
  let laneCount = 1;
  let bpmClock = 0;
  let currentPhase = 'normal';
  const keyToLane = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, ' ': 0 };

  function init(rootEl, gameState, callbacks) {
    container = rootEl;
    state = gameState;
    onHit = callbacks.onHit || (() => {});
    onAchievements = callbacks.onAchievements || (() => {});
    bannerEl = document.getElementById('bpm-banner');
    document.addEventListener('keydown', handleKeydown);
    rebuildLanes();
  }

  function rebuildLanes() {
    const target = getUnlockedLaneCount(state);
    if (target === laneCount && lanes.length === target) return;
    laneCount = target;
    container.innerHTML = '';
    lanes = [];
    for (let i = 0; i < laneCount; i++) {
      const laneEl = document.createElement('div');
      laneEl.className = 'lane';
      laneEl.dataset.lane = i;
      const track = document.createElement('div');
      track.className = 'lane-track';
      const hitZone = document.createElement('div');
      hitZone.className = 'hit-zone';
      hitZone.style.left = (HIT_ZONE_PROGRESS * 100) + '%';
      const keyLabel = document.createElement('div');
      keyLabel.className = 'lane-key';
      const keys = ['A/SPACE', 'S', 'D', 'F', 'G'];
      keyLabel.textContent = keys[i] || '';
      track.appendChild(hitZone);
      laneEl.appendChild(track);
      laneEl.appendChild(keyLabel);
      laneEl.addEventListener('pointerdown', (e) => { e.preventDefault(); attemptHit(i); }, { passive: false });
      container.appendChild(laneEl);
      lanes.push({ el: laneEl, trackEl: track, notes: [], spawnTimer: Math.random() * BASE_SPAWN_MS });
    }
  }

  function handleKeydown(e) {
    if (e.repeat) return;
    const lane = keyToLane[e.key.toLowerCase()];
    if (lane !== undefined && lane < laneCount) {
      e.preventDefault();
      attemptHit(lane);
    }
  }

  function getFakeChance() {
    let base = 0.05;
    if (currentPhase === 'high') base += 0.05;
    const reduction = getFakeChanceReduction(state);
    return Math.max(0, Math.min(0.35, base - reduction));
  }

  function spawnNote(laneIdx) {
    const lane = lanes[laneIdx];
    const tree = getTreeBonuses(state);
    const isGolden = tree.goldenCookieUnlocked && Math.random() < 0.012;
    const isFake = !isGolden && Math.random() < getFakeChance();
    const el = document.createElement('div');
    el.className = 'note' + (isGolden ? ' note-golden' : '') + (isFake ? ' note-fake' : '');
    el.textContent = isGolden ? '🌟' : '🍪';
    lane.trackEl.appendChild(el);
    const autoRoll = !isFake && Math.random() < getAutoHitChance(state);
    lane.notes.push({ progress: 0, el, golden: isGolden, fake: isFake, judged: false, autoRoll });
  }

  function judgeTier(state, dist) {
    const w = getJudgeWindows(state);
    const magnet = getMagnetBonus(state);
    if (dist <= w.perfect) return 'perfect';
    if (dist <= w.good) return 'good';
    if (dist <= w.ok + magnet) return 'ok';
    return null;
  }

  function attemptHit(laneIdx) {
    const lane = lanes[laneIdx];
    if (!lane) return;
    let best = null, bestDist = Infinity;
    for (const n of lane.notes) {
      if (n.judged) continue;
      const dist = Math.abs(n.progress - HIT_ZONE_PROGRESS);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    if (!best) return;
    const w = getJudgeWindows(state);
    const magnet = getMagnetBonus(state);
    if (bestDist > w.ok + magnet) return; // 範囲外は無反応(空振りペナルティなし)
    if (best.fake) { finishFakeNote(lane, best, true); return; } // ニセモノは判定に関わらずタップ即ミス
    const tier = judgeTier(state, bestDist);
    if (!tier) return;
    finishNote(lane, best, tier);
  }

  function finishNote(lane, note, tier) {
    note.judged = true;
    const result = registerHit(state, tier, note.golden);
    showJudgment(lane, note, tier, result);
    note.el.remove();
    lane.notes = lane.notes.filter(n => n !== note);
    onHit(tier, result.gained, result.crit, note.golden);
    const newly = checkAchievements(state);
    if (newly.length) onAchievements(newly);
  }

  // tapped=true: ニセクッキーをタップしてしまった(コンボ減点) / false: 触れずに正しく見切った
  function finishFakeNote(lane, note, tapped) {
    note.judged = true;
    registerFakeNote(state, tapped);
    if (tapped) {
      showFakeJudgment(lane, note);
      note.el.classList.add('note-fake-hit');
    } else {
      note.el.classList.add('note-fake-passed');
    }
    setTimeout(() => note.el.remove(), tapped ? 250 : 200);
    lane.notes = lane.notes.filter(n => n !== note);
    onHit(tapped ? 'fakeMistake' : 'fakeAvoided', 0, false, false);
    const newly = checkAchievements(state);
    if (newly.length) onAchievements(newly);
  }

  function showJudgment(lane, note, tier, result) {
    const labelMap = { perfect: 'PERFECT!', good: 'GOOD', ok: 'OK', miss: 'MISS' };
    const label = document.createElement('div');
    label.className = 'judge-float judge-' + tier + (result.crit ? ' judge-crit' : '');
    label.textContent = labelMap[tier] + (result.gained ? ` +${CFFormat(result.gained)}` : '');
    const rect = note ? note.el.getBoundingClientRect() : lane.trackEl.getBoundingClientRect();
    const trackRect = lane.trackEl.getBoundingClientRect();
    label.style.left = (rect.left - trackRect.left) + 'px';
    lane.trackEl.appendChild(label);
    requestAnimationFrame(() => label.classList.add('judge-float-anim'));
    setTimeout(() => label.remove(), 700);
  }

  function showFakeJudgment(lane, note) {
    const label = document.createElement('div');
    label.className = 'judge-float judge-fake';
    label.textContent = '⚠️ ニセモノ!';
    const rect = note.el.getBoundingClientRect();
    const trackRect = lane.trackEl.getBoundingClientRect();
    label.style.left = (rect.left - trackRect.left) + 'px';
    lane.trackEl.appendChild(label);
    requestAnimationFrame(() => label.classList.add('judge-float-anim'));
    setTimeout(() => label.remove(), 700);
  }

  function getPhaseAt(clockMs) {
    const t = clockMs % BPM_CYCLE_TOTAL;
    let acc = 0;
    for (const p of BPM_PHASES) {
      acc += p.dur;
      if (t < acc) return p.type;
    }
    return 'normal';
  }

  function updateBpmBanner(phase) {
    if (!bannerEl) return;
    container.classList.toggle('bpm-high', phase === 'high');
    container.classList.toggle('bpm-low', phase === 'low');
    const profile = BPM_PROFILE[phase];
    if (!profile.label) {
      bannerEl.classList.add('hidden');
      return;
    }
    bannerEl.textContent = profile.label;
    bannerEl.className = 'bpm-banner bpm-banner-' + phase;
  }

  function loop(ts) {
    if (!running) return;
    if (lastTs === null) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    dt = Math.min(dt, 100); // タブ復帰時の巨大dt対策

    bpmClock += dt;
    const phase = getPhaseAt(bpmClock);
    if (phase !== currentPhase) {
      currentPhase = phase;
      updateBpmBanner(phase);
    }
    const profile = BPM_PROFILE[phase];
    const stabilizer = getBpmStabilizer(state);
    const travelMult = 1 + (profile.travelMult - 1) * (1 - stabilizer);
    const spawnMult = 1 + (profile.spawnMult - 1) * (1 - stabilizer);
    const travelMs = getTravelMs(state) * travelMult;
    const w = getJudgeWindows(state);
    const magnet = getMagnetBonus(state);

    for (const lane of lanes) {
      lane.spawnTimer -= dt;
      if (lane.spawnTimer <= 0) {
        spawnNote(lanes.indexOf(lane));
        lane.spawnTimer = BASE_SPAWN_MS * spawnMult + (Math.random() * 200 - 100);
      }
      for (const note of lane.notes.slice()) {
        note.progress += dt / travelMs;
        note.el.style.left = (note.progress * 100) + '%';
        if (!note.judged) {
          if (note.autoRoll && note.progress >= HIT_ZONE_PROGRESS - w.perfect * 0.3 && note.progress <= HIT_ZONE_PROGRESS) {
            finishNote(lane, note, 'perfect');
            continue;
          }
          if (note.progress > HIT_ZONE_PROGRESS + w.ok + magnet) {
            if (note.fake) {
              finishFakeNote(lane, note, false);
              continue;
            }
            note.judged = true;
            registerHit(state, 'miss', false);
            note.el.classList.add('note-missed');
            setTimeout(() => note.el.remove(), 200);
            lane.notes = lane.notes.filter(n => n !== note);
            onHit('miss', 0, false, false);
          }
        }
        if (note.progress > 1.2) {
          note.el.remove();
          lane.notes = lane.notes.filter(n => n !== note);
        }
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = null;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function clearAllNotes() {
    for (const lane of lanes) {
      lane.notes.forEach(n => n.el.remove());
      lane.notes = [];
    }
  }

  return { init, start, stop, rebuildLanes, clearAllNotes };
})();
