import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function PublicLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div
      className={`min-h-screen ${
        isHomePage ? "page-rainbow-bg text-white" : "bg-white text-slate-900"
      }`}
    >
      <Navbar />

      <main className="min-h-[calc(100vh-78px)] overflow-x-clip pt-[78px] sm:min-h-[calc(100vh-86px)] sm:pt-[86px]">
        <div className="min-h-[calc(100vh-78px)] overflow-x-clip sm:min-h-[calc(100vh-86px)]">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
