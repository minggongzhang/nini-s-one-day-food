// login.js
const app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    selectedRole: '',
    isLogin: false,
    logging: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    const openid = userInfo && (userInfo.openid || userInfo.openId)
    if (openid) {
      this.setData({
        isLogin: true,
        avatarUrl: userInfo.avatarUrl || '',
        nickname: userInfo.nickname || '',
        selectedRole: userInfo.role || ''
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

  onRoleSelect(e) {
    const role = e.currentTarget.dataset.role
    this.setData({
      selectedRole: role
    })
  },

  async handleLogin() {
    const { avatarUrl, nickname, selectedRole } = this.data

    if (!avatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' })
      return
    }
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (!selectedRole) {
      wx.showToast({ title: '请选择角色', icon: 'none' })
      return
    }

    this.setData({ logging: true })
    wx.showLoading({ title: '登录中...' })

    try {
      // 1. 获取 openid
      let openid = app.globalData.openid
      if (!openid) {
        const cloudRes = await wx.cloud.callFunction({ name: 'login' })
        openid = cloudRes.result.openid
        app.globalData.openid = openid
        wx.setStorageSync('openid', openid)
      }

      // 2. 注册/更新用户信息（含角色）
      const registerRes = await wx.cloud.callFunction({
        name: 'registerUser',
        data: {
          nickname,
          avatarUrl,
          role: selectedRole
        }
      })

      const userData = registerRes.result.data || {}

      // 3. 存储到本地（统一使用 openid 小写）
      const userInfo = {
        openid: openid,
        avatarUrl,
        nickname,
        role: selectedRole,
        balance: userData.balance || 1000
      }

      app.globalData.userInfo = userInfo
      app.globalData.role = selectedRole
      wx.setStorageSync('userInfo', userInfo)

      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1000)

    } catch (err) {
      wx.hideLoading()
      console.error('登录失败', err)
      wx.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      this.setData({ logging: false })
    }
  }
})
