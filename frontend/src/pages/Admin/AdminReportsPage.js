import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import API_BASE from "../../config";
import "./AdminReportsPage.css";

const API = `${API_BASE}/api/admin/reports`;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function formatVnd(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2).replace(/\.?0+$/, "")} tỷ`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")} triệu`;
  return `${v.toLocaleString("vi-VN")} đ`;
}

function formatAxisVnd(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `${Math.round(n / 1e6)}tr`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

function pctBadge(pct) {
  const p = Number(pct) || 0;
  const cls = p > 0 ? "up" : p < 0 ? "down" : "flat";
  const sign = p > 0 ? "+" : "";
  return (
    <div className={`rp-kpi-delta ${cls}`}>
      {sign}
      {p}% so với kỳ trước
    </div>
  );
}

function todayParts() {
  const d = new Date();
  return {
    y: d.getFullYear(),
    monthStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
  };
}

export default function AdminReportsPage() {
  const t0 = useMemo(() => todayParts(), []);
  const [granularity, setGranularity] = useState("month");
  const [yearVal, setYearVal] = useState(t0.y);
  const [monthVal, setMonthVal] = useState(t0.monthStr);
  const [dateVal, setDateVal] = useState(t0.dateStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [exporting, setExporting] = useState(false);

  const queryParams = useMemo(() => {
    if (granularity === "year") {
      return { granularity, year: yearVal };
    }
    if (granularity === "month") {
      const [y, m] = monthVal.split("-").map((x) => parseInt(x, 10));
      return { granularity, year: y, month: m };
    }
    const [y, m, d] = dateVal.split("-").map((x) => parseInt(x, 10));
    return { granularity, year: y, month: m, day: d };
  }, [granularity, yearVal, monthVal, dateVal]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, { headers: authHeader(), params: queryParams });
      setData(res.data);
    } catch (e) {
      setData(null);
      setErr(e.response?.data?.message || "Không tải được báo cáo.");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/export`, {
        headers: authHeader(),
        params: queryParams,
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-${granularity}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setErr("Không xuất được file CSV.");
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis;
  const series = data?.bieu_do_doanh_thu || [];
  const statusRows = data?.don_theo_trang_thai || [];
  const totalDonut = statusRows.reduce((s, r) => s + (r.count || 0), 0);

  return (
    <div className="rp-page">
      <div className="rp-head">
        <div className="rp-title-block">
          <h1>BÁO CÁO THỐNG KÊ</h1>
          <p className="rp-sub">
            Đang xem: {data?.periodLabel || "—"}
            {loading && " · Đang tải…"}
          </p>
        </div>
        <div className="rp-toolbar">
          <div className="rp-seg" role="group" aria-label="Chu kỳ">
            <button
              type="button"
              className={granularity === "day" ? "active" : ""}
              onClick={() => setGranularity("day")}
            >
              Ngày
            </button>
            <button
              type="button"
              className={granularity === "month" ? "active" : ""}
              onClick={() => setGranularity("month")}
            >
              Tháng
            </button>
            <button
              type="button"
              className={granularity === "year" ? "active" : ""}
              onClick={() => setGranularity("year")}
            >
              Năm
            </button>
          </div>
          {granularity === "day" && (
            <input
              className="rp-picker"
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />
          )}
          {granularity === "month" && (
            <input
              className="rp-picker"
              type="month"
              value={monthVal}
              onChange={(e) => setMonthVal(e.target.value)}
            />
          )}
          {granularity === "year" && (
            <input
              className="rp-picker"
              type="number"
              min={2000}
              max={2100}
              value={yearVal}
              onChange={(e) => setYearVal(parseInt(e.target.value, 10) || t0.y)}
              aria-label="Năm"
            />
          )}
          <button type="button" className="rp-export" disabled={exporting || loading} onClick={handleExport}>
            {exporting ? "Đang xuất…" : "Xuất báo cáo"}
          </button>
        </div>
      </div>

      {err && (
        <div className="rp-err" style={{ marginBottom: 16 }}>
          {err}
        </div>
      )}

      {!loading && data && kpis && (
        <>
          <div className="rp-kpis">
            <div className="rp-kpi">
              <div className="rp-kpi-icon rev">
                <i className="fas fa-sack-dollar" />
              </div>
              <div className="rp-kpi-body">
                <div className="rp-kpi-label">Tổng doanh thu</div>
                <div className="rp-kpi-value">{formatVnd(kpis.tong_doanh_thu)}</div>
                {pctBadge(kpis.so_voi_ky_truoc?.tong_doanh_thu_pct)}
              </div>
            </div>
            <div className="rp-kpi">
              <div className="rp-kpi-icon ord">
                <i className="fas fa-cart-shopping" />
              </div>
              <div className="rp-kpi-body">
                <div className="rp-kpi-label">Đơn hàng mới</div>
                <div className="rp-kpi-value">{(kpis.don_hang_moi || 0).toLocaleString("vi-VN")}</div>
                {pctBadge(kpis.so_voi_ky_truoc?.don_hang_pct)}
              </div>
            </div>
            <div className="rp-kpi">
              <div className="rp-kpi-icon cus">
                <i className="fas fa-user-plus" />
              </div>
              <div className="rp-kpi-body">
                <div className="rp-kpi-label">Khách hàng mới</div>
                <div className="rp-kpi-value">{(kpis.khach_hang_moi || 0).toLocaleString("vi-VN")}</div>
                {pctBadge(kpis.so_voi_ky_truoc?.khach_hang_pct)}
              </div>
            </div>
            <div className="rp-kpi">
              <div className="rp-kpi-icon done">
                <i className="fas fa-circle-check" />
              </div>
              <div className="rp-kpi-body">
                <div className="rp-kpi-label">Tỷ lệ hoàn thành đơ</div>
                <div className="rp-kpi-value">{kpis.ty_le_hoan_thanh_pct ?? 0}%</div>
                {pctBadge(kpis.so_voi_ky_truoc?.ty_le_hoan_thanh_pct)}
              </div>
            </div>
          </div>

          <div className="rp-charts">
            <div className="rp-card">
              <h2>
                Biểu đồ doanh thu
                {granularity === "year" && " — theo tháng trong năm"}
                {granularity === "month" && " — theo ngày trong tháng"}
                {granularity === "day" && " — theo giờ trong ngày"}
              </h2>
              <div className="rp-chart-h">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatAxisVnd} tick={{ fontSize: 11 }} width={44} />
                    <Tooltip
                      formatter={(value) => [formatVnd(value), "Doanh thu"]}
                      labelFormatter={(l) => `Mốc: ${l}`}
                    />
                    <Bar dataKey="revenue" fill="#111" radius={[4, 4, 0, 0]} name="Doanh thu" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rp-card">
              <h2>Đơn hàng theo trạng thái</h2>
              <div className="rp-pie-wrap">
                <div className="rp-chart-h">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusRows}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {statusRows.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} stroke="#fff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="rp-pie-center">
                  <strong>{totalDonut.toLocaleString("vi-VN")}</strong>
                  <small>tổng đơn</small>
                </div>
              </div>
            </div>
          </div>

          <div className="rp-ranks">
            <RankBlock title="Sản phẩm bán chạy" rows={data.top_san_pham || []} qtyKey="qty" nameKey="name" />
            <RankBlock title="Thương hiệu bán chạy" rows={data.top_thuong_hieu || []} />
            <RankBlock title="Danh mục bán chạy" rows={data.top_danh_muc || []} />
          </div>
        </>
      )}

      {loading && !data && <div className="rp-loading">Đang tải dữ liệu…</div>}
    </div>
  );
}

function RankBlock({ title, rows, qtyKey = "qty", nameKey = "name" }) {
  return (
    <div className="rp-rank-card">
      <h3>{title}</h3>
      {(rows || []).length === 0 && <p className="rp-sub">Chưa có dữ liệu trong kỳ này.</p>}
      {(rows || []).map((row, i) => (
        <div key={`${row[nameKey]}-${i}`} className="rp-rank-row">
          <span className="rp-rank-num">{i + 1}</span>
          <div className="rp-rank-main">
            <div className="rp-rank-name">{row[nameKey]}</div>
            <div className="rp-rank-meta">Đã bán: {(row[qtyKey] || 0).toLocaleString("vi-VN")} sản phẩm</div>
            <div className="rp-bar-track">
              <div className="rp-bar-fill" style={{ width: `${row.barPct || 0}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
