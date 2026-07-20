const { getIconPath } = require('../../utils/emojiIcons')

const CRAVING_TEXTS = {
  1: '还行吧',
  2: '有点想吃',
  3: '挺想吃的',
  4: '超想吃！',
  5: '现在就要吃！！'
}

const CATEGORY_OPTIONS = [
  { name: '主食', iconPath: '/images/emoji/rice.png' },
  { name: '小吃', iconPath: '/images/emoji/fries.png' },
  { name: '饮品', iconPath: '/images/emoji/drink.png' },
  { name: '甜点', iconPath: '/images/emoji/cake.png' },
  { name: '汤品', iconPath: '/images/emoji/pot.png' }
]

const DEFAULT_TASTE_TAGS = [
  '不辣', '微辣', '中辣', '特辣',
  '多醋', '多葱', '偏咸', '偏甜',
  '清淡', '重口', '不要香菜', '不要葱'
]

Page({
  data: {
    foodId: '',
    name: '',
    selectedCategory: '',
    categoryOptions: CATEGORY_OPTIONS,
    showCustomCategory: false,
    tasteTags: [],
    showCustomTagInput: false,
    requirements: '',
    images: [],
    cravingLevel: 3,
    cravingText: '挺想吃的',
    price: '',
    submitting: false
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({ foodId: options.id })
    this.loadFood(options.id)
  },

  async loadFood(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('foods').doc(id).get()
      const item = res.data
      if (!item) {
        wx.showToast({ title: '菜品不存在', icon: 'none' })
        return
      }

      const tasteTags = DEFAULT_TASTE_TAGS.map(name => ({
        name,
        checked: (item.tasteTags || []).includes(name)
      }))

      const isCustomCategory = !CATEGORY_OPTIONS.some(c => c.name === item.category)
      const cravingText = CRAVING_TEXTS[item.cravingLevel] || '挺想吃的'

      this.setData({
        name: item.name || '',
        selectedCategory: item.category || '',
        showCustomCategory: isCustomCategory,
        tasteTags,
        requirements: item.requirements || item.description || '',
        images: item.images || (item.imageUrl ? [item.imageUrl] : []),
        cravingLevel: item.cravingLevel || 3,
        cravingText,
        price: item.price ? String(item.price) : ''
      })
    } catch (err) {
      console.error('加载菜品失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },

  onCategoryTap(e) {
    const name = e.currentTarget.dataset.name
    this.setData({ selectedCategory: name, showCustomCategory: false })
  },

  onToggleCustomCategory() {
    this.setData({ showCustomCategory: !this.data.showCustomCategory })
  },

  onCustomCategoryInput(e) {
    this.setData({ selectedCategory: e.detail.value })
  },

  onTasteTagTap(e) {
    const index = e.currentTarget.dataset.index
    const key = `tasteTags[${index}].checked`
    this.setData({ [key]: !this.data.tasteTags[index].checked })
  },

  onToggleCustomTag() {
    this.setData({ showCustomTagInput: !this.data.showCustomTagInput })
  },

  onCustomTagInput(e) {
    this.setData({ customTagValue: e.detail.value })
  },

  onAddCustomTag() {
    const val = (this.data.customTagValue || '').trim()
    if (!val) return
    if (this.data.tasteTags.some(t => t.name === val)) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    this.setData({
      tasteTags: [...this.data.tasteTags, { name: val, checked: true }],
      customTagValue: '',
      showCustomTagInput: false
    })
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
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: [...this.data.images, ...newImages] })
      }
    })
  },

  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  onPriceInput(e) {
    this.setData({ price: e.detail.value })
  },

  onCravingTap(e) {
    const level = e.currentTarget.dataset.level
    this.setData({
      cravingLevel: level,
      cravingText: CRAVING_TEXTS[level]
    })
  },

  async onSubmit() {
    const { name, selectedCategory, tasteTags, requirements, images, cravingLevel, price, foodId } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }
    if (!selectedCategory.trim()) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    const priceVal = parseFloat(price)
    if (isNaN(priceVal) || priceVal < 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中' })

    try {
      // 上传新图片
      let finalImages = [...images]
      const oldImages = this.data.images.filter(img => img.startsWith('cloud://'))
      const newLocalImages = images.filter(img => !img.startsWith('cloud://'))

      if (newLocalImages.length > 0) {
        const openid = wx.getStorageSync('openid') || getApp().globalData.openid
        const uploadTasks = newLocalImages.map(filePath => {
          const ext = filePath.split('.').pop()
          const cloudPath = `foods/${openid}/${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`
          return wx.cloud.uploadFile({
            cloudPath,
            filePath
          }).then(res => res.fileID)
        })
        const uploaded = await Promise.all(uploadTasks)
        finalImages = [...oldImages, ...uploaded]
      }

      const selectedTagNames = tasteTags.filter(t => t.checked).map(t => t.name)

      const res = await wx.cloud.callFunction({
        name: 'manageFood',
        data: {
          action: 'update',
          id: foodId,
          data: {
            name: name.trim(),
            category: selectedCategory.trim(),
            tasteTags: selectedTagNames,
            requirements: requirements.trim(),
            description: requirements.trim(),
            price: priceVal,
            images: finalImages,
            imageUrl: finalImages[0] || '',
            cravingLevel
          }
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1000)
      } else {
        wx.showToast({ title: res.result.error || '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
      wx.hideLoading()
    }
  }
})