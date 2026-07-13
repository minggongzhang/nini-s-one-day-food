const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { items, totalAmount, remark } = event

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: '购物车为空' }
  }

  if (!totalAmount || totalAmount <= 0) {
    return { success: false, error: '订单金额异常' }
  }

  try {
    // 1. 查询用户余额
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    if (!userResult.data || userResult.data.length === 0) {
      return { success: false, error: '用户不存在，请重新登录' }
    }

    const user = userResult.data[0]

    if (user.balance < totalAmount) {
      return { 
        success: false, 
        error: `余额不足，当前余额 ${user.balance} 妮妮币，需要 ${totalAmount} 妮妮币`,
        balance: user.balance
      }
    }

    // 2. 扣除余额
    await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          balance: _.inc(-totalAmount),
          updatedAt: db.serverDate()
        }
      })

    // 3. 生成订单号
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const randomStr = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const orderNo = `OD${dateStr}${randomStr}`

    // 4. 创建订单
    const orderData = {
      orderNo,
      userId: openid,
      userNickname: user.nickname,
      userAvatar: user.avatarUrl,
      items: items.map(item => ({
        foodId: item._id || '',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        icon: item.icon || '',
        imageUrl: item.imageUrl || '',
        tasteTags: item.tasteTags || [],
        requirements: item.requirements || ''
      })),
      totalAmount,
      status: 'pending',
      remark: remark || '',
      createdBy: openid,
      handledBy: '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      acceptedAt: null,
      completedAt: null
    }

    const result = await db.collection('orders').add({
      data: orderData
    })

    console.log('createOrder success, _id:', result._id, 'orderNo:', orderNo)

    return {
      success: true,
      _id: result._id,
      orderNo,
      newBalance: user.balance - totalAmount,
      data: orderData
    }
  } catch (err) {
    console.error('createOrder error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err)
    }
  }
}
