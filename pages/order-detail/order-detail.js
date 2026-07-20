const { getIconPath } = require('../../utils/emojiIcons')

const STATUS_MAP = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '制作中',
  completed: '已完成',
  rejected: '已拒绝'
}

const STATUS_COLOR = {
  pending: '#F06A7A',
  accepted: '#F5A86B',
  preparing: '#B8A6D9',
  completed: '#6BC5A0',
  rejected: '#8A7A6B'
}

Page({
  data: {
    order: null,
    statusMap: STATUS_MAP,
    statusColor: STATUS_COLOR,
    role: '',
    loading: true
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({ role: userInfo.role || '' })
    if (options.id) {
      this.loadOrder(options.id)
    }
  },

  async loadOrder(id) {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('orders').doc(id).get()
      if (!res.data) {
        wx.showToast({ title: '订单不存在', icon: 'none' })
        return
      }

      const order = res.data
      const itemsWithIcons = (order.items || []).map(food => ({
        ...food,
        iconPath: getIconPath(food.icon)
      }))

      this.setData({
        order: {
          ...order,
          items: itemsWithIcons,
          formattedCreatedAt: this.formatTime(order.createdAt),
          formattedAcceptedAt: this.formatTime(order.acceptedAt),
          formattedCompletedAt: this.formatTime(order.completedAt),
          duration: this.calcDuration(order.acceptedAt, order.completedAt)
        },
        loading: false
      })
    } catch (err) {
      console.error('加载订单失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  formatTime(dateVal) {
    if (!dateVal) return ''
    let d
    if (typeof dateVal === 'string') {
      d = new Date(dateVal)
    } else if (typeof dateVal === 'object') {
      const iso = dateVal.$date || dateVal.iso || dateVal
      d = new Date(iso)
    } else {
      d = new Date(dateVal)
    }
    if (isNaN(d.getTime())) return ''
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const sec = String(d.getSeconds()).padStart(2, '0')
    return `${m}月${day}日 ${h}:${min}:${sec}`
  },

  calcDuration(startVal, endVal) {
    if (!startVal || !endVal) return ''
    const start = this.getTs(startVal)
    const end = this.getTs(endVal)
    if (!start || !end) return ''
    const diff = Math.round((end - start) / 60000)
    if (diff < 60) return `${diff} 分钟`
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`
  },

  getTs(dateVal) {
    if (!dateVal) return 0
    if (typeof dateVal === 'string') return new Date(dateVal).getTime()
    if (typeof dateVal === 'object') {
      return new Date(dateVal.$date || dateVal.iso || dateVal).getTime()
    }
    return new Date(dateVal).getTime()
  },

  onCallTap() {
    wx.makePhoneCall({
      phoneNumber: this.data.order.contactPhone || ''
    })
  },

  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.orderNo || '',
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onOpenAddress() {
    const addr = this.data.order && this.data.order.address
    if (!addr) return
    if (this.data.role === 'boyfriend') {
      wx.openLocation({
        latitude: addr.latitude || 0,
        longitude: addr.longitude || 0,
        name: addr.locationName || '收货地址',
        address: addr.locationAddress || ''
      })
    }
  }
})