import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DataTable from "../../components/dashboard/DataTable";
import FilterBar from "../../components/dashboard/FilterBar";
import ExportButton from "../../components/dashboard/ExportButton";
import Badge from "../../components/common/Badge";
import ManagementModal from "../../components/dashboard/ManagementModal";
import {
  createPlayer,
  deletePlayer,
  getPlayers,
  uploadPlayerPhoto,
  updatePlayer,
} from "../../api/playersAPI";
import { getTeams } from "../../api/teamsAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { getMediaUrl } from "../../utils/media";
import {
  formatCurrency,
  formatPlayerId,
  getBadgeColor,
} from "../../utils/adminFormatters";
import { downloadCsv } from "../../utils/downloadCsv";

const emptyForm = {
  full_name: "",
  photo: "",
  team_id: "",
  role: "",
  batting_style: "Right Hand",
  bowling_style: "spinner",
  date_of_birth: "",
  mobile: "",
  email: "",
  status: "Active",
  salary: "0",
};

function getPlayerInitials(name = "") {
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

function mapPlayerToForm(player) {
  return {
    full_name: player.full_name || "",
    photo: player.photo || "",
    team_id: String(player.team_id || ""),
    role: player.role || "",
    batting_style: player.batting_style || "",
    bowling_style: player.bowling_style || "",
    date_of_birth: player.date_of_birth || "",
    mobile: player.mobile || "",
    email: player.email || "",
    status: player.status || "Active",
    salary: String(player.salary ?? 0),
  };
}

function buildPlayerPayload(form, teams, selectedPlayer) {
  const selectedTeam = teams.find(
    (team) => String(team.id) === String(form.team_id)
  );

  return {
    full_name: form.full_name.trim(),
    role: form.role.trim(),
    team_id: Number(form.team_id),
    team_name: selectedTeam?.team_name || "",
    batting_style: form.batting_style.trim(),
    bowling_style: form.bowling_style.trim(),
    photo: form.photo || "",
    created_at: selectedPlayer?.created_at,
    date_of_birth: form.date_of_birth,
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    status: form.status,
    salary: Number(form.salary || 0),
  };
}

export default function PlayerManagement() {
  const [searchParams] = useSearchParams();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    team: "all",
    status: "all",
  });
  const [modalType, setModalType] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const photoInputRef = useRef(null);
  const handledSearchFocusRef = useRef("");
  const appliedSearchTokenRef = useRef("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [playersResponse, teamsResponse] = await Promise.all([
        getPlayers(),
        getTeams(),
      ]);

      setPlayers(Array.isArray(playersResponse) ? playersResponse : []);
      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load player registry.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const searchValue = searchParams.get("search") || "";

    if (
      !focusToken ||
      appliedSearchTokenRef.current === focusToken ||
      !new Set(["players", "performances"]).has(resource) ||
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

  const playerRows = useMemo(() => {
    return players.map((player) => ({
      ...player,
      formattedId: formatPlayerId(player.id),
      formattedSalary: formatCurrency(player.salary),
    }));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return playerRows.filter((player) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        [player.formattedId, player.full_name, player.team_name, player.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesTeam =
        filters.team === "all" || player.team_name === filters.team;
      const matchesStatus =
        filters.status === "all" || player.status === filters.status;

      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [filters, playerRows]);

  const summaryCards = useMemo(() => {
    const activePlayers = players.filter((player) => player.status === "Active").length;
    const suspendedPlayers = players.filter(
      (player) => player.status === "Suspended"
    ).length;
    const pendingPlayers = players.filter(
      (player) => player.status === "Pending" || player.status === "Injured"
    ).length;

    return [
      {
        label: "Total Players",
        value: players.length,
        subtext: "Loaded from the API",
        color: "blue",
        icon: "??",
      },
      {
        label: "Active Players",
        value: activePlayers,
        subtext: "Available for selection",
        color: "green",
        icon: "?",
      },
      {
        label: "Suspended",
        value: suspendedPlayers,
        subtext: "Temporarily unavailable",
        color: "red",
        icon: "?",
      },
      {
        label: "Pending Review",
        value: pendingPlayers,
        subtext: "Pending or injured status",
        color: "orange",
        icon: "??",
      },
    ];
  }, [players]);

  const teamOptions = useMemo(() => {
    const options = teams.map((team) => ({
      label: team.team_name,
      value: team.team_name,
    }));

    return [{ label: "All Teams", value: "all" }, ...options];
  }, [teams]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openAddModal = () => {
    setModalType("add");
    setSelectedPlayer(null);
    setForm({
      ...emptyForm,
      team_id: teams[0] ? String(teams[0].id) : "",
    });
    setFormError("");
    setPhotoUploadError("");
  };

  const openViewModal = (player) => {
    setModalType("view");
    setSelectedPlayer(player);
    setForm(mapPlayerToForm(player));
    setFormError("");
    setPhotoUploadError("");
  };

  const openEditModal = (player) => {
    setModalType("edit");
    setSelectedPlayer(player);
    setForm(mapPlayerToForm(player));
    setFormError("");
    setPhotoUploadError("");
  };

  const openDeleteModal = (player) => {
    setModalType("delete");
    setSelectedPlayer(player);
    setForm(mapPlayerToForm(player));
    setFormError("");
    setPhotoUploadError("");
  };

  const closeModal = () => {
    setModalType("");
    setSelectedPlayer(null);
    setForm(emptyForm);
    setFormError("");
    setPhotoUploadError("");
    setUploadingPhoto(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const clearPhoto = () => {
    setForm((prev) => ({
      ...prev,
      photo: "",
    }));
    setPhotoUploadError("");
  };

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoUploadError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setPhotoUploadError("");

      const uploadResponse = await uploadPlayerPhoto(file);

      setForm((prev) => ({
        ...prev,
        photo: uploadResponse.path || "",
      }));
    } catch (uploadError) {
      setPhotoUploadError(
        getApiErrorMessage(uploadError, "Unable to upload player image.")
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validateForm = () => {
    if (!form.full_name.trim()) {
      return "Please enter a player name.";
    }

    if (!form.team_id) {
      return "Please select a team.";
    }

    if (!form.role.trim()) {
      return "Please enter a role.";
    }

    if (form.email && !form.email.includes("@")) {
      return "Please enter a valid email address.";
    }

    if (Number.isNaN(Number(form.salary))) {
      return "Salary must be a valid number.";
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

      const payload = buildPlayerPayload(form, teams, selectedPlayer);

      if (modalType === "add") {
        await createPlayer(payload);
      } else {
        await updatePlayer(selectedPlayer.id, payload);
      }

      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to save player details.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (player) => {
    try {
      setSaving(true);
      await updatePlayer(player.id, {
        ...buildPlayerPayload(mapPlayerToForm(player), teams, player),
        status: player.status === "Suspended" ? "Active" : "Suspended",
      });
      await loadData();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to update player status.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlayer) {
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      await deletePlayer(selectedPlayer.id);
      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to delete this player.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "spl-players.csv",
      filteredPlayers.map((player) => ({
        PlayerID: player.formattedId,
        Name: player.full_name,
        Team: player.team_name,
        Role: player.role,
        Status: player.status,
        Salary: player.salary,
        BattingStyle: player.batting_style,
        BowlingStyle: player.bowling_style,
        Email: player.email,
        Mobile: player.mobile,
      }))
    );
  };

  const columns = [
    { key: "formattedId", label: "Player ID" },
    { key: "full_name", label: "Name" },
    { key: "team_name", label: "Team" },
    { key: "role", label: "Role" },
    { key: "formattedSalary", label: "Salary" },
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
            onClick={() => handleStatusToggle(row)}
            disabled={saving}
            className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-600 transition hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {row.status === "Suspended" ? "Activate" : "Suspend"}
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

  const spotlightPlayers = filteredPlayers.slice(0, 4);
  const photoPreviewUrl = form.photo ? getMediaUrl(form.photo) : "";

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const recordId = searchParams.get("recordId") || "";

    if (!focusToken || resource !== "players" || !recordId || loading) {
      return;
    }

    const focusKey = `${resource}-${recordId}-${focusToken}`;

    if (handledSearchFocusRef.current === focusKey) {
      return;
    }

    const matchedPlayer = playerRows.find(
      (player) => String(player.id) === String(recordId)
    );

    if (!matchedPlayer) {
      return;
    }

    handledSearchFocusRef.current = focusKey;
    openViewModal(matchedPlayer);
  }, [loading, playerRows, searchParams]);

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
            icon={item.icon}
            color={item.color}
          />
        ))}
      </section>

      <FilterBar
        filters={[
          {
            key: "search",
            label: "Search Player",
            type: "text",
            value: filters.search,
            placeholder: "Search by player, id, team, or email",
          },
          {
            key: "team",
            label: "Team",
            type: "select",
            value: filters.team,
            options: teamOptions,
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "Active" },
              { label: "Injured", value: "Injured" },
              { label: "Suspended", value: "Suspended" },
              { label: "Pending", value: "Pending" },
            ],
          },
        ]}
        onChange={handleFilterChange}
      />

      <DashboardPanel title="Player Registry" bodyClassName="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="text-sm text-slate-500">
            Total results:{" "}
            <span className="font-semibold text-slate-900">
              {filteredPlayers.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-blue-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-blue-600 transition hover:bg-blue-200"
            >
              + Add Player
            </button>

            <ExportButton label="Export Players" onClick={handleExport} />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading players...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredPlayers}
            rowKey="id"
            emptyMessage="No players match the selected filters."
          />
        )}
      </DashboardPanel>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel title="Player Snapshot">
          <div className="space-y-3">
            {spotlightPlayers.length === 0 ? (
              <p className="text-sm text-slate-500">No players available.</p>
            ) : (
              spotlightPlayers.map((player) => (
                <div
                  key={player.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {player.full_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {player.team_name} | {player.role}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-yellow-700">
                      {player.formattedSalary}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Registry Notes">
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-600">
                Team-linked player creation is live
              </p>
              <p className="mt-1 text-sm text-slate-600">
                New player records now save directly to the API with team mapping.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-700">
                {players.filter((player) => player.status === "Pending").length} players are pending review
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Pending players should be cleared before squad lock.
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-600">
                Status actions are persistent
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Suspend and activate actions now write back to the backend.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </section>

      {modalType ? (
        <ManagementModal
          title={
            modalType === "add"
              ? "ADD PLAYER"
              : modalType === "view"
              ? "PLAYER DETAILS"
              : modalType === "edit"
              ? "EDIT PLAYER"
              : "DELETE PLAYER"
          }
          onClose={closeModal}
          maxWidthClass="max-w-4xl"
        >
          {modalType === "delete" ? (
            <div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {selectedPlayer?.full_name}
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
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoFileChange}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt={form.full_name || "Player preview"}
                        className="h-20 w-20 rounded-2xl border border-slate-200 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white font-heading text-2xl tracking-[0.08em] text-slate-500">
                        {getPlayerInitials(form.full_name || "PL")}
                      </div>
                    )}

                    <div>
                      <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                        Player Photo
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Upload a JPG, PNG, or WEBP image up to 5 MB.
                      </p>
                      {photoUploadError ? (
                        <p className="mt-2 text-sm text-red-600">{photoUploadError}</p>
                      ) : null}
                    </div>
                  </div>

                  {modalType !== "view" ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={openPhotoPicker}
                        disabled={uploadingPhoto}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {uploadingPhoto ? "Uploading..." : form.photo ? "Change Image" : "Upload Image"}
                      </button>

                      {form.photo ? (
                        <button
                          type="button"
                          onClick={clearPhoto}
                          disabled={uploadingPhoto}
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
                  <label className="mb-2 block text-sm text-slate-500">Player ID</label>
                  <input
                    value={selectedPlayer ? formatPlayerId(selectedPlayer.id) : "Auto-generated"}
                    readOnly
                    className={getInputClass(true)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Player Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Team <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="team_id"
                    value={form.team_id}
                    onChange={handleInputChange}
                    disabled={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleInputChange}
                    disabled={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  >
                    <option value="">Select role</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Batting Style</label>
                  <input
                    name="batting_style"
                    value={form.batting_style}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Bowling Style</label>
                  <input
                    name="bowling_style"
                    value={form.bowling_style}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Date of Birth</label>
                  <input
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Mobile</label>
                  <input
                    name="mobile"
                    value={form.mobile}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Email</label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
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
                    <option value="Injured">Injured</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Salary</label>
                  <input
                    name="salary"
                    type="number"
                    min="0"
                    value={form.salary}
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
                    disabled={saving || uploadingPhoto}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving
                      ? modalType === "add"
                        ? "Creating..."
                        : "Saving..."
                      : modalType === "add"
                      ? "Add Player"
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
