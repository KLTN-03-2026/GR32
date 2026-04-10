const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  ten_san_pham: { type: String, required: true },
  hinh_anh: { type: String },
  danh_sach_anh: [{ type: String }],
  gia_goc: { type: Number },
  phan_tram_giam_gia: { type: Number, default: 0 },
  gia_hien_tai: { type: Number },
  danh_muc: { type: String },
  thuong_hieu: { type: String },
  mo_ta: { type: String },
  gioi_tinh: { type: String, default: "Unisex" },
  chat_lieu: { type: String },
  kieu_dang: { type: String },
  huong_dan_bao_quan: { type: String },
  bien_the: [
    {
      mau_sac: { type: String },
      kich_co: { type: String },
      so_luong: { type: Number, default: 0 },
      ma_sku: { type: String },
      gia_goc: { type: Number },
      gia_ban: { type: Number },
    },
  ],
  so_luong_ton: { type: Number, default: 0 },
  so_luong_da_ban: { type: Number, default: 0 },
  sao_danh_gia: { type: Number, default: 0 },
  tong_danh_gia: { type: Number, default: 0 },
  trang_thai: { type: String, default: "dang_ban" },
  ngay_tao: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema, "san_pham");
