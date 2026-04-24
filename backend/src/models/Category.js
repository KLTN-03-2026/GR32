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
    ngay_tao: { type: Date, default: Date.now },
  },
  { collection: "danh_muc" }
);

module.exports = mongoose.model("Category", categorySchema);
