import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../config";

const API = `${API_BASE}/api/admin/products`;

const DANH_MUC_FALLBACK = [
  "Áo thun nam", "Áo polo nam", "Quần jean nam", "Quần short nam",
  "Áo thun nữ", "Đầm / Váy", "Quần nữ", "Áo khoác nữ",
  "Mũ / Nón", "Túi xách", "Thắt lưng", "Giày dép",
  "Áo khoác nam", "Áo sơ mi nam", "Áo sơ mi nữ",
];

const THUONG_HIEU_FALLBACK = ["NO NAME"];

const MAU_SAC_LIST = ["Đen", "Trắng", "Xanh navy", "Xám", "Be", "Nâu", "Đỏ", "Hồng", "Xanh lá", "Kẻ caro"];
const KICH_CO_LIST = ["S", "M", "L", "XL", "XXL", "29", "30", "31", "32", "33", "34"];

const emptyForm = {
  ten_san_pham: "", mo_ta: "", thuong_hieu: "", danh_muc: "",
  gioi_tinh: "Unisex", chat_lieu: "", kieu_dang: "", huong_dan_bao_quan: "",
  gia_goc: "", phan_tram_giam_gia: "0",
};

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ ...emptyForm });
  const [bienThe, setBienThe] = useState([]);
  const [mauSacInput, setMauSacInput] = useState([]);
  const [kichCoInput, setKichCoInput] = useState([]);

  const [anhDaiDien, setAnhDaiDien] = useState(null);
  const [anhDaiDienPreview, setAnhDaiDienPreview] = useState("");
  const [anhChiTiet, setAnhChiTiet] = useState([]);
  const [anhChiTietPreviews, setAnhChiTietPreviews] = useState([]);
  const [existingAnhChiTiet, setExistingAnhChiTiet] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categoryOptions, setCategoryOptions] = useState(() =>
    DANH_MUC_FALLBACK.map((t) => ({ _id: t, ten_danh_muc: t })),
  );
  const [brandOptions, setBrandOptions] = useState(() =>
    THUONG_HIEU_FALLBACK.map((t) => ({ _id: t, ten_thuong_hieu: t })),
  );

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 500, page: 1 },
      })
      .then((res) => {
        const items = res.data.items;
        if (!cancelled && Array.isArray(items) && items.length > 0) {
          setCategoryOptions(items.map((c) => ({ _id: c._id, ten_danh_muc: c.ten_danh_muc })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/admin/brands`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 500, page: 1 },
      })
      .then((res) => {
        const items = res.data.items;
        if (!cancelled && Array.isArray(items) && items.length > 0) {
          setBrandOptions(items.map((b) => ({ _id: b._id, ten_thuong_hieu: b.ten_thuong_hieu })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const danhMucSelectOptions = useMemo(() => {
    const has = categoryOptions.some((c) => c.ten_danh_muc === form.danh_muc);
    if (!has && form.danh_muc) {
      return [{ _id: `legacy-${form.danh_muc}`, ten_danh_muc: form.danh_muc }, ...categoryOptions];
    }
    return categoryOptions;
  }, [categoryOptions, form.danh_muc]);

  const thuongHieuSelectOptions = useMemo(() => {
    const has = brandOptions.some((b) => b.ten_thuong_hieu === form.thuong_hieu);
    if (!has && form.thuong_hieu) {
      return [{ _id: `legacy-${form.thuong_hieu}`, ten_thuong_hieu: form.thuong_hieu }, ...brandOptions];
    }
    return brandOptions;
  }, [brandOptions, form.thuong_hieu]);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/${id}`, { headers });
      const p = res.data;
      setForm({
        ten_san_pham: p.ten_san_pham || "",
        mo_ta: p.mo_ta || "",
        thuong_hieu: p.thuong_hieu || "",
        danh_muc: p.danh_muc || "",
        gioi_tinh: p.gioi_tinh || "Unisex",
        chat_lieu: p.chat_lieu || "",
        kieu_dang: p.kieu_dang || "",
        huong_dan_bao_quan: p.huong_dan_bao_quan || "",
        gia_goc: p.gia_goc || "",
        phan_tram_giam_gia: p.phan_tram_giam_gia || "0",
      });

      if (p.hinh_anh) {
        const src = p.hinh_anh.startsWith("/uploads/") ? `${API_BASE}${p.hinh_anh}` : p.hinh_anh;
        setAnhDaiDienPreview(src);
      }

      if (p.danh_sach_anh?.length) {
        setExistingAnhChiTiet(
          p.danh_sach_anh.map((a) => (a.startsWith("/uploads/") ? `${API_BASE}${a}` : a))
        );
      }

      if (p.bien_the?.length) {
        const colors = [...new Set(p.bien_the.map((v) => v.mau_sac).filter(Boolean))];
        const sizes = [...new Set(p.bien_the.map((v) => v.kich_co).filter(Boolean))];
        setMauSacInput(colors);
        setKichCoInput(sizes);
        setBienThe(p.bien_the.map((v, i) => {
          let sku = v.ma_sku || "";
          if (!sku) {
            const prefix = (v.mau_sac || "X").substring(0, 2).toUpperCase() + (v.kich_co || "0");
            sku = `${prefix}-${Date.now().toString().slice(-4)}${i}`;
          }
          return {
            mau_sac: v.mau_sac || "",
            kich_co: v.kich_co || "",
            so_luong: v.so_luong || 0,
            ma_sku: sku,
            gia_goc: v.gia_goc || p.gia_goc || "",
            gia_ban: v.gia_ban || p.gia_hien_tai || "",
          };
        }));
      }
    } catch {
      setError("Không tải được sản phẩm!");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnhDaiDien = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnhDaiDien(file);
    setAnhDaiDienPreview(URL.createObjectURL(file));
  };

  const handleAnhChiTiet = (e) => {
    const files = Array.from(e.target.files);
    const totalCurrent = existingAnhChiTiet.length + anhChiTiet.length;
    const remaining = 5 - totalCurrent;
    if (remaining <= 0) { alert("Tối đa 5 ảnh chi tiết!"); return; }

    const toAdd = files.slice(0, remaining);
    setAnhChiTiet((prev) => [...prev, ...toAdd]);
    setAnhChiTietPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewAnhChiTiet = (index) => {
    setAnhChiTiet((prev) => prev.filter((_, i) => i !== index));
    setAnhChiTietPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAnhChiTiet = (index) => {
    setExistingAnhChiTiet((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMauSac = (color) => {
    setMauSacInput((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const toggleKichCo = (size) => {
    setKichCoInput((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const generateBienThe = () => {
    if (mauSacInput.length === 0 || kichCoInput.length === 0) {
      alert("Vui lòng chọn ít nhất 1 màu sắc và 1 kích cỡ!");
      return;
    }

    const existingMap = {};
    bienThe.forEach((bt) => {
      existingMap[`${bt.mau_sac}_${bt.kich_co}`] = bt;
    });

    const newList = [];
    mauSacInput.forEach((color) => {
      kichCoInput.forEach((size) => {
        const key = `${color}_${size}`;
        if (existingMap[key]) {
          newList.push(existingMap[key]);
        } else {
          const prefix = color.substring(0, 2).toUpperCase() + size;
          newList.push({
            mau_sac: color,
            kich_co: size,
            so_luong: 0,
            ma_sku: `${prefix}-${Date.now().toString().slice(-4)}`,
            gia_goc: form.gia_goc || "",
            gia_ban: "",
          });
        }
      });
    });

    setBienThe(newList);
  };

  const updateBienThe = (index, field, value) => {
    setBienThe((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeBienThe = (index) => {
    setBienThe((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();

      const dataPayload = {
        ...form,
        bien_the: bienThe,
        giu_anh_cu: existingAnhChiTiet.length > 0,
      };
      formData.append("data", JSON.stringify(dataPayload));

      if (anhDaiDien) {
        formData.append("hinh_anh", anhDaiDien);
      }

      anhChiTiet.forEach((file) => {
        formData.append("danh_sach_anh", file);
      });

      let res;
      if (isEdit) {
        res = await axios.put(`${API}/${id}`, formData, { headers });
      } else {
        res = await axios.post(API, formData, { headers });
      }

      alert(res.data.message);
      navigate("/admin-dashboard/products");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu sản phẩm!");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="ap-loading">Đang tải...</div>;

  return (
    <div className="admin-product-form">
      <div className="apf-header">
        <button className="btn-back" onClick={() => navigate("/admin-dashboard/products")}>
          <i className="fas fa-arrow-left"></i> Quay lại
        </button>
        <h2>{isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
      </div>

      {error && <div className="apf-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}

      <form onSubmit={handleSubmit} className="apf-form">
        {/* === SECTION 1: THÔNG TIN CHUNG === */}
        <div className="apf-section">
          <h3><i className="fas fa-info-circle"></i> Thông tin chung</h3>

          <div className="apf-row">
            <div className="apf-field full">
              <label>Tên sản phẩm <span className="required">*</span></label>
              <input type="text" value={form.ten_san_pham} onChange={(e) => handleChange("ten_san_pham", e.target.value)} placeholder="Nhập tên sản phẩm" />
            </div>
          </div>

          <div className="apf-row three-cols">
            <div className="apf-field">
              <label>Thương hiệu <span className="required">*</span></label>
              <select value={form.thuong_hieu} onChange={(e) => handleChange("thuong_hieu", e.target.value)}>
                <option value="">-- Chọn thương hiệu --</option>
                {thuongHieuSelectOptions.map((b) => (
                  <option key={b._id} value={b.ten_thuong_hieu}>
                    {b.ten_thuong_hieu}
                  </option>
                ))}
              </select>
            </div>
            <div className="apf-field">
              <label>Danh mục <span className="required">*</span></label>
              <select value={form.danh_muc} onChange={(e) => handleChange("danh_muc", e.target.value)}>
                <option value="">-- Chọn danh mục --</option>
                {danhMucSelectOptions.map((c) => (
                  <option key={c._id} value={c.ten_danh_muc}>
                    {c.ten_danh_muc}
                  </option>
                ))}
              </select>
            </div>
            <div className="apf-field">
              <label>Giới tính <span className="required">*</span></label>
              <select value={form.gioi_tinh} onChange={(e) => handleChange("gioi_tinh", e.target.value)}>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>
          </div>

          <div className="apf-row">
            <div className="apf-field full">
              <label>Mô tả <span className="required">*</span></label>
              <textarea rows={3} value={form.mo_ta} onChange={(e) => handleChange("mo_ta", e.target.value)} placeholder="Mô tả sản phẩm..." />
            </div>
          </div>

          <div className="apf-row two-cols">
            <div className="apf-field">
              <label>Giá gốc (VNĐ) <span className="required">*</span></label>
              <input type="number" min="0" value={form.gia_goc} onChange={(e) => handleChange("gia_goc", e.target.value)} placeholder="VD: 500000" />
            </div>
            <div className="apf-field">
              <label>Phần trăm giảm giá (%)</label>
              <input type="number" min="0" max="99" value={form.phan_tram_giam_gia} onChange={(e) => handleChange("phan_tram_giam_gia", e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        {/* === SECTION 2: THUỘC TÍNH THỜI TRANG === */}
        <div className="apf-section">
          <h3><i className="fas fa-tshirt"></i> Thuộc tính thời trang (Dữ liệu cho AI Chatbot)</h3>

          <div className="apf-row two-cols">
            <div className="apf-field">
              <label>Chất liệu <span className="required">*</span></label>
              <input type="text" value={form.chat_lieu} onChange={(e) => handleChange("chat_lieu", e.target.value)} placeholder="VD: Cotton 100%" />
            </div>
            <div className="apf-field">
              <label>Kiểu dáng / Form <span className="required">*</span></label>
              <input type="text" value={form.kieu_dang} onChange={(e) => handleChange("kieu_dang", e.target.value)} placeholder="VD: Regular Fit" />
            </div>
          </div>

          <div className="apf-row">
            <div className="apf-field full">
              <label>Hướng dẫn bảo quản <span className="required">*</span></label>
              <textarea rows={2} value={form.huong_dan_bao_quan} onChange={(e) => handleChange("huong_dan_bao_quan", e.target.value)} placeholder="VD: Giặt máy ở nhiệt độ thường, không dùng chất tẩy mạnh..." />
            </div>
          </div>
        </div>

        {/* === SECTION 3: BIẾN THỂ === */}
        <div className="apf-section">
          <h3><i className="fas fa-layer-group"></i> Biến thể sản phẩm (SKU)</h3>

          <div className="apf-row two-cols">
            <div className="apf-field">
              <label>Chọn màu sắc</label>
              <div className="apf-chip-list">
                {MAU_SAC_LIST.map((c) => (
                  <button type="button" key={c} className={`apf-chip ${mauSacInput.includes(c) ? "active" : ""}`} onClick={() => toggleMauSac(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="apf-field">
              <label>Chọn kích cỡ</label>
              <div className="apf-chip-list">
                {KICH_CO_LIST.map((s) => (
                  <button type="button" key={s} className={`apf-chip ${kichCoInput.includes(s) ? "active" : ""}`} onClick={() => toggleKichCo(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="button" className="btn-generate-variants" onClick={generateBienThe}>
            <i className="fas fa-sync-alt"></i> Tạo bảng biến thể ({mauSacInput.length} màu × {kichCoInput.length} size = {mauSacInput.length * kichCoInput.length} tổ hợp)
          </button>

          {bienThe.length > 0 && (
            <div className="apf-variants-table-wrap">
              <table className="apf-variants-table">
                <thead>
                  <tr>
                    <th>Màu sắc</th>
                    <th>Kích cỡ</th>
                    <th>Mã SKU</th>
                    <th>Số lượng</th>
                    <th>Giá gốc</th>
                    <th>Giá bán</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bienThe.map((bt, i) => (
                    <tr key={i}>
                      <td>{bt.mau_sac}</td>
                      <td>{bt.kich_co}</td>
                      <td><input type="text" value={bt.ma_sku} onChange={(e) => updateBienThe(i, "ma_sku", e.target.value)} /></td>
                      <td><input type="number" min="0" value={bt.so_luong} onChange={(e) => updateBienThe(i, "so_luong", e.target.value)} /></td>
                      <td><input type="number" min="0" value={bt.gia_goc} onChange={(e) => updateBienThe(i, "gia_goc", e.target.value)} placeholder={form.gia_goc || "0"} /></td>
                      <td><input type="number" min="0" value={bt.gia_ban} onChange={(e) => updateBienThe(i, "gia_ban", e.target.value)} /></td>
                      <td><button type="button" className="btn-remove-variant" onClick={() => removeBienThe(i)}><i className="fas fa-times"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* === SECTION 4: HÌNH ẢNH === */}
        <div className="apf-section">
          <h3><i className="fas fa-images"></i> Hình ảnh</h3>

          <div className="apf-row two-cols">
            <div className="apf-field">
              <label>Ảnh đại diện <span className="required">*</span> (.jpg, .png)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleAnhDaiDien} />
              {anhDaiDienPreview && (
                <div className="apf-img-preview">
                  <img src={anhDaiDienPreview} alt="Preview" />
                </div>
              )}
            </div>
            <div className="apf-field">
              <label>Ảnh chi tiết (1–5 ảnh) <span className="required">*</span></label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleAnhChiTiet} />
              <div className="apf-img-list">
                {existingAnhChiTiet.map((src, i) => (
                  <div key={`ex-${i}`} className="apf-img-thumb">
                    <img src={src} alt="" />
                    <button type="button" onClick={() => removeExistingAnhChiTiet(i)}><i className="fas fa-times"></i></button>
                  </div>
                ))}
                {anhChiTietPreviews.map((src, i) => (
                  <div key={`new-${i}`} className="apf-img-thumb">
                    <img src={src} alt="" />
                    <button type="button" onClick={() => removeNewAnhChiTiet(i)}><i className="fas fa-times"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === SUBMIT === */}
        <div className="apf-submit-row">
          <button type="button" className="btn-cancel-form" onClick={() => navigate("/admin-dashboard/products")}>
            Hủy bỏ
          </button>
          <button type="submit" className="btn-save-product" disabled={submitting}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
