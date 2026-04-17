import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import {
  iconTrangThaiDon,
  labelHinhThucThanhToan,
  labelTrangThaiDon,
} from "./orderLabels";
import "./MyOrdersPage.css";

const API = `${API_BASE}/api/orders/mine`;

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "0";
  return `${Number(n).toLocaleString("vi-VN")}đ`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_OPTIONS = [
  { value: "", label: "[Tất cả]" },
  { value: "cho_xu_ly", label: "Đang xử lý" },
  { value: "dang_giao", label: "Đang giao" },
  { value: "hoan_thanh", label: "Hoàn thành" },
  { value: "huy", label: "Đã hủy" },
];

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [tongMin, setTongMin] = useState("");
  const [tongMax, setTongMax] = useState("");

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate("/login", { state: { from: "/orders" } });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit,
          q: searchQ || undefined,
          trang_thai_don: statusFilter || undefined,
          sort: sortField,
          order: sortOrder,
          tong_min: tongMin.trim() !== "" ? tongMin : undefined,
          tong_max: tongMax.trim() !== "" ? tongMax : undefined,
        },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/orders" } });
        return;
      }
      setError(err.response?.data?.message || "Không tải được danh sách đơn hàng.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [navigate, page, limit, searchQ, statusFilter, sortField, sortOrder, tongMin, tongMax]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [searchQ, statusFilter, sortField, sortOrder, tongMin, tongMax]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit) || 1),
    [total, limit],
  );

  const toggleSort = (field) => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder("desc");
      return;
    }
    setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
  };

  const sortHint = (field) => {
    if (sortField !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <>
      <Header />
      <div className="my-orders-page">
        <div className="my-orders-inner">
          <h1 className="my-orders-title">Quản lý đơn hàng</h1>

          <div className="my-orders-toolbar">
            <select
              className="my-orders-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="search"
              className="my-orders-search"
              placeholder="Mã đơn hàng..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <div className="my-orders-range">
              <span className="my-orders-range-label">Tổng tiền</span>
              <input
                type="number"
                min={0}
                className="my-orders-num"
                placeholder="Từ"
                value={tongMin}
                onChange={(e) => setTongMin(e.target.value)}
                aria-label="Tổng tiền tối thiểu"
              />
              <span className="my-orders-range-dash">—</span>
              <input
                type="number"
                min={0}
                className="my-orders-num"
                placeholder="Đến"
                value={tongMax}
                onChange={(e) => setTongMax(e.target.value)}
                aria-label="Tổng tiền tối đa"
              />
            </div>
          </div>

          {error && <p className="my-orders-error">{error}</p>}

          {loading ? (
            <p className="my-orders-loading">Đang tải...</p>
          ) : items.length === 0 ? (
            <div className="my-orders-empty">
              <p>Bạn chưa có đơn hàng nào hoặc không khớp bộ lọc.</p>
              <Link to="/products" className="my-orders-link-shop">
                Mua sắm ngay
              </Link>
            </div>
          ) : (
            <>
              <div className="my-orders-table-wrap">
                <table className="my-orders-table">
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="my-orders-th-btn"
                          onClick={() => toggleSort("ma_don")}
                        >
                          Mã đơn hàng <span className="sort-mark">{sortHint("ma_don")}</span>
                        </button>
                      </th>
                      <th>Ngày đặt</th>
                      <th>
                        <button
                          type="button"
                          className="my-orders-th-btn"
                          onClick={() => toggleSort("tong_cong")}
                        >
                          Tổng tiền <span className="sort-mark">{sortHint("tong_cong")}</span>
                        </button>
                      </th>
                      <th>Địa chỉ nhận hàng</th>
                      <th>Thanh toán</th>
                      <th>
                        <button
                          type="button"
                          className="my-orders-th-btn"
                          onClick={() => toggleSort("trang_thai_don")}
                        >
                          Trạng thái <span className="sort-mark">{sortHint("trang_thai_don")}</span>
                        </button>
                      </th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row._id}>
                        <td className="td-ma">
                          <span className="ma-don">#{row.ma_don}</span>
                        </td>
                        <td>{formatDate(row.createdAt)}</td>
                        <td className="td-money">{formatMoney(row.tong_cong)}</td>
                        <td className="td-address">{row.dia_chi_chi_tiet || "—"}</td>
                        <td>{labelHinhThucThanhToan(row.hinh_thuc_thanh_toan)}</td>
                        <td>
                          <span className={`order-status-pill st-${row.trang_thai_don}`}>
                            <i className={`fas ${iconTrangThaiDon(row.trang_thai_don)}`} />
                            {labelTrangThaiDon(row.trang_thai_don)}
                          </span>
                        </td>
                        <td>
                          <Link to={`/orders/${row._id}`} className="my-orders-detail-link">
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="my-orders-pager">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <span>
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MyOrdersPage;
