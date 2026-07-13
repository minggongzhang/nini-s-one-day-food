// pages/add-food/index.js
const app = getApp()

const CRAVING_TEXTS = {
  1: '还行吧',
  2: '有点想吃',
  3: '挺想吃的',
  4: '超想吃！',
  5: '现在就要吃！！'
}

const DEFAULT_EMOJIS = {
  '主食': '🍚',
  '小吃': '🍟',
  '饮品': '🥤',
  '甜点': '🍰',
  '汤品': '🍲'
}

Page({
  data: {
    name: '',
    selectedCategory: '',
    categoryOptions: [
      { name: '主食', icon: '🍚' },
      { name: '小吃', icon: '🍟' },
      { name: '饮品', icon: '🥤' },
      { name: '甜点', icon: '🍰' },
      { name: '汤品', icon: '🍲' }
    ],
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
    customTagValue: '',
    requirements: '',
    images: [],
    cravingLevel: 3,
    cravingText: '挺想吃的',
    price: '',
    submitting: false
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onCategoryTap(e) {
    const name = e.currentTarget.dataset.name
    this.setData({
      selectedCategory: this.data.selectedCategory === name ? '' : name
    })
  },

  onTasteTagTap(e) {
    const index = e.currentTarget.dataset.index
    const key = `tasteTags[${index}].checked`
    this.setData({
      [key]: !this.data.tasteTags[index].checked
    })
  },

  onToggleCustomTag() {
    this.setData({
      showCustomTagInput: !this.data.showCustomTagInput,
      customTagValue: ''
    })
  },

  onCustomTagInput(e) {
    this.setData({ customTagValue: e.detail.value })
  },

  onAddCustomTag() {
    const val = this.data.customTagValue.trim()
    if (!val) {
      wx.showToast({ title: '请输入标签名', icon: 'none' })
      return
    }
    const tags = this.data.tasteTags.concat()
    const existing = tags.find(t => t.name === val)
    if (existing) {
      existing.checked = true
    } else {
      tags.push({ name: val, checked: true })
    }
    this.setData({
      tasteTags: tags,
      customTagValue: '',
      showCustomTagInput: false
    })
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  onRequirementsInput(e) {
    this.setData({ requirements: e.detail.value })
  },

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

  onCravingTap(e) {
    const level = e.currentTarget.dataset.level
    this.setData({
      cravingLevel: level,
      cravingText: CRAVING_TEXTS[level]
    })
  },

  onPriceInput(e) {
    this.setData({ price: e.detail.value })
  },

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

  async onSubmit() {
    const { name, selectedCategory, requirements, cravingLevel, price, tasteTags } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }
    if (!selectedCategory) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
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
      const icon = DEFAULT_EMOJIS[selectedCategory] || '🍽️'
      const priceValue = price ? parseFloat(price) : 0

      const res = await wx.cloud.callFunction({
        name: 'addFood',
        data: {
          name: name.trim(),
          category: selectedCategory,
          icon,
          description: requirements.trim(),
          price: priceValue,
          tasteTags: selectedTags,
          requirements: requirements.trim(),
          imageUrl: imageFileIDs[0] || '',
          images: imageFileIDs,
          cravingLevel,
          isCustom: true
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: '添加成功！', icon: 'success' })
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
