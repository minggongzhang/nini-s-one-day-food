const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 合法的状态流转
const STATUS_FLOW = {
  pending: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['completed'],
  completed: [],
  rejected: []
}

// 状态对应的中文
const STATUS_TEXT = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '制作中',
  completed: '已完成',
  rejected: '已拒绝'
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { orderId, newStatus } = event

  if (!orderId || !newStatus) {
    return { success: false, error: '参数缺失' }
  }

  if (!STATUS_FLOW[newStatus]) {
    return { success: false, error: '无效的状态' }
  }

  try {
    // 1. 查询订单
    const orderResult = await db.collection('orders').doc(orderId).get()
    const order = orderResult.data

    if (!order) {
      return { success: false, error: '订单不存在' }
    }

    // 2. 检查状态流转是否合法
    const allowedNext = STATUS_FLOW[order.status] || []
    if (!allowedNext.includes(newStatus)) {
      return { 
        success: false, 
        error: `当前状态「${STATUS_TEXT[order.status]}」不能变更为「${STATUS_TEXT[newStatus]}」`
      }
    }

    // 3. 查询操作者角色
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    let userRole = ''
    if (userResult.data && userResult.data.length > 0) {
      userRole = userResult.data[0].role
    }

    // 4. 权限检查：只有男朋友可以操作订单状态
    if (userRole !== 'boyfriend') {
      return { success: false, error: '只有男朋友可以处理订单' }
    }

    // 5. 更新订单状态
    const updateData = {
      status: newStatus,
      handledBy: openid,
      updatedAt: db.serverDate()
    }

    if (newStatus === 'accepted') {
      updateData.acceptedAt = db.serverDate()
    }
    if (newStatus === 'completed') {
      updateData.completedAt = db.serverDate()
    }

    await db.collection('orders').doc(orderId).update({
      data: updateData
    })

    // 6. 如果拒绝，退款给用户
    if (newStatus === 'rejected') {
      await db.collection('users')
        .where({ openid: order.userId })
        .update({
          data: {
            balance: _.inc(order.totalAmount),
            updatedAt: db.serverDate()
          }
        })
      console.log(`Refunded ${order.totalAmount} to user ${order.userId}`)
    }

    return {
      success: true,
      orderId,
      newStatus,
      statusText: STATUS_TEXT[newStatus],
      refunded: newStatus === 'rejected' ? order.totalAmount : 0
    }
  } catch (err) {
    console.error('updateOrderStatus error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err)
    }
  }
}
