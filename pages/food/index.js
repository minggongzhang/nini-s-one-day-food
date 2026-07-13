// pages/food/index.js
Page({
  data: {
    foods: [],
    categories: [],
    activeCategory: '全部',
    loading: true,
    cart: [],
    cartTotal: 0,
    cartCount: 0,
    showCartPopup: false
  },

  onLoad() {
    this.fetchCategories()
    this.loadCart()
  },

  async fetchCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getFoodCategorys'
      })

      if (res && res.result && res.result.success) {
        let categories = res.result.data || []
        categories.unshift({ name: '全部' })
        this.setData({
          categories
        })
        this.fetchFoods()
      } else {
        console.error('获取分类失败:', res && res.result && res.result.error)
        this.setData({
          categories: [{ name: '全部' }, { name: '主食' }, { name: '小吃' }, { name: '饮品' }]
        })
        this.fetchFoods()
      }
    } catch (err) {
      console.error('获取分类异常:', err)
      this.setData({
        categories: [{ name: '全部' }, { name: '主食' }, { name: '小吃' }, { name: '饮品' }]
      })
      this.fetchFoods()
    }
  },

  onShow() {
    this.loadCart()
  },

  async fetchFoods(category = '全部') {
    this.setData({
      loading: true
    })

    try {
      console.log('Calling getFoods with category:', category)
      const res = await wx.cloud.callFunction({
        name: 'getFoods',
        data: {
          category
        }
      })
      console.log('getFoods response:', res)

      if (res && res.result) {
        if (res.result.success) {
          this.setData({
            foods: res.result.data || [],
            loading: false
          })
          console.log('获取菜品成功，数量:', res.result.count)
        } else {
          console.error('获取菜品失败:', res.result.error, res.result.errCode)
          this.setData({
            foods: [],
            loading: false
          })
        }
      } else {
        console.error('云函数返回格式异常:', res)
        this.setData({
          foods: [],
          loading: false
        })
      }
    } catch (err) {
      console.error('获取菜品异常:', err)
      this.setData({
        foods: [],
        loading: false
      })
    }
  },

  handleCategoryChange(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      activeCategory: category
    })
    this.fetchFoods(category)
  },

  handleAddToCart(e) {
    const food = e.currentTarget.dataset.food
    const { cart } = this.data

    const existingItem = cart.find(item => item._id === food._id)
    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cart.push(Object.assign({}, food, { quantity: 1 }))
    }

    this.saveCart(cart)
    this.loadCart()

    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    })
  },

  saveCart(cart) {
    wx.setStorageSync('cart', cart)
  },

  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    this.setData({
      cart,
      cartCount,
      cartTotal
    })
  },

  handleCheckout() {
    wx.showToast({
      title: '结算功能开发中',
      icon: 'none'
    })
  },

  toggleCartPopup() {
    if (this.data.cartCount === 0) return
    this.setData({
      showCartPopup: !this.data.showCartPopup
    })
  },

  handleMaskTap() {
    this.setData({
      showCartPopup: false
    })
  },

  handleIncreaseQty(e) {
    const foodId = e.currentTarget.dataset.id
    const { cart } = this.data

    const item = cart.find(item => item._id === foodId)
    if (item) {
      item.quantity += 1
      this.saveCart(cart)
      this.loadCart()
    }
  },

  handleDecreaseQty(e) {
    const foodId = e.currentTarget.dataset.id
    let { cart } = this.data

    const item = cart.find(item => item._id === foodId)
    if (item) {
      item.quantity -= 1
      if (item.quantity <= 0) {
        cart = cart.filter(item => item._id !== foodId)
      }
      this.saveCart(cart)
      this.loadCart()

      if (cart.length === 0) {
        this.setData({
          showCartPopup: false
        })
      }
    }
  },

  handleRemoveItem(e) {
    const foodId = e.currentTarget.dataset.id
    let { cart } = this.data

    cart = cart.filter(item => item._id !== foodId)
    this.saveCart(cart)
    this.loadCart()

    if (cart.length === 0) {
      this.setData({
        showCartPopup: false
      })
    }

    wx.showToast({
      title: '已删除',
      icon: 'success'
    })
  },

  handleClearCart() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          const cart = []
          this.saveCart(cart)
          this.loadCart()
          this.setData({
            showCartPopup: false
          })
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  }
})
