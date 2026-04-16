import { useState } from "react";
import AdminSidebar from "./AdminSidebar";   // ✅ fixed path
import { Outlet } from "react-router-dom";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="p-6 overflow-y-auto h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
export default AdminLayout;