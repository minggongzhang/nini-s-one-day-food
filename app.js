// app.js
App({
  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-d4g3spkms1f6a1a53',
      traceUser: true
    })

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  globalData: {
    userInfo: null,
    openId: null
  }
})
