import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../config";
import Header from "../../components/Layout/Header";
import "./SearchPage.css";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q");

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/products/search?q=${encodeURIComponent(query)}`,
        );
        setProducts(res.data);
        setFilteredProducts(res.data);
      } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  useEffect(() => {
    let result = [...products];

    if (selectedCategory) {
      result = result.filter((item) => item.danh_muc === selectedCategory);
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => a.gia_hien_tai - b.gia_hien_tai);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.gia_hien_tai - a.gia_hien_tai);
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao));
    }

    setFilteredProducts(result);
  }, [sortBy, selectedCategory, products]);

  return (
    <div className="search-page-container">
      <Header />

      <main className="search-main-content">
        <div className="search-info-header">
          <h2 className="search-title">
            Kết quả cho: <span>"{query}"</span>
          </h2>
          <p className="product-count">
            Hiển thị <strong>{filteredProducts.length}</strong> /{" "}
            {products.length} sản phẩm
          </p>
        </div>

        {/* THANH BỘ LỌC THÔNG MINH */}
        <div className="search-filter-bar">
          <div className="filter-left">
            <span className="filter-label">
              <i className="fas fa-sort-amount-down"></i> Sắp xếp:
            </span>
            <div className="filter-buttons">
              <button
                className={sortBy === "newest" ? "active" : ""}
                onClick={() => setSortBy("newest")}
              >
                Mới nhất
              </button>
              <button
                className={sortBy === "price-asc" ? "active" : ""}
                onClick={() => setSortBy("price-asc")}
              >
                Giá thấp ↑
              </button>
              <button
                className={sortBy === "price-desc" ? "active" : ""}
                onClick={() => setSortBy("price-desc")}
              >
                Giá cao ↓
              </button>
            </div>
          </div>

          <div className="filter-right">
            <select
              className="filter-dropdown"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              <option value="Áo thun">Áo thun / Polo</option>
              <option value="Quần">Quần Jean / Khaki</option>
            </select>

            <select className="filter-dropdown">
              <option value="">Kích cỡ (Size)</option>
              <option value="S">Size S</option>
              <option value="M">Size M</option>
              <option value="L">Size L</option>
            </select>
          </div>
        </div>

        {/* HIỂN THỊ KẾT QUẢ */}
        {loading ? (
          <div className="loading-spinner">Đang tìm kiếm sản phẩm...</div>
        ) : filteredProducts.length > 0 ? (
          <div className="results-grid">
            {filteredProducts.map((item) => (
              <div
                key={item._id}
                className="item-card"
                onClick={() => navigate(`/product/${item._id}`)}
              >
                <div className="item-thumb">
                  <img
                    src={item.hinh_anh || "https://via.placeholder.com/300x400"}
                    alt={item.ten_san_pham}
                  />
                  {item.phan_tram_giam_gia > 0 && (
                    <div className="sale-tag">-{item.phan_tram_giam_gia}%</div>
                  )}
                </div>
                <div className="item-info">
                  <h3 className="item-name">{item.ten_san_pham}</h3>
                  <div className="item-pricing">
                    <span className="new-price">
                      {item.gia_hien_tai?.toLocaleString()}đ
                    </span>
                    {item.gia_goc > item.gia_hien_tai && (
                      <span className="old-price">
                        {item.gia_goc?.toLocaleString()}đ
                      </span>
                    )}
                  </div>
                  <div className="item-meta">
                    <div className="item-stars">
                      {"⭐".repeat(Math.floor(item.sao_danh_gia || 5))}
                      <span className="review-count">
                        ({item.tong_danh_gia || 0})
                      </span>
                    </div>
                    <button className="quick-add-btn">
                      <i className="fas fa-shopping-bag"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-search-state">
            <img
              src="https://cdn-icons-png.flaticon.com/512/6134/6134065.png"
              alt="No results"
            />
            <h3>Hic! NO NAME không tìm thấy rồi...</h3>
            <p>Huy thử tìm từ khóa khác hoặc đổi bộ lọc xem sao nhé!</p>
            <button
              className="back-btn-capsule"
              onClick={() => setSelectedCategory("")}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
