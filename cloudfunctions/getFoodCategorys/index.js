const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const result = await db.collection('categories')
      .orderBy('sort', 'asc')
      .get()
    
    return {
      success: true,
      data: result.data,
      count: result.data.length
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || JSON.stringify(err),
      errCode: err.errCode
    }
  }
}
