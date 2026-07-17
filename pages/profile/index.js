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
    recharging: false,
    showBindModal: false,
    inviteCode: '',
    inputInviteCode: '',
    binding: false,
    partnerInfo: {},
    showUnbindModal: false,
    unbinding: false,
    hasPendingOrders: false,
    pendingOrdersCount: 0
  },

  onLoad() {
    this.loadUserInfo()
    this.loadInviteCode()
    this.getPartnerNickName()
  },

  onShow() {
    this.loadUserInfo()
    this.loadInviteCode()
    this.loadStats()
    this.getPartnerNickName()
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
        const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing').length
        this.setData({
          stats: {
            totalOrders: orders.length,
            pendingOrders: pendingCount,
            completedOrders: orders.filter(o => o.status === 'completed').length
          },
          hasPendingOrders: pendingCount > 0,
          pendingOrdersCount: pendingCount
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

  async loadInviteCode() {
    try {
      const userInfo = this.data.userInfo
      if (userInfo && userInfo.inviteCode) {
        this.setData({ inviteCode: userInfo.inviteCode })
      }

      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { action: 'getMyCode' },
      })
      console.log('绑定关系', res)
      console.log(res.result.partnerOpenid)
      wx.setStorageSync('bindPartner-result', res.result)
      if (res.result && res.result.success) {
        this.setData({ inviteCode: res.result.inviteCode });
        if (userInfo) {
          userInfo.inviteCode = res.result.inviteCode
          userInfo.isBound = res.result.isBound
          userInfo.partnerOpenid = res.result.partnerOpenid
          wx.setStorageSync('userInfo', userInfo)
          app.globalData.userInfo = userInfo
          this.setData({ userInfo })
        }
      }
    } catch (err) {
      console.error('获取邀请码失败:', err)
      const userInfo = this.data.userInfo
      if (userInfo && userInfo.inviteCode) {
        this.setData({ inviteCode: userInfo.inviteCode })
      }
    }
  },

  async getPartnerNickName(){
    const partnerOpenId = wx.getStorageSync('bindPartner-result').partnerOpenid;
    const res = await wx.cloud.callFunction({ name: "getPartner",data:{
      partnerOpenid: partnerOpenId,  // 将缓存数据作为参数传递
    }});
    if(res){
      this.setData({ partnerInfo: res.result.partner });
      wx.setStorageSync('partner',this.data.partnerInfo);
      console.log("this is partnerInfo",this.data.partnerInfo);
    }
    let tempparnterInfo = this.data.partnerInfo
    // 如果头像链接是 cloud:// 格式，则换取临时链接
    if (tempparnterInfo.avatarUrl && tempparnterInfo.avatarUrl.startsWith('cloud://')) {
      const tempRes = await wx.cloud.getTempFileURL({
        fileList: [tempparnterInfo.avatarUrl] // fileList 是一个数组[reference:8]
      });
      console.log("tempRes",tempRes);
      // 获取到的临时链接在 tempFileURL 字段中[reference:9]
      tempparnterInfo.avatarUrl = tempRes.fileList[0].tempFileURL; 
      console.log("this is",tempparnterInfo.avatarUrl)
      this.setData({ partnerInfo: tempparnterInfo });
    }  
    console.log("touxiang",this.data.partnerInfo.avatarUrl)
  },

  onBindTap() {
    this.setData({ showBindModal: true, inputInviteCode: '' })
  },

  onCloseBind() {
    this.setData({ showBindModal: false, inputInviteCode: '' })
  },

  onInviteCodeInput(e) {
    this.setData({ inputInviteCode: e.detail.value.toUpperCase() })
  },

  async onConfirmBind() {
    const { inputInviteCode } = this.data
    if (!inputInviteCode || inputInviteCode.length !== 6) {
      wx.showToast({ title: '请输入正确的6位邀请码', icon: 'none' })
      return
    }

    this.setData({ binding: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { action: 'bind', inviteCode: inputInviteCode }
      })
      console.log('result:', res.result)

      if (res.result && res.result.success) {
        wx.showToast({ title: '绑定成功！', icon: 'success' });
        this.onCloseBind();
        // 更新本地用户信息
        const userInfo = this.data.userInfo
        userInfo.isBound = true
        wx.setStorageSync('userInfo', userInfo)
        app.globalData.userInfo = userInfo
        this.setData({ userInfo })
        // 刷新邀请码和伴侣信息（须先等 loadInviteCode 更新缓存中的 partnerOpenid）
        await this.loadInviteCode();
        this.getPartnerNickName();
        if (this.data.userInfo.role === 'boyfriend') {
          app.startOrderPolling()
        }
      } else {
        wx.showToast({ title: (res.result && res.result.error) || '绑定失败', icon: 'none' });
      }
    } catch (err) {
      console.error('绑定失败:', err);
      wx.showToast({ title: '绑定失败', icon: 'none' });
    } finally {
      this.setData({ binding: false })
    }
  },

  onUnbindTap() {
    this.setData({ showUnbindModal: true })
  },

  onCloseUnbind() {
    this.setData({ showUnbindModal: false })
  },

  async onConfirmUnbind() {
    if (this.data.unbinding) return

    this.setData({ unbinding: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'bindPartner',
        data: { action: 'unbind' }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: '已解除绑定', icon: 'success' })

        // 更新本地用户信息
        const userInfo = this.data.userInfo
        userInfo.isBound = false
        userInfo.partnerOpenid = ''
        wx.setStorageSync('userInfo', userInfo)
        app.globalData.userInfo = userInfo

        this.setData({
          userInfo,
          partnerInfo: {},
          showUnbindModal: false
        })

        // 刷新页面数据
        this.loadInviteCode()
        this.loadStats()

        // 如果是男友端，停止订单轮询
        if (userInfo.role === 'boyfriend' && app.stopOrderPolling) {
          app.stopOrderPolling()
        }
      } else {
        wx.showToast({
          title: (res.result && res.result.error) || '解绑失败，请重试',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('解绑失败:', err)
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      this.setData({ unbinding: false })
    }
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' })
      },
    })
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
