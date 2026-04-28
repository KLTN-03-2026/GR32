const Category = require("../models/Category");

/**
 * Danh mục gốc (không cha) tên/slug quá chung — trùng ý với lá chuẩn (Áo thun nam, Quần jean nam…)
 * không dùng làm Product.danh_muc trong app; ẩn khỏi API public để sidebar / coupon không lẫn.
 */
function isRedundantGenericRoot(c) {
  if (c.parent_id) return false;
  const ten = String(c.ten_danh_muc || "").trim();
  const slug = String(c.slug || "").trim();
  if (ten === "Áo thun" || ten === "Quần") return true;
  if (slug === "ao-thun" || slug === "quan") return true;
  return false;
}

/** Danh sách danh mục đang hoạt động (dùng cho form sản phẩm, menu khách) */
exports.listPublic = async (req, res) => {
  try {
    const items = await Category.find({ trang_thai: "hoat_dong" })
      .sort({ thu_tu_menu: 1, ten_danh_muc: 1 })
      .select("ten_danh_muc slug mo_ta parent_id thu_tu_menu hien_thi_tren_menu")
      .lean();
    const filtered = items.filter((c) => !isRedundantGenericRoot(c));
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải danh mục." });
  }
};
