const mongoose = require("mongoose");

const orderLineSchema = new mongoose.Schema(
  {
    san_pham_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    ten_san_pham: { type: String, required: true },
    hinh_anh: { type: String, default: "" },
    gia: { type: Number, required: true },
    mau_sac: { type: String, default: "" },
    kich_co: { type: String, default: "" },
    so_luong: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    ma_don: { type: String, required: true, unique: true, index: true },
    ma_giao_dich: { type: String, unique: true, sparse: true, index: true },
    nguoi_dung_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chi_tiet: [orderLineSchema],

    ho_va_ten: { type: String, required: true },
    so_dien_thoai: { type: String, required: true },
    email: { type: String, default: "" },
    dia_chi_chi_tiet: { type: String, default: "" },
    ghi_chu: { type: String, default: "" },

    phuong_thuc_van_chuyen: {
      type: String,
      enum: ["giao_tan_noi", "nhan_tai_cua_hang"],
      default: "giao_tan_noi",
    },
    phi_van_chuyen: { type: Number, default: 0 },

    hinh_thuc_thanh_toan: {
      type: String,
      enum: ["cod", "chuyen_khoan", "vnpay"],
      required: true,
    },
    trang_thai_thanh_toan: {
      type: String,
      enum: ["cho_thanh_toan", "da_thanh_toan", "that_bai", "hoan_tien"],
      default: "cho_thanh_toan",
    },
    trang_thai_don: {
      type: String,
      enum: ["cho_xu_ly", "dang_giao", "hoan_thanh", "huy"],
      default: "cho_xu_ly",
    },

    tam_tinh: { type: Number, required: true },
    giam_gia: { type: Number, default: 0 },
    tong_cong: { type: Number, required: true },
    ma_voucher: { type: String, default: "" },

    vnpay_transaction_no: { type: String, default: "" },
    vnpay_response_code: { type: String, default: "" },
    vnpay_bank_code: { type: String, default: "" },
    vnpay_pay_date: { type: String, default: "" },
    vnpay_raw_query: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: "don_hang" }
);

module.exports = mongoose.model("Order", orderSchema);
