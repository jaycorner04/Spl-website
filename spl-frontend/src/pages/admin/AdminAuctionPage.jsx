import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import DataTable from "../../components/dashboard/DataTable";
import FilterBar from "../../components/dashboard/FilterBar";
import ChartWrapper from "../../components/dashboard/ChartWrapper";
import ExportButton from "../../components/dashboard/ExportButton";
import Badge from "../../components/common/Badge";
import { getAuctions } from "../../api/auctionsAPI";
import { getTeams } from "../../api/teamsAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { downloadCsv } from "../../utils/downloadCsv";
import { formatCurrency } from "../../utils/adminFormatters";

function getAuctionStatusColor(status) {
  const colorMap = {
    Sold: "green",
    Unsold: "red",
    Pending: "orange",
  };

  return colorMap[status] || "slate";
}

export default function AdminAuctionPage() {
  const [searchParams] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    team: "all",
  });
  const [appliedSearchToken, setAppliedSearchToken] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [auctionResponse, teamsResponse] = await Promise.all([
        getAuctions(),
        getTeams(),
      ]);

      setAuctions(Array.isArray(auctionResponse) ? auctionResponse : []);
      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load the auction dashboard.")
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
      resource !== "auctions" ||
      !searchValue
    ) {
      return;
    }

    setAppliedSearchToken(focusToken);
    setFilters((prev) => ({
      ...prev,
      search: searchValue,
    }));
  }, [appliedSearchToken, searchParams]);

  const rows = useMemo(
    () =>
      auctions.map((lot) => ({
        ...lot,
        playerLabel: lot.player_name || "Unnamed Player",
        basePriceLabel: formatCurrency(lot.base_price),
        soldPriceLabel:
          Number(lot.sold_price || 0) > 0
            ? formatCurrency(lot.sold_price)
            : "-",
        teamLabel: lot.team_name || "Open Lot",
      })),
    [auctions]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((lot) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        [
          lot.player_name,
          lot.player_role,
          lot.team_name,
          lot.status,
          lot.paddle_number,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));
      const matchesStatus =
        filters.status === "all" || lot.status === filters.status;
      const matchesTeam =
        filters.team === "all" || lot.teamLabel === filters.team;

      return matchesSearch && matchesStatus && matchesTeam;
    });
  }, [filters, rows]);

  const summaryCards = useMemo(() => {
    const soldLots = auctions.filter((lot) => lot.status === "Sold");
    const unsoldLots = auctions.filter((lot) => lot.status === "Unsold");
    const pendingLots = auctions.filter((lot) => lot.status === "Pending");
    const realizedValue = soldLots.reduce(
      (sum, lot) => sum + Number(lot.sold_price || 0),
      0
    );
    const averageSoldPrice =
      soldLots.length > 0 ? Math.round(realizedValue / soldLots.length) : 0;

    return [
      {
        label: "Auction Lots",
        value: auctions.length,
        subtext: "Live lots in the backend pool",
        color: "blue",
        icon: "LOT",
      },
      {
        label: "Sold Players",
        value: soldLots.length,
        subtext: "Contracts finalized",
        color: "green",
        icon: "SOLD",
      },
      {
        label: "Pending Bids",
        value: pendingLots.length,
        subtext: "Awaiting the next paddle call",
        color: "orange",
        icon: "BID",
      },
      {
        label: "Avg Sold Price",
        value: formatCurrency(averageSoldPrice),
        subtext: `${unsoldLots.length} unsold players still in the pool`,
        color: "gold",
        icon: "AVG",
      },
    ];
  }, [auctions]);

  const spendByTeam = useMemo(() => {
    const teamSpendMap = new Map();

    auctions
      .filter((lot) => lot.status === "Sold" && lot.team_name)
      .forEach((lot) => {
        const key = lot.team_name;
        teamSpendMap.set(
          key,
          (teamSpendMap.get(key) || 0) + Number(lot.sold_price || 0)
        );
      });

    return [...teamSpendMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount);
  }, [auctions]);

  const statusOverview = useMemo(() => {
    const soldCount = auctions.filter((lot) => lot.status === "Sold").length;
    const unsoldCount = auctions.filter((lot) => lot.status === "Unsold").length;
    const pendingCount = auctions.filter((lot) => lot.status === "Pending").length;

    return [
      { name: "Sold", value: soldCount },
      { name: "Unsold", value: unsoldCount },
      { name: "Pending", value: pendingCount },
    ];
  }, [auctions]);

  const recentSales = useMemo(() => {
    return rows
      .filter((lot) => lot.status === "Sold")
      .sort((left, right) => Number(right.sold_price || 0) - Number(left.sold_price || 0))
      .slice(0, 4);
  }, [rows]);

  const teamOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        [
          ...teams.map((team) => team.team_name),
          ...auctions.map((lot) => lot.team_name),
        ].filter(Boolean)
      )
    ).sort();

    return [
      { label: "All Teams", value: "all" },
      ...values.map((value) => ({ label: value, value })),
    ];
  }, [auctions, teams]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExport = () => {
    downloadCsv(
      "spl-auction-lots.csv",
      filteredRows.map((lot) => ({
        Player: lot.player_name,
        Role: lot.player_role,
        Team: lot.team_name || "",
        BasePrice: lot.base_price,
        SoldPrice: lot.sold_price,
        Status: lot.status,
        BidRound: lot.bid_round,
        PaddleNumber: lot.paddle_number,
        Notes: lot.notes,
      }))
    );
  };

  const columns = [
    { key: "playerLabel", label: "Player" },
    { key: "player_role", label: "Role" },
    { key: "teamLabel", label: "Team" },
    { key: "basePriceLabel", label: "Base Price" },
    { key: "soldPriceLabel", label: "Sold Price" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} color={getAuctionStatusColor(row.status)} />
      ),
    },
    { key: "bid_round", label: "Round" },
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
            label: "Search Lot",
            type: "text",
            value: filters.search,
            placeholder: "Search player, role, team, status, or paddle",
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: [
              { label: "All Status", value: "all" },
              { label: "Sold", value: "Sold" },
              { label: "Pending", value: "Pending" },
              { label: "Unsold", value: "Unsold" },
            ],
          },
          {
            key: "team",
            label: "Team",
            type: "select",
            value: filters.team,
            options: teamOptions,
          },
        ]}
        onChange={handleFilterChange}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <DashboardPanel title="Auction Registry" bodyClassName="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="text-sm text-slate-500">
              Total results:{" "}
              <span className="font-semibold text-slate-900">
                {filteredRows.length}
              </span>
            </div>

            <div className="flex gap-3">
              <ExportButton label="Export Auction" onClick={handleExport} />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Loading auction lots...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRows}
              rowKey="id"
              emptyMessage="No auction lots match the selected filters."
              stickyHeader
              scrollClassName="max-h-[430px] overflow-auto"
            />
          )}
        </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Top Hammer Sales">
            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {recentSales.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No sold auction lots are available yet.
                </p>
              ) : (
                recentSales.map((lot) => (
                  <div
                    key={lot.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {lot.player_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lot.player_role} • {lot.teamLabel}
                        </p>
                      </div>
                      <Badge label={lot.status} color="green" />
                    </div>

                    <p className="mt-3 font-heading text-3xl text-yellow-700">
                      {lot.soldPriceLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Round {lot.bid_round} • Paddle {lot.paddle_number || "-"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Auction Notes">
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-600">
                  {auctions.filter((lot) => lot.status === "Sold").length} lots are already closed
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Sold price totals and team spend leaderboards are pulled from the backend auction data.
                </p>
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-700">
                  {auctions.filter((lot) => lot.status === "Pending").length} lots are still pending
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Pending lots stay visible here until the next bid or final outcome is recorded.
                </p>
              </div>
            </div>
          </DashboardPanel>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartWrapper
          title="Spend By Team"
          type="bar"
          data={spendByTeam}
          dataKey="amount"
          xKey="name"
        />

        <ChartWrapper title="Lot Status Overview" type="pie" data={statusOverview} />
      </section>
    </div>
  );
}
