// Cookie Factory - エントリーポイント
(function () {
  let state = loadGame();
  let isNewGame = false;
  if (!state) {
    state = createInitialState();
    isNewGame = true;
  }

  // オフライン進行
  if (!isNewGame && state.lastActiveTs) {
    const elapsedSec = (Date.now() - state.lastActiveTs) / 1000;
    if (elapsedSec > 30) {
      const { gained, cappedSec } = applyOfflineProgress(state, elapsedSec);
      if (gained > 0) {
        setTimeout(() => UI.showOfflineModal(gained, cappedSec), 300);
      }
    }
  }

  function handleAction(type, payload) {
    let changed = false;
    let refreshTabs = [];
    switch (type) {
      case 'buyBuilding':
        changed = buyBuilding(state, payload.id, payload.qty);
        refreshTabs = ['buildings'];
        break;
      case 'buyMilestone':
        changed = buyBuildingMilestone(state, payload.id, payload.count);
        refreshTabs = ['buildings'];
        break;
      case 'buyRhythm':
        changed = buyRhythmUpgrade(state, payload.id);
        refreshTabs = ['upgrades'];
        break;
      case 'buyLane':
        changed = buyLaneUnlock(state, payload.id);
        refreshTabs = ['upgrades'];
        if (changed) RhythmEngine.rebuildLanes();
        break;
      case 'buyGlobal':
        changed = buyGlobalUpgrade(state, payload.id);
        refreshTabs = ['upgrades'];
        break;
      case 'buyTreeNode':
        changed = buyTreeNode(state, payload.id);
        refreshTabs = ['reborn'];
        if (changed) RhythmEngine.rebuildLanes();
        break;
      case 'reborn':
        UI.confirmModal('リボーンすると工場・強化・所持クッキーがリセットされます。🌟ゴールデンレシピポイントは永久に残ります。実行しますか?', () => {
          const gain = doReborn(state);
          if (gain > 0) {
            RhythmEngine.rebuildLanes();
            RhythmEngine.clearAllNotes();
            UI.showRebornModal(gain);
            UI.renderPanel();
            UI.updateStats();
            saveGame(state);
          }
        });
        return;
      case 'setSetting':
        state.settings[payload.key] = payload.value;
        changed = true;
        break;
      case 'importSave':
        try {
          const imported = importSave(payload.data);
          if (imported && typeof imported.dough === 'number') {
            state = Object.assign(createInitialState(), imported);
            saveGame(state);
            UI.toast('✅ 読み込みました。ページを再読み込みします', 'info');
            setTimeout(() => location.reload(), 1000);
          } else {
            UI.toast('⚠️ データを読み込めませんでした', 'warn');
          }
        } catch (e) {
          UI.toast('⚠️ データを読み込めませんでした', 'warn');
        }
        return;
      case 'resetSave':
        deleteSave();
        location.reload();
        return;
    }
    if (changed) {
      saveGame(state);
      UI.updateStats();
      UI.refreshIfActive(refreshTabs);
    }
  }

  RhythmEngine.init(document.getElementById('lanes-container'), state, {
    onHit: (tier, gained, crit, golden) => {
      UI.updateStats();
    },
    onAchievements: (newly) => {
      newly.forEach(a => UI.achievementToast(a));
      UI.refreshIfActive(['achievements']);
      saveGame(state);
    }
  });
  RhythmEngine.start();

  UI.init(state, handleAction);
  UI.updateStats();

  // 秒間生産ティック
  let lastTickTs = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTickTs) / 1000, 2);
    lastTickTs = now;
    if (document.hidden) return;
    tick(state, dt);
    UI.updateStats();
    if (UI.getActiveTab() === 'buildings' || UI.getActiveTab() === 'reborn') UI.renderPanel();
  }, 500);

  // オートセーブ
  setInterval(() => saveGame(state), 15000);
  window.addEventListener('beforeunload', () => saveGame(state));
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(state); });
})();
