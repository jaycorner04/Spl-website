import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DataTable from "../../components/dashboard/DataTable";
import FilterBar from "../../components/dashboard/FilterBar";
import ExportButton from "../../components/dashboard/ExportButton";
import Badge from "../../components/common/Badge";
import ManagementModal from "../../components/dashboard/ManagementModal";
import {
  createTeam,
  deleteTeam,
  getTeams,
  patchTeam,
  uploadTeamLogo,
  updateTeam,
} from "../../api/teamsAPI";
import { getPlayers } from "../../api/playersAPI";
import { getFranchises } from "../../api/franchiseAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { getMediaUrl } from "../../utils/media";
import {
  formatCurrency,
  formatTeamId,
  getBadgeColor,
} from "../../utils/adminFormatters";
import { downloadCsv } from "../../utils/downloadCsv";

const emptyForm = {
  team_name: "",
  logo: "",
  franchise_id: "",
  city: "",
  owner: "",
  coach: "",
  vice_coach: "",
  venue: "",
  primary_color: "blue",
  status: "Active",
  budget_left: "0",
};

function getTeamInitials(name = "") {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getInputClass(readOnly = false) {
  return `w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ${
    readOnly ? "bg-slate-50 text-slate-600" : "bg-white text-slate-900"
  }`;
}

function mapTeamToForm(team) {
  return {
    team_name: team.team_name || "",
    logo: team.logo || "",
    franchise_id:
      team.franchise_id != null && Number(team.franchise_id) > 0
        ? String(team.franchise_id)
        : "",
    city: team.city || "",
    owner: team.owner || "",
    coach: team.coach || "",
    vice_coach: team.vice_coach || "",
    venue: team.venue || "",
    primary_color: team.primary_color || "blue",
    status: team.status || "Active",
    budget_left: String(team.budget_left ?? 0),
  };
}

function buildTeamPayload(form, selectedTeam) {
  return {
    team_name: form.team_name.trim(),
    city: form.city.trim(),
    owner: form.owner.trim(),
    coach: form.coach.trim(),
    vice_coach: form.vice_coach.trim(),
    venue: form.venue.trim(),
    primary_color: form.primary_color.trim() || "blue",
    status: form.status,
    budget_left: Number(form.budget_left || 0),
    logo: form.logo || "",
    franchise_id: Number(form.franchise_id || selectedTeam?.franchise_id || 0),
  };
}

export default function AdminTeamsPage() {
  const [searchParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    city: "all",
  });
  const [modalType, setModalType] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const logoInputRef = useRef(null);
  const handledSearchFocusRef = useRef("");
  const appliedSearchTokenRef = useRef("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [teamsResponse, playersResponse, franchisesResponse] = await Promise.all([
        getTeams(),
        getPlayers(),
        getFranchises(),
      ]);

      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
      setPlayers(Array.isArray(playersResponse) ? playersResponse : []);
      setFranchises(Array.isArray(franchisesResponse) ? franchisesResponse : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load team registry.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const searchValue = searchParams.get("search") || "";

    if (
      !focusToken ||
      appliedSearchTokenRef.current === focusToken ||
      !new Set(["teams", "franchises"]).has(resource) ||
      !searchValue
    ) {
      return;
    }

    appliedSearchTokenRef.current = focusToken;
    if (filters.search !== searchValue) {
      setFilters((prev) => ({
        ...prev,
        search: searchValue,
      }));
    }
  }, [filters.search, searchParams]);

  const playerCountByTeamId = useMemo(() => {
    return players.reduce((accumulator, player) => {
      const teamId = String(player.team_id || "");
      accumulator[teamId] = (accumulator[teamId] || 0) + 1;
      return accumulator;
    }, {});
  }, [players]);

  const franchiseById = useMemo(() => {
    return franchises.reduce((accumulator, franchise) => {
      accumulator[String(franchise.id)] = franchise;
      return accumulator;
    }, {});
  }, [franchises]);

  const franchiseTeamCountById = useMemo(() => {
    return teams.reduce((accumulator, team) => {
      const franchiseId = String(team.franchise_id || "");

      if (!franchiseId) {
        return accumulator;
      }

      accumulator[franchiseId] = (accumulator[franchiseId] || 0) + 1;
      return accumulator;
    }, {});
  }, [teams]);

  const teamRows = useMemo(() => {
    return teams.map((team) => ({
      ...team,
      squadCount: playerCountByTeamId[String(team.id)] || 0,
      franchiseName:
        franchiseById[String(team.franchise_id)]?.company_name || "Unassigned",
      formattedId: formatTeamId(team.id),
      formattedBudget: formatCurrency(team.budget_left),
    }));
  }, [franchiseById, playerCountByTeamId, teams]);

  const filteredTeams = useMemo(() => {
    return teamRows.filter((team) => {
      const searchValue = filters.search.trim().toLowerCase();
        const matchesSearch =
        searchValue.length === 0 ||
        [
          team.formattedId,
          team.team_name,
          team.city,
          team.owner,
          team.vice_coach,
          team.franchiseName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesStatus =
        filters.status === "all" || team.status === filters.status;
      const matchesCity = filters.city === "all" || team.city === filters.city;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [filters, teamRows]);

  const summaryCards = useMemo(() => {
    const activeTeams = teams.filter((team) => team.status === "Active").length;
    const reviewTeams = teams.filter(
      (team) => team.status === "Pending" || team.status === "Review"
    ).length;
    const averageSquadSize =
      teams.length > 0
        ? Math.round(
            teamRows.reduce((sum, team) => sum + team.squadCount, 0) / teams.length
          )
        : 0;

    return [
      {
        label: "Total Teams",
        value: teams.length,
        subtext: "Registered in the local API",
        color: "blue",
        icon: "??",
      },
      {
        label: "Active Teams",
        value: activeTeams,
        subtext: "Ready for fixtures",
        color: "green",
        icon: "?",
      },
      {
        label: "Needs Review",
        value: reviewTeams,
        subtext: "Pending or review status",
        color: "orange",
        icon: "??",
      },
      {
        label: "Average Squad",
        value: averageSquadSize,
        subtext: "Players per team",
        color: "gold",
        icon: "??",
      },
    ];
  }, [teamRows, teams]);

  const cityOptions = useMemo(() => {
    const uniqueCities = Array.from(
      new Set(teams.map((team) => team.city).filter(Boolean))
    ).sort();

    return [
      { label: "All Cities", value: "all" },
      ...uniqueCities.map((city) => ({ label: city, value: city })),
    ];
  }, [teams]);

  const franchiseOptions = useMemo(() => {
    const currentFranchiseId = String(selectedTeam?.franchise_id || form.franchise_id || "");

    return [...franchises]
      .sort((left, right) =>
        String(left.company_name || "").localeCompare(String(right.company_name || ""))
      )
      .map((franchise) => {
        const franchiseId = String(franchise.id);
        const linkedTeamsCount = franchiseTeamCountById[franchiseId] || 0;
        const isCurrentFranchise = franchiseId === currentFranchiseId;
        const isFull = linkedTeamsCount >= 3 && !isCurrentFranchise;

        return {
          label: `${franchise.company_name} (${Math.min(linkedTeamsCount, 3)}/3 teams)`,
          value: franchiseId,
          disabled: isFull,
        };
      });
  }, [form.franchise_id, franchiseTeamCountById, franchises, selectedTeam]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openAddModal = () => {
    setModalType("add");
    setSelectedTeam(null);
    setForm(emptyForm);
    setFormError("");
    setLogoUploadError("");
  };

  const openViewModal = (team) => {
    setModalType("view");
    setSelectedTeam(team);
    setForm(mapTeamToForm(team));
    setFormError("");
    setLogoUploadError("");
  };

  const openEditModal = (team) => {
    setModalType("edit");
    setSelectedTeam(team);
    setForm(mapTeamToForm(team));
    setFormError("");
    setLogoUploadError("");
  };

  const openDeleteModal = (team) => {
    setModalType("delete");
    setSelectedTeam(team);
    setForm(mapTeamToForm(team));
    setFormError("");
    setLogoUploadError("");
  };

  const closeModal = () => {
    setModalType("");
    setSelectedTeam(null);
    setForm(emptyForm);
    setFormError("");
    setLogoUploadError("");
    setUploadingLogo(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const syncUpdatedTeam = (updatedTeam) => {
    if (!updatedTeam) {
      return;
    }

    setTeams((prev) =>
      prev.map((team) =>
        String(team.id) === String(updatedTeam.id)
          ? { ...team, ...updatedTeam }
          : team
      )
    );
    setSelectedTeam((prev) =>
      prev && String(prev.id) === String(updatedTeam.id)
        ? { ...prev, ...updatedTeam }
        : prev
    );
  };

  const openLogoPicker = () => {
    logoInputRef.current?.click();
  };

  const clearLogo = () => {
    setForm((prev) => ({
      ...prev,
      logo: "",
    }));
    setLogoUploadError("");
  };

  const handleLogoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploadingLogo(true);
      setLogoUploadError("");

      const uploadResponse = await uploadTeamLogo(file);
      const nextLogoPath = uploadResponse.path || "";

      setForm((prev) => ({
        ...prev,
        logo: nextLogoPath,
      }));

      if (selectedTeam?.id && modalType === "edit") {
        const updatedTeam = await patchTeam(selectedTeam.id, {
          logo: nextLogoPath,
        });
        syncUpdatedTeam(updatedTeam);
      }
    } catch (uploadError) {
      setLogoUploadError(
        getApiErrorMessage(uploadError, "Unable to upload team logo.")
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateForm = () => {
    if (!form.team_name.trim()) {
      return "Please enter a team name.";
    }

    if (!form.city.trim()) {
      return "Please enter a city.";
    }

    if (!Number(form.franchise_id)) {
      return "Please select a franchise.";
    }

    if (!form.owner.trim()) {
      return "Please enter an owner.";
    }

    if (!form.vice_coach.trim()) {
      return "Please enter a captain.";
    }

    if (!form.venue.trim()) {
      return "Please enter a venue.";
    }

    if (Number.isNaN(Number(form.budget_left))) {
      return "Budget left must be a valid number.";
    }

    const selectedFranchiseId = String(form.franchise_id || "");
    const linkedTeamsCount = franchiseTeamCountById[selectedFranchiseId] || 0;
    const isSameFranchise =
      String(selectedTeam?.franchise_id || "") === selectedFranchiseId;

    if (linkedTeamsCount >= 3 && !isSameFranchise) {
      return "This franchise already owns 3 teams. Choose another franchise.";
    }

    return "";
  };

  const handleSave = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = buildTeamPayload(form, selectedTeam);

      if (modalType === "add") {
        await createTeam(payload);
      } else {
        await updateTeam(selectedTeam.id, payload);
      }

      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to save team details.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTeam) {
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      await deleteTeam(selectedTeam.id);
      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to delete this team.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "spl-teams.csv",
      filteredTeams.map((team) => ({
        TeamID: team.formattedId,
        Team: team.team_name,
        Franchise: team.franchiseName,
        City: team.city,
        Captain: team.vice_coach,
        Owner: team.owner,
        Coach: team.coach,
        Venue: team.venue,
        Status: team.status,
        Squad: team.squadCount,
        BudgetLeft: team.budget_left,
      }))
    );
  };

  const columns = [
    { key: "formattedId", label: "Team ID" },
    { key: "team_name", label: "Team Name" },
    { key: "franchiseName", label: "Franchise" },
    { key: "city", label: "City" },
    { key: "vice_coach", label: "Captain" },
    { key: "owner", label: "Owner" },
    { key: "squadCount", label: "Squad" },
    { key: "formattedBudget", label: "Budget Left" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge label={row.status} color={getBadgeColor(row.status)} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openViewModal(row)}
            className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => openDeleteModal(row)}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const spotlightTeams = [...filteredTeams]
    .sort((left, right) => right.squadCount - left.squadCount)
    .slice(0, 4);
  const logoPreviewUrl = form.logo ? getMediaUrl(form.logo) : "";
  const teamInitials = getTeamInitials(
    form.team_name || selectedTeam?.team_name || "TM"
  );

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const recordId = searchParams.get("recordId") || "";

    if (!focusToken || !recordId || loading) {
      return;
    }

    const focusKey = `${resource}-${recordId}-${focusToken}`;

    if (handledSearchFocusRef.current === focusKey) {
      return;
    }

    const supportedResources = new Set(["teams", "franchises"]);

    if (!supportedResources.has(resource)) {
      return;
    }

    const matchedTeam =
      resource === "teams"
        ? teamRows.find((team) => String(team.id) === String(recordId))
        : teamRows.find((team) =>
            [team.owner, team.team_name, team.city]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes((searchParams.get("search") || "").toLowerCase())
              )
          );

    if (!matchedTeam) {
      return;
    }

    handledSearchFocusRef.current = focusKey;
    openViewModal(matchedTeam);
  }, [loading, searchParams, teamRows]);

  return (
    <div className="space-y-6 bg-white">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            subtext={item.subtext}
            color={item.color}
            icon={item.icon}
          />
        ))}
      </section>

      <FilterBar
        filters={[
          {
            key: "search",
            label: "Search Team",
            type: "text",
            value: filters.search,
            placeholder: "Search by team, id, owner, or captain",
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "Active" },
              { label: "Pending", value: "Pending" },
              { label: "Review", value: "Review" },
            ],
          },
          {
            key: "city",
            label: "City",
            type: "select",
            value: filters.city,
            options: cityOptions,
          },
        ]}
        onChange={handleFilterChange}
      />

      <DashboardPanel title="Team Registry" bodyClassName="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="text-sm text-slate-500">
            Total results:{" "}
            <span className="font-semibold text-slate-900">
              {filteredTeams.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-blue-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-blue-600 transition hover:bg-blue-200"
            >
              + Add Team
            </button>

            <ExportButton label="Export Teams" onClick={handleExport} />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading teams...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredTeams}
            rowKey="id"
            emptyMessage="No teams match the selected filters."
          />
        )}
      </DashboardPanel>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel title="Squad Snapshot">
          <div className="space-y-3">
            {spotlightTeams.length === 0 ? (
              <p className="text-sm text-slate-500">No teams available.</p>
            ) : (
              spotlightTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {team.team_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {team.city} | Captain: {team.vice_coach}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-blue-600">
                      {team.squadCount} players
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Quick Notes">
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-600">
                {teams.filter((team) => team.status === "Active").length} teams are match ready
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Active teams can be scheduled immediately from the admin panel.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-700">
                {teams.filter((team) => team.status === "Pending").length} teams are waiting on approval
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Pending teams should be reviewed before the next fixture cycle.
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-600">
                Budget tracking is live
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Remaining budget is now coming from the API instead of local mock data.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </section>

      {modalType ? (
        <ManagementModal
          title={
            modalType === "add"
              ? "ADD TEAM"
              : modalType === "view"
              ? "TEAM DETAILS"
              : modalType === "edit"
              ? "EDIT TEAM"
              : "DELETE TEAM"
          }
          onClose={closeModal}
        >
          {modalType === "delete" ? (
            <div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {selectedTeam?.team_name}
                </span>
                ?
              </p>

              {formError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Deleting..." : "Confirm Delete"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {formError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </div>
              ) : null}

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoFileChange}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt={form.team_name || "Team logo preview"}
                        className="h-20 w-20 rounded-2xl border border-slate-200 object-contain bg-white p-2 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white font-heading text-2xl tracking-[0.08em] text-slate-500">
                        {teamInitials}
                      </div>
                    )}

                    <div>
                      <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                        Team Logo
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Upload a JPG, PNG, or WEBP image up to 5 MB.
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        The uploaded logo will appear on the teams page, home franchise cards, and points table.
                      </p>
                      {modalType === "add" ? (
                        <p className="mt-1 text-sm text-slate-500">
                          For a new team, finish by clicking Add Team so the logo can be saved with the new record.
                        </p>
                      ) : null}
                      {logoUploadError ? (
                        <p className="mt-2 text-sm text-red-600">
                          {logoUploadError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {modalType !== "view" ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={openLogoPicker}
                        disabled={uploadingLogo}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {uploadingLogo
                          ? "Uploading..."
                          : form.logo
                          ? "Change Logo"
                          : "Upload Logo"}
                      </button>

                      {form.logo ? (
                        <button
                          type="button"
                          onClick={clearLogo}
                          disabled={uploadingLogo}
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
                  <label className="mb-2 block text-sm text-slate-500">Team ID</label>
                  <input
                    value={selectedTeam ? formatTeamId(selectedTeam.id) : "Auto-generated"}
                    readOnly
                    className={getInputClass(true)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="team_name"
                    value={form.team_name}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Franchise <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="franchise_id"
                    value={form.franchise_id}
                    onChange={handleInputChange}
                    disabled={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  >
                    <option value="">Select franchise</option>
                    {franchiseOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    One franchise can own up to 3 teams.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="owner"
                    value={form.owner}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Coach</label>
                  <input
                    name="coach"
                    value={form.coach}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Captain <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="vice_coach"
                    value={form.vice_coach}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="venue"
                    value={form.venue}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Primary Color</label>
                  <select
                    name="primary_color"
                    value={form.primary_color}
                    onChange={handleInputChange}
                    disabled={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  >
                    <option value="blue">Blue</option>
                    <option value="darkblue">Dark Blue</option>
                    <option value="black">Black</option>
                    <option value="red">Red</option>
                    <option value="gold">Gold</option>
                    <option value="yellow">Yellow</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                    disabled={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Review">Review</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Budget Left</label>
                  <input
                    name="budget_left"
                    type="number"
                    min="0"
                    value={form.budget_left}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>
              </div>

              {modalType !== "view" ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || uploadingLogo}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving
                      ? modalType === "add"
                        ? "Creating..."
                        : "Saving..."
                      : uploadingLogo
                      ? "Uploading..."
                      : modalType === "add"
                      ? "Add Team"
                      : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
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
