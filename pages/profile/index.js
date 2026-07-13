// pages/profile/index.js
const app = getApp()

Page({
  data: {
    userInfo: {},
    shortOpenId: '',
    stats: {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0
    },
    showRechargeModal: false,
    rechargeOptions: [100, 200, 500, 1000],
    rechargeAmount: 200,
    customAmount: '',
    rechargeTarget: 'girlfriend',
    recharging: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    this.loadStats()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabs()
      this.getTabBar().setSelected('/pages/profile/index')
    }
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      const openid = userInfo.openid || userInfo.openId || ''
      this.setData({
        userInfo,
        shortOpenId: openid ? openid.substring(0, 8) + '...' : ''
      })
      app.globalData.userInfo = userInfo
      app.globalData.role = userInfo.role
      app.globalData.openid = openid
    }
  },

  async loadStats() {
    const userInfo = this.data.userInfo
    const openid = userInfo.openid || userInfo.openId
    if (!openid) return

    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: { status: 'all', role: userInfo.role }
      })

      if (res.result && res.result.success) {
        const orders = res.result.data || []
        this.setData({
          stats: {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing').length,
            completedOrders: orders.filter(o => o.status === 'completed').length
          }
        })
      }
    } catch (err) {
      console.error('获取统计失败:', err)
    }
  },

  onRechargeTap() {
    this.setData({ showRechargeModal: true })
  },

  onCloseRecharge() {
    this.setData({ showRechargeModal: false, customAmount: '' })
  },

  onTargetSelect(e) {
    const target = e.currentTarget.dataset.target
    this.setData({ rechargeTarget: target })
  },

  onAmountSelect(e) {
    const amount = e.currentTarget.dataset.amount
    this.setData({ rechargeAmount: amount, customAmount: '' })
  },

  onCustomAmountInput(e) {
    this.setData({ customAmount: e.detail.value, rechargeAmount: 0 })
  },

  async onConfirmRecharge() {
    const { customAmount, rechargeAmount, rechargeTarget, userInfo } = this.data
    const amount = customAmount ? parseInt(customAmount) : rechargeAmount

    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入充值金额', icon: 'none' })
      return
    }

    this.setData({ recharging: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'rechargeBalance',
        data: {
          amount,
          targetRole: rechargeTarget === 'girlfriend' ? 'girlfriend' : null,
          targetOpenid: rechargeTarget === 'self' ? (userInfo.openid || userInfo.openId) : null
        }
      })

      if (res.result && res.result.success) {
        const targetName = res.result.targetNickname || '对方'
        wx.showToast({ title: `已给${targetName}充值 ${amount} 妮妮币`, icon: 'success' })

        // 如果是给自己充值，更新本地余额
        if (rechargeTarget === 'self') {
          const newBalance = res.result.newBalance
          const updatedUserInfo = { ...userInfo, balance: newBalance }
          wx.setStorageSync('userInfo', updatedUserInfo)
          app.globalData.userInfo = updatedUserInfo
          this.setData({ userInfo: updatedUserInfo })
        }

        this.onCloseRecharge()
      } else {
        wx.showToast({ title: res.result.error || '充值失败', icon: 'none' })
      }
    } catch (err) {
      console.error('充值失败:', err)
      wx.showToast({ title: '充值失败', icon: 'none' })
    } finally {
      this.setData({ recharging: false })
    }
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/orders/index' })
  },

  goToFood() {
    wx.switchTab({ url: '/pages/food/index' })
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          app.globalData.userInfo = null
          app.globalData.openid = null
          app.globalData.role = null
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
