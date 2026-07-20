const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { category, role } = event

  console.log('getFoods called by openid:', openid, 'category:', category, 'role:', role)

  try {
    let whereCondition

    if (role === 'boyfriend') {
      // 男友端：返回全部菜品（含待审核、已下架）
      whereCondition = {}
    } else {
      // 女友端：只返回已审核的菜品
      // 数据隔离：默认菜品（isCustom 非 true）+ 自己创建的自定义菜品
      // 兼容旧数据：缺少 isShelved/status 字段的默认菜品视为已上架已审核
      whereCondition = _.and([
        _.or([
          { isShelved: true },
          { isShelved: _.exists(false) }
        ]),
        _.or([
          { status: 'approved' },
          { status: _.exists(false) }
        ]),
        _.or([
          { isCustom: _.neq(true) },
          { createdBy: openid }
        ])
      ])
    }

    // 叠加分类筛选
    if (category && category !== '全部') {
      if (role === 'boyfriend') {
        whereCondition = { category: category }
      } else {
        whereCondition = _.and([
          whereCondition,
          { category: category }
        ])
      }
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
