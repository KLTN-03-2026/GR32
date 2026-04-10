const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  san_pham_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  ten_san_pham: { type: String, required: true },
  hinh_anh: { type: String },
  gia: { type: Number, required: true },
  mau_sac: { type: String, default: "" },
  kich_co: { type: String, default: "" },
  so_luong: { type: Number, required: true, min: 1 },
});

const cartSchema = new mongoose.Schema(
  {
    nguoi_dung_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    san_pham: [cartItemSchema],
  },
  {
    timestamps: true,
    collection: "gio_hang",
  }
);

module.exports = mongoose.model("Cart", cartSchema);
