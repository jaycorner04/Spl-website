import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaExclamationTriangle,
  FaEye,
  FaCheck,
  FaTimes,
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
import { getApprovals, patchApproval } from "../../api/approvalsAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { downloadCsv } from "../../utils/downloadCsv";

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

function ApprovalStatCard({ label, value, subtext, color, icon }) {
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
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] ${topBorderMap[color]}`}
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
        </div>

        <span className="text-2xl text-slate-400">{getApprovalIcon(icon)}</span>
      </div>
    </div>
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

function getVisibleApprovalNotes(notes = "") {
  return String(notes || "")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("__SPL_FRANCHISE_REG__"))
    .join("\n")
    .trim();
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
  count,
  pendingCount,
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
            {count}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            Requests
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
            active ? meta.countClass : "text-slate-500"
          }`}
        >
          {active ? "Showing approval list" : "Click to review"}
        </p>
        <p className="text-xs text-slate-500">
          Pending: <span className="font-semibold text-slate-900">{pendingCount}</span>
        </p>
      </div>
    </button>
  );
}

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
  });
  const [activeSection, setActiveSection] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState(null);
  const approvalsListRef = useRef(null);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getApprovals();
      setApprovals(Array.isArray(response) ? response : []);
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
        count: sectionRecords.length,
        pendingCount: sectionRecords.filter(
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

      return (
        matchesSearch && matchesStatus && matchesPriority && matchesSection
      );
    });
  }, [activeSection, approvalsWithSection, filters]);

  const summaryCards = useMemo(() => {
    const pending = approvals.filter((item) => item.status === "Pending").length;
    const approved = approvals.filter((item) => item.status === "Approved").length;
    const rejected = approvals.filter((item) => item.status === "Rejected").length;
    const escalated = approvals.filter((item) => item.status === "Escalated").length;

    return [
      {
        label: "Pending Approvals",
        value: String(pending),
        subtext: "Need admin action",
        color: "red",
        icon: "Pending",
      },
      {
        label: "Approved",
        value: String(approved),
        subtext: "Synced to the backend",
        color: "green",
        icon: "Approved",
      },
      {
        label: "Rejected",
        value: String(rejected),
        subtext: "Needs requester follow-up",
        color: "orange",
        icon: "Rejected",
      },
      {
        label: "Escalated",
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

  const handleSectionOpen = (sectionKey) => {
    setActiveSection(sectionKey);

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
        Notes: getVisibleApprovalNotes(item.notes),
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
            count={item.count}
            pendingCount={item.pendingCount}
            active={activeSection === item.sectionKey}
            onClick={() => handleSectionOpen(item.sectionKey)}
          />
        ))}
      </section>

      <div ref={approvalsListRef}>
      <DashboardPanel
        title={`${activeSectionMeta.label} Approval List`}
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
          </div>

          <div className="flex gap-3">
            <ExportButton label="Export Approvals" onClick={handleExport} />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading approvals...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredApprovals}
            rowKey="id"
            emptyMessage={`No ${activeSectionMeta.label.toLowerCase()} approvals match the selected filters.`}
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
          onClose={() => setSelectedApproval(null)}
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Notes</p>
              <p className="mt-2 text-sm text-slate-700">
                {getVisibleApprovalNotes(selectedApproval.notes) ||
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
