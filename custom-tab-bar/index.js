// custom-tab-bar/index.js
const app = getApp()

const ALL_TABS = [
  {
    pagePath: '/pages/index/index',
    text: '首页',
    iconPath: '/images/tabbar/home.png',
    selectedIconPath: '/images/tabbar/home-active.png'
  },
  {
    pagePath: '/pages/food/index',
    text: '点餐',
    iconPath: '/images/tabbar/food.png',
    selectedIconPath: '/images/tabbar/food-active.png'
  },
  {
    pagePath: '/pages/orders/index',
    text: '订单',
    iconPath: '/images/tabbar/orders.png',
    selectedIconPath: '/images/tabbar/orders-active.png'
  },
  {
    pagePath: '/pages/profile/index',
    text: '我的',
    iconPath: '/images/tabbar/profile.png',
    selectedIconPath: '/images/tabbar/profile-active.png'
  }
]

const BOYFRIEND_TABS = [
  ALL_TABS[0],
  ALL_TABS[2],
  ALL_TABS[3]
]

Component({
  data: {
    visible: false,
    selected: 0,
    color: '#999999',
    selectedColor: '#ff6b6b',
    role: '',
    list: []
  },

  lifetimes: {
    attached() {
      this.refreshTabs()
    }
  },

  methods: {
    refreshTabs() {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const role = userInfo.role || ''
      const list = role === 'boyfriend' ? BOYFRIEND_TABS : ALL_TABS

      this.setData({
        role,
        list,
        visible: !!role
      })
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      const url = path.startsWith('/') ? path : '/' + path

      this.setData({ selected: index })
      wx.switchTab({ url })
    },

    setSelected(pagePath) {
      const normalizedPath = pagePath.startsWith('/') ? pagePath : '/' + pagePath
      const index = this.data.list.findIndex(item => {
        const itemPath = item.pagePath.startsWith('/') ? item.pagePath : '/' + item.pagePath
        return itemPath === normalizedPath
      })
      if (index >= 0) {
        this.setData({ selected: index })
      }
    }
  }
})
