// app.js
App({
  onLaunch() {
    wx.cloud.init({
      env: "cloud1-d4g3spkms1f6a1a53",
      traceUser: true,
    });

    const logs = wx.getStorageSync("logs") || [];
    logs.unshift(Date.now());
    wx.setStorageSync("logs", logs);

    // 恢复用户登录状态，并做旧数据字段迁移
    let userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      // 兼容旧版本：之前存的是 openId（大写 I），统一迁移为 openid（小写）
      if (userInfo.openId && !userInfo.openid) {
        userInfo.openid = userInfo.openId;
        delete userInfo.openId;
        wx.setStorageSync("userInfo", userInfo);
      }

      this.globalData.userInfo = userInfo;
      this.globalData.openid = userInfo.openid || userInfo.openId || null;
      this.globalData.role = userInfo.role;

      // 如果是男友角色，自动启动轮询
      if (userInfo.role === "boyfriend") {
        this.startOrderPolling();
      }
    }
  },

  onShow() {
    // 小程序回到前台时，如果是男友角色，加快轮询频率
    if (this.globalData.role === "boyfriend") {
      this.restartPollingWithInterval(5000);
    }
  },

  onHide() {
    // 小程序进入后台时，如果是男友角色，降低轮询频率
    if (this.globalData.role === "boyfriend") {
      this.restartPollingWithInterval(30000);
    }
  },

  /**
   * 启动订单轮询
   */
  startOrderPolling(interval = 5000) {
    if (this.globalData.pollingTimer) {
      clearInterval(this.globalData.pollingTimer);
    }

    console.log("启动订单轮询，间隔:", interval, "ms");
    this.globalData.pollingInterval = interval;
    this.globalData.lastCheckedOrderTime =
      wx.getStorageSync("lastCheckedOrderTime") || 0;

    // 立即检查一次
    this.checkNewOrders();

    // 启动定时器
    this.globalData.pollingTimer = setInterval(() => {
      this.checkNewOrders();
    }, interval);
  },

  /**
   * 停止订单轮询
   */
  stopOrderPolling() {
    if (this.globalData.pollingTimer) {
      clearInterval(this.globalData.pollingTimer);
      this.globalData.pollingTimer = null;
      console.log("停止订单轮询");
    }
  },

  /**
   * 重启轮询并设置新的间隔
   */
  restartPollingWithInterval(interval) {
    if (this.globalData.role !== "boyfriend") return;

    // 只有当间隔变化时才重启
    if (this.globalData.pollingInterval !== interval) {
      this.startOrderPolling(interval);
    }
  },

  /**
   * 检查新订单
   */
  async checkNewOrders() {
    try {
      // 先检查用户是否已绑定情侣
      const userInfo = wx.getStorageSync("userInfo");
      if (!userInfo || !userInfo.isBound) {
        // 未绑定，不检查订单
        console.log("未绑定情侣，跳过订单检查");
        return;
      }

      const res = await wx.cloud.callFunction({
        name: "getOrders",
        data: {
          status: "pending",
          role: "boyfriend",
        },
      });

      if (res.result && res.result.success) {
        const pendingOrders = res.result.data || [];

        if (pendingOrders.length > 0) {
          // 获取最新的待处理订单
          const latestOrder = pendingOrders.reduce((latest, order) => {
            const orderTime = this.getOrderTimestamp(order.createdAt);
            return orderTime > this.getOrderTimestamp(latest.createdAt)
              ? order
              : latest;
          });

          const latestOrderTime = this.getOrderTimestamp(latestOrder.createdAt);
          const lastCheckedTime = this.globalData.lastCheckedOrderTime || 0;

          // 检查是否有新订单（比上次检查时间新）
          if (latestOrderTime > lastCheckedTime) {
            console.log("发现新订单:", latestOrder.orderNo);
            this.globalData.lastCheckedOrderTime = latestOrderTime;
            wx.setStorageSync("lastCheckedOrderTime", latestOrderTime);

            // 触发新订单通知
            this.notifyNewOrder(latestOrder);
          }
        }
      }
    } catch (err) {
      console.error("检查新订单失败:", err);
    }
  },

  /**
   * 获取订单时间戳
   */
  getOrderTimestamp(dateVal) {
    if (!dateVal) return 0;
    if (typeof dateVal === "string") {
      return new Date(dateVal).getTime();
    } else if (typeof dateVal === "object") {
      const iso = dateVal.$date || dateVal.iso || dateVal;
      return new Date(iso).getTime();
    }
    return new Date(dateVal).getTime();
  },

  /**
   * 新订单通知（震动 + 提示）
   */
  notifyNewOrder(order) {
    // 震动
    wx.vibrateLong();

    // 播放提示音（如果有音频文件的话可以加上）
    // wx.playBackgroundAudio({ dataUrl: '...' })

    // 显示弹窗提示
    wx.showModal({
      title: "🎉 新订单来啦！",
      content: `订单号：${order.orderNo}\n${order.items.map((i) => `${i.name}x${i.quantity}`).join("、")}\n金额：¥${order.totalAmount.toFixed(2)}`,
      confirmText: "去处理",
      cancelText: "知道了",
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: "/pages/orders/index",
          });
        }
      },
    });
  },

  globalData: {
    userInfo: null,
    openid: null,
    role: null,
    pollingTimer: null,
    pollingInterval: 5000,
    lastCheckedOrderTime: 0,
  },
});
