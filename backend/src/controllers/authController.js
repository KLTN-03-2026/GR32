const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { normalizeVnPhone10, PHONE_INVALID_MSG } = require("../utils/vnPhone");

// --- 1. ĐĂNG KÝ ---
exports.register = async (req, res) => {
  try {
    const { ho_va_ten, email, gioi_tinh, so_dien_thoai, mat_khau } = req.body;

    if (!mat_khau || mat_khau.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    const ho = String(ho_va_ten || "").trim();
    const em = String(email || "").trim().toLowerCase();
    const gt = String(gioi_tinh || "").trim();
    const phoneNorm = normalizeVnPhone10(so_dien_thoai);
    if (!ho || !em || !gt) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin." });
    }
    if (!phoneNorm) {
      return res.status(400).json({ message: PHONE_INVALID_MSG });
    }

    const userExists = await User.findOne({ email: em });
    if (userExists)
      return res.status(400).json({ message: "Email đã tồn tại!" });

    const token_kich_hoat = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      ho_va_ten: ho,
      email: em,
      gioi_tinh: gt,
      so_dien_thoai: phoneNorm,
      mat_khau,
      da_kich_hoat: false,
      token_kich_hoat,
    });

    const activateUrl = `http://localhost:3000/activate/${token_kich_hoat}`;
    await sendEmail({
      email: user.email,
      subject: "Kích hoạt tài khoản NO NAME",
      message: `Xin chào ${user.ho_va_ten},\n\nVui lòng nhấn vào link sau để kích hoạt tài khoản của bạn:\n${activateUrl}\n\nLink có hiệu lực trong 24 giờ.\n\nNO NAME Shop`,
    });

    res.status(201).json({
      message: "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi đăng ký!" });
  }
};

// --- 1.1. KÍCH HOẠT TÀI KHOẢN ---
exports.activateAccount = async (req, res) => {
  try {
    const user = await User.findOne({ token_kich_hoat: req.params.token });

    if (!user) {
      return res.status(400).json({ message: "Link kích hoạt không hợp lệ hoặc đã được sử dụng!" });
    }

    if (user.da_kich_hoat) {
      return res.status(200).json({ message: "Tài khoản đã được kích hoạt trước đó!" });
    }

    user.da_kich_hoat = true;
    user.token_kich_hoat = undefined;
    await user.save();

    res.status(200).json({ message: "Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi kích hoạt tài khoản!" });
  }
};

// --- 1.2. GỬI LẠI EMAIL KÍCH HOẠT ---
exports.resendActivation = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại trong hệ thống!" });
    }

    if (user.da_kich_hoat) {
      return res.status(400).json({ message: "Tài khoản đã được kích hoạt rồi!" });
    }

    const token_kich_hoat = crypto.randomBytes(32).toString("hex");
    user.token_kich_hoat = token_kich_hoat;
    await user.save();

    const activateUrl = `http://localhost:3000/activate/${token_kich_hoat}`;
    await sendEmail({
      email: user.email,
      subject: "Gửi lại link kích hoạt - NO NAME",
      message: `Xin chào ${user.ho_va_ten},\n\nVui lòng nhấn vào link sau để kích hoạt tài khoản:\n${activateUrl}\n\nNO NAME Shop`,
    });

    res.status(200).json({ message: "Email kích hoạt đã được gửi lại!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi gửi lại email!" });
  }
};

// --- 2. ĐĂNG NHẬP ---
exports.login = async (req, res) => {
  try {
    const { email, mat_khau } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.mat_khau !== mat_khau) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không đúng!" });
    }

    if (!user.da_kich_hoat) {
      return res
        .status(403)
        .json({ message: "Tài khoản chưa được kích hoạt! Vui lòng kiểm tra email." });
    }

    if (user.trang_thai === "vo_hieu") {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa." });
    }

    const token = jwt.sign(
      { id: user._id, vai_tro: user.vai_tro },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        _id: user._id,
        ho_va_ten: user.ho_va_ten,
        email: user.email,
        vai_tro: user.vai_tro,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi đăng nhập!" });
  }
};

// --- 2.1. LẤY THÔNG TIN CÁ NHÂN ---
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-mat_khau -resetPasswordToken -resetPasswordExpire -token_kich_hoat");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

// --- 2.2. CẬP NHẬT THÔNG TIN CÁ NHÂN ---
exports.updateProfile = async (req, res) => {
  try {
    const { ho_va_ten, so_dien_thoai, dia_chi } = req.body;

    const ho = String(ho_va_ten || "").trim();
    const dc = String(dia_chi || "").trim();
    const phoneNorm = normalizeVnPhone10(so_dien_thoai);

    if (!ho || !dc) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin." });
    }
    if (!phoneNorm) {
      return res.status(400).json({ message: PHONE_INVALID_MSG });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    user.ho_va_ten = ho;
    user.so_dien_thoai = phoneNorm;
    user.dia_chi = dc;
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.mat_khau;
    delete updatedUser.resetPasswordToken;
    delete updatedUser.resetPasswordExpire;
    delete updatedUser.token_kich_hoat;

    res.status(200).json({
      message: "Thông tin cá nhân đã được cập nhật thành công!",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

// --- 2.3. ĐỔI MẬT KHẨU (Khi đã đăng nhập) ---
exports.changePassword = async (req, res) => {
  try {
    const { mat_khau_cu, mat_khau_moi, xac_nhan_mat_khau } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    if (user.mat_khau !== mat_khau_cu) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng." });
    }

    if (!mat_khau_moi || mat_khau_moi.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    if (mat_khau_moi !== xac_nhan_mat_khau) {
      return res.status(400).json({ message: "Mật khẩu mới không khớp." });
    }

    user.mat_khau = mat_khau_moi;
    await user.save();

    res.status(200).json({ message: "Mật khẩu đã được thay đổi thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

// --- 3. QUÊN MẬT KHẨU (Gửi mail) ---
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: "Email không tồn tại!" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // Hạn 60 phút

    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: "Khôi phục mật khẩu NO NAME",
      message: `Nhấn vào link để đổi mật khẩu: ${resetUrl}`,
    });

    res.status(200).json({ message: "Email đã được gửi!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi gửi mail!" });
  }
};

// --- 4. ĐẶT LẠI MẬT KHẨU (Lưu vào DB) ---
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Link không hợp lệ hoặc đã hết hạn!" });
    }

    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    user.mat_khau = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi Server!" });
  }
};
