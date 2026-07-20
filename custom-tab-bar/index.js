// custom-tab-bar/index.js
const app = getApp()

const GIRLFRIEND_TABS = [
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
  {
    pagePath: '/pages/index/boyfriend',
    text: '首页',
    iconPath: '/images/tabbar/home.png',
    selectedIconPath: '/images/tabbar/home-active.png'
  },
  {
    pagePath: '/pages/orders/index',
    text: '订单',
    iconPath: '/images/tabbar/orders.png',
    selectedIconPath: '/images/tabbar/orders-active.png'
  },
  {
    pagePath: '/pages/food-manage/food-manage',
    text: '菜品管理',
    iconPath: '/images/tabbar/food-admin.png',
    selectedIconPath: '/images/tabbar/food-admin-active.png'
  },
  {
    pagePath: '/pages/profile/index',
    text: '我的',
    iconPath: '/images/tabbar/profile.png',
    selectedIconPath: '/images/tabbar/profile-active.png'
  }
]

Component({
  data: {
    visible: false,
    selected: 0,
    color: '#B0949A',
    selectedColor: '#FF8A9E',
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
      const isBoyfriend = role === 'boyfriend'
      const list = isBoyfriend ? BOYFRIEND_TABS : GIRLFRIEND_TABS

      this.setData({
        role,
        list,
        visible: !!role,
        selectedColor: '#FF8A9E'
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