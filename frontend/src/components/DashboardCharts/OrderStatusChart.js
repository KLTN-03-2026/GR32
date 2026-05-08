import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const OrderStatusChart = ({ data }) => {
  const COLORS = {
    "hoan_thanh": "#2563eb", // Blue
    "dang_giao": "#f97316",  // Orange
    "huy": "#dc2626",        // Red
    "cho_xu_ly": "#16a34a",  // Green
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 italic font-medium">Không có dữ liệu trạng thái đơn</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70} // Biến thành biểu đồ Donut
            outerRadius={100}
            paddingAngle={5} // Khoảng cách giữa các miếng
            cornerRadius={6} // Bo góc các miếng bánh
            dataKey="count"
            nameKey="label"
            animationBegin={0}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.key] || "#999"} 
                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
              />
            ))}
          </Pie>
          
          <Tooltip 
            formatter={(value) => [`${value} đơn`, "Số lượng"]}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.96)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              padding: "12px",
            }}
            itemStyle={{ fontWeight: "bold", fontSize: "14px" }}
          />
          
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-gray-600 font-medium text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OrderStatusChart;