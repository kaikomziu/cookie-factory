// Cookie Factory - コアゲームロジック

function createInitialState() {
  return {
    dough: 0,
    lifetimeDough: 0,
    bestLifetimeDough: 0, // リボーンをまたいで保持(黄金の種銭計算用)
    totalHits: { perfect: 0, good: 0, ok: 0, miss: 0, golden: 0 },
    combo: 0,
    maxCombo: 0,
    shieldCharges: 0,
    buildings: {},          // id -> count
    buildingMilestones: {}, // "id_count" -> true
    rhythmUpg: {},           // id -> level
    laneUnlocks: {},         // id -> true
    globalUpg: {},           // id -> true
    achievements: {},        // id -> true
    reborn: {
      count: 0,
      grp: 0,          // ゴールデンレシピポイント(所持中)
      lifetimeGrp: 0,
      treeBought: {}
    },
    settings: { reduceMotion: false, muted: false },
    lastActiveTs: Date.now(),
    createdTs: Date.now(),
    playTimeSec: 0
  };
}

// ===== 建物 =====
function getBuildingCount(state, id) { return state.buildings[id] || 0; }

function getCostScale(state) {
  let scale = BUILDING_COST_SCALE;
  if (state.reborn.treeBought['p3']) scale -= 0.01;
  return scale;
}

function getBuildingCost(state, id, qty) {
  qty = qty || 1;
  const b = BUILDINGS.find(x => x.id === id);
  const n = getBuildingCount(state, id);
  const scale = getCostScale(state);
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += b.baseCost * Math.pow(scale, n + i);
  }
  return Math.ceil(total);
}

function getMaxAffordableQty(state, id) {
  const b = BUILDINGS.find(x => x.id === id);
  const n = getBuildingCount(state, id);
  const scale = getCostScale(state);
  let qty = 0, total = 0;
  while (true) {
    const next = b.baseCost * Math.pow(scale, n + qty);
    if (total + next > state.dough || qty >= 9999) break;
    total += next;
    qty++;
  }
  return qty;
}

function getTreeBonuses(state) {
  const t = state.reborn.treeBought;
  const boostAll = t['s6'] ? 1.1 : 1;
  return {
    judgeBonus: ((t['r1'] ? 0.03 : 0) + (t['r2'] ? 0.03 : 0) + (t['r5'] ? 0.05 : 0)) * boostAll,
    speedReduction: (t['r3'] ? 0.08 : 0) * boostAll,
    autoHitBonus: (t['r4'] ? 0.05 : 0) * boostAll,
    graceStart: !!t['r6'],
    prodBonus: ((t['p1'] ? 0.05 : 0) + (t['p2'] ? 0.05 : 0) + (t['p5'] ? 0.10 : 0) + (t['p6'] ? 0.15 : 0)) * boostAll,
    offlineBonus: (t['p4'] ? 0.25 : 0) * boostAll,
    startDough: ((t['g1'] ? 50 : 0) + (t['g3'] ? 500 : 0)) * (1 + state.reborn.count * 0.1),
    comboCapBonus: ((t['g2'] ? 0.5 : 0) + (t['g5'] ? 1.0 : 0)) * boostAll,
    grpGainMult: 1 + ((t['g4'] ? 0.15 : 0) + (t['g6'] ? 0.25 : 0)) * boostAll,
    critBonus: (t['s1'] ? 0.05 : 0) * boostAll,
    shieldBonus: t['s2'] ? 1 : 0,
    magnetBonus: (t['s3'] ? 0.03 : 0) * boostAll,
    goldenCookieUnlocked: !!t['s4'],
    bonusLaneUnlocked: !!t['s5']
  };
}

function getAchievementBonus(state) {
  let bonus = 0;
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) bonus += a.bonus;
  }
  return bonus;
}

function getGlobalProdMult(state) {
  let mult = 1;
  for (const u of GLOBAL_UPGRADES) {
    if (u.target === 'prod' && state.globalUpg[u.id]) mult *= u.mult;
  }
  const tree = getTreeBonuses(state);
  mult *= (1 + tree.prodBonus);
  mult *= (1 + getAchievementBonus(state));
  return mult;
}

function getGlobalHitMult(state) {
  let mult = 1;
  for (const u of GLOBAL_UPGRADES) {
    if (u.target === 'hit' && state.globalUpg[u.id]) mult *= u.mult;
  }
  mult *= (1 + getAchievementBonus(state));
  return mult;
}

function getBuildingMilestoneMult(state, id) {
  const count = getBuildingCount(state, id);
  let mult = 1;
  for (const m of BUILDING_MILESTONE_COUNTS) {
    if (count >= m && state.buildingMilestones[id + '_' + m]) mult *= 2;
  }
  return mult;
}

function getBuildingUnitCps(state, id) {
  const b = BUILDINGS.find(x => x.id === id);
  return b.baseCps * getBuildingMilestoneMult(state, id);
}

function getTotalCps(state) {
  let total = 0;
  for (const b of BUILDINGS) {
    total += getBuildingUnitCps(state, b.id) * getBuildingCount(state, b.id);
  }
  return total * getGlobalProdMult(state);
}

function buyBuilding(state, id, qty) {
  qty = qty === 'max' ? getMaxAffordableQty(state, id) : (qty || 1);
  if (qty <= 0) return false;
  const cost = getBuildingCost(state, id, qty);
  if (state.dough < cost) return false;
  state.dough -= cost;
  state.buildings[id] = (state.buildings[id] || 0) + qty;
  return true;
}

function buyBuildingMilestone(state, id, count) {
  const b = BUILDINGS.find(x => x.id === id);
  const key = id + '_' + count;
  if (state.buildingMilestones[key]) return false;
  if (getBuildingCount(state, id) < count) return false;
  const cost = buildingMilestoneCost(b, count);
  if (state.dough < cost) return false;
  state.dough -= cost;
  state.buildingMilestones[key] = true;
  return true;
}

// ===== リズムアップグレード =====
function getRhythmUpgLevel(state, id) { return state.rhythmUpg[id] || 0; }

function getRhythmUpgCost(state, def) {
  const lv = getRhythmUpgLevel(state, def.id);
  return Math.ceil(def.baseCost * Math.pow(def.costScale, lv));
}

function buyRhythmUpgrade(state, id) {
  const def = RHYTHM_UPGRADES.find(x => x.id === id);
  const lv = getRhythmUpgLevel(state, id);
  if (lv >= def.maxLevel) return false;
  const cost = getRhythmUpgCost(state, def);
  if (state.dough < cost) return false;
  state.dough -= cost;
  state.rhythmUpg[id] = lv + 1;
  return true;
}

function buyLaneUnlock(state, id) {
  const def = LANE_UNLOCKS.find(x => x.id === id);
  if (state.laneUnlocks[id]) return false;
  if (state.dough < def.cost) return false;
  state.dough -= def.cost;
  state.laneUnlocks[id] = true;
  return true;
}

function getUnlockedLaneCount(state) {
  let n = 1;
  for (const l of LANE_UNLOCKS) if (state.laneUnlocks[l.id]) n = Math.max(n, l.lane);
  if (getTreeBonuses(state).bonusLaneUnlocked) n = Math.max(n, 5);
  return n;
}

function buyGlobalUpgrade(state, id) {
  const def = GLOBAL_UPGRADES.find(x => x.id === id);
  if (state.globalUpg[id]) return false;
  if (state.dough < def.cost) return false;
  state.dough -= def.cost;
  state.globalUpg[id] = true;
  return true;
}

// ===== 判定関連の派生値 =====
function getJudgeWindows(state) {
  const tree = getTreeBonuses(state);
  const lv = getRhythmUpgLevel(state, 'judge');
  const bonus = lv * 0.015 + tree.judgeBonus;
  return {
    perfect: 0.05 + bonus,
    good: 0.10 + bonus,
    ok: 0.16 + bonus
  };
}

function getTravelMs(state) {
  const slowLv = getRhythmUpgLevel(state, 'slow');
  const tree = getTreeBonuses(state);
  const extra = slowLv * 150;
  const base = 1800 + extra;
  return base * (1 + tree.speedReduction);
}

function getAutoHitChance(state) {
  const lv = getRhythmUpgLevel(state, 'autohit');
  const tree = getTreeBonuses(state);
  return Math.min(0.9, lv * 0.06 + tree.autoHitBonus);
}

function getCritChance(state) {
  const lv = getRhythmUpgLevel(state, 'crit');
  const tree = getTreeBonuses(state);
  return Math.min(0.9, lv * 0.05 + tree.critBonus);
}

function getShieldMax(state) {
  const lv = getRhythmUpgLevel(state, 'shield');
  const tree = getTreeBonuses(state);
  return lv + tree.shieldBonus;
}

function getMagnetBonus(state) {
  const lv = getRhythmUpgLevel(state, 'magnet');
  const tree = getTreeBonuses(state);
  return lv * 0.02 + tree.magnetBonus;
}

function getHitYieldBase(state) {
  let base = 1;
  for (const b of BUILDINGS) base += getBuildingCount(state, b.id) * 0.02; // 建物が増えるほど1タップの価値も上がる
  return base * getGlobalHitMult(state);
}

function getComboCap(state) {
  const tree = getTreeBonuses(state);
  return 2.0 + tree.comboCapBonus; // 基本+200%まで、ツリーで拡張
}

function getComboMultiplier(state) {
  const raw = Math.floor(state.combo / 10) * 0.1;
  return 1 + Math.min(raw, getComboCap(state));
}

// ===== ヒット処理 =====
// tier: 'perfect' | 'good' | 'ok' | 'miss'
function registerHit(state, tier, isGolden) {
  state.totalHits[tier] = (state.totalHits[tier] || 0) + 1;
  if (tier === 'miss') {
    if (state.shieldCharges > 0) {
      state.shieldCharges--;
    } else {
      state.combo = 0;
    }
    return { gained: 0, crit: false };
  }
  state.combo++;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  let ratio = tier === 'perfect' ? 1 : (tier === 'good' ? 0.6 : 0.3);
  let gained = getHitYieldBase(state) * ratio * getComboMultiplier(state);
  let crit = false;
  if (tier === 'perfect' && Math.random() < getCritChance(state)) {
    gained *= 5;
    crit = true;
  }
  if (isGolden) {
    gained *= 8;
    state.totalHits.golden++;
  }
  state.dough += gained;
  state.lifetimeDough += gained;
  state.bestLifetimeDough = Math.max(state.bestLifetimeDough, state.lifetimeDough);
  return { gained, crit };
}

function addDough(state, amount) {
  state.dough += amount;
  state.lifetimeDough += amount;
  state.bestLifetimeDough = Math.max(state.bestLifetimeDough, state.lifetimeDough);
}

// ===== 実績 =====
function checkAchievements(state) {
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements[a.id] = true;
      newly.push(a);
    }
  }
  return newly;
}

// ===== リボーン =====
const REBORN_THRESHOLD = 1000000;

function canReborn(state) {
  return state.lifetimeDough >= REBORN_THRESHOLD;
}

function getGrpGain(state) {
  if (state.lifetimeDough < REBORN_THRESHOLD) return 0;
  const tree = getTreeBonuses(state);
  const raw = Math.floor(Math.cbrt(state.lifetimeDough / 100000));
  return Math.floor(raw * tree.grpGainMult);
}

function doReborn(state) {
  const gain = getGrpGain(state);
  if (gain <= 0) return 0;
  const tree = getTreeBonuses(state);
  state.dough = tree.startDough;
  state.lifetimeDough = 0;
  state.combo = 0;
  state.shieldCharges = 0;
  state.buildings = {};
  state.buildingMilestones = {};
  state.rhythmUpg = {};
  state.laneUnlocks = {};
  state.globalUpg = {};
  state.reborn.grp += gain;
  state.reborn.lifetimeGrp += gain;
  state.reborn.count++;
  return gain;
}

function isTreeNodeAvailable(state, node) {
  return node.prereq.every(p => state.reborn.treeBought[p]);
}

function buyTreeNode(state, id) {
  const node = TREE_NODES.find(x => x.id === id);
  if (!node) return false;
  if (state.reborn.treeBought[id]) return false;
  if (!isTreeNodeAvailable(state, node)) return false;
  if (state.reborn.grp < node.cost) return false;
  state.reborn.grp -= node.cost;
  state.reborn.treeBought[id] = true;
  return true;
}

// ===== ティック(自動生産) =====
function tick(state, dtSec) {
  const cps = getTotalCps(state);
  addDough(state, cps * dtSec);
  state.playTimeSec += dtSec;
}

function applyOfflineProgress(state, elapsedSec) {
  const tree = getTreeBonuses(state);
  const cappedSec = Math.min(elapsedSec, 8 * 3600); // 最大8時間分
  const efficiency = 0.5 * (1 + tree.offlineBonus); // オフラインは基本50%効率
  const cps = getTotalCps(state);
  const gained = cps * cappedSec * efficiency;
  if (gained > 0) addDough(state, gained);
  return { gained, cappedSec };
}
