const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const INITIAL_BALANCE = 1000;

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
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { nickname, avatarUrl, role } = event;

  if (!role || !["boyfriend", "girlfriend"].includes(role)) {
    return { success: false, error: "请选择角色" };
  }

  try {
    // 查询用户是否已存在
    const existingResult = await db.collection("users").where({ openid }).get();

    if (existingResult.data && existingResult.data.length > 0) {
      // 用户已存在
      const existingUser = existingResult.data[0];

      // 角色固定，不允许修改
      if (role && role !== existingUser.role) {
        return {
          success: false,
          error: "角色一旦选定，不允许修改！如需更换角色，请联系客服。",
        };
      }

      // 检查是否需要生成邀请码
      let userInviteCode = existingUser.inviteCode;
      if (!userInviteCode) {
        // 为已有用户生成邀请码
        let inviteCode = generateInviteCode();
        let codeExists = true;
        let attempts = 0;

        while (codeExists && attempts < 10) {
          const codeCheck = await db
            .collection("users")
            .where({ inviteCode })
            .get();
          codeExists = codeCheck.data && codeCheck.data.length > 0;
          if (codeExists) {
            inviteCode = generateInviteCode();
          }
          attempts++;
        }
        userInviteCode = inviteCode;
      }

      // 确保 isBound 和 partnerOpenid 字段存在
      const updateData = {
        nickname: nickname || existingUser.nickname,
        avatarUrl: avatarUrl || existingUser.avatarUrl,
        updatedAt: db.serverDate(),
      };

      // 只有当邀请码不存在时才更新
      if (!existingUser.inviteCode) {
        updateData.inviteCode = userInviteCode;
      }
      // 确保绑定字段存在
      if (existingUser.isBound === undefined) {
        updateData.isBound = false;
      }
      if (existingUser.partnerOpenid === undefined) {
        updateData.partnerOpenid = "";
      }

      // 更新用户信息
      await db.collection("users").doc(existingUser._id).update({
        data: updateData,
      });

      return {
        success: true,
        data: {
          ...existingUser,
          nickname: nickname || existingUser.nickname,
          avatarUrl: avatarUrl || existingUser.avatarUrl,
          inviteCode: userInviteCode,
          isBound:
            existingUser.isBound !== undefined ? existingUser.isBound : false,
          partnerOpenid:
            existingUser.partnerOpenid !== undefined
              ? existingUser.partnerOpenid
              : "",
        },
        isNew: false,
      };
    } else {
      // 新用户，创建记录
      // 生成唯一邀请码
      let inviteCode = generateInviteCode();
      let codeExists = true;
      let attempts = 0;

      while (codeExists && attempts < 10) {
        const codeCheck = await db
          .collection("users")
          .where({ inviteCode })
          .get();
        codeExists = codeCheck.data && codeCheck.data.length > 0;
        if (codeExists) {
          inviteCode = generateInviteCode();
        }
        attempts++;
      }

      const userData = {
        openid,
        nickname: nickname || "",
        avatarUrl: avatarUrl || "",
        role,
        balance: INITIAL_BALANCE,
        inviteCode,
        partnerOpenid: "",
        isBound: false,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      };

      const result = await db.collection("users").add({
        data: userData,
      });

      console.log("registerUser success, _id:", result._id);

      return {
        success: true,
        data: {
          _id: result._id,
          ...userData,
          balance: INITIAL_BALANCE,
        },
        isNew: true,
      };
    }
  } catch (err) {
    console.error("registerUser error:", err);
    return {
      success: false,
      error: err.message || JSON.stringify(err),
    };
  }
};
