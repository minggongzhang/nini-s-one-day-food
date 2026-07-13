// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询 users 集合看用户是否已注册
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    let userData = null
    if (userResult.data && userResult.data.length > 0) {
      userData = userResult.data[0]
    }

    return {
      openid,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      user: userData,
      isRegistered: !!userData
    }
  } catch (err) {
    console.error('login error:', err)
    // users 集合可能还没创建，返回基本信息
    return {
      openid,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      user: null,
      isRegistered: false
    }
  }
}
