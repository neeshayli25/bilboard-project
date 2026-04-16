import { useState } from "react";
import AdvertiserSidebar from "./AdvertiserSidebar";
import { Outlet } from "react-router-dom";

export default function AdvertiserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">
      <AdvertiserSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="p-6 overflow-y-auto h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}