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
    // 查询用户信息
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    let userRole = role
    let user = null
    if (userResult.data && userResult.data.length > 0) {
      user = userResult.data[0]
      userRole = user.role
    }

    let query = {}

    if (userRole === 'boyfriend') {
      // 男朋友查看订单：通过 boyfriendOpenid 过滤，天然实现数据隔离
      // 解绑后仍可查看历史订单（历史订单中 boyfriendOpenid 仍为自己的 openid）
      // 新订单因对方 partnerOpenid 已清空，不会写入此男友的 boyfriendOpenid
      if (!user.isBound || !user.partnerOpenid) {
        // 未绑定时不阻止查询历史订单，仅标记未绑定状态
        query.boyfriendOpenid = openid
        if (status && status !== 'all') {
          if (status === 'processing') {
            query.status = _.in(['accepted', 'preparing'])
          } else {
            query.status = status
          }
        }
        const historyResult = await db.collection('orders')
          .where(query)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get()
        return {
          success: true,
          data: historyResult.data || [],
          count: historyResult.data ? historyResult.data.length : 0,
          role: userRole,
          isBound: false,
          message: '尚未绑定，仅显示历史订单'
        }
      }
      query.boyfriendOpenid = openid
      
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
