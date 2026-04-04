import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DataTable from "../../components/dashboard/DataTable";
import FilterBar from "../../components/dashboard/FilterBar";
import ExportButton from "../../components/dashboard/ExportButton";
import Badge from "../../components/common/Badge";
import AccessLimitedNotice from "../../components/common/AccessLimitedNotice";
import ManagementModal from "../../components/dashboard/ManagementModal";
import {
  createFixture,
  deleteFixture,
  getFixtures,
  updateFixture,
} from "../../api/fixturesAPI";
import { getTeams } from "../../api/teamsAPI";
import { getVenues } from "../../api/venuesAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { formatMatchId, getBadgeColor } from "../../utils/adminFormatters";
import { downloadCsv } from "../../utils/downloadCsv";

const emptyForm = {
  team_a_id: "",
  team_b_id: "",
  date: "",
  time: "",
  venue: "",
  status: "Draft",
  umpire: "",
  teamAScore: "",
  teamBScore: "",
  result: "",
};

function getInputClass(readOnly = false) {
  return `w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ${
    readOnly ? "bg-slate-50 text-slate-600" : "bg-white text-slate-900"
  }`;
}

function mapFixtureToForm(fixture) {
  return {
    team_a_id: String(fixture.team_a_id || ""),
    team_b_id: String(fixture.team_b_id || ""),
    date: fixture.date || "",
    time: fixture.time || "",
    venue: fixture.venue || "",
    status: fixture.status || "Draft",
    umpire: fixture.umpire || "",
    teamAScore: fixture.teamAScore || "",
    teamBScore: fixture.teamBScore || "",
    result: fixture.result || "",
  };
}

function buildFixturePayload(form, teams) {
  const teamA = teams.find((team) => String(team.id) === String(form.team_a_id));
  const teamB = teams.find((team) => String(team.id) === String(form.team_b_id));

  return {
    team_a_id: Number(form.team_a_id),
    team_b_id: Number(form.team_b_id),
    teamA: teamA?.team_name || "",
    teamB: teamB?.team_name || "",
    date: form.date.trim(),
    time: form.time.trim(),
    venue: form.venue.trim(),
    status: form.status,
    teamAScore: form.teamAScore.trim(),
    teamBScore: form.teamBScore.trim(),
    result: form.result.trim(),
    umpire: form.umpire.trim(),
  };
}

export default function MatchManagement() {
  const [searchParams] = useSearchParams();
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    venue: "all",
  });
  const [modalType, setModalType] = useState("");
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [handledSearchFocus, setHandledSearchFocus] = useState("");
  const [appliedSearchToken, setAppliedSearchToken] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [fixturesResponse, teamsResponse, venuesResponse] = await Promise.all([
        getFixtures(),
        getTeams(),
        getVenues(),
      ]);

      setFixtures(Array.isArray(fixturesResponse) ? fixturesResponse : []);
      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
      setVenues(Array.isArray(venuesResponse) ? venuesResponse : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load match registry.")
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
      appliedSearchToken === focusToken ||
      !new Set(["matches", "venues"]).has(resource) ||
      !searchValue
    ) {
      return;
    }

    setAppliedSearchToken(focusToken);
    if (filters.search !== searchValue) {
      setFilters((prev) => ({
        ...prev,
        search: searchValue,
      }));
    }
  }, [appliedSearchToken, filters.search, searchParams]);

  const fixtureRows = useMemo(() => {
    return fixtures.map((fixture) => ({
      ...fixture,
      formattedId: formatMatchId(fixture.id),
      fixtureLabel: `${fixture.teamA} vs ${fixture.teamB}`,
    }));
  }, [fixtures]);

  const filteredMatches = useMemo(() => {
    return fixtureRows.filter((match) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        [match.formattedId, match.fixtureLabel, match.venue, match.umpire]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesStatus =
        filters.status === "all" || match.status === filters.status;
      const matchesVenue = filters.venue === "all" || match.venue === filters.venue;

      return matchesSearch && matchesStatus && matchesVenue;
    });
  }, [filters, fixtureRows]);

  const summaryCards = useMemo(() => {
    return [
      {
        label: "Total Fixtures",
        value: fixtures.length,
        note: "Registered in the API",
        color: "blue",
        icon: "???",
      },
      {
        label: "Live Matches",
        value: fixtures.filter((fixture) => fixture.status === "Live").length,
        note: "Currently in progress",
        color: "red",
        icon: "??",
      },
      {
        label: "Upcoming",
        value: fixtures.filter((fixture) => fixture.status === "Upcoming").length,
        note: "Ready for matchday",
        color: "green",
        icon: "??",
      },
      {
        label: "Draft Fixtures",
        value: fixtures.filter((fixture) => fixture.status === "Draft").length,
        note: "Need final review",
        color: "purple",
        icon: "??",
      },
    ];
  }, [fixtures]);

  const venueOptions = useMemo(() => {
    const values = Array.from(
      new Set([
        ...venues.map((venue) => `${venue.ground_name}, ${venue.city}`),
        ...fixtures.map((fixture) => fixture.venue),
      ].filter(Boolean))
    ).sort();

    return [{ label: "All Venues", value: "all" }, ...values.map((value) => ({ label: value, value }))];
  }, [fixtures, venues]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openAddModal = () => {
    setModalType("add");
    setSelectedFixture(null);
    setForm({
      ...emptyForm,
      team_a_id: teams[0] ? String(teams[0].id) : "",
      team_b_id: teams[1] ? String(teams[1].id) : "",
      venue: venues[0] ? `${venues[0].ground_name}, ${venues[0].city}` : "",
    });
    setFormError("");
  };

  const openViewModal = (fixture) => {
    setModalType("view");
    setSelectedFixture(fixture);
    setForm(mapFixtureToForm(fixture));
    setFormError("");
  };

  const openEditModal = (fixture) => {
    setModalType("edit");
    setSelectedFixture(fixture);
    setForm(mapFixtureToForm(fixture));
    setFormError("");
  };

  const openDeleteModal = (fixture) => {
    setModalType("delete");
    setSelectedFixture(fixture);
    setForm(mapFixtureToForm(fixture));
    setFormError("");
  };

  const closeModal = () => {
    setModalType("");
    setSelectedFixture(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const validateForm = () => {
    if (!form.team_a_id || !form.team_b_id) {
      return "Please select both teams.";
    }

    if (form.team_a_id === form.team_b_id) {
      return "A team cannot play against itself.";
    }

    if (!form.date.trim()) {
      return "Please enter a match date.";
    }

    if (!form.time.trim()) {
      return "Please enter a start time.";
    }

    if (!form.venue.trim()) {
      return "Please select a venue.";
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

      const payload = buildFixturePayload(form, teams);

      if (modalType === "add") {
        await createFixture(payload);
      } else {
        await updateFixture(selectedFixture.id, payload);
      }

      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to save match details.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFixture) {
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      await deleteFixture(selectedFixture.id);
      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to delete this fixture.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "spl-matches.csv",
      filteredMatches.map((match) => ({
        MatchID: match.formattedId,
        Fixture: match.fixtureLabel,
        Venue: match.venue,
        Date: match.date,
        Time: match.time,
        Umpire: match.umpire,
        Status: match.status,
        TeamAScore: match.teamAScore,
        TeamBScore: match.teamBScore,
        Result: match.result,
      }))
    );
  };

  const columns = [
    { key: "formattedId", label: "ID" },
    { key: "fixtureLabel", label: "Fixture" },
    { key: "venue", label: "Venue" },
    { key: "date", label: "Date" },
    { key: "umpire", label: "Umpire" },
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

  const upcomingMatches = fixtureRows
    .filter((fixture) => fixture.status === "Upcoming" || fixture.status === "Draft")
    .slice(0, 3);

  const liveMatchesCount = fixtures.filter((fixture) => fixture.status === "Live").length;
  const completedMatchesCount = fixtures.filter((fixture) => fixture.status === "Completed").length;

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const recordId = searchParams.get("recordId") || "";
    const searchValue = (searchParams.get("search") || "").toLowerCase();

    if (!focusToken || loading) {
      return;
    }

    const focusKey = `${resource}-${recordId}-${focusToken}`;

    if (handledSearchFocus === focusKey) {
      return;
    }

    let matchedFixture = null;

    if (resource === "matches" && recordId) {
      matchedFixture = fixtureRows.find(
        (fixture) => String(fixture.id) === String(recordId)
      );
    }

    if (resource === "venues" && searchValue) {
      matchedFixture = fixtureRows.find((fixture) =>
        String(fixture.venue || "").toLowerCase().includes(searchValue)
      );
    }

    if (!matchedFixture) {
      return;
    }

    setHandledSearchFocus(focusKey);
    openViewModal(matchedFixture);
  }, [fixtureRows, handledSearchFocus, loading, searchParams]);

  return (
    <div className="space-y-6 bg-white">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <AccessLimitedNotice scope="matches" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            subtext={item.note}
            icon={item.icon}
            color={item.color}
          />
        ))}
      </section>

      <FilterBar
        filters={[
          {
            key: "search",
            label: "Search Match",
            type: "text",
            value: filters.search,
            placeholder: "Search by fixture, id, venue, or umpire",
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: [
              { label: "All Status", value: "all" },
              { label: "Live", value: "Live" },
              { label: "Upcoming", value: "Upcoming" },
              { label: "Completed", value: "Completed" },
              { label: "Draft", value: "Draft" },
            ],
          },
          {
            key: "venue",
            label: "Venue",
            type: "select",
            value: filters.venue,
            options: venueOptions,
          },
        ]}
        onChange={handleFilterChange}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <DashboardPanel title="Match Registry" bodyClassName="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="text-sm text-slate-500">
              Total results:{" "}
              <span className="font-semibold text-slate-900">
                {filteredMatches.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-xl bg-blue-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-blue-600 transition hover:bg-blue-200"
              >
                + Add Match
              </button>

              <ExportButton label="Export Matches" onClick={handleExport} />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Loading matches...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredMatches}
              rowKey="id"
              emptyMessage="No matches match the selected filters."
            />
          )}
        </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Upcoming Fixtures">
            <div className="space-y-3">
              {upcomingMatches.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming fixtures available.</p>
              ) : (
                upcomingMatches.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">
                        {item.fixtureLabel}
                      </p>
                      <Badge label={item.status} color={getBadgeColor(item.status)} />
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{item.venue}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.date} | {item.time}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Score Entry Summary">
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-600">
                  {liveMatchesCount} live matches need active scoring
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Live fixtures now come directly from the backend registry.
                </p>
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-700">
                  {fixtures.filter((fixture) => fixture.status === "Draft").length} draft fixtures need final review
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Draft matches can be promoted to upcoming once details are ready.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-600">
                  {completedMatchesCount} matches have recorded results
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Result and score fields are editable through the admin modal.
                </p>
              </div>
            </div>
          </DashboardPanel>
        </div>
      </section>

      {modalType ? (
        <ManagementModal
          title={
            modalType === "add"
              ? "ADD MATCH"
              : modalType === "view"
              ? "MATCH DETAILS"
              : modalType === "edit"
              ? "EDIT MATCH"
              : "DELETE MATCH"
          }
          onClose={closeModal}
          maxWidthClass="max-w-4xl"
        >
          {modalType === "delete" ? (
            <div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {selectedFixture?.teamA} vs {selectedFixture?.teamB}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-500">Match ID</label>
                  <input
                    value={selectedFixture ? formatMatchId(selectedFixture.id) : "Auto-generated"}
                    readOnly
                    className={getInputClass(true)}
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
                    <option value="Draft">Draft</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Live">Live</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Team A <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="team_a_id"
                    value={form.team_a_id}
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
                    Team B <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="team_b_id"
                    value={form.team_b_id}
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
                    Match Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="date"
                    value={form.date}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                    placeholder="Mar 26, 2026"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="time"
                    value={form.time}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                    placeholder="7:30 PM"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="venue"
                    value={form.venue}
                    onChange={handleInputChange}
                    disabled={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  >
                    <option value="">Select venue</option>
                    {venueOptions
                      .filter((option) => option.value !== "all")
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Umpire</label>
                  <input
                    name="umpire"
                    value={form.umpire}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Team A Score</label>
                  <input
                    name="teamAScore"
                    value={form.teamAScore}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                    placeholder="172/5"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-500">Team B Score</label>
                  <input
                    name="teamBScore"
                    value={form.teamBScore}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                    placeholder="158/8"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-slate-500">Result</label>
                  <input
                    name="result"
                    value={form.result}
                    onChange={handleInputChange}
                    readOnly={modalType === "view"}
                    className={getInputClass(modalType === "view")}
                    placeholder="Team A won by 14 runs"
                  />
                </div>
              </div>

              {modalType !== "view" ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving
                      ? modalType === "add"
                        ? "Creating..."
                        : "Saving..."
                      : modalType === "add"
                      ? "Add Match"
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
