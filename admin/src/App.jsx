import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import AdminLogin from "./components/AdminLogin";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { Routes, Route, Navigate } from "react-router-dom";
import AddProduct from "./pages/AddProduct/AddProduct";
import EditProduct from "./pages/EditProduct/EditProduct";
import AddMedia from "./pages/AddMedia/AddMedia";
import List from "./pages/List/List";
import Order from "./pages/Orders/Order";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Reviews from "./pages/Reviews/Reviews";
import Vendors from "./pages/Vendors/Vendors";
import MarketplaceProducts from "./pages/MarketplaceProducts/MarketplaceProducts";
import { resolveApiBaseUrl } from "./apiBase";

const url = resolveApiBaseUrl();

const AdminApp = () => {
  const { user, loading } = useAuth();
  if (loading) return <div role="status">Checking admin access…</div>;
  if (!user) return <AdminLogin />;
  return (
    <div>
      <ToastContainer />
      <Navbar />
      <hr />
      <div className="app-content">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Navigate to="/list" replace />} />
          <Route path="*" element={<Navigate to="/list" replace />} />
          <Route path="/list" element={<List url={url} />} />
          <Route path="/orders" element={<Order url={url} />} />
          <Route path="/reviews" element={<Reviews url={url} />} />
          <Route path="/vendors" element={<Vendors url={url} />} />
          <Route path="/marketplace-products" element={<MarketplaceProducts url={url} />} />
          <Route path="/add" element={<AddProduct url={url} />} />
          <Route path="/edit/:id" element={<EditProduct url={url} />} />
          <Route path="/add-media/:id" element={<AddMedia url={url} />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => <AuthProvider url={url}><AdminApp /></AuthProvider>;
export default App;
