import axiosInstance from "./axiosConfig";

const ADMIN_SEARCH_FALLBACK_RESOURCES = [
  {
    key: "players",
    label: "Players",
    path: "/admin/players",
    endpoint: "/api/players/",
    buildTitle: (record) => record.full_name,
    buildSubtitle: (record) =>
      [record.team_name, record.role].filter(Boolean).join(" | "),
    buildMeta: (record) => record.status || "Player",
  },
  {
    key: "performances",
    label: "Performances",
    path: "/admin/analytics",
    endpoint: "/api/performances/",
    buildTitle: (record) => record.player_name,
    buildSubtitle: (record) =>
      [
        record.team_name,
        record.matches != null ? `${record.matches} matches` : "",
        record.runs != null ? `${record.runs} runs` : "",
        record.wickets != null ? `${record.wickets} wickets` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    buildMeta: () => "Performance",
  },
  {
    key: "teams",
    label: "Teams",
    path: "/admin/teams",
    endpoint: "/api/teams/",
    buildTitle: (record) => record.team_name,
    buildSubtitle: (record) =>
      [record.city, record.coach || record.owner].filter(Boolean).join(" | "),
    buildMeta: (record) => record.status || "Team",
  },
  {
    key: "franchises",
    label: "Franchises",
    path: "/admin/franchises",
    endpoint: "/api/franchises/",
    buildTitle: (record) => record.company_name,
    buildSubtitle: (record) =>
      [record.owner_name, record.website].filter(Boolean).join(" | "),
    buildMeta: () => "Franchise",
  },
  {
    key: "matches",
    label: "Matches",
    path: "/admin/matches",
    endpoint: "/api/matches/",
    buildTitle: (record) => `${record.teamA} vs ${record.teamB}`,
    buildSubtitle: (record) =>
      [record.date, record.venue].filter(Boolean).join(" | "),
    buildMeta: (record) => record.status || "Match",
  },
  {
    key: "venues",
    label: "Venues",
    path: "/admin/matches",
    endpoint: "/api/venues/",
    buildTitle: (record) => record.ground_name,
    buildSubtitle: (record) =>
      [record.city, record.location, record.contact_person]
        .filter(Boolean)
        .join(" | "),
    buildMeta: () => "Venue",
  },
  {
    key: "approvals",
    label: "Approvals",
    path: "/admin/approvals",
    endpoint: "/api/approvals/",
    buildTitle: (record) => record.subject,
    buildSubtitle: (record) =>
      [record.requested_by, record.priority, record.status]
        .filter(Boolean)
        .join(" | "),
    buildMeta: (record) => record.request_type || "Approval",
  },
  {
    key: "invoices",
    label: "Invoices",
    path: "/admin/finance",
    endpoint: "/api/invoices/",
    buildTitle: (record) => record.invoice_code,
    buildSubtitle: (record) =>
      [record.party, record.category, record.status]
        .filter(Boolean)
        .join(" | "),
    buildMeta: (record) => record.flow || "Invoice",
  },
];

function shouldUseFallbackSearch(error) {
  const detail = String(error?.response?.data?.detail || "").toLowerCase();
  const status = Number(error?.response?.status || 0);

  return (
    status === 404 &&
    (detail.includes("api resource not found") ||
      detail.includes("route not found") ||
      detail.includes("admin search"))
  );
}

async function searchAdminRecordsFallback(query, limit) {
  const responses = await Promise.all(
    ADMIN_SEARCH_FALLBACK_RESOURCES.map(async (resource) => {
      const response = await axiosInstance.get(resource.endpoint, {
        params: {
          search: query,
          limit,
        },
      });

      const items = Array.isArray(response.data) ? response.data : [];

      if (items.length === 0) {
        return null;
      }

      return {
        key: resource.key,
        label: resource.label,
        items: items.map((record) => ({
          id: record.id,
          title: resource.buildTitle(record),
          subtitle: resource.buildSubtitle(record),
          meta: resource.buildMeta(record),
          path: resource.path,
        })),
      };
    })
  );

  const groups = responses.filter(Boolean);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return {
    query,
    total,
    groups,
  };
}

export async function searchAdminRecords(query, limit = 20) {
  try {
    const response = await axiosInstance.get("/api/admin/search/", {
      params: {
        q: query,
        limit,
      },
    });

    return response.data;
  } catch (error) {
    if (shouldUseFallbackSearch(error)) {
      return searchAdminRecordsFallback(query, limit);
    }

    throw error;
  }
}
