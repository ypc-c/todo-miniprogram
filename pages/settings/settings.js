// pages/settings/settings.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    taskCount: 0
  },

  onShow() {
    this.setData({ taskCount: storage.getTasks().length });
  },

  doExport() {
    try {
      const json = storage.exportData();
      const path = storage.exportToFile();
      wx.setClipboardData({
        data: json,
        success() {
          wx.showModal({
            title: '导出成功',
            content: '数据已保存为本地文件，并复制到剪贴板，可粘贴到笔记或发送给电脑备份：\n' + path,
            showCancel: false
          });
        }
      });
    } catch (err) {
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  },

  goGuide() {
    wx.navigateTo({ url: '/pages/guide/guide' });
  }
});
