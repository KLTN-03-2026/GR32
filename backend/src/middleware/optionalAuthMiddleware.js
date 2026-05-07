const jwt = require("jsonwebtoken");
const User = require("../models/User");

/** Gắn req.user nếu có Bearer hợp lệ; không có token vẫn cho qua. */
module.exports = async function optionalAuthMiddleware(req, res, next) {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id email ho_va_ten vai_tro");
    if (user) req.user = user;
  } catch {
    /* token sai — coi như khách */
  }
  next();
};
