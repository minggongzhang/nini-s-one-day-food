// pages/food-manage/food-manage.js
Page({
  data: {
    categories: ['全部', '主食', '小吃', '饮品', '甜点'],
    activeCategory: '全部',
    foods: [],
    loading: false,
    pendingCount: 0,

    showReviewModal: false,
    reviewItem: {},
    reviewPrice: '',

    statusMap: {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝'
    },
    statusColor: {
      pending: '#FFA726',
      approved: '#4CAF50',
      rejected: '#EF5350'
    }
  },

  onLoad() {
    this.fetchFoods()
    this.fetchPendingCount()
  },

  onShow() {
    this.fetchFoods()
    this.fetchPendingCount()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabs()
      this.getTabBar().setSelected('/pages/food-manage/food-manage')
    }
  },

  // 兼容旧数据：没有 status 的默认视为 approved + 已上架
  normalizeFoods(rawFoods) {
    return rawFoods.map(item => {
      if (!item.status) {
        item.status = 'approved'
        item.isShelved = item.isShelved !== false
      }
      return item
    })
  },

  async fetchFoods() {
    const { activeCategory } = this.data
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'manageFood',
        data: {
          action: 'list',
          data: { category: activeCategory, status: 'all' }
        }
      })

      if (res.result && res.result.success) {
        this.setData({ foods: this.normalizeFoods(res.result.data) })
      }
    } catch (err) {
      console.error('获取菜品失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async fetchPendingCount() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'manageFood',
        data: {
          action: 'list',
          data: { category: '全部', status: 'pending' }
        }
      })
      if (res.result && res.result.success) {
        this.setData({ pendingCount: res.result.data.length })
      }
    } catch (err) {
      console.error('获取待审核数量失败:', err)
    }
  },

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.fetchFoods()
  },

  goToReviewList() {
    wx.navigateTo({ url: '/pages/review-list/review-list' })
  },

  // ========== 审核 ==========
  onReviewTap(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.foods.find(f => f._id === id)
    if (!item) return
    this.setData({
      showReviewModal: true,
      reviewItem: item,
      reviewPrice: ''
    })
  },

  onReviewPriceInput(e) {
    this.setData({ reviewPrice: e.detail.value })
  },

  async onReviewConfirm() {
    const { reviewItem, reviewPrice } = this.data
    const price = parseFloat(reviewPrice)
    if (isNaN(price) || price < 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'manageFood',
        data: {
          action: 'review',
          id: reviewItem._id,
          data: { price, isShelved: true }
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: '审核通过', icon: 'success' })
        this.setData({ showReviewModal: false })
        this.fetchFoods()
        this.fetchPendingCount()
      } else {
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (err) {
      console.error('审核失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onRejectTap(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认拒绝',
      content: '拒绝后该菜品将不会上架，确定吗？',
      confirmColor: '#EF5350',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'manageFood',
              data: { action: 'reject', id }
            })
            if (result.result && result.result.success) {
              wx.showToast({ title: '已拒绝', icon: 'success' })
              this.fetchFoods()
              this.fetchPendingCount()
            }
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  onReviewCancel() {
    this.setData({ showReviewModal: false })
  },

  // ========== 上架/下架 ==========
  async onToggleShelve(e) {
    const id = e.currentTarget.dataset.id
    try {
      const res = await wx.cloud.callFunction({
        name: 'manageFood',
        data: { action: 'toggleShelve', id }
      })
      if (res.result && res.result.success) {
        const msg = res.result.isShelved ? '已上架' : '已下架'
        wx.showToast({ title: msg, icon: 'success' })
        this.fetchFoods()
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // ========== 编辑 ==========
  onEditTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/edit-food/edit-food?id=' + id })
  },

  // ========== 删除 ==========
  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定吗？',
      confirmColor: '#EF5350',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'manageFood',
              data: { action: 'delete', id }
            })
            if (result.result && result.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.fetchFoods()
            }
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // ========== 新增 ==========
  onAddTap() {
    wx.navigateTo({ url: '/pages/add-food/index' })
  }
})
