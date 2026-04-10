import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import "./CartPage.css";

const API = `${API_BASE}/api/cart`;

function formatPrice(v) {
  if (!v && v !== 0) return "0";
  return v.toLocaleString("vi-VN");
}

const CartPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const getToken = () => localStorage.getItem("token");

  const fetchCart = useCallback(async () => {
    const token = getToken();
    if (!token) { navigate("/login"); return; }
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data.san_pham || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty < 1) return;
    setUpdating(itemId);
    try {
      const res = await axios.put(`${API}/update`,
        { itemId, so_luong: newQty },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setItems(res.data.cart);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi cập nhật!");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId, tenSp) => {
    if (!window.confirm(`Xóa "${tenSp}" khỏi giỏ hàng?`)) return;
    try {
      const res = await axios.delete(`${API}/remove/${itemId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems(res.data.cart);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xóa sản phẩm!");
    }
  };

  const totalPrice = items.reduce((sum, item) => sum + item.gia * item.so_luong, 0);

  if (loading) {
    return (
      <>
        <Header />
        <div className="cart-loading">Đang tải giỏ hàng...</div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="cart-container">
        <div className="cart-header-row">
          <h2 className="cart-title">Giỏ hàng của bạn</h2>
          <button className="cart-close-btn" onClick={() => navigate(-1)} title="Đóng">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <i className="fas fa-shopping-cart cart-empty-icon"></i>
            <p>Giỏ hàng trống</p>
            <button className="btn-continue-shopping" onClick={() => navigate("/products")}>
              Tiếp tục mua sắm
            </button>
          </div>
        ) : (
          <>
            {/* TABLE HEADER */}
            <div className="cart-table-head">
              <span className="col-product">Sản phẩm</span>
              <span className="col-price">Giá tiền</span>
              <span className="col-qty">Số lượng</span>
              <span className="col-total">Tổng cộng</span>
              <span className="col-action"></span>
            </div>

            {/* ITEM ROWS */}
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item._id}>
                  <div className="col-product">
                    <div className="cart-item-img" onClick={() => navigate(`/product/${item.san_pham_id}`)}>
                      {item.hinh_anh ? (
                        <img src={item.hinh_anh} alt={item.ten_san_pham} />
                      ) : (
                        <div className="cart-no-img"><i className="fas fa-image"></i></div>
                      )}
                    </div>
                    <div className="cart-item-info">
                      <span className="cart-item-name" onClick={() => navigate(`/product/${item.san_pham_id}`)}>
                        {item.ten_san_pham}
                      </span>
                      {(item.mau_sac || item.kich_co) && (
                        <span className="cart-item-variant">
                          {item.mau_sac && `Màu: ${item.mau_sac}`}
                          {item.mau_sac && item.kich_co && " | "}
                          {item.kich_co && `Size: ${item.kich_co}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-price">
                    {formatPrice(item.gia)}đ
                  </div>

                  <div className="col-qty">
                    <div className="cart-qty-control">
                      <button
                        onClick={() => handleUpdateQty(item._id, item.so_luong - 1)}
                        disabled={item.so_luong <= 1 || updating === item._id}
                      >−</button>
                      <span className="cart-qty-value">{item.so_luong}</span>
                      <button
                        onClick={() => handleUpdateQty(item._id, item.so_luong + 1)}
                        disabled={updating === item._id}
                      >+</button>
                    </div>
                  </div>

                  <div className="col-total">
                    {formatPrice(item.gia * item.so_luong)}đ
                  </div>

                  <div className="col-action">
                    <button className="btn-remove-item" onClick={() => handleRemove(item._id, item.ten_san_pham)} title="Xóa">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* SUMMARY */}
            <div className="cart-summary">
              <div className="cart-total-box">
                <span className="cart-total-label">TỔNG CỘNG:</span>
                <span className="cart-total-price">{formatPrice(totalPrice)}đ</span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="cart-bottom-actions">
              <button className="btn-cart-cancel" onClick={() => navigate("/products")}>
                Hủy
              </button>
              <button className="btn-cart-checkout" onClick={() => navigate("/checkout")}>
                Thanh toán
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default CartPage;
