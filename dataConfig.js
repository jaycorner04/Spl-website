const RESOURCE_CONFIG = {
  teams: {
    fileName: "teams.json",
    searchFields: [
      "team_name",
      "city",
      "owner",
      "coach",
      "vice_coach",
      "venue",
      "status",
    ],
    filters: [
      {
        query: "franchiseId",
        apply: (records, value) =>
          records.filter(
            (record) => String(record.franchise_id) === String(value)
          ),
      },
    ],
    fields: {
      team_name: { type: "string", required: true },
      city: { type: "string" },
      owner: { type: "string" },
      coach: { type: "string" },
      vice_coach: { type: "string" },
      primary_color: { type: "string" },
      logo: { type: "string" },
      venue: { type: "string" },
      franchise_id: { type: "number" },
      status: { type: "string" },
      budget_left: { type: "number" },
    },
    onCreate: (record) => {
      if (!record.status) {
        record.status = "Active";
      }

      if (record.budget_left == null) {
        record.budget_left = 0;
      }
    },
  },
  players: {
    fileName: "players.json",
    searchFields: [
      "full_name",
      "team_name",
      "role",
      "squad_role",
      "batting_style",
      "bowling_style",
      "email",
      "mobile",
      "status",
    ],
    filters: [
      {
        query: "teamId",
        apply: (records, value) =>
          records.filter((record) => String(record.team_id) === String(value)),
      },
      {
        query: "role",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.role || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
      {
        query: "squadRole",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.squad_role || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
    ],
    fields: {
      full_name: { type: "string", required: true },
      role: { type: "string" },
      squad_role: {
        type: "string",
        allowedValues: ["Playing XI", "Reserve"],
      },
      team_id: { type: "number" },
      team_name: { type: "string" },
      batting_style: { type: "string" },
      bowling_style: { type: "string" },
      photo: { type: "string" },
      created_at: { type: "string" },
      date_of_birth: { type: "string" },
      mobile: { type: "string" },
      email: { type: "string" },
      status: { type: "string" },
      salary: { type: "number" },
    },
    onCreate: (record) => {
      if (!record.created_at) {
        record.created_at = new Date().toISOString();
      }

      if (!record.status) {
        record.status = "Active";
      }

      if (!record.squad_role) {
        record.squad_role = "Reserve";
      }

      if (record.salary == null) {
        record.salary = 0;
      }
    },
  },
  performances: {
    fileName: "performances.json",
    searchFields: ["player_name", "team_name", "best_bowling", "updated_at"],
    filters: [
      {
        query: "playerId",
        apply: (records, value) =>
          records.filter(
            (record) => String(record.player_id) === String(value)
          ),
      },
      {
        query: "teamId",
        apply: (records, value) =>
          records.filter((record) => String(record.team_id) === String(value)),
      },
    ],
    fields: {
      player_id: { type: "number", required: true },
      player_name: { type: "string" },
      team_id: { type: "number" },
      team_name: { type: "string" },
      matches: { type: "number" },
      runs: { type: "number" },
      wickets: { type: "number" },
      batting_average: { type: "number" },
      strike_rate: { type: "number" },
      economy: { type: "number" },
      fours: { type: "number" },
      sixes: { type: "number" },
      best_bowling: { type: "string" },
      dot_ball_percentage: { type: "number" },
      catches: { type: "number" },
      stumpings: { type: "number" },
      updated_at: { type: "string" },
    },
    onCreate: (record) => {
      if (record.matches == null) {
        record.matches = 0;
      }

      if (record.runs == null) {
        record.runs = 0;
      }

      if (record.wickets == null) {
        record.wickets = 0;
      }

      if (record.batting_average == null) {
        record.batting_average = 0;
      }

      if (record.strike_rate == null) {
        record.strike_rate = 0;
      }

      if (record.economy == null) {
        record.economy = 0;
      }

      if (record.fours == null) {
        record.fours = 0;
      }

      if (record.sixes == null) {
        record.sixes = 0;
      }

      if (record.dot_ball_percentage == null) {
        record.dot_ball_percentage = 0;
      }

      if (record.catches == null) {
        record.catches = 0;
      }

      if (record.stumpings == null) {
        record.stumpings = 0;
      }

      if (!record.updated_at) {
        record.updated_at = new Date().toISOString();
      }
    },
  },
  matches: {
    fileName: "matches.json",
    searchFields: ["teamA", "teamB", "venue", "result", "umpire", "status"],
    filters: [
      {
        query: "status",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.status).toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
      {
        query: "team",
        apply: (records, value) =>
          records.filter((record) =>
            [record.teamA, record.teamB].some((team) =>
              String(team).toLowerCase().includes(String(value).toLowerCase())
            )
          ),
      },
    ],
    fields: {
      team_a_id: { type: "number" },
      team_b_id: { type: "number" },
      teamA: { type: "string", required: true },
      teamB: { type: "string", required: true },
      date: { type: "string", required: true },
      time: { type: "string", required: true },
      venue: { type: "string", required: true },
      status: {
        type: "string",
        required: true,
        allowedValues: ["Upcoming", "Live", "Completed", "Draft"],
      },
      teamAScore: { type: "string" },
      teamBScore: { type: "string" },
      result: { type: "string" },
      umpire: { type: "string" },
    },
  },
  venues: {
    fileName: "venues.json",
    searchFields: ["ground_name", "location", "city", "contact_person"],
    filters: [
      {
        query: "city",
        apply: (records, value) =>
          records.filter((record) =>
            String(record.city).toLowerCase().includes(String(value).toLowerCase())
          ),
      },
    ],
    fields: {
      ground_name: { type: "string", required: true },
      location: { type: "string", required: true },
      city: { type: "string", required: true },
      capacity: { type: "number" },
      contact_person: { type: "string" },
      contact_phone: { type: "string" },
    },
  },
  franchises: {
    fileName: "franchises.json",
    searchFields: ["company_name", "owner_name", "address", "website", "status"],
    filters: [
      {
        query: "status",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.status || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
    ],
    fields: {
      company_name: { type: "string", required: true },
      owner_name: { type: "string" },
      address: { type: "string" },
      website: { type: "string" },
      logo: { type: "string" },
      status: {
        type: "string",
        allowedValues: ["Approved", "Pending", "Rejected"],
      },
    },
    onCreate: (record) => {
      if (!record.status) {
        record.status = "Approved";
      }
    },
  },
  approvals: {
    fileName: "approvals.json",
    searchFields: [
      "request_type",
      "requested_by",
      "subject",
      "priority",
      "status",
      "notes",
    ],
    filters: [
      {
        query: "status",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.status || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
      {
        query: "priority",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.priority || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
    ],
    fields: {
      request_type: { type: "string", required: true },
      requested_by: { type: "string", required: true },
      subject: { type: "string", required: true },
      date: { type: "string", required: true },
      priority: {
        type: "string",
        required: true,
        allowedValues: ["High", "Medium", "Low"],
      },
      status: {
        type: "string",
        required: true,
        allowedValues: ["Pending", "Approved", "Rejected", "Escalated"],
      },
      notes: { type: "string" },
    },
    onCreate: (record) => {
      if (!record.status) {
        record.status = "Pending";
      }

      if (!record.priority) {
        record.priority = "Medium";
      }
    },
  },
  invoices: {
    fileName: "invoices.json",
    searchFields: [
      "invoice_code",
      "party",
      "category",
      "status",
      "flow",
      "notes",
    ],
    filters: [
      {
        query: "status",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.status || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
      {
        query: "category",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.category || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
      {
        query: "flow",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.flow || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
    ],
    fields: {
      invoice_code: { type: "string", required: true },
      party: { type: "string", required: true },
      category: { type: "string", required: true },
      amount: { type: "number", required: true },
      due_date: { type: "string", required: true },
      status: {
        type: "string",
        required: true,
        allowedValues: ["Paid", "Pending", "Overdue"],
      },
      flow: {
        type: "string",
        required: true,
        allowedValues: ["Income", "Expense"],
      },
      issued_date: { type: "string" },
      notes: { type: "string" },
    },
    onCreate: (record) => {
      if (!record.status) {
        record.status = "Pending";
      }

      if (!record.flow) {
        record.flow = "Income";
      }

      if (!record.issued_date) {
        record.issued_date = new Date().toISOString();
      }
    },
  },
  auctions: {
    fileName: "auctions.json",
    searchFields: [
      "player_name",
      "player_role",
      "team_name",
      "status",
      "paddle_number",
      "notes",
    ],
    filters: [
      {
        query: "status",
        apply: (records, value) =>
          records.filter(
            (record) =>
              String(record.status || "").toLowerCase() ===
              String(value).toLowerCase()
          ),
      },
      {
        query: "teamId",
        apply: (records, value) =>
          records.filter((record) => String(record.team_id) === String(value)),
      },
      {
        query: "team",
        apply: (records, value) =>
          records.filter((record) =>
            String(record.team_name || "")
              .toLowerCase()
              .includes(String(value).toLowerCase())
          ),
      },
    ],
    fields: {
      player_name: { type: "string", required: true },
      player_role: { type: "string" },
      team_id: { type: "number" },
      team_name: { type: "string" },
      base_price: { type: "number", required: true },
      sold_price: { type: "number" },
      status: {
        type: "string",
        required: true,
        allowedValues: ["Sold", "Unsold", "Pending"],
      },
      bid_round: { type: "number" },
      paddle_number: { type: "string" },
      notes: { type: "string" },
    },
    onCreate: (record) => {
      if (!record.status) {
        record.status = "Pending";
      }

      if (record.base_price == null) {
        record.base_price = 0;
      }

      if (record.sold_price == null) {
        record.sold_price = 0;
      }

      if (record.bid_round == null) {
        record.bid_round = 1;
      }
    },
  },
};

const PROJECT_DATA_CONFIG = {
  home: {
    fileName: "home-content.json",
    sections: {
      announcements: "announcements",
      standings: "standings",
      "top-performers": "topPerformers",
      "latest-news": "latestNews",
      sponsors: "sponsors",
    },
  },
  "live-match": {
    fileName: "live-match.json",
  },
  "franchise-dashboard": {
    fileName: "franchise-dashboard.json",
  },
};

module.exports = {
  PROJECT_DATA_CONFIG,
  RESOURCE_CONFIG,
};
