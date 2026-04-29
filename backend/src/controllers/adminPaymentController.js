const mongoose = require("mongoose");
const Order = require("../models/Order");
const { fallbackMaGiaoDich } = require("../utils/orderCodes");

function mapOrder(o) {
  const plain = typeof o.toObject === "function" ? o.toObject() : o;
  return {
    ...plain,
    ma_giao_dich_hien_thi: plain.ma_giao_dich || fallbackMaGiaoDich(plain._id),
  };
}

exports.listPayments = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "").trim();
    const from = req.query.from;
    const to = req.query.to;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));

    const filter = {};
    if (status && ["cho_thanh_toan", "da_thanh_toan", "that_bai", "hoan_tien"].includes(status)) {
      filter.trang_thai_thanh_toan = status;
    } 
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { ma_don: new RegExp(esc, "i") },
        { ma_giao_dich: new RegExp(esc, "i") },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      items: items.map((row) => ({
        ...row,
        ma_giao_dich_hien_thi: row.ma_giao_dich || fallbackMaGiaoDich(row._id),
      })),
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

exports.getPaymentDetail = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    res.json(mapOrder(order));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.confirmOfflinePayment = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn." });
    if (!["cod", "chuyen_khoan"].includes(order.hinh_thuc_thanh_toan)) {
      return res.status(400).json({ message: "Chỉ áp dụng cho COD hoặc chuyển khoản." });
    }
    if (order.trang_thai_thanh_toan !== "cho_thanh_toan") {
      return res.status(400).json({ message: "Đơn không ở trạng thái chờ thanh toán." });
    }
    order.trang_thai_thanh_toan = "da_thanh_toan";
    await order.save();
    res.json({ message: "Đã xác nhận đã nhận tiền.", order: mapOrder(order) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.markRefunded = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn." });
    if (order.trang_thai_thanh_toan === "hoan_tien") {
      return res.status(400).json({ message: "Đơn đã ở trạng thái hoàn tiền." });
    }
    if (!["da_thanh_toan", "that_bai"].includes(order.trang_thai_thanh_toan)) {
      return res.status(400).json({ message: "Không thể đánh dấu hoàn tiền từ trạng thái hiện tại." });
    }
    order.trang_thai_thanh_toan = "hoan_tien";
    await order.save();
    res.json({ message: "Đã cập nhật trạng thái hoàn tiền.", order: mapOrder(order) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
