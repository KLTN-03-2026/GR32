import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import "./ProductsPage.css";

const API_PRODUCTS = `${API_BASE}/api/products`;
const API_CATEGORIES = `${API_BASE}/api/categories`;

function sortMenu(a, b) {
  const oa = Number(a.thu_tu_menu);
  const ob = Number(b.thu_tu_menu);
  const na = Number.isFinite(oa) ? oa : 999;
  const nb = Number.isFinite(ob) ? ob : 999;
  if (na !== nb) return na - nb;
  return (a.ten_danh_muc || "").localeCompare(b.ten_danh_muc || "", "vi");
}

/** Cây danh mục từ API /api/categories (parent_id + slug khớp CSDL). */
function useCategoryTree(categories) {
  return useMemo(() => {
    const list = [...categories].sort(sortMenu);
    const roots = list.filter((c) => !c.parent_id);
    const byParent = new Map();
    for (const c of list) {
      if (!c.parent_id) continue;
      const k = String(c.parent_id);
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k).push(c);
    }
    for (const arr of byParent.values()) {
      arr.sort(sortMenu);
    }
    return { roots, byParent };
  }, [categories]);
}

function CategoryFilterBranch({ node, byParent, selectedSlug, onSelect, depth }) {
  const kids = byParent.get(String(node._id)) || [];
  if (!kids.length) {
    return (
      <label key={node._id} className={`filter-cat-leaf filter-cat-depth-${Math.min(depth, 3)}`}>
        <input
          type="radio"
          name="product-cat-slug"
          checked={selectedSlug === node.slug}
          onChange={() => onSelect(node.slug)}
        />
        <span>{node.ten_danh_muc}</span>
      </label>
    );
  }
  return (
    <div key={node._id} className={`filter-cat-block filter-cat-depth-${Math.min(depth, 3)}`}>
      <div className="filter-cat-block-title">{node.ten_danh_muc}</div>
      <div className="filter-cat-block-children">
        {kids.map((ch) => (
          <CategoryFilterBranch
            key={ch._id}
            node={ch}
            byParent={byParent}
            selectedSlug={selectedSlug}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

const ProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState("moi_nhat");

  const [categories, setCategories] = useState([]);
  const [facets, setFacets] = useState({ kich_co: [], mau_sac: [] });
  const [metaErr, setMetaErr] = useState("");

  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [showMoreColors, setShowMoreColors] = useState(false);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const { roots, byParent } = useCategoryTree(categories);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetaErr("");
      try {
        const [cRes, fRes] = await Promise.all([
          axios.get(API_CATEGORIES),
          axios.get(`${API_PRODUCTS}/filter-facets`),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(cRes.data) ? cRes.data : []);
        setFacets({
          kich_co: fRes.data?.kich_co || [],
          mau_sac: fRes.data?.mau_sac || [],
        });
      } catch {
        if (!cancelled) {
          setMetaErr("Không tải được danh mục / bộ lọc từ máy chủ.");
          setCategories([]);
          setFacets({ kich_co: [], mau_sac: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("sap_xep", sortBy);
      if (selectedSlug) params.set("danh_muc_slug", selectedSlug);
      if (selectedSizes.length) params.set("kich_co", selectedSizes.join(","));
      if (selectedColors.length) params.set("mau_sac", selectedColors.join(","));
      if (q) params.set("q", q);

      const res = await axios.get(`${API_PRODUCTS}?${params.toString()}`);
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalProducts(res.data.totalProducts || 0);
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
      setProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
    }
  }, [page, sortBy, selectedSlug, selectedSizes, selectedColors, q]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, selectedSlug, selectedSizes, selectedColors, q]);

  const toggleFilter = (value, selected, setSelected) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const formatPrice = (price) => {
    if (!price) return "0đ";
    return price.toLocaleString("vi-VN") + "đ";
  };

  const colorList = useMemo(() => {
    const list = facets.mau_sac || [];
    if (list.length === 0) return [];
    return showMoreColors ? list : list.slice(0, 12);
  }, [facets.mau_sac, showMoreColors]);

  const hasMoreColors = (facets.mau_sac || []).length > 12;

  return (
    <div className="products-page">
      <Header />

      <div className="products-layout">
        <aside className="filter-sidebar">
          <h3>
            <i className="fas fa-filter"></i> Bộ lọc
          </h3>

          {metaErr && <p className="filter-meta-err">{metaErr}</p>}

          <div className="filter-group">
            <p className="filter-title">Tìm theo tên</p>
            <input
              type="search"
              className="filter-search-input"
              placeholder="Tên sản phẩm..."
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              aria-label="Tìm theo tên sản phẩm"
            />
          </div>

          <div className="filter-group">
            <p className="filter-title">Danh mục</p>
            <p className="filter-hint">Theo cấu trúc cửa hàng (slug → tên trên sản phẩm).</p>
            <label className="filter-cat-leaf filter-cat-all">
              <input
                type="radio"
                name="product-cat-slug"
                checked={!selectedSlug}
                onChange={() => setSelectedSlug("")}
              />
              <span>Tất cả</span>
            </label>
            {roots.length === 0 && !metaErr ? (
              <p className="filter-empty">Chưa có danh mục hoạt động.</p>
            ) : (
              roots.map((root) => (
                <CategoryFilterBranch
                  key={root._id}
                  node={root}
                  byParent={byParent}
                  selectedSlug={selectedSlug}
                  onSelect={setSelectedSlug}
                  depth={0}
                />
              ))
            )}
          </div>

          <div className="filter-group filter-group--scroll">
            <p className="filter-title">Kích cỡ</p>
            {(facets.kich_co || []).length === 0 ? (
              <p className="filter-empty">Chưa có dữ liệu biến thể.</p>
            ) : (
              facets.kich_co.map((size) => (
                <label key={size} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => toggleFilter(size, selectedSizes, setSelectedSizes)}
                  />
                  <span>Size {size}</span>
                </label>
              ))
            )}
          </div>

          <div className="filter-group filter-group--scroll">
            <p className="filter-title">Màu sắc</p>
            {colorList.length === 0 ? (
              <p className="filter-empty">Chưa có dữ liệu biến thể.</p>
            ) : (
              colorList.map((color) => (
                <label key={color} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(color)}
                    onChange={() => toggleFilter(color, selectedColors, setSelectedColors)}
                  />
                  <span>{color}</span>
                </label>
              ))
            )}
            {hasMoreColors && (
              <button type="button" className="show-more-btn" onClick={() => setShowMoreColors(!showMoreColors)}>
                {showMoreColors ? "Thu gọn ▲" : "Thêm màu ▼"}
              </button>
            )}
          </div>
        </aside>

        <section className="products-main">
          <div className="results-header">
            <p>
              Kết quả: <strong>{totalProducts}</strong> sản phẩm
            </p>
          </div>

          <div className="sort-toolbar">
            <div className="sort-left">
              <span>Sắp xếp theo</span>
              {[
                { key: "moi_nhat", label: "Mới nhất" },
                { key: "ban_chay", label: "Bán chạy" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
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
              <span>
                {page}/{totalPages}
              </span>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                &lt;
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                &gt;
              </button>
            </div>
          </div>

          <div className="products-grid">
            {products.length > 0 ? (
              products.map((item) => (
                <div
                  key={item._id}
                  className="p-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/product/${item._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/product/${item._id}`);
                  }}
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
                        <span>
                          {item.sao_danh_gia || 0} ({item.tong_danh_gia || 0})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="p-add-cart"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
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
                <p>Không có sản phẩm phù hợp bộ lọc.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination-bottom">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
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
