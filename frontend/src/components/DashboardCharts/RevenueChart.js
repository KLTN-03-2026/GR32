import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

const RevenueChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 font-medium italic">Không có dữ liệu doanh thu</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-6">
        <p className="text-sm text-gray-500">Đơn vị: Việt Nam Đồng (VNĐ)</p>
      </div>
      <defs>
        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
        </linearGradient>
      </defs>
      <ResponsiveContainer width="100%" height={400}>
        {/* Chuyển sang LineChart với hiệu ứng Area bên dưới cho đẹp */}
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          {/* Lưới mờ hơn */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />

          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value}
          />

          <Tooltip
            cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              padding: "12px 16px",
            }}
            formatter={(value) => [
              <span className="font-bold text-gray-800">{value.toLocaleString()}đ</span>,
              "Doanh thu"
            ]}
          />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "20px", fontSize: "14px", fontWeight: "500" }}
          />

          {/* Đường line chính với hiệu ứng đổ bóng mờ */}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={4}
            dot={{ fill: "#fff", stroke: "#2563eb", strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, strokeWidth: 0, fill: "#2563eb" }}
            name="Doanh thu"
            animationDuration={2000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;