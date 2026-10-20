// pages/task/task.js
const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/date.js');

const PRI_OPTIONS = [
  { key: 'high', label: '高' },
  { key: 'medium', label: '中' },
  { key: 'low', label: '低' },
  { key: 'none', label: '无' }
];
const REPEAT_OPTIONS = [
  { key: 'none', label: '不重复' },
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周' },
  { key: 'monthly', label: '每月' },
  { key: 'custom', label: '自定义' }
];
const WEEK_OPTIONS = [
  { w: 0, label: '日' },
  { w: 1, label: '一' },
  { w: 2, label: '二' },
  { w: 3, label: '三' },
  { w: 4, label: '四' },
  { w: 5, label: '五' },
  { w: 6, label: '六' }
];

Page({
  data: {
    mode: 'new',
    id: '',
    title: '',
    note: '',
    dueDate: null,
    hasTime: false,
    dateText: '',
    timeText: '',
    priority: 'none',
    tags: [],
    repeat: { type: 'none', interval: 1, weekdays: [] },
    subtasks: [],
    newSub: '',
    attachments: [],
    location: null,
    recording: false,
    categories: [],
    priOptions: PRI_OPTIONS,
    repeatOptions: REPEAT_OPTIONS,
    weekOptions: WEEK_OPTIONS
  },

  onLoad(options) {
    const categories = storage.getCategories();
    if (options.mode === 'edit' && options.id) {
      const t = storage.getTask(options.id);
      if (t) {
        this.setData({
          mode: 'edit',
          id: t.id,
          title: t.title,
          note: t.note || '',
          dueDate: t.dueDate || null,
          hasTime: !!t.hasTime,
          priority: t.priority || 'none',
          tags: t.tags || [],
          repeat: t.repeat || { type: 'none', interval: 1, weekdays: [] },
          subtasks: t.subtasks || [],
          attachments: t.attachments || [],
          location: t.location || null,
          dateText: t.dueDate ? dateUtil.formatYMD(t.dueDate) : '',
          timeText: t.hasTime && t.dueDate ? dateUtil.formatHM(t.dueDate) : ''
        });
        wx.setNavigationBarTitle({ title: '编辑待办' });
      }
    } else {
      wx.setNavigationBarTitle({ title: '新建待办' });
    }
    this.setData({ categories: categories });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },
  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onDateChange(e) {
    const val = e.detail.value; // YYYY-MM-DD
    const parts = val.split('-').map(Number);
    let dt = this.data.dueDate ? new Date(this.data.dueDate) : new Date();
    dt.setFullYear(parts[0], parts[1] - 1, parts[2]);
    if (!this.data.hasTime) dt.setHours(9, 0, 0, 0);
    this.setData({ dueDate: dt.getTime(), dateText: val });
  },

  onTimeChange(e) {
    const val = e.detail.value; // HH:mm
    const parts = val.split(':').map(Number);
    let dt = this.data.dueDate ? new Date(this.data.dueDate) : new Date();
    dt.setHours(parts[0], parts[1], 0, 0);
    this.setData({ dueDate: dt.getTime(), hasTime: true, timeText: val });
  },

  clearDate() {
    this.setData({ dueDate: null, hasTime: false, dateText: '', timeText: '' });
  },

  selectPriority(e) {
    this.setData({ priority: e.currentTarget.dataset.key });
  },

  toggleTag(e) {
    const id = e.currentTarget.dataset.id;
    const tags = this.data.tags.slice();
    const i = tags.indexOf(id);
    if (i >= 0) tags.splice(i, 1);
    else tags.push(id);
    this.setData({ tags: tags });
  },

  selectRepeat(e) {
    this.setData({ 'repeat.type': e.currentTarget.dataset.key });
  },

  onIntervalInput(e) {
    this.setData({ 'repeat.interval': Number(e.detail.value) || 1 });
  },

  toggleWeekday(e) {
    const w = Number(e.currentTarget.dataset.w);
    const wd = this.data.repeat.weekdays ? this.data.repeat.weekdays.slice() : [];
    const i = wd.indexOf(w);
    if (i >= 0) wd.splice(i, 1);
    else wd.push(w);
    this.setData({ 'repeat.weekdays': wd });
  },

  // 子任务
  onSubInput(e) {
    this.setData({ newSub: e.detail.value });
  },
  addSub() {
    const t = this.data.newSub.trim();
    if (!t) return;
    const subs = this.data.subtasks.concat([{ id: 's_' + Date.now(), title: t, done: false }]);
    this.setData({ subtasks: subs, newSub: '' });
  },
  toggleSub(e) {
    const id = e.currentTarget.dataset.id;
    const subs = this.data.subtasks.map((s) => (s.id === id ? Object.assign({}, s, { done: !s.done }) : s));
    this.setData({ subtasks: subs });
  },
  removeSub(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ subtasks: this.data.subtasks.filter((s) => s.id !== id) });
  },

  // 附件：图片
  chooseImage() {
    const that = this;
    wx.chooseImage({
      count: 9,
      success(res) {
        const fs = wx.getFileSystemManager();
        const atts = that.data.attachments.slice();
        res.tempFilePaths.forEach((p) => {
          const dest = `${wx.env.USER_DATA_PATH}/img_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
          try {
            fs.saveFileSync(p, dest);
            atts.push({ type: 'image', path: dest, size: 0 });
          } catch (err) {
            atts.push({ type: 'image', path: p, size: 0 });
          }
        });
        that.setData({ attachments: atts });
      }
    });
  },

  // 附件：语音
  toggleRecord() {
    if (this.data.recording) {
      if (this.recorder) this.recorder.stop();
      return;
    }
    const that = this;
    this.recorder = wx.getRecorderManager();
    this.recorder.onStop((res) => {
      const fs = wx.getFileSystemManager();
      const dest = `${wx.env.USER_DATA_PATH}/voice_${Date.now()}.mp3`;
      try {
        fs.saveFileSync(res.tempFilePath, dest);
        that.setData({
          attachments: that.data.attachments.concat([{ type: 'voice', path: dest, size: res.fileSize || 0 }]),
          recording: false
        });
      } catch (err) {
        that.setData({
          attachments: that.data.attachments.concat([{ type: 'voice', path: res.tempFilePath, size: res.fileSize || 0 }]),
          recording: false
        });
      }
    });
    this.recorder.start({ duration: 60000, format: 'mp3' });
    this.setData({ recording: true });
  },

  playVoice(e) {
    const path = e.currentTarget.dataset.path;
    const ctx = wx.createInnerAudioContext();
    ctx.src = path;
    ctx.play();
  },

  removeAttachment(e) {
    const idx = e.currentTarget.dataset.idx;
    const atts = this.data.attachments.slice();
    atts.splice(idx, 1);
    this.setData({ attachments: atts });
  },

  previewImage(e) {
    const path = e.currentTarget.dataset.path;
    wx.previewImage({ urls: [path] });
  },

  // 地理位置
  getLocation() {
    const that = this;
    wx.chooseLocation({
      success(res) {
        that.setData({
          location: { name: res.name || res.address, latitude: res.latitude, longitude: res.longitude }
        });
      },
      fail() {
        wx.showToast({ title: '已取消位置选择', icon: 'none' });
      }
    });
  },
  clearLocation() {
    this.setData({ location: null });
  },

  save() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    const data = {
      title: this.data.title,
      note: this.data.note,
      dueDate: this.data.dueDate,
      hasTime: this.data.hasTime,
      priority: this.data.priority,
      tags: this.data.tags,
      repeat: this.data.repeat.type !== 'none' ? this.data.repeat : { type: 'none' },
      subtasks: this.data.subtasks,
      attachments: this.data.attachments,
      location: this.data.location
    };
    if (this.data.mode === 'edit') {
      storage.updateTask(this.data.id, data);
    } else {
      storage.addTask(data);
    }
    wx.navigateBack();
  },

  remove() {
    const that = this;
    wx.showModal({
      title: '删除待办',
      content: '确定删除该待办？',
      success(res) {
        if (res.confirm) {
          storage.deleteTask(that.data.id);
          wx.navigateBack();
        }
      }
    });
  }
});
