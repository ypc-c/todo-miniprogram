// utils/nlp.js
// 客户端中文自然语言解析引擎（离线、无云端依赖）。
// 解析：优先级、时间（今天/明天/周X/月日/时点）、重复规则、标签，并提取标题。
// 覆盖常见标准句式；复杂/模糊语句解析失败时退回手动填写。

const storage = require('./storage.js');

const WEEK_MAP = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };

function parsePriority(text) {
  if (/(高优先级|高优先|紧急|重要|高优|优先高|加急)/.test(text)) return 'high';
  if (/(中优先级|中优先|中等|中优|优先中)/.test(text)) return 'medium';
  if (/(低优先级|低优先|不急|低优|优先低|有空|随便)/.test(text)) return 'low';
  return 'none';
}

function parseRepeat(text) {
  if (/每天|每日|天天/.test(text)) return { type: 'daily', interval: 1 };
  if (/每月|每个月|月月/.test(text)) return { type: 'monthly', interval: 1 };
  let m = text.match(/每隔?(\d+)\s*天/);
  if (m) return { type: 'custom', interval: parseInt(m[1], 10) };
  m = text.match(/每(周|星期|周)([一二三四五六日天])?/);
  if (m) {
    if (m[2]) return { type: 'weekly', weekdays: [WEEK_MAP[m[2]]] };
    return { type: 'weekly', weekdays: [] };
  }
  m = text.match(/每周?(\d+)/);
  if (m) return { type: 'weekly', weekdays: [parseInt(m[1], 10) % 7] };
  return null;
}

// 解析时间，返回 { ts, hasTime } 或 null
function parseTime(text) {
  const now = new Date();
  let base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let hasDate = false;
  let hasTime = false;
  let h = 0;
  let m = 0;

  if (/大后天/.test(text)) {
    base.setDate(base.getDate() + 3);
    hasDate = true;
  } else if (/后天/.test(text)) {
    base.setDate(base.getDate() + 2);
    hasDate = true;
  } else if (/明天|明日/.test(text)) {
    base.setDate(base.getDate() + 1);
    hasDate = true;
  } else if (/(今天|今日|现在|这?会儿)/.test(text)) {
    hasDate = true;
  }

  const wm = text.match(/([下这]?)(?:星期|周)([一二三四五六日天])/);
  if (wm) {
    const target = WEEK_MAP[wm[2]];
    const cur = now.getDay();
    let diff = (target - cur + 7) % 7;
    if (wm[1] === '下') diff += 7;
    else if (diff === 0) diff = 7; // 今天星期几则顺延一周
    base.setDate(base.getDate() + diff);
    hasDate = true;
  }

  const md = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (md) {
    base = new Date(now.getFullYear(), parseInt(md[1], 10) - 1, parseInt(md[2], 10));
    hasDate = true;
  } else {
    const slash = text.match(/(\d{1,2})[\/\.\-](\d{1,2})/);
    if (slash) {
      base = new Date(now.getFullYear(), parseInt(slash[1], 10) - 1, parseInt(slash[2], 10));
      hasDate = true;
    }
  }

  const tm = text.match(/(上午|早上|早晨|凌晨|中午|下午|晚上|傍晚)?\s*(\d{1,2})\s*(?:点半|点|时|:(\d{1,2}))/);
  if (tm) {
    h = parseInt(tm[2], 10);
    if (tm[3]) m = parseInt(tm[3], 10);
    else if (/半/.test(tm[0])) m = 30;
    const ap = tm[1];
    if ((ap === '下午' || ap === '晚上' || ap === '傍晚') && h < 12) h += 12;
    if (ap === '凌晨' && h === 12) h = 0;
    if (ap === '中午' && h === 12) h = 12;
    hasTime = true;
  }

  if (!hasDate && !hasTime) return null;
  if (hasTime) base.setHours(h, m, 0, 0);
  else base.setHours(0, 0, 0, 0);
  return { ts: base.getTime(), hasTime };
}

function parseTags(text, categories) {
  const tags = [];
  categories.forEach((c) => {
    if (text.indexOf(c.name) >= 0) {
      tags.push(c.id);
    } else {
      const pre = c.name.slice(0, 2);
      if (pre.length >= 2 && new RegExp(pre + '[:：]').test(text)) {
        tags.push(c.id);
      }
    }
  });
  const m = text.match(/标签[:：]\s*([^\s,，。]+)/);
  if (m) {
    const name = m[1];
    const found = categories.find((c) => c.name === name);
    tags.push(found ? found.id : name);
  }
  return tags;
}

// 主入口：返回 { title, dueDate, hasTime, priority, tags, repeat }
function parseNatural(text, categories) {
  categories = categories || storage.getCategories();
  const priority = parsePriority(text);
  const repeat = parseRepeat(text);
  const time = parseTime(text);
  const tags = parseTags(text, categories);

  let title = text;
  const removeList = [
    /高优先级|中优先级|低优先级|高优先|中优先|低优先|高优|中优|低优|紧急|重要|优先高|优先中|优先低|加急|不急|有空|随便/g,
    /每天|每日|天天|每月|每个月|月月|每隔?\d+\s*天|每(?:周|星期|周)(?:[一二三四五六日天])?|每周?\d+/g,
    /标签[:：][^\s,，。]+/g,
    /大后天|后天|明天|明日|今天|今日|现在|这?会儿/g,
    /\d{1,2}月\d{1,2}[日号]?/g,
    /\d{1,2}[\/\.\-]\d{1,2}/g,
    /(?:上午|早上|早晨|凌晨|中午|下午|晚上|傍晚)?\s*\d{1,2}\s*(?:点半|点|时|:\d{2})/g
  ];
  removeList.forEach((r) => {
    title = title.replace(r, ' ');
  });
  // 移除命中的分类名（全名或“前缀：”简写）
  categories.forEach((c) => {
    if (title.indexOf(c.name) >= 0) {
      title = title.split(c.name).join(' ');
    } else {
      const pre = c.name.slice(0, 2);
      if (pre.length >= 2) {
        const pat = new RegExp(pre + '[:：]');
        if (pat.test(title)) title = title.replace(pat, ' ');
      }
    }
  });
  title = title.replace(/[：:，,。、\s]+/g, ' ').trim();

  return {
    title: title || text,
    dueDate: time ? time.ts : null,
    hasTime: time ? time.hasTime : false,
    priority: priority,
    tags: tags,
    repeat: repeat
  };
}

module.exports = { parseNatural, parsePriority, parseRepeat, parseTime, parseTags };
