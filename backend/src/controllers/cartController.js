const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { san_pham_id, mau_sac, kich_co, so_luong } = req.body;

    const product = await Product.findById(san_pham_id);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
    }

    if (product.bien_the && product.bien_the.length > 0) {
      const variant = product.bien_the.find(
        (v) => v.mau_sac === mau_sac && v.kich_co === kich_co
      );
      if (!variant) {
        return res.status(400).json({ message: "Phân loại sản phẩm không hợp lệ!" });
      }
      if (variant.so_luong < so_luong) {
        return res.status(400).json({ message: `Chỉ còn ${variant.so_luong} sản phẩm trong kho!` });
      }
    } else {
      if (product.so_luong_ton !== undefined && product.so_luong_ton < so_luong) {
        return res.status(400).json({ message: `Chỉ còn ${product.so_luong_ton} sản phẩm trong kho!` });
      }
    }

    let cart = await Cart.findOne({ nguoi_dung_id: userId });

    if (!cart) {
      cart = new Cart({ nguoi_dung_id: userId, san_pham: [] });
    }

    const existingIndex = cart.san_pham.findIndex(
      (item) =>
        item.san_pham_id.toString() === san_pham_id &&
        item.mau_sac === (mau_sac || "") &&
        item.kich_co === (kich_co || "")
    );

    if (existingIndex > -1) {
      cart.san_pham[existingIndex].so_luong += so_luong;
    } else {
      cart.san_pham.push({
        san_pham_id,
        ten_san_pham: product.ten_san_pham,
        hinh_anh: product.hinh_anh || (product.danh_sach_anh && product.danh_sach_anh[0]) || "",
        gia: product.gia_hien_tai || product.gia_goc,
        mau_sac: mau_sac || "",
        kich_co: kich_co || "",
        so_luong,
      });
    }

    await cart.save();

    const totalItems = cart.san_pham.reduce((sum, item) => sum + item.so_luong, 0);

    res.status(200).json({
      message: `Thêm vào giỏ hàng thành công!`,
      ten_san_pham: product.ten_san_pham,
      so_luong,
      totalItems,
      cart: cart.san_pham,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ nguoi_dung_id: req.user._id });

    if (!cart || cart.san_pham.length === 0) {
      return res.status(200).json({ san_pham: [], totalItems: 0 });
    }

    const totalItems = cart.san_pham.reduce((sum, item) => sum + item.so_luong, 0);
    res.status(200).json({ san_pham: cart.san_pham, totalItems });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ nguoi_dung_id: req.user._id });
    const totalItems = cart
      ? cart.san_pham.reduce((sum, item) => sum + item.so_luong, 0)
      : 0;
    res.status(200).json({ totalItems });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { itemId, so_luong } = req.body;

    if (so_luong < 1) {
      return res.status(400).json({ message: "Số lượng phải >= 1!" });
    }

    const cart = await Cart.findOne({ nguoi_dung_id: req.user._id });
    if (!cart) return res.status(404).json({ message: "Giỏ hàng trống!" });

    const item = cart.san_pham.id(itemId);
    if (!item) return res.status(404).json({ message: "Sản phẩm không có trong giỏ!" });

    item.so_luong = so_luong;
    await cart.save();

    const totalItems = cart.san_pham.reduce((sum, i) => sum + i.so_luong, 0);
    res.status(200).json({ message: "Cập nhật thành công!", totalItems, cart: cart.san_pham });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ nguoi_dung_id: req.user._id });
    if (!cart) return res.status(404).json({ message: "Giỏ hàng trống!" });

    cart.san_pham = cart.san_pham.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    const totalItems = cart.san_pham.reduce((sum, i) => sum + i.so_luong, 0);
    res.status(200).json({ message: "Đã xóa khỏi giỏ hàng!", totalItems, cart: cart.san_pham });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
};
