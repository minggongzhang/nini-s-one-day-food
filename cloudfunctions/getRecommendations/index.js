const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  console.log('getRecommendations called')
  
  try {
    const result = await db.collection('foods')
      .where({
        isRecommended: true
      })
      .orderBy('sort', 'asc')
      .get()
    
    console.log('getRecommendations result:', result)
    
    return {
      success: true,
      data: result.data,
      count: result.data.length
    }
  } catch (err) {
    console.error('getRecommendations error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err),
      errCode: err.errCode
    }
  }
}
