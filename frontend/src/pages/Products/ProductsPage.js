import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import "./ProductsPage.css";

const API_URL = `${API_BASE}/api/products`;

const CATEGORIES = ["Trang phục nam", "Trang phục nữ"];
const SIZES = ["S", "M", "L", "XL"];
const COLORS_DEFAULT = ["Trắng", "Đen", "Hồng", "Xanh"];
const COLORS_EXTRA = ["Nâu", "Xám", "Đỏ", "Vàng"];

const ProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState("moi_nhat");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [showMoreColors, setShowMoreColors] = useState(false);

  const fetchProducts = async () => {
    try {
      let url = `${API_URL}?page=${page}&sap_xep=${sortBy}`;
      if (selectedCategory) url += `&danh_muc=${encodeURIComponent(selectedCategory)}`;
      if (selectedSizes.length) url += `&kich_co=${selectedSizes.join(",")}`;
      if (selectedColors.length) url += `&mau_sac=${selectedColors.join(",")}`;

      const res = await axios.get(url);
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalProducts(res.data.totalProducts || 0);
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, sortBy, selectedCategory, selectedSizes, selectedColors]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, selectedCategory, selectedSizes, selectedColors]);

  const toggleCategory = (cat) => {
    setSelectedCategory((prev) => (prev === cat ? "" : cat));
  };

  const toggleFilter = (value, selected, setSelected) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const formatPrice = (price) => {
    if (!price) return "0đ";
    return price.toLocaleString("vi-VN") + "đ";
  };

  const visibleColors = showMoreColors
    ? [...COLORS_DEFAULT, ...COLORS_EXTRA]
    : COLORS_DEFAULT;

  return (
    <div className="products-page">
      <Header />

      <div className="products-layout">
        {/* SIDEBAR BỘ LỌC */}
        <aside className="filter-sidebar">
          <h3><i className="fas fa-filter"></i> BỘ LỌC TÌM KIẾM</h3>

          <div className="filter-group">
            <p className="filter-title">Theo danh mục</p>
            {CATEGORIES.map((cat) => (
              <label key={cat} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedCategory === cat}
                  onChange={() => toggleCategory(cat)}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <p className="filter-title">Kích cỡ</p>
            {SIZES.map((size) => (
              <label key={size} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size)}
                  onChange={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                />
                <span>Size {size}</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <p className="filter-title">Màu sắc</p>
            {visibleColors.map((color) => (
              <label key={color} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColors.includes(color)}
                  onChange={() => toggleFilter(color, selectedColors, setSelectedColors)}
                />
                <span>{color}</span>
              </label>
            ))}
            <button
              className="show-more-btn"
              onClick={() => setShowMoreColors(!showMoreColors)}
            >
              {showMoreColors ? "Thu gọn ▲" : "Thêm ▼"}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="products-main">
          <div className="results-header">
            <p>
              Kết quả tìm kiếm: <strong>{totalProducts}</strong> sản phẩm
            </p>
          </div>

          {/* THANH SẮP XẾP */}
          <div className="sort-toolbar">
            <div className="sort-left">
              <span>Sắp xếp theo</span>
              {[
                { key: "moi_nhat", label: "Mới Nhất" },
                { key: "ban_chay", label: "Bán Chạy" },
              ].map((s) => (
                <button
                  key={s.key}
                  className={sortBy === s.key ? "active" : ""}
                  onClick={() => setSortBy(s.key)}
                >
                  {s.label}
                </button>
              ))}
              <select
                value={sortBy === "gia_tang" || sortBy === "gia_giam" ? sortBy : ""}
                onChange={(e) => e.target.value && setSortBy(e.target.value)}
              >
                <option value="">Giá</option>
                <option value="gia_tang">Giá: Thấp → Cao</option>
                <option value="gia_giam">Giá: Cao → Thấp</option>
              </select>
            </div>

            <div className="pagination-controls">
              <span>{page}/{totalPages}</span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                &lt;
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                &gt;
              </button>
            </div>
          </div>

          {/* GRID SẢN PHẨM */}
          <div className="products-grid">
            {products.length > 0 ? (
              products.map((item) => (
                <div
                  key={item._id}
                  className="p-card"
                  onClick={() => navigate(`/product/${item._id}`)}
                >
                  <div className="p-card-img">
                    <img
                      src={item.hinh_anh || "https://via.placeholder.com/300x400"}
                      alt={item.ten_san_pham}
                    />
                    {item.phan_tram_giam_gia > 0 && (
                      <span className="p-sale-tag">-{item.phan_tram_giam_gia}%</span>
                    )}
                  </div>
                  <div className="p-card-info">
                    <h4 className="p-card-name">{item.ten_san_pham}</h4>
                    <div className="p-card-price">
                      <span className="p-current">{formatPrice(item.gia_hien_tai)}</span>
                      {item.gia_goc > item.gia_hien_tai && (
                        <del className="p-original">{formatPrice(item.gia_goc)}</del>
                      )}
                      {item.phan_tram_giam_gia > 0 && (
                        <span className="p-discount">{item.phan_tram_giam_gia}% off</span>
                      )}
                    </div>
                    <div className="p-card-meta">
                      <div className="p-rating">
                        {"★".repeat(Math.round(item.sao_danh_gia || 0))}
                        {"☆".repeat(5 - Math.round(item.sao_danh_gia || 0))}
                        <span>{item.sao_danh_gia || 0} ({item.tong_danh_gia || 0})</span>
                      </div>
                      <button
                        className="p-add-cart"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <i className="fas fa-shopping-cart"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-products-msg">
                <i className="fas fa-box-open"></i>
                <p>Không tìm thấy sản phẩm nào.</p>
              </div>
            )}
          </div>

          {/* PAGINATION BOTTOM */}
          {totalPages > 1 && (
            <div className="pagination-bottom">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={page === p ? "active" : ""}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ProductsPage;
