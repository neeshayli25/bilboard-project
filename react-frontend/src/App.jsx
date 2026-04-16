import { Routes, Route } from "react-router-dom";

/* Auth – from components/auth */
import RoleSelection from "./components/auth/RoleSelection";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import ForgotPassword from "./components/auth/ForgotPassword";

/* Layouts */
import AdminLayout from "./components/admin/AdminLayout";
import AdvertiserLayout from "./components/advertiser/AdvertiserLayout";

/* Admin Pages */
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminBillboards from "./components/admin/AdminBillboards";
import AdminAds from "./components/admin/AdminAds";
import AdminUsers from "./components/admin/AdminUsers";
import AdminSchedule from "./components/admin/AdminSchedule";
import AdminPayments from "./components/admin/AdminPayments";
import AdminNotifications from "./components/admin/AdminNotifications";
import AdminReports from "./components/admin/AdminReports";
import AdminProfile from "./components/admin/AdminProfile";
import AdminSettings from "./components/admin/AdminSettings";

/* Advertiser Pages */
import AdvertiserDashboard from "./components/advertiser/AdvertiserDashboard";
import UploadAd from "./components/advertiser/UploadAd";
import CreateBooking from "./components/advertiser/CreateBooking";
import MyAds from "./components/advertiser/MyAds";
import SelectBillboard from "./components/advertiser/SelectBillboard";
import MyBookings from "./components/advertiser/MyBookings";
import Payments from "./components/advertiser/Payments";
import Invoices from "./components/advertiser/Invoices";
import AdvertiserReports from "./components/advertiser/AdvertiserReports";
import AdvertiserProfile from "./components/advertiser/AdvertiserProfile";
import AdvertiserNotifications from "./components/advertiser/AdvertiserNotifications";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<RoleSelection />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="billboards" element={<AdminBillboards />} />
        <Route path="approvals" element={<AdminAds />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="schedule" element={<AdminSchedule />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Advertiser Routes */}
      <Route path="/advertiser" element={<AdvertiserLayout />}>
        <Route index element={<AdvertiserDashboard />} />
        <Route path="create-booking" element={<CreateBooking />} />
        <Route path="upload" element={<UploadAd />} />
        <Route path="my-ads" element={<MyAds />} />
        <Route path="billboards" element={<SelectBillboard />} />
        <Route path="my-bookings" element={<MyBookings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="reports" element={<AdvertiserReports />} />
        <Route path="profile" element={<AdvertiserProfile />} />
        <Route path="notifications" element={<AdvertiserNotifications />} />
      </Route>
    </Routes>
  );
}

export default App;