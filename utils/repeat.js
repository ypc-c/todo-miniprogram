// utils/repeat.js
// 重复规则引擎：根据任务当前 dueDate 与 repeat 规则计算下一次到期时间。
// repeat: { type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom', interval, weekdays:[] }

function nextDue(task) {
  const r = task.repeat;
  if (!r || r.type === 'none' || !task.dueDate) return null;
  const d = new Date(task.dueDate);
  const interval = r.interval || 1;

  if (r.type === 'daily') {
    d.setDate(d.getDate() + interval);
  } else if (r.type === 'weekly') {
    if (r.weekdays && r.weekdays.length) {
      const cur = d.getDay();
      let best = null;
      r.weekdays.forEach((w) => {
        let diff = (w - cur + 7) % 7;
        if (diff === 0) diff = 7; // 同一天则顺延一周
        if (best === null || diff < best) best = diff;
      });
      d.setDate(d.getDate() + (best || 7));
    } else {
      d.setDate(d.getDate() + 7);
    }
  } else if (r.type === 'monthly') {
    d.setMonth(d.getMonth() + interval);
  } else if (r.type === 'custom') {
    d.setDate(d.getDate() + interval);
  } else {
    return null;
  }
  return d.getTime();
}

// 将重复任务标记为完成后，生成下一期实例（保持原字段，重置状态）
function spawnNext(task) {
  const nd = nextDue(task);
  if (nd == null) return null;
  return {
    title: task.title,
    note: task.note,
    dueDate: nd,
    priority: task.priority,
    tags: task.tags ? task.tags.slice() : [],
    repeat: task.repeat,
    subtasks: (task.subtasks || []).map((s) => ({ id: s.id, title: s.title, done: false })),
    attachments: [],
    location: task.location,
    status: 'todo'
  };
}

module.exports = { nextDue, spawnNext };
