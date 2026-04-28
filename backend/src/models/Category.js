const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    ma_danh_muc: { type: String, required: true, unique: true, index: true },
    ten_danh_muc: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mo_ta: { type: String, required: true, default: "" },
    trang_thai: {
      type: String,
      enum: ["hoat_dong", "ngung_hoat_dong"],
      default: "hoat_dong",
      index: true,
    },
    /** null = danh mục gốc; có giá trị = con của danh mục đó */
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    thu_tu_menu: { type: Number, default: 999, index: true },
    hien_thi_tren_menu: { type: Boolean, default: true },
    ngay_tao: { type: Date, default: Date.now },
  },
  { collection: "danh_muc" }
);

module.exports = mongoose.model("Category", categorySchema);
