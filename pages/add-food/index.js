// pages/add-food/index.js
const app = getApp()
const { getIconPath } = require('../../utils/emojiIcons')

const CRAVING_TEXTS = {
  1: '还行吧',
  2: '有点想吃',
  3: '挺想吃的',
  4: '超想吃！',
  5: '现在就要吃！！'
}

const DEFAULT_EMOJIS = {
  '主食': '/images/emoji/rice.png',
  '小吃': '/images/emoji/fries.png',
  '饮品': '/images/emoji/drink.png',
  '甜点': '/images/emoji/cake.png',
  '汤品': '/images/emoji/pot.png'
}

Page({
  data: {
    name: '',
    selectedCategory: '',
    categoryOptions: [
      { name: '主食', icon: '🍚', iconPath: '/images/emoji/rice.png' },
      { name: '小吃', icon: '🍟', iconPath: '/images/emoji/fries.png' },
      { name: '饮品', icon: '🥤', iconPath: '/images/emoji/drink.png' },
      { name: '甜点', icon: '🍰', iconPath: '/images/emoji/cake.png' },
      { name: '汤品', icon: '🍲', iconPath: '/images/emoji/pot.png' }
    ],
    showCustomCategory: false,
    customCategoryFocus: false,
    tasteTags: [
      { name: '不辣', checked: false },
      { name: '微辣', checked: false },
      { name: '中辣', checked: false },
      { name: '特辣', checked: false },
      { name: '多醋', checked: false },
      { name: '多葱', checked: false },
      { name: '偏咸', checked: false },
      { name: '偏甜', checked: false },
      { name: '清淡', checked: false },
      { name: '重口', checked: false },
      { name: '不要香菜', checked: false },
      { name: '不要葱', checked: false }
    ],
    showCustomTagInput: false,
    tagInputVisible: true,
    requirements: '',
    images: [],
    cravingLevel: 3,
    cravingText: '挺想吃的',
    price: '',
    submitting: false,
    isBoyfriend: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    const nickname = (userInfo && userInfo.nickname) || '我'
    const isBoyfriend = userInfo && userInfo.role === 'boyfriend'
    wx.setNavigationBarTitle({ title: isBoyfriend ? '添加菜品' : `${nickname}想吃...` })
    this.setData({ isBoyfriend })
    this.onCustomCategoryInput = this.debounce(this.handleCustomCategoryInput, 2000)
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // ========== 分类选择 ==========
  onCategoryTap(e) {
    const name = e.currentTarget.dataset.name
    this.setData({
      selectedCategory: this.data.selectedCategory === name ? '' : name,
      showCustomCategory: false,
      customCategoryFocus: false
    })
    this._customCategoryValue = ''
  },

  onToggleCustomCategory() {
    this.setData({
      showCustomCategory: !this.data.showCustomCategory
    })
    this._customCategoryValue = ''
  },

  onToggleCustomCategory() {
    const willShow = !this.data.showCustomCategory
    this.setData({
      showCustomCategory: willShow,
      customCategoryFocus: willShow
    })
  },

  debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  },

  // 将处理逻辑用防抖包裹，供 WXML 绑定
  onCustomCategoryInput: null,

  handleCustomCategoryInput(e) {
    console.log(e);
    this.setData({ 
      selectedCategory: e.detail.value,
    })
  },

  onAddCustomCategory(){
    if(!this.data.selectedCategory.trim()){
      wx.showToast({ title: '请输入分类名', icon: 'none' })
      return
    }
    if (this.data.selectedCategory.length > 8) {
      wx.showToast({ title: '分类名最多8个字', icon: 'none' })
      return
    }
    const newCategoryItem = { name: this.data.selectedCategory, icon: '', iconPath: '/images/emoji/pencil.png' }
    const newCategories = [...this.data.categoryOptions,newCategoryItem]
    this.setData({
      categoryOptions: newCategories,
      showCustomCategory: false,
      customCategoryFocus: false
    })
  },

  // ========== 口味标签 ==========
  onTasteTagTap(e) {
    const index = e.currentTarget.dataset.index
    const key = `tasteTags[${index}].checked`
    this.setData({
      [key]: !this.data.tasteTags[index].checked
    })
  },

  onToggleCustomTag() {
    this.setData({
      showCustomTagInput: !this.data.showCustomTagInput
    })
    this._customTagValue = ''
  },

  // 非受控输入：不绑定 value，避免 setData 竞态导致字符被吞
  onCustomTagInput(e) {
    this._customTagValue = e.detail.value
  },

  onAddCustomTag() {
    const val = (this._customTagValue || '').trim()
    if (!val) {
      wx.showToast({ title: '请输入标签名', icon: 'none' })
      return
    }
    if (val.length > 8) {
      wx.showToast({ title: '标签最多8个字', icon: 'none' })
      return
    }

    const tags = this.data.tasteTags.concat()
    const existing = tags.find(t => t.name === val)
    if (existing) {
      if (existing.checked) {
        wx.showToast({ title: '标签已选中', icon: 'none' })
        return
      }
      existing.checked = true
    } else {
      tags.push({ name: val, checked: true })
    }

    // 清空输入框：通过 wx:if 切换销毁重建，绕开受控输入的限制
    this._customTagValue = ''
    this.setData({
      tasteTags: tags,
      tagInputVisible: false
    })
    // 下一帧重建输入框，保持焦点连续
    setTimeout(() => {
      this.setData({ tagInputVisible: true })
    }, 30)

    wx.showToast({ title: '已添加', icon: 'success', duration: 800 })
  },

  // ========== 特殊要求 ==========
  onRequirementsInput(e) {
    this.setData({ requirements: e.detail.value })
  },

  // ========== 图片上传 ==========
  onChooseImage() {
    const remaining = 3 - this.data.images.length
    if (remaining <= 0) return

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: this.data.images.concat(newPaths)
        })
      }
    })
  },

  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images.concat()
    images.splice(index, 1)
    this.setData({ images })
  },

  // ========== 想吃程度 ==========
  onCravingTap(e) {
    const level = e.currentTarget.dataset.level
    this.setData({
      cravingLevel: level,
      cravingText: CRAVING_TEXTS[level]
    })
  },

  // ========== 价格 ==========
  onPriceInput(e) {
    this.setData({ price: e.detail.value })
  },

  // ========== 图片上传到云存储 ==========
  async uploadImages(openid) {
    const fileIDs = []
    for (let i = 0; i < this.data.images.length; i++) {
      const filePath = this.data.images[i]
      const ext = filePath.substring(filePath.lastIndexOf('.'))
      const cloudPath = `food-images/${openid}/${Date.now()}-${i}${ext}`
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })
      fileIDs.push(res.fileID)
    }
    return fileIDs
  },

  // ========== 提交 ==========
  async onSubmit() {
    const { name, selectedCategory, requirements, cravingLevel, tasteTags } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }
    if (!selectedCategory || !selectedCategory.trim()) {
      wx.showToast({ title: '请选择或输入分类', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      let openid = app.globalData.openid
      if (!openid) {
        const loginRes = await wx.cloud.callFunction({ name: 'login' })
        openid = loginRes.result.openid
        app.globalData.openid = openid
      }

      let imageFileIDs = []
      if (this.data.images.length > 0) {
        imageFileIDs = await this.uploadImages(openid)
      }

      const selectedTags = tasteTags.filter(t => t.checked).map(t => t.name)
      const categoryStr = selectedCategory.trim()
      const icon = DEFAULT_EMOJIS[categoryStr] || '/images/emoji/plate.png'

      const res = await wx.cloud.callFunction({
        name: 'addFood',
        data: {
          name: name.trim(),
          category: categoryStr,
          icon,
          description: requirements.trim(),
          price: this.data.isBoyfriend ? (parseFloat(this.data.price) || 0) : 0,
          tasteTags: selectedTags,
          requirements: requirements.trim(),
          imageUrl: imageFileIDs[0] || '',
          images: imageFileIDs,
          cravingLevel,
          isCustom: true
        }
      })

      if (res.result && res.result.success) {
        if (res.result.needReview) {
          wx.showToast({ title: '已提交审核！', icon: 'success' })
        } else {
          wx.showToast({ title: '添加成功！', icon: 'success' })
        }
        setTimeout(() => {
          wx.navigateBack()
        }, 1200)
      } else {
        wx.showToast({ title: '添加失败，请重试', icon: 'none' })
      }
    } catch (err) {
      console.error('添加菜品失败:', err)
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
