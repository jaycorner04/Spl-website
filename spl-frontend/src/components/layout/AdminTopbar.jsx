import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchAdminRecords } from "../../api/adminSearchAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { getAuthUser, isAuthorizedForPath } from "../../utils/authStorage";
import useAdminShell from "../../hooks/useAdminShell";

export default function AdminTopbar({
  title = "ADMIN DASHBOARD",
  onMenuClick,
}) {
  const authUser = getAuthUser();
  const isFranchiseAdmin = authUser?.role === "franchise_admin";
  const {
    notifications: liveNotifications,
    errorMessage: shellErrorMessage,
    isLoading: shellLoading,
  } = useAdminShell();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchGroups, setSearchGroups] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPreview, setSearchPreview] = useState(null);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const notifications = useMemo(
    () =>
      (Array.isArray(liveNotifications) ? liveNotifications : []).map((item) => ({
        ...item,
        unread: Boolean(item.unread) && !readNotificationIds.includes(item.id),
      })),
    [liveNotifications, readNotificationIds]
  );
  const visibleNotifications = useMemo(
    () =>
      notifications.filter(
        (item) => !item.path || isAuthorizedForPath(item.path, authUser)
      ),
    [authUser, notifications]
  );
  const unreadCount = visibleNotifications.filter((item) => item.unread).length;
  const visibleSearchGroups = useMemo(() => {
    return (Array.isArray(searchGroups) ? searchGroups : [])
      .map((group) => ({
        ...group,
        items: (Array.isArray(group.items) ? group.items : []).filter((item) =>
          isAuthorizedForPath(item.path, authUser)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [authUser, searchGroups]);
  const visibleSearchTotal = useMemo(
    () =>
      visibleSearchGroups.reduce(
        (total, group) => total + group.items.length,
        0
      ),
    [visibleSearchGroups]
  );

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      setSearchGroups([]);
      setSearchTotal(0);
      setSearchError("");
      setSearchLoading(false);
      setSearchPreview(null);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");
        setSearchGroups([]);
        setSearchTotal(0);
        const payload = await searchAdminRecords(trimmedQuery, 20);

        if (cancelled) {
          return;
        }

        setSearchGroups(Array.isArray(payload?.groups) ? payload.groups : []);
        setSearchTotal(Number(payload?.total || 0));
        setSearchOpen(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSearchGroups([]);
        setSearchTotal(0);
        setSearchError(
          getApiErrorMessage(error, "Unable to search the admin data right now.")
        );
        setSearchOpen(true);
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  function handleMarkAllAsRead() {
    setReadNotificationIds((current) => {
      const nextIds = new Set(current);
      visibleNotifications.forEach((item) => nextIds.add(item.id));
      return [...nextIds];
    });
  }

  function handleSearchResultClick(path, resourceKey, item) {
    if (isFranchiseAdmin) {
      const previewDetail = item.detail || {
        heading: item.title,
        eyebrow: "Search Result",
        accent: item.meta,
        rows: [
          { label: "Summary", value: item.subtitle || "Detail available from backend" },
          { label: "Type", value: resourceKey },
        ],
      };

      setSearchPreview({
        resourceKey,
        item: {
          ...item,
          detail: previewDetail,
        },
      });
      setSearchOpen(true);
      return;
    }

    const params = new URLSearchParams();
    params.set("search", item.title || searchQuery.trim());
    params.set("recordId", String(item.id));
    params.set("resource", resourceKey);
    params.set("mode", "view");
    params.set("focusToken", String(Date.now()));

    navigate(`${path}?${params.toString()}`);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchGroups([]);
    setSearchTotal(0);
    setSearchError("");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6 lg:ml-[260px]">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-yellow-300 hover:text-yellow-600 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      <h1 className="truncate font-heading text-xl tracking-[0.1em] text-slate-900 sm:text-2xl md:text-3xl">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block" ref={searchRef}>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchPreview(null);
                setSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2 || searchError) {
                  setSearchOpen(true);
                }
              }}
              placeholder="Search players, teams, matches..."
              className="w-52 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {searchOpen && searchQuery.trim().length >= 2 ? (
            <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[420px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_40px_rgba(15,23,42,0.16)]">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Search Results
                  </p>
                  <p className="text-xs text-slate-500">
                    Live backend results across admin data
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  {searchLoading ? "Searching..." : `${visibleSearchTotal} results`}
                </span>
              </div>

              {searchError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs text-red-600">
                  {searchError}
                </div>
              ) : null}

              {!searchError && !searchLoading && visibleSearchGroups.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  No admin records matched this search.
                </div>
              ) : null}

              {!searchError && visibleSearchGroups.length > 0 ? (
                <div
                  className="max-h-[26rem] space-y-3 overflow-y-auto pr-1"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {visibleSearchGroups.map((group) => (
                    <div key={group.key}>
                      <p className="mb-2 px-1 font-condensed text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {group.label}
                      </p>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <button
                            key={`${group.key}-${item.id}`}
                            type="button"
                            onClick={() =>
                              handleSearchResultClick(item.path, group.key, item)
                            }
                            className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-[#d8b5c1] hover:bg-[#fff7fa]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.title}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {item.subtitle}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#853953] ring-1 ring-slate-200">
                              {item.meta}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!searchError && searchPreview?.item?.detail ? (
                <div className="mt-3 rounded-2xl border border-[#ead2dc] bg-[#fff7fa] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#853953]">
                        {searchPreview.item.detail.eyebrow ||
                          `${searchPreview.resourceKey} result`}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {searchPreview.item.detail.heading || searchPreview.item.title}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#853953] ring-1 ring-[#ead2dc]">
                      {searchPreview.item.detail.accent || searchPreview.item.meta}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(searchPreview.item.detail.rows || []).map((row) => (
                      <div
                        key={`${searchPreview.item.id}-${row.label}`}
                        className="rounded-xl border border-white/80 bg-white/80 px-3 py-2"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {row.label}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-700">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-yellow-300 hover:text-yellow-600"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            ) : null}
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#853953] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[290px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_40px_rgba(15,23,42,0.16)] sm:w-[320px]">
              <div className="mb-3 flex items-start justify-between gap-3 px-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Notifications
                  </p>
                  <p className="text-xs text-slate-500">
                    Latest live admin updates
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-[#f6e8ee] px-2.5 py-1 text-[11px] font-medium text-[#853953]">
                    {unreadCount} new
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                      unreadCount > 0
                        ? "bg-[#853953] text-white hover:bg-[#6f2f46]"
                        : "cursor-not-allowed bg-slate-100 text-slate-400"
                    }`}
                  >
                    Mark all as read
                  </button>
                </div>
              </div>

              <div
                className="max-h-72 space-y-2 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin" }}
              >
                {shellErrorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-600">
                    {shellErrorMessage}
                  </div>
                ) : null}

                {!shellErrorMessage && shellLoading && visibleNotifications.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    Loading live notifications...
                  </div>
                ) : null}

                {!shellErrorMessage &&
                !shellLoading &&
                visibleNotifications.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    No admin notifications are active right now.
                  </div>
                ) : null}

                {visibleNotifications.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-3 ${
                      item.unread
                        ? "border-[#ead2dc] bg-[#fff7fa]"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          item.unread ? "bg-[#853953]" : "bg-slate-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {item.detail}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
