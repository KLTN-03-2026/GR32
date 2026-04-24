const Brand = require("../models/Brand");

exports.listPublic = async (req, res) => {
  try {
    const items = await Brand.find({ trang_thai: "hoat_dong" })
      .sort({ ten_thuong_hieu: 1 })
      .select("ten_thuong_hieu slug mo_ta hinh_anh")
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải thương hiệu." });
  }
};
