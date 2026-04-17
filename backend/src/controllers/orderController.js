const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { createPaymentUrl, verifyReturnQuery } = require("../utils/vnpay");
const { generateMaGiaoDich } = require("../utils/orderCodes");

const PHI_SHIP_GIAO_TAN_NOI = 20000;

const VOUCHERS = {
  APR20: { min: 499000, discount: 20000 },
  APR60: { min: 799000, discount: 60000 },
  APR90: { min: 1299000, discount: 90000 },
  APR150: { min: 1999000, discount: 150000 },
};

function generateMaDon() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DH${t}${r}`;
}

function calcTamTinh(lines) {
  return lines.reduce((s, it) => s + it.gia * it.so_luong, 0);
}

function applyVoucher(code, tamTinh) {
  if (!code || typeof code !== "string") return { discount: 0, ma: "" };
  const key = code.trim().toUpperCase();
  const rule = VOUCHERS[key];
  if (!rule || tamTinh < rule.min) return { discount: 0, ma: key };
  return { discount: rule.discount, ma: key };
}

async function verifyCartStock(cart) {
  for (const item of cart.san_pham) {
    const product = await Product.findById(item.san_pham_id);
    if (!product) {
      throw new Error(`Sản phẩm không còn tồn tại: ${item.ten_san_pham}`);
    }
    if (product.bien_the && product.bien_the.length > 0) {
      const v = product.bien_the.find(
        (b) => b.mau_sac === (item.mau_sac || "") && b.kich_co === (item.kich_co || "")
      );
      if (!v || v.so_luong < item.so_luong) {
        throw new Error(`Không đủ tồn kho: ${item.ten_san_pham}`);
      }
    } else if ((product.so_luong_ton || 0) < item.so_luong) {
      throw new Error(`Không đủ tồn kho: ${item.ten_san_pham}`);
    }
  }
}

async function decrementStockFromLines(lines) {
  for (const item of lines) {
    const product = await Product.findById(item.san_pham_id);
    if (!product) continue;
    if (product.bien_the && product.bien_the.length > 0) {
      const idx = product.bien_the.findIndex(
        (b) => b.mau_sac === (item.mau_sac || "") && b.kich_co === (item.kich_co || "")
      );
      if (idx >= 0) {
        product.bien_the[idx].so_luong -= item.so_luong;
      }
      product.markModified("bien_the");
    } else {
      product.so_luong_ton = Math.max(0, (product.so_luong_ton || 0) - item.so_luong);
    }
    product.so_luong_da_ban = (product.so_luong_da_ban || 0) + item.so_luong;
    await product.save();
  }
}

async function clearCart(userId) {
  await Cart.updateOne({ nguoi_dung_id: userId }, { $set: { san_pham: [] } });
}

function snapshotLines(cart) {
  return cart.san_pham.map((it) => ({
    san_pham_id: it.san_pham_id,
    ten_san_pham: it.ten_san_pham,
    hinh_anh: it.hinh_anh || "",
    gia: it.gia,
    mau_sac: it.mau_sac || "",
    kich_co: it.kich_co || "",
    so_luong: it.so_luong,
  }));
}

exports.checkout = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      ho_va_ten,
      so_dien_thoai,
      email,
      dia_chi_chi_tiet,
      ghi_chu,
      phuong_thuc_van_chuyen,
      hinh_thuc_thanh_toan,
      ma_voucher,
      vnpay_locale,
    } = req.body;

    if (!ho_va_ten?.trim() || !so_dien_thoai?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập đủ họ tên, số điện thoại và email." });
    }
    if (!dia_chi_chi_tiet?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập địa chỉ nhận hàng.",
      });
    }

    const ship = phuong_thuc_van_chuyen === "nhan_tai_cua_hang" ? "nhan_tai_cua_hang" : "giao_tan_noi";
    const phiShip = ship === "giao_tan_noi" ? PHI_SHIP_GIAO_TAN_NOI : 0;

    const pay = ["cod", "chuyen_khoan", "vnpay"].includes(hinh_thuc_thanh_toan)
      ? hinh_thuc_thanh_toan
      : null;
    if (!pay) {
      return res.status(400).json({ message: "Hình thức thanh toán không hợp lệ." });
    }

    const cart = await Cart.findOne({ nguoi_dung_id: userId });
    if (!cart || !cart.san_pham.length) {
      return res.status(400).json({ message: "Giỏ hàng trống." });
    }

    await verifyCartStock(cart);

    const chiTiet = snapshotLines(cart);
    const tamTinh = calcTamTinh(chiTiet);
    const { discount, ma } = applyVoucher(ma_voucher, tamTinh);
    const tongCong = Math.max(0, tamTinh - discount + phiShip);

    const maDon = generateMaDon();

    if (pay === "vnpay") {
      const tmn = process.env.VNPAY_TMN_CODE;
      const secret = process.env.VNPAY_HASH_SECRET;
      const useRealVnpay =
        String(process.env.VNPAY_USE_REAL || "").toLowerCase() === "true" && tmn && secret;

      const maGd = await generateMaGiaoDich();
      const order = await Order.create({
        ma_don: maDon,
        ma_giao_dich: maGd,
        nguoi_dung_id: userId,
        chi_tiet: chiTiet,
        ho_va_ten: ho_va_ten.trim(),
        so_dien_thoai: so_dien_thoai.trim(),
        email: email.trim(),
        dia_chi_chi_tiet: dia_chi_chi_tiet.trim(),
        ghi_chu: (ghi_chu || "").trim(),
        phuong_thuc_van_chuyen: ship,
        phi_van_chuyen: phiShip,
        hinh_thuc_thanh_toan: "vnpay",
        trang_thai_thanh_toan: "cho_thanh_toan",
        trang_thai_don: "cho_xu_ly",
        tam_tinh: tamTinh,
        giam_gia: discount,
        tong_cong: tongCong,
        ma_voucher: ma,
      });

      if (useRealVnpay) {
        const payUrl = process.env.VNPAY_PAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        const returnBase =
          process.env.VNPAY_RETURN_URL ||
          `${process.env.BACKEND_PUBLIC_URL || "http://localhost:5000"}/api/orders/vnpay-return`;
        const orderInfo = `Thanh toan don hang ${maDon}`;
        const paymentUrl = createPaymentUrl({
          tmnCode: tmn,
          hashSecret: secret,
          payUrl,
          returnUrl: returnBase,
          ipAddr: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "127.0.0.1",
          amountVnd: tongCong,
          maDon,
          orderInfo,
          locale: vnpay_locale === "en" ? "en" : "vn",
        });

        return res.status(200).json({
          paymentUrl,
          ma_don: maDon,
          orderId: order._id,
          message: "Chuyển tới cổng thanh toán VNPAY.",
        });
      }

      return res.status(200).json({
        vnpaySandbox: true,
        ma_don: maDon,
        orderId: order._id,
        message: "Chuyển tới cổng VNPAY sandbox (giả lập).",
      });
    }

    const maGd = await generateMaGiaoDich();
    const order = await Order.create({
      ma_don: maDon,
      ma_giao_dich: maGd,
      nguoi_dung_id: userId,
      chi_tiet: chiTiet,
      ho_va_ten: ho_va_ten.trim(),
      so_dien_thoai: so_dien_thoai.trim(),
      email: email.trim(),
      dia_chi_chi_tiet: dia_chi_chi_tiet.trim(),
      ghi_chu: (ghi_chu || "").trim(),
      phuong_thuc_van_chuyen: ship,
      phi_van_chuyen: phiShip,
      hinh_thuc_thanh_toan: pay,
      trang_thai_thanh_toan: "cho_thanh_toan",
      trang_thai_don: "cho_xu_ly",
      tam_tinh: tamTinh,
      giam_gia: discount,
      tong_cong: tongCong,
      ma_voucher: ma,
    });

    await decrementStockFromLines(chiTiet);
    await clearCart(userId);

    return res.status(201).json({
      message: "Đặt hàng thành công!",
      order,
    });
  } catch (err) {
    if (err.message && err.message.includes("tồn kho")) {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.vnpayReturn = async (req, res) => {
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
  const secret = process.env.VNPAY_HASH_SECRET;

  try {
    const q = req.query;
    const maDon = q.vnp_TxnRef;

    const applyVnpQueryToOrder = async (order, query) => {
      if (!order) return;
      order.vnpay_transaction_no = String(query.vnp_TransactionNo || "");
      order.vnpay_response_code = String(query.vnp_ResponseCode || "");
      order.vnpay_bank_code = String(query.vnp_BankCode || "");
      order.vnpay_pay_date = String(query.vnp_PayDate || "");
      order.vnpay_raw_query = { ...query };
      if (!order.ma_giao_dich) {
        try {
          order.ma_giao_dich = await generateMaGiaoDich();
        } catch (e) {
          console.error(e);
        }
      }
    };

    if (!verifyReturnQuery(q, secret)) {
      if (maDon) {
        const bad = await Order.findOne({ ma_don: maDon });
        if (bad) {
          await applyVnpQueryToOrder(bad, q);
          if (bad.trang_thai_thanh_toan === "cho_thanh_toan") {
            bad.trang_thai_thanh_toan = "that_bai";
          }
          await bad.save();
        }
      }
      return res.redirect(`${frontend}/cart?payment=failed`);
    }

    const order = await Order.findOne({ ma_don: maDon });
    if (!order) {
      return res.redirect(`${frontend}/cart?payment=failed`);
    }

    await applyVnpQueryToOrder(order, q);

    if (order.trang_thai_thanh_toan === "da_thanh_toan") {
      await order.save();
      return res.redirect(`${frontend}/cart?payment=success&ma_don=${encodeURIComponent(maDon)}`);
    }

    const amountVnd = Number(q.vnp_Amount) / 100;
    if (Math.round(amountVnd) !== Math.round(order.tong_cong)) {
      if (order.trang_thai_thanh_toan === "cho_thanh_toan") {
        order.trang_thai_thanh_toan = "that_bai";
      }
      await order.save();
      return res.redirect(`${frontend}/cart?payment=failed`);
    }

    const cartLike = { san_pham: order.chi_tiet };
    try {
      await verifyCartStock(cartLike);
    } catch {
      order.trang_thai_thanh_toan = "that_bai";
      await order.save();
      return res.redirect(`${frontend}/cart?payment=failed`);
    }

    await decrementStockFromLines(order.chi_tiet);
    await clearCart(order.nguoi_dung_id);

    order.trang_thai_thanh_toan = "da_thanh_toan";
    await order.save();

    return res.redirect(`${frontend}/cart?payment=success&ma_don=${encodeURIComponent(maDon)}`);
  } catch (e) {
    console.error(e);
    return res.redirect(`${frontend}/cart?payment=failed`);
  }
};

exports.myOrders = async (req, res) => {
  try {
    const list = await Order.find({ nguoi_dung_id: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.vnpaySandboxOrderMeta = async (req, res) => {
  try {
    const userId = req.user._id;
    const ma_don = String(req.params.ma_don || "").trim();
    if (!ma_don) return res.status(400).json({ message: "Thiếu mã đơn." });

    const order = await Order.findOne({ ma_don, nguoi_dung_id: userId })
      .select("ma_don tong_cong trang_thai_thanh_toan hinh_thuc_thanh_toan trang_thai_don")
      .lean();

    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn." });
    if (order.hinh_thuc_thanh_toan !== "vnpay") {
      return res.status(400).json({ message: "Đơn không phải VNPAY." });
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.vnpaySandboxComplete = async (req, res) => {
  try {
    const userId = req.user._id;
    const ma_don = String(req.body?.ma_don || "").trim();
    if (!ma_don) return res.status(400).json({ message: "Thiếu mã đơn." });

    const order = await Order.findOne({ ma_don, nguoi_dung_id: userId });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn." });
    if (order.hinh_thuc_thanh_toan !== "vnpay") {
      return res.status(400).json({ message: "Đơn không phải VNPAY." });
    }
    if (!order.ma_giao_dich) {
      try {
        order.ma_giao_dich = await generateMaGiaoDich();
        await order.save();
      } catch (e) {
        console.error(e);
      }
    }
    if (order.trang_thai_thanh_toan === "da_thanh_toan") {
      return res.status(200).json({ message: "Đơn đã được thanh toán trước đó.", order });
    }
    if (order.trang_thai_thanh_toan !== "cho_thanh_toan") {
      return res.status(400).json({ message: "Đơn không ở trạng thái chờ thanh toán." });
    }

    const cartLike = { san_pham: order.chi_tiet };
    try {
      await verifyCartStock(cartLike);
    } catch (e) {
      order.trang_thai_thanh_toan = "that_bai";
      await order.save();
      return res.status(400).json({ message: e.message || "Không đủ tồn kho." });
    }

    await decrementStockFromLines(order.chi_tiet);
    await clearCart(userId);

    order.trang_thai_thanh_toan = "da_thanh_toan";
    order.vnpay_response_code = "00";
    order.vnpay_transaction_no = order.vnpay_transaction_no || `SBX-${order.ma_don}`;
    await order.save();

    return res.status(200).json({ message: "Thanh toán thành công (sandbox).", order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.vnpaySandboxCancel = async (req, res) => {
  try {
    const userId = req.user._id;
    const ma_don = String(req.body?.ma_don || "").trim();
    if (!ma_don) return res.status(400).json({ message: "Thiếu mã đơn." });

    const order = await Order.findOne({ ma_don, nguoi_dung_id: userId });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn." });
    if (order.hinh_thuc_thanh_toan !== "vnpay") {
      return res.status(400).json({ message: "Đơn không phải VNPAY." });
    }
    if (order.trang_thai_thanh_toan === "da_thanh_toan") {
      return res.status(400).json({ message: "Đơn đã thanh toán, không thể hủy từ trang này." });
    }
    if (order.trang_thai_thanh_toan === "that_bai" && order.trang_thai_don === "huy") {
      return res.status(200).json({ message: "Đơn đã được hủy trước đó." });
    }

    order.trang_thai_thanh_toan = "that_bai";
    order.trang_thai_don = "huy";
    await order.save();

    return res.status(200).json({
      message: "Đã hủy thanh toán (sandbox). Giỏ hàng của bạn vẫn giữ nguyên.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server!" });
  }
};
