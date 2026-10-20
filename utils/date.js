// utils/date.js
// 纯前端日期处理工具，不依赖任何第三方库

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// 当天 0 点的时间戳
function startOfDay(ts) {
  const d = new Date(ts || Date.now());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts) {
  const d = new Date(ts || Date.now());
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// 偏移天数，返回新时间戳
function addDays(ts, days) {
  const d = new Date(ts || Date.now());
  d.setDate(d.getDate() + days);
  return d.getTime();
}

// 格式化为 MM-DD
function formatMD(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 格式化为 YYYY-MM-DD
function formatYMD(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 格式化为 HH:mm
function formatHM(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// 完整日期时间 YYYY-MM-DD HH:mm
function formatDateTime(ts) {
  if (!ts) return '';
  return formatYMD(ts) + ' ' + formatHM(ts);
}

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

// 相对今天的友好描述：今天/明天/周X/MM-DD
function friendlyDate(ts) {
  if (!ts) return '';
  const today = startOfDay(Date.now());
  const target = startOfDay(ts);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff > 2 && diff < 7) return '周' + WEEK_CN[new Date(ts).getDay()];
  return formatMD(ts);
}

module.exports = {
  pad,
  startOfDay,
  endOfDay,
  addDays,
  formatMD,
  formatYMD,
  formatHM,
  formatDateTime,
  friendlyDate,
  WEEK_CN
};
