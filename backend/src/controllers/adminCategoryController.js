const Category = require("../models/Category");
const Product = require("../models/Product");

function slugify(str) {
  const s = String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "danh-muc";
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = base;
  let n = 0;
  while (true) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Category.findOne(q).select("_id").lean();
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function nextMaDanhMuc() {
  const cats = await Category.find({ ma_danh_muc: /^DM\d+$/i }).select("ma_danh_muc").lean();
  let max = 0;
  for (const c of cats) {
    const num = parseInt(String(c.ma_danh_muc).replace(/^DM/i, ""), 10);
    if (!Number.isNaN(num)) max = Math.max(max, num);
  }
  return `DM${String(max + 1).padStart(3, "0")}`;
}

/** Đồng bộ danh mục từ giá trị danh_muc đang có trên sản phẩm (lần đầu danh sách trống). */
async function bootstrapFromProducts() {
  const names = await Product.distinct("danh_muc", {
    danh_muc: { $nin: [null, ""] },
  });
  const sorted = names.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), "vi"));
  let idx = 0;
  for (const ten of sorted) {
    idx += 1;
    const base = slugify(ten);
    const slug = await ensureUniqueSlug(base);
    const ma = await nextMaDanhMuc();
    try {
      await Category.create({
        ma_danh_muc: ma,
        ten_danh_muc: ten,
        slug,
        mo_ta: `Danh mục ${ten}`,
        trang_thai: "hoat_dong",
      });
    } catch (e) {
      if (e.code === 11000) continue;
      throw e;
    }
  }
}

exports.listCategories = async (req, res) => {
  try {
    let total = await Category.countDocuments();
    if (total === 0) {
      await bootstrapFromProducts();
      total = await Category.countDocuments();
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
      match.$or = [{ ten_danh_muc: rx }, { ma_danh_muc: rx }, { slug: rx }];
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "san_pham",
          localField: "ten_danh_muc",
          foreignField: "danh_muc",
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

    const agg = await Category.aggregate(pipeline);
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
    res.status(500).json({ message: "Lỗi tải danh sách danh mục." });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const doc = await Category.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Không tìm thấy danh mục." });
    const so_san_pham = await Product.countDocuments({ danh_muc: doc.ten_danh_muc });
    res.json({ ...doc, so_san_pham });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
};

exports.createCategory = async (req, res) => {
  const fail = () => res.status(400).json({ message: "Thêm thất bại, vui lòng thử lại" });
  try {
    const ten = String(req.body.ten_danh_muc || "").trim();
    const mo_ta = String(req.body.mo_ta || "").trim();
    let slug = String(req.body.slug || "").trim().toLowerCase();
    const trang_thai = req.body.trang_thai === "ngung_hoat_dong" ? "ngung_hoat_dong" : "hoat_dong";

    if (!ten || !mo_ta) return fail();
    if (!slug) slug = slugify(ten);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail();

    slug = await ensureUniqueSlug(slug);
    const ma_danh_muc = await nextMaDanhMuc();

    const dupTen = await Category.findOne({ ten_danh_muc: ten }).select("_id").lean();
    if (dupTen) return fail();

    await Category.create({
      ma_danh_muc,
      ten_danh_muc: ten,
      slug,
      mo_ta,
      trang_thai,
    });

    res.status(201).json({ message: "Thêm danh mục thành công" });
  } catch (err) {
    if (err.code === 11000) return fail();
    console.error(err);
    res.status(500).json({ message: "Thêm thất bại, vui lòng thử lại" });
  }
};

exports.updateCategory = async (req, res) => {
  const fail = () => res.status(400).json({ message: "Có lỗi xảy ra, vui lòng nhập lại" });
  try {
    const id = req.params.id;
    const doc = await Category.findById(id);
    if (!doc) return res.status(404).json({ message: "Có lỗi xảy ra, vui lòng nhập lại" });

    const ten = String(req.body.ten_danh_muc ?? doc.ten_danh_muc).trim();
    const mo_ta = String(req.body.mo_ta ?? doc.mo_ta).trim();
    const trang_thai =
      req.body.trang_thai === "ngung_hoat_dong" || req.body.trang_thai === "hoat_dong"
        ? req.body.trang_thai
        : doc.trang_thai;

    if (!ten || !mo_ta) return fail();

    const oldTen = doc.ten_danh_muc;

    const dupTen = await Category.findOne({
      ten_danh_muc: ten,
      _id: { $ne: doc._id },
    })
      .select("_id")
      .lean();
    if (dupTen) return fail();

    let slugInput = String(req.body.slug ?? doc.slug).trim().toLowerCase();
    if (!slugInput) slugInput = slugify(ten);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugInput)) slugInput = slugify(slugInput);
    const slug = await ensureUniqueSlug(slugInput, doc._id);

    doc.ten_danh_muc = ten;
    doc.mo_ta = mo_ta;
    doc.slug = slug;
    doc.trang_thai = trang_thai;
    await doc.save();

    if (oldTen !== ten) {
      await Product.updateMany({ danh_muc: oldTen }, { $set: { danh_muc: ten } });
    }

    res.json({ message: "Chỉnh sửa danh mục thành công" });
  } catch (err) {
    if (err.code === 11000) return fail();
    console.error(err);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng nhập lại" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const doc = await Category.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy danh mục." });

    const count = await Product.countDocuments({ danh_muc: doc.ten_danh_muc });
    if (count > 0) {
      return res.status(400).json({ message: "Không thể xóa danh mục này" });
    }

    await Category.deleteOne({ _id: doc._id });
    res.json({ message: "Đã xóa danh mục." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa danh mục." });
  }
};
