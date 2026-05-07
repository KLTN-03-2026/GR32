import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import ChatbotWidget from "../../components/Chatbot/ChatbotWidget";
import "./Home.css";

const API_URL = `${API_BASE}/api/products`;
const API_COUPONS_DISPLAY = `${API_BASE}/api/coupons/display`;

const Home = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("moi_nhat");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [vouchersErr, setVouchersErr] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    fetchFeaturedProducts("moi_nhat");
    fetchAllProducts();
    let cancelled = false;
    setVouchersErr("");
    axios
      .get(API_COUPONS_DISPLAY)
      .then((res) => {
        if (!cancelled && Array.isArray(res.data)) setVouchers(res.data);
      })
      .catch(() => {
        if (!cancelled) setVouchersErr("Không tải được mã ưu đãi.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchFeaturedProducts = async (tab) => {
    try {
      const res = await axios.get(`${API_URL}?sap_xep=${tab}&limit=8`);
      setFeaturedProducts(res.data.products || []);
    } catch (err) {
      console.error("Lỗi tải sản phẩm nổi bật:", err);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}?limit=8`);
      setAllProducts(res.data.products || []);
    } catch (err) {
      console.error("Lỗi tải tất cả sản phẩm:", err);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchFeaturedProducts(tab);
  };

  const formatPrice = (price) => {
    if (!price) return "0đ";
    return price.toLocaleString("vi-VN") + "đ";
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const copyVoucherCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch {
      window.prompt("Sao chép mã:", code);
    }
  };

  const ProductCard = ({ product }) => (
    <div className="product-card" onClick={() => navigate(`/product/${product._id}`)}>
      <div className="product-img">
        <img src={product.hinh_anh || "https://via.placeholder.com/300x400"} alt={product.ten_san_pham} />
        {product.phan_tram_giam_gia > 0 && (
          <span className="discount-tag">-{product.phan_tram_giam_gia}%</span>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.ten_san_pham}</h3>
        <div className="product-price">
          <span className="current-price">{formatPrice(product.gia_hien_tai)}</span>
          {product.gia_goc > product.gia_hien_tai && (
            <del className="original-price">{formatPrice(product.gia_goc)}</del>
          )}
        </div>
        <div className="product-rating">
          {"★".repeat(Math.round(product.sao_danh_gia || 0))}
          {"☆".repeat(5 - Math.round(product.sao_danh_gia || 0))}
          <span className="rating-count">
            {product.sao_danh_gia || 0} ({product.tong_danh_gia || 0})
          </span>
        </div>
        <button className="add-to-cart" onClick={(e) => { e.stopPropagation(); }}>
          <i className="fas fa-shopping-cart"></i>
        </button>
      </div>
    </div>
  );

  return (
    <div className="home-page">
      <Header />

      <main className="main-content">
        {/* Banner Flash Sale */}
        <section className="banner-section">
          <div className="banner-slide">
            <div className="banner-content">
              <h1>FLASH <span>SALE</span></h1>
              <p className="banner-subtitle">UP TO <strong>50%</strong></p>
              <button className="banner-btn" onClick={() => navigate("/products")}>
                MUA NGAY
              </button>
            </div>
          </div>
        </section>

        {/* Voucher / Ưu đãi */}
        <section className="voucher-section">
          <h2 className="section-title">Ưu đãi</h2>
          {vouchersErr && <p className="voucher-strip-msg voucher-strip-msg--err">{vouchersErr}</p>}
          {!vouchersErr && vouchers.length === 0 && (
            <p className="voucher-strip-msg">Hiện chưa có mã giảm giá đang hiển thị. Vui lòng quay lại sau.</p>
          )}
          <div className="voucher-grid">
            {vouchers.map((v) => (
              <div key={v.code} className="voucher-card">
                <div className="voucher-left">
                  <span className="voucher-code">{v.code}</span>
                </div>
                <div className="voucher-right">
                  <p className="voucher-amount">{v.amountText}</p>
                  <p className="voucher-condition">{v.conditionText}</p>
                  {v.mo_ta ? <p className="voucher-desc">{v.mo_ta}</p> : null}
                  {v.categoryRestricted && v.categoryHint ? (
                    <p className="voucher-note">{v.categoryHint}</p>
                  ) : null}
                  <p className="voucher-meta">Mã: {v.code}</p>
                  <p className="voucher-meta">HSD: {v.expiryText}</p>
                  <button
                    type="button"
                    className="voucher-copy-btn"
                    onClick={() => copyVoucherCode(v.code)}
                  >
                    {copiedCode === v.code ? "Đã chép!" : "Sao chép mã"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sản phẩm nổi bật */}
        <section className="product-section">
          <div className="section-header">
            <h2 className="section-title">Sản phẩm nổi bật</h2>
            <div className="product-tabs">
              {[
                { key: "moi_nhat", label: "Mới nhất" },
                { key: "ban_chay", label: "Bán chạy" },
                { key: "giam_gia", label: "Giảm giá" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => handleTabChange(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((p) => <ProductCard key={p._id} product={p} />)
            ) : (
              <p className="no-products">Chưa có sản phẩm nào.</p>
            )}
          </div>
          <button className="view-all-btn" onClick={() => navigate("/products")}>
            Xem tất cả
          </button>
        </section>

        {/* Tất cả sản phẩm */}
        <section className="product-section">
          <h2 className="section-title">Tất cả sản phẩm</h2>
          <div className="product-grid">
            {allProducts.length > 0 ? (
              allProducts.map((p) => <ProductCard key={p._id} product={p} />)
            ) : (
              <p className="no-products">Chưa có sản phẩm nào.</p>
            )}
          </div>
          <button className="view-all-btn" onClick={() => navigate("/products")}>
            Xem tất cả
          </button>
        </section>
      </main>

      <Footer />

      <ChatbotWidget />

      {/* Scroll to Top */}
      {showScrollTop && (
        <button className="scroll-top-btn" onClick={scrollToTop}>
          <i className="fas fa-arrow-up"></i>
        </button>
      )}
    </div>
  );
};

export default Home;
