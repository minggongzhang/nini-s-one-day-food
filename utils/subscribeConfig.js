/**
 * 订阅消息模板配置
 *
 * 使用前请到微信公众平台配置订阅消息模板：
 * 1. 登录 mp.weixin.qq.com → 功能 → 订阅消息
 * 2. 在「公共模板库」中搜索并添加以下两个模板
 * 3. 将获取到的模板 ID 填入下方对应位置
 * 4. 将模板的字段名填入 TEMPLATE_FIELDS 对应位置（每个字段以「类型名+编号」形式，如 thing14）
 *
 * ===== 模板一：订单状态变更通知（给女朋友）=====
 * 模板标题：订单状态更新提醒
 * 模板 ID：hqpxdpUgInAFPxm_5xLWWv45hFD4BlNgYPWydNKBZXQ
 * 字段：
 *   - 订单号 (character_string1)
 *   - 商品名称 (thing6)
 *   - 订单状态 (phrase3)
 *   - 订单金额 (amount4)
 *   - 备注 (thing5)
 *
 * ===== 模板二：新订单提醒（给男朋友）=====
 * 模板标题：新订单通知
 * 模板 ID：INI6VJLkchUjTvhWh51X6iIaT3eHvc8VvI4ad5mm4CU
 * 字段：
 *   - 下单人 (thing14)
 *   - 产品名称 (thing13)
 *   - 金额 (amount4)
 *   - 订单号 (character_string22)
 *   - 订单时间 (time7)
 */

const TEMPLATES = {
  // 订单状态变更通知（推送给女朋友）
  ORDER_STATUS_CHANGE: 'hqpxdpUgInAFPxm_5xLWWv45hFD4BlNgYPWydNKBZXQ',

  // 新订单提醒（推送给男朋友）
  NEW_ORDER: 'INI6VJLkchUjTvhWh51X6iIaT3eHvc8VvI4ad5mm4CU'
}

// 每个模板对应的完整字段列表（用于自动补全缺失字段，避免 "data.thingXX.value is empty" 错误）
const TEMPLATE_FIELDS = {
  [TEMPLATES.ORDER_STATUS_CHANGE]: [
    'character_string1',
    'thing6',
    'phrase3',
    'amount4',
    'thing5'
  ],
  [TEMPLATES.NEW_ORDER]: [
    'thing14',
    'thing13',
    'amount4',
    'character_string22',
    'time7'
  ]
}

module.exports = {
  TEMPLATES,
  TEMPLATE_FIELDS
}
