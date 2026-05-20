import { Routes, Route, Navigate } from "react-router-dom";
import { useSettings } from "./context/SettingsContext";
import MaintenancePage from "./components/ui/MaintenancePage";

/* Auth – from components/auth */
import RoleSelection from "./components/auth/RoleSelection";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import ForgotPassword from "./components/auth/ForgotPassword";
import PayFastCardCallback from "./components/auth/PayFastCardCallback";
import VerifyEmail from "./components/auth/VerifyEmail";

/* Layouts */
import AdminLayout from "./components/admin/AdminLayout";
import AdvertiserLayout from "./components/advertiser/AdvertiserLayout";

/* Admin Pages */
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminBookings from "./components/admin/AdminBookings";
import AdminBillboards from "./components/admin/AdminBillboards";
import AdminUsers from "./components/admin/AdminUsers";
import AdminSchedule from "./components/admin/AdminSchedule";
import AdminPayments from "./components/admin/AdminPayments";
import AdminNotifications from "./components/admin/AdminNotifications";
import AdminReports from "./components/admin/AdminReports";
import AdminProfile from "./components/admin/AdminProfile";
import AdminSettings from "./components/admin/AdminSettings";

/* Advertiser Pages */
import AdvertiserDashboard from "./components/advertiser/AdvertiserDashboard";
import CreateBooking from "./components/advertiser/CreateBooking";
import SelectBillboard from "./components/advertiser/SelectBillboard";
import UploadAd from "./components/advertiser/UploadAd";
import MyBookings from "./components/advertiser/MyBookings";
import Payments from "./components/advertiser/Payments";
import Invoices from "./components/advertiser/Invoices";
import AdvertiserProfile from "./components/advertiser/AdvertiserProfile";
import AdvertiserNotifications from "./components/advertiser/AdvertiserNotifications";
import AdvertiserSettings from "./components/advertiser/AdvertiserSettings";

import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  const { settings, isLoaded } = useSettings();

  // Don't render routes until settings are loaded from localStorage
  if (!isLoaded) return null;

  // Advertiser-facing maintenance guard
  const isAdvertiserBlocked = settings.maintenanceMode;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<RoleSelection />} />
      <Route path="/login" element={<Login />} />
      {/* Signup blocked when allowNewRegistrations is OFF */}
      <Route
        path="/signup"
        element={settings.allowNewRegistrations ? <Signup /> : <Navigate to="/login" replace state={{ blocked: true }} />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />
      <Route path="/payfast-card-callback" element={<PayFastCardCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/maintenance" element={<MaintenancePage />} />

      {/* Admin Routes — always accessible regardless of maintenance */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="billboards" element={<AdminBillboards />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Advertiser Routes — blocked during maintenance */}
      <Route element={<ProtectedRoute allowedRole="advertiser" />}>
        <Route
          path="/advertiser"
          element={isAdvertiserBlocked ? <MaintenancePage /> : <AdvertiserLayout />}
        >
          <Route index element={<AdvertiserDashboard />} />
          <Route path="create-ad" element={<UploadAd />} />
          <Route path="create-booking" element={<CreateBooking />} />
          <Route path="billboards" element={<SelectBillboard />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="payments" element={<Payments />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="profile" element={<AdvertiserProfile />} />
          <Route path="notifications" element={<AdvertiserNotifications />} />
          <Route path="settings" element={<AdvertiserSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
