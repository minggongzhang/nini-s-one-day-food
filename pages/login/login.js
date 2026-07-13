// login.js
const app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    isLogin: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.openId) {
      this.setData({
        isLogin: true,
        avatarUrl: userInfo.avatarUrl || '',
        nickname: userInfo.nickname || ''
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      avatarUrl
    })
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  async handleLogin() {
    const { avatarUrl, nickname } = this.data
    
    if (!avatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      })
      return
    }

    if (!nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '登录中...'
    })

    try {
      if (!app.globalData.openId) {
        const cloudRes = await wx.cloud.callFunction({
          name: 'login'
        })
        app.globalData.openId = cloudRes.result.openid
        wx.setStorageSync('openId', cloudRes.result.openid)
      }

      const userInfo = {
        openId: app.globalData.openId,
        avatarUrl,
        nickname
      }

      app.globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)

      wx.hideLoading()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1000)

    } catch (err) {
      wx.hideLoading()
      console.error('登录失败', err)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  }
})
