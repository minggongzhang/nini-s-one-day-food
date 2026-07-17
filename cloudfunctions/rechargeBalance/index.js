const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { amount } = event

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

    // 2. 检查是否已绑定女友
    if (!operator.isBound || !operator.partnerOpenid) {
      return { success: false, error: '请先绑定女友后再充值' }
    }

    // 3. 查找绑定的女友
    const targetResult = await db.collection('users')
      .where({ openid: operator.partnerOpenid })
      .get()

    if (!targetResult.data || targetResult.data.length === 0) {
      return { success: false, error: '找不到绑定的女友' }
    }

    const target = targetResult.data[0]

    // 4. 增加余额
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
