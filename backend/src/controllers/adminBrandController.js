const Brand = require("../models/Brand");
const Product = require("../models/Product");

function slugify(str) {
  const s = String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "thuong-hieu";
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = base;
  let n = 0;
  while (true) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Brand.findOne(q).select("_id").lean();
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function nextMaThuongHieu() {
  const rows = await Brand.find({ ma_thuong_hieu: /^TH\d+$/i }).select("ma_thuong_hieu").lean();
  let max = 0;
  for (const r of rows) {
    const num = parseInt(String(r.ma_thuong_hieu).replace(/^TH/i, ""), 10);
    if (!Number.isNaN(num)) max = Math.max(max, num);
  }
  return `TH${String(max + 1).padStart(3, "0")}`;
}

async function bootstrapFromProducts() {
  const names = await Product.distinct("thuong_hieu", {
    thuong_hieu: { $nin: [null, ""] },
  });
  const sorted = names.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), "vi"));
  for (const ten of sorted) {
    const base = slugify(ten);
    const slug = await ensureUniqueSlug(base);
    const ma = await nextMaThuongHieu();
    try {
      await Brand.create({
        ma_thuong_hieu: ma,
        ten_thuong_hieu: ten,
        slug,
        mo_ta: `Thương hiệu ${ten}`,
        trang_thai: "hoat_dong",
      });
    } catch (e) {
      if (e.code === 11000) continue;
      throw e;
    }
  }
}

exports.listBrands = async (req, res) => {
  try {
    let total = await Brand.countDocuments();
    if (total === 0) {
      await bootstrapFromProducts();
      total = await Brand.countDocuments();
    }

    const q = String(req.query.q || "").trim();
    const trangThai = String(req.query.trang_thai || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const match = {};
    if (trangThai === "hoat_dong" || trangThai === "ngung_hoat_dong") {
      match.trang_thai = trangThai;
    }
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc, "i");
      match.$or = [{ ten_thuong_hieu: rx }, { ma_thuong_hieu: rx }, { slug: rx }];
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "san_pham",
          localField: "ten_thuong_hieu",
          foreignField: "thuong_hieu",
          as: "_prods",
        },
      },
      {
        $addFields: {
          so_san_pham: { $size: "$_prods" },
        },
      },
      { $project: { _prods: 0 } },
      { $sort: { ngay_tao: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "c" }],
        },
      },
    ];

    const agg = await Brand.aggregate(pipeline);
    const facet = agg[0] || { items: [], totalCount: [] };
    const items = facet.items || [];
    const filteredTotal = facet.totalCount[0]?.c ?? 0;

    res.json({
      items,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit) || 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải danh sách thương hiệu." });
  }
};

exports.getBrand = async (req, res) => {
  try {
    const doc = await Brand.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Không tìm thấy thương hiệu." });
    const so_san_pham = await Product.countDocuments({ thuong_hieu: doc.ten_thuong_hieu });
    res.json({ ...doc, so_san_pham });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
};

exports.createBrand = async (req, res) => {
  const fail = () => res.status(400).json({ message: "Thêm thất bại, vui lòng thử lại" });
  try {
    const ten = String(req.body.ten_thuong_hieu || "").trim();
    const mo_ta = String(req.body.mo_ta || "").trim();
    let slug = String(req.body.slug || "").trim().toLowerCase();
    const trang_thai = req.body.trang_thai === "ngung_hoat_dong" ? "ngung_hoat_dong" : "hoat_dong";
    const hinh_anh = String(req.body.hinh_anh || "").trim();

    if (!ten || !mo_ta) return fail();
    if (!slug) slug = slugify(ten);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail();

    slug = await ensureUniqueSlug(slug);
    const ma_thuong_hieu = await nextMaThuongHieu();

    const dupTen = await Brand.findOne({ ten_thuong_hieu: ten }).select("_id").lean();
    if (dupTen) return fail();

    await Brand.create({
      ma_thuong_hieu,
      ten_thuong_hieu: ten,
      slug,
      mo_ta,
      trang_thai,
      hinh_anh,
    });

    res.status(201).json({ message: "Thêm thương hiệu thành công" });
  } catch (err) {
    if (err.code === 11000) return fail();
    console.error(err);
    res.status(500).json({ message: "Thêm thất bại, vui lòng thử lại" });
  }
};

exports.updateBrand = async (req, res) => {
  const fail = () => res.status(400).json({ message: "Có lỗi xảy ra, vui lòng nhập lại" });
  try {
    const id = req.params.id;
    const doc = await Brand.findById(id);
    if (!doc) return res.status(404).json({ message: "Có lỗi xảy ra, vui lòng nhập lại" });

    const ten = String(req.body.ten_thuong_hieu ?? doc.ten_thuong_hieu).trim();
    const mo_ta = String(req.body.mo_ta ?? doc.mo_ta).trim();
    const trang_thai =
      req.body.trang_thai === "ngung_hoat_dong" || req.body.trang_thai === "hoat_dong"
        ? req.body.trang_thai
        : doc.trang_thai;
    const hinh_anh = String(req.body.hinh_anh ?? doc.hinh_anh ?? "").trim();

    if (!ten || !mo_ta) return fail();

    const oldTen = doc.ten_thuong_hieu;

    const dupTen = await Brand.findOne({
      ten_thuong_hieu: ten,
      _id: { $ne: doc._id },
    })
      .select("_id")
      .lean();
    if (dupTen) return fail();

    let slugInput = String(req.body.slug ?? doc.slug).trim().toLowerCase();
    if (!slugInput) slugInput = slugify(ten);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugInput)) slugInput = slugify(slugInput);
    const slug = await ensureUniqueSlug(slugInput, doc._id);

    doc.ten_thuong_hieu = ten;
    doc.mo_ta = mo_ta;
    doc.slug = slug;
    doc.trang_thai = trang_thai;
    doc.hinh_anh = hinh_anh;
    await doc.save();

    if (oldTen !== ten) {
      await Product.updateMany({ thuong_hieu: oldTen }, { $set: { thuong_hieu: ten } });
    }

    res.json({ message: "Chỉnh sửa thương hiệu thành công" });
  } catch (err) {
    if (err.code === 11000) return fail();
    console.error(err);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng nhập lại" });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const doc = await Brand.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy thương hiệu." });

    const count = await Product.countDocuments({ thuong_hieu: doc.ten_thuong_hieu });
    if (count > 0) {
      return res.status(400).json({ message: "Không thể xóa thương hiệu này" });
    }

    await Brand.deleteOne({ _id: doc._id });
    res.json({ message: "Đã xóa thương hiệu." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa thương hiệu." });
  }
};
