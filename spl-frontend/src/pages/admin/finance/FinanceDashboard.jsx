import { useEffect, useMemo, useState } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DataTable from "../../../components/dashboard/DataTable";
import FilterBar from "../../../components/dashboard/FilterBar";
import ChartWrapper from "../../../components/dashboard/ChartWrapper";
import ExportButton from "../../../components/dashboard/ExportButton";
import Badge from "../../../components/common/Badge";
import AccessLimitedNotice from "../../../components/common/AccessLimitedNotice";
import ManagementModal from "../../../components/dashboard/ManagementModal";
import { getInvoices, patchInvoice } from "../../../api/invoicesAPI";
import { getTeams } from "../../../api/teamsAPI";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import { formatCurrency } from "../../../utils/adminFormatters";
import { downloadCsv } from "../../../utils/downloadCsv";

function getInvoiceStatusColor(status) {
  const colorMap = {
    Paid: "green",
    Pending: "orange",
    Overdue: "red",
  };

  return colorMap[status] || "slate";
}

function formatPercentage(value) {
  return `${Math.max(0, Math.min(100, Math.round(Number(value || 0))))}%`;
}

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    category: "all",
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [invoiceResponse, teamsResponse] = await Promise.all([
        getInvoices(),
        getTeams(),
      ]);

      setInvoices(Array.isArray(invoiceResponse) ? invoiceResponse : []);
      setTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load finance dashboard.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const invoiceRows = useMemo(
    () =>
      invoices.map((invoice) => ({
        ...invoice,
        formattedAmount: formatCurrency(invoice.amount),
      })),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    return invoiceRows.filter((invoice) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        [invoice.invoice_code, invoice.party, invoice.category, invoice.flow]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      const matchesStatus =
        filters.status === "all" || invoice.status === filters.status;
      const matchesCategory =
        filters.category === "all" || invoice.category === filters.category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [filters, invoiceRows]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(invoices.map((invoice) => invoice.category).filter(Boolean))
    ).sort();

    return [
      { label: "All Categories", value: "all" },
      ...categories.map((category) => ({ label: category, value: category })),
    ];
  }, [invoices]);

  const financeSummaryCards = useMemo(() => {
    const incomeInvoices = invoices.filter((invoice) => invoice.flow === "Income");
    const expenseInvoices = invoices.filter((invoice) => invoice.flow === "Expense");
    const pendingInvoices = invoices.filter((invoice) => invoice.status === "Pending");
    const sponsorCollections = incomeInvoices
      .filter((invoice) => invoice.category === "Sponsorship")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const totalRevenue = incomeInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0
    );
    const totalExpenses = expenseInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0
    );
    const remainingBudget = teams.reduce(
      (sum, team) => sum + Number(team.budget_left || 0),
      0
    );
    const utilization = totalExpenses + remainingBudget > 0
      ? (totalExpenses / (totalExpenses + remainingBudget)) * 100
      : 0;

    return [
      {
        label: "Total Revenue",
        value: formatCurrency(totalRevenue),
        subtext: `${incomeInvoices.length} income invoices tracked`,
        color: "green",
        icon: "REV",
      },
      {
        label: "Pending Invoices",
        value: String(pendingInvoices.length),
        subtext: "Need settlement",
        color: "red",
        icon: "INV",
      },
      {
        label: "Sponsor Collections",
        value: formatCurrency(sponsorCollections),
        subtext: "Current sponsorship pipeline",
        color: "blue",
        icon: "SPN",
      },
      {
        label: "Budget Utilized",
        value: formatPercentage(utilization),
        subtext: "Based on expenses plus remaining team budgets",
        color: "gold",
        icon: "BGT",
      },
    ];
  }, [invoices, teams]);

  const financeRevenueBreakdown = useMemo(() => {
    const totals = new Map();

    invoices
      .filter((invoice) => invoice.flow === "Income")
      .forEach((invoice) => {
        const category = invoice.category || "Other";
        totals.set(category, (totals.get(category) || 0) + Number(invoice.amount || 0));
      });

    return [...totals.entries()].map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const settlementWidgets = useMemo(() => {
    const pendingAmount = invoices
      .filter((invoice) => invoice.status === "Pending")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const paidAmount = invoices
      .filter((invoice) => invoice.status === "Paid")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const overdueAmount = invoices
      .filter((invoice) => invoice.status === "Overdue")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    return [
      {
        title: "Upcoming Settlements",
        value: formatCurrency(pendingAmount),
        note: "Pending invoice total",
        icon: "P",
      },
      {
        title: "Completed Settlements",
        value: formatCurrency(paidAmount),
        note: "Already marked as paid",
        icon: "OK",
      },
      {
        title: "Overdue Amount",
        value: formatCurrency(overdueAmount),
        note: "Needs immediate follow-up",
        icon: "!",
      },
    ];
  }, [invoices]);

  const handleMarkPaid = async (invoice) => {
    try {
      setSaving(true);
      setError("");
      const updatedInvoice = await patchInvoice(invoice.id, { status: "Paid" });
      setInvoices((prev) =>
        prev.map((item) =>
          String(item.id) === String(updatedInvoice.id) ? updatedInvoice : item
        )
      );
      if (selectedInvoice && String(selectedInvoice.id) === String(invoice.id)) {
        setSelectedInvoice(updatedInvoice);
      }
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to update invoice status.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "spl-finance-invoices.csv",
      filteredInvoices.map((invoice) => ({
        InvoiceCode: invoice.invoice_code,
        Party: invoice.party,
        Category: invoice.category,
        Flow: invoice.flow,
        Amount: invoice.amount,
        DueDate: invoice.due_date,
        Status: invoice.status,
        IssuedDate: invoice.issued_date,
        Notes: invoice.notes,
      }))
    );
  };

  const columns = [
    { key: "invoice_code", label: "Invoice ID" },
    { key: "party", label: "Party" },
    { key: "category", label: "Category" },
    { key: "flow", label: "Flow" },
    { key: "formattedAmount", label: "Amount" },
    { key: "due_date", label: "Due Date" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.status} color={getInvoiceStatusColor(row.status)} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedInvoice(row)}
            className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
          >
            View
          </button>
          {row.status !== "Paid" ? (
            <button
              type="button"
              onClick={() => handleMarkPaid(row)}
              disabled={saving}
              className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-600 transition hover:bg-green-200 disabled:opacity-70"
            >
              Mark Paid
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

      <AccessLimitedNotice scope="finance" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {financeSummaryCards.map((item) => (
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ChartWrapper
          title="Revenue Breakdown"
          type="pie"
          data={financeRevenueBreakdown}
          valueFormatter={formatCurrency}
          showPieLabels
        />

        <DashboardPanel title="Settlement Widgets">
          <div className="space-y-4">
            {settlementWidgets.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  </div>

                  <span className="text-lg">{item.icon}</span>
                </div>

                <p className="mt-4 font-heading text-3xl text-yellow-700">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </section>

      <FilterBar
        filters={[
          {
            key: "search",
            label: "Search Invoice",
            type: "text",
            value: filters.search,
            placeholder: "Search by invoice id, party, category, or flow",
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: [
              { label: "All Status", value: "all" },
              { label: "Paid", value: "Paid" },
              { label: "Pending", value: "Pending" },
              { label: "Overdue", value: "Overdue" },
            ],
          },
          {
            key: "category",
            label: "Category",
            type: "select",
            value: filters.category,
            options: categoryOptions,
          },
        ]}
        onChange={handleFilterChange}
      />

      <DashboardPanel title="Invoice Registry" bodyClassName="space-y-4">
        <div className="flex justify-end">
          <ExportButton label="Export Invoices" onClick={handleExport} />
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading invoices...
          </div>
        ) : (
          <DataTable columns={columns} data={filteredInvoices} rowKey="id" />
        )}
      </DashboardPanel>

      {selectedInvoice ? (
        <ManagementModal
          title="INVOICE DETAILS"
          onClose={() => setSelectedInvoice(null)}
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Invoice ID</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedInvoice.invoice_code}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <div className="mt-2">
                  <Badge
                    label={selectedInvoice.status}
                    color={getInvoiceStatusColor(selectedInvoice.status)}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Party</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedInvoice.party}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Category</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedInvoice.category}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Amount</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(selectedInvoice.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Flow</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedInvoice.flow}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Issued Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedInvoice.issued_date}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Due Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedInvoice.due_date}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Notes</p>
              <p className="mt-2 text-sm text-slate-700">
                {selectedInvoice.notes || "No additional notes available."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedInvoice.status !== "Paid" ? (
                <button
                  type="button"
                  onClick={() => handleMarkPaid(selectedInvoice)}
                  disabled={saving}
                  className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-70"
                >
                  Mark Paid
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
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
