const mongoose = require("mongoose");
const User = require("../models/User");

const ROLES = ["khach_hang", "nhan_vien", "admin"];
const TRANG_THAI = ["hoat_dong", "vo_hieu"];

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

exports.listUsers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const filter = {};
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc, "i");
      filter.$or = [{ ho_va_ten: rx }, { email: rx }];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-mat_khau -resetPasswordToken -resetPasswordExpire -token_kich_hoat")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
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
    res.status(500).json({ message: "Lỗi tải danh sách tài khoản." });
  }
};

exports.createUser = async (req, res) => {
  const fail = () => res.status(400).json({ message: "Thêm tài khoản thất bại" });
  try {
    const ho_va_ten = String(req.body.ho_va_ten || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const mat_khau = String(req.body.mat_khau || "");
    const xac_nhan = String(req.body.xac_nhan_mat_khau || "");
    let vai_tro = String(req.body.vai_tro || "khach_hang").trim();
    if (!ROLES.includes(vai_tro)) vai_tro = "khach_hang";

    if (!ho_va_ten || !email || !isEmail(email)) return fail();
    if (!mat_khau || mat_khau.length < 6) return fail();
    if (mat_khau !== xac_nhan) return fail();

    const dup = await User.findOne({ email }).select("_id").lean();
    if (dup) return fail();

    await User.create({
      ho_va_ten,
      email,
      gioi_tinh: "Khac",
      so_dien_thoai: "Chưa cập nhật",
      dia_chi: "",
      mat_khau,
      da_kich_hoat: true,
      vai_tro,
      trang_thai: "hoat_dong",
    });

    res.status(201).json({ message: "Thêm tài khoản thành công" });
  } catch (err) {
    if (err.code === 11000) return fail();
    console.error(err);
    res.status(500).json({ message: "Thêm tài khoản thất bại" });
  }
};

exports.updateUser = async (req, res) => {
  const fail = () => res.status(400).json({ message: "Vui lòng kiểm tra lại thông tin" });
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail();

    const doc = await User.findById(id);
    if (!doc) return res.status(404).json({ message: "Vui lòng kiểm tra lại thông tin" });

    const ho_va_ten = String(req.body.ho_va_ten ?? doc.ho_va_ten).trim();
    const email = String(req.body.email ?? doc.email).trim().toLowerCase();
    let vai_tro = String(req.body.vai_tro ?? doc.vai_tro).trim();
    let trang_thai = String(req.body.trang_thai ?? doc.trang_thai ?? "hoat_dong").trim();

    if (!ho_va_ten || !email || !isEmail(email)) return fail();
    if (!ROLES.includes(vai_tro)) return fail();
    if (!TRANG_THAI.includes(trang_thai)) trang_thai = "hoat_dong";

    const dup = await User.findOne({ email, _id: { $ne: doc._id } }).select("_id").lean();
    if (dup) return fail();

    const actorId = String(req.user._id);
    const targetId = String(doc._id);
    if (actorId === targetId) {
      if (vai_tro !== "admin") return fail();
      if (trang_thai === "vo_hieu") return fail();
    }

    doc.ho_va_ten = ho_va_ten;
    doc.email = email;
    doc.vai_tro = vai_tro;
    doc.trang_thai = trang_thai;
    await doc.save();

    res.json({ message: "Cập nhật tài khoản thành công" });
  } catch (err) {
    if (err.code === 11000) return fail();
    console.error(err);
    res.status(500).json({ message: "Vui lòng kiểm tra lại thông tin" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Không xóa được tài khoản." });
    }

    const doc = await User.findById(id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy tài khoản." });

    if (doc.vai_tro === "admin") {
      return res.status(400).json({ message: "Bạn không thể xóa tài khoản Admin" });
    }

    if (String(doc._id) === String(req.user._id)) {
      return res.status(400).json({ message: "Không thể xóa chính tài khoản đang đăng nhập." });
    }

    await User.deleteOne({ _id: doc._id });
    res.json({ message: "Đã xóa tài khoản." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa tài khoản." });
  }
};
