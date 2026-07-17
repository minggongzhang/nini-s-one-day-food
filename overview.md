# 订阅消息推送功能 — 配置指南

## 功能概述

实现了两条通知链路：

| 场景 | 推送对象 | 模板 | 触发时机 |
|------|---------|------|---------|
| 女朋友下单 | 男朋友 | 新订单提醒 | createOrder 云函数执行后 |
| 男朋友处理订单 | 女朋友 | 订单状态变更通知 | updateOrderStatus 云函数执行后 |

## 配置步骤

### 第一步：在微信公众平台创建订阅消息模板

1. 登录 [微信公众平台](https://mp.weixin.qq.com)（小程序后台）
2. 左侧菜单 → **功能** → **订阅消息**
3. 进入 **公共模板库**，搜索并添加以下两个模板：

#### 模板一：订单状态变更通知（给女朋友）

搜索关键词：`订单状态` 或 `订单变更`

选择了包含以下字段的模板：

| 序号 | 字段 | 字段编号 | 类型 | 说明 |
|------|------|---------|------|------|
| 1 | 订单编号 | character_string1 | character_string | 如 OD202607140001 |
| 2 | 商品名称 | thing6 | thing | 如 番茄炒蛋x1、米饭x2 |
| 3 | 订单状态 | phrase3 | phrase | 如 已接单/制作中/已完成/已拒绝 |
| 4 | 订单金额 | amount4 | amount | 如 ¥15.00 |
| 5 | 备注 | thing5 | thing | 如 无特殊要求 |

#### 模板二：新订单提醒（给男朋友）

搜索关键词：`新订单` 或 `订单提醒`

选择包含以下字段的模板：

| 序号 | 字段 | 字段编号 | 类型 | 说明 |
|------|------|---------|------|------|
| 1 | 下单人 | thing14 | thing | 如 妮妮 |
| 2 | 产品名称 | thing13 | thing | 如 番茄炒蛋x1 |
| 3 | 金额 | amount4 | amount | 如 ¥15.00 |
| 4 | 订单号 | character_string22 | character_string | 如 OD202607140001 |
| 5 | 订单时间 | time7 | time | 如 2026年07月14日 10:30:00 |

### 第二步：确认模板 ID 和字段配置

在 `utils/subscribeConfig.js` 中，已填入模板 ID 并配置了对应字段列表：

```javascript
const TEMPLATES = {
  ORDER_STATUS_CHANGE: 'hqpxdpUgInAFPxm_5xLWWv45hFD4BlNgYPWydNKBZXQ',
  NEW_ORDER: 'INI6VJLkchUjTvhWh51X6iIaT3eHvc8VvI4ad5mm4CU'
}

const TEMPLATE_FIELDS = {
  [TEMPLATES.ORDER_STATUS_CHANGE]: ['character_string1', 'thing6', 'phrase3', 'amount4', 'thing5'],
  [TEMPLATES.NEW_ORDER]: ['thing14', 'thing13', 'amount4', 'character_string22', 'time7']
}
```

> 如果以后你换了模板（字段不同），需要同时修改两个地方：
> 1. `utils/subscribeConfig.js`（给前端页面使用）
> 2. `cloudfunctions/createOrder/index.js` 和 `cloudfunctions/updateOrderStatus/index.js` 顶部的内联配置（给云函数使用）
>
> 云函数不能依赖项目根目录的 `utils` 文件，所以模板配置需要在云函数里单独维护一份。

### 第三步：部署云函数

在微信开发者工具中，右键以下云函数 → **上传并部署：云端安装依赖**：

- `cloudfunctions/createOrder`
- `cloudfunctions/updateOrderStatus`
- `cloudfunctions/sendSubscribeMessage`（测试用，可选）

**注意**：云函数里的模板配置是内联的，不再依赖项目根目录的 `utils/subscribeConfig.js`、`utils/templateHelper.js`。如果以后修改模板字段，需要同步更新对应云函数文件顶部的配置。

### 第五步：测试

1. **女朋友端**：在点餐页点击"去结算" → 弹出订阅授权弹窗，点击"允许" → 确认下单
2. **男朋友端**：在订单页点击"🔔 开启新订单提醒"，允许订阅
3. 女朋友下单 → 男朋友收到新订单通知
4. 男朋友接单/制作/完成/拒绝 → 女朋友收到状态变更通知
5. 男朋友也可以点击"📨 发送测试通知给我自己"快速验证模板字段是否匹配

## 重要说明

### 微信订阅消息机制

- **一次订阅 = 一次发送**：用户每次点击"允许"只授权发送 1 条消息
- 女朋友每次下单时都会弹出订阅请求，确保下次状态变更能收到通知
- 男朋友需要主动点击"开启新订单提醒"来订阅，每次点击可接收 1 条新订单通知
- 如果用户点击"总是保持以上选择"，后续不再弹窗，自动按上次选择执行

### 字段类型限制

| 类型 | 限制 | 说明 |
|------|------|------|
| `thing` | 最多 20 个字符 | 菜品名称、备注等 |
| `phrase` | 最多 5 个汉字 | 状态文案：已接单、制作中、已完成、已拒绝 |
| `character_string` | 最多 32 个字符 | 订单号 |
| `amount` | 格式如 ¥100.00 | 订单金额 |
| `time` | 格式如 2026年07月14日 10:30:00 | 下单时间 |

### 自动补全模板字段

新增 `utils/templateHelper.js` + `utils/subscribeConfig.js` 中的 `TEMPLATE_FIELDS`：

- 代码里只填需要展示的业务字段
- 如果模板里还有其他字段没有传，会自动用默认值补全
- 避免微信返回 `"data.thingXX.value is empty"` 错误
- **以后换模板时，只需修改 `TEMPLATE_FIELDS` 中的字段列表**

### 常见错误码

| errCode | 含义 | 解决方案 |
|---------|------|---------|
| 43101 | 用户未订阅 | 正常情况，用户需先在前端授权 |
| 40037 | 模板 ID 不正确 | 检查模板 ID 是否填对 |
| 47003 | 模板参数不准确 | 检查字段类型和长度限制 |
| 20001 | 模板 ID 为空 | 检查配置文件中的模板 ID |

## 测试与排查

### 正确测试流程（双设备/双微信）

订阅消息必须**双方都在真机上完成授权**才能收到。推荐用两个微信号在两台手机上测试，步骤如下：

1. **女朋友微信号**登录小程序 → 点餐 → 点击"去结算" → 在订阅授权弹窗中点**允许** → 确认下单
2. **男朋友微信号**登录小程序 → 进入订单页 → 点击"🔔 开启新订单提醒" → 点**允许**
3. 女朋友再次下单 → 男朋友微信的"服务通知"收到新订单提醒
4. 男朋友接单/制作/完成 → 女朋友微信的"服务通知"收到状态变更通知

### 单设备测试的限制

同一台手机切换两个微信号**无法完整测试**"女朋友下单 → 男朋友收到通知"这条链路，因为：

- 男朋友号必须先订阅授权，女朋友号再下单
- 但单台手机上，你登录男朋友号时没法让女朋友号下单，反之亦然
- 所以单设备只能测试"男朋友处理订单 → 女朋友收到状态变更通知"

### 新增测试按钮

在男朋友订单页新增了"📨 发送测试通知给我自己"按钮：

- 点击后会请求订阅授权，然后直接调用 `sendSubscribeMessage` 云函数给自己发一条测试消息
- 如果测试消息能收到，说明模板 ID、字段、openid 都是正确的
- 如果测试消息收不到，请查看 `messages` 集合和云函数日志

### 排查清单

如果收不到通知，请按顺序检查：

1. **是否授权成功**
   - 女朋友下单时是否弹出了订阅授权窗？是否点了"允许"？
   - 男朋友是否点击了"开启新订单提醒"并点了"允许"？
   - 如果点了"取消"或"总是保持以上选择（拒绝）"，不会收到通知

2. **模板 ID 是否正确**
   - 检查 `utils/subscribeConfig.js` 中的两个模板 ID
   - 检查 `cloudfunctions/createOrder/index.js` 第 11 行
   - 检查 `cloudfunctions/updateOrderStatus/index.js` 第 29 行
   - 确保模板 ID 是在小程序后台添加的，不是复制错了

3. **模板字段是否匹配**
   - 微信公众平台 → 订阅消息 → 模板详情 → 查看每个字段的实际编号
   - 已按你的模板配置：
     - 新订单通知：`thing14`、`thing13`、`amount4`、`character_string22`、`time7`
     - 订单状态更新：`character_string1`、`thing6`、`phrase3`、`amount4`、`thing5`
   - 如果以后换模板，到 `utils/subscribeConfig.js` 的 `TEMPLATE_FIELDS` 中修改字段列表即可

4. **云函数是否已重新部署**
   - 修改模板 ID 或字段后，必须重新部署云函数
   - 部署方式：右键云函数 → 上传并部署：云端安装依赖

5. **查看云函数日志**
   - 微信开发者工具 → 云开发 → 云函数 → 找到 `createOrder` 或 `updateOrderStatus` → 日志
   - 重点看有没有以下输出：
     - `新订单通知已发送给 xxx` → 发送成功
     - `未订阅新订单消息，跳过` → 错误码 43101，用户没授权
     - `发送给 xxx 失败: 47003` → 字段不匹配
     - `发送给 xxx 失败: 40037` → 模板 ID 错误

6. **查看消息记录集合**
   - 下单/状态变更后，会往 `messages` 集合写入一条记录
   - 字段 `success` 为 true/false，`result` 中记录成功结果或错误信息
   - 如果数据库中没有 `messages` 集合，云函数会自动创建

### 常见错误码速查

| errCode | 含义 | 解决方案 |
|---------|------|---------|
| 43101 | 用户未订阅 | 让对应角色先在前端授权 |
| 40037 | 模板 ID 不正确 | 检查模板 ID 是否填写正确 |
| 47003 | 模板参数不准确 | 字段编号或字段值格式不匹配 |
| 20001 | 模板 ID 为空 | 检查 `subscribeConfig.js` 是否填写 |
| **-604101** | **权限不足 或 开发者工具云调用 Bug** | **参考下方"重要：-604101 排查"小节** |

## ⚠️ 重要：-604101 错误排查

错误 `system error: error code: -604101` 在本项目中只会有**两个原因**：

### 原因一（最常见）：微信开发者工具的云调用 Bug

**这是已知 Bug**：微信开发者工具（DevTools）调用 `cloud.openapi.subscribeMessage.send` 经常误报 -604101，但**真机调试完全正常**。

参考官方社区讨论：
> 居然，订阅消息发送正常！我心里真的是 1 万个 \*\*\*！！！
> CloudSDKError: errCode: -604101 function has no permission to call this API
> 这个报错信息 哪怕多提示一句，开发工具无权限，请用真机访问云函数，云调用， 问题就很快解决了
> —— 微信开放社区

**验证方法**：
- 在 WeChat DevTools 中点击右上角「预览」扫码
- 或者使用「真机调试」功能
- 真机中此错误 100% 不会出现

**前端代码已优化**：现在遇到 -604101 会弹出友好提示，告诉你这是开发者工具的 Bug，而不是真的权限问题。

### 原因二（真机也报错）：云函数 config.json 权限未生效

如果**真机中也报 -604101**，才需要排查权限问题：

1. **确认 config.json 文件存在**：每个云函数目录下都应该有 `config.json`：
   - `cloudfunctions/createOrder/config.json`
   - `cloudfunctions/updateOrderStatus/config.json`
   - `cloudfunctions/sendSubscribeMessage/config.json`

2. **确认 config.json 内容正确**：
   ```json
   {
     "permissions": {
       "openapi": ["subscribeMessage.send"]
     }
   }
   ```
   **注意**：不要写 `openapi.subscribeMessage.send`，要写 `subscribeMessage.send`（已经验证过的正确写法）

3. **必须重新部署云函数**（关键步骤）：
   - 右键云函数文件夹 → 「上传并部署：**云端安装依赖**」（不是「上传并部署」）
   - 三个云函数（createOrder、updateOrderStatus、sendSubscribeMessage）都要重新部署

4. **等待权限缓存刷新**：
   - 权限配置有约 10 分钟的缓存时间
   - 重新部署后等 10 分钟再测试


## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `utils/subscribeConfig.js` | 新增 | 模板 ID 与字段定义集中配置 |
| `utils/templateHelper.js` | 新增 | 自动补全模板缺失字段，防止 `value is empty` 错误 |
| `cloudfunctions/sendSubscribeMessage/index.js` | 新增 | 通用发送订阅消息云函数 |
| `cloudfunctions/sendSubscribeMessage/package.json` | 新增 | 云函数依赖配置 |
| `cloudfunctions/sendSubscribeMessage/config.json` | 新增 | 声明 `subscribeMessage.send` 权限 |
| `cloudfunctions/createOrder/index.js` | 修改 | 下单后向男朋友推送新订单通知，字段按实际模板修正 |
| `cloudfunctions/createOrder/config.json` | 新增 | 声明 `subscribeMessage.send` 权限 |
| `cloudfunctions/updateOrderStatus/index.js` | 修改 | 状态变更后向女朋友推送通知，字段按实际模板修正 |
| `cloudfunctions/updateOrderStatus/config.json` | 新增 | 声明 `subscribeMessage.send` 权限 |
| `pages/food/index.js` | 修改 | 下单按钮点击后先请求订阅授权，再确认下单 |
| `pages/orders/index.js` | 修改 | 添加男朋友端订阅新订单提醒 + 测试通知按钮，字段修正 |
| `pages/orders/index.wxml` | 修改 | 添加"开启订单提醒"横幅和测试按钮 |
| `pages/orders/index.scss` | 修改 | 添加通知横幅和测试按钮样式 |

## 修复记录

### 2026-07-14：修复女友下单后男友端未收到新订单通知

**问题现象**：女友端下单成功，但男友端没有收到新订单提醒；男友端接单/处理订单后，女友端能正常收到状态变更通知。

**修复内容**：
1. **修复 `updateOrderStatus` 潜在 bug**：`notifyGirlfriend` catch 块中使用了未定义的 `safeErr` 变量，若状态变更通知失败会导致云函数异常。
2. **增强 `createOrder` 返回信息**：增加 `notifyDetails` 和 `notifyError` 字段，前端可直接看到每个男友用户的发送结果和错误原因。
3. **优化女友端下单成功提示**：根据 `notifySuccess` 显示「男朋友已收到新订单提醒」或「男朋友未开启新订单提醒，将不会收到通知」。
4. **优化男友端提醒按钮**：
   - 增加本地状态 `notifyEnabled`，开启后按钮变为绿色并显示「已开启」
   - 文案明确说明「一次开启 = 一条通知，收到后需重新开启」
   - 避免用户误以为一次开启即可永久接收

**正确测试流程（避免测试按钮消耗授权）**：
1. 男友端真机登录 → 订单页 → 点击「开启新订单提醒」→ 允许
2. 女友端下单 → 观察男友端是否收到通知
3. 如果需要再次测试，男友端需再次点击「开启新订单提醒」获取新的授权次数

> 注意：微信订阅消息是「一次授权 = 一次发送」。男友端点击「发送测试通知给我自己」也会消耗一次授权次数，测试后若立即让女友下单，可能会因授权次数已用完而收不到通知。

### 2026-07-15：优化通知排查体验

**优化内容**：
1. **女友端精准错误提示**：下单成功后根据 `notifyDetails` 中的具体 errCode 显示不同提示：
   - `43101`（未授权）→ "男朋友尚未开启新订单提醒，请让他打开小程序 → 订单页 → 点击开启"
   - `-604101`（开发者工具 Bug）→ "请用真机预览测试"
   - 其他错误码 → 显示具体错误码
2. **测试按钮警告**：测试按钮下方增加橙色警告"⚠️ 测试会消耗一次通知授权，测试后需重新点击开启新订单提醒"
3. **男友端智能引导**：男友端打开订单页时，如果有待处理订单且未开启提醒，自动弹窗"有新订单待处理，点击去开启"（每次页面生命周期只弹一次）

> 以上第 1-3 项优化已被用户要求撤回，代码恢复到 2026-07-14 修复后的状态。

### 2026-07-15：修复头像上传 + iPhone 16 图片/购物车问题

#### 头像不显示修复

**根因**：`onChooseAvatar` 只存临时路径（`wxfile://tmp_xxx`）到内存，没有上传云存储，重启后失效。

**修复**：选完头像立即 `wx.cloud.uploadFile` 上传到云存储拿永久 `cloud://` fileID；已注册用户直接同步到数据库。

#### iPhone 16 菜品图片不显示 + 购物车栏被遮挡

**根因 1（图片）**：`<image>` 加载 `cloud://` URL 失败时直接空白，无 fallback 到 emoji 图标。

**根因 2（购物车栏不出现）**：两个原因叠加：
- `data-food="{{ item }}"` 传整个复杂对象，部分 iOS 序列化后 `_id` 丢失 → `handleAddToCart` 抛异常 → 购物车数据不更新
- `custom-tab-bar/index.wxss` 中 `.tab-bar-list` 的 `padding-bottom` 和 `.safe-area-bottom` 重复计算 safe-area-inset-bottom → tabBar 实际高度 = 100rpx + 2×safe-area → 购物车栏 `bottom: 100rpx` 被 tabBar 遮挡

**修复**：
1. `pages/food/index.wxml`：image 加 `binderror` + `imgErrors` 状态控制 fallback；add-btn 改 `data-index` 替代 `data-food`
2. `pages/food/index.js`：`handleAddToCart` 改用 `this.data.foods[index]` 查找；新增 `onFoodImgError`；data 加 `imgErrors: {}`
3. `pages/food/index.scss`：cart-bar/cart-popup/fab-btn 的 `bottom` 全部改为 `calc(XXXrpx + env(safe-area-inset-bottom))`；page-container padding-bottom 同步；cart-bar 加 `z-index: 100`
4. `custom-tab-bar/index.wxss`：删除 `.tab-bar-list` 的 `padding-bottom: env(safe-area-inset-bottom)`（保留 `.safe-area-bottom`）

### 2026-07-15：菜品数据隔离 + 动态昵称标签

#### 菜品数据隔离

**需求**：不同女友用户上传的自定义菜品应数据隔离，仅创建者可见；默认菜品所有女友共享。

**实现**：`cloudfunctions/getFoods/index.js` 使用 `_.or([{ isCustom: _.neq(true) }, { createdBy: openid }])` 过滤：
- `isCustom` 不为 true 的菜品 → 所有女友可见（默认菜品）
- `isCustom` 为 true 且 `createdBy === 当前用户 openid` → 仅创建者可见（自定义菜品）

> 需重新部署 `getFoods` 云函数。

#### 动态昵称标签

**需求**：菜品卡片标签从硬编码"妮妮想吃"改为"{用户昵称}想吃"。

**改动**：
1. `pages/food/index.js`：data 加 `nickname`，从 localStorage 读取
2. `pages/food/index.wxml`：`妮妮想吃` → `{{ nickname || '我' }}想吃`
3. `pages/orders/index.js`：data 加 `partnerNickname`，fetchOrders 后从订单提取女友昵称
4. `pages/orders/index.wxml`：横幅"等待妮妮下单" → `等待{partnerNickname}下单`；fallback "妮妮" → "女朋友"
### 2026-07-15：修复菜品图标显示为方块

**问题**：默认菜品（爱心汉堡、黄金薯条等）的图片区域显示为方块，没有显示原本的 emoji 图标；用户自定义上传的菜品的真实图片可以正常显示。

**根因**：`pages/food/index.wxml` 中 `<image>` 和 `<text>` 用 `wx:if`/`wx:else` 互斥渲染。当菜品 `imageUrl` 存在但无效时，`<image>` 会先渲染并产生占位符，加载失败触发 `binderror` 后才切换为 emoji。某些设备上这个占位符呈现为空心/实心方块；同时 emoji 字体兼容性差时也会显示为方块。

**修复**：
1. `pages/food/index.wxml`：图片和 icon 同时渲染，icon 始终在最底层，图片 `position: absolute` 覆盖其上；`imageUrl` 为空或加载失败时 icon 立即显示，不再出现空白占位符。
2. `pages/food/index.scss`：`.food-image` 改为 `position: relative`；新增 `.food-icon-wrap`（绝对定位、flex 居中）和 `.food-icon`；`.food-img` 绝对定位并 `z-index: 1`。
3. fallback 兜底：当 `item.icon` 为空时显示菜品名称首字 `item.name[0]`，最后才用通用 emoji `🍽️`。

**修改文件**：
| 文件 | 改动 |
|------|------|
| `pages/food/index.wxml` | 图片和 icon 同时渲染，icon 始终在最底层 |
| `pages/food/index.scss` | 调整 `.food-image` 定位，新增 icon-wrap 样式 |

**验证方法**：重新编译小程序后，查看默认菜品卡片，应显示 emoji 图标或菜品名称首字，不再出现方块。

### 2026-07-17：情侣解绑功能

**需求**：任何一方可单方面解除绑定，解绑后双方数据隔离（不能看对方新订单），历史订单保留可查账，邀请码不变可重新绑定。

**改动文件**：

| 文件 | 改动 |
|------|------|
| `cloudfunctions/bindPartner/index.js` | 新增 `action: 'unbind'`，双方 isBound 置 false、partnerOpenid 清空、邀请码保留 |
| `cloudfunctions/getOrders/index.js` | 男友端未绑定时不再返回空，改为查询历史订单（boyfriendOpenid 过滤） |
| `pages/profile/index.wxml` | 绑定卡片底部添加"解除绑定 >"链接 + 半屏确认弹窗 |
| `pages/profile/index.js` | 新增 onUnbindTap/onConfirmUnbind/onCloseUnbind；loadStats 记录待处理订单数 |
| `pages/profile/index.scss` | .unbind-link 灰色文字链接 + .unbind-modal 半屏弹窗（红色确认按钮） |

**数据隔离机制**：
- 解绑后女友下单 → `createOrder` 检查 `user.isBound` 为 false → 拒绝下单
- 解绑后男友查订单 → `getOrders` 查 `boyfriendOpenid = openid` → 仅返回历史订单
- 新订单不会写入此男友的 `boyfriendOpenid`（因女友 `partnerOpenid` 已清空）
- 重新绑定 → `bindPartner` action 'bind' 正常工作（isBound 已为 false）

> 需重新部署 `bindPartner` 和 `getOrders` 两个云函数。

