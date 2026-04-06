import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import RouteAction from "../common/RouteAction";
import { adminSidebarSections } from "../../utils/dashboardData";
import {
  updateAdminShellProfile,
  uploadAdminAvatar,
} from "../../api/adminShellAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { getMediaUrl } from "../../utils/media";
import {
  clearAuthSession,
  getAuthUser,
  isAuthorizedForPath,
  updateStoredAuthUser,
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
  const { profile, badges, refreshShell } = useAdminShell();
  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

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
      avatar: profile?.avatar || storedUser?.avatar || "",
    };
  }, [profile, storedUser]);

  const avatarUrl = resolvedProfile.avatar
    ? getMediaUrl(resolvedProfile.avatar)
    : "";

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

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploadingAvatar(true);
      setAvatarError("");

      const uploadResponse = await uploadAdminAvatar(file);
      const nextAvatar = uploadResponse?.path || "";
      const profileResponse = await updateAdminShellProfile({
        avatar: nextAvatar,
      });

      updateStoredAuthUser({
        avatar: profileResponse?.user?.avatar || nextAvatar,
      });
      await refreshShell();
    } catch (error) {
      setAvatarError(
        getApiErrorMessage(error, "Unable to upload the admin profile image.")
      );
    } finally {
      setUploadingAvatar(false);
    }
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

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="mt-5 flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={openAvatarPicker}
                  disabled={uploadingAvatar}
                  className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
                  title="Upload profile image"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={resolvedProfile.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    resolvedProfile.initials
                  )}

                  <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
                    <Camera size={14} />
                  </span>
                </button>
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
                <p className="mt-1 text-[10px] text-blue-100/70">
                  {uploadingAvatar ? "Uploading image..." : "Click photo to update"}
                </p>
                {avatarError ? (
                  <p className="mt-1 max-w-[150px] text-[10px] text-red-200">
                    {avatarError}
                  </p>
                ) : null}
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
