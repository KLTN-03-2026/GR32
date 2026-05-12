import React from "react";
import { Text } from "recharts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

const TopProductsChart = ({ data }) => {
  // Giới hạn chỉ hiển thị tối đa 5 sản phẩm
  const limitedData = data ? data.slice(0, 5) : [];
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 font-medium italic">Không có dữ liệu sản phẩm bán chạy</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={limitedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
        >

          {/* Định nghĩa dải màu Gradient */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            height={80}
            interval={0}
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <g transform={`translate(${x},${y})`}>
                  <Text
                    width={90} // Độ rộng tối đa của chữ trước khi ép xuống dòng
                    textAnchor="middle"
                    verticalAnchor="start"
                    fill="#64748b"
                    fontSize={12}
                    lineHeight="1.5em" // Khoảng cách giữa các dòng khi chữ bị ép xuống
                  >
                    {payload.value}
                  </Text>
                </g>
              );
            }}
          />

          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              padding: "12px",
            }}
            cursor={{ fill: 'transparent' }} // Ẩn mảng xám khi hover
          />

          <Bar
            dataKey="qty"
            fill="url(#barGradient)" // Sử dụng Gradient đã định nghĩa
            radius={[6, 6, 0, 0]} // Bo góc trên của cột
            name="Số lượng bán"
            animationDuration={1500}
          >
            {/* Hiệu ứng màu sắc khác biệt cho cột cao nhất nếu muốn */}
            {limitedData.map((entry, index) => (
              <Cell key={`cell-${index}`} className="hover:opacity-80 transition-all cursor-pointer" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopProductsChart;