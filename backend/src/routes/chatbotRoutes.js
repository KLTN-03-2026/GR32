const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/chatbotController");
const adminCtrl = require("../controllers/chatbotAdminController");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.post("/session", optionalAuth, ctrl.createSession);
router.get("/session/:token", optionalAuth, ctrl.getSession);
router.post("/message", optionalAuth, ctrl.postMessage);

router.get("/handoffs", authMiddleware, roleMiddleware("admin", "nhan_vien"), ctrl.listHandoffs);

/** PB23 — FAQ: chỉ admin */
router.get("/admin/faq", authMiddleware, roleMiddleware("admin"), adminCtrl.listFaq);
router.post("/admin/faq", authMiddleware, roleMiddleware("admin"), adminCtrl.createFaq);
router.put("/admin/faq/:id", authMiddleware, roleMiddleware("admin"), adminCtrl.updateFaq);
router.delete("/admin/faq/:id", authMiddleware, roleMiddleware("admin"), adminCtrl.deleteFaq);

/** PB23 — Live chat: admin + nhân viên */
router.get("/admin/sessions", authMiddleware, roleMiddleware("admin", "nhan_vien"), adminCtrl.listSessions);
router.get("/admin/sessions/:token", authMiddleware, roleMiddleware("admin", "nhan_vien"), adminCtrl.getSessionAdmin);
router.post(
  "/admin/sessions/:token/takeover",
  authMiddleware,
  roleMiddleware("admin", "nhan_vien"),
  adminCtrl.takeoverSession,
);
router.post(
  "/admin/sessions/:token/end-support",
  authMiddleware,
  roleMiddleware("admin", "nhan_vien"),
  adminCtrl.endSupport,
);
router.post(
  "/admin/sessions/:token/message",
  authMiddleware,
  roleMiddleware("admin", "nhan_vien"),
  adminCtrl.staffMessage,
);
router.delete(
  "/admin/sessions/:token",
  authMiddleware,
  roleMiddleware("admin", "nhan_vien"),
  adminCtrl.deleteSession,
);

module.exports = router;
