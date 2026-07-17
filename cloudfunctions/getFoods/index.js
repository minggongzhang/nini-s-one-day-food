const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { category } = event

  console.log('getFoods called by openid:', openid, 'category:', category)

  try {
    // 数据隔离策略：
    // - 默认菜品（isCustom 不为 true）：所有女友都能看到
    // - 自定义菜品（isCustom 为 true）：仅创建者自己能看到
    let whereCondition = _.or([
      { isCustom: _.neq(true) },
      { createdBy: openid }
    ])

    // 叠加分类筛选
    if (category && category !== '全部') {
      whereCondition = _.and([
        whereCondition,
        { category: category }
      ])
    }

    const result = await db.collection('foods')
      .where(whereCondition)
      .orderBy('sort', 'asc')
      .get()

    console.log('getFoods result count:', result.data.length)

    return {
      success: true,
      data: result.data,
      count: result.data.length
    }
  } catch (err) {
    console.error('getFoods error:', err)
    return {
      success: false,
      error: err.message || JSON.stringify(err),
      errCode: err.errCode
    }
  }
}
