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
    showCartPopup: false,
    userBalance: 0
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.role === 'boyfriend') {
      wx.showToast({ title: '男朋友不能点餐哦~', icon: 'none' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/orders/index' })
      }, 1500)
      return
    }

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
        // 确保有"全部"在第一位，但避免重复
        if (!categories.find(c => c.name === '全部')) {
          categories.unshift({ name: '全部' })
        }
        this.setData({
          categories
        })
        this.fetchFoods()
      } else {
        console.error('获取分类失败:', res && res.result && res.result.error)
        this.setData({
          categories: [{ name: '全部' }, { name: '主食' }, { name: '小吃' }, { name: '饮品' }, { name: '甜点' }, { name: '汤品' }]
        })
        this.fetchFoods()
      }
    } catch (err) {
      console.error('获取分类异常:', err)
      this.setData({
        categories: [{ name: '全部' }, { name: '主食' }, { name: '小吃' }, { name: '饮品' }, { name: '甜点' }, { name: '汤品' }]
      })
      this.fetchFoods()
    }
  },

  onShow() {
    this.loadCart()
    this.loadUserBalance()
    if (this.data.activeCategory) {
      this.fetchFoods(this.data.activeCategory)
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabs()
      this.getTabBar().setSelected('/pages/food/index')
    }
  },

  loadUserBalance() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userBalance: userInfo.balance || 0 })
    }
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

  handleAddFood() {
    wx.navigateTo({
      url: '/pages/add-food/index'
    })
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
    const { cart, cartTotal } = this.data
    if (cart.length === 0) return

    const userInfo = wx.getStorageSync('userInfo')
    const openid = userInfo && (userInfo.openid || userInfo.openId)
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const balance = userInfo.balance || 0
    if (balance < cartTotal) {
      wx.showModal({
        title: '余额不足',
        content: `当前余额 ${balance} 妮妮币，需要 ${cartTotal} 妮妮币。去找男朋友充值吧~`,
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    wx.showModal({
      title: '确认下单',
      content: `共 ${cart.length} 种菜品，合计 ${cartTotal} 妮妮币\n下单后等待男朋友接单制作`,
      confirmText: '下单',
      success: async (res) => {
        if (!res.confirm) return

        wx.showLoading({ title: '下单中...' })

        try {
          const result = await wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              items: cart,
              totalAmount: cartTotal,
              remark: ''
            }
          })

          wx.hideLoading()

          if (result.result && result.result.success) {
            // 更新本地余额
            const newBalance = result.result.newBalance
            const updatedUserInfo = { ...userInfo, balance: newBalance }
            wx.setStorageSync('userInfo', updatedUserInfo)

            // 清空购物车
            this.saveCart([])
            this.loadCart()
            this.setData({ showCartPopup: false })

            wx.showModal({
              title: '下单成功！',
              content: `订单号：${result.result.orderNo}\n余额：${newBalance} 妮妮币\n等待男朋友接单~`,
              showCancel: false,
              confirmText: '查看订单',
              success: () => {
                wx.switchTab({ url: '/pages/orders/index' })
              }
            })
          } else {
            wx.showToast({
              title: result.result.error || '下单失败',
              icon: 'none',
              duration: 2500
            })
          }
        } catch (err) {
          wx.hideLoading()
          console.error('下单失败:', err)
          wx.showToast({ title: '网络异常，请重试', icon: 'none' })
        }
      }
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
