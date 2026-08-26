// Cookie Factory - セーブ/ロード
const SAVE_KEY = 'cookieFactorySave_v1';

function saveGame(state) {
  try {
    state.lastActiveTs = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const loaded = JSON.parse(raw);
    const fresh = createInitialState();
    // 欠けているフィールドを補完(バージョンアップ対応)
    const merged = Object.assign({}, fresh, loaded);
    merged.totalHits = Object.assign({}, fresh.totalHits, loaded.totalHits || {});
    merged.reborn = Object.assign({}, fresh.reborn, loaded.reborn || {});
    merged.reborn.treeBought = Object.assign({}, loaded.reborn && loaded.reborn.treeBought || {});
    merged.settings = Object.assign({}, fresh.settings, loaded.settings || {});
    merged.buildings = loaded.buildings || {};
    merged.buildingMilestones = loaded.buildingMilestones || {};
    merged.rhythmUpg = loaded.rhythmUpg || {};
    merged.laneUnlocks = loaded.laneUnlocks || {};
    merged.globalUpg = loaded.globalUpg || {};
    merged.achievements = loaded.achievements || {};
    return merged;
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function importSave(str) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
  } catch (e) {
    return null;
  }
}
