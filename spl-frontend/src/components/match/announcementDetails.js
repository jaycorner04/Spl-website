function normalizeDetailRow(row, index) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const label = String(row.label || "").trim();
  const value = String(row.value || "").trim();

  if (!label || !value) {
    return null;
  }

  return {
    key: `${label}-${index}`,
    label,
    value,
  };
}

function getAnnouncementTeams(item) {
  const title = String(item?.title || "").trim();

  if (!title) {
    return [];
  }

  const fixtureMatch = title.match(/^(.+?)\s+vs\s+(.+)$/i);

  if (fixtureMatch) {
    return [
      { label: "Team 1", value: fixtureMatch[1].trim() },
      { label: "Team 2", value: fixtureMatch[2].trim() },
    ];
  }

  const resultMatch = title.match(/^(.+?)\s+beat\s+(.+)$/i);

  if (resultMatch) {
    return [
      { label: "Winner", value: resultMatch[1].trim() },
      { label: "Opponent", value: resultMatch[2].trim() },
    ];
  }

  return [];
}

function getFallbackDetailRows(item) {
  const label = String(item?.label || "").trim();
  const isCompleted = /completed/i.test(label);
  const rows = [
    { label: "Category", value: label || "Match Update" },
    ...getAnnouncementTeams(item),
  ];

  if (item?.detail) {
    rows.push({
      label: isCompleted ? "Result" : "Schedule",
      value: String(item.detail).trim(),
    });
  }

  if (item?.meta) {
    rows.push({
      label: isCompleted ? "Match Snapshot" : "Venue",
      value: String(item.meta).trim(),
    });
  }

  return rows;
}

export function getAnnouncementItemKey(item, index) {
  return `${String(item?.label || "announcement").trim()}-${String(
    item?.title || index
  ).trim()}-${index}`;
}

export function getAnnouncementDetailRows(item) {
  const explicitRows = Array.isArray(item?.matchDetails)
    ? item.matchDetails
        .map((row, index) => normalizeDetailRow(row, index))
        .filter(Boolean)
    : [];

  if (explicitRows.length > 0) {
    return explicitRows;
  }

  return getFallbackDetailRows(item)
    .map((row, index) => normalizeDetailRow(row, index))
    .filter(Boolean);
}
