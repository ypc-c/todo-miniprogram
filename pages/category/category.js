// pages/category/category.js
const storage = require('../../utils/storage.js');

const PRESET = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6b7280'];

Page({
  data: {
    categories: [],
    newName: '',
    color: PRESET[0],
    preset: PRESET
  },

  onShow() {
    this.load();
  },

  load() {
    this.setData({ categories: storage.getCategories() });
  },

  onName(e) {
    this.setData({ newName: e.detail.value });
  },

  selectColor(e) {
    this.setData({ color: e.currentTarget.dataset.c });
  },

  addCat() {
    if (!this.data.newName.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    storage.addCategory(this.data.newName.trim(), this.data.color);
    this.setData({ newName: '', color: PRESET[0] });
    this.load();
  },

  del(e) {
    const id = e.currentTarget.dataset.id;
    const cat = this.data.categories.find((c) => c.id === id);
    if (cat && cat.builtin) {
      wx.showToast({ title: '内置分类不可删除', icon: 'none' });
      return;
    }
    storage.deleteCategory(id);
    this.load();
  }
});
