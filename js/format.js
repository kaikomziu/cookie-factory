// 数値フォーマット(タウンDELUXEと同じ大数単位方式)
function CFFormat(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  n = Math.floor(n * 100) / 100;
  if (n < 0) return '-' + CFFormat(-n);
  if (n < 1000) return (Math.round(n * 100) / 100).toLocaleString('ja-JP');
  const units = [
    { v: 1e68, s: '無量大数' }, { v: 1e64, s: '不可思議' }, { v: 1e60, s: '那由他' }, { v: 1e56, s: '阿僧祇' },
    { v: 1e52, s: '恒河沙' }, { v: 1e48, s: '極' }, { v: 1e44, s: '載' }, { v: 1e40, s: '正' },
    { v: 1e36, s: '澗' }, { v: 1e32, s: '溝' }, { v: 1e28, s: '穣' }, { v: 1e24, s: '秭' }, { v: 1e20, s: '垓' },
    { v: 1e16, s: '京' }, { v: 1e12, s: '兆' }, { v: 1e8, s: '億' }, { v: 1e4, s: '万' }
  ];
  for (const u of units) {
    if (n >= u.v) {
      const val = n / u.v;
      return (Math.round(val * 100) / 100).toLocaleString('ja-JP') + u.s;
    }
  }
  return Math.round(n).toLocaleString('ja-JP');
}
window.CFFormat = CFFormat;

function CFFormatDuration(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return sec + '秒';
  const m = Math.floor(sec / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (sec < 3600) return `${m}分${sec % 60}秒`;
  if (sec < 86400) return `${h}時間${m % 60}分`;
  return `${d}日${h % 24}時間`;
}
window.CFFormatDuration = CFFormatDuration;
