/**
 * 订阅消息模板字段辅助工具
 *
 * 使用方式：
 * 1. 在 subscribeConfig.js 中配置每个模板 ID 对应的字段列表（key 是模板 ID）
 * 2. 在 createOrder / updateOrderStatus 中只填需要的字段值
 * 3. 调用 fillTemplateData() 自动补全缺失字段（用默认值）
 *
 * 这样可以避免微信返回 "data.thingXX.value is empty" 错误
 */

const DEFAULT_VALUES = {
  // 各类字段的默认值（用于未提供的字段）
  thing: '无',
  amount: '¥0.00',
  character_string: '无',
  date: '1970-01-01',
  time: '00:00',
  phrase: '无',
  number: '0',
  phone_number: '无',
  name: '无',
  car_number: '无',
  letter: '无'
}

/**
 * 从字段名提取字段类型
 * 例如：thing14 → thing；character_string22 → character_string；amount4 → amount
 */
function getFieldType(fieldName) {
  if (!fieldName) return 'thing'
  const match = fieldName.match(/^([a-zA-Z_]+)\d+$/)
  return match ? match[1] : fieldName
}

/**
 * 补全订阅消息模板的 data 对象
 *
 * @param {string} templateId - 模板 ID
 * @param {object} partialData - 已填写的部分数据
 * @param {object} templateConfig - 模板字段定义（来自 subscribeConfig.js）
 * @returns {object} 完整 data 对象
 */
function fillTemplateData(templateId, partialData, templateConfig) {
  const fields = templateConfig[templateId]

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    console.warn(`fillTemplateData: 模板 ${templateId} 未配置字段定义，返回原始 data`)
    return partialData || {}
  }

  const result = {}

  for (const fieldName of fields) {
    const type = getFieldType(fieldName)
    const defaultValue = DEFAULT_VALUES[type] || '无'

    if (partialData && partialData[fieldName] && partialData[fieldName].value !== undefined && partialData[fieldName].value !== '') {
      result[fieldName] = {
        value: String(partialData[fieldName].value)
      }
    } else {
      result[fieldName] = {
        value: defaultValue
      }
    }
  }

  return result
}

module.exports = {
  fillTemplateData
}
