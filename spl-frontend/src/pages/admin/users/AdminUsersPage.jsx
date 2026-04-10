import { useEffect, useMemo, useState } from "react";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DataTable from "../../../components/dashboard/DataTable";
import FilterBar from "../../../components/dashboard/FilterBar";
import ManagementModal from "../../../components/dashboard/ManagementModal";
import StatCard from "../../../components/dashboard/StatCard";
import Badge from "../../../components/common/Badge";
import { roleOptions } from "../../../components/auth/roleOptions";
import { getFranchises } from "../../../api/franchiseAPI";
import {
  getAdminUsers,
  updateAdminUserAccess,
} from "../../../api/adminUsersAPI";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import { getAuthUser } from "../../../utils/authStorage";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "Pending", label: "Pending" },
  { value: "Suspended", label: "Suspended" },
  { value: "Inactive", label: "Inactive" },
];

const roleFilterOptions = [
  { value: "", label: "All roles" },
  ...roleOptions.map((role) => ({
    value: role.value,
    label: role.title,
  })),
];

function normalizeUsersResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function normalizeFranchisesResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function getRoleMeta(role) {
  const nextRole = roleOptions.find((item) => item.value === role);
  return nextRole || { title: role || "Unknown", icon: "UR" };
}

function getRoleBadgeColor(role) {
  switch (role) {
    case "super_admin":
      return "purple";
    case "ops_manager":
      return "blue";
    case "franchise_admin":
      return "orange";
    case "scorer":
      return "green";
    case "finance_admin":
      return "gold";
    default:
      return "slate";
  }
}

function getStatusBadgeColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "green";
    case "pending":
      return "orange";
    case "suspended":
      return "red";
    case "inactive":
      return "slate";
    default:
      return "slate";
  }
}

function getInitials(name = "") {
  const tokens = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "U";
  }

  return tokens.map((token) => token[0]?.toUpperCase() || "").join("");
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString();
}

function normalizeUserRow(user = {}, franchiseMap = new Map()) {
  const franchiseId = user.franchiseId ?? user.franchise_id ?? null;
  const franchise = franchiseMap.get(String(franchiseId));

  return {
    ...user,
    franchiseId,
    franchiseName:
      user.franchiseName ||
      user.franchise_name ||
      franchise?.company_name ||
      "",
    franchiseLogo:
      user.franchiseLogo || user.franchise_logo || franchise?.logo || "",
    franchiseStatus:
      user.franchiseStatus ||
      user.franchise_status ||
      franchise?.status ||
      "",
  };
}

export default function AdminUsersPage() {
  const currentUser = getAuthUser();
  const [users, setUsers] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [draft, setDraft] = useState({
    role: "",
    status: "Active",
    franchiseId: "",
  });

  const franchiseMap = useMemo(
    () =>
      new Map(
        franchises.map((franchise) => [
          String(franchise.id ?? franchise.franchiseId ?? ""),
          franchise,
        ])
      ),
    [franchises]
  );

  const normalizedUsers = useMemo(
    () => users.map((user) => normalizeUserRow(user, franchiseMap)),
    [users, franchiseMap]
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();

    return normalizedUsers.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        [user.fullName, user.email, user.employeeId, user.role, user.franchiseName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus =
        !statusFilter || String(user.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesFranchise =
        !selectedFranchiseFilter ||
        String(user.franchiseId ?? "") === String(selectedFranchiseFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesFranchise;
    });
  }, [normalizedUsers, roleFilter, search, selectedFranchiseFilter, statusFilter]);

  const summaryStats = useMemo(() => {
    const activeCount = normalizedUsers.filter(
      (user) => String(user.status || "").toLowerCase() === "active"
    ).length;
    const superAdminCount = normalizedUsers.filter(
      (user) => String(user.role || "").toLowerCase() === "super_admin"
    ).length;
    const franchiseAdminCount = normalizedUsers.filter(
      (user) => String(user.role || "").toLowerCase() === "franchise_admin"
    ).length;

    return [
      {
        label: "Total Users",
        value: normalizedUsers.length,
        subtext: "All authenticated league accounts",
        color: "blue",
        icon: "US",
      },
      {
        label: "Active Users",
        value: activeCount,
        subtext: "Currently active accounts",
        color: "green",
        icon: "AC",
      },
      {
        label: "Super Admins",
        value: superAdminCount,
        subtext: "Can manage every role",
        color: "purple",
        icon: "SA",
      },
      {
        label: "Franchise Admins",
        value: franchiseAdminCount,
        subtext: "Assigned franchise access",
        color: "gold",
        icon: "FR",
      },
    ];
  }, [normalizedUsers]);

  const franchiseOptions = useMemo(
    () => [
      { value: "", label: "Select franchise" },
      ...franchises.map((franchise) => ({
        value: String(franchise.id),
        label: franchise.company_name || franchise.companyName || `Franchise ${franchise.id}`,
      })),
    ],
    [franchises]
  );

  const loadUsers = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      setSuccessMessage("");

      const [usersResponse, franchisesResponse] = await Promise.all([
        getAdminUsers(),
        getFranchises(),
      ]);

      setUsers(normalizeUsersResponse(usersResponse));
      setFranchises(normalizeFranchisesResponse(franchisesResponse));
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load admin users and role assignments."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openEditor = (user) => {
    setEditingUser(user);
    setDraft({
      role: user.role || "fan_user",
      status: user.status || "Active",
      franchiseId: user.franchiseId ? String(user.franchiseId) : "",
    });
    setError("");
    setSuccessMessage("");
  };

  const closeEditor = () => {
    setEditingUser(null);
    setDraft({
      role: "",
      status: "Active",
      franchiseId: "",
    });
  };

  const handleDraftChange = (key, value) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "role" && value !== "franchise_admin"
        ? { franchiseId: "" }
        : {}),
    }));
  };

  const saveUser = async () => {
    if (!editingUser) {
      return;
    }

    if (editingUser.id === currentUser?.id) {
      setError("You cannot change your own role or status from this screen.");
      return;
    }

    if (draft.role === "franchise_admin" && !draft.franchiseId) {
      setError("Please select a franchise for the franchise admin role.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await updateAdminUserAccess(editingUser.id, {
        role: draft.role,
        status: draft.status,
        franchiseId:
          draft.role === "franchise_admin" ? Number(draft.franchiseId) : null,
      });

      const updatedUser = normalizeUserRow(
        response?.item || response?.user || response,
        franchiseMap
      );

      setUsers((current) =>
        current.map((user) =>
          String(user.id) === String(updatedUser.id) ? updatedUser : user
        )
      );
      setSuccessMessage(
        `${updatedUser.fullName || "User"} access updated successfully.`
      );
      closeEditor();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to update the selected user's role."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "user",
        label: "User",
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold uppercase text-slate-600">
              {getInitials(row.fullName)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{row.fullName}</p>
              <p className="text-xs text-slate-500">{row.employeeId || "No employee ID"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "email",
        label: "Email",
        render: (row) => <span className="text-slate-700">{row.email}</span>,
      },
      {
        key: "role",
        label: "Role",
        render: (row) => {
          const meta = getRoleMeta(row.role);
          return (
            <Badge label={meta.title} color={getRoleBadgeColor(row.role)} />
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <Badge
            label={row.status || "Unknown"}
            color={getStatusBadgeColor(row.status)}
          />
        ),
      },
      {
        key: "franchise",
        label: "Franchise",
        render: (row) => (
          <div className="min-w-[180px]">
            <p className="font-medium text-slate-800">
              {row.franchiseName || "Unassigned"}
            </p>
            <p className="text-xs text-slate-500">
              {row.role === "franchise_admin"
                ? "Role-linked franchise access"
                : row.franchiseId
                ? "Linked for this account"
                : "No franchise assigned"}
            </p>
          </div>
        ),
      },
      {
        key: "createdAt",
        label: "Joined",
        render: (row) => (
          <span className="text-slate-600">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => {
          const isSelf = String(row.id) === String(currentUser?.id);
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSelf}
                onClick={() => openEditor(row)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isSelf
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15"
                }`}
              >
                {isSelf ? "Self" : "Edit"}
              </button>
            </div>
          );
        },
      },
    ],
    [currentUser?.id]
  );

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            subtext={card.subtext}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      <FilterBar
        filters={[
          {
            key: "search",
            label: "Search users",
            type: "text",
            value: search,
            placeholder: "Search by name, email or employee ID",
          },
          {
            key: "role",
            label: "Role",
            type: "select",
            value: roleFilter,
            options: roleFilterOptions,
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: statusFilter,
            options: statusOptions,
          },
          {
            key: "franchise",
            label: "Franchise",
            type: "select",
            value: selectedFranchiseFilter,
            options: [
              { value: "", label: "All franchises" },
              ...franchiseOptions.slice(1),
            ],
          },
        ]}
        onChange={(key, value) => {
          if (key === "search") {
            setSearch(value);
          }
          if (key === "role") {
            setRoleFilter(value);
          }
          if (key === "status") {
            setStatusFilter(value);
          }
          if (key === "franchise") {
            setSelectedFranchiseFilter(value);
          }
        }}
      />

      <DashboardPanel
        title={`Users & Roles (${filteredUsers.length})`}
        actionLabel={refreshing ? "Refreshing..." : "Refresh"}
        onAction={() => loadUsers({ silent: true })}
      >
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading users and role assignments...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            rowKey="id"
            emptyMessage="No users matched the current filters."
            scrollClassName="pb-1"
          />
        )}
      </DashboardPanel>

      {editingUser ? (
        <ManagementModal
          title="Edit User Access"
          maxWidthClass="max-w-3xl"
          onClose={closeEditor}
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Full name
                </span>
                <input
                  type="text"
                  value={editingUser.fullName || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Email
                </span>
                <input
                  type="text"
                  value={editingUser.email || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Role
                </span>
                <select
                  value={draft.role}
                  onChange={(event) =>
                    handleDraftChange("role", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    handleDraftChange("status", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                >
                  {statusOptions
                    .filter((option) => option.value)
                    .map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {draft.role === "franchise_admin" ? (
              <label className="block">
                <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Franchise assignment
                </span>
                <select
                  value={draft.franchiseId}
                  onChange={(event) =>
                    handleDraftChange("franchiseId", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                >
                  {franchiseOptions.map((franchise) => (
                    <option key={franchise.value || "none"} value={franchise.value}>
                      {franchise.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Only the super admin can change role, status, or franchise access.
              {editingUser.id === currentUser?.id
                ? " This is your own account, so role changes are blocked."
                : ""}
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveUser}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </ManagementModal>
      ) : null}
    </div>
  );
}
