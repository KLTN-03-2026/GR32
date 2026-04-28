const Category = require("../models/Category");
const Product = require("../models/Product");

/** Slug danh mục con → slug cha chuẩn (khớp menu / trang danh mục khách). */
const CANONICAL_CHILD_PARENT_SLUG = {
  "ao-thun-nam": "thoi-trang-nam",
  "ao-polo-nam": "thoi-trang-nam",
  "quan-jean-nam": "thoi-trang-nam",
  "quan-short-nam": "thoi-trang-nam",
  "ao-thun-nu": "thoi-trang-nu",
  "dam-vay": "thoi-trang-nu",
  "quan-nu": "thoi-trang-nu",
  "ao-khoac-nu": "thoi-trang-nu",
  "mu-non": "phu-kien",
  "tui-xach": "phu-kien",
  "that-lung": "phu-kien",
  "giay-dep": "phu-kien",
};

/** Tên danh mục (trùng Product.danh_muc) → slug cha chuẩn — bắt cả lỗi đánh máy thường gặp. */
const CANONICAL_TEN_TO_PARENT_SLUG = {
  "Áo thun nam": "thoi-trang-nam",
  "Áo polo nam": "thoi-trang-nam",
  "Quần jean nam": "thoi-trang-nam",
  "Quần short nam": "thoi-trang-nam",
  "Áo thun nữ": "thoi-trang-nu",
  "Đầm / Váy": "thoi-trang-nu",
  "Quần nữ": "thoi-trang-nu",
  "Áo khoác nữ": "thoi-trang-nu",
  "Mũ / Nón": "phu-kien",
  "Túi xách": "phu-kien",
  "Thắt lưng": "phu-kien",
  "Giày dép": "phu-kien",
  "Giầy dép": "phu-kien",
};

async function wouldCreateCycle(categoryId, newParentId) {
  if (!newParentId || !categoryId) return false;
  let cur = newParentId;
  for (let i = 0; i < 50; i += 1) {
    if (String(cur) === String(categoryId)) return true;
    const row = await Category.findById(cur).select("parent_id").lean();
    if (!row || !row.parent_id) break;
    cur = row.parent_id;
  }
  return false;
}

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

/**
 * Gán lại parent_id cho các danh mục con theo bảng chuẩn (vd. giày dép → Phụ kiện, không nằm dưới Quần).
 * Gọi một lần sau khi dữ liệu bị lệch (bootstrap tay / import sai).
 */
exports.repairCategoryTree = async (req, res) => {
  try {
    const parents = await Category.find({
      slug: { $in: ["thoi-trang-nam", "thoi-trang-nu", "phu-kien"] },
      trang_thai: "hoat_dong",
    })
      .select("_id slug")
      .lean();
    const parentIdBySlug = {};
    for (const p of parents) {
      parentIdBySlug[p.slug] = p._id;
    }

    const updates = [];
    const skipped = [];

    const applyParent = async (childId, parentSlug, label) => {
      const parentId = parentIdBySlug[parentSlug];
      if (!parentId) {
        skipped.push({ label, reason: `Thiếu danh mục cha slug=${parentSlug} (bấm tạo 3 cha hoặc tạo tay).` });
        return;
      }
      const doc = await Category.findById(childId);
      if (!doc) return;
      if (String(doc.parent_id || "") === String(parentId)) return;
      if (await wouldCreateCycle(doc._id, parentId)) {
        skipped.push({ ten: doc.ten_danh_muc, reason: "Tránh vòng cha–con" });
        return;
      }
      doc.parent_id = parentId;
      await doc.save();
      updates.push(`${doc.ten_danh_muc} (${doc.slug}) → cha ${parentSlug}`);
    };

    const all = await Category.find({ trang_thai: "hoat_dong" }).select("_id slug ten_danh_muc").lean();

    for (const [childSlug, parentSlug] of Object.entries(CANONICAL_CHILD_PARENT_SLUG)) {
      const row = all.find((c) => c.slug === childSlug);
      if (!row) continue;
      await applyParent(row._id, parentSlug, childSlug);
    }

    for (const [ten, parentSlug] of Object.entries(CANONICAL_TEN_TO_PARENT_SLUG)) {
      const row = all.find((c) => c.ten_danh_muc === ten);
      if (!row) continue;
      await applyParent(row._id, parentSlug, ten);
    }

    res.json({
      message:
        updates.length > 0
          ? `Đã chỉnh ${updates.length} danh mục con về đúng nhóm cha (Nam / Nữ / Phụ kiện).`
          : "Cây danh mục đã khớp chuẩn hoặc chưa có slug con tương ứng.",
      updates,
      skipped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không sửa được cây danh mục." });
  }
};

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

    const con = await Category.countDocuments({ parent_id: doc._id });
    if (con > 0) {
      return res.status(400).json({
        message:
          "Không thể xóa danh mục còn danh mục con. Hãy xóa hoặc chuyển các danh mục con trước.",
      });
    }

    const dangBan = await Product.countDocuments({
      danh_muc: doc.ten_danh_muc,
      trang_thai: "dang_ban",
    });
    if (dangBan > 0) {
      return res.status(400).json({
        message: `Không thể xóa: còn ${dangBan} sản phẩm đang bán gắn "${doc.ten_danh_muc}". Ngừng bán hoặc đổi danh mục sản phẩm rồi thử lại.`,
      });
    }

    await Product.updateMany({ danh_muc: doc.ten_danh_muc }, { $unset: { danh_muc: "" } });

    await Category.deleteOne({ _id: doc._id });
    res.json({
      message:
        "Đã xóa danh mục. Các sản phẩm chỉ còn trạng thái ngừng bán (hoặc không đang bán) đã được gỡ liên kết khỏi danh mục này.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa danh mục." });
  }
};
