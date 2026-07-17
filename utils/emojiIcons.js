/**
 * Emoji → 本地图片路径映射
 * 解决真机调试时 Emoji 显示为方框的问题
 */

// Emoji 字符到本地 PNG 路径的映射
var EMOJI_PATH_MAP = {}
EMOJI_PATH_MAP['\u{1F495}'] = '/images/emoji/heart.png'        // 💕
EMOJI_PATH_MAP['\u{23F3}'] = '/images/emoji/hourglass.png'      // ⏳
EMOJI_PATH_MAP['\u{1F37D}\u{FE0F}'] = '/images/emoji/plate.png' // 🍽️
EMOJI_PATH_MAP['\u{1F37D}'] = '/images/emoji/plate.png'         // 🍽 (无变体符)
EMOJI_PATH_MAP['\u{1F4DD}'] = '/images/emoji/memo.png'          // 📝
EMOJI_PATH_MAP['\u{1F6D2}'] = '/images/emoji/cart.png'          // 🛒
EMOJI_PATH_MAP['\u{1F468}\u{200D}\u{1F373}'] = '/images/emoji/cook.png' // 👨‍🍳
EMOJI_PATH_MAP['\u{1F478}'] = '/images/emoji/princess.png'      // 👸
EMOJI_PATH_MAP['\u{1F504}'] = '/images/emoji/refresh.png'       // 🔄
EMOJI_PATH_MAP['\u{23F8}\u{FE0F}'] = '/images/emoji/pause.png'  // ⏸️
EMOJI_PATH_MAP['\u{23F8}'] = '/images/emoji/pause.png'          // ⏸ (无变体符)
EMOJI_PATH_MAP['\u{1F4F1}'] = '/images/emoji/phone.png'         // 📱
EMOJI_PATH_MAP['\u{1F4F4}'] = '/images/emoji/phone-off.png'     // 📴
EMOJI_PATH_MAP['\u{1F4CB}'] = '/images/emoji/clipboard.png'     // 📋
EMOJI_PATH_MAP['\u{2705}'] = '/images/emoji/check.png'          // ✅
EMOJI_PATH_MAP['\u{1F464}'] = '/images/emoji/person.png'        // 👤
EMOJI_PATH_MAP['\u{1F934}'] = '/images/emoji/prince.png'        // 🤴
EMOJI_PATH_MAP['\u{1F49E}'] = '/images/emoji/hearts.png'        // 💞
EMOJI_PATH_MAP['\u{274C}'] = '/images/emoji/cross.png'          // ❌
EMOJI_PATH_MAP['\u{1F354}'] = '/images/emoji/hamburger.png'     // 🍔
EMOJI_PATH_MAP['\u{1F6AA}'] = '/images/emoji/door.png'          // 🚪
EMOJI_PATH_MAP['\u{270F}\u{FE0F}'] = '/images/emoji/pencil.png' // ✏️
EMOJI_PATH_MAP['\u{270F}'] = '/images/emoji/pencil.png'         // ✏ (无变体符)
EMOJI_PATH_MAP['\u{1F35A}'] = '/images/emoji/rice.png'          // 🍚
EMOJI_PATH_MAP['\u{1F35F}'] = '/images/emoji/fries.png'         // 🍟
EMOJI_PATH_MAP['\u{1F964}'] = '/images/emoji/drink.png'         // 🥤
EMOJI_PATH_MAP['\u{1F370}'] = '/images/emoji/cake.png'          // 🍰
EMOJI_PATH_MAP['\u{1F372}'] = '/images/emoji/pot.png'           // 🍲
EMOJI_PATH_MAP['\u{1F467}'] = '/images/emoji/girl.png'          // 👧
EMOJI_PATH_MAP['\u{2764}\u{FE0F}'] = '/images/emoji/red-heart.png' // ❤️
EMOJI_PATH_MAP['\u{2764}'] = '/images/emoji/red-heart.png'      // ❤ (无变体符)
EMOJI_PATH_MAP['\u{1F37D}'] = '/images/emoji/plate.png'         // 🍽️ fallback

// 分类 emoji → 图片路径（用于添加菜品页面）
var CATEGORY_ICON_MAP = {
  '\u{1F35A}': '/images/emoji/rice.png',
  '\u{1F35F}': '/images/emoji/fries.png',
  '\u{1F964}': '/images/emoji/drink.png',
  '\u{1F370}': '/images/emoji/cake.png',
  '\u{1F372}': '/images/emoji/pot.png'
}

// 默认菜品图标
var DEFAULT_FOOD_ICON = '/images/emoji/plate.png'

/**
 * 根据 emoji 字符获取本地图片路径
 * @param {string} emoji - emoji 字符
 * @param {string} fallback - 找不到时的默认路径
 * @returns {string} 图片路径
 */
function getIconPath(emoji, fallback) {
  if (!emoji) return fallback || DEFAULT_FOOD_ICON
  // 如果已经是图片路径（以 / 开头），直接返回
  if (typeof emoji === 'string' && emoji.charAt(0) === '/') return emoji
  return EMOJI_PATH_MAP[emoji] || fallback || DEFAULT_FOOD_ICON
}

/**
 * 给数据项列表添加 iconPath 字段（用于菜品图标）
 * @param {Array} items - 数据项列表（每项需有 icon 字段）
 * @returns {Array} 添加了 iconPath 的新列表
 */
function addIconPaths(items) {
  if (!items || !items.length) return items
  return items.map(function (item) {
    var copy = Object.assign({}, item)
    copy.iconPath = getIconPath(item.icon)
    return copy
  })
}

module.exports = {
  EMOJI_PATH_MAP: EMOJI_PATH_MAP,
  CATEGORY_ICON_MAP: CATEGORY_ICON_MAP,
  DEFAULT_FOOD_ICON: DEFAULT_FOOD_ICON,
  getIconPath: getIconPath,
  addIconPaths: addIconPaths
}
