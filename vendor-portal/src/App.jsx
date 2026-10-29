import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import VendorLayout from "./components/Layout/VendorLayout";
import Dashboard from "./pages/Dashboard/Dashboard";
import SalesLog from "./pages/SalesLog/SalesLog";
import Login from "./pages/Login/Login";
import Apply from "./pages/Apply/Apply";
import NotFound from "./pages/NotFound/NotFound";

const App = () => {
  return (
    <>
      <Routes>
        <Route element={<VendorLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<SalesLog />} />
          <Route path="/login" element={<Login />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme="light" />
    </>
  );
};

export default App;
