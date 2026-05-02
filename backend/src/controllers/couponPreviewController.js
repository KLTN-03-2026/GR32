const Cart = require("../models/Cart");
const Coupon = require("../models/Coupon");
const { calcTamTinhLines, computeCouponDiscount } = require("../services/couponService");

function formatExpiryVI(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDonToiThieu(don) {
  const d = Math.round(Number(don) || 0);
  if (d <= 0) return "Không yêu cầu giá trị đơn tối thiểu";
  const k = d / 1000;
  return `Đơn từ ${k.toLocaleString("vi-VN")}k`;
}

function formatAmountText(c) {
  if (c.loai === "phan_tram") {
    const pct = Math.min(100, Math.max(0, Number(c.gia_tri) || 0));
    return `Giảm ${pct}%`;
  }
  const v = Number(c.gia_tri) || 0;
  if (v >= 1000) {
    const k = v / 1000;
    const s = Number.isInteger(k)
      ? k.toLocaleString("vi-VN")
      : k.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
    return `Giảm ${s}k`;
  }
  return `Giảm ${v.toLocaleString("vi-VN")}đ`;
}

/** Mã đang hiệu lực, bật “Hiển thị”, còn lượt — dùng cho trang chủ / checkout (không cần đăng nhập). */
exports.listPublicDisplay = async (req, res) => {
  try {
    const now = new Date();
    const items = await Coupon.find({
      hien_thi: { $ne: false },
      ngay_bat_dau: { $lte: now },
      ngay_ket_thuc: { $gte: now },
      $expr: { $lt: ["$da_su_dung", "$so_luong"] },
    })
      .sort({ don_toi_thieu: 1, gia_tri: -1, ma: 1 })
      .select("ma mo_ta loai gia_tri don_toi_thieu ngay_ket_thuc danh_muc_ap_dung")
      .limit(50)
      .lean();

    const out = items.map((c) => {
      const allowed = Array.isArray(c.danh_muc_ap_dung) ? c.danh_muc_ap_dung.filter(Boolean) : [];
      return {
        code: c.ma,
        amountText: formatAmountText(c),
        conditionText: formatDonToiThieu(c.don_toi_thieu),
        expiryText: formatExpiryVI(c.ngay_ket_thuc),
        mo_ta: (c.mo_ta || "").trim(),
        categoryRestricted: allowed.length > 0,
        categoryHint:
          allowed.length > 0 ? `Chỉ khi mọi mặt hàng trong giỏ thuộc: ${allowed.join(", ")}` : "",
      };
    });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tải được danh sách ưu đãi." });
  }
};

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
