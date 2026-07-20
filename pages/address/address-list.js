// pages/address/address-list.js
const MAX_ADDRESSES = 6

Page({
  data: {
    addressList: [],
    fromCheckout: false
  },

  onLoad(options) {
    if (options.from === 'checkout') {
      this.setData({ fromCheckout: true })
    }
  },

  onShow() {
    this.loadAddresses()
  },

  loadAddresses() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({ addressList: userInfo.addressList || [] })
  },

  onAddTap() {
    if (this.data.addressList.length >= MAX_ADDRESSES) {
      wx.showToast({ title: `最多${MAX_ADDRESSES}条地址`, icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/address/address-edit' })
  },

  onEditTap(e) {
    const index = e.currentTarget.dataset.index
    wx.navigateTo({ url: '/pages/address/address-edit?index=' + index })
  },

  async onSetDefault(e) {
    const index = e.currentTarget.dataset.index
    const userInfo = wx.getStorageSync('userInfo') || {}
    const openid = userInfo.openid || userInfo.openId
    let addressList = (userInfo.addressList || []).concat()

    addressList.forEach((a, i) => {
      a.isDefault = (i === index)
    })

    const defaultAddr = addressList.find(a => a.isDefault) || addressList[0] || null
    const updatedUserInfo = { ...userInfo, addressList, deliveryAddress: defaultAddr }

    try {
      const db = wx.cloud.database()
      if (openid) {
        await db.collection('users').where({ openid }).update({
          data: { addressList, deliveryAddress: defaultAddr, updatedAt: db.serverDate() }
        })
      }
      wx.setStorageSync('userInfo', updatedUserInfo)
      wx.setStorageSync('deliveryAddress', defaultAddr)
      this.setData({ addressList })
      wx.showToast({ title: '已设为默认', icon: 'success' })
    } catch (err) {
      console.error('设置默认失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onSelectForOrder(e) {
    const index = e.currentTarget.dataset.index
    const addr = this.data.addressList[index]
    if (!addr) return

    // 通知上一页选中了哪个地址
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && prevPage.onAddressSelected) {
      prevPage.onAddressSelected(addr)
    }
    wx.navigateBack()
  }
})