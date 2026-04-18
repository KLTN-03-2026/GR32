import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_BASE from "../../config";
import { getOrderFlowPath } from "../../checkoutPath";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import "./ProductDetail.css";

const API = `${API_BASE}/api`;

function formatPrice(v) {
  if (!v && v !== 0) return "0";
  return v.toLocaleString("vi-VN");
}

function StarDisplay({ value = 0 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="star-display">
      {"★".repeat(full)}
      {half && <span className="star-half">★</span>}
      {"☆".repeat(empty)}
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mainImg, setMainImg] = useState("");
  const [thumbStart, setThumbStart] = useState(0);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [actionMsg, setActionMsg] = useState({ text: "", type: "" });
  const [cartToast, setCartToast] = useState({ show: false, name: "", qty: 0 });

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data.product);
      setReviews(res.data.reviews || []);
      const p = res.data.product;
      setMainImg((p.danh_sach_anh?.length ? p.danh_sach_anh : [p.hinh_anh])[0] || "");
    } catch { setProduct(null); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); window.scrollTo(0, 0); }, [fetchData]);

  if (loading) return <><Header /><div className="pd-loading">Đang tải...</div><Footer /></>;
  if (!product) return <><Header /><div className="pd-loading">Sản phẩm không tồn tại!</div><Footer /></>;

  const images = product.danh_sach_anh?.length > 0 ? product.danh_sach_anh : product.hinh_anh ? [product.hinh_anh] : [];
  const THUMB_VISIBLE = 6;
  const thumbEnd = Math.min(thumbStart + THUMB_VISIBLE, images.length);

  const hasVariants = (product.bien_the || []).length > 0;
  const colors = [...new Set((product.bien_the || []).map((v) => v.mau_sac).filter(Boolean))];
  const sizesForColor = selectedColor ? (product.bien_the || []).filter((v) => v.mau_sac === selectedColor) : [];

  const chosenVariant = selectedColor && selectedSize
    ? (product.bien_the || []).find((v) => v.mau_sac === selectedColor && v.kich_co === selectedSize)
    : null;

  const maxStock = chosenVariant ? chosenVariant.so_luong : (product.so_luong_ton || 99);
  const isOutOfStock = chosenVariant ? chosenVariant.so_luong <= 0 : false;

  const stockText = chosenVariant
    ? `Còn lại ${chosenVariant.so_luong} sản phẩm (Size ${selectedSize}, ${selectedColor})`
    : selectedColor && !selectedSize ? "Vui lòng chọn kích cỡ"
    : hasVariants && !selectedColor ? "Vui lòng chọn màu sắc và kích cỡ"
    : `Còn lại ${product.so_luong_ton ?? "—"} sản phẩm`;

  const avgStar = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.so_sao, 0) / reviews.length).toFixed(1)
    : product.sao_danh_gia || 0;
  const totalReviews = reviews.length || product.tong_danh_gia || 0;

  const flash = (text, type = "warn") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: "", type: "" }), 3000);
  };

  const handleAddToCart = async () => {
    if (!user) { navigate("/login"); return; }
    if (hasVariants && (!selectedColor || !selectedSize)) return flash("Vui lòng chọn phân loại sản phẩm!");
    if (isOutOfStock) return flash("Sản phẩm đã hết hàng!");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/cart/add`, {
        san_pham_id: product._id,
        mau_sac: selectedColor,
        kich_co: selectedSize,
        so_luong: quantity,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setCartToast({ show: true, name: res.data.ten_san_pham, qty: res.data.so_luong });
      setTimeout(() => setCartToast({ show: false, name: "", qty: 0 }), 4000);

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      flash(err.response?.data?.message || "Lỗi thêm vào giỏ hàng!", "warn");
    }
  };

  const handleBuyNow = async () => {
    if (!user) { navigate("/login"); return; }
    if (hasVariants && (!selectedColor || !selectedSize)) return flash("Vui lòng chọn phân loại sản phẩm!");
    if (isOutOfStock) return flash("Sản phẩm đã hết hàng!");

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/cart/add`, {
        san_pham_id: product._id,
        mau_sac: selectedColor,
        kich_co: selectedSize,
        so_luong: quantity,
      }, { headers: { Authorization: `Bearer ${token}` } });
      window.dispatchEvent(new Event("cartUpdated"));
      navigate(getOrderFlowPath());
    } catch (err) {
      flash(err.response?.data?.message || "Lỗi!", "warn");
    }
  };

  return (
    <>
      <Header />

      {cartToast.show && (
        <div className="cart-toast-overlay">
          <div className="cart-toast">
            <i className="fas fa-check-circle cart-toast-icon"></i>
            <div className="cart-toast-body">
              <strong>Thêm vào giỏ hàng thành công!</strong>
              <p>Sản phẩm [{cartToast.name}] đã được thêm vào giỏ hàng với số lượng {cartToast.qty}.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pd-container">
        {/* BREADCRUMB */}
        <div className="pd-breadcrumb">
          <span onClick={() => navigate("/")}>Trang chủ</span>
          <span className="sep">&gt;</span>
          {product.danh_muc && (<><span>{product.danh_muc}</span><span className="sep">&gt;</span></>)}
          <span className="current">{product.ten_san_pham}</span>
        </div>

        {/* ========== TOP: IMAGE + INFO ========== */}
        <div className="pd-top">
          {/* LEFT: GALLERY */}
          <div className="pd-gallery">
            <div className="pd-main-img">
              {mainImg ? <img src={mainImg} alt={product.ten_san_pham} /> : <div className="pd-no-img"><i className="fas fa-image"></i><p>Không có ảnh</p></div>}
            </div>
            {images.length > 1 && (
              <div className="pd-thumbs">
                {thumbStart > 0 && <button className="thumb-nav" onClick={() => setThumbStart(Math.max(0, thumbStart - 1))}>‹</button>}
                {images.slice(thumbStart, thumbEnd).map((img, i) => (
                  <div key={thumbStart + i} className={`pd-thumb ${img === mainImg ? "active" : ""}`} onClick={() => setMainImg(img)}>
                    <img src={img} alt={`Ảnh ${thumbStart + i + 1}`} />
                  </div>
                ))}
                {thumbEnd < images.length && <button className="thumb-nav" onClick={() => setThumbStart(Math.min(images.length - THUMB_VISIBLE, thumbStart + 1))}>›</button>}
              </div>
            )}
          </div>

          {/* RIGHT: INFO + VARIANTS + BUY */}
          <div className="pd-info">
            <h1 className="pd-name">{product.ten_san_pham}</h1>

            <div className="pd-meta-row">
              {product.thuong_hieu && <span className="pd-brand">Thương hiệu: <strong>{product.thuong_hieu}</strong></span>}
              <span className="pd-rating-mini"><StarDisplay value={Number(avgStar)} /> {avgStar}/5 <span className="gray">({totalReviews} đánh giá)</span></span>
              <span className="pd-sold">Đã bán: <strong>{product.so_luong_da_ban || 0}</strong></span>
            </div>

            {/* PRICE */}
            <div className="pd-price-box">
              {product.phan_tram_giam_gia > 0 ? (
                <>
                  <span className="pd-old-price">{formatPrice(product.gia_goc)}đ</span>
                  <span className="pd-sale-price">{formatPrice(product.gia_hien_tai)}đ</span>
                  <span className="pd-discount-badge">-{product.phan_tram_giam_gia}% GIẢM</span>
                </>
              ) : (
                <span className="pd-sale-price">{formatPrice(product.gia_hien_tai || product.gia_goc)}đ</span>
              )}
            </div>

            {product.mo_ta && <p className="pd-desc">{product.mo_ta}</p>}

            {/* VARIANTS */}
            <div className="pd-variants">
              {hasVariants ? (
                <>
                  <div className="pv-row">
                    <span className="pv-label">Màu sắc:</span>
                    <div className="pv-options">
                      {colors.map((c) => (
                        <button key={c} className={`pv-color-btn ${selectedColor === c ? "active" : ""}`}
                          onClick={() => { setSelectedColor(c); setSelectedSize(""); setQuantity(1); }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pv-row">
                    <span className="pv-label">Kích thước:</span>
                    <div className="pv-options">
                      {(selectedColor ? sizesForColor : (product.bien_the || []).filter((v, i, a) => a.findIndex(x => x.kich_co === v.kich_co) === i))
                        .map((v) => {
                          const out = v.so_luong <= 0;
                          const disabled = !selectedColor || out;
                          return (
                            <button key={v.kich_co} disabled={disabled}
                              className={`pv-size-btn ${selectedSize === v.kich_co ? "active" : ""} ${out ? "out" : ""} ${!selectedColor ? "dimmed" : ""}`}
                              onClick={() => !disabled && setSelectedSize(v.kich_co)}
                              title={!selectedColor ? "Hãy chọn màu trước" : ""}>
                              {v.kich_co}
                              {selectedColor && !out && <small className="avail">Available</small>}
                              {out && <small className="sold-out">Hết hàng</small>}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="pv-no-data">Sản phẩm chưa có phân loại.</p>
              )}
              <p className="pv-stock">{stockText}</p>
            </div>

            {/* QUANTITY */}
            <div className="pd-quantity-row">
              <span className="pv-label">Số lượng:</span>
              <div className="qty-control">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>−</button>
                <input type="number" min="1" max={maxStock} value={quantity}
                  onChange={(e) => { const v = parseInt(e.target.value) || 1; setQuantity(Math.min(maxStock, Math.max(1, v))); }} />
                <button onClick={() => setQuantity(Math.min(maxStock, quantity + 1))} disabled={quantity >= maxStock}>+</button>
              </div>
              {chosenVariant && <span className="qty-available">{chosenVariant.so_luong} sản phẩm có sẵn</span>}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pd-actions">
              <button className="btn-add-cart" onClick={handleAddToCart} disabled={isOutOfStock}>
                <i className="fas fa-cart-plus"></i> Thêm Vào Giỏ Hàng
              </button>
              <button className="btn-buy-now" onClick={handleBuyNow} disabled={isOutOfStock}>
                Mua Ngay
              </button>
            </div>

            {actionMsg.text && (
              <div className={`pd-action-toast ${actionMsg.type}`}>{actionMsg.text}</div>
            )}
          </div>
        </div>

        {/* ========== BOTTOM: DETAILS + REVIEWS ========== */}
        <div className="pd-bottom">
          {/* CHI TIẾT SẢN PHẨM */}
          <div className="pd-section">
            <div className="pd-section-title">CHI TIẾT SẢN PHẨM</div>
            <table className="pd-attr-table">
              <tbody>
                <tr><td>Danh mục</td><td>{product.danh_muc || "—"}</td></tr>
                <tr><td>Thương hiệu</td><td>{product.thuong_hieu || "—"}</td></tr>
                <tr><td>Chất liệu vải</td><td>{product.chat_lieu || "Đang cập nhật"}</td></tr>
                <tr><td>Kiểu dáng</td><td>{product.kieu_dang || "Đang cập nhật"}</td></tr>
                <tr><td>Hướng dẫn bảo quản</td><td>{product.huong_dan_bao_quan || "Đang cập nhật"}</td></tr>
                <tr><td>Kho hàng</td><td>{product.so_luong_ton ?? "—"} sản phẩm</td></tr>
              </tbody>
            </table>
          </div>

          {/* MÔ TẢ SẢN PHẨM */}
          {product.mo_ta && (
            <div className="pd-section">
              <div className="pd-section-title">MÔ TẢ SẢN PHẨM</div>
              <p className="pd-section-text">{product.mo_ta}</p>
            </div>
          )}

          {/* ĐÁNH GIÁ SẢN PHẨM */}
          <div className="pd-section">
            <div className="pd-section-title">ĐÁNH GIÁ SẢN PHẨM</div>

            <div className="pd-review-overview">
              <div className="rv-score-box">
                <span className="rv-big-score">{avgStar}</span>
                <span className="rv-out-of">/5</span>
                <div><StarDisplay value={Number(avgStar)} /></div>
                <span className="rv-total">{totalReviews} đánh giá</span>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="pd-reviews-list">
                {reviews.map((r) => (
                  <div className="pd-review-item" key={r._id}>
                    <div className="rv-top">
                      <span className="rv-avatar">{(r.ho_ten || "K")[0].toUpperCase()}</span>
                      <div className="rv-info">
                        <strong className="rv-name">{r.ho_ten}</strong>
                        <StarDisplay value={r.so_sao} />
                      </div>
                      <span className="rv-date">{new Date(r.ngay_tao).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <p className="rv-content">{r.noi_dung}</p>
                    {r.phan_hoi_shop && String(r.phan_hoi_shop).trim() !== "" && (
                      <div className="rv-shop-reply">
                        <span className="rv-shop-label">Phản hồi của shop</span>
                        <p>{r.phan_hoi_shop}</p>
                      </div>
                    )}
                    {Array.isArray(r.tags) && r.tags.length > 0 && (
                      <div className="rv-tags">
                        {r.tags.map((t) => (
                          <span key={t} className="rv-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-reviews">Chưa có đánh giá nào cho sản phẩm này.</p>
            )}

            <p className="pd-review-policy">
              Đánh giá sản phẩm chỉ gửi được từ{" "}
              <strong onClick={() => navigate("/orders")} className="pd-policy-link">
                Quản lý đơn hàng
              </strong>{" "}
              sau khi đơn <strong>hoàn thành</strong> (bạn đã xác nhận nhận hàng). Mỗi sản phẩm trong đơn
              được đánh giá một lần.
            </p>
            {!user && (
              <p className="wr-msg">
                <span className="wr-login-link" onClick={() => navigate("/login")}>
                  Đăng nhập
                </span>{" "}
                để theo dõi đơn và đánh giá.
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
