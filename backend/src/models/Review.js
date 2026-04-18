const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    san_pham_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    nguoi_dung_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ho_ten: { type: String, required: true },
    so_sao: { type: Number, required: true, min: 1, max: 5 },
    noi_dung: { type: String, required: true },
    ngay_tao: { type: Date, default: Date.now },
    /** Đánh giá từ đơn hàng (PB38): mỗi dòng đơn tối đa 1 lần */
    don_hang_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    dong_index: { type: Number, min: 0, default: null },
    tags: [{ type: String }],
  },
  { collection: "danh_gia" }
);

module.exports = mongoose.model("Review", reviewSchema);
