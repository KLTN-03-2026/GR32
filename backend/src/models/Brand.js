const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    ma_thuong_hieu: { type: String, required: true, unique: true, index: true },
    ten_thuong_hieu: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mo_ta: { type: String, required: true, default: "" },
    hinh_anh: { type: String, default: "" },
    trang_thai: {
      type: String,
      enum: ["hoat_dong", "ngung_hoat_dong"],
      default: "hoat_dong",
      index: true,
    },
    ngay_tao: { type: Date, default: Date.now },
  },
  { collection: "thuong_hieu" }
);

module.exports = mongoose.model("Brand", brandSchema);
