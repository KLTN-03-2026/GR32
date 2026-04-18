const mongoose = require("mongoose");
const Order = require("../models/Order");

const STATUS = ["cho_xu_ly", "dang_giao", "da_giao_hang", "hoan_thanh", "huy"];

/** Luồng: chờ xử lý → đang giao → đã giao hàng → (KH xác nhận) hoàn thành */
const ALLOWED = {
  cho_xu_ly: ["dang_giao", "huy"],
  dang_giao: ["da_giao_hang", "huy"],
  da_giao_hang: ["hoan_thanh", "huy"],
  hoan_thanh: [],
  huy: [],
};

exports.listOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const q = (req.query.q || "").trim();
    const filter = {};
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.ma_don = new RegExp(esc, "i");
    }
    const st = (req.query.trang_thai_don || "").trim();
    if (st && STATUS.includes(st)) filter.trang_thai_don = st;

    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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

exports.patchOrderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { trang_thai_don: nextStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }
    if (!nextStatus || !STATUS.includes(nextStatus)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn." });

    const cur = order.trang_thai_don;
    if (cur === nextStatus) {
      return res.json({ message: "Không thay đổi.", order });
    }

    const ok = ALLOWED[cur]?.includes(nextStatus);
    if (!ok) {
      return res.status(400).json({
        message: `Không thể chuyển từ "${cur}" sang "${nextStatus}".`,
      });
    }

    order.trang_thai_don = nextStatus;
    await order.save();
    res.json({ message: "Đã cập nhật trạng thái đơn hàng.", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
