const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { category } = event
  
  console.log('getFoods called with category:', category)
  
  try {
    let query = db.collection('foods').orderBy('sort', 'asc')
    
    if (category && category !== '全部') {
      query = query.where({
        category: category
      })
    }
    
    const result = await query.get()
    console.log('getFoods result:', result)
    
    return {
      success: true,
      data: result.data,
      count: result.data.length
    }
  } catch (err) {
    console.error('getFoods error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err),
      errCode: err.errCode
    }
  }
}
