const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const { tinhTrangSuDung } = require("../services/couponService");

async function bootstrapLegacyCoupons() {
  const end = new Date();
  end.setFullYear(end.getFullYear() + 2);
  const start = new Date();
  start.setMonth(0, 1);
  const rows = [
    { ma: "APR20", mo_ta: "Giảm 20k đơn từ 499k", loai: "tien_mat", gia_tri: 20000, don_toi_thieu: 499000 },
    { ma: "APR60", mo_ta: "Giảm 60k đơn từ 799k", loai: "tien_mat", gia_tri: 60000, don_toi_thieu: 799000 },
    { ma: "APR90", mo_ta: "Giảm 90k đơn từ 1.299k", loai: "tien_mat", gia_tri: 90000, don_toi_thieu: 1299000 },
    { ma: "APR150", mo_ta: "Giảm 150k đơn từ 1.999k", loai: "tien_mat", gia_tri: 150000, don_toi_thieu: 1999000 },
  ];
  for (const r of rows) {
    try {
      await Coupon.create({
        ...r,
        danh_muc_ap_dung: [],
        so_luong: 999999,
        da_su_dung: 0,
        ngay_bat_dau: start,
        ngay_ket_thuc: end,
        hien_thi: true,
      });
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
  }
}

exports.listCoupons = async (req, res) => {
  try {
    let total = await Coupon.countDocuments();
    if (total === 0) {
      await bootstrapLegacyCoupons();
      total = await Coupon.countDocuments();
    }

    const q = String(req.query.q || "").trim();
    const loc = String(req.query.loc || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc, "i");
      filter.$or = [{ ma: rx }, { mo_ta: rx }];
    }

    let all = await Coupon.find(filter).sort({ createdAt: -1 }).lean();
    all = all.map((c) => ({ ...c, tinh_trang: tinhTrangSuDung(c) }));

    if (loc === "con_han") all = all.filter((c) => c.tinh_trang === "con_han");
    else if (loc === "het_han") all = all.filter((c) => c.tinh_trang === "het_han");
    else if (loc === "het_so_luong") all = all.filter((c) => c.tinh_trang === "het_so_luong");

    const filteredTotal = all.length;
    const items = all.slice(skip, skip + limit);

    res.json({
      items,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit) || 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải mã giảm giá." });
  }
};

exports.getCoupon = async (req, res) => {
  try {
    const doc = await Coupon.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Không tìm thấy." });
    res.json({ ...doc, tinh_trang: tinhTrangSuDung(doc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const ma = String(req.body.ma || "").trim().toUpperCase();
    const mo_ta = String(req.body.mo_ta || "").trim();
    const loai = req.body.loai === "phan_tram" ? "phan_tram" : "tien_mat";
    const gia_tri = Number(req.body.gia_tri);
    const don_toi_thieu = Number(req.body.don_toi_thieu) || 0;
    const so_luong = parseInt(req.body.so_luong, 10);
    const ngay_bat_dau = new Date(req.body.ngay_bat_dau);
    const ngay_ket_thuc = new Date(req.body.ngay_ket_thuc);
    const hien_thi = Boolean(req.body.hien_thi);
    const danh_muc_ap_dung = Array.isArray(req.body.danh_muc_ap_dung)
      ? req.body.danh_muc_ap_dung.filter((x) => typeof x === "string" && x.trim())
      : [];

    if (!ma || !mo_ta || Number.isNaN(gia_tri) || gia_tri < 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
    }
    if (Number.isNaN(so_luong) || so_luong < 1) {
      return res.status(400).json({ message: "Số lượng phát hành không hợp lệ." });
    }
    if (Number.isNaN(ngay_bat_dau.getTime()) || Number.isNaN(ngay_ket_thuc.getTime()) || ngay_ket_thuc < ngay_bat_dau) {
      return res.status(400).json({ message: "Khoảng thời gian không hợp lệ." });
    }
    if (loai === "phan_tram" && (gia_tri < 0 || gia_tri > 100)) {
      return res.status(400).json({ message: "Phần trăm phải từ 0 đến 100." });
    }

    await Coupon.create({
      ma,
      mo_ta,
      danh_muc_ap_dung,
      loai,
      gia_tri,
      don_toi_thieu: Math.max(0, don_toi_thieu),
      so_luong,
      da_su_dung: 0,
      ngay_bat_dau,
      ngay_ket_thuc,
      hien_thi,
    });

    res.status(201).json({ message: "Đã tạo mã giảm giá." });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Mã đã tồn tại." });
    console.error(err);
    res.status(500).json({ message: "Lỗi tạo mã." });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }
    const doc = await Coupon.findById(id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy." });

    const ma = String(req.body.ma ?? doc.ma).trim().toUpperCase();
    const mo_ta = String(req.body.mo_ta ?? doc.mo_ta).trim();
    const loai = req.body.loai === "phan_tram" ? "phan_tram" : "tien_mat";
    const gia_tri = Number(req.body.gia_tri ?? doc.gia_tri);
    const don_toi_thieu = Number(req.body.don_toi_thieu ?? doc.don_toi_thieu) || 0;
    const so_luong = parseInt(req.body.so_luong ?? doc.so_luong, 10);
    const ngay_bat_dau = new Date(req.body.ngay_bat_dau ?? doc.ngay_bat_dau);
    const ngay_ket_thuc = new Date(req.body.ngay_ket_thuc ?? doc.ngay_ket_thuc);
    const hien_thi = req.body.hien_thi !== undefined ? Boolean(req.body.hien_thi) : doc.hien_thi;
    const danh_muc_ap_dung = Array.isArray(req.body.danh_muc_ap_dung)
      ? req.body.danh_muc_ap_dung.filter((x) => typeof x === "string" && x.trim())
      : doc.danh_muc_ap_dung || [];

    if (!ma || !mo_ta || Number.isNaN(gia_tri) || gia_tri < 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ." });
    }
    if (Number.isNaN(so_luong) || so_luong < 1 || so_luong < doc.da_su_dung) {
      return res.status(400).json({ message: "Số lượng phát hành không hợp lệ (không nhỏ hơn đã dùng)." });
    }
    if (Number.isNaN(ngay_bat_dau.getTime()) || Number.isNaN(ngay_ket_thuc.getTime()) || ngay_ket_thuc < ngay_bat_dau) {
      return res.status(400).json({ message: "Khoảng thời gian không hợp lệ." });
    }

    const dup = await Coupon.findOne({ ma, _id: { $ne: doc._id } }).select("_id").lean();
    if (dup) return res.status(400).json({ message: "Mã đã tồn tại." });

    doc.ma = ma;
    doc.mo_ta = mo_ta;
    doc.danh_muc_ap_dung = danh_muc_ap_dung;
    doc.loai = loai;
    doc.gia_tri = gia_tri;
    doc.don_toi_thieu = Math.max(0, don_toi_thieu);
    doc.so_luong = so_luong;
    doc.ngay_bat_dau = ngay_bat_dau;
    doc.ngay_ket_thuc = ngay_ket_thuc;
    doc.hien_thi = hien_thi;
    await doc.save();

    res.json({ message: "Đã cập nhật mã giảm giá." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật." });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const doc = await Coupon.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy." });
    res.json({ message: "Đã xóa mã." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa." });
  }
};
