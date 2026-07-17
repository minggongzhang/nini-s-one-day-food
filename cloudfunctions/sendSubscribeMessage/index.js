const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 发送订阅消息
 *
 * @param {string} touser - 接收者的 openid
 * @param {string} templateId - 模板 ID
 * @param {object} data - 模板数据，格式如 { thing01: { value: 'xxx' }, amount01: { value: '¥99.00' } }
 * @param {string} page - 点击跳转的小程序页面路径
 * @returns {Promise<object>} 发送结果
 */
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

exports.main = async (event, context) => {
  const { touser, templateId, data, page } = event

  if (!touser) {
    console.error('sendSubscribeMessage: 缺少 touser 参数')
    return { success: false, error: '缺少接收者 openid' }
  }

  if (!templateId) {
    console.error('sendSubscribeMessage: 缺少 templateId 参数')
    return { success: false, error: '缺少模板 ID' }
  }

  if (!data || typeof data !== 'object') {
    console.error('sendSubscribeMessage: 缺少 data 参数')
    return { success: false, error: '缺少模板数据' }
  }

  try {
    console.log('准备发送订阅消息:', { touser, templateId, page })
    const result = await cloud.openapi.subscribeMessage.send({
      touser,
      templateId,
      page: page || 'pages/orders/index',
      data,
      miniprogramState: 'developer',
      lang: 'zh_CN'
    })

    console.log('订阅消息发送成功:', { touser, templateId, result })
    return { success: true, data: safeResult(result) }
  } catch (err) {
    // 常见错误码说明：
    // -604101: 云函数无权限调用此 openapi（检查 config.json）或 微信开发者工具云调用 Bug（真机正常）
    // 43101: 用户未订阅该模板消息
    // 47003: 模板参数不准确
    // 40037: 模板 ID 不正确
    console.error('订阅消息发送失败:', {
      errCode: err.errCode,
      errMsg: err.errMsg,
      touser,
      templateId,
      tip: err.errCode === -604101 ? '请检查 config.json 中的 permissions.openapi 配置；或在真机中测试（开发者工具云调用有 Bug）' : null
    })
    return {
      success: false,
      error: err.errMsg || '发送失败',
      errCode: err.errCode,
      hint: err.errCode === -604101
        ? '权限不足或开发者工具 Bug：请确认 config.json 已声明 subscribeMessage.send 权限且已重新部署云函数；或在真机测试'
        : null
    }
  }
}
