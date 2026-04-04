import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import RouteAction from "../common/RouteAction";
import { adminSidebarSections } from "../../utils/dashboardData";
import {
  clearAuthSession,
  getAuthUser,
  isAuthorizedForPath,
} from "../../utils/authStorage";
import useAdminShell from "../../hooks/useAdminShell";

const franchiseSidebarSections = [
  {
    title: "Franchise",
    items: [{ label: "Dashboard", path: "/franchise", icon: "FR" }],
  },
];

const opsManagerSidebarSections = [
  {
    title: "Operations",
    items: [
      { label: "Matches", path: "/admin/matches", icon: "MT" },
      { label: "Live Match", path: "/admin/live-match", icon: "LM" },
    ],
  },
];

const scorerSidebarSections = [
  {
    title: "Scoring",
    items: [{ label: "Live Match", path: "/admin/live-match", icon: "LM" }],
  },
];

const financeSidebarSections = [
  {
    title: "Finance",
    items: [{ label: "Finance", path: "/admin/finance", icon: "FI" }],
  },
];

function getFallbackRoleLabel(role = "") {
  const labelMap = {
    super_admin: "Super Admin",
    ops_manager: "Ops Manager",
    franchise_admin: "Franchise Admin",
    scorer: "Scorer",
    finance_admin: "Finance Admin",
    fan_user: "Fan User",
  };

  return labelMap[role] || "Admin";
}

function getFallbackInitials(name = "") {
  const tokens = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "SP";
  }

  return tokens.map((token) => token[0]?.toUpperCase() || "").join("");
}

export default function AdminSidebar({ mobileOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = getAuthUser();
  const { profile, badges } = useAdminShell();

  const sidebarSectionsByRole = useMemo(
    () => ({
      super_admin: adminSidebarSections,
      ops_manager: opsManagerSidebarSections,
      scorer: scorerSidebarSections,
      finance_admin: financeSidebarSections,
      franchise_admin: franchiseSidebarSections,
    }),
    []
  );

  const resolvedProfile = useMemo(() => {
    const fallbackName = storedUser?.fullName || storedUser?.email || "Admin User";
    const fallbackRole = getFallbackRoleLabel(storedUser?.role);

    return {
      fullName: profile?.fullName || fallbackName,
      contextLabel:
        profile?.contextLabel || storedUser?.email || "League dashboard",
      roleLabel: profile?.roleLabel || fallbackRole,
      initials: profile?.initials || getFallbackInitials(fallbackName),
    };
  }, [profile, storedUser]);

  const sidebarSections = useMemo(
    () =>
      (sidebarSectionsByRole[storedUser?.role] || []).map((section) => ({
        ...section,
        items: section.items
          .filter((item) => isAuthorizedForPath(item.path, storedUser))
          .map((item) => ({
            ...item,
            badge: badges[item.path] ?? null,
          })),
      })),
    [badges, sidebarSectionsByRole, storedUser]
  );

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
    onClose?.();
  };

  const isActivePath = (path) =>
    path === "/admin" || path === "/franchise"
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col overflow-y-auto border-r border-blue-800 bg-[#0f3b97] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 lg:block">
          <div>
            <div className="font-heading text-3xl tracking-[0.16em] text-yellow-300">
              SP<span className="text-red-400">L</span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold uppercase tracking-[0.12em] text-white">
                {resolvedProfile.initials}
              </div>

              <div>
                <p className="font-condensed text-base font-bold tracking-[0.04em] text-white">
                  {resolvedProfile.fullName}
                </p>
                <p className="text-xs text-blue-100/80">
                  {resolvedProfile.contextLabel}
                </p>
                <span className="mt-1 inline-flex rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-yellow-200">
                  {resolvedProfile.roleLabel}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-3 py-4">
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="px-3 pb-2 font-condensed text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100/60">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => (
                  <RouteAction
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActivePath(item.path)
                        ? "bg-yellow-300/15 text-yellow-200"
                        : "text-blue-100/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="w-5 text-center">{item.icon}</span>
                    <span>{item.label}</span>

                    {item.badge ? (
                      <span
                        className={`ml-auto inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          String(item.badge).toUpperCase() === "LIVE"
                            ? "bg-red-500 text-white"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </RouteAction>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-blue-100/85 transition hover:text-yellow-200"
          >
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
