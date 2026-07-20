// pages/index/boyfriend.js
const app = getApp()

const STATUS_MAP = {
  pending: '待接单',
  accepted: '已接单',
  preparing: '制作中',
  completed: '已完成',
  rejected: '已拒绝'
}

Page({
  data: {
    stateType: 'empty',
    stateConfig: {},
    pendingCount: 0,
    dashboard: {
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      totalMinutes: 0
    },
    currentDate: '',
    partnerInfo: {},
    boundDays: 0,
    profileData: {
      frequentFoods: [],
      tastePreferences: [],
      avoidances: [],
      isEmpty: false
    },
    previewOrders: [],
    statusMap: STATUS_MAP,
    allOrders: [],
    remindCooldown: false
  },

  onLoad() {
    this.setData({ currentDate: this.formatDate() })
    this.loadPartnerInfo()
  },

  onShow() {
    this.setData({ currentDate: this.formatDate() })
    this.fetchOrders()
    this.loadPartnerInfo()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabs()
      this.getTabBar().setSelected('/pages/index/boyfriend')
    }
  },

  formatDate() {
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${m}月${d}日 ${weekDays[now.getDay()]}`
  },

  async fetchOrders() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: { status: 'all', role: 'boyfriend' }
      })

      if (res.result && res.result.success) {
        const orders = res.result.data || []
        this.processOrders(orders)
      }
    } catch (err) {
      console.error('获取订单失败:', err)
    }
  },

  processOrders(orders) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayTs = todayStart.getTime()

    const todayOrders = orders.filter(o => {
      const ts = this.getOrderTimestamp(o.createdAt)
      return ts >= todayTs
    })

    const pendingOrders = todayOrders.filter(o =>
      o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
    )
    const completedOrders = todayOrders.filter(o => o.status === 'completed')

    // 计算总耗时
    let totalMinutes = 0
    completedOrders.forEach(o => {
      const start = this.getOrderTimestamp(o.acceptedAt)
      const end = this.getOrderTimestamp(o.completedAt)
      if (start && end) {
        totalMinutes += Math.round((end - start) / 60000)
      }
    })

    // 待处理订单预览
    const previewOrders = orders.filter(o =>
      o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
    )

    // 更新状态卡
    const pending = todayOrders.find(o => o.status === 'pending')
    const making = todayOrders.find(o => o.status === 'accepted' || o.status === 'preparing')
    const stateConfig = this.computeState(todayOrders, pending, making, completedOrders)

    this.setData({
      allOrders: todayOrders,
      pendingCount: pendingOrders.length,
      dashboard: {
        totalOrders: todayOrders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        totalMinutes
      },
      previewOrders,
      stateType: stateConfig.type,
      stateConfig
    })
  },

  computeState(todayOrders, pending, making, completedOrders) {
    if (pending) {
      const items = pending.items || []
      const summary = items.slice(0, 2).map(i => `${i.name}x${i.quantity}`).join('、')
      const more = items.length > 2 ? `等${items.length}件` : ''
      return {
        type: 'pending',
        title: `${this.getPartnerName()} 刚刚下单了！`,
        desc: summary + more + `，合计 ${pending.totalAmount} 妮妮币`,
        timer: `下单时间：${this.formatOrderTime(pending.createdAt)}`,
        actionText: '查看订单 >'
      }
    }

    if (making) {
      const acceptedAt = this.getOrderTimestamp(making.acceptedAt)
      const elapsed = acceptedAt ? Math.round((Date.now() - acceptedAt) / 60000) : 0
      const items = making.items || []
      const name = items[0] ? items[0].name : ''
      return {
        type: 'making',
        title: '正在制作中...',
        desc: name,
        timer: `已制作 ${elapsed} 分钟`,
        actionText: '标记完成 >'
      }
    }

    if (completedOrders.length > 0) {
      let totalMin = 0
      completedOrders.forEach(o => {
        const s = this.getOrderTimestamp(o.acceptedAt)
        const e = this.getOrderTimestamp(o.completedAt)
        if (s && e) totalMin += Math.round((e - s) / 60000)
      })
      return {
        type: 'done',
        title: '今天辛苦啦',
        desc: `今日已完成 ${completedOrders.length} 笔订单`,
        timer: `总制作时长 ${totalMin} 分钟`,
        actionText: '查看详情 >'
      }
    }

    if (todayOrders.length === 0) {
      return {
        type: 'empty',
        title: `${this.getPartnerName()} 还没点餐呢`,
        desc: '今天还没有订单',
        timer: '',
        actionText: '提醒点餐 >'
      }
    }

    return {
      type: 'empty',
      title: '暂无待处理订单',
      desc: '',
      timer: '',
      actionText: ''
    }
  },

  getPartnerName() {
    const info = this.data.partnerInfo
    return info.nickname || '女朋友'
  },

  getOrderTimestamp(dateVal) {
    if (!dateVal) return 0
    if (typeof dateVal === 'string') return new Date(dateVal).getTime()
    if (typeof dateVal === 'object') {
      const iso = dateVal.$date || dateVal.iso || dateVal
      return new Date(iso).getTime()
    }
    return new Date(dateVal).getTime()
  },

  formatOrderTime(dateVal) {
    const ts = this.getOrderTimestamp(dateVal)
    if (!ts) return ''
    const d = new Date(ts)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  },

  async loadPartnerInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const partnerOpenid = userInfo.partnerOpenid

    if (userInfo.isBound && partnerOpenid) {
      // 计算绑定天数
      const boundDate = userInfo.boundAt || userInfo.updatedAt
      let boundDays = 0
      if (boundDate) {
        const ts = this.getOrderTimestamp(boundDate)
        if (ts) {
          boundDays = Math.max(1, Math.ceil((Date.now() - ts) / 86400000))
        }
      }

      try {
        const res = await wx.cloud.callFunction({
          name: 'getPartner',
          data: { partnerOpenid }
        })
        if (res.result && res.result.partner) {
          let partnerInfo = res.result.partner
          // 处理头像 cloud:// 格式
          if (partnerInfo.avatarUrl && partnerInfo.avatarUrl.startsWith('cloud://')) {
            try {
              const tempRes = await wx.cloud.getTempFileURL({
                fileList: [partnerInfo.avatarUrl]
              })
              if (tempRes.fileList && tempRes.fileList[0]) {
                partnerInfo.avatarUrl = tempRes.fileList[0].tempFileURL
              }
            } catch (e) {
              partnerInfo.avatarUrl = ''
            }
          }
          this.setData({ partnerInfo, boundDays })
          this.computeProfile()
        }
      } catch (err) {
        console.error('获取伴侣信息失败:', err)
      }
    }
  },

  computeProfile() {
    // 基于历史订单聚合口味数据
    const orders = this.data.allOrders
    const foodCount = {}
    const tasteCount = {}
    const requirements = []

    orders.forEach(o => {
      if (o.status !== 'completed') return
      ;(o.items || []).forEach(item => {
        const name = item.name
        if (name) {
          foodCount[name] = (foodCount[name] || 0) + (item.quantity || 1)
        }
        if (item.tasteTags) {
          item.tasteTags.forEach(tag => {
            tasteCount[tag] = (tasteCount[tag] || 0) + 1
          })
        }
      })
      if (o.remark) {
        requirements.push(o.remark)
      }
    })

    // 排序取 Top 3
    const frequentFoods = Object.entries(foodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0])

    const tastePreferences = Object.entries(tasteCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0])

    // 简单忌口关键词提取
    const avoidKeywords = ['不要', '别放', '免', '不加', '忌口', '不吃', '过敏']
    const avoidSet = new Set()
    requirements.forEach(r => {
      avoidKeywords.forEach(kw => {
        if (r.includes(kw)) {
          // 提取关键词后面的内容
          const idx = r.indexOf(kw)
          const after = r.substring(idx + kw.length).trim()
          if (after.length <= 6) {
            avoidSet.add(after)
          }
        }
      })
    })
    const avoidances = Array.from(avoidSet).slice(0, 5)

    const isEmpty = frequentFoods.length === 0 && tastePreferences.length === 0

    this.setData({
      profileData: { frequentFoods, tastePreferences, avoidances, isEmpty }
    })
  },

  // ========== 交互逻辑 ==========

  onStateCardTap() {
    const { stateType } = this.data
    if (stateType === 'pending' || stateType === 'making') {
      wx.switchTab({ url: '/pages/orders/index' })
    } else if (stateType === 'done' || stateType === 'empty') {
      if (stateType === 'empty') {
        this.onRemindOrder()
      } else {
        wx.switchTab({ url: '/pages/orders/index' })
      }
    }
  },

  goToOrders(e) {
    wx.switchTab({ url: '/pages/orders/index' })
  },

  goToFood() {
    wx.switchTab({ url: '/pages/food/index' })
  },

  goToRecharge() {
    wx.switchTab({ url: '/pages/profile/index' })
  },

  onRemindOrder() {
    if (this.data.remindCooldown) return

    const userInfo = wx.getStorageSync('userInfo') || {}
    if (!userInfo.isBound) {
      wx.showToast({ title: '请先绑定情侣', icon: 'none' })
      return
    }

    wx.showToast({ title: '提醒已发送', icon: 'success' })
    this.setData({ remindCooldown: true })

    // 5 分钟冷却
    setTimeout(() => {
      this.setData({ remindCooldown: false })
    }, 5 * 60 * 1000)
  },

  onPreviewOrderTap(e) {
    wx.switchTab({ url: '/pages/orders/index' })
  }
})