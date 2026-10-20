// utils/storage.js
// 本地存储封装：任务与分类均存于微信本地 KV（wx.setStorageSync）。
// 附件（图片/语音）走本地文件系统（wx.env.USER_DATA_PATH），仅保存路径引用。

const TASKS_KEY = 'tasks';
const CATEGORIES_KEY = 'categories';

const DEFAULT_CATEGORIES = [
  { id: 'work', name: '工作待办', color: '#3b82f6', builtin: true },
  { id: 'study', name: '学习计划', color: '#8b5cf6', builtin: true },
  { id: 'life', name: '生活杂事', color: '#f59e0b', builtin: true }
];

function initCategories() {
  const cats = wx.getStorageSync(CATEGORIES_KEY);
  if (!cats || !cats.length) {
    wx.setStorageSync(CATEGORIES_KEY, DEFAULT_CATEGORIES);
  }
}

function getCategories() {
  return wx.getStorageSync(CATEGORIES_KEY) || DEFAULT_CATEGORIES;
}

function saveCategories(cats) {
  wx.setStorageSync(CATEGORIES_KEY, cats);
}

function addCategory(name, color) {
  const cats = getCategories();
  const cat = { id: 'c_' + Date.now(), name: name, color: color || '#6b7280', builtin: false };
  cats.push(cat);
  saveCategories(cats);
  return cat;
}

// 内置分类不可删除
function deleteCategory(id) {
  const cats = getCategories().filter((c) => !(c.id === id && !c.builtin));
  saveCategories(cats);
}

function categoryName(id) {
  const c = getCategories().find((x) => x.id === id);
  return c ? c.name : '';
}
function categoryColor(id) {
  const c = getCategories().find((x) => x.id === id);
  return c ? c.color : '#6b7280';
}

// ---------- 任务 ----------
function getTasks() {
  return wx.getStorageSync(TASKS_KEY) || [];
}

function saveTasks(tasks) {
  wx.setStorageSync(TASKS_KEY, tasks);
}

function genId() {
  return 't_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// 新建任务，task 为部分字段对象
function addTask(task) {
  const tasks = getTasks();
  const now = Date.now();
  const full = Object.assign(
    {
      id: genId(),
      title: '',
      note: '',
      dueDate: null,
      priority: 'none',
      tags: [],
      repeat: { type: 'none' },
      subtasks: [],
      attachments: [],
      location: null,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
      completedAt: null
    },
    task
  );
  tasks.push(full);
  saveTasks(tasks);
  return full;
}

function updateTask(id, patch) {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tasks[idx] = Object.assign({}, tasks[idx], patch, { updatedAt: Date.now() });
    saveTasks(tasks);
    return tasks[idx];
  }
  return null;
}

function deleteTask(id) {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
}

function getTask(id) {
  return getTasks().find((t) => t.id === id) || null;
}

// 导出为 JSON 字符串（用户数据备份）
function exportData() {
  return JSON.stringify(
    {
      version: 1,
      app: 'todo-miniprogram',
      exportedAt: Date.now(),
      categories: getCategories(),
      tasks: getTasks()
    },
    null,
    2
  );
}

// 将导出文件写入本地用户目录，返回路径
function exportToFile() {
  const fs = wx.getFileSystemManager();
  const path = `${wx.env.USER_DATA_PATH}/todo-export-${Date.now()}.json`;
  fs.writeFileSync(path, exportData(), 'utf8');
  return path;
}

module.exports = {
  TASKS_KEY,
  CATEGORIES_KEY,
  DEFAULT_CATEGORIES,
  initCategories,
  getCategories,
  saveCategories,
  addCategory,
  deleteCategory,
  categoryName,
  categoryColor,
  getTasks,
  saveTasks,
  addTask,
  updateTask,
  deleteTask,
  getTask,
  genId,
  exportData,
  exportToFile
};
