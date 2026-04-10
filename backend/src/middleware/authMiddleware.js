const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Bạn chưa đăng nhập!" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-mat_khau -resetPasswordToken -resetPasswordExpire -token_kich_hoat");
    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại!" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

module.exports = authMiddleware;
