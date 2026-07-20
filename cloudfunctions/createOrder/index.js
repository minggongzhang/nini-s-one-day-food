const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// ============================================================
// 订阅消息模板配置（内联，避免云函数依赖项目根目录的 utils）
// 注意：修改项目根目录 utils/subscribeConfig.js 时，也要同步更新这里
// ============================================================
const TEMPLATES = {
  // 新订单提醒（推送给男朋友）
  NEW_ORDER: "INI6VJLkchUjTvhWh51X6iIaT3eHvc8VvI4ad5mm4CU",
};

const TEMPLATE_FIELDS = {
  [TEMPLATES.NEW_ORDER]: [
    "thing14", // 下单人
    "thing13", // 产品名称
    "amount4", // 金额
    "character_string22", // 订单号
    "time7", // 订单时间
  ],
};

// 各字段类型的默认值（用于自动补全缺失字段）
const DEFAULT_VALUES = {
  thing: "无",
  amount: "¥0.00",
  character_string: "无",
  date: "",
  phrase: "无",
  number: "0",
  time: "",
  phone_number: "",
  name: "",
  car_number: "",
  letter: "",
};

/**
 * 安全序列化 OpenAPI 返回结果，避免 BigInt 导致 JSON.stringify 失败
 */
function safeResult(result) {
  if (result === null || result === undefined) {
    return result;
  }
  if (typeof result === "bigint") {
    return result.toString();
  }
  if (
    typeof result === "string" ||
    typeof result === "number" ||
    typeof result === "boolean"
  ) {
    return result;
  }
  if (Array.isArray(result)) {
    return result.map((item) => safeResult(item));
  }
  if (typeof result === "object") {
    const safe = {};
    for (const key of Object.keys(result)) {
      safe[key] = safeResult(result[key]);
    }
    return safe;
  }
  return String(result);
}

/**
 * 提取字段类型前缀
 * 例如：thing14 -> thing，amount4 -> amount，character_string22 -> character_string
 */
function getFieldType(fieldName) {
  const match = fieldName.match(/^([a-zA-Z_]+)\d*$/);
  return match ? match[1] : "";
}

/**
 * 补全订阅消息模板 data 对象，防止模板字段未填导致 "data.thingXX.value is empty" 错误
 */
function fillTemplateData(templateId, partialData) {
  const fields = TEMPLATE_FIELDS[templateId];
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    console.warn(`fillTemplateData: 模板 ${templateId} 未配置字段定义`);
    return partialData || {};
  }

  const fullData = {};
  for (const field of fields) {
    if (
      partialData &&
      partialData[field] &&
      partialData[field].value !== undefined &&
      partialData[field].value !== ""
    ) {
      fullData[field] = partialData[field];
    } else {
      const type = getFieldType(field);
      const defaultValue =
        DEFAULT_VALUES[type] !== undefined ? DEFAULT_VALUES[type] : "无";
      fullData[field] = { value: defaultValue };
    }
  }
  return fullData;
}

// 新订单提醒模板 ID
const NEW_ORDER_TEMPLATE_ID = TEMPLATES.NEW_ORDER;

/**
 * 记录消息发送日志
 */
async function recordMessage(orderId, type, touser, success, result) {
  try {
    await db.collection("messages").add({
      data: {
        orderId,
        type,
        touser,
        success,
        result: safeResult(result) || null,
        createdAt: db.serverDate(),
      },
    });
  } catch (err) {
    console.error("recordMessage 失败:", err);
  }
}

/**
 * 向男朋友发送新订单订阅消息
 * @returns {Array} 发送结果列表
 */
async function notifyBoyfriends(orderData, orderNo, orderId, userOpenid) {
  const results = [];
  try {
    // 查询女友用户，获取绑定的男友
    const girlfriendResult = await db
      .collection("users")
      .where({ openid: userOpenid })
      .get();

    if (!girlfriendResult.data || girlfriendResult.data.length === 0) {
      console.log("找不到女友用户");
      await recordMessage(orderId, "new_order", "", false, {
        reason: "girlfriend_not_found",
      });
      return results;
    }

    const girlfriend = girlfriendResult.data[0];

    // 检查是否已绑定男友
    if (!girlfriend.isBound || !girlfriend.partnerOpenid) {
      console.log("女友还未绑定男友，跳过通知");
      await recordMessage(orderId, "new_order", "", false, {
        reason: "no_bound_partner",
      });
      return results;
    }

    // 查询绑定的男友
    const bfResult = await db
      .collection("users")
      .where({ openid: girlfriend.partnerOpenid })
      .get();

    if (!bfResult.data || bfResult.data.length === 0) {
      console.log("找不到绑定的男友用户");
      await recordMessage(orderId, "new_order", "", false, {
        reason: "boyfriend_not_found",
      });
      return results;
    }

    // 拼接菜品名称（截断到20字以内）
    const foodNames = orderData.items
      .map((item) => `${item.name}x${item.quantity}`)
      .join("、");
    const truncatedNames =
      foodNames.length > 20 ? foodNames.substring(0, 17) + "..." : foodNames;

    // 格式化金额
    const amountStr = `¥${orderData.totalAmount.toFixed(2)}`;

    // 格式化时间（微信 time 类型格式：yyyy年mm月dd日 HH:MM:SS）
    const now = new Date();
    const timeStr = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    // 截断下单人昵称
    const nickname = (orderData.userNickname || "妮妮").substring(0, 20);

    // 构造模板数据（只填实际模板字段，按实际模板字段编号）
    const partialTemplateData = {
      thing14: { value: nickname }, // 下单人
      thing13: { value: truncatedNames }, // 产品名称
      amount4: { value: amountStr }, // 金额
      character_string22: { value: orderNo }, // 订单号
      time7: { value: timeStr }, // 订单时间
    };

    // 自动补全缺失字段
    const templateData = fillTemplateData(
      NEW_ORDER_TEMPLATE_ID,
      partialTemplateData,
    );

    // 向所有男朋友发送（通常只有一个）
    for (const bf of bfResult.data) {
      try {
        const result = await cloud.openapi.subscribeMessage.send({
          touser: bf.openid,
          templateId: NEW_ORDER_TEMPLATE_ID,
          page: "pages/orders/index",
          data: templateData,
          miniprogramState: "developer",
          lang: "zh_CN",
        });
        const safeRes = safeResult(result);
        console.log(
          `新订单通知已发送给 ${bf.nickname}(${bf.openid}):`,
          safeRes,
        );
        results.push({ openid: bf.openid, success: true, result: safeRes });
        await recordMessage(orderId, "new_order", bf.openid, true, result);
      } catch (err) {
        // errCode 43101 = 用户未订阅，属于正常情况
        if (err.errCode === 43101) {
          console.log(`${bf.nickname} 未订阅新订单消息，跳过`);
        } else if (err.errCode === -604101) {
          console.error(
            `发送给 ${bf.nickname} 失败: -604101 权限声明未生效或开发者工具 Bug`,
          );
        } else {
          console.error(`发送给 ${bf.nickname} 失败:`, err.errCode, err.errMsg);
        }
        const safeErr = { errCode: err.errCode, errMsg: err.errMsg };
        results.push({ openid: bf.openid, success: false, ...safeErr });
        await recordMessage(orderId, "new_order", bf.openid, false, safeErr);
      }
    }
  } catch (err) {
    console.error("notifyBoyfriends 异常:", err);
    await recordMessage(orderId, "new_order", "", false, {
      error: err.message || String(err),
    });
  }
  return results;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { items, totalAmount, remark, address } = event;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: "购物车为空" };
  }

  if (!totalAmount || totalAmount <= 0) {
    return { success: false, error: "订单金额异常" };
  }

  try {
    // 1. 查询用户信息
    const userResult = await db.collection("users").where({ openid }).get();

    if (!userResult.data || userResult.data.length === 0) {
      return { success: false, error: "用户不存在，请重新登录" };
    }

    const user = userResult.data[0];

    // 验证角色：只有女友可以下单
    if (user.role !== "girlfriend") {
      return { success: false, error: "只有女友可以下单" };
    }

    // 验证是否已绑定男友
    if (!user.isBound || !user.partnerOpenid) {
      return { success: false, error: "请先绑定男友后再下单" };
    }

    // 验证余额
    if (user.balance < totalAmount) {
      return {
        success: false,
        error: `余额不足，当前余额 ${user.balance} 妮妮币，需要 ${totalAmount} 妮妮币`,
        balance: user.balance,
      };
    }

    // 2. 扣除余额
    await db
      .collection("users")
      .doc(user._id)
      .update({
        data: {
          balance: _.inc(-totalAmount),
          updatedAt: db.serverDate(),
        },
      });

    // 3. 生成订单号
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randomStr = String(Math.floor(Math.random() * 10000)).padStart(
      4,
      "0",
    );
    const orderNo = `OD${dateStr}${randomStr}`;

    // 4. 创建订单
    const orderData = {
      orderNo,
      userId: openid,
      boyfriendOpenid: user.partnerOpenid,
      userNickname: user.nickname,
      userAvatar: user.avatarUrl,
      items: items.map((item) => ({
        foodId: item._id || "",
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        icon: item.icon || "",
        imageUrl: item.imageUrl || "",
        tasteTags: item.tasteTags || [],
        requirements: item.requirements || "",
      })),
      totalAmount,
      status: "pending",
      remark: remark || "",
      address: address || null,
      createdBy: openid,
      handledBy: "",
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      acceptedAt: null,
      completedAt: null,
    };

    const result = await db.collection("orders").add({
      data: orderData,
    });

    console.log("createOrder success, _id:", result._id, "orderNo:", orderNo);

    // 同步发送新订单通知给男朋友（await 确保在云函数返回前执行完）
    let notifyResults = [];
    let notifyError = null;
    try {
      notifyResults = await notifyBoyfriends(
        orderData,
        orderNo,
        result._id,
        openid,
      );
      console.log("notifyBoyfriends results:", notifyResults);
    } catch (notifyErr) {
      notifyError = notifyErr.message || String(notifyErr);
      console.error("notifyBoyfriends 异常:", notifyErr);
    }

    return {
      success: true,
      _id: result._id,
      orderNo,
      newBalance: user.balance - totalAmount,
      notifyCount: notifyResults.length,
      notifySuccess: notifyResults.filter((r) => r.success).length,
      notifyDetails: notifyResults.map((r) => safeResult(r)),
      notifyError: notifyError || null,
    };
  } catch (err) {
    console.error("createOrder error:", err);
    return {
      success: false,
      error: err.message || JSON.stringify(err),
    };
  }
};
