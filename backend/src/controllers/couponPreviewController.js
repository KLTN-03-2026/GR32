const Cart = require("../models/Cart");
const { calcTamTinhLines, computeCouponDiscount } = require("../services/couponService");

exports.preview = async (req, res) => {
  try {
    const ma = String(req.body?.ma || "").trim();
    const cart = await Cart.findOne({ nguoi_dung_id: req.user._id });
    if (!cart || !cart.san_pham?.length) {
      return res.json({ tam_tinh: 0, discount: 0, ma: ma.toUpperCase(), message: "" });
    }
    const tamTinh = calcTamTinhLines(cart.san_pham);
    const r = await computeCouponDiscount(cart, ma, tamTinh, { forCheckout: true });
    res.json({
      tam_tinh: tamTinh,
      discount: r.discount,
      ma: r.ma,
      message: r.error || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi kiểm tra mã." });
  }
};
