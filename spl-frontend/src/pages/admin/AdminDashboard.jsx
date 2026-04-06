import { useRef, useState } from "react";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import StatCard from "../../components/dashboard/StatCard";
import DataTable from "../../components/dashboard/DataTable";
import Badge from "../../components/common/Badge";
import ManagementModal from "../../components/dashboard/ManagementModal";
import {
  createFranchise,
  deleteFranchise,
  patchFranchise,
  updateFranchise,
  uploadFranchiseLogo,
} from "../../api/franchiseAPI";
import useAdminDashboard from "../../hooks/useAdminDashboard";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { formatFranchiseId } from "../../utils/adminFormatters";
import { getMediaUrl } from "../../utils/media";
import {
  findTeamBrandReference,
  getFallbackColor,
  getShortName,
} from "../../utils/teamBranding";

function getActivityColorClasses(color) {
  const map = {
    red: "bg-red-100 text-red-500",
    green: "bg-emerald-100 text-emerald-500",
    gold: "bg-yellow-100 text-yellow-600",
    blue: "bg-blue-100 text-blue-500",
    purple: "bg-purple-100 text-purple-500",
  };

  return map[color] || "bg-slate-100 text-slate-500";
}

function getAvatarColorClasses(color) {
  const map = {
    gold: "bg-yellow-50 text-yellow-600 border-yellow-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return map[color] || "bg-slate-50 text-slate-600 border-slate-200";
}

function getRoleBadgeColor(roleColor) {
  const map = {
    green: "green",
    blue: "blue",
    orange: "orange",
    purple: "purple",
  };

  return map[roleColor] || "slate";
}

function getProgressBarColorClass(color) {
  const map = {
    gold: "bg-yellow-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return map[color] || "bg-slate-400";
}

const emptyFranchiseForm = {
  company_name: "",
  owner_name: "",
  address: "",
  website: "",
  logo: "",
};

function getInputClass(readOnly = false) {
  return `w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ${
    readOnly ? "bg-slate-50 text-slate-600" : "bg-white text-slate-900"
  }`;
}

function getFranchiseInitials(name = "") {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapFranchiseToForm(franchise) {
  return {
    company_name: franchise.company_name || franchise.companyName || "",
    owner_name: franchise.owner_name || franchise.ownerName || "",
    address: franchise.address || "",
    website: franchise.website || "",
    logo: franchise.logo || "",
  };
}

function buildFranchisePayload(form) {
  return {
    company_name: form.company_name.trim(),
    owner_name: form.owner_name.trim(),
    address: form.address.trim(),
    website: form.website.trim(),
    logo: form.logo || "",
  };
}

export default function AdminDashboard() {
  const { dashboardData, errorMessage, isLoading, refreshDashboard } =
    useAdminDashboard();
  const {
    stats,
    pointsTableRows,
    seasonProgress,
    liveNow,
    franchiseOverview,
    recentActivities,
    topPerformers,
  } = dashboardData;
  const [franchiseModalType, setFranchiseModalType] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [franchiseForm, setFranchiseForm] = useState(emptyFranchiseForm);
  const [franchiseFormError, setFranchiseFormError] = useState("");
  const [savingFranchise, setSavingFranchise] = useState(false);
  const [uploadingFranchiseLogo, setUploadingFranchiseLogo] = useState(false);
  const [franchiseLogoUploadError, setFranchiseLogoUploadError] = useState("");
  const franchiseLogoInputRef = useRef(null);

  const columns = [
    {
      key: "rank",
      label: "#",
      render: (row) => (
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            row.rank <= 2
              ? "bg-yellow-100 text-yellow-600"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {row.rank}
        </span>
      ),
    },
    {
      key: "team",
      label: "Team",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: row.dot }}
          />
          <span>{row.team}</span>
        </div>
      ),
    },
    { key: "played", label: "P" },
    { key: "won", label: "W" },
    { key: "lost", label: "L" },
    {
      key: "nrr",
      label: "NRR",
      render: (row) => (
        <span
          className={
            String(row.nrr || "0").startsWith("+")
              ? "text-emerald-600"
              : "text-red-500"
          }
        >
          {row.nrr}
        </span>
      ),
    },
    {
      key: "points",
      label: "Pts",
      render: (row) => (
        <span className="font-bold text-yellow-600">{row.points}</span>
      ),
    },
  ];

  const franchiseColumns = [
    {
      key: "serial",
      label: "#",
      render: (_row, index) => (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
          {index + 1}
        </span>
      ),
    },
    {
      key: "companyName",
      label: "Franchise",
      render: (row) => {
        const brandReference = findTeamBrandReference(
          row.brandSourceName || row.featuredTeamName || row.companyName
        );
        const logoUrl = getMediaUrl(row.logo || "");
        const fallbackColor = brandReference?.logoColor || getFallbackColor("blue");

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${row.companyName} logo`}
                  className="h-full w-full object-contain"
                />
              ) : brandReference?.brandIcon ? (
                <brandReference.brandIcon
                  aria-label={`${row.companyName} logo`}
                  className="h-full w-full"
                  style={{ color: fallbackColor }}
                />
              ) : (
                <span className="font-condensed text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                  {getShortName(row.companyName || "FR")}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="block truncate font-medium text-slate-900">
                  {row.companyName}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  {row.linkedTeamsCount}{" "}
                  {row.linkedTeamsCount === 1 ? "team" : "teams"}
                </span>
              </div>
              {row.featuredTeamName ? (
                <span className="block truncate text-xs text-slate-500">
                  {row.featuredTeamName}
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    { key: "ownerName", label: "Owner" },
    {
      key: "teamCapacityLabel",
      label: "Teams Used",
      render: (row) => (
        <span className="font-semibold text-purple-700">
          {row.teamCapacityLabel}
        </span>
      ),
    },
    {
      key: "ownershipStatus",
      label: "Status",
      render: (row) => (
        <Badge
          label={row.ownershipStatus}
          color={row.linkedTeamsCount >= 3 ? "orange" : "green"}
        />
      ),
    },
    {
      key: "hasLogo",
      label: "Logo",
      render: (row) => (
        <Badge label={row.hasLogo ? "Uploaded" : "Missing"} color={row.hasLogo ? "green" : "orange"} />
      ),
    },
    {
      key: "linkedTeamsLabel",
      label: "Linked Teams",
      render: (row) => (
        <span className="whitespace-normal text-xs text-slate-500">
          {row.linkedTeamsLabel}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openViewFranchiseModal(row)}
            className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => openEditFranchiseModal(row)}
            className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => openDeleteFranchiseModal(row)}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  function openAddFranchiseModal() {
    setFranchiseModalType("add");
    setSelectedFranchise(null);
    setFranchiseForm(emptyFranchiseForm);
    setFranchiseFormError("");
    setFranchiseLogoUploadError("");
  }

  function openViewFranchiseModal(franchise) {
    setFranchiseModalType("view");
    setSelectedFranchise(franchise);
    setFranchiseForm(mapFranchiseToForm(franchise));
    setFranchiseFormError("");
    setFranchiseLogoUploadError("");
  }

  function openEditFranchiseModal(franchise) {
    setFranchiseModalType("edit");
    setSelectedFranchise(franchise);
    setFranchiseForm(mapFranchiseToForm(franchise));
    setFranchiseFormError("");
    setFranchiseLogoUploadError("");
  }

  function openDeleteFranchiseModal(franchise) {
    setFranchiseModalType("delete");
    setSelectedFranchise(franchise);
    setFranchiseForm(mapFranchiseToForm(franchise));
    setFranchiseFormError("");
    setFranchiseLogoUploadError("");
  }

  const closeFranchiseModal = () => {
    setFranchiseModalType("");
    setSelectedFranchise(null);
    setFranchiseForm(emptyFranchiseForm);
    setFranchiseFormError("");
    setFranchiseLogoUploadError("");
    setUploadingFranchiseLogo(false);
  };

  const handleFranchiseInputChange = (event) => {
    const { name, value } = event.target;
    setFranchiseForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFranchiseFormError("");
  };

  const openFranchiseLogoPicker = () => {
    franchiseLogoInputRef.current?.click();
  };

  const clearFranchiseLogo = () => {
    setFranchiseForm((prev) => ({
      ...prev,
      logo: "",
    }));
    setFranchiseLogoUploadError("");
  };

  const handleFranchiseLogoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFranchiseLogoUploadError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFranchiseLogoUploadError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploadingFranchiseLogo(true);
      setFranchiseLogoUploadError("");

      const uploadResponse = await uploadFranchiseLogo(file);
      const nextLogoPath = uploadResponse.path || "";

      setFranchiseForm((prev) => ({
        ...prev,
        logo: nextLogoPath,
      }));

      if (selectedFranchise?.id && franchiseModalType === "edit") {
        await patchFranchise(selectedFranchise.id, {
          logo: nextLogoPath,
        });
        setSelectedFranchise((prev) =>
          prev ? { ...prev, logo: nextLogoPath, hasLogo: true } : prev
        );
        await refreshDashboard();
      }
    } catch (uploadError) {
      setFranchiseLogoUploadError(
        getApiErrorMessage(uploadError, "Unable to upload franchise logo.")
      );
    } finally {
      setUploadingFranchiseLogo(false);
    }
  };

  const validateFranchiseForm = () => {
    if (!franchiseForm.company_name.trim()) {
      return "Please enter a franchise name.";
    }

    return "";
  };

  const handleSaveFranchise = async () => {
    const validationMessage = validateFranchiseForm();

    if (validationMessage) {
      setFranchiseFormError(validationMessage);
      return;
    }

    try {
      setSavingFranchise(true);
      setFranchiseFormError("");

      const payload = buildFranchisePayload(franchiseForm);

      if (franchiseModalType === "add") {
        await createFranchise(payload);
      } else {
        await updateFranchise(selectedFranchise.id, payload);
      }

      await refreshDashboard();
      closeFranchiseModal();
    } catch (requestError) {
      setFranchiseFormError(
        getApiErrorMessage(requestError, "Unable to save franchise details.")
      );
    } finally {
      setSavingFranchise(false);
    }
  };

  const handleDeleteFranchise = async () => {
    if (!selectedFranchise) {
      return;
    }

    try {
      setSavingFranchise(true);
      setFranchiseFormError("");
      await deleteFranchise(selectedFranchise.id);
      await refreshDashboard();
      closeFranchiseModal();
    } catch (requestError) {
      setFranchiseFormError(
        getApiErrorMessage(requestError, "Unable to delete this franchise.")
      );
    } finally {
      setSavingFranchise(false);
    }
  };

  const franchiseLogoPreviewUrl = franchiseForm.logo
    ? getMediaUrl(franchiseForm.logo)
    : "";
  const franchiseInitials = getFranchiseInitials(
    franchiseForm.company_name || selectedFranchise?.companyName || "FR"
  );

  return (
    <div className="space-y-6 bg-white">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading live dashboard data...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {stats.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            subtext={item.subtext}
            icon={item.icon}
            color={item.color}
          />
        ))}
      </section>

      <DashboardPanel
        title={`Franchise List (${franchiseOverview.length})`}
        actionLabel="+ Add Franchise"
        onAction={openAddFranchiseModal}
      >
        <DataTable
          columns={franchiseColumns}
          data={franchiseOverview}
          rowKey="id"
          emptyMessage="No franchise records are available yet."
          stickyHeader
          scrollClassName="max-h-[430px] overflow-auto"
        />
      </DashboardPanel>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <DashboardPanel title="Points Table" actionLabel={`${pointsTableRows.length} teams`}>
        <DataTable
          columns={columns}
          data={pointsTableRows}
          rowKey="team"
          emptyMessage="No standings are available yet."
          stickyHeader
          scrollClassName="max-h-[430px] overflow-auto"
        />
      </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Season Progress">
            {seasonProgress.length === 0 ? (
              <p className="text-sm text-slate-500">
                Season progress metrics will appear here once the API responds.
              </p>
            ) : (
              <div className="space-y-4">
                {seasonProgress.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="font-condensed text-sm font-bold text-slate-800">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${getProgressBarColorClass(
                          item.color
                        )}`}
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Live Now">
            {!liveNow ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No live match is available right now.
              </div>
            ) : (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">{liveNow.venue}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {liveNow.matchLabel}
                    </p>
                  </div>
                  <Badge label={liveNow.statusLabel} color="red" />
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="font-condensed text-base font-bold text-slate-900">
                    {liveNow.teamA}
                  </div>

                  <div className="text-center">
                    <div className="font-heading text-3xl text-yellow-600">
                      {liveNow.score}
                    </div>
                    <p className="text-xs text-slate-500">{liveNow.overs}</p>
                  </div>

                  <div className="text-right font-condensed text-base font-bold text-slate-900">
                    {liveNow.teamB}
                  </div>
                </div>

                <p className="mt-3 text-center text-sm text-emerald-600">
                  {liveNow.summary}
                </p>
                <p className="mt-2 text-center text-xs text-slate-500">
                  Updated {liveNow.updatedAtLabel}
                </p>
              </div>
            )}
          </DashboardPanel>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel title="Recent Activity">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-500">
              Recent league activity will appear here once data is available.
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivities.map((item) => (
                <div
                  key={`${item.text}-${item.time}`}
                  className="flex gap-4 border-b border-slate-100 py-3 last:border-b-0"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${getActivityColorClasses(
                      item.color
                    )}`}
                  >
                    {item.icon}
                  </div>

                  <div>
                    <p className="text-sm text-slate-800">{item.text}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Top Performers" actionLabel="Leaderboard">
          {topPerformers.length === 0 ? (
            <p className="text-sm text-slate-500">
              Top performers will appear here once standings data is loaded.
            </p>
          ) : (
            <div className="space-y-1">
              {topPerformers.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-b-0"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getAvatarColorClasses(
                      player.avatarColor
                    )}`}
                  >
                    {player.initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {player.name}
                      </p>
                      <Badge
                        label={player.role}
                        color={getRoleBadgeColor(player.roleColor)}
                      />
                    </div>

                    <p className="text-xs text-slate-500">{player.team}</p>
                  </div>

                  <div className="font-heading text-3xl leading-none text-yellow-600">
                    {player.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>

      {franchiseModalType ? (
        <ManagementModal
          title={
            franchiseModalType === "add"
              ? "ADD FRANCHISE"
              : franchiseModalType === "view"
              ? "FRANCHISE DETAILS"
              : franchiseModalType === "edit"
              ? "EDIT FRANCHISE"
              : "DELETE FRANCHISE"
          }
          onClose={closeFranchiseModal}
        >
          {franchiseModalType === "delete" ? (
            <div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {selectedFranchise?.companyName}
                </span>
                ?
              </p>

              {selectedFranchise?.linkedTeamsCount > 0 ? (
                <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  This franchise is currently linked to {selectedFranchise.linkedTeamsCount} team
                  {selectedFranchise.linkedTeamsCount === 1 ? "" : "s"}.
                </div>
              ) : null}

              {franchiseFormError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {franchiseFormError}
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteFranchise}
                  disabled={savingFranchise}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingFranchise ? "Deleting..." : "Confirm Delete"}
                </button>

                <button
                  type="button"
                  onClick={closeFranchiseModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {franchiseFormError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {franchiseFormError}
                </div>
              ) : null}

              <input
                ref={franchiseLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFranchiseLogoFileChange}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {franchiseLogoPreviewUrl ? (
                      <img
                        src={franchiseLogoPreviewUrl}
                        alt={franchiseForm.company_name || "Franchise logo preview"}
                        className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white font-heading text-2xl tracking-[0.08em] text-slate-500">
                        {franchiseInitials}
                      </div>
                    )}

                    <div>
                      <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                        Franchise Logo
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Upload a JPG, PNG, or WEBP image up to 5 MB.
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        This logo will support the public franchise presentation whenever a team logo is not set.
                      </p>
                      {franchiseModalType === "add" ? (
                        <p className="mt-1 text-sm text-slate-500">
                          For a new franchise, finish by clicking Add Franchise so the logo is saved with the new record.
                        </p>
                      ) : null}
                      {franchiseLogoUploadError ? (
                        <p className="mt-2 text-sm text-red-600">
                          {franchiseLogoUploadError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {franchiseModalType !== "view" ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={openFranchiseLogoPicker}
                        disabled={uploadingFranchiseLogo}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {uploadingFranchiseLogo
                          ? "Uploading..."
                          : franchiseForm.logo
                          ? "Change Logo"
                          : "Upload Logo"}
                      </button>

                      {franchiseForm.logo ? (
                        <button
                          type="button"
                          onClick={clearFranchiseLogo}
                          disabled={uploadingFranchiseLogo}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Franchise ID
                  </label>
                  <input
                    value={
                      selectedFranchise
                        ? formatFranchiseId(selectedFranchise.id)
                        : "Auto-generated"
                    }
                    readOnly
                    className={getInputClass(true)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Franchise Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="company_name"
                    value={franchiseForm.company_name}
                    onChange={handleFranchiseInputChange}
                    readOnly={franchiseModalType === "view"}
                    className={getInputClass(franchiseModalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Owner Name
                  </label>
                  <input
                    name="owner_name"
                    value={franchiseForm.owner_name}
                    onChange={handleFranchiseInputChange}
                    readOnly={franchiseModalType === "view"}
                    className={getInputClass(franchiseModalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Website
                  </label>
                  <input
                    name="website"
                    value={franchiseForm.website}
                    onChange={handleFranchiseInputChange}
                    readOnly={franchiseModalType === "view"}
                    className={getInputClass(franchiseModalType === "view")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-slate-500">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={franchiseForm.address}
                    onChange={handleFranchiseInputChange}
                    readOnly={franchiseModalType === "view"}
                    rows={3}
                    className={`${getInputClass(franchiseModalType === "view")} resize-none`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-slate-500">
                    Linked Teams
                  </label>
                  <textarea
                    value={selectedFranchise?.linkedTeamsLabel || "No linked teams yet"}
                    readOnly
                    rows={2}
                    className={`${getInputClass(true)} resize-none`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Teams Used
                  </label>
                  <input
                    value={selectedFranchise?.teamCapacityLabel || "0/3"}
                    readOnly
                    className={getInputClass(true)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Availability
                  </label>
                  <input
                    value={selectedFranchise?.ownershipStatus || "3 Slots Left"}
                    readOnly
                    className={getInputClass(true)}
                  />
                </div>
              </div>

              {franchiseModalType !== "view" ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveFranchise}
                    disabled={savingFranchise || uploadingFranchiseLogo}
                    className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingFranchise
                      ? franchiseModalType === "add"
                        ? "Creating..."
                        : "Saving..."
                      : uploadingFranchiseLogo
                      ? "Uploading..."
                      : franchiseModalType === "add"
                      ? "Add Franchise"
                      : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={closeFranchiseModal}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </ManagementModal>
      ) : null}
    </div>
  );
}
