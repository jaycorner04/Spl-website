import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminTopbar from "../components/layout/AdminTopbar";

const titleMap = {
  "/admin": "ADMIN DASHBOARD",
  "/franchise": "FRANCHISE DASHBOARD",
  "/admin/analytics": "ANALYTICS",
  "/admin/matches": "MATCH MANAGEMENT",
  "/admin/players": "PLAYER MANAGEMENT",
  "/admin/finance": "FINANCE DASHBOARD",
  "/admin/teams": "TEAM MANAGEMENT",
  "/admin/franchises": "FRANCHISE MANAGEMENT",
  "/admin/approvals": "APPROVALS",
  "/admin/auction": "AUCTION MANAGEMENT",
  "/admin/live-match": "LIVE MATCH CONTROL",
};

export default function AdminLayout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const title = titleMap[location.pathname] || "ADMIN DASHBOARD";

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <AdminTopbar
        title={title}
        onMenuClick={() => setMobileSidebarOpen(true)}
      />

      <main className="min-h-screen bg-white px-4 py-5 md:px-6 lg:ml-[260px]">
        <Outlet />
      </main>
    </div>
  );
}
