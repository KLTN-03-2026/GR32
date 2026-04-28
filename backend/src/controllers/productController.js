const Product = require("../models/Product");
const Review = require("../models/Review");
const Category = require("../models/Category");

function splitCsv(v) {
  if (v == null || v === "") return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Từ slug danh mục (bảng Category) → danh sách giá trị `Product.danh_muc` (tên danh mục lá)
 * gồm mọi lá trong cây con của danh mục đó.
 */
async function productDanhMucNamesFromCategorySlug(slug) {
  const s = String(slug || "").trim();
  if (!s) return null;

  const all = await Category.find({ trang_thai: "hoat_dong" })
    .select("parent_id ten_danh_muc slug")
    .lean();
  const cat = all.find((c) => c.slug === s);
  if (!cat) return null;

  const byParent = new Map();
  for (const c of all) {
    const key = c.parent_id ? String(c.parent_id) : "__ROOT__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  }

  const stack = [cat];
  const desc = [];
  while (stack.length) {
    const n = stack.pop();
    desc.push(n);
    for (const ch of byParent.get(String(n._id)) || []) stack.push(ch);
  }

  const parentIds = new Set(all.filter((c) => c.parent_id).map((c) => String(c.parent_id)));

  const leafNames = desc
    .filter((d) => !parentIds.has(String(d._id)))
    .map((d) => d.ten_danh_muc)
    .filter(Boolean);

  return leafNames.length ? leafNames : [cat.ten_danh_muc];
}

/** Trả về điều kiện `danh_muc` cho Product, hoặc null nếu không lọc theo danh mục. */
async function buildProductDanhMucCondition(query) {
  const slug = String(query.danh_muc_slug || "").trim();
  const exact = String(query.danh_muc || "").trim();

  if (slug) {
    const names = await productDanhMucNamesFromCategorySlug(slug);
    if (!names) return null;
    return { $in: names };
  }
  if (exact) return exact;
  return null;
}

exports.getProductFilterFacets = async (req, res) => {
  try {
    const rows = await Product.find({ trang_thai: { $ne: "ngung_ban" } })
      .select("bien_the")
      .lean();
    const sizes = new Set();
    const colors = new Set();
    for (const p of rows) {
      for (const v of p.bien_the || []) {
        const k = String(v.kich_co || "").trim();
        const m = String(v.mau_sac || "").trim();
        if (k) sizes.add(k);
        if (m) colors.add(m);
      }
    }
    const loc = (a, b) => a.localeCompare(b, "vi");
    res.json({
      kich_co: [...sizes].sort(loc),
      mau_sac: [...colors].sort(loc),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải bộ lọc." });
  }
};

// --- 0. CHI TIẾT SẢN PHẨM ---
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại!" });

    const reviews = await Review.find({
      san_pham_id: req.params.id,
      $nor: [{ trang_thai: "an" }, { trang_thai: "da_xoa" }],
    })
      .sort({ ngay_tao: -1 })
      .limit(20);

    res.status(200).json({ product, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lấy chi tiết sản phẩm!" });
  }
};

// --- 0.1. GỬI ĐÁNH GIÁ (đã chuyển sang POST /api/orders/mine/:orderId/reviews) ---
exports.addReview = async (req, res) => {
  return res.status(403).json({
    message:
      "Vui lòng đánh giá từ trang chi tiết đơn hàng sau khi xác nhận đã nhận hàng và đơn hoàn thành.",
  });
};

// --- 1. TÌM KIẾM SẢN PHẨM (Xử lý ô Search trên Header) ---
exports.searchProducts = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(200).json([]);

    // Tìm kiếm không phân biệt hoa thường theo tên sản phẩm
    const results = await Product.find({
      ten_san_pham: { $regex: query, $options: "i" },
      trang_thai: { $ne: "ngung_ban" },
    });

    res.status(200).json(results);
  } catch (err) {
    console.error("Lỗi Search:", err);
    res.status(500).json({ message: "Lỗi tìm kiếm từ Server" });
  }
};

// --- 2. LẤY TẤT CẢ SẢN PHẨM (Xử lý US05/PB05 - Lọc, Sắp xếp, Phân trang) ---
exports.getAllProducts = async (req, res) => {
  try {
    // A. Xử lý phân trang (PB05 - 1.2)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16;
    const skip = (page - 1) * limit;

    const { danh_muc, danh_muc_slug, kich_co, mau_sac, sap_xep, q } = req.query;

    // B. Xây dựng Query lọc (US05 & PB05 - 2.1)
    let queryCondition = { trang_thai: { $ne: "ngung_ban" } };

    const dmCond = await buildProductDanhMucCondition({ danh_muc, danh_muc_slug });
    if (dmCond) queryCondition.danh_muc = dmCond;

    const kw = String(q || "").trim();
    if (kw) {
      const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      queryCondition.ten_san_pham = { $regex: esc, $options: "i" };
    }

    const sizes = splitCsv(kich_co);
    const colors = splitCsv(mau_sac);
    const variantParts = [];
    if (sizes.length) {
      variantParts.push({ bien_the: { $elemMatch: { kich_co: { $in: sizes } } } });
    }
    if (colors.length) {
      variantParts.push({ bien_the: { $elemMatch: { mau_sac: { $in: colors } } } });
    }
    if (variantParts.length) {
      queryCondition.$and = variantParts;
    }

    // C. Xử lý Sắp xếp (PB05 - 3.1)
    let sortCondition = {};
    if (sap_xep === "moi_nhat") sortCondition = { ngay_tao: -1 };
    else if (sap_xep === "gia_tang") sortCondition = { gia_hien_tai: 1 };
    else if (sap_xep === "gia_giam") sortCondition = { gia_hien_tai: -1 };
    else if (sap_xep === "ban_chay") sortCondition = { so_luong_da_ban: -1 };
    else if (sap_xep === "giam_gia") {
      queryCondition.phan_tram_giam_gia = { $gt: 0 };
      sortCondition = { phan_tram_giam_gia: -1 };
    }
    else sortCondition = { ngay_tao: -1 };

    // D. Thực thi Query đồng thời để tối ưu hiệu năng
    const [products, totalProducts] = await Promise.all([
      Product.find(queryCondition).sort(sortCondition).skip(skip).limit(limit),
      Product.countDocuments(queryCondition),
    ]);

    res.status(200).json({
      success: true,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      products,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách:", err);
    res.status(500).json({ message: "Lỗi lấy danh sách sản phẩm" });
  }
};
