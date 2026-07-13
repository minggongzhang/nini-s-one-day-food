const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { status, role } = event

  try {
    // 查询用户角色
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    let userRole = role
    if (!userRole && userResult.data && userResult.data.length > 0) {
      userRole = userResult.data[0].role
    }

    let query = {}

    if (userRole === 'boyfriend') {
      // 男朋友可以看到所有订单
      if (status && status !== 'all') {
        if (status === 'processing') {
          // "制作中" tab 包含已接单和制作中
          query.status = _.in(['accepted', 'preparing'])
        } else {
          query.status = status
        }
      }
    } else {
      // 女朋友只能看到自己的订单
      query.userId = openid
      if (status && status !== 'all') {
        if (status === 'processing') {
          query.status = _.in(['accepted', 'preparing'])
        } else {
          query.status = status
        }
      }
    }

    const result = await db.collection('orders')
      .where(query)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return {
      success: true,
      data: result.data || [],
      count: result.data ? result.data.length : 0,
      role: userRole
    }
  } catch (err) {
    console.error('getOrders error:', err)
    return {
      success: false,
      data: [],
      error: err.message || JSON.stringify(err)
    }
  }
}
