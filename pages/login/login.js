// login.js
const app = getApp();

Page({
  data: {
    avatarUrl: "",
    nickname: "",
    selectedRole: "",
    isLogin: false,
    logging: false,
    hasExistingRole: false,
    loadingUserInfo: true, // 是否正在加载用户信息
    uploadingAvatar: false, // 是否正在上传头像
  },

  onLoad() {
    const userInfo = wx.getStorageSync("userInfo");
    const openid = userInfo && (userInfo.openid || userInfo.openId);
    if (openid) {
      this.setData({
        isLogin: true,
        avatarUrl: userInfo.avatarUrl || "",
        nickname: userInfo.nickname || "",
        selectedRole: userInfo.role || "",
        hasExistingRole: !!userInfo.role, // 标记是否已有角色
        loadingUserInfo: false,
      });
      setTimeout(() => {
        wx.switchTab({
          url: "/pages/index/index",
        });
      }, 1500);
    } else {
      // 设置超时，3秒后自动关闭加载状态
      this.loadTimeout = setTimeout(() => {
        if (this.data.loadingUserInfo) {
          console.warn("加载用户信息超时，直接显示登录页面");
          this.setData({
            loadingUserInfo: false,
            hasExistingRole: false,
          });
        }
      }, 3000);

      this.fetchUserInfo();
    }
  },

  /**
   * 获取用户信息
   */
  async fetchUserInfo() {
    try {
      const cloudRes = await wx.cloud.callFunction({ name: "login" });
      const openid = cloudRes.result.openid;
      const user = cloudRes.result.user;

      app.globalData.openid = openid;
      wx.setStorageSync("openid", openid);

      if (user && user.role) {
        // 用户已注册，有角色
        this.setData({
          hasExistingRole: true,
          selectedRole: user.role,
          avatarUrl: user.avatarUrl || "",
          nickname: user.nickname || "",
          loadingUserInfo: false,
        });
      } else {
        // 用户未注册，或者注册了但没有角色
        this.setData({
          hasExistingRole: false,
          loadingUserInfo: false,
        });
      }
    } catch (err) {
      console.error("获取用户信息失败", err);
      // 获取失败时，也关闭加载状态，允许用户继续登录
      this.setData({
        hasExistingRole: false,
        loadingUserInfo: false,
      });
    } finally {
      // 无论成功失败，都清除超时定时器
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) {
      wx.showToast({ title: '未选择头像', icon: 'none' });
      return;
    }
    // 临时路径（如 wxfile://tmp_xxx）不可跨会话使用，需要上传到云存储
    this.uploadAvatar(avatarUrl);
  },

  /**
   * 将临时文件上传到云存储，拿到永久 fileID
   */
  async uploadAvatar(tempFilePath) {
    this.setData({ uploadingAvatar: true });
    wx.showLoading({ title: '上传头像中...' });
    try {
      const openid =
        app.globalData.openid || wx.getStorageSync('openid') || 'anonymous';
      const ext =
        tempFilePath.substring(tempFilePath.lastIndexOf('.')) || '.jpg';
      const cloudPath = `avatars/${openid}-${Date.now()}${ext}`;

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      });

      if (!uploadRes || !uploadRes.fileID) {
        throw new Error('上传失败，未返回 fileID');
      }

      const fileID = uploadRes.fileID;
      this.setData({ avatarUrl: fileID });

      // 如果是已有角色的用户（更新头像场景），立即同步到数据库
      if (this.data.hasExistingRole) {
        const updateRes = await wx.cloud.callFunction({
          name: 'registerUser',
          data: {
            nickname: this.data.nickname,
            avatarUrl: fileID,
            role: this.data.selectedRole,
          },
        });

        if (updateRes.result && updateRes.result.success) {
          // 同步本地 userInfo
          const stored = wx.getStorageSync('userInfo') || {};
          stored.avatarUrl = fileID;
          wx.setStorageSync('userInfo', stored);
          app.globalData.userInfo = stored;
          wx.showToast({ title: '头像已更新', icon: 'success' });
        } else {
          throw new Error((updateRes.result && updateRes.result.error) || '保存失败');
        }
      }
    } catch (err) {
      console.error('上传头像失败:', err);
      wx.showModal({
        title: '上传失败',
        content: `头像上传失败：${err.message || err.errMsg || '未知错误'}\n请重试`,
        showCancel: false,
      });
      // 失败时回退到原始临时路径，让用户至少能看到预览
      this.setData({ avatarUrl: tempFilePath });
    } finally {
      wx.hideLoading();
      this.setData({ uploadingAvatar: false });
    }
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value,
    });
  },

  onRoleSelect(e) {
    // 如果已经有角色了，就不允许选择
    if (this.data.hasExistingRole) {
      wx.showToast({
        title: "角色已固定，无法修改",
        icon: "none",
      });
      return;
    }

    const role = e.currentTarget.dataset.role;
    this.setData({
      selectedRole: role,
    });
  },

  async handleLogin() {
    const { avatarUrl, nickname, selectedRole, hasExistingRole } = this.data;

    if (!avatarUrl) {
      wx.showToast({ title: "请选择头像", icon: "none" });
      return;
    }
    if (!nickname) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (!selectedRole) {
      wx.showToast({ title: "请选择角色", icon: "none" });
      return;
    }

    this.setData({ logging: true });
    wx.showLoading({ title: "登录中..." });

    try {
      // 1. 获取 openid 和用户信息
      let openid = app.globalData.openid;
      if (!openid) {
        const cloudRes = await wx.cloud.callFunction({ name: "login" });
        openid = cloudRes.result.openid;
        app.globalData.openid = openid;
        wx.setStorageSync("openid", openid);
      }

      // 2. 如果用户已有角色，强制使用该角色，不允许修改
      let loginRole = selectedRole;
      if (hasExistingRole) {
        // 重新从 login 云函数获取最新用户信息，确保角色正确
        const cloudRes = await wx.cloud.callFunction({ name: "login" });
        if (cloudRes.result.user && cloudRes.result.user.role) {
          loginRole = cloudRes.result.user.role;
        }
      }

      // 3. 注册/更新用户信息（含角色）
      const registerRes = await wx.cloud.callFunction({
        name: "registerUser",
        data: {
          nickname,
          avatarUrl,
          role: loginRole,
        },
      });

      if (!registerRes.result.success) {
        wx.hideLoading();
        wx.showToast({
          title: registerRes.result.error || "登录失败",
          icon: "none",
          duration: 3000,
        });
        return;
      }

      const userData = registerRes.result.data || {};

      // 4. 存储到本地（统一使用 openid 小写）
      const userInfo = {
        openid: openid,
        avatarUrl: userData.avatarUrl || avatarUrl,
        nickname: userData.nickname || nickname,
        role: userData.role || loginRole,
        balance: userData.balance || 1000,
        inviteCode: userData.inviteCode || "",
        isBound: userData.isBound !== undefined ? userData.isBound : false,
        partnerOpenid: userData.partnerOpenid || "",
      };

      app.globalData.userInfo = userInfo;
      app.globalData.role = userInfo.role;
      wx.setStorageSync("userInfo", userInfo);

      wx.hideLoading();
      wx.showToast({ title: "登录成功", icon: "success" });

      // 如果是男友角色，启动订单轮询
      if (userInfo.role === "boyfriend") {
        app.startOrderPolling();
      }

      setTimeout(() => {
        wx.switchTab({ url: "/pages/index/index" });
      }, 1000);
    } catch (err) {
      wx.hideLoading();
      console.error("登录失败", err);
      wx.showToast({ title: "登录失败", icon: "none" });
    } finally {
      this.setData({ logging: false });
    }
  },

  onUnload() {
    // 页面卸载时清除超时定时器
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  },
});
