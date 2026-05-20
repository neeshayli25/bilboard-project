import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRole }) => {
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("role");

  // If no token, divert to login immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check it
  if (allowedRole && userRole !== allowedRole) {
    // Unauthorised role, send them back to their appropriate dashboard or login
    if (userRole === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (userRole === "advertiser") {
      return <Navigate to="/advertiser" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  // Authorised, render child routes via Outlet
  return <Outlet />;
};

export default ProtectedRoute;
