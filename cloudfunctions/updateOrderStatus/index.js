const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ============================================================
// 订阅消息模板配置（内联，避免云函数依赖项目根目录的 utils）
// 注意：修改项目根目录 utils/subscribeConfig.js 时，也要同步更新这里
// ============================================================
const TEMPLATES = {
  // 订单状态变更通知（推送给女朋友）
  ORDER_STATUS_CHANGE: 'hqpxdpUgInAFPxm_5xLWWv45hFD4BlNgYPWydNKBZXQ'
}

const TEMPLATE_FIELDS = {
  [TEMPLATES.ORDER_STATUS_CHANGE]: [
    'character_string1', // 订单号
    'thing6',            // 商品名称
    'phrase3',           // 订单状态
    'amount4',           // 订单金额
    'thing5'             // 备注
  ]
}

// 各字段类型的默认值（用于自动补全缺失字段）
const DEFAULT_VALUES = {
  thing: '无',
  amount: '¥0.00',
  character_string: '无',
  date: '',
  phrase: '无',
  number: '0',
  time: '',
  phone_number: '',
  name: '',
  car_number: '',
  letter: ''
}

/**
 * 安全序列化 OpenAPI 返回结果，避免 BigInt 导致 JSON.stringify 失败
 */
function safeResult(result) {
  if (result === null || result === undefined) {
    return result
  }
  if (typeof result === 'bigint') {
    return result.toString()
  }
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return result
  }
  if (Array.isArray(result)) {
    return result.map(item => safeResult(item))
  }
  if (typeof result === 'object') {
    const safe = {}
    for (const key of Object.keys(result)) {
      safe[key] = safeResult(result[key])
    }
    return safe
  }
  return String(result)
}

/**
 * 提取字段类型前缀
 * 例如：thing14 -> thing，amount4 -> amount，character_string22 -> character_string
 */
function getFieldType(fieldName) {
  const match = fieldName.match(/^([a-zA-Z_]+)\d*$/)
  return match ? match[1] : ''
}

/**
 * 补全订阅消息模板 data 对象，防止模板字段未填导致 "data.thingXX.value is empty" 错误
 */
function fillTemplateData(templateId, partialData) {
  const fields = TEMPLATE_FIELDS[templateId]
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    console.warn(`fillTemplateData: 模板 ${templateId} 未配置字段定义`)
    return partialData || {}
  }

  const fullData = {}
  for (const field of fields) {
    if (partialData && partialData[field] && partialData[field].value !== undefined && partialData[field].value !== '') {
      fullData[field] = partialData[field]
    } else {
      const type = getFieldType(field)
      const defaultValue = DEFAULT_VALUES[type] !== undefined ? DEFAULT_VALUES[type] : '无'
      fullData[field] = { value: defaultValue }
    }
  }
  return fullData
}

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

// 订单状态变更通知模板 ID
const ORDER_STATUS_TEMPLATE_ID = TEMPLATES.ORDER_STATUS_CHANGE

/**
 * 记录消息发送日志
 */
async function recordMessage(orderId, type, touser, success, result) {
  try {
    await db.collection('messages').add({
      data: {
        orderId,
        type,
        touser,
        success,
        result: safeResult(result) || null,
        createdAt: db.serverDate()
      }
    })
  } catch (err) {
    console.error('recordMessage 失败:', err)
  }
}

/**
 * 向女朋友发送订单状态变更订阅消息
 * @returns {Object} 发送结果
 */
async function notifyGirlfriend(order, newStatus) {
  const orderId = order._id || ''
  try {
    const girlfriendOpenid = order.userId
    if (!girlfriendOpenid) {
      console.log('订单缺少 userId，无法通知')
      await recordMessage(orderId, 'order_status', '', false, { reason: 'missing_userId' })
      return { success: false, reason: 'missing_userId' }
    }

    // 拼接菜品名称
    const foodNames = order.items
      .map(item => `${item.name}x${item.quantity}`)
      .join('、')
    const truncatedNames = foodNames.length > 20 ? foodNames.substring(0, 17) + '...' : foodNames

    // 格式化金额
    const amountStr = `¥${order.totalAmount.toFixed(2)}`

    // 订单编号
    const orderNo = order.orderNo || ''

    // 状态文案（phrase 类型限制 5 个汉字以内）
    const statusMap = {
      accepted: '已接单',
      preparing: '制作中',
      completed: '已完成',
      rejected: '已拒绝'
    }
    const statusText = statusMap[newStatus] || newStatus

    // 备注信息
    let remark = order.remark || '无'
    if (remark.length > 20) remark = remark.substring(0, 17) + '...'

    const partialTemplateData = {
      character_string1: { value: orderNo },    // 订单编号
      thing6: { value: truncatedNames },         // 商品名称
      phrase3: { value: statusText },            // 订单状态
      amount4: { value: amountStr },             // 订单金额
      thing5: { value: remark }                   // 备注
    }

    const templateData = fillTemplateData(
      ORDER_STATUS_TEMPLATE_ID,
      partialTemplateData
    )

    const result = await cloud.openapi.subscribeMessage.send({
      touser: girlfriendOpenid,
      templateId: ORDER_STATUS_TEMPLATE_ID,
      page: 'pages/orders/index',
      data: templateData,
      miniprogramState: 'developer',
      lang: 'zh_CN'
    })

    const safeRes = safeResult(result)
    console.log(`订单状态变更通知已发送给 ${order.userNickname}(${girlfriendOpenid}):`, safeRes)
    await recordMessage(orderId, 'order_status', girlfriendOpenid, true, result)
    return { success: true, result: safeRes }
  } catch (err) {
    const safeErr = { errCode: err.errCode, errMsg: err.errMsg }
    if (err.errCode === 43101) {
      console.log('用户未订阅订单状态消息，跳过')
    } else if (err.errCode === -604101) {
      // -604101: 1) config.json 权限声明未生效  2) 微信开发者工具云调用 Bug
      console.error('notifyGirlfriend 失败: -604101 权限不足或开发者工具 Bug，请检查 config.json 并在真机测试')
    } else {
      console.error('notifyGirlfriend 失败:', err.errCode, err.errMsg)
    }
    await recordMessage(orderId, 'order_status', order.userId || '', false, safeErr)
    return { success: false, ...safeErr }
  }
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

    // 同步发送订单状态变更通知给女朋友（await 确保执行完）
    let notifyResult = { success: false }
    try {
      notifyResult = await notifyGirlfriend(order, newStatus)
    } catch (notifyErr) {
      console.error('notifyGirlfriend 异常:', notifyErr)
    }

    return {
      success: true,
      orderId,
      newStatus,
      statusText: STATUS_TEXT[newStatus],
      refunded: newStatus === 'rejected' ? order.totalAmount : 0,
      notifySuccess: notifyResult.success || false
    }
  } catch (err) {
    console.error('updateOrderStatus error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err)
    }
  }
}
