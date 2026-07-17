const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const {
    name,
    category,
    icon,
    description,
    price,
    tasteTags,
    requirements,
    imageUrl,
    images,
    cravingLevel,
    isCustom,
  } = event;

  if (!name || !name.trim()) {
    return { success: false, error: "菜品名称不能为空" };
  }

  if (!category) {
    return { success: false, error: "请选择分类" };
  }

  try {
    const countResult = await db.collection("foods").count();
    const sort = countResult.total + 1;

    const foodData = {
      name: name.trim(),
      category,
      icon: icon || "/images/emoji/plate.png",
      description: description || "",
      price: typeof price === "number" ? price : 0,
      tasteTags: Array.isArray(tasteTags) ? tasteTags : [],
      requirements: requirements || "",
      imageUrl: imageUrl || "",
      images: Array.isArray(images) ? images : [],
      cravingLevel: cravingLevel || 3,
      isCustom: isCustom !== undefined ? isCustom : true,
      createdBy: openid,
      sort,
      isRecommended: false,
      createdAt: db.serverDate(),
    };

    const result = await db.collection("foods").add({
      data: foodData,
    });

    console.log("addFood success, _id:", result._id);

    return {
      success: true,
      _id: result._id,
      data: foodData,
    };
  } catch (err) {
    console.error("addFood error:", err);
    return {
      success: false,
      error: err.message || JSON.stringify(err),
      errCode: err.errCode,
    };
  }
};
