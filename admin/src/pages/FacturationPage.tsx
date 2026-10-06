import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import {
  FACTURATION_PERIODS,
  getDateRange,
  PERIOD_LABELS,
  type FacturationDatePeriod,
} from "@/lib/date-ranges";
import { formatDate, formatMoney } from "@/lib/format";
import type { BillingDashboard, Expense } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui";

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function MonthlyChart({
  series,
  currency,
}: {
  series: BillingDashboard["monthlySeries"];
  currency: string;
}) {
  const maxValue = useMemo(
    () => Math.max(...series.flatMap((p) => [p.revenue, p.expenses, p.net]), 1),
    [series],
  );
  if (series.length === 0) return <EmptyState message="No monthly data for this period." />;
  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-2 overflow-x-auto pb-2">
        {series.map((point) => {
          const revH = point.revenue > 0 ? Math.max((point.revenue / maxValue) * 100, 4) : 0;
          const expH = point.expenses > 0 ? Math.max((point.expenses / maxValue) * 100, 4) : 0;
          return (
            <div key={point.period} className="flex min-w-12 flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className="w-2 rounded-t bg-accent/80"
                  style={{ height: `${revH}%`, minHeight: point.revenue > 0 ? "4px" : "0" }}
                  title={`CA: ${formatMoney(point.revenue, currency)}`}
                />
                <div
                  className="w-2 rounded-t bg-red-400/80"
                  style={{ height: `${expH}%`, minHeight: point.expenses > 0 ? "4px" : "0" }}
                  title={`Dépenses: ${formatMoney(point.expenses, currency)}`}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-muted">{point.period}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Blue = revenue (CA from orders). Red = paid expenses. Net = revenue − paid expenses (pending
        excluded).
      </p>
    </div>
  );
}

export function FacturationPage() {
  const [period, setPeriod] = useState<FacturationDatePeriod>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  const dateRange = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [{ dashboard: dash }, list] = await Promise.all([
        api.expenses.dashboard({ from: dateRange.from, to: dateRange.to }),
        api.expenses.list({
          from: dateRange.from,
          to: dateRange.to,
          page,
          pageSize: 25,
          q: search,
        }),
      ]);
      setDashboard(dash);
      setExpenses(list.expenses);
      setTotalPages(list.pagination.totalPages);
    } catch (err) {
      setDashboard(null);
      setExpenses([]);
      setError(err instanceof ApiError ? err.message : "Failed to load Facturation data.");
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [period, customFrom, customTo, search]);

  const currency = dashboard?.currency ?? "TND";

  const onVoid = async () => {
    if (!voidId) return;
    setVoiding(true);
    try {
      await api.expenses.void(voidId);
      setVoidId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to void expense.");
    } finally {
      setVoiding(false);
    }
  };

  const openAttachment = async (id: string) => {
    try {
      const { url } = await api.expenses.attachmentUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open attachment.");
    }
  };

  return (
    <>
      <PageHeader
        title="Facturation"
        description="Business expenses, financial results (CA − dépenses), and supplier records."
        action={
          <Link to="/facturation/new">
            <Button>New expense</Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {FACTURATION_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === value ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[value]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                From
              </label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-auto" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                To
              </label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-auto" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : !dashboard ? (
        <EmptyState message="No Facturation data available." />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Revenue (CA)"
              value={formatMoney(Number(dashboard.revenue), currency)}
              hint="From orders (excludes cancelled), same logic as Sales."
            />
            <SummaryCard
              label="Paid expenses"
              value={formatMoney(Number(dashboard.paidExpenses), currency)}
              hint="Active expenses with payment status paid."
            />
            <SummaryCard
              label="Net"
              value={formatMoney(Number(dashboard.net), currency)}
              hint="CA − paid expenses (cash view)."
            />
            <SummaryCard
              label="Pending expenses"
              value={formatMoney(Number(dashboard.pendingExpenses), currency)}
              hint="Not subtracted from Net."
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-sm font-semibold">Expenses by category (paid)</h2>
              {dashboard.expensesByCategory.length === 0 ? (
                <div className="mt-4">
                  <EmptyState message="No paid expenses in this period." />
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium">TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dashboard.expensesByCategory.map((row) => (
                        <tr key={row.category}>
                          <td className="px-3 py-2">{row.category}</td>
                          <td className="px-3 py-2">{formatMoney(Number(row.totalTtc), currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card>
              <h2 className="text-sm font-semibold">Monthly revenue vs expenses</h2>
              <div className="mt-4">
                <MonthlyChart series={dashboard.monthlySeries} currency={currency} />
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-sm font-semibold">Expenses</h2>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(searchInput.trim());
                }}
              >
                <Input
                  placeholder="Search supplier, invoice, title…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-64"
                />
                <Button type="submit" variant="secondary">
                  Search
                </Button>
              </form>
            </div>

            {expenses.length === 0 ? (
              <div className="mt-4">
                <EmptyState message="No expenses in this period." />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Supplier</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">HT</th>
                      <th className="px-3 py-2 font-medium">TVA</th>
                      <th className="px-3 py-2 font-medium">TTC</th>
                      <th className="px-3 py-2 font-medium">Payment</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className={expense.status === "voided" ? "opacity-60" : undefined}>
                        <td className="px-3 py-2 text-xs">{expense.payment_date}</td>
                        <td className="px-3 py-2 font-mono text-xs">{expense.invoice_number ?? "—"}</td>
                        <td className="px-3 py-2">{expense.supplier_name ?? "—"}</td>
                        <td className="px-3 py-2">{expense.category}</td>
                        <td className="px-3 py-2">{formatMoney(Number(expense.amount_ht), expense.currency)}</td>
                        <td className="px-3 py-2">{formatMoney(Number(expense.vat_amount), expense.currency)}</td>
                        <td className="px-3 py-2">{formatMoney(Number(expense.amount_ttc), expense.currency)}</td>
                        <td className="px-3 py-2">
                          <Badge tone={expense.payment_status === "paid" ? "success" : "warning"}>
                            {expense.payment_status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {expense.status === "voided" ? (
                            <Badge tone="danger">Annulée / Voided</Badge>
                          ) : (
                            <Badge tone="neutral">Active</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Button type="button" variant="ghost" onClick={() => setViewExpense(expense)}>
                              View
                            </Button>
                            {expense.status === "active" && (
                              <Link to={`/facturation/${expense.id}/edit`}>
                                <Button type="button" variant="ghost">
                                  Edit
                                </Button>
                              </Link>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                void api.expenses.downloadPdf(
                                  expense.id,
                                  `depense-${expense.invoice_number ?? expense.id.slice(0, 8)}.pdf`,
                                )
                              }
                            >
                              PDF
                            </Button>
                            {expense.status === "active" && (
                              <Button type="button" variant="ghost" onClick={() => setVoidId(expense.id)}>
                                Void
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={viewExpense != null}
        title={viewExpense?.title ?? "Expense"}
        onClose={() => setViewExpense(null)}
        footer={
          viewExpense && (
            <>
              {viewExpense.attachment_path && (
                <Button type="button" variant="secondary" onClick={() => void openAttachment(viewExpense.id)}>
                  Attachment
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setViewExpense(null)}>
                Close
              </Button>
            </>
          )
        }
      >
        {viewExpense && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-muted">Supplier</dt>
              <dd>{viewExpense.supplier_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Invoice</dt>
              <dd>{viewExpense.invoice_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Payment date</dt>
              <dd>{viewExpense.payment_date}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Description</dt>
              <dd>{viewExpense.description ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Amounts</dt>
              <dd>
                HT {formatMoney(Number(viewExpense.amount_ht), viewExpense.currency)} · TVA{" "}
                {formatMoney(Number(viewExpense.vat_amount), viewExpense.currency)} · TTC{" "}
                {formatMoney(Number(viewExpense.amount_ttc), viewExpense.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Notes</dt>
              <dd>{viewExpense.notes ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Created</dt>
              <dd>{formatDate(viewExpense.created_at)}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={voidId != null}
        title="Void expense?"
        message="This expense will be marked Annulée / Voided. It stays in history but is excluded from financial totals."
        confirmLabel="Void"
        loadingLabel="Voiding…"
        onConfirm={() => void onVoid()}
        onCancel={() => setVoidId(null)}
        loading={voiding}
      />
    </>
  );
}
