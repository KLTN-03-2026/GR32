const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { createPaymentUrl, verifyReturnQuery } = require("../utils/vnpay");
const { generateMaGiaoDich } = require("../utils/orderCodes");
const {
  computeCouponDiscount,
  incrementCouponUsageForOrder,
  decrementCouponUsageForOrder,
} = require("../services/couponService");

const PHI_SHIP_GIAO_TAN_NOI = 20000;

function generateMaDon() { 
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DH${t}${r}`;
}

function calcTamTinh(lines) {
  return lines.reduce((s, it) => s + it.gia * it.so_luong, 0);
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

/** Hoàn tồn kho khi hủy đơn (đảo ngược decrementStockFromLines). */
async function incrementStockFromLines(lines) {
  for (const item of lines || []) {
    const product = await Product.findById(item.san_pham_id);
    if (!product) continue;
    if (product.bien_the && product.bien_the.length > 0) {
      const idx = product.bien_the.findIndex(
        (b) => b.mau_sac === (item.mau_sac || "") && b.kich_co === (item.kich_co || "")
      );
      if (idx >= 0) {
        product.bien_the[idx].so_luong += item.so_luong;
      }
      product.markModified("bien_the");
    } else {
      product.so_luong_ton = (product.so_luong_ton || 0) + item.so_luong;
    }
    product.so_luong_da_ban = Math.max(0, (product.so_luong_da_ban || 0) - item.so_luong);
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
    const rawVoucher = String(ma_voucher || "").trim();
    const vres = await computeCouponDiscount(cart, rawVoucher, tamTinh, { forCheckout: true });
    if (rawVoucher && vres.error) {
      return res.status(400).json({ message: vres.error });
    }
    const discount = vres.discount;
    const ma = discount > 0 ? vres.ma : "";
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

    await incrementCouponUsageForOrder(order._id);

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

    await incrementCouponUsageForOrder(order._id);

    order.trang_thai_thanh_toan = "da_thanh_toan";
    await order.save();

    return res.redirect(`${frontend}/cart?payment=success&ma_don=${encodeURIComponent(maDon)}`);
  } catch (e) {
    console.error(e);
    return res.redirect(`${frontend}/cart?payment=failed`);
  }
};

const ORDER_STATUS_LIST = ["cho_xu_ly", "dang_giao", "da_giao_hang", "hoan_thanh", "huy"];

async function refreshProductRating(sanPhamId) {
  const oid = new mongoose.Types.ObjectId(sanPhamId);
  const agg = await Review.aggregate([
    {
      $match: {
        san_pham_id: oid,
        $nor: [{ trang_thai: "an" }, { trang_thai: "da_xoa" }],
      },
    },
    { $group: { _id: null, avg: { $avg: "$so_sao" }, count: { $sum: 1 } } },
  ]);
  const row = agg[0];
  await Product.findByIdAndUpdate(sanPhamId, {
    sao_danh_gia: row ? Math.round(row.avg * 10) / 10 : 0,
    tong_danh_gia: row ? row.count : 0,
  });
}

exports.refreshProductRating = refreshProductRating;

exports.myOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const q = (req.query.q || "").trim();
    const status = (req.query.trang_thai_don || "").trim();
    const sortField = (req.query.sort || "createdAt").trim();
    const sortDir = String(req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    const filter = { nguoi_dung_id: userId };
    if (status && ORDER_STATUS_LIST.includes(status)) {
      filter.trang_thai_don = status;
    }
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.ma_don = new RegExp(esc, "i");
    }

    const minTong = req.query.tong_min;
    const maxTong = req.query.tong_max;
    if (minTong !== undefined && minTong !== "" && !Number.isNaN(Number(minTong))) {
      filter.tong_cong = { ...(filter.tong_cong || {}), $gte: Number(minTong) };
    }
    if (maxTong !== undefined && maxTong !== "" && !Number.isNaN(Number(maxTong))) {
      filter.tong_cong = { ...(filter.tong_cong || {}), $lte: Number(maxTong) };
    }

    let sort = { createdAt: -1 };
    if (sortField === "ma_don") sort = { ma_don: sortDir };
    else if (sortField === "tong_cong") sort = { tong_cong: sortDir };
    else if (sortField === "trang_thai_don") sort = { trang_thai_don: sortDir };
    else if (sortField === "createdAt") sort = { createdAt: sortDir };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.myOrderById = async (req, res) => {
  try {
    const id = req.params.orderId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID đơn hàng không hợp lệ." });
    }
    const order = await Order.findOne({
      _id: id,
      nguoi_dung_id: req.user._id,
    }).lean();
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    const reviewedRows = await Review.find({
      don_hang_id: order._id,
      trang_thai: { $ne: "da_xoa" },
    })
      .select("dong_index")
      .lean();
    const reviewedLineIndices = reviewedRows.map((r) => r.dong_index).filter((i) => typeof i === "number");
    res.json({ ...order, reviewedLineIndices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

/** Khách hủy đơn: chỉ khi chờ xử lý; hoàn kho nếu đã trừ tồn; trả lượt mã giảm giá nếu có. */
exports.cancelMyOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const id = req.params.orderId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID đơn hàng không hợp lệ." });
    }
    const order = await Order.findOne({ _id: id, nguoi_dung_id: userId });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (order.trang_thai_don === "huy") {
      return res.status(400).json({ message: "Đơn đã được hủy trước đó." });
    }
    if (order.trang_thai_don !== "cho_xu_ly") {
      return res.status(400).json({
        message: "Chỉ có thể hủy khi đơn đang chờ xử lý (shop chưa giao hàng).",
      });
    }

    const paid = order.trang_thai_thanh_toan === "da_thanh_toan";
    const stockWasReserved =
      order.hinh_thuc_thanh_toan !== "vnpay" || paid;

    if (stockWasReserved) {
      await incrementStockFromLines(order.chi_tiet || []);
    }

    await decrementCouponUsageForOrder(order._id);
    order.da_cong_ma_giam = false;

    order.trang_thai_don = "huy";
    order.trang_thai_thanh_toan = paid ? "hoan_tien" : "that_bai";
    await order.save();

    res.json({
      message: paid
        ? "Đã hủy đơn. Bạn đã thanh toán online — cửa hàng sẽ liên hệ xử lý hoàn tiền (nếu áp dụng)."
        : "Đã hủy đơn hàng.",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.confirmReceived = async (req, res) => {
  try {
    const userId = req.user._id;
    const id = req.params.orderId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID đơn hàng không hợp lệ." });
    }
    const order = await Order.findOne({ _id: id, nguoi_dung_id: userId });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (order.trang_thai_don !== "da_giao_hang") {
      return res.status(400).json({
        message: "Chỉ xác nhận khi đơn ở trạng thái đã giao hàng.",
      });
    }
    order.trang_thai_don = "hoan_thanh";
    await order.save();
    res.json({ message: "Cảm ơn bạn đã xác nhận đã nhận hàng.", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.createOrderReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const id = req.params.orderId;
    const { line_index, so_sao, noi_dung, tags } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID đơn hàng không hợp lệ." });
    }
    const idx = parseInt(line_index, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ message: "Dòng sản phẩm không hợp lệ." });
    }
    const star = Number(so_sao);
    if (!star || star < 1 || star > 5) {
      return res.status(400).json({ message: "Vui lòng chọn số sao từ 1 đến 5." });
    }
    const text = String(noi_dung || "").trim();
    if (!text) {
      return res.status(400).json({ message: "Vui lòng nhập nội dung đánh giá" });
    }

    const order = await Order.findOne({ _id: id, nguoi_dung_id: userId });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (order.trang_thai_don !== "hoan_thanh") {
      return res.status(400).json({
        message: "Chỉ đánh giá khi đơn đã hoàn thành (đã xác nhận nhận hàng).",
      });
    }
    const lines = order.chi_tiet || [];
    if (idx >= lines.length) {
      return res.status(400).json({ message: "Dòng sản phẩm không tồn tại." });
    }

    const dup = await Review.findOne({
      don_hang_id: order._id,
      dong_index: idx,
      trang_thai: { $ne: "da_xoa" },
    });
    if (dup) {
      return res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này trong đơn rồi." });
    }

    const line = lines[idx];
    const tagArr = Array.isArray(tags) ? tags.filter((t) => typeof t === "string").slice(0, 8) : [];

    const review = await Review.create({
      san_pham_id: line.san_pham_id,
      nguoi_dung_id: userId,
      ho_ten: req.user.ho_va_ten || "Khách hàng",
      so_sao: star,
      noi_dung: text.slice(0, 1000),
      don_hang_id: order._id,
      dong_index: idx,
      tags: tagArr,
      trang_thai: "hien_thi",
    });

    await refreshProductRating(line.san_pham_id);

    res.status(201).json({
      message: "Cảm ơn bạn đã đánh giá sản phẩm thành công",
      review,
    });
  } catch (err) {
    console.error(err);
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

    await incrementCouponUsageForOrder(order._id);

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
