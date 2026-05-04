const Order = require("../models/Order");
const User = require("../models/User");

const TZ = "Asia/Ho_Chi_Minh";

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function daysInMonth(y, m1to12) {
  return new Date(y, m1to12, 0).getDate();
}

/**
 * Khoảng thời gian hiện tại + kỳ trước (cùng độ dài) theo ngày / tháng / năm — mốc theo giờ VN.
 */
function getRanges(granularity, year, month, day) {
  const y = clamp(year, 2000, 2100);
  const m = clamp(month, 1, 12);
  const dMax = daysInMonth(y, m);
  const d = clamp(day, 1, dMax);

  if (granularity === "day") {
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    const prevStart = new Date(y, m - 1, d - 1, 0, 0, 0, 0);
    const prevEnd = new Date(y, m - 1, d - 1, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd, y, m, d };
  }

  if (granularity === "month") {
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const prevStart = new Date(y, m - 2, 1, 0, 0, 0, 0);
    const prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd, y, m, d: null };
  }

  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);
  const prevStart = new Date(y - 1, 0, 1, 0, 0, 0, 0);
  const prevEnd = new Date(y - 1, 11, 31, 23, 59, 59, 999);
  return { start, end, prevStart, prevEnd, y, m: null, d: null };
}

function periodLabel(granularity, y, m, d) {
  if (granularity === "day") {
    return `Ngày ${d}/${m}/${y}`;
  }
  if (granularity === "month") {
    return `Tháng ${m}/${y}`;
  }
  return `Năm ${y}`;
}

function pctChange(cur, prev) {
  if (prev === 0 || prev == null) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

async function sumRevenueNonCancelled(start, end) {
  const row = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        trang_thai_don: { $ne: "huy" },
      },
    },
    { $group: { _id: null, total: { $sum: "$tong_cong" } } },
  ]);
  return row[0]?.total || 0;
}

async function countOrders(start, end) {
  return Order.countDocuments({ createdAt: { $gte: start, $lte: end } });
}

async function countNewCustomers(start, end) {
  return User.countDocuments({
    vai_tro: "khach_hang",
    createdAt: { $gte: start, $lte: end },
  });
}

async function completionRate(start, end) {
  const [tot, done] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Order.countDocuments({
      createdAt: { $gte: start, $lte: end },
      trang_thai_don: "hoan_thanh",
    }),
  ]);
  if (!tot) return 0;
  return Math.round((done / tot) * 1000) / 10;
}

/** Nhóm trạng thái đơn cho biểu đồ (4 nhóm như mock). */
function statusGroupExpr() {
  return {
    $switch: {
      branches: [
        { case: { $eq: ["$trang_thai_don", "hoan_thanh"] }, then: "hoan_thanh" },
        {
          case: {
            $in: ["$trang_thai_don", ["dang_giao", "da_giao_hang"]],
          },
          then: "dang_giao",
        },
        { case: { $eq: ["$trang_thai_don", "huy"] }, then: "huy" },
      ],
      default: "cho_xu_ly",
    },
  };
}

const STATUS_META = {
  hoan_thanh: { label: "Hoàn thành", color: "#2563eb" },
  dang_giao: { label: "Đang giao", color: "#f97316" },
  huy: { label: "Đã hủy", color: "#dc2626" },
  cho_xu_ly: { label: "Chờ xử lý", color: "#16a34a" },
};

async function orderStatusDistribution(start, end) {
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: statusGroupExpr(), count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const order = ["hoan_thanh", "dang_giao", "huy", "cho_xu_ly"];
  return order.map((key) => ({
    key,
    label: STATUS_META[key].label,
    color: STATUS_META[key].color,
    count: map[key] || 0,
  }));
}

async function revenueSeries(granularity, y, m, d) {
  if (granularity === "year") {
    const buckets = [];
    for (let mo = 1; mo <= 12; mo += 1) {
      const start = new Date(y, mo - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, mo, 0, 23, 59, 59, 999);
      const total = await sumRevenueNonCancelled(start, end);
      buckets.push({ key: String(mo), label: `T${mo}`, revenue: total });
    }
    return buckets;
  }

  if (granularity === "month") {
    const last = daysInMonth(y, m);
    const buckets = [];
    for (let day = 1; day <= last; day += 1) {
      const start = new Date(y, m - 1, day, 0, 0, 0, 0);
      const end = new Date(y, m - 1, day, 23, 59, 59, 999);
      const total = await sumRevenueNonCancelled(start, end);
      buckets.push({ key: String(day), label: String(day), revenue: total });
    }
    return buckets;
  }

  const buckets = [];
  for (let h = 0; h < 24; h += 1) {
    const start = new Date(y, m - 1, d, h, 0, 0, 0);
    const end = new Date(y, m - 1, d, h, 59, 59, 999);
    const total = await sumRevenueNonCancelled(start, end);
    buckets.push({
      key: String(h),
      label: `${h}h`,
      revenue: total,
    });
  }
  return buckets;
}

async function topProductsByQty(start, end, limit = 5) {
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        trang_thai_don: { $ne: "huy" },
      },
    },
    { $unwind: "$chi_tiet" },
    {
      $group: {
        _id: "$chi_tiet.san_pham_id",
        qty: { $sum: "$chi_tiet.so_luong" },
        name: { $first: "$chi_tiet.ten_san_pham" },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: limit },
  ]);
  const maxQty = rows[0]?.qty || 1;
  return rows.map((r) => ({
    id: String(r._id),
    name: r.name || "Sản phẩm",
    qty: r.qty,
    barPct: Math.round((r.qty / maxQty) * 100),
  }));
}

async function topFromProductField(start, end, fieldPath, limit = 5) {
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        trang_thai_don: { $ne: "huy" },
      },
    },
    { $unwind: "$chi_tiet" },
    {
      $lookup: {
        from: "san_pham",
        localField: "chi_tiet.san_pham_id",
        foreignField: "_id",
        as: "sp",
      },
    },
    { $unwind: { path: "$sp", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: [`$sp.${fieldPath}`, "Khác"] },
        qty: { $sum: "$chi_tiet.so_luong" },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: limit },
  ]);
  const maxQty = rows[0]?.qty || 1;
  return rows.map((r) => ({
    name: r._id && String(r._id).trim() ? r._id : "Khác",
    qty: r.qty,
    barPct: Math.round((r.qty / maxQty) * 100),
  }));
}

exports.getReports = async (req, res) => {
  try {
    const granularity = ["day", "month", "year"].includes(String(req.query.granularity))
      ? String(req.query.granularity)
      : "month";
    const now = new Date();
    const year = clamp(parseInt(req.query.year, 10) || now.getFullYear(), 2000, 2100);
    const month = clamp(parseInt(req.query.month, 10) || now.getMonth() + 1, 1, 12);
    const day = clamp(parseInt(req.query.day, 10) || now.getDate(), 1, 31);

    const ranges = getRanges(granularity, year, month, day);
    const { start, end, prevStart, prevEnd } = ranges;

    const [
      revenue,
      revenuePrev,
      orders,
      ordersPrev,
      customers,
      customersPrev,
      completion,
      completionPrev,
      statusDist,
      series,
      topSp,
      topBrand,
      topCat,
    ] = await Promise.all([
      sumRevenueNonCancelled(start, end),
      sumRevenueNonCancelled(prevStart, prevEnd),
      countOrders(start, end),
      countOrders(prevStart, prevEnd),
      countNewCustomers(start, end),
      countNewCustomers(prevStart, prevEnd),
      completionRate(start, end),
      completionRate(prevStart, prevEnd),
      orderStatusDistribution(start, end),
      revenueSeries(granularity, ranges.y, ranges.m, ranges.d),
      topProductsByQty(start, end, 5),
      topFromProductField(start, end, "thuong_hieu", 5),
      topFromProductField(start, end, "danh_muc", 5),
    ]);

    res.json({
      timezone: TZ,
      granularity,
      periodLabel: periodLabel(granularity, ranges.y, ranges.m, ranges.d),
      range: { start: start.toISOString(), end: end.toISOString() },
      kpis: {
        tong_doanh_thu: revenue,
        don_hang_moi: orders,
        khach_hang_moi: customers,
        ty_le_hoan_thanh_pct: completion,
        so_voi_ky_truoc: {
          tong_doanh_thu_pct: pctChange(revenue, revenuePrev),
          don_hang_pct: pctChange(orders, ordersPrev),
          khach_hang_pct: pctChange(customers, customersPrev),
          ty_le_hoan_thanh_pct: pctChange(completion, completionPrev),
        },
      },
      bieu_do_doanh_thu: series,
      don_theo_trang_thai: statusDist,
      top_san_pham: topSp,
      top_thuong_hieu: topBrand,
      top_danh_muc: topCat,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tải được báo cáo." });
  }
};

function csvEscape(s) {
  const t = String(s ?? "").replace(/"/g, '""');
  return `"${t}"`;
}

exports.exportReportsCsv = async (req, res) => {
  try {
    const granularity = ["day", "month", "year"].includes(String(req.query.granularity))
      ? String(req.query.granularity)
      : "month";
    const now = new Date();
    const year = clamp(parseInt(req.query.year, 10) || now.getFullYear(), 2000, 2100);
    const month = clamp(parseInt(req.query.month, 10) || now.getMonth() + 1, 1, 12);
    const day = clamp(parseInt(req.query.day, 10) || now.getDate(), 1, 31);

    const ranges = getRanges(granularity, year, month, day);
    const { start, end, prevStart, prevEnd } = ranges;

    const [revenue, revenuePrev, orders, ordersPrev, series, statusDist] = await Promise.all([
      sumRevenueNonCancelled(start, end),
      sumRevenueNonCancelled(prevStart, prevEnd),
      countOrders(start, end),
      countOrders(prevStart, prevEnd),
      revenueSeries(granularity, ranges.y, ranges.m, ranges.d),
      orderStatusDistribution(start, end),
    ]);

    const label = periodLabel(granularity, ranges.y, ranges.m, ranges.d);
    const lines = [
      "\ufeff",
      "Báo cáo thống kê NO NAME",
      `Kỳ,${csvEscape(label)}`,
      `Từ,${csvEscape(start.toISOString())}`,
      `Đến,${csvEscape(end.toISOString())}`,
      "",
      "Chỉ số,Giá trị,% so với kỳ trước",
      `Tổng doanh thu (VND),${revenue},${pctChange(revenue, revenuePrev)}`,
      `Đơn hàng mới,${orders},${pctChange(orders, ordersPrev)}`,
      "",
      "Biểu đồ doanh thu theo kỳ",
      "Mốc,Doanh thu (VND)",
      ...series.map((b) => `${csvEscape(b.label)},${b.revenue}`),
      "",
      "Đơn theo trạng thái",
      "Trạng thái,Số lượng",
      ...statusDist.map((s) => `${csvEscape(s.label)},${s.count}`),
      "",
    ];

    const filename = `bao-cao-${granularity}-${ranges.y}${ranges.m ? `-${ranges.m}` : ""}${ranges.d ? `-${ranges.d}` : ""}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(lines.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không xuất được báo cáo." });
  }
};
