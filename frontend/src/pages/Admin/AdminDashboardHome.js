import axios from "axios";
import { useEffect, useState } from "react";
import API_BASE from "../../config";

const AdminDashboardHome = () => {
  const [stats, setStats] = useState({ products: 0, active: 0, inactive: 0 });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API_BASE}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1 },
      })
      .then((res) => {
        setStats((prev) => ({ ...prev, products: res.data.total }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="admin-home">
      <h2>Tổng quan hệ thống</h2>
      <div className="admin-stats-grid">
        <div className="stat-card">
          <i className="fas fa-box"></i>
          <div className="stat-info">
            <span className="stat-value">{stats.products}</span>
            <span className="stat-label">Sản phẩm</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-receipt"></i>
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">Đơn hàng</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-users"></i>
          <div className="stat-info">
            <span className="stat-value">—</span>
            <span className="stat-label">Khách hàng</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-robot"></i>
          <div className="stat-info">
            <span className="stat-value">AI</span>
            <span className="stat-label">Chatbot</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
