// Cookie Factory - ゲームデータ定義

// ===== 建物(工場)定義 =====
// baseCost: 1個目のコスト / baseCps: 1個あたりの秒間生産量 / costScale: 購入毎のコスト倍率
const BUILDINGS = [
  { id: 'apprentice', name: '見習いパン職人', emoji: '🧑‍🍳', baseCost: 15,        baseCps: 0.1,   desc: '毎日クッキーの焼き方を練習中。まだ危なっかしい。' },
  { id: 'cart',       name: 'クッキーカート',   emoji: '🛒', baseCost: 100,       baseCps: 1,     desc: '街角で焼きたてクッキーを売り歩く。' },
  { id: 'workshop',   name: '小さな工房',       emoji: '🔨', baseCost: 1100,      baseCps: 8,     desc: '職人が集まって共同作業。生産効率アップ。' },
  { id: 'bakery',     name: 'ベーカリー',       emoji: '🥐', baseCost: 12000,     baseCps: 47,    desc: '本格的なパン屋。オーブンがずらりと並ぶ。' },
  { id: 'mill',       name: 'クッキー製粉所',   emoji: '🌾', baseCost: 130000,    baseCps: 260,   desc: '小麦から一気にクッキー生地を作り出す。' },
  { id: 'factory',    name: 'オートメーション工場', emoji: '🏭', baseCost: 1400000,   baseCps: 1400,  desc: 'ベルトコンベアがクッキーを大量生産。' },
  { id: 'refinery',   name: 'クッキー精製所',   emoji: '⚗️', baseCost: 20000000,  baseCps: 7800,  desc: '純度100%の甘さを化学的に抽出。' },
  { id: 'bank',       name: 'クッキー銀行',     emoji: '🏦', baseCost: 330000000, baseCps: 44000, desc: 'クッキーを預けると勝手に利子で増える。' },
  { id: 'temple',     name: 'クッキー神殿',     emoji: '⛩️', baseCost: 5100000000, baseCps: 260000, desc: '古代からクッキーを崇める信仰の地。' },
  { id: 'portal',     name: '異次元ポータル',   emoji: '🌀', baseCost: 75000000000, baseCps: 1600000, desc: '別次元からクッキーを無限に呼び寄せる。' },
  { id: 'timeoven',   name: 'タイムオーブン',   emoji: '⏳', baseCost: 1000000000000, baseCps: 10000000, desc: '過去と未来で同時に焼き続けるオーブン。' },
  { id: 'reactor',    name: 'クッキー反応炉',   emoji: '☢️', baseCost: 14000000000000, baseCps: 65000000, desc: '臨界を超えた甘さのエネルギーを解放する。' }
];
const BUILDING_COST_SCALE = 1.15;

// ===== リズム系アップグレード(判定を緩める・楽にする系)=====
// levels: 複数レベル購入可能なもの / lanes: レーン解放(一回きり)
const RHYTHM_UPGRADES = [
  {
    id: 'judge', name: '判定強化', emoji: '🎯', maxLevel: 5,
    baseCost: 50, costScale: 6,
    desc: (lv) => `判定ウィンドウを拡大 (Lv${lv}/5)`,
    effectDesc: '全ての判定(PERFECT/GOOD/OK)の範囲が広がり、タイミングが多少ズレても成功しやすくなる。'
  },
  {
    id: 'slow', name: 'スロー再生', emoji: '🐌', maxLevel: 5,
    baseCost: 80, costScale: 6,
    desc: (lv) => `クッキーの流れる速度を減速 (Lv${lv}/5)`,
    effectDesc: 'クッキーがレーンを流れる速度がゆっくりになり、反応する余裕が生まれる。'
  },
  {
    id: 'autohit', name: 'オートヒッター', emoji: '🤖', maxLevel: 5,
    baseCost: 500, costScale: 8,
    desc: (lv) => `自動でクッキーをPERFECT判定 (Lv${lv}/5, 発動率+6%)`,
    effectDesc: '一定確率でクッキーが自動的にPERFECT判定される。プレイしていない瞬間も収益をカバー。'
  },
  {
    id: 'crit', name: 'クリティカルレシピ', emoji: '💥', maxLevel: 5,
    baseCost: 300, costScale: 7,
    desc: (lv) => `PERFECT時にクリティカルが出る確率+5% (Lv${lv}/5)`,
    effectDesc: 'PERFECT判定のとき、まれに5倍のクッキーを獲得できる。'
  },
  {
    id: 'shield', name: 'コンボシールド', emoji: '🛡️', maxLevel: 3,
    baseCost: 2000, costScale: 10,
    desc: (lv) => `MISSしてもコンボが途切れない回数+1 (Lv${lv}/3)`,
    effectDesc: 'MISSしても、シールドが残っていればコンボが途切れない。'
  },
  {
    id: 'magnet', name: 'シュガーマグネット', emoji: '🧲', maxLevel: 3,
    baseCost: 1200, costScale: 8,
    desc: (lv) => `MISS圏内でもOK判定に引き上げる範囲+ (Lv${lv}/3)`,
    effectDesc: 'ギリギリ外れたタイミングでも、砂糖の魔力でOK判定に引き寄せられる。'
  },
  {
    id: 'bpmstable', name: 'リズムセンサー', emoji: '🎚️', maxLevel: 5,
    baseCost: 600, costScale: 6,
    desc: (lv) => `BPM変動の振れ幅を軽減 (Lv${lv}/5)`,
    effectDesc: 'テンポが速く/遅くなる「BPM変化」の影響を弱め、リズムを安定させる。'
  },
  {
    id: 'fakesense', name: '本物センサー', emoji: '🔍', maxLevel: 3,
    baseCost: 900, costScale: 8,
    desc: (lv) => `ニセクッキーの出現率を軽減 (Lv${lv}/3)`,
    effectDesc: '本物そっくりの「ニセクッキー(焦げクッキー)」が紛れ込む確率を下げる。'
  }
];

const LANE_UNLOCKS = [
  { id: 'lane2', lane: 2, cost: 3000,      name: '第2レーン解放', desc: '2本目のレーンを追加。同時にさばけるクッキーが倍増する。' },
  { id: 'lane3', lane: 3, cost: 250000,    name: '第3レーン解放', desc: '3本目のレーンを追加。' },
  { id: 'lane4', lane: 4, cost: 40000000,  name: '第4レーン解放', desc: '4本目のレーンを追加。両手がフル稼働。' }
];

// ===== 生産系グローバルアップグレード =====
const GLOBAL_UPGRADES = [
  { id: 'gprod1', name: '厳選小麦粉', emoji: '🌾', cost: 1000,        mult: 1.1, target: 'prod', desc: '全建物の生産量+10%' },
  { id: 'gprod2', name: '職人技の伝授', emoji: '📜', cost: 50000,      mult: 1.15, target: 'prod', desc: '全建物の生産量+15%' },
  { id: 'gprod3', name: '黄金の型',   emoji: '🥇', cost: 2000000,    mult: 1.25, target: 'prod', desc: '全建物の生産量+25%' },
  { id: 'gprod4', name: '秘伝のタレ', emoji: '🍯', cost: 100000000,  mult: 1.3, target: 'prod', desc: '全建物の生産量+30%' },
  { id: 'gprod5', name: '賢者の砂糖', emoji: '🧙', cost: 8000000000, mult: 1.5, target: 'prod', desc: '全建物の生産量+50%' },
  { id: 'ghit1', name: '力強いタップ', emoji: '👆', cost: 800,        mult: 1.2, target: 'hit', desc: 'クッキー1個あたりの獲得量+20%' },
  { id: 'ghit2', name: '匠のリズム感', emoji: '🎵', cost: 30000,      mult: 1.3, target: 'hit', desc: 'クッキー1個あたりの獲得量+30%' },
  { id: 'ghit3', name: '完璧な指先', emoji: '✨', cost: 1500000,     mult: 1.5, target: 'hit', desc: 'クッキー1個あたりの獲得量+50%' },
  { id: 'ghit4', name: '神業タイミング', emoji: '⚡', cost: 90000000,  mult: 1.8, target: 'hit', desc: 'クッキー1個あたりの獲得量+80%' }
];

// 建物ごとの生産倍率アップグレード(所有数マイルストーンで解放)
const BUILDING_MILESTONE_COUNTS = [1, 5, 10, 25, 50, 100, 200, 350, 500];
function buildingMilestoneCost(building, count) {
  return Math.ceil(building.baseCost * Math.pow(BUILDING_COST_SCALE, count) * count * 6);
}

// ===== 実績 =====
function generateAchievements() {
  const list = [];
  // 生涯クッキー
  const doughMilestones = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000, 100000000000, 1000000000000];
  doughMilestones.forEach((m, i) => {
    list.push({ id: 'dough_' + m, emoji: '🍪', name: `クッキー累計 ${formatNumber(m)}個`, desc: `生涯で${formatNumber(m)}個のクッキーを獲得`, check: s => s.lifetimeDough >= m, bonus: 0.01 });
  });
  // 最大コンボ
  [10, 25, 50, 100, 200, 350, 500, 750, 1000].forEach(m => {
    list.push({ id: 'combo_' + m, emoji: '🔥', name: `${m}コンボ達成`, desc: `1プレイで${m}コンボを繋げる`, check: s => s.maxCombo >= m, bonus: 0.01 });
  });
  // PERFECT数
  [50, 200, 500, 1500, 5000, 15000].forEach(m => {
    list.push({ id: 'perfect_' + m, emoji: '🎯', name: `PERFECT ${m}回`, desc: `PERFECT判定を${m}回出す`, check: s => s.totalHits.perfect >= m, bonus: 0.01 });
  });
  // 建物所有数
  BUILDINGS.forEach(b => {
    [10, 50, 150].forEach(m => {
      list.push({ id: 'build_' + b.id + '_' + m, emoji: b.emoji, name: `${b.name} ${m}個所有`, desc: `${b.name}を${m}個所有する`, check: s => (s.buildings[b.id] || 0) >= m, bonus: 0.005 });
    });
  });
  // リボーン回数
  [1, 3, 5, 10, 20].forEach(m => {
    list.push({ id: 'reborn_' + m, emoji: '🔁', name: `リボーン${m}回`, desc: `${m}回リボーンする`, check: s => s.reborn.count >= m, bonus: 0.02 });
  });
  // ニセクッキー回避数(認識難)
  [20, 100, 500, 2000].forEach(m => {
    list.push({ id: 'fake_' + m, emoji: '🔍', name: `ニセモノ見切り${m}回`, desc: `ニセクッキーを${m}回見抜いて避ける`, check: s => (s.totalHits.fakeAvoided || 0) >= m, bonus: 0.01 });
  });
  return list;
}
function formatNumber(n) {
  return window.CFFormat ? window.CFFormat(n) : String(n);
}
const ACHIEVEMENTS = generateAchievements();

// ===== リボーン(プレステージ)ツリー =====
// branch: rhythm(リズムの道) / prod(生産の道) / golden(黄金の道) / secret(秘伝の道)
// row: 表示上の縦位置(0が起点)
const TREE_NODES = [
  // リズムの道
  { id: 'r1', branch: 'rhythm', row: 0, name: '基礎判定拡大I', emoji: '🎯', cost: 1, prereq: [], desc: '判定ウィンドウ永久+3%' },
  { id: 'r2', branch: 'rhythm', row: 1, name: '基礎判定拡大II', emoji: '🎯', cost: 2, prereq: ['r1'], desc: '判定ウィンドウ永久+3%' },
  { id: 'r3', branch: 'rhythm', row: 2, name: '基礎減速I', emoji: '🐌', cost: 3, prereq: ['r2'], desc: 'クッキー速度永久-8%' },
  { id: 'r4', branch: 'rhythm', row: 3, name: 'オートヒット基盤', emoji: '🤖', cost: 5, prereq: ['r3'], desc: 'オートヒッター発動率永久+5%' },
  { id: 'r5', branch: 'rhythm', row: 4, name: '基礎判定拡大III', emoji: '🎯', cost: 8, prereq: ['r4'], desc: '判定ウィンドウ永久+5%' },
  { id: 'r6', branch: 'rhythm', row: 5, name: '始まりの余裕', emoji: '⏱️', cost: 12, prereq: ['r5'], desc: 'リボーン直後、最初の60秒だけ判定が特大になる' },
  // 生産の道
  { id: 'p1', branch: 'prod', row: 0, name: '効率経営I', emoji: '📈', cost: 1, prereq: [], desc: '全建物の生産量永久+5%' },
  { id: 'p2', branch: 'prod', row: 1, name: '効率経営II', emoji: '📈', cost: 2, prereq: ['p1'], desc: '全建物の生産量永久+5%' },
  { id: 'p3', branch: 'prod', row: 2, name: 'コスト削減I', emoji: '💰', cost: 3, prereq: ['p2'], desc: '建物のコスト上昇率が少し緩やかになる' },
  { id: 'p4', branch: 'prod', row: 3, name: 'オフライン工場', emoji: '🌙', cost: 5, prereq: ['p3'], desc: 'オフライン中の生産効率+25%' },
  { id: 'p5', branch: 'prod', row: 4, name: '効率経営III', emoji: '📈', cost: 8, prereq: ['p4'], desc: '全建物の生産量永久+10%' },
  { id: 'p6', branch: 'prod', row: 5, name: '無限工場理論', emoji: '♾️', cost: 12, prereq: ['p5'], desc: '全建物の生産量永久+15%' },
  // 黄金の道
  { id: 'g1', branch: 'golden', row: 0, name: '黄金の種銭I', emoji: '🌟', cost: 1, prereq: [], desc: 'リボーン後の初期クッキー+' },
  { id: 'g2', branch: 'golden', row: 1, name: 'コンボ上限拡張I', emoji: '🔥', cost: 2, prereq: ['g1'], desc: 'コンボ倍率の上限+50%' },
  { id: 'g3', branch: 'golden', row: 2, name: '黄金の種銭II', emoji: '🌟', cost: 3, prereq: ['g2'], desc: 'リボーン後の初期クッキー+' },
  { id: 'g4', branch: 'golden', row: 3, name: 'レシピ濃縮', emoji: '📖', cost: 5, prereq: ['g3'], desc: 'ゴールデンレシピポイント獲得量+15%' },
  { id: 'g5', branch: 'golden', row: 4, name: 'コンボ上限拡張II', emoji: '🔥', cost: 8, prereq: ['g4'], desc: 'コンボ倍率の上限+100%' },
  { id: 'g6', branch: 'golden', row: 5, name: '永遠の黄金比', emoji: '👑', cost: 12, prereq: ['g5'], desc: 'ゴールデンレシピポイント獲得量+25%' },
  // 秘伝の道
  { id: 's1', branch: 'secret', row: 0, name: '幸運のかけら', emoji: '🍀', cost: 1, prereq: [], desc: 'クリティカル発生率永久+5%' },
  { id: 's2', branch: 'secret', row: 1, name: 'シールド強化', emoji: '🛡️', cost: 2, prereq: ['s1'], desc: 'コンボシールドの効果が永久に1つ追加' },
  { id: 's3', branch: 'secret', row: 2, name: 'マグネット強化', emoji: '🧲', cost: 3, prereq: ['s2'], desc: 'シュガーマグネットの範囲永久+' },
  { id: 's4', branch: 'secret', row: 3, name: '黄金クッキーの噂', emoji: '✨', cost: 6, prereq: ['s3'], desc: 'まれに流れる黄金クッキーが出現(通常の8倍の価値)' },
  { id: 's5', branch: 'secret', row: 4, name: '秘密の第5レーン', emoji: '🌀', cost: 10, prereq: ['s4'], desc: 'ボーナスレーンを永久解放' },
  { id: 's6', branch: 'secret', row: 5, name: '伝説のパン職人', emoji: '🏆', cost: 15, prereq: ['s5'], desc: '全ての永久効果がさらに10%強化される' }
];
