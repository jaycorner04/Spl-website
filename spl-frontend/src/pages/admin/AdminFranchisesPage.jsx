import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DataTable from "../../components/dashboard/DataTable";
import FilterBar from "../../components/dashboard/FilterBar";
import ExportButton from "../../components/dashboard/ExportButton";
import ManagementModal from "../../components/dashboard/ManagementModal";
import Badge from "../../components/common/Badge";
import AccessLimitedNotice from "../../components/common/AccessLimitedNotice";
import {
  createFranchise,
  deleteFranchise,
  getFranchises,
  patchFranchise,
  updateFranchise,
  uploadFranchiseLogo,
} from "../../api/franchiseAPI";
import { createTeam, getTeams, patchTeam } from "../../api/teamsAPI";
import {
  createPlayer,
  getPlayers,
  patchPlayer,
  uploadPlayerPhoto,
} from "../../api/playersAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { formatFranchiseId } from "../../utils/adminFormatters";
import { downloadCsv } from "../../utils/downloadCsv";
import useFranchiseDashboard from "../../hooks/useFranchiseDashboard";
import { getAuthUser } from "../../utils/authStorage";
import { getMediaUrl } from "../../utils/media";
import {
  APPROVALS_UPDATED_EVENT,
  APPROVALS_UPDATED_STORAGE_KEY,
} from "../../utils/approvalSync";
import {
  FRANCHISES_UPDATED_EVENT,
  FRANCHISES_UPDATED_STORAGE_KEY,
} from "../../utils/franchiseSync";
import {
  findTeamBrandReference,
  getFallbackColor,
  getShortName,
} from "../../utils/teamBranding";
import {
  TEAMS_UPDATED_EVENT,
  TEAMS_UPDATED_STORAGE_KEY,
} from "../../utils/teamSync";

const PLAYING_XI_LIMIT = 11;

const emptyForm = {
  company_name: "",
  owner_name: "",
  address: "",
  website: "",
  logo: "",
};

function createDraftPlayer(squadRole = "Playing XI") {
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    full_name: "",
    photo: "",
    role: "Player",
    squad_role: squadRole,
    batting_style: "Right Hand",
    bowling_style: "spinner",
    email: "",
    mobile: "",
  };
}

function createStarterDraftPlayers() {
  return Array.from({ length: PLAYING_XI_LIMIT }, () =>
    createDraftPlayer("Playing XI")
  );
}

function createDraftTeam(ownerName = "") {
  return {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    team_name: "",
    city: "",
    owner: ownerName || "",
    coach: "",
    vice_coach: "",
    venue: "",
    primary_color: "blue",
    status: "Active",
    budget_left: "0",
    players: createStarterDraftPlayers(),
  };
}

function resolveSquadRole(player, index) {
  const normalizedRole = String(player?.squad_role || "").trim().toLowerCase();

  if (normalizedRole === "playing xi") {
    return "Playing XI";
  }

  if (normalizedRole === "reserve") {
    return "Reserve";
  }

  return index < PLAYING_XI_LIMIT ? "Playing XI" : "Reserve";
}

function buildTeamRoster(teamPlayers = []) {
  const sortedPlayers = [...teamPlayers].sort(
    (left, right) => Number(left.id || 0) - Number(right.id || 0)
  );

  return sortedPlayers.map((player, index) => ({
    ...player,
    squad_role: resolveSquadRole(player, index),
  }));
}

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

function getPlayerInitials(name = "") {
  const normalizedName = String(name || "").trim();

  if (!normalizedName) {
    return "PL";
  }

  return normalizedName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getDraftPlayerUploadKey(draftTeamId, draftPlayerId) {
  return `${draftTeamId}:${draftPlayerId}`;
}

function mapFranchiseToForm(franchise) {
  return {
    company_name: franchise.company_name || "",
    owner_name: franchise.owner_name || "",
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

function getDashboardNoticeColor(type = "") {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType.includes("live")) {
    return "red";
  }

  if (normalizedType.includes("match")) {
    return "blue";
  }

  if (normalizedType.includes("finance")) {
    return "green";
  }

  if (normalizedType.includes("performance")) {
    return "purple";
  }

  return "orange";
}

function getBudgetBarColorClass(index) {
  const colorClasses = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-yellow-500",
    "bg-orange-500",
  ];

  return colorClasses[index % colorClasses.length];
}

function formatDashboardLakhs(value) {
  const numericValue = Number(value || 0);
  const formatted = Number.isFinite(numericValue)
    ? numericValue.toFixed(1).replace(/\.0$/, "")
    : "0";

  return `Rs ${formatted}L`;
}

export default function AdminFranchisesPage() {
  const location = useLocation();
  const authUser = getAuthUser();
  const isFranchiseAdmin = authUser?.role === "franchise_admin";
  const scopedFranchiseId = String(authUser?.franchiseId || "");
  const statusMessage = location.state?.message || "";
  const [searchParams] = useSearchParams();
  const [franchises, setFranchises] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPlayerIds, setUpdatingPlayerIds] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    teamLink: "all",
    logoStatus: "all",
    status: "all",
  });
  const [modalType, setModalType] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [draftTeams, setDraftTeams] = useState([]);
  const [formError, setFormError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [uploadingDraftPlayerKey, setUploadingDraftPlayerKey] = useState("");
  const [draftPlayerUploadError, setDraftPlayerUploadError] = useState({
    key: "",
    message: "",
  });
  const logoInputRef = useRef(null);
  const handledSearchFocusRef = useRef("");
  const appliedSearchTokenRef = useRef("");
  const {
    summary: franchiseDashboardSummary,
    nextMatch: franchiseDashboardNextMatch,
    notices: franchiseDashboardNotices,
    squadSummary: franchiseDashboardSquadSummary,
    budgetTrend: franchiseDashboardBudgetTrend,
    loading: franchiseDashboardLoading,
    error: franchiseDashboardError,
  } = useFranchiseDashboard({}, { enabled: isFranchiseAdmin });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [franchisesResponse, teamsResponse, playersResponse] = await Promise.all([
        getFranchises(),
        getTeams(),
        getPlayers(),
      ]);

      setFranchises(Array.isArray(franchisesResponse) ? franchisesResponse : []);
      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
      setPlayers(Array.isArray(playersResponse) ? playersResponse : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load franchise registry.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };

    const handleStorage = (event) => {
      if (
        event.key === APPROVALS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY ||
        event.key === TEAMS_UPDATED_STORAGE_KEY
      ) {
        loadData();
      }
    };

    window.addEventListener(APPROVALS_UPDATED_EVENT, handleRefresh);
    window.addEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
    window.addEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener(APPROVALS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleRefresh);
    };
  }, []);

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const searchValue = searchParams.get("search") || "";

    if (
      !focusToken ||
      appliedSearchTokenRef.current === focusToken ||
      resource !== "franchises" ||
      !searchValue
    ) {
      return;
    }

    appliedSearchTokenRef.current = focusToken;
    setFilters((prev) => ({
      ...prev,
      search: searchValue,
    }));
  }, [searchParams]);

  const linkedTeamsByFranchiseId = useMemo(() => {
    return teams.reduce((accumulator, team) => {
      const franchiseId = String(team.franchise_id || "");

      if (!franchiseId) {
        return accumulator;
      }

      if (!accumulator[franchiseId]) {
        accumulator[franchiseId] = [];
      }

      accumulator[franchiseId].push(team);
      return accumulator;
    }, {});
  }, [teams]);

  const franchiseRows = useMemo(() => {
    return franchises.map((franchise) => {
      const linkedTeams = (linkedTeamsByFranchiseId[String(franchise.id)] || [])
        .slice()
        .sort((left, right) =>
          String(left.team_name || "").localeCompare(String(right.team_name || ""))
        );
      const featuredTeam = linkedTeams[0] || null;

      return {
        ...franchise,
        formattedId: formatFranchiseId(franchise.id),
        displayLogo: franchise.logo || featuredTeam?.logo || "",
        featuredTeamName: featuredTeam?.team_name || "",
        brandSourceName:
          featuredTeam?.team_name || franchise.company_name || "Unnamed Franchise",
        linkedTeamsCount: linkedTeams.length,
        linkedTeamIds: linkedTeams.map((team) => Number(team.id)),
        teamCapacityLabel: `${linkedTeams.length}/3`,
        slotsLeft: Math.max(3 - linkedTeams.length, 0),
        ownershipStatus:
          linkedTeams.length >= 3
            ? "Full"
            : `${Math.max(3 - linkedTeams.length, 0)} Slot${
                Math.max(3 - linkedTeams.length, 0) === 1 ? "" : "s"
              } Left`,
        linkedTeamsLabel:
          linkedTeams.length > 0
            ? linkedTeams.map((team) => team.team_name).join(", ")
            : "No linked teams yet",
        hasLogo: Boolean(franchise.logo),
      };
    });
  }, [franchises, linkedTeamsByFranchiseId]);

  const scopedFranchiseRows = useMemo(() => {
    if (!isFranchiseAdmin) {
      return franchiseRows;
    }

    if (!scopedFranchiseId) {
      return [];
    }

    return franchiseRows.filter(
      (franchise) => String(franchise.id) === scopedFranchiseId
    );
  }, [franchiseRows, isFranchiseAdmin, scopedFranchiseId]);

  const filteredFranchises = useMemo(() => {
    return scopedFranchiseRows.filter((franchise) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        [
          franchise.formattedId,
          franchise.company_name,
          franchise.owner_name,
          franchise.address,
          franchise.website,
          franchise.linkedTeamsLabel,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesTeamLink =
        filters.teamLink === "all" ||
        (filters.teamLink === "linked" && franchise.linkedTeamsCount > 0) ||
        (filters.teamLink === "unlinked" && franchise.linkedTeamsCount === 0);

      const matchesLogoStatus =
        filters.logoStatus === "all" ||
        (filters.logoStatus === "with-logo" && franchise.hasLogo) ||
        (filters.logoStatus === "without-logo" && !franchise.hasLogo);
      const matchesStatus =
        filters.status === "all" ||
        String(franchise.status || "").toLowerCase() ===
          String(filters.status).toLowerCase();

      return (
        matchesSearch &&
        matchesTeamLink &&
        matchesLogoStatus &&
        matchesStatus
      );
    });
  }, [filters, scopedFranchiseRows]);

  const playersByTeamId = useMemo(() => {
    return players.reduce((accumulator, player) => {
      const teamId = String(player.team_id || "");

      if (!teamId) {
        return accumulator;
      }

      if (!accumulator[teamId]) {
        accumulator[teamId] = [];
      }

      accumulator[teamId].push(player);
      return accumulator;
    }, {});
  }, [players]);

  const visibleFranchiseIdSet = useMemo(
    () => new Set(filteredFranchises.map((franchise) => String(franchise.id))),
    [filteredFranchises]
  );

  const franchiseTeamRosterRows = useMemo(() => {
    return teams
      .filter((team) =>
        visibleFranchiseIdSet.has(String(team.franchise_id || ""))
      )
      .sort((left, right) =>
        String(left.team_name || "").localeCompare(String(right.team_name || ""))
      )
      .map((team) => {
        const roster = buildTeamRoster(playersByTeamId[String(team.id)] || []);
        const playingXi = roster.filter(
          (player) => player.squad_role === "Playing XI"
        );
        const reservePlayers = roster.filter(
          (player) => player.squad_role !== "Playing XI"
        );

        return {
          ...team,
          roster,
          playingXi,
          reservePlayers,
        };
      });
  }, [playersByTeamId, teams, visibleFranchiseIdSet]);

  const activeManagedFranchise = isFranchiseAdmin
    ? filteredFranchises[0] || null
    : null;

  const summaryCards = useMemo(() => {
    const franchisesWithTeams = scopedFranchiseRows.filter(
      (franchise) => franchise.linkedTeamsCount > 0
    ).length;
    const fullFranchises = scopedFranchiseRows.filter(
      (franchise) => franchise.linkedTeamsCount >= 3
    ).length;
    const totalOpenSlots = scopedFranchiseRows.reduce(
      (sum, franchise) => sum + franchise.slotsLeft,
      0
    );
    const totalManagedPlayers = franchiseTeamRosterRows.reduce(
      (sum, team) => sum + team.roster.length,
      0
    );

    if (isFranchiseAdmin) {
      return [
        {
          label: "My Franchise",
          value: scopedFranchiseRows.length,
          subtext: "Your assigned franchise workspace",
          color: "purple",
          icon: "Fr",
        },
        {
          label: "My Teams",
          value: franchiseTeamRosterRows.length,
          subtext: "Teams currently under your franchise",
          color: "blue",
          icon: "Tm",
        },
        {
          label: "Open Slots",
          value: activeManagedFranchise?.slotsLeft ?? 0,
          subtext: "Remaining team slots you can still use",
          color: "green",
          icon: "Sl",
        },
        {
          label: "My Players",
          value: totalManagedPlayers,
          subtext: "Players currently assigned to your teams",
          color: "orange",
          icon: "Pl",
        },
      ];
    }

    return [
      {
        label: "Total Franchises",
        value: scopedFranchiseRows.length,
        subtext: "Available for super admin control",
        color: "purple",
        icon: "Fr",
      },
      {
        label: "Team Linked",
        value: franchisesWithTeams,
        subtext: "Mapped to one or more teams",
        color: "blue",
        icon: "Ln",
      },
      {
        label: "Open Slots",
        value: totalOpenSlots,
        subtext: "Remaining team slots across franchises",
        color: "green",
        icon: "Sl",
      },
      {
        label: "Full Capacity",
        value: fullFranchises,
        subtext: "Franchises already owning 3 teams",
        color: "orange",
        icon: "3T",
      },
    ];
  }, [
    activeManagedFranchise,
    franchiseTeamRosterRows,
    isFranchiseAdmin,
    scopedFranchiseRows,
  ]);

  const displayedSummaryCards =
    isFranchiseAdmin &&
    Array.isArray(franchiseDashboardSummary?.cards) &&
    franchiseDashboardSummary.cards.length > 0
      ? franchiseDashboardSummary.cards
      : summaryCards;

  const franchiseDashboardContext =
    franchiseDashboardSummary?.context ||
    franchiseDashboardNextMatch?.context ||
    franchiseDashboardNotices?.context ||
    franchiseDashboardSquadSummary?.context ||
    franchiseDashboardBudgetTrend?.context ||
    null;

  const franchiseInsightsPanels = isFranchiseAdmin ? (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <DashboardPanel
        title={franchiseDashboardSquadSummary?.title || "Squad Summary"}
        bodyClassName="space-y-4"
      >
        {franchiseDashboardLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading squad summary...
          </div>
        ) : Array.isArray(franchiseDashboardSquadSummary?.items) &&
          franchiseDashboardSquadSummary.items.length > 0 ? (
          franchiseDashboardSquadSummary.items.map((item, index, items) => {
            const maxValue = Math.max(
              ...items.map((entry) => Number(entry.value || 0)),
              1
            );
            const width = `${Math.max(
              (Number(item.value || 0) / maxValue) * 100,
              8
            )}%`;

            return (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{item.name}</span>
                  <span className="font-condensed text-sm font-bold text-slate-900">
                    {item.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={getBudgetBarColorClass(index)}
                    style={{ width, height: "100%" }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No squad summary is available yet.
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel
        title={franchiseDashboardBudgetTrend?.title || "Budget Trend"}
        bodyClassName="space-y-4"
      >
        {franchiseDashboardLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading budget trend...
          </div>
        ) : franchiseDashboardBudgetTrend ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Total Purse
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDashboardLakhs(franchiseDashboardBudgetTrend.totalPurse)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Spent
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDashboardLakhs(franchiseDashboardBudgetTrend.spent)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Remaining
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDashboardLakhs(franchiseDashboardBudgetTrend.remaining)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(franchiseDashboardBudgetTrend.items || []).map(
                (item, index, items) => {
                  const maxAmount = Math.max(
                    ...items.map((entry) => Number(entry.amount || 0)),
                    1
                  );
                  const width = `${Math.max(
                    (Number(item.amount || 0) / maxAmount) * 100,
                    8
                  )}%`;

                  return (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">{item.name}</span>
                        <span className="font-condensed text-sm font-bold text-slate-900">
                          {formatDashboardLakhs(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={getBudgetBarColorClass(index)}
                          style={{ width, height: "100%" }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No budget trend is available yet.
          </div>
        )}
      </DashboardPanel>
    </section>
  ) : null;

  const snapshotFranchises = useMemo(() => {
    return [...filteredFranchises].sort((left, right) => {
      if (right.linkedTeamsCount !== left.linkedTeamsCount) {
        return right.linkedTeamsCount - left.linkedTeamsCount;
      }

      return String(left.company_name || "").localeCompare(
        String(right.company_name || "")
      );
    });
  }, [filteredFranchises]);

  const openAddModal = () => {
    if (isFranchiseAdmin) {
      return;
    }

    setModalType("add");
    setSelectedFranchise(null);
    setForm(emptyForm);
    setSelectedTeamIds([]);
    setDraftTeams([]);
    setFormError("");
    setLogoUploadError("");
    setUploadingDraftPlayerKey("");
    setDraftPlayerUploadError({
      key: "",
      message: "",
    });
  };

  const openViewModal = (franchise) => {
    setModalType("view");
    setSelectedFranchise(franchise);
    setForm(mapFranchiseToForm(franchise));
    setSelectedTeamIds(franchise.linkedTeamIds || []);
    setDraftTeams([]);
    setFormError("");
    setLogoUploadError("");
    setUploadingDraftPlayerKey("");
    setDraftPlayerUploadError({
      key: "",
      message: "",
    });
  };

  const openEditModal = (franchise) => {
    setModalType("edit");
    setSelectedFranchise(franchise);
    setForm(mapFranchiseToForm(franchise));
    setSelectedTeamIds(franchise.linkedTeamIds || []);
    setDraftTeams([]);
    setFormError("");
    setLogoUploadError("");
  };

  const openAddTeamModal = (franchise) => {
    if (!franchise) {
      return;
    }

    setModalType("add-team");
    setSelectedFranchise(franchise);
    setForm(mapFranchiseToForm(franchise));
    setSelectedTeamIds(franchise.linkedTeamIds || []);
    setDraftTeams([createDraftTeam(franchise.owner_name)]);
    setFormError("");
    setLogoUploadError("");
    setUploadingDraftPlayerKey("");
    setDraftPlayerUploadError({
      key: "",
      message: "",
    });
  };

  const openDeleteModal = (franchise) => {
    setModalType("delete");
    setSelectedFranchise(franchise);
    setForm(mapFranchiseToForm(franchise));
    setSelectedTeamIds(franchise.linkedTeamIds || []);
    setDraftTeams([]);
    setFormError("");
    setLogoUploadError("");
    setUploadingDraftPlayerKey("");
    setDraftPlayerUploadError({
      key: "",
      message: "",
    });
  };

  const closeModal = () => {
    setModalType("");
    setSelectedFranchise(null);
    setForm(emptyForm);
    setSelectedTeamIds([]);
    setDraftTeams([]);
    setFormError("");
    setLogoUploadError("");
    setUploadingLogo(false);
    setUploadingDraftPlayerKey("");
    setDraftPlayerUploadError({
      key: "",
      message: "",
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const selectedTeamIdSet = useMemo(
    () => new Set(selectedTeamIds.map((teamId) => String(teamId))),
    [selectedTeamIds]
  );

  const selectedTeams = useMemo(() => {
    return teams.filter((team) => selectedTeamIdSet.has(String(team.id)));
  }, [selectedTeamIdSet, teams]);

  const draftTeamNames = draftTeams
    .map((draftTeam) => draftTeam.team_name.trim())
    .filter(Boolean);
  const linkedTeamsText =
    selectedTeams.length > 0 || draftTeamNames.length > 0
      ? [
          ...selectedTeams.map((team) => team.team_name),
          ...draftTeamNames,
        ].join(", ")
      : "No linked teams yet";
  const totalTeamCount = selectedTeamIds.length + draftTeams.length;
  const teamCapacityLabel = `${totalTeamCount}/3`;
  const availabilityLabel =
    totalTeamCount >= 3
      ? "Full"
      : `${Math.max(3 - totalTeamCount, 0)} Slot${
          Math.max(3 - totalTeamCount, 0) === 1 ? "" : "s"
        } Left`;

  const handleAddDraftTeam = () => {
    if (selectedTeamIds.length + draftTeams.length >= 3) {
      setFormError("A franchise can only own up to 3 teams.");
      return;
    }

    setDraftTeams((prev) => [...prev, createDraftTeam(form.owner_name)]);
    setFormError("");
  };

  const handleRemoveDraftTeam = (draftTeamId) => {
    setDraftTeams((prev) =>
      prev.filter((draftTeam) => draftTeam.id !== draftTeamId)
    );
    setFormError("");
  };

  const handleDraftTeamChange = (draftTeamId, field, value) => {
    setDraftTeams((prev) =>
      prev.map((draftTeam) =>
        draftTeam.id === draftTeamId
          ? { ...draftTeam, [field]: value }
          : draftTeam
      )
    );
    setFormError("");
  };

  const handleAddDraftPlayer = (draftTeamId) => {
    setDraftTeams((prev) =>
      prev.map((draftTeam) =>
        draftTeam.id === draftTeamId
          ? {
              ...draftTeam,
              players: [...draftTeam.players, createDraftPlayer("Reserve")],
            }
          : draftTeam
      )
    );
  };

  const handleRemoveDraftPlayer = (draftTeamId, draftPlayerId) => {
    setDraftTeams((prev) =>
      prev.map((draftTeam) =>
        draftTeam.id === draftTeamId
          ? {
              ...draftTeam,
              players: draftTeam.players.filter(
                (player) => player.id !== draftPlayerId
              ),
            }
          : draftTeam
      )
    );
  };

  const handleDraftPlayerChange = (
    draftTeamId,
    draftPlayerId,
    field,
    value
  ) => {
    setDraftTeams((prev) =>
      prev.map((draftTeam) =>
        draftTeam.id === draftTeamId
          ? {
              ...draftTeam,
              players: draftTeam.players.map((player) =>
                player.id === draftPlayerId
                  ? { ...player, [field]: value }
                  : player
              ),
            }
          : draftTeam
      )
    );
  };

  const handleDraftPlayerPhotoUpload = async (
    draftTeamId,
    draftPlayerId,
    event
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const uploadKey = getDraftPlayerUploadKey(draftTeamId, draftPlayerId);

    if (!file.type.startsWith("image/")) {
      setDraftPlayerUploadError({
        key: uploadKey,
        message: "Please choose a valid image file.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDraftPlayerUploadError({
        key: uploadKey,
        message: "Image must be 5 MB or smaller.",
      });
      return;
    }

    try {
      setUploadingDraftPlayerKey(uploadKey);
      setDraftPlayerUploadError({
        key: "",
        message: "",
      });

      const uploadResponse = await uploadPlayerPhoto(file);
      handleDraftPlayerChange(
        draftTeamId,
        draftPlayerId,
        "photo",
        uploadResponse.path || ""
      );
    } catch (uploadError) {
      setDraftPlayerUploadError({
        key: uploadKey,
        message: getApiErrorMessage(
          uploadError,
          "Unable to upload player image."
        ),
      });
    } finally {
      setUploadingDraftPlayerKey("");
    }
  };

  const handleClearDraftPlayerPhoto = (draftTeamId, draftPlayerId) => {
    handleDraftPlayerChange(draftTeamId, draftPlayerId, "photo", "");
    setDraftPlayerUploadError({
      key: "",
      message: "",
    });
  };

  const handleSetDraftPlayerSquadRole = (
    draftTeamId,
    draftPlayerId,
    nextRole
  ) => {
    let blocked = false;

    setDraftTeams((prev) =>
      prev.map((draftTeam) => {
        if (draftTeam.id !== draftTeamId) {
          return draftTeam;
        }

        const playingXiCount = draftTeam.players.filter(
          (player) => player.squad_role === "Playing XI"
        ).length;

        return {
          ...draftTeam,
          players: draftTeam.players.map((player) => {
            if (player.id !== draftPlayerId) {
              return player;
            }

            if (player.squad_role === nextRole) {
              return player;
            }

            if (nextRole === "Playing XI" && playingXiCount >= PLAYING_XI_LIMIT) {
              blocked = true;
              return player;
            }

            return {
              ...player,
              squad_role: nextRole,
            };
          }),
        };
      })
    );

    if (blocked) {
      setFormError(
        `Each team must keep exactly ${PLAYING_XI_LIMIT} players in the Playing XI. Move one player to Reserve before promoting another.`
      );
      return;
    }

    setFormError("");
  };

  const handleSetPlayerSquadRole = async (team, player, nextRole) => {
    const currentRole = resolveSquadRole(
      player,
      team.roster.findIndex((entry) => Number(entry.id) === Number(player.id))
    );

    if (currentRole === nextRole) {
      return;
    }

    if (
      nextRole === "Playing XI" &&
      team.playingXi.length >= PLAYING_XI_LIMIT
    ) {
      setError(
        `Keep only ${PLAYING_XI_LIMIT} players in the Playing XI for ${team.team_name}. Move one current starter to Reserve before promoting another player.`
      );
      return;
    }

    try {
      setUpdatingPlayerIds((prev) => [...prev, String(player.id)]);
      setError("");

      const updatedPlayer = await patchPlayer(player.id, {
        squad_role: nextRole,
      });

      setPlayers((prev) =>
        prev.map((entry) =>
          Number(entry.id) === Number(player.id)
            ? { ...entry, ...updatedPlayer, squad_role: nextRole }
            : entry
        )
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to update the player lineup right now.")
      );
    } finally {
      setUpdatingPlayerIds((prev) =>
        prev.filter((entry) => entry !== String(player.id))
      );
    }
  };

  const syncUpdatedFranchise = (updatedFranchise) => {
    if (!updatedFranchise) {
      return;
    }

    setFranchises((prev) =>
      prev.map((franchise) =>
        String(franchise.id) === String(updatedFranchise.id)
          ? { ...franchise, ...updatedFranchise }
          : franchise
      )
    );
    setSelectedFranchise((prev) =>
      prev && String(prev.id) === String(updatedFranchise.id)
        ? { ...prev, ...updatedFranchise }
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

      const uploadResponse = await uploadFranchiseLogo(file);
      const nextLogoPath = uploadResponse.path || "";

      setForm((prev) => ({
        ...prev,
        logo: nextLogoPath,
      }));

      if (selectedFranchise?.id && modalType === "edit") {
        const updatedFranchise = await patchFranchise(selectedFranchise.id, {
          logo: nextLogoPath,
        });
        syncUpdatedFranchise(updatedFranchise);
      }
    } catch (uploadError) {
      setLogoUploadError(
        getApiErrorMessage(uploadError, "Unable to upload franchise logo.")
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateForm = () => {
    if (!form.company_name.trim()) {
      return "Please enter a franchise name.";
    }

    if (selectedTeamIds.length + draftTeams.length > 3) {
      return "A franchise can only own up to 3 teams.";
    }

    for (const draftTeam of draftTeams) {
      if (!draftTeam.team_name.trim()) {
        return "Please enter a team name for each new franchise team.";
      }

      if (!draftTeam.city.trim()) {
        return `Please enter a city for ${draftTeam.team_name || "the new team"}.`;
      }

      if (!draftTeam.owner.trim()) {
        return `Please enter an owner for ${draftTeam.team_name || "the new team"}.`;
      }

      if (!draftTeam.vice_coach.trim()) {
        return `Please enter a captain for ${draftTeam.team_name || "the new team"}.`;
      }

      if (!draftTeam.venue.trim()) {
        return `Please enter a venue for ${draftTeam.team_name || "the new team"}.`;
      }

      if (Number.isNaN(Number(draftTeam.budget_left))) {
        return `Budget left must be a valid number for ${draftTeam.team_name || "the new team"}.`;
      }

      if (draftTeam.players.length < PLAYING_XI_LIMIT) {
        return `${draftTeam.team_name || "Each new team"} must include at least ${PLAYING_XI_LIMIT} players.`;
      }

      const playingXiCount = draftTeam.players.filter(
        (player) => player.squad_role === "Playing XI"
      ).length;

      if (playingXiCount !== PLAYING_XI_LIMIT) {
        return `${draftTeam.team_name || "Each new team"} must keep exactly ${PLAYING_XI_LIMIT} players in the Playing XI. Extra players can stay in Reserve for swaps.`;
      }

      for (const draftPlayer of draftTeam.players) {
        if (!draftPlayer.full_name.trim()) {
          return `Please enter a player name for ${draftTeam.team_name || "the new team"}.`;
        }
      }
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

      let savedFranchiseId = Number(selectedFranchise?.id || 0);

      if (modalType !== "add-team") {
        const payload = buildFranchisePayload(form);
        let savedFranchise;

        if (modalType === "add") {
          savedFranchise = await createFranchise(payload);
        } else {
          savedFranchise = await updateFranchise(selectedFranchise.id, payload);
        }

        savedFranchiseId = Number(
          savedFranchise?.id || selectedFranchise?.id || 0
        );
        const currentLinkedTeamIds = teams
          .filter(
            (team) => String(team.franchise_id || "") === String(savedFranchiseId)
          )
          .map((team) => Number(team.id));
        const nextLinkedTeamIds = selectedTeamIds.map((teamId) => Number(teamId));
        const unlinkTeamIds = currentLinkedTeamIds.filter(
          (teamId) => !nextLinkedTeamIds.includes(teamId)
        );
        const linkTeamIds = nextLinkedTeamIds.filter(
          (teamId) => !currentLinkedTeamIds.includes(teamId)
        );

        await Promise.all([
          ...unlinkTeamIds.map((teamId) =>
            patchTeam(teamId, {
              franchise_id: 0,
            })
          ),
          ...linkTeamIds.map((teamId) =>
            patchTeam(teamId, {
              franchise_id: savedFranchiseId,
            })
          ),
        ]);
      }

      if (!savedFranchiseId) {
        setFormError("Please choose a franchise before adding a team.");
        return;
      }

      for (const draftTeam of draftTeams) {
        const createdTeam = await createTeam({
          team_name: draftTeam.team_name.trim(),
          city: draftTeam.city.trim(),
          owner: draftTeam.owner.trim(),
          coach: draftTeam.coach.trim(),
          vice_coach: draftTeam.vice_coach.trim(),
          venue: draftTeam.venue.trim(),
          primary_color: draftTeam.primary_color,
          status: draftTeam.status,
          budget_left: Number(draftTeam.budget_left || 0),
          logo: "",
          franchise_id: savedFranchiseId,
        });

        for (const draftPlayer of draftTeam.players) {
          await createPlayer({
            full_name: draftPlayer.full_name.trim(),
            role: draftPlayer.role.trim(),
            squad_role: draftPlayer.squad_role || "Reserve",
            team_id: Number(createdTeam.id),
            team_name: createdTeam.team_name,
            batting_style: draftPlayer.batting_style.trim(),
            bowling_style: draftPlayer.bowling_style.trim(),
            photo: draftPlayer.photo || "",
            created_at: "",
            date_of_birth: "",
            mobile: draftPlayer.mobile.trim(),
            email: draftPlayer.email.trim(),
            status: "Active",
            salary: 0,
          });
        }
      }

      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to save franchise details.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFranchise) {
      return;
    }

    if (isFranchiseAdmin) {
      setFormError("Franchise admins can manage only their assigned franchise.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const linkedTeamIds = (selectedFranchise?.linkedTeamIds || []).map((teamId) =>
        Number(teamId)
      );

      await Promise.all(
        linkedTeamIds.map((teamId) =>
          patchTeam(teamId, {
            franchise_id: 0,
          })
        )
      );
      await deleteFranchise(selectedFranchise.id);
      await loadData();
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to delete this franchise.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "spl-franchises.csv",
      filteredFranchises.map((franchise) => ({
        FranchiseID: franchise.formattedId,
        Franchise: franchise.company_name,
        Owner: franchise.owner_name,
        Address: franchise.address,
        Website: franchise.website,
        LinkedTeams: franchise.linkedTeamsCount,
        TeamCapacity: franchise.teamCapacityLabel,
        OwnershipStatus: franchise.ownershipStatus,
        LinkedTeamNames: franchise.linkedTeamsLabel,
      }))
    );
  };

  const columns = [
    { key: "formattedId", label: "Franchise ID" },
    {
      key: "company_name",
      label: "Franchise",
      render: (row) => {
        const logoUrl = row.displayLogo ? getMediaUrl(row.displayLogo) : "";
        const brandReference = findTeamBrandReference(
          row.brandSourceName || row.featuredTeamName || row.company_name
        );
        const fallbackColor =
          brandReference?.logoColor || getFallbackColor("blue");

        return (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${row.company_name} logo`}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain p-1"
              />
            ) : brandReference?.brandIcon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-1">
                <brandReference.brandIcon
                  aria-label={`${row.company_name} logo`}
                  className="h-full w-full"
                  style={{ color: fallbackColor }}
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {getShortName(row.company_name || "FR")}
              </div>
            )}
            <div className="min-w-0">
              <span className="block truncate font-medium text-slate-900">
                {row.company_name}
              </span>
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
    { key: "owner_name", label: "Owner" },
    {
      key: "teamCapacityLabel",
      label: "Teams Used",
      render: (row) => (
        <span className="font-semibold text-purple-700">{row.teamCapacityLabel}</span>
      ),
    },
    {
      key: "status",
      label: "Approval",
      render: (row) => (
        <Badge
          label={row.status || "Approved"}
          color={
            String(row.status || "Approved").toLowerCase() === "approved"
              ? "green"
              : String(row.status || "").toLowerCase() === "rejected"
              ? "red"
              : "orange"
          }
        />
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
      key: "website",
      label: "Website",
      render: (row) => row.website || "-",
    },
    {
      key: "address",
      label: "Address",
      render: (row) => row.address || "-",
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
          {!isFranchiseAdmin ? (
            <button
              type="button"
              onClick={() => openDeleteModal(row)}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-200"
            >
              Delete
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const logoPreviewUrl = form.logo ? getMediaUrl(form.logo) : "";
  const franchiseInitials = getFranchiseInitials(
    form.company_name || selectedFranchise?.company_name || "FR"
  );

  useEffect(() => {
    const focusToken = searchParams.get("focusToken") || "";
    const resource = searchParams.get("resource") || "";
    const recordId = searchParams.get("recordId") || "";

    if (!focusToken || resource !== "franchises" || !recordId || loading) {
      return;
    }

    const focusKey = `${resource}-${recordId}-${focusToken}`;

    if (handledSearchFocusRef.current === focusKey) {
      return;
    }

    const searchableFranchises = isFranchiseAdmin
      ? scopedFranchiseRows
      : franchiseRows;
    const matchedFranchise = searchableFranchises.find(
      (franchise) => String(franchise.id) === String(recordId)
    );

    if (!matchedFranchise) {
      return;
    }

    handledSearchFocusRef.current = focusKey;
    openViewModal(matchedFranchise);
  }, [franchiseRows, isFranchiseAdmin, loading, scopedFranchiseRows, searchParams]);

  const franchiseRegistryPanel = (
    <DashboardPanel
      title={isFranchiseAdmin ? "My Franchise" : "Franchise Registry"}
      actionLabel={
        isFranchiseAdmin
          ? filteredFranchises[0]
            ? "Edit My Franchise"
            : undefined
          : undefined
      }
      onAction={
        isFranchiseAdmin && filteredFranchises[0]
          ? () => openEditModal(filteredFranchises[0])
          : undefined
      }
      bodyClassName="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="text-sm text-slate-500">
          Total results:{" "}
          <span className="font-semibold text-slate-900">
            {filteredFranchises.length}
          </span>
        </div>

        {!isFranchiseAdmin ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-purple-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-purple-700 transition hover:bg-purple-200"
            >
              + Add Franchise
            </button>

            <ExportButton label="Export Franchises" onClick={handleExport} />
          </div>
        ) : null}
      </div>

      {isFranchiseAdmin && !scopedFranchiseId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No franchise is linked to this account yet. Once your franchise is assigned, only your owned franchise and teams will appear here.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
          Loading franchises...
        </div>
      ) : (
        <div
          className="max-h-[34rem] overflow-y-auto pr-1"
          style={{ scrollbarWidth: "thin" }}
        >
          <DataTable
            columns={columns}
            data={filteredFranchises}
            rowKey="id"
            emptyMessage={
              isFranchiseAdmin
                ? "No franchise is linked to this account yet."
                : "No franchises match the selected filters."
            }
          />
        </div>
      )}
    </DashboardPanel>
  );

  const franchiseTeamsAndPlayersPanel = (
    <DashboardPanel
      title={isFranchiseAdmin ? "My Teams & Players" : "Franchise Teams & Players"}
      actionLabel={
        isFranchiseAdmin
          ? activeManagedFranchise?.slotsLeft > 0
            ? "+ Add Team"
            : undefined
          : `${franchiseTeamRosterRows.length} teams`
      }
      onAction={
        isFranchiseAdmin && activeManagedFranchise?.slotsLeft > 0
          ? () => openAddTeamModal(activeManagedFranchise)
          : undefined
      }
      bodyClassName="space-y-4"
    >
      {isFranchiseAdmin && activeManagedFranchise ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-purple-900">
              {franchiseTeamRosterRows.length} team
              {franchiseTeamRosterRows.length === 1 ? "" : "s"} under your franchise
            </p>
            <p className="mt-1">
              You can add teams directly from here and build their player squads without opening Edit Franchise.
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-purple-700">
            {activeManagedFranchise.teamCapacityLabel} used
          </span>
        </div>
      ) : null}

      {franchiseTeamRosterRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
          No team squads are linked to this franchise yet.
        </div>
      ) : (
        <div
          className="max-h-[42rem] space-y-4 overflow-y-auto pr-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {franchiseTeamRosterRows.map((team) => {
            const playingXiFull = team.playingXi.length >= PLAYING_XI_LIMIT;

            return (
              <div
                key={team.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                      {team.team_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {team.city || "City not set"} | {team.venue || "Venue not set"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      Playing XI: {team.playingXi.length}/{PLAYING_XI_LIMIT}
                    </span>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      Reserves: {team.reservePlayers.length}
                    </span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      Total Squad: {team.roster.length}
                    </span>
                  </div>
                </div>

                {team.playingXi.length !== PLAYING_XI_LIMIT ? (
                  <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                    This team currently has {team.playingXi.length} players in the Playing XI. Keep exactly {PLAYING_XI_LIMIT} players there and use Reserve players for swaps.
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-blue-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-condensed text-sm uppercase tracking-[0.16em] text-blue-800">
                          Playing XI
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Keep exactly {PLAYING_XI_LIMIT} active players here for match day.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {team.playingXi.length}/{PLAYING_XI_LIMIT}
                      </span>
                    </div>

                    {team.playingXi.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        No Playing XI selected yet.
                      </div>
                    ) : (
                      <div
                        className="mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        {team.playingXi.map((player, index) => {
                          const isUpdating = updatingPlayerIds.includes(
                            String(player.id)
                          );

                          return (
                            <div
                              key={player.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {index + 1}. {player.full_name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {player.role || "Player"} | {player.batting_style || "Right Hand"} | {player.bowling_style || "Not listed"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetPlayerSquadRole(
                                      team,
                                      player,
                                      "Reserve"
                                    )
                                  }
                                  disabled={isUpdating}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating ? "Updating..." : "Move to Reserve"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-condensed text-sm uppercase tracking-[0.16em] text-purple-800">
                          Reserve Players
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Keep extra players here so you can swap them into the Playing XI anytime.
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        {team.reservePlayers.length} bench
                      </span>
                    </div>

                    {team.reservePlayers.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        No reserve players added yet for this team.
                      </div>
                    ) : (
                      <div
                        className="mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        {team.reservePlayers.map((player) => {
                          const isUpdating = updatingPlayerIds.includes(
                            String(player.id)
                          );
                          const promoteDisabled = isUpdating || playingXiFull;

                          return (
                            <div
                              key={player.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {player.full_name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {player.role || "Player"} | {player.batting_style || "Right Hand"} | {player.bowling_style || "Not listed"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetPlayerSquadRole(
                                      team,
                                      player,
                                      "Playing XI"
                                    )
                                  }
                                  disabled={promoteDisabled}
                                  className="rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating
                                    ? "Updating..."
                                    : playingXiFull
                                    ? "Playing XI Full"
                                    : "Promote to XI"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );

  return (
    <div className="space-y-6 bg-white">
      {statusMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <AccessLimitedNotice scope="franchise" />

      {isFranchiseAdmin ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700">
          Showing only your assigned franchise, along with the teams and players managed under it.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {displayedSummaryCards.map((item) => (
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

      {isFranchiseAdmin ? (
        <>
          {franchiseDashboardError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {franchiseDashboardError}
            </div>
          ) : null}

          <DashboardPanel
            title={franchiseDashboardSummary?.heroTitle || "Franchise Dashboard"}
            bodyClassName="space-y-4"
          >
            {franchiseDashboardLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Loading franchise dashboard...
              </div>
            ) : franchiseDashboardContext ? (
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5">
                  <p className="font-condensed text-xs font-bold uppercase tracking-[0.18em] text-purple-700">
                    Active Franchise
                  </p>
                  <h2 className="mt-2 font-heading text-3xl leading-none text-slate-900">
                    {franchiseDashboardContext.franchiseName || "Assigned Franchise"}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Team:{" "}
                    <span className="font-semibold text-slate-900">
                      {franchiseDashboardContext.teamName || "Not linked yet"}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {[
                      franchiseDashboardContext.city,
                      franchiseDashboardContext.venue,
                    ]
                      .filter(Boolean)
                      .join(" | ") || "Venue details will appear here once linked."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Owner
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {franchiseDashboardContext.ownerName || "Not assigned"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Website
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {franchiseDashboardContext.website || "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No franchise dashboard data is available yet.
              </div>
            )}
          </DashboardPanel>

          {franchiseRegistryPanel}

          {franchiseTeamsAndPlayersPanel}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DashboardPanel
              title={franchiseDashboardNextMatch?.title || "Next Match"}
              bodyClassName="space-y-4"
            >
              {franchiseDashboardLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Loading next match...
                </div>
              ) : franchiseDashboardNextMatch?.match ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-condensed text-base font-bold uppercase tracking-[0.14em] text-slate-900">
                        {franchiseDashboardNextMatch.match.fixture}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {franchiseDashboardNextMatch.match.venue}
                      </p>
                    </div>
                    <Badge
                      label={franchiseDashboardNextMatch.match.status || "Upcoming"}
                      color={
                        String(
                          franchiseDashboardNextMatch.match.status || ""
                        ).toLowerCase() === "live"
                          ? "red"
                          : "blue"
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Match Date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {franchiseDashboardNextMatch.match.date || "TBD"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Match Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {franchiseDashboardNextMatch.match.time || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    {franchiseDashboardNextMatch.match.note}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No next match details are available yet.
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title={franchiseDashboardNotices?.title || "Notices"}
              bodyClassName="space-y-3"
            >
              {franchiseDashboardLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Loading notices...
                </div>
              ) : Array.isArray(franchiseDashboardNotices?.items) &&
                franchiseDashboardNotices.items.length > 0 ? (
                franchiseDashboardNotices.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{item.date}</p>
                      </div>
                      <Badge
                        label={item.type || "Notice"}
                        color={getDashboardNoticeColor(item.type)}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No notices are available yet.
                </div>
              )}
            </DashboardPanel>
          </section>

        </>
      ) : null}

      {!isFranchiseAdmin ? (
        <FilterBar
          filters={[
            {
              key: "search",
              label: "Search Franchise",
              type: "text",
              value: filters.search,
              placeholder: "Search by name, owner, address, website, or team",
            },
            {
              key: "teamLink",
              label: "Team Link",
              type: "select",
              value: filters.teamLink,
              options: [
                { label: "All Franchises", value: "all" },
                { label: "Linked To Team", value: "linked" },
                { label: "Not Linked Yet", value: "unlinked" },
              ],
            },
            {
              key: "logoStatus",
              label: "Logo Status",
              type: "select",
              value: filters.logoStatus,
              options: [
                { label: "All Logos", value: "all" },
                { label: "With Logo", value: "with-logo" },
                { label: "Without Logo", value: "without-logo" },
              ],
            },
            {
              key: "status",
              label: "Approval Status",
              type: "select",
              value: filters.status,
              options: [
                { label: "All Status", value: "all" },
                { label: "Approved", value: "approved" },
                { label: "Pending", value: "pending" },
                { label: "Rejected", value: "rejected" },
              ],
            },
          ]}
          onChange={handleFilterChange}
        />
      ) : null}

      {!isFranchiseAdmin ? franchiseRegistryPanel : null}

      <div className="flex flex-col gap-6">
      <div className="order-1">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel
          title={isFranchiseAdmin ? "My Teams Snapshot" : "Linked Team Snapshot"}
          actionLabel={
            isFranchiseAdmin
              ? `${franchiseTeamRosterRows.length} teams`
              : `${snapshotFranchises.length} franchises`
          }
        >
          <div
            className="max-h-[28rem] space-y-3 overflow-y-auto pr-1"
            style={{ scrollbarWidth: "thin" }}
          >
            {isFranchiseAdmin ? (
              franchiseTeamRosterRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No teams are linked under your franchise yet.
                </p>
              ) : (
                franchiseTeamRosterRows.map((team) => (
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
                          {[team.city, team.owner, team.captain]
                            .filter(Boolean)
                            .join(" • ") || "Team details available in your roster section"}
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-purple-700">
                        {team.roster.length} players
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              snapshotFranchises.length === 0 ? (
                <p className="text-sm text-slate-500">No franchises available.</p>
              ) : (
                snapshotFranchises.map((franchise) => (
                  <div
                    key={franchise.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {franchise.company_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {franchise.linkedTeamsLabel}
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-purple-700">
                        {franchise.teamCapacityLabel} teams
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title={isFranchiseAdmin ? "My Franchise Notes" : "Quick Notes"}>
          <div className="space-y-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-600">
                {isFranchiseAdmin
                  ? `${franchiseTeamRosterRows.length} team${
                      franchiseTeamRosterRows.length === 1 ? "" : "s"
                    } are linked under your franchise`
                  : `${scopedFranchiseRows.filter((franchise) => franchise.linkedTeamsCount > 0).length} franchises are already linked`}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {isFranchiseAdmin
                  ? "This area tracks only the teams and players managed inside your franchise workspace."
                  : "Linked franchises help the super admin track ownership and branding in one place."}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-700">
                {isFranchiseAdmin
                  ? activeManagedFranchise?.hasLogo
                    ? "Your franchise logo is already uploaded"
                    : "Your franchise still needs a logo"
                  : `${scopedFranchiseRows.filter((franchise) => !franchise.hasLogo).length} franchises still need logos`}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {isFranchiseAdmin
                  ? "Once approved, your franchise logo can appear on the public franchise section when a team logo is not set."
                  : "Uploaded franchise logos can appear on the public franchise section when a team logo is not set."}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-600">
                {isFranchiseAdmin
                  ? `You can manage up to 3 teams under ${activeManagedFranchise?.company_name || "your franchise"}`
                  : "One franchise can own up to 3 teams"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {isFranchiseAdmin
                  ? "Your team limit is enforced here, and any teams or players you add will stay under your franchise."
                  : "The admin teams form now enforces this limit and the linked team details update live here."}
              </p>
            </div>
          </div>
        </DashboardPanel>
      </section>
      </div>

      {!isFranchiseAdmin ? (
        <div className="order-2">{franchiseTeamsAndPlayersPanel}</div>
      ) : null}
      {franchiseInsightsPanels ? (
        <div className="order-3">
          {franchiseInsightsPanels}
        </div>
      ) : null}
      </div>

      {modalType ? (
        <ManagementModal
          title={
            modalType === "add"
              ? "ADD FRANCHISE"
              : modalType === "add-team"
              ? "ADD TEAM"
              : modalType === "view"
              ? "FRANCHISE DETAILS"
              : modalType === "edit"
              ? "EDIT FRANCHISE"
              : "DELETE FRANCHISE"
          }
          onClose={closeModal}
        >
          {modalType === "delete" ? (
            <div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {selectedFranchise?.company_name}
                </span>
                ?
              </p>

              {selectedFranchise?.linkedTeamsCount > 0 ? (
                <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  This franchise is currently linked to {selectedFranchise.linkedTeamsCount} team
                  {selectedFranchise.linkedTeamsCount === 1 ? "" : "s"}.
                </div>
              ) : null}

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

              {modalType !== "add-team" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt={form.company_name || "Franchise logo preview"}
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
                        This logo can be used on the home franchise section when a team logo is not available.
                      </p>
                      {modalType === "add" ? (
                        <p className="mt-1 text-sm text-slate-500">
                          For a new franchise, finish by clicking Add Franchise so the logo stays attached to the saved record.
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
              )}

              {modalType !== "add-team" ? (
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
                      value={form.company_name}
                      onChange={handleInputChange}
                      readOnly={modalType === "view"}
                      className={getInputClass(modalType === "view")}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-500">
                      Owner Name
                    </label>
                    <input
                      name="owner_name"
                      value={form.owner_name}
                      onChange={handleInputChange}
                      readOnly={modalType === "view"}
                      className={getInputClass(modalType === "view")}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-500">
                      Website
                    </label>
                    <input
                      name="website"
                      value={form.website}
                      onChange={handleInputChange}
                      readOnly={modalType === "view"}
                      className={getInputClass(modalType === "view")}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm text-slate-500">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      readOnly={modalType === "view"}
                      rows={3}
                      className={`${getInputClass(
                        modalType === "view"
                      )} resize-none`}
                    />
                  </div>
                </div>
              ) : null}

              {modalType !== "view" && (
                <div className="sm:col-span-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-condensed text-sm uppercase tracking-[0.18em] text-slate-700">
                            {modalType === "add-team" ? "Add Team" : "Quick Add Team"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Create a new team for this franchise right here. Each team must keep exactly 11 players in the Playing XI, and you can add extra reserve players for swaps.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddDraftTeam}
                          disabled={selectedTeamIds.length + draftTeams.length >= 3}
                          className="rounded-xl bg-purple-100 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          + Add New Team
                        </button>
                      </div>

                      {draftTeams.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No new teams added yet. Use <span className="font-semibold text-slate-700">+ Add New Team</span> to create one inside this franchise.
                        </div>
                      ) : (
                        <div
                          className="mt-4 max-h-[32rem] space-y-4 overflow-y-auto pr-1"
                          style={{ scrollbarWidth: "thin" }}
                        >
                          {draftTeams.map((draftTeam, index) => {
                            const draftPlayingXiCount = draftTeam.players.filter(
                              (player) => player.squad_role === "Playing XI"
                            ).length;
                            const draftReserveCount = draftTeam.players.length - draftPlayingXiCount;

                            return (
                              <div
                                key={draftTeam.id}
                                className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4"
                              >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-condensed text-sm uppercase tracking-[0.16em] text-purple-800">
                                    New Team {index + 1}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    This team will be created under {form.company_name || "this franchise"} when you save.
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    Playing XI: {draftPlayingXiCount}/{PLAYING_XI_LIMIT}
                                  </span>
                                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                    Reserves: {draftReserveCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDraftTeam(draftTeam.id)}
                                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                  >
                                    Remove Team
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Team Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={draftTeam.team_name}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "team_name",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    City <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={draftTeam.city}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "city",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Owner <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={draftTeam.owner}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "owner",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Captain <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={draftTeam.vice_coach}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "vice_coach",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Coach
                                  </label>
                                  <input
                                    value={draftTeam.coach}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "coach",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Venue <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={draftTeam.venue}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "venue",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Primary Color
                                  </label>
                                  <select
                                    value={draftTeam.primary_color}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "primary_color",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
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
                                  <label className="mb-2 block text-sm text-slate-500">
                                    Budget Left
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={draftTeam.budget_left}
                                    onChange={(event) =>
                                      handleDraftTeamChange(
                                        draftTeam.id,
                                        "budget_left",
                                        event.target.value
                                      )
                                    }
                                    className={getInputClass(false)}
                                  />
                                </div>
                              </div>

                              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                                      Squad Players
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      The first 11 players belong to the Playing XI. Add more players as reserves so you can swap your lineup later.
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAddDraftPlayer(draftTeam.id)}
                                    className="rounded-xl bg-blue-100 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
                                  >
                                    + Add Reserve Player
                                  </button>
                                </div>

                                {draftTeam.players.length === 0 ? (
                                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                    No players added yet for this team.
                                  </div>
                                ) : (
                                  <div
                                    className="mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1"
                                    style={{ scrollbarWidth: "thin" }}
                                  >
                                    {draftTeam.players.map((draftPlayer, playerIndex) => (
                                      <div
                                        key={draftPlayer.id}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                      >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div>
                                            <p className="font-semibold text-slate-900">
                                              Player {playerIndex + 1}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                              {draftPlayer.squad_role === "Playing XI"
                                                ? "Counts toward the 11-player Playing XI"
                                                : "Reserve player for lineup swaps"}
                                            </p>
                                          </div>

                                          <div className="flex flex-wrap gap-2">
                                            <span
                                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                draftPlayer.squad_role === "Playing XI"
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "bg-purple-100 text-purple-700"
                                              }`}
                                            >
                                              {draftPlayer.squad_role}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRemoveDraftPlayer(
                                                  draftTeam.id,
                                                  draftPlayer.id
                                                )
                                              }
                                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                            >
                                              Remove Player
                                            </button>
                                          </div>
                                        </div>

                                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-4">
                                              {draftPlayer.photo ? (
                                                <img
                                                  src={getMediaUrl(draftPlayer.photo)}
                                                  alt={draftPlayer.full_name || "Player photo"}
                                                  className="h-16 w-16 rounded-2xl object-cover shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
                                                />
                                              ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 font-condensed text-lg uppercase tracking-[0.16em] text-slate-500">
                                                  {getPlayerInitials(draftPlayer.full_name)}
                                                </div>
                                              )}

                                              <div>
                                                <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                                                  Player Image
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                  Upload a JPG, PNG, or WEBP image up to 5 MB for this player.
                                                </p>
                                                {draftPlayerUploadError.key ===
                                                getDraftPlayerUploadKey(
                                                  draftTeam.id,
                                                  draftPlayer.id
                                                ) ? (
                                                  <p className="mt-2 text-sm text-red-600">
                                                    {draftPlayerUploadError.message}
                                                  </p>
                                                ) : null}
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                              <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                                                {uploadingDraftPlayerKey ===
                                                getDraftPlayerUploadKey(
                                                  draftTeam.id,
                                                  draftPlayer.id
                                                )
                                                  ? "Uploading..."
                                                  : draftPlayer.photo
                                                  ? "Change Image"
                                                  : "Upload Image"}
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  onChange={(event) =>
                                                    handleDraftPlayerPhotoUpload(
                                                      draftTeam.id,
                                                      draftPlayer.id,
                                                      event
                                                    )
                                                  }
                                                  disabled={
                                                    uploadingDraftPlayerKey ===
                                                    getDraftPlayerUploadKey(
                                                      draftTeam.id,
                                                      draftPlayer.id
                                                    )
                                                  }
                                                />
                                              </label>

                                              {draftPlayer.photo ? (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleClearDraftPlayerPhoto(
                                                      draftTeam.id,
                                                      draftPlayer.id
                                                    )
                                                  }
                                                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
                                                >
                                                  Remove
                                                </button>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Player Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                              value={draftPlayer.full_name}
                                              onChange={(event) =>
                                                handleDraftPlayerChange(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  "full_name",
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            />
                                          </div>

                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Role
                                            </label>
                                            <input
                                              value={draftPlayer.role}
                                              onChange={(event) =>
                                                handleDraftPlayerChange(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  "role",
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            />
                                          </div>

                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Squad Role
                                            </label>
                                            <select
                                              value={draftPlayer.squad_role}
                                              onChange={(event) =>
                                                handleSetDraftPlayerSquadRole(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            >
                                              <option value="Playing XI">Playing XI</option>
                                              <option value="Reserve">Reserve</option>
                                            </select>
                                          </div>

                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Batting Style
                                            </label>
                                            <input
                                              value={draftPlayer.batting_style}
                                              onChange={(event) =>
                                                handleDraftPlayerChange(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  "batting_style",
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            />
                                          </div>

                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Bowling Style
                                            </label>
                                            <input
                                              value={draftPlayer.bowling_style}
                                              onChange={(event) =>
                                                handleDraftPlayerChange(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  "bowling_style",
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            />
                                          </div>

                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Email
                                            </label>
                                            <input
                                              value={draftPlayer.email}
                                              onChange={(event) =>
                                                handleDraftPlayerChange(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  "email",
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            />
                                          </div>

                                          <div>
                                            <label className="mb-2 block text-sm text-slate-500">
                                              Mobile
                                            </label>
                                            <input
                                              value={draftPlayer.mobile}
                                              onChange={(event) =>
                                                handleDraftPlayerChange(
                                                  draftTeam.id,
                                                  draftPlayer.id,
                                                  "mobile",
                                                  event.target.value
                                                )
                                              }
                                              className={getInputClass(false)}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
              )}

              {modalType !== "add-team" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm text-slate-500">
                      Linked Teams
                    </label>
                    <textarea
                      value={linkedTeamsText}
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
                      value={teamCapacityLabel}
                      readOnly
                      className={getInputClass(true)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-500">
                      Availability
                    </label>
                    <input
                      value={availabilityLabel}
                      readOnly
                      className={getInputClass(true)}
                    />
                  </div>
                </div>
              )}

              {modalType !== "view" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || uploadingLogo || Boolean(uploadingDraftPlayerKey)}
                    className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving
                      ? modalType === "add"
                        ? "Creating..."
                        : modalType === "add-team"
                        ? "Adding Team..."
                        : "Saving..."
                      : uploadingLogo
                      ? "Uploading..."
                      : uploadingDraftPlayerKey
                      ? "Uploading Player Image..."
                      : modalType === "add"
                      ? "Add Franchise"
                      : modalType === "add-team"
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
              )}
            </div>
          )}
        </ManagementModal>
      ) : null}
    </div>
  );
}
