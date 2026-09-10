import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { getDateRange, PERIOD_LABELS, type DatePeriod } from "@/lib/date-ranges";
import { formatDate, formatMoney } from "@/lib/format";
import type { SalesGranularity, SalesStats } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Spinner } from "@/components/ui";

const PERIODS: DatePeriod[] = ["today", "yesterday", "last7", "last30", "thisMonth", "prevMonth", "thisYear", "custom"];
const GRANULARITIES: SalesGranularity[] = ["daily", "monthly", "yearly"];
const statusTone: Record<string, "neutral" | "success" | "danger" | "warning"> = {
  pending: "warning", processing: "warning", confirmed: "neutral", shipped: "neutral",
  delivered: "success", completed: "success", cancelled: "danger",
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></Card>;
}

function RevenueChart({ series, currency }: { series: SalesStats["revenueSeries"]; currency: string }) {
  const maxRevenue = useMemo(() => Math.max(...series.map((point) => point.revenue), 1), [series]);
  if (series.length === 0) return <EmptyState message="No revenue data for this period." />;
  return <div className="space-y-4"><div className="flex h-48 items-end gap-1 overflow-x-auto pb-2 sm:gap-2">{series.map((point) => {
    const height = point.revenue > 0 ? Math.max((point.revenue / maxRevenue) * 100, 4) : 0;
    return <div key={point.period} className="flex min-w-8 flex-1 flex-col items-center gap-2" title={`${point.label}: ${formatMoney(point.revenue, currency)} (${point.orders} orders)`}><div className="flex w-full flex-1 items-end"><div className="w-full rounded-t bg-accent/80 transition-all hover:bg-accent" style={{ height: `${height}%`, minHeight: point.revenue > 0 ? "4px" : "0" }} /></div><span className="max-w-full truncate text-[10px] text-muted">{point.label}</span></div>;
  })}</div><p className="text-xs text-muted">Hover bars for details. Revenue excludes cancelled orders.</p></div>;
}

export function SalesPage() {
  const [period, setPeriod] = useState<DatePeriod>("last30");
  const [granularity, setGranularity] = useState<SalesGranularity>("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dateRange = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try { const { stats: data } = await api.sales.stats({ from: dateRange.from, to: dateRange.to, granularity }); setStats(data); }
    catch (err) { setStats(null); setError(err instanceof ApiError ? err.message : "Failed to load sales data."); }
    finally { setLoading(false); }
  }, [dateRange.from, dateRange.to, granularity]);
  useEffect(() => { load(); }, [load]);
  const currency = stats?.summary.currency ?? "TND";
  return <><PageHeader title="Sales" description="Revenue and order analytics from your order history." />{error && <ErrorBanner message={error} />}<div className="mb-6 space-y-3"><div className="flex flex-wrap gap-2">{PERIODS.map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${period === value ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"}`}>{PERIOD_LABELS[value]}</button>)}</div>{period === "custom" && <div className="flex flex-wrap items-end gap-3"><div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">From</label><Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="w-auto" /></div><div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">To</label><Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="w-auto" /></div></div>}<div className="flex flex-wrap gap-2">{GRANULARITIES.map((value) => <button key={value} onClick={() => setGranularity(value)} className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${granularity === value ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"}`}>{value}</button>)}</div></div>{loading ? <Spinner /> : !stats ? <EmptyState message="No sales data available." /> : <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Total revenue" value={formatMoney(stats.summary.totalRevenue, currency)} /><SummaryCard label="Orders" value={String(stats.summary.orderCount)} /><SummaryCard label="Average order value" value={formatMoney(stats.summary.averageOrderValue, currency)} /><SummaryCard label="Products sold" value={String(stats.summary.productsSold)} /></div><Card><h2 className="text-sm font-semibold">Revenue over time</h2><div className="mt-4"><RevenueChart series={stats.revenueSeries} currency={currency} /></div></Card><div className="grid gap-6 lg:grid-cols-2"><Card><h2 className="text-sm font-semibold">Orders overview</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-md bg-background px-4 py-3"><p className="text-xs text-muted">Completed</p><p className="mt-1 text-xl font-semibold">{stats.ordersByStatus.completed}</p></div><div className="rounded-md bg-background px-4 py-3"><p className="text-xs text-muted">Pending</p><p className="mt-1 text-xl font-semibold">{stats.ordersByStatus.pending}</p></div><div className="rounded-md bg-background px-4 py-3"><p className="text-xs text-muted">Cancelled</p><p className="mt-1 text-xl font-semibold">{stats.ordersByStatus.cancelled}</p></div></div><p className="mt-3 text-xs text-muted">Completed includes confirmed, shipped, and delivered orders. Revenue excludes cancelled orders only.</p></Card><Card><h2 className="text-sm font-semibold">Best-selling products</h2>{stats.topProducts.length === 0 ? <div className="mt-4"><EmptyState message="No product sales in this period." /></div> : <div className="mt-4 overflow-hidden rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 font-medium">Qty</th><th className="px-3 py-2 font-medium">Revenue</th></tr></thead><tbody className="divide-y divide-border">{stats.topProducts.map((product) => <tr key={product.slug}><td className="px-3 py-2"><p className="font-medium">{product.name}</p><p className="text-xs text-muted">{product.slug}</p></td><td className="px-3 py-2">{product.quantity}</td><td className="px-3 py-2">{formatMoney(product.revenue, currency)}</td></tr>)}</tbody></table></div>}</Card></div><Card><div className="flex items-center justify-between gap-4"><h2 className="text-sm font-semibold">Recent orders</h2><Link to="/orders"><Button variant="secondary">View all</Button></Link></div>{stats.recentOrders.length === 0 ? <div className="mt-4"><EmptyState message="No orders in this period." /></div> : <div className="mt-4 overflow-hidden rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Date</th></tr></thead><tbody className="divide-y divide-border">{stats.recentOrders.map((order) => <tr key={order.id} className="hover:bg-background/40"><td className="px-4 py-3 font-mono text-xs"><Link to={`/orders/${order.id}/edit`} className="hover:underline">{order.order_ref}</Link></td><td className="px-4 py-3">{order.customer_name}</td><td className="px-4 py-3">{formatMoney(order.total, order.currency)}</td><td className="px-4 py-3"><Badge tone={statusTone[order.status] ?? "neutral"}>{order.status}</Badge></td><td className="px-4 py-3 text-xs text-muted">{formatDate(order.created_at)}</td></tr>)}</tbody></table></div>}</Card></div>}</>;
}
