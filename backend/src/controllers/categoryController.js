const Category = require("../models/Category");

/** Danh sách danh mục đang hoạt động (dùng cho form sản phẩm, menu khách) */
exports.listPublic = async (req, res) => {
  try {
    const items = await Category.find({ trang_thai: "hoat_dong" })
      .sort({ ten_danh_muc: 1 })
      .select("ten_danh_muc slug mo_ta")
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải danh mục." });
  }
};
