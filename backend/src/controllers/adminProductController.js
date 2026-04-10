const Product = require("../models/Product");
const Cart = require("../models/Cart");
const fs = require("fs");
const path = require("path");

exports.getAll = async (req, res) => {
  try {
    const { search, trang_thai, danh_muc, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { ten_san_pham: { $regex: search, $options: "i" } },
        { "bien_the.ma_sku": { $regex: search, $options: "i" } },
      ];
    }
    if (trang_thai) filter.trang_thai = trang_thai;
    if (danh_muc) filter.danh_muc = danh_muc;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ ngay_tao: -1 }).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.body.data) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
    }

    const data = JSON.parse(req.body.data);

    const {
      ten_san_pham, mo_ta, thuong_hieu, danh_muc, gioi_tinh,
      chat_lieu, kieu_dang, huong_dan_bao_quan,
      gia_goc, phan_tram_giam_gia, bien_the,
    } = data;

    if (!ten_san_pham || !mo_ta || !thuong_hieu || !danh_muc) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin bắt buộc (Tên, Mô tả, Thương hiệu, Danh mục)!" });
    }
    if (!chat_lieu || !kieu_dang || !huong_dan_bao_quan) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thuộc tính thời trang (Chất liệu, Kiểu dáng, Hướng dẫn bảo quản)!" });
    }

    let hinh_anh = "";
    const danh_sach_anh = [];

    if (req.files) {
      if (req.files.hinh_anh && req.files.hinh_anh[0]) {
        hinh_anh = `/uploads/${req.files.hinh_anh[0].filename}`;
      }
      if (req.files.danh_sach_anh) {
        req.files.danh_sach_anh.forEach((f) => {
          danh_sach_anh.push(`/uploads/${f.filename}`);
        });
      }
    }

    if (!hinh_anh) {
      return res.status(400).json({ message: "Ảnh đại diện là bắt buộc!" });
    }

    if (danh_sach_anh.length < 1) {
      return res.status(400).json({ message: "Cần ít nhất 1 ảnh chi tiết!" });
    }

    const giaGoc = Number(gia_goc) || 0;
    const giamGia = Number(phan_tram_giam_gia) || 0;
    const giaHienTai = Math.round(giaGoc * (1 - giamGia / 100));

    let parsedBienThe = [];
    if (bien_the && Array.isArray(bien_the)) {
      const skuSet = new Set();
      for (const bt of bien_the) {
        if (!bt.ma_sku) {
          return res.status(400).json({ message: `Mã SKU là bắt buộc cho mỗi biến thể!` });
        }
        if (skuSet.has(bt.ma_sku)) {
          return res.status(400).json({ message: `Mã SKU "${bt.ma_sku}" bị trùng lặp!` });
        }
        skuSet.add(bt.ma_sku);

        const btGiaGoc = Number(bt.gia_goc) || giaGoc;
        const btGiaBan = Number(bt.gia_ban) || giaHienTai;
        if (btGiaBan > btGiaGoc) {
          return res.status(400).json({ message: `Giá bán không được lớn hơn giá gốc (SKU: ${bt.ma_sku})!` });
        }

        parsedBienThe.push({
          mau_sac: bt.mau_sac || "",
          kich_co: bt.kich_co || "",
          so_luong: Number(bt.so_luong) || 0,
          ma_sku: bt.ma_sku,
          gia_goc: btGiaGoc,
          gia_ban: btGiaBan,
        });
      }
    }

    const tongTon = parsedBienThe.length > 0
      ? parsedBienThe.reduce((s, v) => s + v.so_luong, 0)
      : 0;

    const product = await Product.create({
      ten_san_pham, mo_ta, thuong_hieu, danh_muc,
      gioi_tinh: gioi_tinh || "Unisex",
      chat_lieu, kieu_dang, huong_dan_bao_quan,
      hinh_anh, danh_sach_anh,
      gia_goc: giaGoc,
      phan_tram_giam_gia: giamGia,
      gia_hien_tai: giaHienTai,
      bien_the: parsedBienThe,
      so_luong_ton: tongTon,
      trang_thai: "dang_ban",
    });

    res.status(201).json({ message: "Thêm sản phẩm thành công!", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

    if (!req.body.data) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ!" });
    }

    const data = JSON.parse(req.body.data);

    const {
      ten_san_pham, mo_ta, thuong_hieu, danh_muc, gioi_tinh,
      chat_lieu, kieu_dang, huong_dan_bao_quan,
      gia_goc, phan_tram_giam_gia, bien_the, giu_anh_cu,
    } = data;

    if (!ten_san_pham || !mo_ta || !thuong_hieu || !danh_muc) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin bắt buộc!" });
    }
    if (!chat_lieu || !kieu_dang || !huong_dan_bao_quan) {
      return res.status(400).json({ message: "Vui lòng nhập đủ thuộc tính thời trang!" });
    }

    if (req.files && req.files.hinh_anh && req.files.hinh_anh[0]) {
      deleteFile(product.hinh_anh);
      product.hinh_anh = `/uploads/${req.files.hinh_anh[0].filename}`;
    }

    if (req.files && req.files.danh_sach_anh && req.files.danh_sach_anh.length > 0) {
      if (!giu_anh_cu) {
        (product.danh_sach_anh || []).forEach(deleteFile);
        product.danh_sach_anh = [];
      }
      req.files.danh_sach_anh.forEach((f) => {
        product.danh_sach_anh.push(`/uploads/${f.filename}`);
      });
    }

    product.ten_san_pham = ten_san_pham;
    product.mo_ta = mo_ta;
    product.thuong_hieu = thuong_hieu;
    product.danh_muc = danh_muc;
    product.gioi_tinh = gioi_tinh || "Unisex";
    product.chat_lieu = chat_lieu;
    product.kieu_dang = kieu_dang;
    product.huong_dan_bao_quan = huong_dan_bao_quan;

    const validTrangThai = ["dang_ban", "ngung_ban"];
    if (!validTrangThai.includes(product.trang_thai)) {
      product.trang_thai = "dang_ban";
    }

    const giaGoc = Number(gia_goc) || 0;
    const giamGia = Number(phan_tram_giam_gia) || 0;
    product.gia_goc = giaGoc;
    product.phan_tram_giam_gia = giamGia;
    product.gia_hien_tai = Math.round(giaGoc * (1 - giamGia / 100));

    if (bien_the && Array.isArray(bien_the)) {
      const skuSet = new Set();
      const parsed = [];
      let autoIdx = 1;
      for (const bt of bien_the) {
        let sku = bt.ma_sku;
        if (!sku) {
          const prefix = (bt.mau_sac || "X").substring(0, 2).toUpperCase() + (bt.kich_co || "0");
          sku = `${prefix}-${Date.now().toString().slice(-4)}${autoIdx++}`;
        }
        if (skuSet.has(sku)) {
          sku = sku + "-" + autoIdx++;
        }
        skuSet.add(sku);

        const btGiaGoc = Number(bt.gia_goc) || giaGoc;
        const btGiaBan = Number(bt.gia_ban) || product.gia_hien_tai || btGiaGoc;

        parsed.push({
          mau_sac: bt.mau_sac || "", kich_co: bt.kich_co || "",
          so_luong: Number(bt.so_luong) || 0, ma_sku: sku,
          gia_goc: btGiaGoc, gia_ban: btGiaBan,
        });
      }
      product.bien_the = parsed;
      product.so_luong_ton = parsed.reduce((s, v) => s + v.so_luong, 0);
    }

    await product.save();
    res.status(200).json({ message: "Cập nhật sản phẩm thành công!", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

    if (product.so_luong_da_ban > 0) {
      product.trang_thai = "ngung_ban";
      await product.save();
      return res.status(200).json({
        message: "Sản phẩm đã phát sinh giao dịch. Đã chuyển sang trạng thái Ngừng kinh doanh.",
        switched: true,
      });
    }

    deleteFile(product.hinh_anh);
    (product.danh_sach_anh || []).forEach(deleteFile);

    await Product.findByIdAndDelete(req.params.id);
    await Cart.updateMany({}, { $pull: { san_pham: { san_pham_id: req.params.id } } });

    res.status(200).json({ message: "Đã xóa sản phẩm vĩnh viễn!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

function deleteFile(filePath) {
  if (!filePath || !filePath.startsWith("/uploads/")) return;
  const fullPath = path.join(__dirname, "../../", filePath);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch {}
  }
}
