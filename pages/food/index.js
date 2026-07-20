// pages/food/index.js
const { TEMPLATES } = require("../../utils/subscribeConfig");
const { addIconPaths } = require("../../utils/emojiIcons");

Page({
  data: {
    foods: [],
    categories: [],
    activeCategory: "全部",
    loading: true,
    cart: [],
    cartTotal: 0,
    cartCount: 0,
    showCartPopup: false,
    userBalance: 0,
    nickname: "",
  },

  onLoad() {
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo && userInfo.role === "boyfriend") {
      wx.showToast({ title: "男朋友不能点餐哦~", icon: "none" });
      setTimeout(() => {
        wx.switchTab({ url: "/pages/orders/index" });
      }, 1500);
      return;
    }

    // 存储昵称用于动态标签显示
    if (userInfo && userInfo.nickname) {
      this.setData({ nickname: userInfo.nickname });
    }

    this.fetchCategories();
    this.loadCart();
  },

  onShow() {
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo && userInfo.role === "boyfriend") {
      wx.switchTab({ url: "/pages/orders/index" });
      return;
    }

    this.loadCart();
    this.loadUserBalance();

    // 刷新昵称（用户可能在个人页修改了昵称）
    if (
      userInfo &&
      userInfo.nickname &&
      userInfo.nickname !== this.data.nickname
    ) {
      this.setData({ nickname: userInfo.nickname });
    }

    this.fetchCategories();
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().refreshTabs();
      this.getTabBar().setSelected("/pages/food/index");
    }
  },

  async fetchCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: "getFoodCategorys",
      });
      console.log("获取分类成功:", res);
      if (res && res.result && res.result.success) {
        let categories = res.result.data || [];
        if (!categories.find((c) => c.name === "全部")) {
          categories.unshift({ name: "全部" });
        }
        this.setData({ categories });
        this.fetchFoods(this.data.activeCategory || "全部");
      } else {
        console.error("获取分类失败:", res && res.result && res.result.error);
        this.setData({
          categories: [
            { name: "全部" },
            { name: "主食" },
            { name: "小吃" },
            { name: "饮品" },
            { name: "甜点" },
            { name: "汤品" },
          ],
        });
        this.fetchFoods(this.data.activeCategory || "全部");
      }
    } catch (err) {
      console.error("获取分类异常:", err);
      this.setData({
        categories: [
          { name: "全部" },
          { name: "主食" },
          { name: "小吃" },
          { name: "饮品" },
          { name: "甜点" },
          { name: "汤品" },
        ],
      });
      this.fetchFoods(this.data.activeCategory || "全部");
    }
  },

  loadUserBalance() {
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      this.setData({ userBalance: userInfo.balance || 0 });
    }
  },

  async fetchFoods(category = "全部") {
    this.setData({
      loading: true,
    });

    try {
      console.log("Calling getFoods with category:", category);
      const res = await wx.cloud.callFunction({
        name: "getFoods",
        data: {
          category,
          role: "girlfriend",
        },
      });
      console.log("getFoods response:", res);

      if (res && res.result) {
        if (res.result.success) {
          this.setData({
            foods: addIconPaths(res.result.data || []),
            loading: false,
          });
          console.log("获取菜品成功，数量:", res.result.count);
        } else {
          console.error("获取菜品失败:", res.result.error, res.result.errCode);
          this.setData({
            foods: addIconPaths([]),
            loading: false,
          });
        }
      } else {
        console.error("云函数返回格式异常:", res);
        this.setData({
          foods: [],
          loading: false,
        });
      }
    } catch (err) {
      console.error("获取菜品异常:", err);
      this.setData({
        foods: addIconPaths([]),
        loading: false,
      });
    }
  },

  handleCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      activeCategory: category,
    });
    this.fetchFoods(category);
    // 切换分类后滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0,
    });
  },

  handleAddFood() {
    wx.navigateTo({
      url: "/pages/add-food/index",
    });
  },

  handleAddToCart(e) {
    const index = e.currentTarget.dataset.index;
    const food = this.data.foods[index];
    if (!food || !food._id) {
      wx.showToast({ title: "添加失败，请重试", icon: "none" });
      return;
    }

    const { cart } = this.data;

    const existingItem = cart.find((item) => item._id === food._id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push(Object.assign({}, food, { quantity: 1 }));
    }

    this.saveCart(cart);
    this.loadCart();

    wx.showToast({
      title: "已加入购物车",
      icon: "success",
    });
  },

  saveCart(cart) {
    wx.setStorageSync("cart", cart);
  },

  loadCart() {
    const cart = wx.getStorageSync("cart") || [];
    const cartWithIcons = addIconPaths(cart);
    const cartCount = cartWithIcons.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cartWithIcons.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    this.setData({
      cart: cartWithIcons,
      cartCount,
      cartTotal,
    });
  },

  async handleCheckout() {
    const { cart, cartTotal } = this.data;
    if (cart.length === 0) return;

    const userInfo = wx.getStorageSync("userInfo");
    const openid = userInfo && (userInfo.openid || userInfo.openId);
    if (!openid) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    const balance = userInfo.balance || 0;
    if (balance < cartTotal) {
      wx.showModal({
        title: "余额不足",
        content: `当前余额 ${balance} 妮妮币，需要 ${cartTotal} 妮妮币。去找男朋友充值吧~`,
        showCancel: false,
        confirmText: "知道了",
      });
      return;
    }

    // 检查收货地址
    const addressList = userInfo.addressList || []
    const deliveryAddress = userInfo.deliveryAddress || null
    if (addressList.length === 0 && !deliveryAddress) {
      wx.showModal({
        title: "还未设置收货地址",
        content: "设置收货地址后男朋友才知道送到哪哦~",
        confirmText: "去设置",
        cancelText: "先不下单",
        success: (r) => {
          if (r.confirm) {
            wx.navigateTo({ url: "/pages/address/address-list" })
          }
        }
      })
      return
    }

    // 如果有多个地址，弹出选择
    if (addressList.length > 1) {
      const names = addressList.map((a, i) => {
        const defaultTag = a.isDefault ? ' (默认)' : ''
        return `${i + 1}. ${a.locationName}${a.room ? ' ' + a.room : ''}${defaultTag}`
      })
      wx.showActionSheet({
        itemList: names,
        success: (res) => {
          this.setData({ selectedAddress: addressList[res.tapIndex] })
          this.doCheckout(addressList[res.tapIndex])
        }
      })
      return
    }

    // 只有一个地址，直接用
    this.setData({ selectedAddress: deliveryAddress || addressList[0] })
    this.doCheckout(deliveryAddress || addressList[0])
  },

  async doCheckout(deliveryAddress) {
    const { cart, cartTotal } = this.data;
    const userInfo = wx.getStorageSync("userInfo");

    // 1. 先请求订阅授权（必须在用户点击后同步调用）
    try {
      await wx.requestSubscribeMessage({
        tmplIds: [TEMPLATES.ORDER_STATUS_CHANGE],
      });
      console.log("订阅订单状态消息完成");
    } catch (subErr) {
      console.log("用户拒绝或订阅失败，继续下单流程:", subErr);
    }

    // 2. 弹出确认下单框
    wx.showModal({
      title: "确认下单",
      content: `共 ${cart.length} 种菜品，合计 ${cartTotal} 妮妮币\n下单后等待男朋友接单制作`,
      confirmText: "下单",
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: "下单中..." });

        try {
          const result = await wx.cloud.callFunction({
            name: "createOrder",
            data: {
              items: cart,
              totalAmount: cartTotal,
              remark: "",
              address: deliveryAddress,
            },
          });

          wx.hideLoading();

          if (result.result && result.result.success) {
            // 更新本地余额
            const newBalance = result.result.newBalance;
            const updatedUserInfo = { ...userInfo, balance: newBalance };
            wx.setStorageSync("userInfo", updatedUserInfo);

            // 清空购物车
            this.saveCart([]);
            this.loadCart();
            this.setData({ showCartPopup: false });

            const notifySuccess = result.result.notifySuccess || 0;
            const notifyCount = result.result.notifyCount || 0;
            let notifyTip = "";
            if (notifySuccess > 0) {
              notifyTip = "男朋友已收到新订单提醒~";
            } else if (notifyCount > 0) {
              notifyTip = "男朋友未开启新订单提醒，将不会收到通知";
            } else {
              notifyTip = "等待男朋友接单~";
            }

            wx.showModal({
              title: "下单成功！",
              content: `订单号：${result.result.orderNo}\n余额：${newBalance} 妮妮币\n${notifyTip}`,
              showCancel: false,
              confirmText: "查看订单",
              success: () => {
                wx.switchTab({ url: "/pages/orders/index" });
              },
            });
          } else {
            wx.showToast({
              title: result.result.error || "下单失败",
              icon: "none",
              duration: 2500,
            });
          }
        } catch (err) {
          wx.hideLoading();
          console.error("下单失败:", err);
          wx.showToast({ title: "网络异常，请重试", icon: "none" });
        }
      },
    });
  },

  toggleCartPopup() {
    if (this.data.cartCount === 0) return;
    this.setData({
      showCartPopup: !this.data.showCartPopup,
    });
  },

  handleMaskTap() {
    this.setData({
      showCartPopup: false,
    });
  },

  handleIncreaseQty(e) {
    const foodId = e.currentTarget.dataset.id;
    const { cart } = this.data;

    const item = cart.find((item) => item._id === foodId);
    if (item) {
      item.quantity += 1;
      this.saveCart(cart);
      this.loadCart();
    }
  },

  handleDecreaseQty(e) {
    const foodId = e.currentTarget.dataset.id;
    let { cart } = this.data;

    const item = cart.find((item) => item._id === foodId);
    if (item) {
      item.quantity -= 1;
      if (item.quantity <= 0) {
        cart = cart.filter((item) => item._id !== foodId);
      }
      this.saveCart(cart);
      this.loadCart();

      if (cart.length === 0) {
        this.setData({
          showCartPopup: false,
        });
      }
    }
  },

  handleRemoveItem(e) {
    const foodId = e.currentTarget.dataset.id;
    let { cart } = this.data;

    cart = cart.filter((item) => item._id !== foodId);
    this.saveCart(cart);
    this.loadCart();

    if (cart.length === 0) {
      this.setData({
        showCartPopup: false,
      });
    }

    wx.showToast({
      title: "已删除",
      icon: "success",
    });
  },

  handleClearCart() {
    wx.showModal({
      title: "确认清空",
      content: "确定要清空购物车吗？",
      success: (res) => {
        if (res.confirm) {
          const cart = [];
          this.saveCart(cart);
          this.loadCart();
          this.setData({
            showCartPopup: false,
          });
          wx.showToast({
            title: "已清空",
            icon: "success",
          });
        }
      },
    });
  },
});
