const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const Order = require("../models/Order");

function calcTamTinhLines(lines) {
  return lines.reduce((s, it) => s + (Number(it.gia) || 0) * (Number(it.so_luong) || 0), 0);
}

async function loadCartProductDanhMucMap(cart) {
  const ids = [...new Set((cart.san_pham || []).map((i) => String(i.san_pham_id)))];
  if (!ids.length) return {};
  const products = await Product.find({ _id: { $in: ids } }).select("danh_muc").lean();
  const map = {};
  for (const p of products) {
    map[String(p._id)] = p.danh_muc || "";
  }
  return map;
}

function cartMatchesDanhMuc(coupon, dmByProductId, cart) {
  const allowed = coupon.danh_muc_ap_dung || [];
  if (!allowed.length) return true;
  const lines = cart.san_pham || [];
  if (!lines.length) return false;
  for (const line of lines) {
    const dm = dmByProductId[String(line.san_pham_id)] || "";
    if (!allowed.includes(dm)) return false;
  }
  return true;
}

/**
 * @param {import('mongoose').Document|object} cart - giỏ hàng có san_pham[]
 * @param {string} maInput
 * @param {number} tamTinh
 * @param {{ forCheckout?: boolean }} opts - forCheckout: yêu cầu hien_thi (khách)
 */
async function computeCouponDiscount(cart, maInput, tamTinh, opts = {}) {
  const forCheckout = Boolean(opts.forCheckout);
  const empty = { discount: 0, ma: "", error: null };
  if (!maInput || typeof maInput !== "string") return empty;
  const ma = maInput.trim().toUpperCase();
  if (!ma) return empty;

  const coupon = await Coupon.findOne({ ma });
  if (!coupon) return { discount: 0, ma, error: "Mã không hợp lệ" };

  const now = new Date();
  if (coupon.ngay_bat_dau > now) return { discount: 0, ma, error: "Mã chưa có hiệu lực" };
  if (coupon.ngay_ket_thuc < now) return { discount: 0, ma, error: "Mã đã hết hạn" };
  if (coupon.da_su_dung >= coupon.so_luong) return { discount: 0, ma, error: "Mã đã hết lượt" };
  if (forCheckout && !coupon.hien_thi) return { discount: 0, ma, error: "Mã không khả dụng" };

  const dmMap = await loadCartProductDanhMucMap(cart);
  if (!cartMatchesDanhMuc(coupon, dmMap, cart)) {
    const allowed = coupon.danh_muc_ap_dung || [];
    const extra =
      allowed.length > 0
        ? ` Mã chỉ áp dụng khi toàn bộ sản phẩm trong giỏ thuộc một trong các danh mục: ${allowed.join(", ")}.`
        : "";
    return { discount: 0, ma, error: `Giỏ hàng không đủ điều kiện danh mục áp dụng.${extra}` };
  }

  const t = Number(tamTinh) || 0;
  if (t < (coupon.don_toi_thieu || 0)) {
    return { discount: 0, ma, error: "Đơn chưa đạt giá trị tối thiểu" };
  }

  let discount = 0;
  if (coupon.loai === "phan_tram") {
    const pct = Math.min(100, Math.max(0, Number(coupon.gia_tri) || 0));
    discount = Math.min(Math.round((t * pct) / 100), t);
  } else {
    discount = Math.min(Math.max(0, Number(coupon.gia_tri) || 0), t);
  }

  return { discount, ma, error: null };
}

async function incrementCouponUsageForOrder(orderId) {
  const order = await Order.findById(orderId).select("ma_voucher giam_gia da_cong_ma_giam").lean();
  if (!order || order.da_cong_ma_giam) return;
  if (!order.ma_voucher || !String(order.ma_voucher).trim() || !(Number(order.giam_gia) > 0)) return;

  const ma = String(order.ma_voucher).trim().toUpperCase();
  const res = await Coupon.updateOne(
    { ma, $expr: { $lt: ["$da_su_dung", "$so_luong"] } },
    { $inc: { da_su_dung: 1 } },
  );
  if (res.modifiedCount) {
    await Order.updateOne({ _id: orderId }, { $set: { da_cong_ma_giam: true } });
  }
}

/** Khi hủy đơn: trả lại 1 lượt dùng mã nếu đơn đã được cộng lượt. */
async function decrementCouponUsageForOrder(orderId) {
  const order = await Order.findById(orderId).select("ma_voucher giam_gia da_cong_ma_giam").lean();
  if (!order?.da_cong_ma_giam) return;
  if (!order.ma_voucher || !String(order.ma_voucher).trim() || !(Number(order.giam_gia) > 0)) return;

  const ma = String(order.ma_voucher).trim().toUpperCase();
  const coupon = await Coupon.findOne({ ma });
  if (coupon && coupon.da_su_dung > 0) {
    coupon.da_su_dung -= 1;
    await coupon.save();
  }
  await Order.updateOne({ _id: orderId }, { $set: { da_cong_ma_giam: false } });
}

function tinhTrangSuDung(c) {
  const now = new Date();
  if (c.ngay_ket_thuc < now) return "het_han";
  if (c.da_su_dung >= c.so_luong) return "het_so_luong";
  if (c.ngay_bat_dau > now) return "chua_hieu_luc";
  return "con_han";
}

module.exports = {
  calcTamTinhLines,
  computeCouponDiscount,
  incrementCouponUsageForOrder,
  decrementCouponUsageForOrder,
  tinhTrangSuDung,
};
