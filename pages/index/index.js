// pages/index/index.js
const app = getApp()
const { addIconPaths } = require('../../utils/emojiIcons')

Page({
  data: {
    nickname: '',
    recommendations: [],
    loading: true
  },

  onLoad() {
    this.fetchUserInfo()
    this.fetchRecommendations()
  },

  onShow() {
    this.fetchUserInfo()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().refreshTabs()
      this.getTabBar().setSelected('/pages/index/index')
    }
  },

  fetchUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo && userInfo.nickname) {
      this.setData({
        nickname: userInfo.nickname
      })
    } else {
      const storedUser = wx.getStorageSync('userInfo')
      if (storedUser && storedUser.nickname) {
        this.setData({
          nickname: storedUser.nickname
        })
      }
    }
  },

  async fetchRecommendations() {
    this.setData({
      loading: true
    })

    try {
      console.log('Calling getRecommendations')
      const res = await wx.cloud.callFunction({
        name: 'getRecommendations'
      })
      console.log('getRecommendations response:', res)

      if (res && res.result) {
        if (res.result.success) {
          this.setData({
            recommendations: addIconPaths(res.result.data || []),
            loading: false
          })
          console.log('获取推荐成功，数量:', res.result.count)
        } else {
          console.error('获取推荐失败:', res.result.error, res.result.errCode)
          this.setData({
            recommendations: [],
            loading: false
          })
        }
      } else {
        console.error('云函数返回格式异常:', res)
        this.setData({
          recommendations: [],
          loading: false
        })
      }
    } catch (err) {
      console.error('获取推荐异常:', err)
      this.setData({
        recommendations: [],
        loading: false
      })
    }
  },

  getCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekDay = weekDays[now.getDay()]
    return `${year}年${month}月${day}日 ${weekDay}`
  },

  handleFoodTap() {
    wx.switchTab({
      url: '/pages/food/index'
    })
  }
})
