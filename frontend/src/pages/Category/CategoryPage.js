import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import "./CategoryPage.css";

const API_URL = `${API_BASE}/api/products`;

const CATEGORY_MAP = {
  "ao-thun-nam": { name: "Áo thun nam", parent: "Thời trang Nam", dbValue: "Áo thun nam" },
  "ao-polo-nam": { name: "Áo polo nam", parent: "Thời trang Nam", dbValue: "Áo polo nam" },
  "quan-jean-nam": { name: "Quần jean nam", parent: "Thời trang Nam", dbValue: "Quần jean nam" },
  "quan-short-nam": { name: "Quần short nam", parent: "Thời trang Nam", dbValue: "Quần short nam" },
  "ao-thun-nu": { name: "Áo thun nữ", parent: "Thời trang Nữ", dbValue: "Áo thun nữ" },
  "dam-vay": { name: "Đầm / Váy", parent: "Thời trang Nữ", dbValue: "Đầm / Váy" },
  "quan-nu": { name: "Quần nữ", parent: "Thời trang Nữ", dbValue: "Quần nữ" },
  "ao-khoac-nu": { name: "Áo khoác nữ", parent: "Thời trang Nữ", dbValue: "Áo khoác nữ" },
  "mu-non": { name: "Mũ / Nón", parent: "Phụ kiện", dbValue: "Mũ / Nón" },
  "tui-xach": { name: "Túi xách", parent: "Phụ kiện", dbValue: "Túi xách" },
  "that-lung": { name: "Thắt lưng", parent: "Phụ kiện", dbValue: "Thắt lưng" },
  "giay-dep": { name: "Giày dép", parent: "Phụ kiện", dbValue: "Giày dép" },
};

const SIZES = ["S", "M", "L", "XL"];
const COLORS = ["Trắng", "Đen", "Hồng", "Xanh"];

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const category = CATEGORY_MAP[slug];

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState("moi_nhat");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  const fetchProducts = async () => {
    if (!category) return;
    try {
      let url = `${API_URL}?page=${page}&sap_xep=${sortBy}&danh_muc_slug=${encodeURIComponent(slug)}`;
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
    setPage(1);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSortBy("moi_nhat");
  }, [slug]);

  useEffect(() => {
    fetchProducts();
  }, [page, sortBy, selectedSizes, selectedColors, slug]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, selectedSizes, selectedColors]);

  const toggleFilter = (value, selected, setSelected) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const formatPrice = (price) => {
    if (!price) return "0đ";
    return price.toLocaleString("vi-VN") + "đ";
  };

  if (!category) {
    return (
      <div className="category-page">
        <Header />
        <div className="category-not-found">
          <h2>Danh mục không tồn tại</h2>
          <Link to="/">Về trang chủ</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="category-page">
      <Header />

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>&gt;</span>
        <span>{category.parent}</span>
        <span>&gt;</span>
        <span className="breadcrumb-current">{category.name}</span>
      </div>

      <div className="category-layout">
        {/* SIDEBAR */}
        <aside className="cat-sidebar">
          <h3><i className="fas fa-filter"></i> Bộ lọc</h3>

          <div className="cat-filter-group">
            <p className="cat-filter-title">Kích cỡ</p>
            {SIZES.map((size) => (
              <label key={size} className="cat-filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size)}
                  onChange={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                />
                <span>Size {size}</span>
              </label>
            ))}
          </div>

          <div className="cat-filter-group">
            <p className="cat-filter-title">Màu sắc</p>
            {COLORS.map((color) => (
              <label key={color} className="cat-filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColors.includes(color)}
                  onChange={() => toggleFilter(color, selectedColors, setSelectedColors)}
                />
                <span>{color}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <section className="cat-main">
          <div className="cat-header">
            <h2>{category.name}</h2>
            <p>{totalProducts} sản phẩm</p>
          </div>

          <div className="cat-sort-bar">
            <div className="cat-sort-left">
              <span>Sắp xếp:</span>
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
                <option value="gia_tang">Thấp → Cao</option>
                <option value="gia_giam">Cao → Thấp</option>
              </select>
            </div>
            <div className="cat-pagination-top">
              <span>{page}/{totalPages}</span>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&lt;</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>&gt;</button>
            </div>
          </div>

          <div className="cat-grid">
            {products.length > 0 ? (
              products.map((item) => (
                <div
                  key={item._id}
                  className="cat-card"
                  onClick={() => navigate(`/product/${item._id}`)}
                >
                  <div className="cat-card-img">
                    <img src={item.hinh_anh || "https://via.placeholder.com/300x400"} alt={item.ten_san_pham} />
                    {item.phan_tram_giam_gia > 0 && (
                      <span className="cat-sale-tag">-{item.phan_tram_giam_gia}%</span>
                    )}
                  </div>
                  <div className="cat-card-info">
                    <h4>{item.ten_san_pham}</h4>
                    <div className="cat-card-price">
                      <span className="cat-current">{formatPrice(item.gia_hien_tai)}</span>
                      {item.gia_goc > item.gia_hien_tai && (
                        <del className="cat-original">{formatPrice(item.gia_goc)}</del>
                      )}
                    </div>
                    <div className="cat-card-meta">
                      <span className="cat-rating">
                        {"★".repeat(Math.round(item.sao_danh_gia || 0))}
                        {"☆".repeat(5 - Math.round(item.sao_danh_gia || 0))}
                        <span>{item.sao_danh_gia || 0} ({item.tong_danh_gia || 0})</span>
                      </span>
                      <button className="cat-add-cart" onClick={(e) => e.stopPropagation()}>
                        <i className="fas fa-shopping-cart"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="cat-empty">
                <i className="fas fa-box-open"></i>
                <p>Chưa có sản phẩm trong danh mục này.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="cat-pagination-bottom">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={page === p ? "active" : ""} onClick={() => setPage(p)}>
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

export default CategoryPage;
