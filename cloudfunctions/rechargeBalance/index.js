const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { targetOpenid, amount, targetRole } = event

  if (!amount || amount <= 0) {
    return { success: false, error: '充值金额必须大于 0' }
  }

  try {
    // 1. 验证操作者是男朋友
    const operatorResult = await db.collection('users')
      .where({ openid })
      .get()

    if (!operatorResult.data || operatorResult.data.length === 0) {
      return { success: false, error: '操作者用户不存在' }
    }

    const operator = operatorResult.data[0]
    if (operator.role !== 'boyfriend') {
      return { success: false, error: '只有男朋友可以充值' }
    }

    // 2. 确定充值目标
    let targetQuery = {}
    if (targetOpenid) {
      targetQuery.openid = targetOpenid
    } else if (targetRole === 'girlfriend') {
      // 自动找到女朋友账户
      targetQuery.role = 'girlfriend'
    } else {
      // 默认给自己充值
      targetQuery.openid = openid
    }

    const targetResult = await db.collection('users')
      .where(targetQuery)
      .get()

    if (!targetResult.data || targetResult.data.length === 0) {
      return { success: false, error: '目标用户不存在' }
    }

    const target = targetResult.data[0]

    // 3. 增加余额
    await db.collection('users')
      .doc(target._id)
      .update({
        data: {
          balance: _.inc(amount),
          updatedAt: db.serverDate()
        }
      })

    const newBalance = target.balance + amount

    console.log(`Recharge: ${operator.nickname} -> ${target.nickname}, amount: ${amount}, new balance: ${newBalance}`)

    return {
      success: true,
      targetNickname: target.nickname,
      targetOpenid: target.openid,
      amount,
      newBalance
    }
  } catch (err) {
    console.error('rechargeBalance error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err)
    }
  }
}
