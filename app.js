// app.js
// 纯本机方案：无后端服务器。微信 openid 需后端用 login code 换取，
// 本机方案下我们以“本地稳定标识”代替真实 openid 作为用户身份占位，
// 后续若接入后端，可在此处改为 wx.login + 后端换取 openid 并缓存。
const storage = require('./utils/storage.js');

App({
  globalData: {
    openid: '',
    appReady: false
  },

  onLaunch() {
    // 初始化默认分类
    storage.initCategories();

    // 读取/生成本地用户标识
    let localId = wx.getStorageSync('openid');
    if (!localId) {
      localId = 'u_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      wx.setStorageSync('openid', localId);
    }
    this.globalData.openid = localId;
    this.globalData.appReady = true;

    // 尝试微信登录（无后端时不强制，仅保持兼容）
    this.ensureLogin();
  },

  ensureLogin() {
    wx.login({
      success: (res) => {
        // res.code 可后续发送给后端换取 openid；纯本机方案不处理
        if (res && res.code) {
          wx.setStorageSync('wxLoginCode', res.code);
        }
      },
      fail: () => {
        // 登录失败不影响本地功能
      }
    });
  }
});
