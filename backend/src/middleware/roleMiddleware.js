const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Bạn chưa đăng nhập!" });
    }

    if (!allowedRoles.includes(req.user.vai_tro)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập chức năng này!" });
    }

    next();
  };
};

module.exports = roleMiddleware;
