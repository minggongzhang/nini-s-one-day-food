const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, id, data } = event

  // 校验男友身份
  const userRes = await db.collection('users').where({ openid }).get()
  const user = userRes.data[0] || {}
  if (user.role !== 'boyfriend') {
    return { success: false, error: '无权限操作' }
  }

  try {
    switch (action) {
      case 'list': {
        const { category, status: filterStatus } = data || {}
        const partnerOpenid = user.partnerOpenid || ''

        // 数据隔离：只看默认菜品 + 自己创建的 + 自己女友上传的
        let whereCondition = _.or([
          { isCustom: _.neq(true) },
          { createdBy: openid },
          partnerOpenid ? { createdBy: partnerOpenid } : {}
        ])

        if (category && category !== '全部') {
          whereCondition = _.and([
            whereCondition,
            { category: category }
          ])
        }
        if (filterStatus && filterStatus !== 'all') {
          whereCondition = _.and([
            whereCondition,
            { status: filterStatus }
          ])
        }

        const result = await db.collection('foods')
          .where(whereCondition)
          .orderBy('sort', 'asc')
          .get()

        return { success: true, data: result.data }
      }

      case 'review': {
        const { price, isShelved } = data || {}
        if (typeof price !== 'number' || price < 0) {
          return { success: false, error: '请填写有效的价格' }
        }
        const food = await db.collection('foods').doc(id).get()
        if (!food.data) return { success: false, error: '菜品不存在' }
        // 只能审核自己女友上传的菜品（或自己创建的）
        const partnerOpenid = user.partnerOpenid || ''
        const foodCreatedBy = food.data.createdBy
        const isOwner = foodCreatedBy === openid || foodCreatedBy === partnerOpenid
        const isDefault = food.data.isCustom !== true
        if (!isOwner && !isDefault) {
          return { success: false, error: '无权审核该菜品' }
        }
        await db.collection('foods').doc(id).update({
          data: {
            price,
            status: 'approved',
            isShelved: isShelved !== false,
            updatedAt: db.serverDate()
          }
        })
        return { success: true, message: '审核通过' }
      }

      case 'reject': {
        const food = await db.collection('foods').doc(id).get()
        if (!food.data) return { success: false, error: '菜品不存在' }
        const partnerOpenid = user.partnerOpenid || ''
        const foodCreatedBy = food.data.createdBy
        const isOwner = foodCreatedBy === openid || foodCreatedBy === partnerOpenid
        const isDefault = food.data.isCustom !== true
        if (!isOwner && !isDefault) {
          return { success: false, error: '无权操作该菜品' }
        }
        await db.collection('foods').doc(id).update({
          data: {
            status: 'rejected',
            isShelved: false,
            updatedAt: db.serverDate()
          }
        })
        return { success: true, message: '已拒绝' }
      }

      case 'toggleShelve': {
        const food = await db.collection('foods').doc(id).get()
        if (!food.data) return { success: false, error: '菜品不存在' }
        const newStatus = !food.data.isShelved
        await db.collection('foods').doc(id).update({
          data: {
            isShelved: newStatus,
            updatedAt: db.serverDate()
          }
        })
        return { success: true, isShelved: newStatus }
      }

      case 'update': {
        const { name, category, description, price, tasteTags, imageUrl } = data || {}
        const updateData = { updatedAt: db.serverDate() }
        if (name !== undefined) updateData.name = name
        if (category !== undefined) updateData.category = category
        if (description !== undefined) updateData.description = description
        if (typeof price === 'number') updateData.price = price
        if (tasteTags !== undefined) updateData.tasteTags = tasteTags
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl

        await db.collection('foods').doc(id).update({ data: updateData })
        return { success: true, message: '更新成功' }
      }

      case 'delete': {
        await db.collection('foods').doc(id).remove()
        return { success: true, message: '删除成功' }
      }

      default:
        return { success: false, error: '未知操作' }
    }
  } catch (err) {
    console.error('manageFood error:', err)
    return { success: false, error: err.message || JSON.stringify(err) }
  }
}
