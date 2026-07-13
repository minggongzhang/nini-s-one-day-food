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

    // 恢复用户登录状态，并做旧数据字段迁移
    let userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      // 兼容旧版本：之前存的是 openId（大写 I），统一迁移为 openid（小写）
      if (userInfo.openId && !userInfo.openid) {
        userInfo.openid = userInfo.openId
        delete userInfo.openId
        wx.setStorageSync('userInfo', userInfo)
      }

      this.globalData.userInfo = userInfo
      this.globalData.openid = userInfo.openid || userInfo.openId || null
      this.globalData.role = userInfo.role
    }
  },

  globalData: {
    userInfo: null,
    openid: null,
    role: null
  }
})
