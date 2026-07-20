// pages/review-list/review-list.js
Page({
  data: {
    foods: [],
    loading: false,

    showReviewModal: false,
    reviewItem: {},
    reviewPrice: ''
  },

  onLoad() {
    this.fetchPendingFoods()
  },

  onShow() {
    this.fetchPendingFoods()
  },

  async fetchPendingFoods() {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'manageFood',
        data: {
          action: 'list',
          data: { category: '全部', status: 'pending' }
        }
      })
      if (res.result && res.result.success) {
        this.setData({ foods: res.result.data })
      }
    } catch (err) {
      console.error('获取待审核菜品失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

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
        this.fetchPendingFoods()
      } else {
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
      }
    } catch (err) {
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
              this.fetchPendingFoods()
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
  }
})
