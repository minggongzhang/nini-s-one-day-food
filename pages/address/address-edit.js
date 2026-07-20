// pages/address/address-edit.js
const MAX_ADDRESSES = 6

Page({
  data: {
    name: '',
    phone: '',
    room: '',
    location: {},
    isDefault: false,
    saving: false,
    isEdit: false
  },

  onLoad(options) {
    if (options.index !== undefined) {
      this.setData({ isEdit: true })
      this.loadAddress(parseInt(options.index))
    }
  },

  loadAddress(index) {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const addrList = userInfo.addressList || []
    const addr = addrList[index]
    if (addr) {
      this.setData({
        name: addr.name || '',
        phone: addr.phone || '',
        room: addr.room || '',
        isDefault: addr.isDefault || false,
        location: {
          name: addr.locationName || '',
          address: addr.locationAddress || '',
          latitude: addr.latitude || 0,
          longitude: addr.longitude || 0
        }
      })
    } else {
      this.setData({ name: userInfo.nickname || '' })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onRoomInput(e) {
    this.setData({ room: e.detail.value })
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return
        if (err.errMsg && err.errMsg.includes('auth')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限',
            success: (r) => {
              if (r.confirm) wx.openSetting()
            }
          })
        }
      }
    })
  },

  onToggleDefault() {
    this.setData({ isDefault: !this.data.isDefault })
  },

  async onDelete() {
    const index = parseInt(this.options.index)
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      confirmColor: '#EF5350',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const db = wx.cloud.database()
          const userInfo = wx.getStorageSync('userInfo') || {}
          const openid = userInfo.openid || userInfo.openId
          let addressList = (userInfo.addressList || []).concat()
          addressList.splice(index, 1)
          // 如果删除的是默认地址，自动将第一条设为默认
          if (addressList.length > 0 && !addressList.some(a => a.isDefault)) {
            addressList[0].isDefault = true
          }
          const defaultAddr = addressList.find(a => a.isDefault) || addressList[0] || null
          const updatedUserInfo = { ...userInfo, addressList, deliveryAddress: defaultAddr }
          if (openid) {
            await db.collection('users').where({ openid }).update({
              data: { addressList, deliveryAddress: defaultAddr, updatedAt: db.serverDate() }
            })
          }
          wx.setStorageSync('userInfo', updatedUserInfo)
          wx.setStorageSync('deliveryAddress', defaultAddr)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 800)
        } catch (err) {
          console.error('删除地址失败:', err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  async onSave() {
    const { name, phone, room, location, isDefault, isEdit } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入收货人姓名', icon: 'none' })
      return
    }
    if (!phone.trim() || !/^1\d{10}$/.test(phone.trim())) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!location.name) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    try {
      const db = wx.cloud.database()
      const userInfo = wx.getStorageSync('userInfo') || {}
      const openid = userInfo.openid || userInfo.openId

      const addressData = {
        name: name.trim(),
        phone: phone.trim(),
        room: room.trim(),
        locationName: location.name,
        locationAddress: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        isDefault: isDefault
      }

      let addressList = (userInfo.addressList || []).concat()

      if (isEdit) {
        // 编辑模式：替换对应索引
        const editIndex = parseInt(this.options.index)
        addressList[editIndex] = addressData
      } else {
        // 新增模式：检查数量上限
        if (addressList.length >= MAX_ADDRESSES) {
          wx.showToast({ title: `最多保存${MAX_ADDRESSES}条地址`, icon: 'none' })
          this.setData({ saving: false })
          return
        }
        // 如果是第一条或设为默认，清除其他默认
        if (addressList.length === 0 || isDefault) {
          addressList.forEach(a => { a.isDefault = false })
          addressData.isDefault = true
        }
        addressList.push(addressData)
      }

      // 同步到数据库和本地缓存
      const defaultAddr = addressList.find(a => a.isDefault) || addressList[0] || null
      const updatedUserInfo = { ...userInfo, addressList, deliveryAddress: defaultAddr }

      if (openid) {
        await db.collection('users').where({ openid }).update({
          data: {
            addressList: addressList,
            deliveryAddress: defaultAddr,
            updatedAt: db.serverDate()
          }
        })
      }

      wx.setStorageSync('userInfo', updatedUserInfo)
      wx.setStorageSync('deliveryAddress', defaultAddr)

      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('保存地址失败:', err)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  }
})