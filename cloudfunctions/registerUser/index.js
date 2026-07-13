const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const INITIAL_BALANCE = 1000

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { nickname, avatarUrl, role } = event

  if (!role || !['boyfriend', 'girlfriend'].includes(role)) {
    return { success: false, error: '请选择角色' }
  }

  try {
    // 查询用户是否已存在
    const existingResult = await db.collection('users')
      .where({ openid })
      .get()

    if (existingResult.data && existingResult.data.length > 0) {
      // 用户已存在，更新信息
      const existingUser = existingResult.data[0]
      
      await db.collection('users')
        .doc(existingUser._id)
        .update({
          data: {
            nickname: nickname || existingUser.nickname,
            avatarUrl: avatarUrl || existingUser.avatarUrl,
            role: role || existingUser.role,
            updatedAt: db.serverDate()
          }
        })

      return {
        success: true,
        data: {
          ...existingUser,
          nickname: nickname || existingUser.nickname,
          avatarUrl: avatarUrl || existingUser.avatarUrl,
          role: role || existingUser.role
        },
        isNew: false
      }
    } else {
      // 新用户，创建记录
      const userData = {
        openid,
        nickname: nickname || '',
        avatarUrl: avatarUrl || '',
        role,
        balance: INITIAL_BALANCE,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }

      const result = await db.collection('users').add({
        data: userData
      })

      console.log('registerUser success, _id:', result._id)

      return {
        success: true,
        data: {
          _id: result._id,
          ...userData,
          balance: INITIAL_BALANCE
        },
        isNew: true
      }
    }
  } catch (err) {
    console.error('registerUser error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err)
    }
  }
}
