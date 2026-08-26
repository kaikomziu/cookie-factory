// Cookie Factory - UI描画
const UI = (() => {
  let state = null;
  let activeTab = 'buildings';
  let buyQty = 1; // 1 | 10 | 'max'
  let onAction = () => {};

  function init(gameState, actionCallback) {
    state = gameState;
    onAction = actionCallback;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderPanel();
      });
    });
    document.getElementById('changelog-btn').addEventListener('click', showChangelog);
    renderPanel();
  }

  function fmt(n) { return CFFormat(n); }

  // ===== ステータスバー =====
  function updateStats() {
    document.getElementById('stat-dough').textContent = fmt(state.dough) + '🍪';
    document.getElementById('stat-cps').textContent = fmt(getTotalCps(state)) + '/秒';
    const comboMult = getComboMultiplier(state);
    const comboEl = document.getElementById('stat-combo');
    comboEl.textContent = `${state.combo} (×${comboMult.toFixed(1)})`;
    comboEl.classList.toggle('combo-hot', state.combo >= 30);
    document.getElementById('stat-grp').textContent = fmt(state.reborn.grp);
    document.getElementById('stat-grp-wrap').classList.toggle('hidden', state.reborn.lifetimeGrp === 0 && state.reborn.grp === 0 && !canReborn(state));
  }

  // ===== パネル切り替え =====
  function renderPanel() {
    const el = document.getElementById('panel-content');
    if (activeTab === 'buildings') el.innerHTML = renderBuildingsHtml();
    else if (activeTab === 'upgrades') el.innerHTML = renderUpgradesHtml();
    else if (activeTab === 'achievements') el.innerHTML = renderAchievementsHtml();
    else if (activeTab === 'reborn') el.innerHTML = renderRebornHtml();
    else if (activeTab === 'settings') el.innerHTML = renderSettingsHtml();
    bindPanelEvents(el);
  }

  // ===== 工場(建物)パネル =====
  function renderBuildingsHtml() {
    const qtyBtns = ['1', '10', 'max'].map(q =>
      `<button class="qty-btn ${buyQty == q ? 'active' : ''}" data-qty="${q}">${q === 'max' ? 'MAX' : '×' + q}</button>`
    ).join('');
    const cards = BUILDINGS.map(b => {
      const count = getBuildingCount(state, b.id);
      const cost = getBuildingCost(state, b.id, buyQty === 'max' ? Math.max(1, getMaxAffordableQty(state, b.id)) : buyQty);
      const affordable = state.dough >= cost;
      const unitCps = getBuildingUnitCps(state, b.id);
      const totalCps = unitCps * count * getGlobalProdMult(state);
      const milestoneHtml = BUILDING_MILESTONE_COUNTS.filter(m => count >= m && !state.buildingMilestones[b.id + '_' + m])
        .slice(0, 1).map(m => {
          const mcost = buildingMilestoneCost(b, m);
          const can = state.dough >= mcost;
          return `<button class="milestone-btn ${can ? '' : 'disabled'}" data-milestone="${b.id}:${m}">⚡ ${m}個達成ボーナス(生産×2) - ${fmt(mcost)}🍪</button>`;
        }).join('');
      return `<div class="card building-card ${affordable ? '' : 'unaffordable'}">
        <div class="card-icon">${b.emoji}</div>
        <div class="card-body">
          <div class="card-title">${b.name} <span class="card-count">×${count}</span></div>
          <div class="card-desc">${b.desc}</div>
          <div class="card-sub">1個: ${fmt(unitCps)}/秒 ${count > 0 ? ` ・ 合計: ${fmt(totalCps)}/秒` : ''}</div>
          ${milestoneHtml}
        </div>
        <button class="buy-btn" data-buy-building="${b.id}" ${affordable ? '' : 'disabled'}>
          ${fmt(cost)}🍪<br><small>購入 ${buyQty === 'max' ? '(MAX)' : '×' + buyQty}</small>
        </button>
      </div>`;
    }).join('');
    return `<div class="panel-header"><h2>🏭 工場</h2><div class="qty-selector">${qtyBtns}</div></div>
      <div class="card-list">${cards}</div>`;
  }

  // ===== 強化パネル =====
  function renderUpgradesHtml() {
    const rhythmCards = RHYTHM_UPGRADES.map(def => {
      const lv = getRhythmUpgLevel(state, def.id);
      const maxed = lv >= def.maxLevel;
      const cost = maxed ? 0 : getRhythmUpgCost(state, def);
      const affordable = !maxed && state.dough >= cost;
      return `<div class="card upgrade-card ${affordable ? '' : 'unaffordable'} ${maxed ? 'maxed' : ''}">
        <div class="card-icon">${def.emoji}</div>
        <div class="card-body">
          <div class="card-title">${def.name}</div>
          <div class="card-desc">${maxed ? 'MAXレベルに到達しました' : def.desc(lv + 1)}</div>
          <div class="card-sub">${def.effectDesc}</div>
        </div>
        ${maxed ? '<div class="maxed-badge">MAX</div>' : `<button class="buy-btn" data-buy-rhythm="${def.id}" ${affordable ? '' : 'disabled'}>${fmt(cost)}🍪</button>`}
      </div>`;
    }).join('');
    const laneCards = LANE_UNLOCKS.map(def => {
      const bought = !!state.laneUnlocks[def.id];
      const affordable = state.dough >= def.cost;
      return `<div class="card upgrade-card ${bought ? 'maxed' : (affordable ? '' : 'unaffordable')}">
        <div class="card-icon">🛤️</div>
        <div class="card-body">
          <div class="card-title">${def.name}</div>
          <div class="card-desc">${def.desc}</div>
        </div>
        ${bought ? '<div class="maxed-badge">解放済</div>' : `<button class="buy-btn" data-buy-lane="${def.id}" ${affordable ? '' : 'disabled'}>${fmt(def.cost)}🍪</button>`}
      </div>`;
    }).join('');
    const globalCards = GLOBAL_UPGRADES.map(def => {
      const bought = !!state.globalUpg[def.id];
      const affordable = state.dough >= def.cost;
      return `<div class="card upgrade-card ${bought ? 'maxed' : (affordable ? '' : 'unaffordable')}">
        <div class="card-icon">${def.emoji}</div>
        <div class="card-body">
          <div class="card-title">${def.name}</div>
          <div class="card-desc">${def.desc}</div>
        </div>
        ${bought ? '<div class="maxed-badge">購入済</div>' : `<button class="buy-btn" data-buy-global="${def.id}" ${affordable ? '' : 'disabled'}>${fmt(def.cost)}🍪</button>`}
      </div>`;
    }).join('');
    return `<div class="panel-header"><h2>⬆️ 強化</h2></div>
      <h3 class="section-title">🎯 リズムを楽にする</h3>
      <div class="card-list">${rhythmCards}${laneCards}</div>
      <h3 class="section-title">📈 生産・収益アップ</h3>
      <div class="card-list">${globalCards}</div>`;
  }

  // ===== 実績パネル =====
  function renderAchievementsHtml() {
    const unlockedCount = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
    const items = ACHIEVEMENTS.map(a => {
      const unlocked = !!state.achievements[a.id];
      return `<div class="achv ${unlocked ? 'unlocked' : 'locked'}" title="${a.desc}">
        <div class="achv-icon">${unlocked ? a.emoji : '🔒'}</div>
        <div class="achv-name">${a.name}</div>
      </div>`;
    }).join('');
    return `<div class="panel-header"><h2>🏆 実績 (${unlockedCount}/${ACHIEVEMENTS.length})</h2></div>
      <div class="achv-grid">${items}</div>`;
  }

  // ===== リボーンパネル =====
  function renderRebornHtml() {
    const eligible = canReborn(state);
    const grpGain = getGrpGain(state);
    const branches = [
      { key: 'rhythm', label: '🎯 リズムの道', color: 'branch-rhythm' },
      { key: 'prod', label: '📈 生産の道', color: 'branch-prod' },
      { key: 'golden', label: '🌟 黄金の道', color: 'branch-golden' },
      { key: 'secret', label: '🍀 秘伝の道', color: 'branch-secret' }
    ];
    const maxRow = Math.max(...TREE_NODES.map(n => n.row));
    let treeHtml = '<div class="tree-grid">';
    for (const br of branches) {
      treeHtml += `<div class="tree-col ${br.color}"><div class="tree-col-label">${br.label}</div>`;
      for (let row = 0; row <= maxRow; row++) {
        const node = TREE_NODES.find(n => n.branch === br.key && n.row === row);
        if (!node) { treeHtml += '<div class="tree-slot empty"></div>'; continue; }
        const bought = !!state.reborn.treeBought[node.id];
        const available = isTreeNodeAvailable(state, node);
        const affordable = state.reborn.grp >= node.cost;
        let cls = 'locked';
        if (bought) cls = 'bought';
        else if (available) cls = affordable ? 'available' : 'available unaffordable';
        treeHtml += `<div class="tree-slot">
          ${row > 0 ? '<div class="tree-connector"></div>' : ''}
          <button class="tree-node ${cls}" data-tree-node="${node.id}" title="${node.desc}" ${(bought || !available) ? 'disabled' : ''}>
            <span class="tree-node-icon">${bought ? node.emoji : (available ? node.emoji : '🔒')}</span>
            <span class="tree-node-name">${node.name}</span>
            <span class="tree-node-cost">${bought ? '習得済' : node.cost + '🌟'}</span>
          </button>
        </div>`;
      }
      treeHtml += '</div>';
    }
    treeHtml += '</div>';

    return `<div class="panel-header"><h2>🔁 リボーン</h2></div>
      <div class="reborn-summary">
        <p>生涯クッキー: <strong>${fmt(state.lifetimeDough)}🍪</strong> (必要: ${fmt(REBORN_THRESHOLD)}🍪)</p>
        <p>リボーンすると工場・強化・所持クッキーがリセットされますが、代わりに <strong>🌟ゴールデンレシピポイント ${grpGain}個</strong> を獲得し、下のツリーに永久投資できます。</p>
        <p>現在の🌟GRP: <strong>${fmt(state.reborn.grp)}</strong> ・ リボーン回数: <strong>${state.reborn.count}</strong>回</p>
        <button id="reborn-btn" class="reborn-btn" ${eligible ? '' : 'disabled'}>${eligible ? `🔁 リボーンする (+${grpGain}🌟)` : `あと${fmt(Math.max(0, REBORN_THRESHOLD - state.lifetimeDough))}🍪でリボーン可能`}</button>
      </div>
      <h3 class="section-title">🌳 アップグレードツリー</h3>
      ${treeHtml}`;
  }

  // ===== 設定パネル =====
  function renderSettingsHtml() {
    const h = state.totalHits;
    return `<div class="panel-header"><h2>⚙️ 設定</h2></div>
      <div class="settings-list">
        <label class="setting-row"><span>🔇 効果音を消す</span><input type="checkbox" id="set-muted" ${state.settings.muted ? 'checked' : ''}></label>
        <label class="setting-row"><span>🎞️ 演出を減らす(軽量モード)</span><input type="checkbox" id="set-motion" ${state.settings.reduceMotion ? 'checked' : ''}></label>
      </div>
      <h3 class="section-title">📊 統計</h3>
      <div class="stats-box">
        <div>プレイ時間: ${CFFormatDuration(state.playTimeSec)}</div>
        <div>PERFECT: ${fmt(h.perfect)} / GOOD: ${fmt(h.good)} / OK: ${fmt(h.ok)} / MISS: ${fmt(h.miss)}</div>
        <div>黄金クッキー獲得: ${fmt(h.golden)}</div>
        <div>最大コンボ: ${fmt(state.maxCombo)}</div>
        <div>生涯クッキー: ${fmt(state.lifetimeDough)}🍪</div>
      </div>
      <h3 class="section-title">💾 セーブデータ</h3>
      <div class="save-box">
        <button id="export-btn" class="secondary-btn">📤 セーブデータを書き出す</button>
        <textarea id="export-area" class="export-area hidden" readonly></textarea>
        <button id="import-btn" class="secondary-btn">📥 セーブデータを読み込む</button>
        <textarea id="import-area" class="export-area hidden" placeholder="ここに書き出したデータを貼り付け"></textarea>
        <button id="import-confirm-btn" class="secondary-btn hidden">読み込み実行</button>
        <button id="reset-btn" class="danger-btn">🗑️ 最初からやり直す</button>
      </div>`;
  }

  // ===== イベントバインド =====
  function bindPanelEvents(root) {
    root.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        buyQty = btn.dataset.qty === 'max' ? 'max' : parseInt(btn.dataset.qty, 10);
        renderPanel();
      });
    });
    root.querySelectorAll('[data-buy-building]').forEach(btn => {
      btn.addEventListener('click', () => onAction('buyBuilding', { id: btn.dataset.buyBuilding, qty: buyQty }));
    });
    root.querySelectorAll('[data-milestone]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [id, count] = btn.dataset.milestone.split(':');
        onAction('buyMilestone', { id, count: parseInt(count, 10) });
      });
    });
    root.querySelectorAll('[data-buy-rhythm]').forEach(btn => {
      btn.addEventListener('click', () => onAction('buyRhythm', { id: btn.dataset.buyRhythm }));
    });
    root.querySelectorAll('[data-buy-lane]').forEach(btn => {
      btn.addEventListener('click', () => onAction('buyLane', { id: btn.dataset.buyLane }));
    });
    root.querySelectorAll('[data-buy-global]').forEach(btn => {
      btn.addEventListener('click', () => onAction('buyGlobal', { id: btn.dataset.buyGlobal }));
    });
    root.querySelectorAll('[data-tree-node]').forEach(btn => {
      btn.addEventListener('click', () => onAction('buyTreeNode', { id: btn.dataset.treeNode }));
    });
    const rebornBtn = root.querySelector('#reborn-btn');
    if (rebornBtn) rebornBtn.addEventListener('click', () => onAction('reborn', {}));

    const muted = root.querySelector('#set-muted');
    if (muted) muted.addEventListener('change', () => onAction('setSetting', { key: 'muted', value: muted.checked }));
    const motion = root.querySelector('#set-motion');
    if (motion) motion.addEventListener('change', () => onAction('setSetting', { key: 'reduceMotion', value: motion.checked }));

    const exportBtn = root.querySelector('#export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const area = root.querySelector('#export-area');
      area.value = exportSave(state);
      area.classList.remove('hidden');
      area.select();
      try { navigator.clipboard.writeText(area.value); toast('📋 コピーしました', 'info'); } catch (e) {}
    });
    const importBtn = root.querySelector('#import-btn');
    if (importBtn) importBtn.addEventListener('click', () => {
      root.querySelector('#import-area').classList.remove('hidden');
      root.querySelector('#import-confirm-btn').classList.remove('hidden');
    });
    const importConfirm = root.querySelector('#import-confirm-btn');
    if (importConfirm) importConfirm.addEventListener('click', () => {
      const val = root.querySelector('#import-area').value;
      onAction('importSave', { data: val });
    });
    const resetBtn = root.querySelector('#reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => confirmModal('本当に最初からやり直しますか?この操作は取り消せません。', () => onAction('resetSave', {})));
  }

  // ===== トースト =====
  function toast(msg, type) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-show'));
    setTimeout(() => { el.classList.remove('toast-show'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  function achievementToast(a) {
    toast(`🏆 実績解除: ${a.name}`, 'achievement');
  }

  // ===== モーダル =====
  function confirmModal(msg, onYes) {
    const modal = document.getElementById('confirm-modal');
    modal.innerHTML = `<div class="modal-box">
      <p>${msg}</p>
      <div class="modal-actions">
        <button class="secondary-btn" id="confirm-no">キャンセル</button>
        <button class="danger-btn" id="confirm-yes">実行する</button>
      </div>
    </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#confirm-no').addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('#confirm-yes').addEventListener('click', () => { modal.classList.add('hidden'); onYes(); });
  }

  function showChangelog() {
    const modal = document.getElementById('changelog-modal');
    const items = CHANGELOG.map(c => `<div class="changelog-entry">
      <div class="changelog-version">v${c.version} <span class="changelog-date">${c.date}</span></div>
      <ul>${c.notes.map(n => `<li>${n}</li>`).join('')}</ul>
    </div>`).join('');
    modal.innerHTML = `<div class="modal-box modal-box-lg">
      <h2>📜 更新履歴</h2>
      <div class="changelog-list">${items}</div>
      <div class="modal-actions"><button class="secondary-btn" id="changelog-close">閉じる</button></div>
    </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#changelog-close').addEventListener('click', () => modal.classList.add('hidden'));
  }

  function showOfflineModal(gained, sec) {
    if (gained <= 0) return;
    const modal = document.getElementById('offline-modal');
    modal.innerHTML = `<div class="modal-box">
      <h2>🌙 おかえりなさい</h2>
      <p>${CFFormatDuration(sec)}離れていた間に、工場が自動で稼働していました。</p>
      <p class="offline-gain">+${fmt(gained)}🍪</p>
      <div class="modal-actions"><button class="secondary-btn" id="offline-close">受け取る</button></div>
    </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#offline-close').addEventListener('click', () => modal.classList.add('hidden'));
  }

  function showRebornModal(gain) {
    const modal = document.getElementById('reborn-modal');
    modal.innerHTML = `<div class="modal-box">
      <h2>🔁 リボーン完了!</h2>
      <p>🌟ゴールデンレシピポイントを <strong>${gain}個</strong> 獲得しました。</p>
      <p>「リボーン」タブのツリーで永久強化を購入できます。</p>
      <div class="modal-actions"><button class="secondary-btn" id="reborn-modal-close">閉じる</button></div>
    </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#reborn-modal-close').addEventListener('click', () => modal.classList.add('hidden'));
  }

  function refreshIfActive(tabs) {
    if (tabs.includes(activeTab)) renderPanel();
  }

  return { init, updateStats, renderPanel, toast, achievementToast, showChangelog, showOfflineModal, showRebornModal, confirmModal, refreshIfActive, getActiveTab: () => activeTab };
})();
