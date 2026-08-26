// Cookie Factory - リズムレーン制御
const HIT_ZONE_PROGRESS = 0.82;
const MAX_LANES = 5;
const BASE_SPAWN_MS = 900;

const RhythmEngine = (() => {
  let state = null;
  let container = null;
  let lanes = []; // { el, trackEl, notes: [], spawnTimer }
  let rafId = null;
  let lastTs = null;
  let running = false;
  let onHit = () => {};
  let onAchievements = () => {};
  let laneCount = 1;
  const keyToLane = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, ' ': 0 };

  function init(rootEl, gameState, callbacks) {
    container = rootEl;
    state = gameState;
    onHit = callbacks.onHit || (() => {});
    onAchievements = callbacks.onAchievements || (() => {});
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

  function spawnNote(laneIdx) {
    const lane = lanes[laneIdx];
    const tree = getTreeBonuses(state);
    const isGolden = tree.goldenCookieUnlocked && Math.random() < 0.012;
    const el = document.createElement('div');
    el.className = 'note' + (isGolden ? ' note-golden' : '');
    el.textContent = isGolden ? '🌟' : '🍪';
    lane.trackEl.appendChild(el);
    const autoRoll = Math.random() < getAutoHitChance(state);
    lane.notes.push({ progress: 0, el, golden: isGolden, judged: false, autoRoll });
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

  function loop(ts) {
    if (!running) return;
    if (lastTs === null) lastTs = ts;
    let dt = ts - lastTs;
    lastTs = ts;
    dt = Math.min(dt, 100); // タブ復帰時の巨大dt対策
    const travelMs = getTravelMs(state);
    const w = getJudgeWindows(state);
    const magnet = getMagnetBonus(state);

    for (const lane of lanes) {
      lane.spawnTimer -= dt;
      if (lane.spawnTimer <= 0) {
        spawnNote(lanes.indexOf(lane));
        lane.spawnTimer = BASE_SPAWN_MS + (Math.random() * 200 - 100);
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
