import { useEffect, useMemo, useState } from "react";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import Badge from "../../components/common/Badge";
import {
  getMaintenanceAnnouncement,
  updateMaintenanceAnnouncement,
} from "../../api/adminAnnouncementsAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";

const EMPTY_NOTICE = {
  title: "Website Maintenance",
  message: "",
  status: "draft",
  updatedAt: "",
  updatedBy: "",
  approvedAt: "",
  approvedBy: "",
  rejectedAt: "",
  rejectedBy: "",
};

function normalizeNotice(value) {
  return {
    ...EMPTY_NOTICE,
    ...(value && typeof value === "object" ? value : {}),
  };
}

function formatTimestamp(value) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
}

function getStatusBadgeColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "green";
    case "rejected":
      return "red";
    default:
      return "orange";
  }
}

export default function AdminAnnouncementsPage() {
  const [notice, setNotice] = useState(EMPTY_NOTICE);
  const [draft, setDraft] = useState(EMPTY_NOTICE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadNotice() {
      try {
        setLoading(true);
        setError("");
        const response = await getMaintenanceAnnouncement();
        const nextNotice = normalizeNotice(response);

        if (!isMounted) {
          return;
        }

        setNotice(nextNotice);
        setDraft(nextNotice);
      } catch (requestError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              requestError,
              "Unable to load the maintenance announcement."
            )
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadNotice();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasPublishableCopy = Boolean(
    String(draft.title || "").trim() || String(draft.message || "").trim()
  );

  const liveSummary = useMemo(() => {
    if (notice.status !== "approved" || !notice.message.trim()) {
      return "No approved maintenance announcement is currently showing on the homepage.";
    }

    return "This approved maintenance announcement is live on the homepage and will appear on every refresh.";
  }, [notice]);

  const handleFieldChange = (key, value) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleEditOpen = () => {
    setDraft(notice);
    setEditing(true);
    setSuccessMessage("");
  };

  const handleCancelEdit = () => {
    setDraft(notice);
    setEditing(false);
    setError("");
  };

  const handleSave = async (status) => {
    try {
      if ((status === "approved" || status === "draft") && !hasPublishableCopy) {
        setError("Add a title or message before saving this announcement.");
        return;
      }

      setSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await updateMaintenanceAnnouncement({
        ...draft,
        status,
      });
      const nextNotice = normalizeNotice(response);

      setNotice(nextNotice);
      setDraft(nextNotice);
      setEditing(false);
      setSuccessMessage(
        status === "approved"
          ? "Maintenance announcement approved and pushed to the homepage."
          : status === "rejected"
          ? "Maintenance announcement rejected. It will stay hidden on the homepage."
          : "Maintenance announcement draft saved."
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to update the maintenance announcement."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardPanel
          title="Maintenance Announcement"
          actionLabel={editing ? "" : "Edit Notice"}
          onAction={editing ? undefined : handleEditOpen}
        >
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Loading announcement settings...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  label={notice.status || "Draft"}
                  color={getStatusBadgeColor(notice.status)}
                />
                <p className="text-sm text-slate-500">{liveSummary}</p>
              </div>

              <div className="rounded-[24px] border border-[#853953]/18 bg-[linear-gradient(135deg,#853953_0%,#5f2439_60%,#311623_100%)] p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
                <p className="font-condensed text-[11px] uppercase tracking-[0.24em] text-[#f7d7e3]">
                  Homepage Maintenance Banner
                </p>
                <h3 className="mt-3 font-heading text-3xl tracking-[0.06em]">
                  {notice.title || "Website Maintenance"}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">
                  {notice.message || "No maintenance message is currently written."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    Last Updated
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatTimestamp(notice.updatedAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {notice.updatedBy || "No editor recorded yet."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    Last Approved
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatTimestamp(notice.approvedAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {notice.approvedBy || "Not approved yet."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title={editing ? "Edit Maintenance Notice" : "Announcement Controls"}>
          <div className="space-y-4">
            {!editing ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Use <span className="font-semibold text-slate-900">Edit Notice</span>{" "}
                to update the maintenance copy, then approve or reject it for the
                homepage.
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="maintenance-title"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Notice Title
                  </label>
                  <input
                    id="maintenance-title"
                    type="text"
                    value={draft.title}
                    onChange={(event) =>
                      handleFieldChange("title", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#853953] focus:ring-2 focus:ring-[#853953]/15"
                    placeholder="Website Maintenance"
                  />
                </div>

                <div>
                  <label
                    htmlFor="maintenance-message"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Maintenance Message
                  </label>
                  <textarea
                    id="maintenance-message"
                    value={draft.message}
                    onChange={(event) =>
                      handleFieldChange("message", event.target.value)
                    }
                    rows={6}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#853953] focus:ring-2 focus:ring-[#853953]/15"
                    placeholder="Example: Website is under maintenance. Live stats and admin actions may refresh a little slower than usual."
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Approve to publish the notice on the homepage popup and announcement
                  section. Reject keeps the latest copy saved in admin only.
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave("draft")}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-70"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave("approved")}
                    disabled={saving || !hasPublishableCopy}
                    className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave("rejected")}
                    disabled={saving}
                    className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-70"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
