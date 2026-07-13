// pages/orders/index.js
const app = getApp()

const STATUS_TABS_DEFAULT = [
  { label: '全部', value: 'all', count: 0 },
  { label: '待处理', value: 'pending', count: 0 },
  { label: '制作中', value: 'processing', count: 0 },
  { label: '已完成', value: 'completed', count: 0 }
]

const STATUS_MAP = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '制作中',
  completed: '已完成',
  rejected: '已拒绝'
}

const STATUS_TIP = {
  pending: '⏳ 等待男朋友接单...',
  accepted: '✅ 男朋友已接单，马上开始制作',
  preparing: '👨‍🍳 男朋友正在制作中...',
  completed: '🎉 订单已完成，慢慢享用~',
  rejected: '❌ 订单被拒绝，妮妮币已退回'
}

Page({
  data: {
    orders: [],
    loading: true,
    role: '',
    activeStatus: 'all',
    statusTabs: STATUS_TABS_DEFAULT,
    statusMap: STATUS_MAP,
    statusTip: STATUS_TIP
  },

  onLoad() {
    this.initRole()
  },

  onShow() {
    this.initRole()
    this.fetchOrders()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabs()
      this.getTabBar().setSelected('/pages/orders/index')
    }
  },

  onPullDownRefresh() {
    this.fetchOrders().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  initRole() {
    const userInfo = wx.getStorageSync('userInfo')
    const role = userInfo ? userInfo.role : ''
    this.setData({ role })
    app.globalData.role = role
  },

  async fetchOrders() {
    const { activeStatus, role } = this.data

    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: {
          status: activeStatus,
          role
        }
      })

      if (res.result && res.result.success) {
        const orders = (res.result.data || []).map(order => {
          return {
            ...order,
            formattedTime: this.formatTime(order.createdAt)
          }
        })
        this.setData({ orders, loading: false })
        this.updateTabCounts()
      } else {
        this.setData({ orders: [], loading: false })
      }
    } catch (err) {
      console.error('获取订单失败:', err)
      this.setData({ orders: [], loading: false })
    }
  },

  async updateTabCounts() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: { status: 'all', role: this.data.role }
      })

      if (res.result && res.result.success) {
        const allOrders = res.result.data || []
        const tabs = STATUS_TABS_DEFAULT.map(tab => {
          let count = 0
          if (tab.value === 'all') {
            count = allOrders.length
          } else if (tab.value === 'pending') {
            count = allOrders.filter(o => o.status === 'pending').length
          } else if (tab.value === 'processing') {
            count = allOrders.filter(o => o.status === 'accepted' || o.status === 'preparing').length
          } else if (tab.value === 'completed') {
            count = allOrders.filter(o => o.status === 'completed').length
          }
          return { ...tab, count }
        })
        this.setData({ statusTabs: tabs })
      }
    } catch (err) {
      console.error('更新计数失败:', err)
    }
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ activeStatus: status })
    this.fetchOrders()
  },

  onHandleOrder(e) {
    const { id, action } = e.currentTarget.dataset

    const actionText = {
      accepted: '接单',
      preparing: '开始制作',
      completed: '标记完成',
      rejected: '拒绝'
    }[action]

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}吗？`,
      success: async (res) => {
        if (!res.confirm) return

        wx.showLoading({ title: '处理中...' })

        try {
          const result = await wx.cloud.callFunction({
            name: 'updateOrderStatus',
            data: {
              orderId: id,
              newStatus: action
            }
          })

          wx.hideLoading()

          if (result.result && result.result.success) {
            wx.showToast({ title: `${actionText}成功`, icon: 'success' })
            this.fetchOrders()
          } else {
            wx.showToast({
              title: result.result.error || '操作失败',
              icon: 'none'
            })
          }
        } catch (err) {
          wx.hideLoading()
          console.error('处理订单失败:', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  formatTime(dateVal) {
    if (!dateVal) return ''
    let d
    if (typeof dateVal === 'string') {
      d = new Date(dateVal)
    } else if (typeof dateVal === 'object') {
      // 云数据库返回的日期可能是 { $date: "..." } 格式
      const iso = dateVal.$date || dateVal.iso || dateVal
      d = new Date(iso)
    } else {
      d = new Date(dateVal)
    }
    if (isNaN(d.getTime())) return ''
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  }
})
