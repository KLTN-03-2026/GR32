import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "./Admin.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

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
          <Link to="/admin-dashboard" className={`sidebar-link ${isActive("/admin-dashboard") && !isActive("/admin-dashboard/products") ? "active" : ""}`}>
            <i className="fas fa-tachometer-alt"></i>
            {sidebarOpen && <span>Tổng quan</span>}
          </Link>
          <Link to="/admin-dashboard/products" className={`sidebar-link ${isActive("/admin-dashboard/products") ? "active" : ""}`}>
            <i className="fas fa-box"></i>
            {sidebarOpen && <span>Quản lý sản phẩm</span>}
          </Link>
          <Link to="/admin-dashboard/orders" className={`sidebar-link ${isActive("/admin-dashboard/orders") ? "active" : ""}`}>
            <i className="fas fa-receipt"></i>
            {sidebarOpen && <span>Đơn hàng</span>}
          </Link>
          <Link to="/admin-dashboard/users" className={`sidebar-link ${isActive("/admin-dashboard/users") ? "active" : ""}`}>
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
