import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";

const API = `${API_BASE}/api/admin/products`;

function formatPrice(v) {
  if (!v && v !== 0) return "0";
  return v.toLocaleString("vi-VN");
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, {
        headers,
        params: { search, page, limit: 15 },
      });
      setProducts(res.data.products);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const patchTrangThai = async (id, next, name) => {
    const label = next === "ngung_ban" ? "ngừng bán (vẫn lưu trong CSDL)" : "mở bán lại";
    if (!window.confirm(`Chuyển "${name}" sang ${label}?`)) return;
    try {
      const res = await axios.patch(`${API}/${id}/trang-thai`, { trang_thai: next }, { headers });
      alert(res.data.message);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi cập nhật trạng thái.");
    }
  };

  const handleDeleteFromDb = async (id, name, daBan) => {
    let msg = `Xóa vĩnh viễn sản phẩm "${name}" khỏi cơ sở dữ liệu?\nThao tác không thể hoàn tác.`;
    if (daBan > 0) {
      msg += `\n\nSản phẩm đã có lượt bán: đơn cũ vẫn giữ tên đã lưu trong chi tiết đơn.`;
    }
    if (!window.confirm(msg)) return;
    try {
      const res = await axios.delete(`${API}/${id}`, { headers });
      alert(res.data.message);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xóa sản phẩm!");
    }
  };

  const imgSrc = (p) => {
    const src = p.hinh_anh || "";
    if (src.startsWith("/uploads/")) return `${API_BASE}${src}`;
    return src || "";
  };

  return (
    <div className="admin-products">
      <div className="ap-header">
        <h2>Quản lý sản phẩm <small>({total} sản phẩm)</small></h2>
        <button className="btn-add-product" onClick={() => navigate("/admin-dashboard/products/new")}>
          <i className="fas fa-plus"></i> Thêm sản phẩm
        </button>
      </div>

      {/* SEARCH */}
      <form className="ap-search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit"><i className="fas fa-search"></i> Tìm kiếm</button>
      </form>

      {loading ? (
        <div className="ap-loading">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="ap-empty">
          {search ? `Không tìm thấy sản phẩm khớp "${search}"` : "Chưa có sản phẩm nào."}
        </div>
      ) : (
        <>
          {/* TABLE */}
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá gốc</th>
                  <th>Giá bán</th>
                  <th>Tồn kho</th>
                  <th>Đã bán</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 240 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className={p.trang_thai === "ngung_ban" ? "row-inactive" : ""}>
                    <td>
                      <div className="ap-img-cell">
                        {imgSrc(p) ? <img src={imgSrc(p)} alt="" /> : <i className="fas fa-image"></i>}
                      </div>
                    </td>
                    <td className="ap-name-cell">
                      <span className="ap-product-name">{p.ten_san_pham}</span>
                      {p.thuong_hieu && <small>{p.thuong_hieu}</small>}
                    </td>
                    <td>{p.danh_muc || "—"}</td>
                    <td>{formatPrice(p.gia_goc)}đ</td>
                    <td className="price-col">{formatPrice(p.gia_hien_tai)}đ</td>
                    <td>{p.so_luong_ton ?? 0}</td>
                    <td>{p.so_luong_da_ban ?? 0}</td>
                    <td>
                      <span className={`ap-status ${p.trang_thai === "ngung_ban" ? "inactive" : "active"}`}>
                        {p.trang_thai === "ngung_ban" ? "Ngừng bán" : "Đang bán"}
                      </span>
                    </td>
                    <td>
                      <div className="ap-actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => navigate(`/admin-dashboard/products/edit/${p._id}`)}
                          title="Sửa"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        {p.trang_thai === "ngung_ban" ? (
                          <button
                            type="button"
                            className="btn-toggle-ban btn-toggle-ban--resume"
                            onClick={() => patchTrangThai(p._id, "dang_ban", p.ten_san_pham)}
                          >
                            Mở bán lại
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-toggle-ban"
                            onClick={() => patchTrangThai(p._id, "ngung_ban", p.ten_san_pham)}
                          >
                            Ngừng bán
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-delete-hard"
                          onClick={() => handleDeleteFromDb(p._id, p.ten_san_pham, p.so_luong_da_ban ?? 0)}
                          title="Xóa khỏi CSDL"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="ap-pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button>
              <span>Trang {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminProducts;
