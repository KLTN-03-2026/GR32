import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "./Admin.css";

const ADMIN_SHELL_SESSION_KEY = "noname_admin_shell_synced";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const shellSyncDone = useRef(false);

  // Tránh bundle JS cũ còn trong bộ nhớ (đã mở trang chủ trước đó): lần đầu vào admin trong tab, reload 1 lần như F5.
  useEffect(() => {
    if (shellSyncDone.current) return;
    try {
      if (sessionStorage.getItem(ADMIN_SHELL_SESSION_KEY) !== "1") {
        shellSyncDone.current = true;
        sessionStorage.setItem(ADMIN_SHELL_SESSION_KEY, "1");
        window.location.reload();
      }
    } catch {
      /* sessionStorage không dùng được — bỏ qua */
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.vai_tro !== "admin" && parsed.vai_tro !== "nhan_vien") {
      navigate("/");
      return;
    }

    setUser(parsed);
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("Bạn muốn đăng xuất?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const path = location.pathname;
  const navActive = (prefix) =>
    prefix === "/admin-dashboard"
      ? path === "/admin-dashboard"
      : path === prefix || path.startsWith(`${prefix}/`);

  if (!user) return null;

  return (
    <div className="admin-wrapper">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <Link to="/admin-dashboard" className="sidebar-logo">
            {sidebarOpen ? "NO NAME" : "NN"}
          </Link>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`fas fa-${sidebarOpen ? "chevron-left" : "chevron-right"}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin-dashboard" className={`sidebar-link ${navActive("/admin-dashboard") ? "active" : ""}`}>
            <i className="fas fa-tachometer-alt"></i>
            {sidebarOpen && <span>Tổng quan</span>}
          </Link>
          <Link to="/admin-dashboard/products" className={`sidebar-link ${navActive("/admin-dashboard/products") ? "active" : ""}`}>
            <i className="fas fa-box"></i>
            {sidebarOpen && <span>Quản lý sản phẩm</span>}
          </Link>
          <Link to="/admin-dashboard/orders" className={`sidebar-link ${navActive("/admin-dashboard/orders") ? "active" : ""}`}>
            <i className="fas fa-receipt"></i>
            {sidebarOpen && <span>Quản lý đơn hàng</span>}
          </Link>
          <Link to="/admin-dashboard/payments" className={`sidebar-link ${navActive("/admin-dashboard/payments") ? "active" : ""}`}>
            <i className="fas fa-money-check-alt"></i>
            {sidebarOpen && <span>Quản lý thanh toán</span>}
          </Link>
          <Link to="/admin-dashboard/users" className={`sidebar-link ${navActive("/admin-dashboard/users") ? "active" : ""}`}>
            <i className="fas fa-users"></i>
            {sidebarOpen && <span>Khách hàng</span>}
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to="/" className="sidebar-link">
            <i className="fas fa-store"></i>
            {sidebarOpen && <span>Về cửa hàng</span>}
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="admin-main">
        <header className="admin-topbar">
          <h3 className="admin-topbar-title">HỆ THỐNG QUẢN TRỊ</h3>
          <div className="admin-topbar-right">
            <span className="admin-user-name">
              <i className="fas fa-user-circle"></i> {user.ho_va_ten}
              <small>({user.vai_tro === "admin" ? "Admin" : "Nhân viên"})</small>
            </span>
            <button className="admin-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
