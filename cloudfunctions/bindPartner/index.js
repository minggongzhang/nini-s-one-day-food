const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成随机邀请码
function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { inviteCode, action } = event

  // action: 'bind'（通过邀请码绑定）\unbind 或 'getMyCode'（获取自己的邀请码）

  try {
    // 1. 获取当前用户信息
    const currentUserResult = await db.collection('users')
      .where({ openid })
      .get()

    if (!currentUserResult.data || currentUserResult.data.length === 0) {
      return { success: false, error: '用户不存在，请先登录' }
    }

    const currentUser = currentUserResult.data[0]

    if (action === 'getMyCode') {
      // 获取自己的邀请码
      return {
        success: true,
        inviteCode: currentUser.inviteCode,
        isBound: currentUser.isBound,
        partnerOpenid: currentUser.partnerOpenid
      }
    }

    if (action === 'bind') {
      // 通过邀请码绑定
      if (!inviteCode) {
        return { success: false, error: '请输入邀请码' }
      }

      // 检查自己是否已绑定
      if (currentUser.isBound) {
        return { success: false, error: '你已经绑定过了，不能重复绑定' }
      }

      // 查找邀请码对应的用户
      const partnerResult = await db.collection('users')
        .where({ inviteCode: inviteCode.toUpperCase() })
        .get()

      if (!partnerResult.data || partnerResult.data.length === 0) {
        return { success: false, error: '邀请码无效，请检查后重试' }
      }

      const partner = partnerResult.data[0]

      // 检查对方是否已绑定
      if (partner.isBound) {
        return { success: false, error: '对方已经绑定过了' }
      }

      // 检查角色是否互补（一个是男友，一个是女友）
      if (currentUser.role === partner.role) {
        return { success: false, error: '相同角色无法绑定，请确保一个是男友，一个是女友' }
      }

      // 绑定双方
      const batch = db.collection('users')
      
      // 更新当前用户
      await batch.doc(currentUser._id).update({
        data: {
          partnerOpenid: partner.openid,
          isBound: true,
          updatedAt: db.serverDate()
        }
      })

      // 更新对方
      await batch.doc(partner._id).update({
        data: {
          partnerOpenid: currentUser.openid,
          isBound: true,
          updatedAt: db.serverDate()
        }
      })

      console.log(`Bind success: ${currentUser.nickname} <-> ${partner.nickname}`)

      return {
        success: true,
        message: '绑定成功！',
        partner: {
          nickname: partner.nickname,
          avatarUrl: partner.avatarUrl,
          role: partner.role
        }
      }
    }

    if (action === 'unbind') {
      // 解除绑定 — 任何一方可单方面解绑，无需对方确认
      if (!currentUser.isBound) {
        return { success: false, error: '你尚未绑定，无需解绑' }
      }

      const partnerOpenid = currentUser.partnerOpenid
      if (!partnerOpenid) {
        return { success: false, error: '绑定信息异常，请联系客服' }
      }

      const newInviteCode = generateInviteCode()

      // 更新当前用户 — 清空绑定状态，保留邀请码
      await db.collection('users').doc(currentUser._id).update({
        data: {
          isBound: false,
          partnerOpenid: '',
          inviteCode: newInviteCode,
          updatedAt: db.serverDate()
        }
      })

      // 同时更新对方 — 如果对方也存在绑定记录
      const partnerResult = await db.collection('users')
        .where({ openid: partnerOpenid })
        .get()

      if (partnerResult.data && partnerResult.data.length > 0) {
        const partnerDoc = partnerResult.data[0]
        const partnerNewInviteCode = generateInviteCode()
        // 只有当对方仍然绑定的是自己时才清除（防止极端并发情况）
        if (partnerDoc.partnerOpenid === openid) {
          await db.collection('users').doc(partnerDoc._id).update({
            data: {
              isBound: false,
              partnerOpenid: '',
              inviteCode:  partnerNewInviteCode,
              updatedAt: db.serverDate()
            }
          })
        }
      }

      console.log(`Unbind success: ${currentUser.nickname} unbound from ${partnerOpenid}`)

      return {
        success: true,
        message: '解绑成功'
      }
    }

    return { success: false, error: '无效的操作' }
  } catch (err) {
    console.error('bindPartner error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err)
    }
  }
}
