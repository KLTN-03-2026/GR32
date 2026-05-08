import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../../config";
import RevenueChart from "../../components/DashboardCharts/RevenueChart";
import OrderStatusChart from "../../components/DashboardCharts/OrderStatusChart";
import TopProductsChart from "../../components/DashboardCharts/TopProductsChart";
import "./AdminDashboardHome.css";

const formatCurrency = (value) => {
  if (!value) return "0đ";
  if (value >= 1000000000) return (value / 1000000000).toFixed(1) + ' tỷ';
  if (value >= 1000000) return (value / 1000000).toFixed(1) + ' tr';
  return value.toLocaleString() + 'đ';
};

const formatNumber = (value) => {
  return (value || 0).toLocaleString();
};

const AdminDashboardHome = () => {

  const [stats, setStats] = useState({
    keyMetrics: {
      revenue: { today: 0, thisWeek: 0, thisMonth: 0 },
      orders: { today: 0, thisWeek: 0, thisMonth: 0, pending: 0, processing: 0, completed: 0 },
      customers: { total: 0, newThisMonth: 0 },
      products: { total: 0, inStock: 0, lowStock: 0, topSelling: [] },
    },
    revenueChart: [],
    orderStatus: [],
    recentActivities: { orders: [], reviews: [], users: [], pendingChats: 0 },
    alerts: { lowStockProducts: 0, overdueOrders: 0, expiringCoupons: 0 },
    chatbotStats: { sessionsToday: 0, handoverRate: 0, topFaqs: [] },
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API_BASE}/api/admin/reports/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error("Error loading dashboard:", err);
      });
  }, []);

  return (
    <div className="admin-home">
      <h2>Tổng quan hệ thống</h2>

      {/* Key Metrics */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <i className="fas fa-dollar-sign"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.revenue?.today || 0).toLocaleString() + 'đ'}>
              {formatCurrency(stats.keyMetrics?.revenue?.today || 0)}
            </span>
            <span className="stat-label">Doanh thu hôm nay</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-calendar-week"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.revenue?.thisWeek || 0).toLocaleString() + 'đ'}>
              {formatCurrency(stats.keyMetrics?.revenue?.thisWeek || 0)}
            </span>
            <span className="stat-label">Doanh thu tuần này</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-calendar-alt"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.revenue?.thisMonth || 0).toLocaleString() + 'đ'}>
              {formatCurrency(stats.keyMetrics?.revenue?.thisMonth || 0)}
            </span>
            <span className="stat-label">Doanh thu tháng này</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-shopping-cart"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.orders?.today || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.orders?.today || 0)}
            </span>
            <span className="stat-label">Đơn hàng hôm nay</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-clock"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.orders?.pending || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.orders?.pending || 0)}
            </span>
            <span className="stat-label">Đơn chờ xử lý</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-truck"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.orders?.processing || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.orders?.processing || 0)}
            </span>
            <span className="stat-label">Đơn đang giao</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-check-circle"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.orders?.completed || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.orders?.completed || 0)}
            </span>
            <span className="stat-label">Đơn hoàn thành</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-users"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.customers?.total || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.customers?.total || 0)}
            </span>
            <span className="stat-label">Tổng khách hàng</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-user-plus"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.customers?.newThisMonth || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.customers?.newThisMonth || 0)}
            </span>
            <span className="stat-label">Khách mới tháng này</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-box"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.products?.total || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.products?.total || 0)}
            </span>
            <span className="stat-label">Tổng sản phẩm</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-warehouse"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.products?.inStock || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.products?.inStock || 0)}
            </span>
            <span className="stat-label">Đang bán</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-exclamation-triangle"></i>
          <div className="stat-info">
            <span className="stat-value" title={(stats.keyMetrics?.products?.lowStock || 0).toLocaleString()}>
              {formatNumber(stats.keyMetrics?.products?.lowStock || 0)}
            </span>
            <span className="stat-label">Sắp hết hàng</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="dashboard-section">
        <h3>Doanh thu 12 tháng gần nhất</h3>
        <RevenueChart data={stats.revenueChart} />
      </div>

      {/* Order Status & Top Products */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "24px" }}>
        <div className="dashboard-section">
          <h3>Trạng thái đơn hàng</h3>
          <OrderStatusChart data={stats.orderStatus} />
        </div>
        <div className="dashboard-section">
          <h3>Top sản phẩm bán chạy</h3>
          <TopProductsChart data={stats.keyMetrics?.products?.topSelling} />
        </div>
      </div>

      {/* Recent Activities */}
      <div className="dashboard-section">
        <h3>Hoạt động gần đây</h3>
        <div className="recent-activities">
          <div className="activity-column">
            <h4>Đơn hàng mới</h4>
            {(stats.recentActivities?.orders || []).map((order, index) => (
              <div key={index} className="activity-item">
                <span className="activity-title">{order.ma_don}</span>
                <span className="activity-meta">{order.ho_va_ten} - {(order.tong_cong || 0).toLocaleString()}đ</span>
                <span className="activity-status">{order.trang_thai_don}</span>
              </div>
            ))}
          </div>
          <div className="activity-column">
            <h4>Đánh giá mới</h4>
            {(stats.recentActivities?.reviews || []).map((review, index) => (
              <div key={index} className="activity-item">
                <span className="activity-title">{review.ho_ten}</span>
                <span className="activity-meta">{"★".repeat(review.so_sao || 0)} - {review.san_pham_id?.ten_san_pham || "Sản phẩm"}</span>
              </div>
            ))}
          </div>
          <div className="activity-column">
            <h4>Khách hàng mới</h4>
            {(stats.recentActivities?.users || []).map((user, index) => (
              <div key={index} className="activity-item">
                <span className="activity-title">{user.ho_va_ten}</span>
                <span className="activity-meta">{user.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Quick Actions */}
      <div className="dashboard-section">
        <h3>Hành động nhanh</h3>
        <div className="quick-actions">
          <Link to="/admin-dashboard/products" className="action-btn">
            <i className="fas fa-plus"></i> Tạo sản phẩm
          </Link>
          <Link to="/admin-dashboard/coupons" className="action-btn">
            <i className="fas fa-tags"></i> Tạo mã giảm giá
          </Link>
          <Link to="/admin-dashboard/reports" className="action-btn">
            <i className="fas fa-chart-bar"></i> Xem báo cáo
          </Link>
          <Link to="/admin-dashboard/categories" className="action-btn">
            <i className="fas fa-folder"></i> Quản lý danh mục
          </Link>
        </div>
      </div>

      {/* Alerts */}
      <div className="dashboard-section">
        <h3>Cảnh báo</h3>
        <div className="alerts">
          {(stats.alerts?.lowStockProducts || 0) > 0 && (
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle"></i>
              {stats.alerts.lowStockProducts} sản phẩm sắp hết hàng (&lt; 5 cái)
            </div>
          )}
          {(stats.alerts?.overdueOrders || 0) > 0 && (
            <div className="alert alert-danger">
              <i className="fas fa-clock"></i>
              {stats.alerts.overdueOrders} đơn hàng quá hạn xử lý (&gt; 3 ngày)
            </div>
          )}
          {(stats.alerts?.expiringCoupons || 0) > 0 && (
            <div className="alert alert-info">
              <i className="fas fa-calendar-times"></i>
              {stats.alerts.expiringCoupons} voucher sắp hết hạn
            </div>
          )}
          {(stats.alerts?.lowStockProducts || 0) === 0 && (stats.alerts?.overdueOrders || 0) === 0 && (stats.alerts?.expiringCoupons || 0) === 0 && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i>
              Mọi thứ đều ổn! Không có cảnh báo nào.
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Stats */}
      <div className="dashboard-section">
        <h3>Thống kê Chatbot</h3>
        <div className="chatbot-stats">
          <div className="stat-item">
            <span className="stat-label">Phiên chat hôm nay:</span>
            <span className="stat-value">{stats.chatbotStats?.sessionsToday || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tỷ lệ chuyển giao:</span>
            <span className="stat-value">{stats.chatbotStats?.handoverRate || 0}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Phiên chờ hỗ trợ:</span>
            <span className="stat-value">{stats.recentActivities?.pendingChats || 0}</span>
          </div>
        </div>
        {(stats.chatbotStats?.topFaqs || []).length > 0 && (
          <div className="top-faqs">
            <h4>FAQ phổ biến</h4>
            {(stats.chatbotStats?.topFaqs || []).map((faq, index) => (
              <div key={index} className="faq-item">
                <span className="faq-question">{faq.cau_hoi_mau}</span>
                <span className="faq-category">{faq.danh_muc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardHome;
