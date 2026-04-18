const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { refreshProductRating } = require("./orderController");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Đánh giá còn trong hệ thống (không đếm đã xóa mềm) */
function notDeletedFilter() {
  return { trang_thai: { $ne: "da_xoa" } };
}

/** Đang hiển thị trên web (gồm bản ghi cũ chưa có field trang_thai) */
function visibleOnSiteFilter() {
  return {
    ...notDeletedFilter(),
    $nor: [{ trang_thai: "an" }],
  };
}

exports.getStats = async (req, res) => {
  try {
    const nd = notDeletedFilter();
    const vis = visibleOnSiteFilter();
    const [tong, dang_hien_thi, da_an, cho_xu_ly] = await Promise.all([
      Review.countDocuments(nd),
      Review.countDocuments(vis),
      Review.countDocuments({ trang_thai: "an" }),
      Review.countDocuments({
        ...vis,
        $or: [{ phan_hoi_shop: { $exists: false } }, { phan_hoi_shop: null }, { phan_hoi_shop: "" }],
      }),
    ]);

    res.json({
      tong_danh_gia: tong,
      dang_hien_thi,
      cho_xu_ly,
      da_an,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi thống kê đánh giá." });
  }
};

exports.listReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const trangThai = String(req.query.trang_thai || "").trim();
    const soSaoRaw = req.query.so_sao;
    const q = String(req.query.q || "").trim();

    let filter;
    if (trangThai === "an") {
      filter = { trang_thai: "an" };
    } else if (trangThai === "hien_thi") {
      filter = { ...visibleOnSiteFilter() };
    } else {
      filter = { ...notDeletedFilter() };
    }

    const star = soSaoRaw !== undefined && soSaoRaw !== "" ? Number(soSaoRaw) : null;
    if (star !== null && !Number.isNaN(star) && star >= 1 && star <= 5) {
      filter.so_sao = star;
    }

    if (q) {
      const esc = escapeRegex(q);
      const rx = new RegExp(esc, "i");
      const [productIds, orderIds] = await Promise.all([
        Product.find({ ten_san_pham: rx }).distinct("_id"),
        Order.find({ ma_don: rx }).distinct("_id"),
      ]);
      const or = [{ ho_ten: rx }, { noi_dung: rx }];
      if (productIds.length) or.push({ san_pham_id: { $in: productIds } });
      if (orderIds.length) or.push({ don_hang_id: { $in: orderIds } });
      filter.$or = or;
    }

    const [items, total] = await Promise.all([
      Review.find(filter)
        .populate("san_pham_id", "ten_san_pham hinh_anh")
        .populate("don_hang_id", "ma_don")
        .sort({ ngay_tao: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
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
    res.status(500).json({ message: "Lỗi tải danh sách đánh giá." });
  }
};

exports.patchReview = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    const { phan_hoi_shop, trang_thai } = req.body || {};
    const update = {};

    if (phan_hoi_shop !== undefined) {
      const text = String(phan_hoi_shop).trim().slice(0, 2000);
      update.phan_hoi_shop = text;
      update.ngay_phan_hoi = text ? new Date() : null;
    }

    if (trang_thai !== undefined) {
      if (!["hien_thi", "an"].includes(trang_thai)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      }
      update.trang_thai = trang_thai;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu cập nhật." });
    }

    const doc = await Review.findOneAndUpdate(
      { _id: id, trang_thai: { $ne: "da_xoa" } },
      { $set: update },
      { new: true },
    )
      .populate("san_pham_id", "ten_san_pham")
      .populate("don_hang_id", "ma_don");

    if (!doc) return res.status(404).json({ message: "Không tìm thấy đánh giá." });

    await refreshProductRating(doc.san_pham_id._id || doc.san_pham_id);

    res.json({ message: "Đã cập nhật.", review: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật đánh giá." });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    const doc = await Review.findOneAndUpdate(
      { _id: id, trang_thai: { $ne: "da_xoa" } },
      { $set: { trang_thai: "da_xoa" } },
      { new: true },
    ).lean();

    if (!doc) return res.status(404).json({ message: "Không tìm thấy đánh giá." });

    await refreshProductRating(doc.san_pham_id);

    res.json({ message: "Đã xóa đánh giá." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa đánh giá." });
  }
};
