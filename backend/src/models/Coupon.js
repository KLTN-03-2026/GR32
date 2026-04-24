const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    ma: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    mo_ta: { type: String, default: "" },
    /** Rỗng = áp dụng mọi danh mục; ngược lại mọi sản phẩm trong giỏ phải thuộc một trong các danh mục này */
    danh_muc_ap_dung: [{ type: String }],
    loai: { type: String, enum: ["phan_tram", "tien_mat"], required: true },
    /** phan_tram: % ; tien_mat: số tiền VND */
    gia_tri: { type: Number, required: true, min: 0 },
    don_toi_thieu: { type: Number, default: 0, min: 0 },
    so_luong: { type: Number, required: true, min: 1 },
    da_su_dung: { type: Number, default: 0, min: 0 },
    ngay_bat_dau: { type: Date, required: true },
    ngay_ket_thuc: { type: Date, required: true },
    hien_thi: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "ma_giam_gia" }
);

module.exports = mongoose.model("Coupon", couponSchema);
