import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaExclamationTriangle,
  FaEye,
  FaCheck,
  FaTimes,
  FaTrash,
  FaUsers,
  FaBuilding,
  FaClipboardList,
} from "react-icons/fa";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DataTable from "../../components/dashboard/DataTable";
import FilterBar from "../../components/dashboard/FilterBar";
import ExportButton from "../../components/dashboard/ExportButton";
import Badge from "../../components/common/Badge";
import ManagementModal from "../../components/dashboard/ManagementModal";
import {
  deleteRejectedFranchiseApproval,
  getApprovals,
  patchApproval,
} from "../../api/approvalsAPI";
import { getPlayers } from "../../api/playersAPI";
import { getTeams } from "../../api/teamsAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { downloadCsv } from "../../utils/downloadCsv";

const FRANCHISE_APPROVAL_META_PREFIX = "__SPL_FRANCHISE_REG__";
const PLAYER_APPROVAL_META_PREFIX = "__SPL_PLAYER_REG__";
const APPROVAL_META_PREFIXES = [
  FRANCHISE_APPROVAL_META_PREFIX,
  PLAYER_APPROVAL_META_PREFIX,
];

function getApprovalIcon(icon) {
  switch (icon) {
    case "Pending":
      return <FaClock />;
    case "Approved":
      return <FaCheckCircle />;
    case "Rejected":
      return <FaTimesCircle />;
    case "Escalated":
      return <FaExclamationTriangle />;
    default:
      return <FaClock />;
  }
}

function ApprovalStatCard({
  label,
  value,
  subtext,
  color,
  icon,
  active = false,
  onClick,
}) {
  const topBorderMap = {
    gold: "before:bg-yellow-500",
    red: "before:bg-red-500",
    green: "before:bg-emerald-500",
    blue: "before:bg-blue-500",
    purple: "before:bg-purple-500",
    orange: "before:bg-orange-500",
  };

  const valueColorMap = {
    gold: "text-yellow-600",
    red: "text-red-500",
    green: "text-emerald-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        active
          ? "border-slate-300 ring-2 ring-slate-300 ring-offset-2"
          : "border-slate-200"
      } ${topBorderMap[color]}`}
      aria-label={`Show ${label} details`}
    >
      <p className="font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-heading text-4xl leading-none tracking-[0.04em] ${valueColorMap[color]}`}>
            {value}
          </h3>
          <p className="mt-2 text-xs text-slate-500">{subtext}</p>
          <p className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${valueColorMap[color]}`}>
            {active ? "Showing details" : "Click for details"}
          </p>
        </div>

        <span className="text-2xl text-slate-400">{getApprovalIcon(icon)}</span>
      </div>
    </button>
  );
}

function getStatusBadgeColor(status) {
  const colorMap = {
    Pending: "purple",
    Approved: "green",
    Rejected: "red",
    Escalated: "orange",
  };

  return colorMap[status] || "slate";
}

function getPriorityBadgeColor(priority) {
  const colorMap = {
    High: "red",
    Medium: "orange",
    Low: "blue",
  };

  return colorMap[priority] || "slate";
}

function getApprovalNotesWithoutMeta(notes = "") {
  return String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        !APPROVAL_META_PREFIXES.some((prefix) => line.startsWith(prefix))
    )
    .join("\n")
    .trim();
}

function parseFranchiseApprovalMeta(notes = "") {
  const firstLine = String(notes || "").split(/\r?\n/, 1)[0] || "";

  if (!firstLine.startsWith(FRANCHISE_APPROVAL_META_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(firstLine.slice(FRANCHISE_APPROVAL_META_PREFIX.length));
  } catch {
    return null;
  }
}

function parsePlayerApprovalMeta(notes = "") {
  const firstLine = String(notes || "").split(/\r?\n/, 1)[0] || "";

  if (!firstLine.startsWith(PLAYER_APPROVAL_META_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(firstLine.slice(PLAYER_APPROVAL_META_PREFIX.length));
  } catch {
    return null;
  }
}

function getApprovalLineValue(lines, label) {
  const prefix = `${label.toLowerCase()}:`;
  const matchedLine = lines.find((line) =>
    line.toLowerCase().startsWith(prefix)
  );

  return matchedLine ? matchedLine.slice(prefix.length).trim() : "";
}

function hasApprovalValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function getApprovalContextValue(context, label) {
  return (
    context.find((item) => String(item.label) === String(label))?.value || ""
  );
}

function getFranchiseApprovalContext(approval) {
  const notes = String(approval?.notes || "");
  const meta = parseFranchiseApprovalMeta(notes);
  const visibleLines = getApprovalNotesWithoutMeta(notes)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const requestType = String(approval?.request_type || "").toLowerCase();
  const summaryLine = visibleLines.find((line) =>
    /^franchise registration submitted for\s+/i.test(line)
  );
  const franchiseNameMatch = summaryLine?.match(
    /^franchise registration submitted for\s+(.+?)(?:\.)?$/i
  );
  const isFranchiseRegistration =
    requestType.includes("franchise registration") ||
    Boolean(meta) ||
    Boolean(summaryLine) ||
    visibleLines.some((line) =>
      /^(owner|email|employee id|address|website):/i.test(line)
    );

  if (!isFranchiseRegistration) {
    return [];
  }

  return [
    {
      label: "Franchise Name",
      value: meta?.franchiseName || franchiseNameMatch?.[1]?.trim() || "",
    },
    {
      label: "Owner Name",
      value: meta?.fullName || getApprovalLineValue(visibleLines, "Owner"),
    },
    {
      label: "Email ID",
      value: meta?.email || getApprovalLineValue(visibleLines, "Email"),
    },
    {
      label: "Employee ID",
      value:
        meta?.employeeId || getApprovalLineValue(visibleLines, "Employee ID"),
    },
    {
      label: "Address",
      value: meta?.address || getApprovalLineValue(visibleLines, "Address"),
    },
    {
      label: "Website",
      value: meta?.website || getApprovalLineValue(visibleLines, "Website"),
    },
    {
      label: "Franchise ID",
      value: meta?.franchiseId,
    },
    {
      label: "User ID",
      value: meta?.userId,
    },
  ].filter((item) => hasApprovalValue(item.value));
}

function canDeleteRejectedFranchiseApproval(approval) {
  return (
    String(approval?.status || "").toLowerCase() === "rejected" &&
    String(approval?.request_type || "").toLowerCase() ===
      "franchise registration" &&
    Boolean(parseFranchiseApprovalMeta(approval?.notes || ""))
  );
}

function getPlayerApprovalContext(approval) {
  const notes = String(approval?.notes || "");
  const meta = parsePlayerApprovalMeta(notes);
  const visibleLines = getApprovalNotesWithoutMeta(notes)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const requestType = String(approval?.request_type || "").toLowerCase();
  const summaryLine = visibleLines.find((line) =>
    /^player registration submitted for\s+/i.test(line)
  );
  const playerNameMatch = summaryLine?.match(
    /^player registration submitted for\s+(.+?)(?:\.)?$/i
  );
  const isPlayerRegistration =
    requestType.includes("player registration") ||
    Boolean(meta) ||
    Boolean(summaryLine) ||
    visibleLines.some((line) =>
      /^(team|role|squad role|email|mobile|batting style|bowling style):/i.test(
        line
      )
    );

  if (!isPlayerRegistration) {
    return [];
  }

  return [
    {
      label: "Team",
      value: meta?.teamName || getApprovalLineValue(visibleLines, "Team"),
    },
    {
      label: "Player Name",
      value: meta?.playerName || playerNameMatch?.[1]?.trim() || "",
    },
    {
      label: "Role",
      value: meta?.role || getApprovalLineValue(visibleLines, "Role"),
    },
    {
      label: "Squad Role",
      value: meta?.squadRole || getApprovalLineValue(visibleLines, "Squad Role"),
    },
    {
      label: "Email ID",
      value: meta?.email || getApprovalLineValue(visibleLines, "Email"),
    },
    {
      label: "Mobile",
      value: meta?.mobile || getApprovalLineValue(visibleLines, "Mobile"),
    },
    {
      label: "Batting Style",
      value:
        meta?.battingStyle ||
        getApprovalLineValue(visibleLines, "Batting Style"),
    },
    {
      label: "Bowling Style",
      value:
        meta?.bowlingStyle ||
        getApprovalLineValue(visibleLines, "Bowling Style"),
    },
    {
      label: "Player ID",
      value: meta?.playerId,
    },
  ].filter((item) => hasApprovalValue(item.value));
}

function getApprovalContext(approval) {
  const franchiseContext = getFranchiseApprovalContext(approval);

  if (franchiseContext.length) {
    return franchiseContext;
  }

  return getPlayerApprovalContext(approval);
}

function getVisibleApprovalNotes(approval) {
  const notes =
    typeof approval === "string" ? approval : String(approval?.notes || "");
  const approvalContext =
    typeof approval === "string" ? [] : getApprovalContext(approval);

  return String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !APPROVAL_META_PREFIXES.some((prefix) => line.startsWith(prefix))
    )
    .filter((line) => {
      if (!approvalContext.length) {
        return true;
      }

      return !(
        /^player registration submitted for\s+.+/i.test(line) ||
        /^franchise registration submitted for\s+.+/i.test(line) ||
        /^(owner|email|employee id|address|website|team|role|squad role|mobile|batting style|bowling style):/i.test(
          line
        )
      );
    })
    .join("\n")
    .trim();
}

function isApprovalQueueItem(approval) {
  return ["Pending", "Escalated"].includes(String(approval?.status || ""));
}

const APPROVAL_SECTION_META = {
  all: {
    label: "All Approvals",
    description: "Entire approval queue",
    icon: <FaClipboardList />,
    accentClass:
      "border-slate-200 bg-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
    countClass: "text-slate-900",
    pillClass: "bg-slate-100 text-slate-600",
  },
  players: {
    label: "Players",
    description: "Registrations, medical, squad moves",
    icon: <FaUsers />,
    accentClass:
      "border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-[0_10px_30px_rgba(16,185,129,0.10)]",
    countClass: "text-emerald-600",
    pillClass: "bg-emerald-100 text-emerald-700",
  },
  teams: {
    label: "Teams",
    description: "Lineups, fixtures, team operations",
    icon: <FaClipboardList />,
    accentClass:
      "border-blue-200 bg-blue-50/80 text-blue-900 shadow-[0_10px_30px_rgba(59,130,246,0.10)]",
    countClass: "text-blue-600",
    pillClass: "bg-blue-100 text-blue-700",
  },
  franchises: {
    label: "Franchises",
    description: "Ownership, finance, franchise access",
    icon: <FaBuilding />,
    accentClass:
      "border-purple-200 bg-purple-50/80 text-purple-900 shadow-[0_10px_30px_rgba(147,51,234,0.10)]",
    countClass: "text-purple-600",
    pillClass: "bg-purple-100 text-purple-700",
  },
};

function getApprovalSectionKey(approval) {
  const requestType = String(approval?.request_type || "").toLowerCase();
  const subject = String(approval?.subject || "").toLowerCase();
  const notes = String(approval?.notes || "").toLowerCase();
  const combined = `${requestType} ${subject} ${notes}`;

  if (
    combined.includes("__spl_franchise_reg__") ||
    combined.includes("franchise")
  ) {
    return "franchises";
  }

  if (
    combined.includes("__spl_player_reg__") ||
    requestType.includes("player registration")
  ) {
    return "teams";
  }

  if (
    ["player", "medical", "squad", "transfer", "fitness"].some((keyword) =>
      combined.includes(keyword)
    )
  ) {
    return "players";
  }

  if (
    ["budget", "finance", "sponsor", "owner", "ownership"].some((keyword) =>
      combined.includes(keyword)
    )
  ) {
    return "franchises";
  }

  if (
    ["team", "match", "fixture", "lineup", "venue"].some((keyword) =>
      combined.includes(keyword)
    )
  ) {
    return "teams";
  }

  return "teams";
}

function ApprovalCategoryCard({
  sectionKey,
  queueCount,
  active,
  onClick,
}) {
  const meta = APPROVAL_SECTION_META[sectionKey];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-1 ${
        active
          ? `${meta.accentClass} ring-2 ring-offset-2 ${
              sectionKey === "players"
                ? "ring-emerald-300"
                : sectionKey === "teams"
                ? "ring-blue-300"
                : sectionKey === "franchises"
                ? "ring-purple-300"
                : "ring-slate-300"
            }`
          : "border-slate-200 bg-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${
                active ? meta.pillClass : "bg-slate-100 text-slate-500"
              }`}
            >
              {meta.icon}
            </span>
            <div>
              <p className="font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Approval Section
              </p>
              <h3 className="mt-1 text-lg font-semibold text-inherit">
                {meta.label}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">{meta.description}</p>
        </div>

        <div className="text-right">
          <p className={`font-heading text-4xl leading-none ${meta.countClass}`}>
            {queueCount}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            Open Requests
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
            active ? meta.countClass : "text-slate-500"
          }`}
        >
          {active ? "Showing approval list" : "Click to review"}
        </p>
      </div>
    </button>
  );
}

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingApprovalId, setDeletingApprovalId] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
  });
  const [activeSection, setActiveSection] = useState("all");
  const [listMode, setListMode] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [selectedApprovalTeamId, setSelectedApprovalTeamId] = useState(null);
  const [showSelectedTeamPlayers, setShowSelectedTeamPlayers] = useState(false);
  const approvalsListRef = useRef(null);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      setError("");
      const [approvalsResponse, teamsResponse, playersResponse] = await Promise.all([
        getApprovals(),
        getTeams(),
        getPlayers(),
      ]);
      setApprovals(Array.isArray(approvalsResponse) ? approvalsResponse : []);
      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
      setPlayers(Array.isArray(playersResponse) ? playersResponse : []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load approvals."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleFilterChange = (key, value) => {
    if (key === "status" && value !== "all") {
      setListMode("all");
    }

    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const approvalsWithSection = useMemo(
    () =>
      approvals.map((item) => ({
        ...item,
        approvalSection: getApprovalSectionKey(item),
      })),
    [approvals]
  );

  const selectedApprovalContext = useMemo(
    () => getApprovalContext(selectedApproval),
    [selectedApproval]
  );

  const selectedApprovalSectionKey = useMemo(
    () =>
      selectedApproval?.approvalSection || getApprovalSectionKey(selectedApproval),
    [selectedApproval]
  );

  const selectedApprovalTeams = useMemo(() => {
    if (!selectedApproval || selectedApprovalSectionKey !== "franchises") {
      return [];
    }

    const approvalMeta = parseFranchiseApprovalMeta(selectedApproval.notes);
    const franchiseId = String(
      approvalMeta?.franchiseId ||
        getApprovalContextValue(selectedApprovalContext, "Franchise ID") ||
        ""
    ).trim();

    if (!franchiseId) {
      return [];
    }

    return [...teams]
      .filter(
        (team) => String(team.franchise_id || "").trim() === franchiseId
      )
      .sort((left, right) =>
        String(left.team_name || "").localeCompare(String(right.team_name || ""))
      );
  }, [
    selectedApproval,
    selectedApprovalContext,
    selectedApprovalSectionKey,
    teams,
  ]);

  useEffect(() => {
    if (!selectedApprovalTeams.length) {
      setSelectedApprovalTeamId(null);
      setShowSelectedTeamPlayers(false);
      return;
    }

    const hasSelectedTeam = selectedApprovalTeams.some(
      (team) => String(team.id) === String(selectedApprovalTeamId)
    );

    if (!hasSelectedTeam) {
      setSelectedApprovalTeamId(selectedApprovalTeams[0].id);
      setShowSelectedTeamPlayers(false);
    }
  }, [selectedApprovalTeamId, selectedApprovalTeams]);

  const selectedApprovalActiveTeam = useMemo(
    () =>
      selectedApprovalTeams.find(
        (team) => String(team.id) === String(selectedApprovalTeamId)
      ) || null,
    [selectedApprovalTeamId, selectedApprovalTeams]
  );

  const selectedApprovalTeamPlayers = useMemo(() => {
    if (!selectedApprovalActiveTeam) {
      return [];
    }

    return [...players]
      .filter(
        (player) =>
          String(player.team_id || "") === String(selectedApprovalActiveTeam.id) ||
          String(player.team_name || "").toLowerCase() ===
            String(selectedApprovalActiveTeam.team_name || "").toLowerCase()
      )
      .sort((left, right) =>
        String(left.full_name || "").localeCompare(String(right.full_name || ""))
      );
  }, [players, selectedApprovalActiveTeam]);

  const sectionCards = useMemo(() => {
    return Object.keys(APPROVAL_SECTION_META).map((sectionKey) => {
      const sectionRecords =
        sectionKey === "all"
          ? approvalsWithSection
          : approvalsWithSection.filter(
              (item) => item.approvalSection === sectionKey
            );

      return {
        sectionKey,
        queueCount: sectionRecords.filter(
          (item) => item.status === "Pending" || item.status === "Escalated"
        ).length,
      };
    });
  }, [approvalsWithSection]);

  const filteredApprovals = useMemo(() => {
    return approvalsWithSection.filter((item) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        [item.request_type, item.requested_by, item.subject, String(item.id)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesStatus =
        filters.status === "all" || item.status === filters.status;
      const matchesPriority =
        filters.priority === "all" || item.priority === filters.priority;
      const matchesSection =
        activeSection === "all" || item.approvalSection === activeSection;
      const matchesListMode =
        listMode !== "queue" || isApprovalQueueItem(item);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesSection &&
        matchesListMode
      );
    });
  }, [activeSection, approvalsWithSection, filters, listMode]);

  const summaryCards = useMemo(() => {
    const pending = approvals.filter((item) => item.status === "Pending").length;
    const approved = approvals.filter((item) => item.status === "Approved").length;
    const rejected = approvals.filter((item) => item.status === "Rejected").length;
    const escalated = approvals.filter((item) => item.status === "Escalated").length;

    return [
      {
        label: "Pending Approvals",
        status: "Pending",
        value: String(pending),
        subtext: "Need admin action",
        color: "red",
        icon: "Pending",
      },
      {
        label: "Approved",
        status: "Approved",
        value: String(approved),
        subtext: "Synced to the backend",
        color: "green",
        icon: "Approved",
      },
      {
        label: "Rejected",
        status: "Rejected",
        value: String(rejected),
        subtext: "Needs requester follow-up",
        color: "orange",
        icon: "Rejected",
      },
      {
        label: "Escalated",
        status: "Escalated",
        value: String(escalated),
        subtext: "High-priority review queue",
        color: "purple",
        icon: "Escalated",
      },
    ];
  }, [approvals]);

  const urgentApprovals = useMemo(
    () =>
      filteredApprovals.filter(
        (item) =>
          item.priority === "High" &&
          ["Pending", "Escalated"].includes(item.status)
      ),
    [filteredApprovals]
  );

  const activeSectionMeta = APPROVAL_SECTION_META[activeSection];

  const handleViewTeam = (team) => {
    if (!team?.id) {
      return;
    }

    if (String(selectedApprovalTeamId || "") !== String(team.id)) {
      setShowSelectedTeamPlayers(false);
    }

    setSelectedApprovalTeamId(team.id);
  };

  const handleViewTeamPlayers = () => {
    if (!selectedApprovalActiveTeam) {
      return;
    }

    setShowSelectedTeamPlayers((current) => !current);
  };

  const handleSectionOpen = (sectionKey) => {
    setActiveSection(sectionKey);
    setListMode("queue");
    setFilters((prev) => ({
      ...prev,
      search: "",
      status: "all",
      priority: "all",
    }));

    window.requestAnimationFrame(() => {
      approvalsListRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSummaryOpen = (status) => {
    setActiveSection("all");
    setListMode("all");
    setFilters({
      search: "",
      status,
      priority: "all",
    });

    const matchingApprovals = approvalsWithSection.filter(
      (item) => item.status === status
    );
    setSelectedApproval(matchingApprovals.length === 1 ? matchingApprovals[0] : null);
    setSelectedApprovalTeamId(null);
    setShowSelectedTeamPlayers(false);

    window.requestAnimationFrame(() => {
      approvalsListRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleStatusUpdate = async (approval, status) => {
    try {
      setSaving(true);
      setError("");
      const updatedApproval = await patchApproval(approval.id, { status });
      setApprovals((prev) =>
        prev.map((item) =>
          String(item.id) === String(updatedApproval.id) ? updatedApproval : item
        )
      );
      if (selectedApproval && String(selectedApproval.id) === String(approval.id)) {
        setSelectedApproval(updatedApproval);
      }
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to update approval status.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRejectedFranchise = async (approval) => {
    if (!canDeleteRejectedFranchiseApproval(approval)) {
      return;
    }

    const franchiseName =
      getApprovalContextValue(getFranchiseApprovalContext(approval), "Franchise Name") ||
      approval.requested_by ||
      "this franchise";

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete ${franchiseName}? This removes the rejected franchise registration, linked franchise admin account, and approval row.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setDeletingApprovalId(approval.id);
      setError("");
      await deleteRejectedFranchiseApproval(approval.id);
      setApprovals((prev) =>
        prev.filter((item) => String(item.id) !== String(approval.id))
      );
      if (selectedApproval && String(selectedApproval.id) === String(approval.id)) {
        setSelectedApproval(null);
        setSelectedApprovalTeamId(null);
        setShowSelectedTeamPlayers(false);
      }
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to delete this rejected franchise registration."
        )
      );
    } finally {
      setSaving(false);
      setDeletingApprovalId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "spl-approvals.csv",
      filteredApprovals.map((item) => ({
        ApprovalID: item.id,
        RequestType: item.request_type,
        RequestedBy: item.requested_by,
        Subject: item.subject,
        Date: item.date,
        Priority: item.priority,
        Status: item.status,
        Notes: getVisibleApprovalNotes(item),
      }))
    );
  };

  const columns = [
    { key: "id", label: "Approval ID" },
    { key: "request_type", label: "Request Type" },
    { key: "requested_by", label: "Requested By" },
    { key: "subject", label: "Subject" },
    { key: "date", label: "Date" },
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <Badge label={row.priority} color={getPriorityBadgeColor(row.priority)} />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} color={getStatusBadgeColor(row.status)} />
      ),
    },
    {
      key: "approvalSection",
      label: "Section",
      render: (row) => {
        const meta = APPROVAL_SECTION_META[row.approvalSection] || APPROVAL_SECTION_META.all;
        const badgeColorMap = {
          players: "green",
          teams: "blue",
          franchises: "purple",
          all: "slate",
        };

        return (
          <Badge
            label={meta.label}
            color={badgeColorMap[row.approvalSection] || "slate"}
          />
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedApproval(row)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
          >
            <FaEye size={12} />
            View
          </button>

          {row.status !== "Approved" ? (
            <button
              type="button"
              onClick={() => handleStatusUpdate(row, "Approved")}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-200 disabled:opacity-70"
            >
              <FaCheck size={12} />
              Approve
            </button>
          ) : null}

          {row.status !== "Rejected" ? (
            <button
              type="button"
              onClick={() => handleStatusUpdate(row, "Rejected")}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-200 disabled:opacity-70"
            >
              <FaTimes size={12} />
              Reject
            </button>
          ) : null}

          {canDeleteRejectedFranchiseApproval(row) ? (
            <button
              type="button"
              onClick={() => handleDeleteRejectedFranchise(row)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-70"
            >
              <FaTrash size={12} />
              {String(deletingApprovalId) === String(row.id)
                ? "Deleting..."
                : "Delete"}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 bg-white">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <ApprovalStatCard
            key={item.label}
            label={item.label}
            value={item.value}
            subtext={item.subtext}
            color={item.color}
            icon={item.icon}
            active={filters.status === item.status}
            onClick={() => handleSummaryOpen(item.status)}
          />
        ))}
      </section>

      <FilterBar
        filters={[
          {
            key: "search",
            label: "Search Approval",
            type: "text",
            value: filters.search,
            placeholder: "Search by id, request, requester, or subject",
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: [
              { label: "All Status", value: "all" },
              { label: "Pending", value: "Pending" },
              { label: "Approved", value: "Approved" },
              { label: "Rejected", value: "Rejected" },
              { label: "Escalated", value: "Escalated" },
            ],
          },
          {
            key: "priority",
            label: "Priority",
            type: "select",
            value: filters.priority,
            options: [
              { label: "All Priority", value: "all" },
              { label: "High", value: "High" },
              { label: "Medium", value: "Medium" },
              { label: "Low", value: "Low" },
            ],
          },
        ]}
        onChange={handleFilterChange}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {sectionCards.map((item) => (
          <ApprovalCategoryCard
            key={item.sectionKey}
            sectionKey={item.sectionKey}
            queueCount={item.queueCount}
            active={activeSection === item.sectionKey}
            onClick={() => handleSectionOpen(item.sectionKey)}
          />
        ))}
      </section>

      <div ref={approvalsListRef}>
      <DashboardPanel
        title={`${activeSectionMeta.label} ${
          listMode === "queue" ? "New Requests" : "Approval List"
        }`}
        bodyClassName="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="space-y-1 text-sm text-slate-500">
            <div>
              Total results:{" "}
              <span className="font-semibold text-slate-900">
                {filteredApprovals.length}
              </span>
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Active section:{" "}
              <span className="font-semibold text-slate-700">
                {activeSectionMeta.label}
              </span>
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
              View mode:{" "}
              <span className="font-semibold text-slate-700">
                {listMode === "queue"
                  ? "New requests only"
                  : "Full approval history"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setListMode((prev) => (prev === "queue" ? "all" : "queue"))
              }
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {listMode === "queue" ? "Show Full History" : "Show New Requests"}
            </button>
            <ExportButton label="Export Approvals" onClick={handleExport} />
          </div>
        </div>

        {listMode === "queue" ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Showing only new approvals in this section: pending and escalated
            requests that still need review.
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading approvals...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredApprovals}
            rowKey="id"
            emptyMessage={
              listMode === "queue"
                ? `No new ${activeSectionMeta.label.toLowerCase()} requests are waiting right now.`
                : `No ${activeSectionMeta.label.toLowerCase()} approvals match the selected filters.`
            }
          />
        )}
      </DashboardPanel>
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel title="Urgent Pending Approvals">
          <div className="space-y-3">
            {urgentApprovals.length === 0 ? (
              <p className="text-sm text-slate-500">
                No urgent approvals are waiting right now.
              </p>
            ) : (
              urgentApprovals.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.subject}
                    </p>
                    <Badge label={item.priority} color="red" />
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {item.requested_by} | {item.date}
                  </p>
                </div>
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Approval Notes">
          <div className="space-y-3">
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <p className="text-sm font-semibold text-purple-600">
                Pending registration approvals
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {
                  approvals.filter((item) => item.status === "Pending").length
                } pending requests are still waiting for a final decision.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-600">
                Approved requests are synced
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {
                  approvals.filter((item) => item.status === "Approved").length
                } requests are already approved in the backend.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-700">
                Escalation watch
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {
                  approvals.filter((item) => item.status === "Escalated").length
                } escalated requests should be reviewed before the next matchday.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </section>

      {selectedApproval ? (
        <ManagementModal
          title="APPROVAL DETAILS"
          onClose={() => {
            setSelectedApproval(null);
            setSelectedApprovalTeamId(null);
            setShowSelectedTeamPlayers(false);
          }}
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Approval ID</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedApproval.id}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedApproval.date}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Request Type</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedApproval.request_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Section</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {
                    APPROVAL_SECTION_META[
                      selectedApproval.approvalSection ||
                        getApprovalSectionKey(selectedApproval)
                    ]?.label
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Requested By</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedApproval.requested_by}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Subject</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {selectedApproval.subject}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge
                label={selectedApproval.priority}
                color={getPriorityBadgeColor(selectedApproval.priority)}
              />
              <Badge
                label={selectedApproval.status}
                color={getStatusBadgeColor(selectedApproval.status)}
              />
            </div>

            {selectedApprovalSectionKey === "franchises" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <div>
                    <p className="text-sm text-slate-500">Teams</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedApprovalTeams.length ? (
                        <>
                          {selectedApprovalTeams.map((team) => (
                            <button
                              type="button"
                              key={team.id}
                              onClick={() => handleViewTeam(team)}
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                String(selectedApprovalActiveTeam?.id || "") ===
                                String(team.id)
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-blue-200 bg-blue-100 text-blue-700 hover:border-blue-300 hover:bg-blue-200"
                              }`}
                            >
                              {team.team_name}
                            </button>
                          ))}
                          {selectedApprovalActiveTeam ? (
                            <button
                              type="button"
                              onClick={handleViewTeamPlayers}
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                showSelectedTeamPlayers
                                  ? "border-emerald-500 bg-emerald-600 text-white"
                                  : "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-200"
                              }`}
                            >
                              Players
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No teams linked to this franchise yet.
                        </p>
                      )}
                    </div>

                    {selectedApprovalActiveTeam && showSelectedTeamPlayers ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-slate-500">Players</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {selectedApprovalActiveTeam.team_name}
                            </p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            {selectedApprovalTeamPlayers.length} Players
                          </p>
                        </div>

                        <div className="mt-3 space-y-2">
                          {selectedApprovalTeamPlayers.length ? (
                            selectedApprovalTeamPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {player.full_name || "Unnamed Player"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {[player.role, player.squad_role]
                                      .filter(Boolean)
                                      .join(" | ") || "Player"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">
                                    {player.email || "No email"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {player.mobile || "No mobile"}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-600">
                              No players found for this team yet.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : selectedApprovalActiveTeam ? (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm text-slate-600">
                          Click <span className="font-semibold text-slate-900">Players</span> to
                          view the squad list for {selectedApprovalActiveTeam.team_name}.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedApprovalContext.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Context</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {selectedApprovalContext.map((item) => (
                    <div key={item.label}>
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Notes</p>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                {getVisibleApprovalNotes(selectedApproval) ||
                  "No additional notes available."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedApproval.status !== "Approved" ? (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApproval, "Approved")}
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                >
                  Approve
                </button>
              ) : null}

              {selectedApproval.status !== "Rejected" ? (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedApproval, "Rejected")}
                  disabled={saving}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-70"
                >
                  Reject
                </button>
              ) : null}

              {canDeleteRejectedFranchiseApproval(selectedApproval) ? (
                <button
                  type="button"
                  onClick={() => handleDeleteRejectedFranchise(selectedApproval)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-70"
                >
                  <FaTrash size={12} />
                  {String(deletingApprovalId) === String(selectedApproval.id)
                    ? "Deleting..."
                    : "Delete Franchise"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedApproval(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </ManagementModal>
      ) : null}
    </div>
  );
}
