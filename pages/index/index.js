// pages/index/index.js
const storage = require('../../utils/storage.js');
const nlp = require('../../utils/nlp.js');
const dateUtil = require('../../utils/date.js');
const repeatUtil = require('../../utils/repeat.js');

const PRI_TEXT = { high: '高', medium: '中', low: '低', none: '' };
const REPEAT_TEXT = { none: '', daily: '每天', weekly: '每周', monthly: '每月', custom: '自定义' };

Page({
  data: {
    filter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'today', label: '今天' },
      { key: 'overdue', label: '逾期' },
      { key: 'done', label: '已完成' }
    ],
    categories: [],
    list: [],
    quickText: '',
    preview: null,
    previewView: null
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const categories = storage.getCategories();
    const tasks = storage.getTasks();
    const startToday = dateUtil.startOfDay(Date.now());
    const endToday = dateUtil.endOfDay(Date.now());
    const filter = this.data.filter;

    let filtered = tasks.filter((t) => {
      if (filter === 'done') return t.status === 'done';
      if (t.status !== 'todo') return false;
      if (filter === 'all') return true;
      if (filter === 'today') return t.dueDate && t.dueDate >= startToday && t.dueDate <= endToday;
      if (filter === 'overdue') return t.dueDate && t.dueDate < startToday;
      // 分类筛选
      return t.tags && t.tags.indexOf(filter) >= 0;
    });

    // 逾期优先、再按时间升序
    filtered.sort((a, b) => {
      const ao = a.dueDate ? (a.dueDate < startToday ? 0 : 1) : 2;
      const bo = b.dueDate ? (b.dueDate < startToday ? 0 : 1) : 2;
      if (ao !== bo) return ao - bo;
      return (a.dueDate || 1e15) - (b.dueDate || 1e15);
    });

    const list = filtered.map((t) => {
      const subTotal = (t.subtasks || []).length;
      const subDone = (t.subtasks || []).filter((s) => s.done).length;
      const tagChips = (t.tags || [])
        .map((id) => ({ name: storage.categoryName(id), color: storage.categoryColor(id) }))
        .filter((c) => c.name);
      return {
        id: t.id,
        title: t.title,
        done: t.status === 'done',
        dueText: t.dueDate ? dateUtil.friendlyDate(t.dueDate) + (t.hasTime ? ' ' + dateUtil.formatHM(t.dueDate) : '') : '',
        overdue: t.status === 'todo' && t.dueDate && t.dueDate < startToday,
        priorityClass: 'pri-' + t.priority,
        subProgress: subTotal ? subDone + '/' + subTotal : '',
        tagChips: tagChips
      };
    });

    // 分类筛选标签（动态追加到 filters 之后）
    const catFilters = categories.map((c) => ({ key: c.id, label: c.name, color: c.color }));
    this.setData({ categories: categories, list: list, _catFilters: catFilters });
  },

  switchFilter(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ filter: key }, () => this.loadData());
  },

  onQuickInput(e) {
    const text = e.detail.value;
    let preview = null;
    let previewView = null;
    if (text && text.trim()) {
      preview = nlp.parseNatural(text);
      const tagNames = (preview.tags || [])
        .map((id) => storage.categoryName(id))
        .filter((n) => n);
      previewView = {
        title: preview.title,
        time: preview.dueDate ? dateUtil.friendlyDate(preview.dueDate) + (preview.hasTime ? ' ' + dateUtil.formatHM(preview.dueDate) : '') : '无',
        priority: PRI_TEXT[preview.priority] || '无',
        repeat: REPEAT_TEXT[preview.repeat ? preview.repeat.type : 'none'] || '无',
        tags: tagNames.join('、') || '无'
      };
    }
    this.setData({ quickText: text, preview: preview, previewView: previewView });
  },

  addQuick() {
    const p = this.data.preview;
    if (!p || !p.title) {
      wx.showToast({ title: '请输入待办内容', icon: 'none' });
      return;
    }
    storage.addTask({
      title: p.title,
      dueDate: p.dueDate,
      hasTime: p.hasTime,
      priority: p.priority,
      tags: p.tags,
      repeat: p.repeat && p.repeat.type !== 'none' ? p.repeat : { type: 'none' }
    });
    this.setData({ quickText: '', preview: null, previewView: null });
    wx.showToast({ title: '已添加', icon: 'success' });
    this.loadData();
  },

  toggleDone(e) {
    const id = e.currentTarget.dataset.id;
    const task = storage.getTask(id);
    if (!task) return;
    if (task.status === 'todo') {
      storage.updateTask(id, { status: 'done', completedAt: Date.now() });
      if (task.repeat && task.repeat.type !== 'none') {
        const next = repeatUtil.spawnNext(task);
        if (next) storage.addTask(next);
      }
    } else {
      storage.updateTask(id, { status: 'todo', completedAt: null });
    }
    this.loadData();
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/task/task?mode=new' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/task/task?mode=edit&id=' + id });
  }
});
