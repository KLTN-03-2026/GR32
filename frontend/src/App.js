import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";

import ForgotPassword from "./components/Login/ForgotPassword";
import Login from "./components/Login/Login";
import ResetPassword from "./components/Login/ResetPassword";
import Register from "./components/Register/Register";
import ActivateAccount from "./pages/ActivateAccount/ActivateAccount";
import AdminDashboardHome from "./pages/Admin/AdminDashboardHome";
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminProductForm from "./pages/Admin/AdminProductForm";
import AdminProducts from "./pages/Admin/AdminProducts";
import CartPage from "./pages/Cart/CartPage";
import CategoryPage from "./pages/Category/CategoryPage";
import Home from "./pages/Home/Home";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import ProductsPage from "./pages/Products/ProductsPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import SearchPage from "./pages/Search/SearchPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. TRANG CHỦ */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        {/* 2. HỆ THỐNG TÀI KHOẢN */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/activate/:token" element={<ActivateAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* 3. SẢN PHẨM & TÌM KIẾM */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/danh-muc/:slug" element={<CategoryPage />} />

        {/* 4. KHÁCH HÀNG */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* 5. HỆ THỐNG QUẢN TRỊ (Admin / Nhân viên) */}
        <Route path="/admin-dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboardHome />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/edit/:id" element={<AdminProductForm />} />
        </Route>

        {/* 6. 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
