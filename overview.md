# 妮妮的一日三餐 — 虚拟币 + 双角色 + 订单系统

## 本次更新概览

### 1. 修复：甜品分类 tab 缺失
**问题**：用户在添加菜品时选了"甜点"分类，但点餐页 tab 栏不显示甜点。

**原因**：`getFoodCategorys` 云函数只从 `categories` 集合取预置分类，而用户自定义菜品的分类不在其中。

**修复**：改为同时从 `categories` 集合 + `foods` 集合的 distinct category 合并返回，动态去重，确保任何分类都能出现在 tab 栏。

---

### 2. 双角色系统
登录时选择角色：👸 女朋友（点菜下单）/ 🤴 男朋友（接单制作）。

| 文件 | 说明 |
|------|------|
| `pages/login/login.wxml` | 新增角色选择卡片 |
| `pages/login/login.js` | 登录时调用 registerUser 云函数 |
| `pages/login/login.scss` | 角色卡片样式 |
| `cloudfunctions/registerUser/index.js` | 在 users 集合创建/更新用户，新用户初始 1000 妮妮币 |
| `cloudfunctions/login/index.js` | 登录时查询 users 集合返回完整用户信息 |
| `app.js` | globalData 新增 role，onLaunch 恢复登录状态 |

---

### 3. 虚拟币（妮妮币）系统
个人账号无法调用微信支付，使用虚拟币替代。

- 新用户注册即获 **1000 妮妮币**
- 下单时自动扣款，拒绝时自动退款
- 男朋友可在「我的」页面给女朋友充值

| 文件 | 说明 |
|------|------|
| `pages/profile/index.*` | 个人中心页：用户信息、余额卡、充值弹窗、订单统计 |
| `cloudfunctions/rechargeBalance/index.js` | 男朋友充值（支持给自己/给女朋友） |

---

### 4. 订单系统
完整的下单 → 接单 → 制作 → 完成流程。

**订单状态流转**：
```
pending（待处理）→ accepted（已接单）→ preparing（制作中）→ completed（已完成）
pending（待处理）→ rejected（已拒绝，自动退款）
```

| 文件 | 说明 |
|------|------|
| `pages/orders/index.*` | 订单页：状态筛选、订单卡片、操作按钮 |
| `cloudfunctions/createOrder/index.js` | 创建订单，检查余额并扣款 |
| `cloudfunctions/getOrders/index.js` | 按角色返回订单列表 |
| `cloudfunctions/updateOrderStatus/index.js` | 更新订单状态，拒绝时退款 |

**女朋友视角**：看到自己的订单状态，等待男朋友接单制作
**男朋友视角**：看到所有订单，可接单/开始制作/完成/拒绝

---

### 5. 点餐页结算改造
`pages/food/index.js` 的 `handleCheckout` 从空壳变为完整流程：
1. 检查登录状态和余额
2. 弹出确认框（显示菜品数 + 总额）
3. 调用 `createOrder` 云函数扣款下单
4. 更新本地余额
5. 清空购物车
6. 跳转到订单页

购物车弹窗底部新增余额显示。

---

### 6. TabBar 扩展
从 2 个 tab 扩展到 4 个：首页 | 点餐 | 订单 | 我的

新增 4 个图标文件（PIL 生成 81x81 PNG）。

---

## 新增/修改文件清单

### 新增文件（18 个）
| 路径 | 类型 |
|------|------|
| `custom-tab-bar/index.js` | 自定义 TabBar 逻辑 |
| `custom-tab-bar/index.wxml` | 自定义 TabBar 模板 |
| `custom-tab-bar/index.wxss` | 自定义 TabBar 样式 |
| `custom-tab-bar/index.json` | 自定义 TabBar 配置 |
| `pages/profile/index.js` | 个人中心逻辑 |
| `pages/profile/index.wxml` | 个人中心模板 |
| `pages/profile/index.scss` | 个人中心样式 |
| `pages/profile/index.json` | 个人中心配置 |
| `pages/orders/index.js` | 订单页逻辑 |
| `pages/orders/index.wxml` | 订单页模板 |
| `pages/orders/index.scss` | 订单页样式 |
| `pages/orders/index.json` | 订单页配置 |
| `cloudfunctions/registerUser/index.js` | 注册云函数 |
| `cloudfunctions/registerUser/package.json` | 依赖配置 |
| `cloudfunctions/createOrder/index.js` | 下单云函数 |
| `cloudfunctions/createOrder/package.json` | 依赖配置 |
| `cloudfunctions/getOrders/index.js` | 查询订单云函数 |
| `cloudfunctions/getOrders/package.json` | 依赖配置 |
| `cloudfunctions/updateOrderStatus/index.js` | 订单状态更新云函数 |
| `cloudfunctions/updateOrderStatus/package.json` | 依赖配置 |
| `cloudfunctions/rechargeBalance/index.js` | 充值云函数 |
| `cloudfunctions/rechargeBalance/package.json` | 依赖配置 |
| `images/tabbar/orders.png` | 订单图标 |
| `images/tabbar/orders-active.png` | 订单激活图标 |
| `images/tabbar/profile.png` | 我的图标 |
| `images/tabbar/profile-active.png` | 我的激活图标 |

### 修改文件（12 个）
| 路径 | 改动 |
|------|------|
| `app.json` | 新增 custom tabBar + 4 个 tab |
| `app.js` | globalData 新增 role，onLaunch 恢复状态 |
| `pages/login/login.js` | 新增角色选择 + registerUser 调用 |
| `pages/login/login.wxml` | 新增角色选择 UI |
| `pages/login/login.scss` | 新增角色卡片样式 |
| `pages/food/index.js` | handleCheckout 完整实现 + userBalance + loadUserBalance + 男朋友跳转保护 |
| `pages/food/index.wxml` | 购物车底部显示余额 |
| `pages/food/index.scss` | footer-balance 样式 |
| `pages/orders/index.wxml` | tab 角标区分显示 |
| `pages/orders/index.scss` | tab 角标样式 |
| `pages/index/index.js` | onShow 同步 TabBar 状态 |
| `pages/profile/index.js` | onShow 同步 TabBar 状态 |
| `cloudfunctions/login/index.js` | 查询 users 集合返回用户信息 |
| `cloudfunctions/getFoodCategorys/index.js` | 动态合并 foods 分类 |

### 7. 订单页 tab 角标优化
- 「全部」「已完成」改为括号内总数与文本齐平（如：全部(3)）
- 「待处理」「制作中」仍保留右上角红色数量角标
- **涉及文件**: `pages/orders/index.wxml`, `pages/orders/index.scss`

### 8. 角色区分自定义 TabBar
- 女朋友端：首页 / 点餐 / 订单 / 我的（4 个 tab）
- 男朋友端：首页 / 订单 / 我的（隐藏点餐 tab）
- 实现方式：微信小程序 `custom-tab-bar` 自定义底部导航，根据 role 动态渲染
- **涉及文件**: `app.json`, `custom-tab-bar/index.*`, `pages/index/index.js`, `pages/food/index.js`, `pages/orders/index.js`, `pages/profile/index.js`

---

## 部署步骤

1. **上传部署云函数**（6 个新增 + 2 个修改）：
   - `registerUser`、`createOrder`、`getOrders`、`updateOrderStatus`、`rechargeBalance`（新增）
   - `login`、`getFoodCategorys`（修改，需重新部署）

2. **云开发控制台创建集合**：
   - `users` — 权限设为「仅创建者可读写」
   - `orders` — 权限设为「所有用户可读，仅创建者可写」

3. **编译预览**，测试完整流程：
   - 登录选角色 → 点餐 → 加购物车 → 结算下单 → 订单页查看 → 男朋友接单/制作/完成
