const Product = require("../models/Product");
const Review = require("../models/Review");

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

    const { danh_muc, kich_co, mau_sac, sap_xep } = req.query;

    // B. Xây dựng Query lọc (US05 & PB05 - 2.1)
    let queryCondition = { trang_thai: { $ne: "ngung_ban" } };

    if (danh_muc) queryCondition.danh_muc = danh_muc;

    // Lưu ý: Nếu Huy có bảng biến thể (Variants), logic kich_co/mau_sac sẽ phức tạp hơn chút.
    // Hiện tại mình lọc trực tiếp trên bảng Product cho đơn giản:
    if (kich_co) queryCondition.kich_co = kich_co;
    if (mau_sac) queryCondition.mau_sac = mau_sac;

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
