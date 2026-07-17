// pages/orders/index.js
const app = getApp();
const { TEMPLATES, TEMPLATE_FIELDS } = require("../../utils/subscribeConfig");
const { fillTemplateData } = require("../../utils/templateHelper");
const { addIconPaths, getIconPath } = require("../../utils/emojiIcons");

const STATUS_TABS_DEFAULT = [
  { label: "全部", value: "all", count: 0 },
  { label: "待处理", value: "pending", count: 0 },
  { label: "制作中", value: "processing", count: 0 },
  { label: "已完成", value: "completed", count: 0 },
];

const STATUS_MAP = {
  pending: "待处理",
  accepted: "已接单",
  preparing: "制作中",
  completed: "已完成",
  rejected: "已拒绝",
};

const STATUS_TIP = {
  pending: "等待男朋友接单...",
  accepted: "男朋友已接单，马上开始制作",
  preparing: "男朋友正在制作中...",
  completed: "订单已完成，慢慢享用~",
  rejected: "订单被拒绝，妮妮币已退回",
};

Page({
  data: {
    orders: [],
    loading: true,
    role: "",
    activeStatus: "all",
    statusTabs: STATUS_TABS_DEFAULT,
    statusMap: STATUS_MAP,
    statusTip: STATUS_TIP,
    notifyEnabled: false,
    pollingActive: false,
    partnerNickname: "",
  },

  onLoad() {
    this.initRole();
  },

  onShow() {
    this.initRole();
    this.fetchOrders();
    this.checkNotifyStatus();
    this.checkPollingStatus();
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().refreshTabs();
      this.getTabBar().setSelected("/pages/orders/index");
    }
  },

  checkNotifyStatus() {
    const enabled = wx.getStorageSync("newOrderNotifyEnabled") === true;
    this.setData({ notifyEnabled: enabled });
  },

  checkPollingStatus() {
    const isActive =
      this.data.role === "boyfriend" && app.globalData.pollingTimer !== null;
    this.setData({ pollingActive: isActive });
  },

  onPullDownRefresh() {
    this.fetchOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  initRole() {
    const userInfo = wx.getStorageSync("userInfo");
    const role = userInfo ? userInfo.role : "";
    this.setData({ role });
    app.globalData.role = role;
  },

  /**
   * 男朋友：请求订阅"新订单提醒"消息
   * 微信订阅消息每次订阅只能接收1条，需用户主动点击
   */
  async onEnableNotify() {
    try {
      const res = await wx.requestSubscribeMessage({
        tmplIds: [TEMPLATES.NEW_ORDER],
      });

      if (res[TEMPLATES.NEW_ORDER] === "accept") {
        wx.setStorageSync("newOrderNotifyEnabled", true);
        this.setData({ notifyEnabled: true });
        wx.showToast({ title: "已开启提醒", icon: "success" });
      } else if (res[TEMPLATES.NEW_ORDER] === "reject") {
        wx.setStorageSync("newOrderNotifyEnabled", false);
        this.setData({ notifyEnabled: false });
        wx.showToast({ title: "已拒绝，可随时重新开启", icon: "none" });
      } else {
        wx.showToast({ title: "订阅未完成", icon: "none" });
      }
    } catch (err) {
      console.error("订阅消息失败:", err);
      // 20001: 模板 ID 为空或不存在（开发阶段未配置模板 ID）
      if (err.errCode === 20001) {
        wx.showModal({
          title: "提示",
          content:
            "订阅消息模板尚未配置，请在 utils/subscribeConfig.js 中填入模板 ID，并在微信公众平台创建对应模板。",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: "订阅失败，请重试", icon: "none" });
      }
    }
  },

  /**
   * 男朋友：发送一条测试通知给自己
   * 用于验证模板 ID、字段、openid 是否正确
   */
  async onTestNotify() {
    const userInfo = wx.getStorageSync("userInfo");
    const openid = userInfo && (userInfo.openid || userInfo.openId);
    if (!openid) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    wx.showLoading({ title: "发送中..." });
    try {
      // 1. 请求订阅授权
      const subRes = await wx.requestSubscribeMessage({
        tmplIds: [TEMPLATES.NEW_ORDER],
      });
      if (subRes[TEMPLATES.NEW_ORDER] !== "accept") {
        wx.showToast({ title: "未获得订阅权限", icon: "none" });
        return;
      }
      wx.setStorageSync("newOrderNotifyEnabled", true);
      this.setData({ notifyEnabled: true });

      // 2. 构造测试模板数据（按实际模板字段编号）
      const now = new Date();
      const timeStr = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const testData = {
        thing14: { value: "测试下单人" }, // 下单人
        thing13: { value: "测试菜品x1" }, // 产品名称
        amount4: { value: "¥0.01" }, // 金额
        character_string22: { value: "TEST000000" }, // 订单号
        time7: { value: timeStr }, // 订单时间
      };

      const res = await wx.cloud.callFunction({
        name: "sendSubscribeMessage",
        data: {
          touser: openid,
          templateId: TEMPLATES.NEW_ORDER,
          page: "pages/orders/index",
          data: fillTemplateData(
            TEMPLATES.NEW_ORDER,
            testData,
            TEMPLATE_FIELDS,
          ),
        },
      });

      wx.hideLoading();
      console.log("测试通知结果:", res);
      if (res.result && res.result.success) {
        wx.showToast({ title: "测试通知已发送", icon: "success" });
      } else {
        const errCode = res.result && res.result.errCode;
        const errMsg = res.result ? res.result.error || "未知错误" : "未知错误";

        // -604101 是微信开发者工具的已知 bug，真机调试正常
        // 参考：https://developers.weixin.qq.com/community/personal/oCJUswyBbt0ayz7874os1lpC2KcI/answer
        if (errCode === -604101 || (errMsg && errMsg.includes("-604101"))) {
          wx.showModal({
            title: "开发者工具兼容性问题",
            content:
              "错误 -604101 是微信开发者工具调用云调用的已知 Bug。\n\n请按以下步骤验证：\n1. 点击右上角「预览」扫码在真机测试\n2. 或使用「真机调试」功能\n\n真机测试时此错误不会出现，订阅消息会正常收到。",
            showCancel: false,
            confirmText: "我知道了",
          });
        } else {
          wx.showModal({
            title: "发送失败",
            content: `错误码: ${errCode || "无"}\n错误信息: ${errMsg}\n\n请到云开发控制台查看云函数日志获取详情。`,
            showCancel: false,
          });
        }
      }
    } catch (err) {
      wx.hideLoading();
      console.error("测试通知失败:", err);
      wx.showToast({ title: "发送失败，请查看日志", icon: "none" });
    }
  },

  async fetchOrders() {
    const { activeStatus, role } = this.data;

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: "getOrders",
        data: {
          status: activeStatus,
          role,
        },
      });

      if (res.result && res.result.success) {
        const orders = (res.result.data || []).map((order) => {
          // 给订单中的每个菜品添加 iconPath
          const itemsWithIcons = (order.items || []).map((food) => ({
            ...food,
            iconPath: getIconPath(food.icon),
          }));
          return {
            ...order,
            items: itemsWithIcons,
            formattedTime: this.formatTime(order.createdAt),
          };
        });
        this.setData({ orders, loading: false });
        this.updateTabCounts();

        // 男友端：从订单中提取女友昵称用于横幅显示
        if (this.data.role === "boyfriend" && orders.length > 0) {
          const nickname = orders[0].userNickname;
          if (nickname && nickname !== this.data.partnerNickname) {
            this.setData({ partnerNickname: nickname });
          }
        }
      } else {
        this.setData({ orders: [], loading: false });
      }
    } catch (err) {
      console.error("获取订单失败:", err);
      this.setData({ orders: [], loading: false });
    }
  },

  async updateTabCounts() {
    try {
      const res = await wx.cloud.callFunction({
        name: "getOrders",
        data: { status: "all", role: this.data.role },
      });

      if (res.result && res.result.success) {
        const allOrders = res.result.data || [];
        const tabs = STATUS_TABS_DEFAULT.map((tab) => {
          let count = 0;
          if (tab.value === "all") {
            count = allOrders.length;
          } else if (tab.value === "pending") {
            count = allOrders.filter((o) => o.status === "pending").length;
          } else if (tab.value === "processing") {
            count = allOrders.filter(
              (o) => o.status === "accepted" || o.status === "preparing",
            ).length;
          } else if (tab.value === "completed") {
            count = allOrders.filter((o) => o.status === "completed").length;
          }
          return { ...tab, count };
        });
        this.setData({ statusTabs: tabs });
      }
    } catch (err) {
      console.error("更新计数失败:", err);
    }
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ activeStatus: status });
    this.fetchOrders();
  },

  onHandleOrder(e) {
    const { id, action } = e.currentTarget.dataset;

    const actionText = {
      accepted: "接单",
      preparing: "开始制作",
      completed: "标记完成",
      rejected: "拒绝",
    }[action];

    wx.showModal({
      title: "确认操作",
      content: `确定要${actionText}吗？`,
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: "处理中..." });

        try {
          const result = await wx.cloud.callFunction({
            name: "updateOrderStatus",
            data: {
              orderId: id,
              newStatus: action,
            },
          });

          wx.hideLoading();

          if (result.result && result.result.success) {
            wx.showToast({ title: `${actionText}成功`, icon: "success" });
            this.fetchOrders();
          } else {
            wx.showToast({
              title: result.result.error || "操作失败",
              icon: "none",
            });
          }
        } catch (err) {
          wx.hideLoading();
          console.error("处理订单失败:", err);
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      },
    });
  },

  formatTime(dateVal) {
    if (!dateVal) return "";
    let d;
    if (typeof dateVal === "string") {
      d = new Date(dateVal);
    } else if (typeof dateVal === "object") {
      // 云数据库返回的日期可能是 { $date: "..." } 格式
      const iso = dateVal.$date || dateVal.iso || dateVal;
      d = new Date(iso);
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return "";
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${month}月${day}日 ${hour}:${minute}`;
  },
});
