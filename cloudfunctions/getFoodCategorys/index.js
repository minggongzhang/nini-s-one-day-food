const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 1. 从 categories 集合获取预置分类
    let presetCategories = []
    try {
      const presetResult = await db.collection('categories')
        .orderBy('sort', 'asc')
        .get()
      presetCategories = presetResult.data || []
    } catch (e) {
      console.log('categories collection not found, skipping')
    }

    // 2. 从 foods 集合获取所有出现过的 distinct category
    let foodCategories = []
    try {
      const foodsResult = await db.collection('foods')
        .field({ category: true })
        .get()
      
      // 手动去重
      const categorySet = new Set()
      ;(foodsResult.data || []).forEach(item => {
        if (item.category) {
          categorySet.add(item.category)
        }
      })
      
      foodCategories = Array.from(categorySet).map(name => ({ name }))
    } catch (e) {
      console.log('foods collection query failed:', e.message)
    }

    // 3. 合并去重：预置分类 + foods 中出现的分类
    const mergedMap = new Map()
    
    // 先放预置分类（保持 sort 顺序）
    presetCategories.forEach(cat => {
      if (cat.name) {
        mergedMap.set(cat.name, cat)
      }
    })
    
    // 再补充 foods 中出现但预置分类没有的
    foodCategories.forEach(cat => {
      if (!mergedMap.has(cat.name)) {
        mergedMap.set(cat.name, { name: cat.name })
      }
    })

    let categories = Array.from(mergedMap.values())
    
    // 4. 在最前面插入"全部"
    categories.unshift({ name: '全部' })

    return {
      success: true,
      data: categories,
      count: categories.length
    }
  } catch (err) {
    console.error('getFoodCategorys error:', err)
    // 兜底返回基本分类
    return {
      success: false,
      data: [
        { name: '全部' },
        { name: '主食' },
        { name: '小吃' },
        { name: '饮品' },
        { name: '甜点' },
        { name: '汤品' }
      ],
      error: err.message || JSON.stringify(err)
    }
  }
}
