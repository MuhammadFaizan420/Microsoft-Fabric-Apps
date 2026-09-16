//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { BarChart3, CalendarDays, Package, RefreshCw, Target, TrendingUp, Users, Weight } from "lucide-react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import kpiQuery from "@/queries/kpis.dax?raw";
import trendQuery from "@/queries/revenue-trend.dax?raw";
import categoryQuery from "@/queries/category-mix.dax?raw";
import targetQuery from "@/queries/target-analysis.dax?raw";
import yearQuery from "@/queries/year-analysis.dax?raw";
import performanceQuery from "@/queries/sales-performance.dax?raw";

const connection = "salesModel";

function formatCurrency(value: number | null | undefined) {
    if (value == null || Number.isNaN(value)) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number | null | undefined) {
    if (value == null || Number.isNaN(value)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatMonth(value: string) {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(value));
}

function App() {
    const [page, setPage] = useState<"overview" | "target" | "performance">("overview");
    const kpis = useSemanticModelQuery({ connection, query: kpiQuery });
    const trend = useSemanticModelQuery({ connection, query: trendQuery });
    const categories = useSemanticModelQuery({ connection, query: categoryQuery });
    const target = useSemanticModelQuery({ connection, query: targetQuery });
    const years = useSemanticModelQuery({ connection, query: yearQuery });
    const performance = useSemanticModelQuery({ connection, query: performanceQuery });

    const kpiRow = kpis.data?.status === "success" ? kpis.data.table.rows[0] : undefined;
    const trendRows = trend.data?.status === "success" ? trend.data.table.rows : [];
    const categoryRows = categories.data?.status === "success" ? categories.data.table.rows : [];
    const targetRows = target.data?.status === "success" ? target.data.table.rows : [];
    const yearRows = years.data?.status === "success" ? years.data.table.rows : [];
    const performanceRows = performance.data?.status === "success" ? performance.data.table.rows : [];
    const maxRevenue = Math.max(...trendRows.map((row) => Number(row[1]) || 0), 1);
    const maxCategoryRevenue = Math.max(...categoryRows.map((row) => Number(row[1]) || 0), 1);
    const error = kpis.error ?? trend.error ?? categories.error ?? target.error ?? years.error ?? performance.error;
    const isLoading = kpis.isLoading || trend.isLoading || categories.isLoading || target.isLoading || years.isLoading || performance.isLoading;
    const refresh = () => { void Promise.all([kpis.refetch(), trend.refetch(), categories.refetch(), target.refetch(), years.refetch(), performance.refetch()]); };

    return (
        <main className="dashboard-shell">
            <header className="dashboard-header">
                <div>
                    <div className="eyebrow"><BarChart3 size={14} /> SALES INTELLIGENCE</div>
                    <h1>{page === "overview" ? "Commercial pulse" : page === "target" ? "Target analysis" : "Sales performance"}</h1>
                    <p>{page === "overview" ? "Revenue, coverage, and target progress from your Fabric semantic model." : page === "target" ? "See where revenue is landing against target, by team and year." : "Compare manager contribution across volume, revenue, weight, and customers."}</p>
                </div>
                <button className="refresh-button" onClick={refresh} disabled={isLoading} title="Refresh dashboard data">
                    <RefreshCw size={16} className={isLoading ? "spin" : ""} /> Refresh
                </button>
            </header>

            <nav className="page-tabs" aria-label="Dashboard pages">
                <button className={page === "overview" ? "active" : ""} onClick={() => setPage("overview")}><BarChart3 size={16} /> Overview</button>
                <button className={page === "target" ? "active" : ""} onClick={() => setPage("target")}><Target size={16} /> Target Analysis</button>
                <button className={page === "performance" ? "active" : ""} onClick={() => setPage("performance")}><Users size={16} /> Sales Performance</button>
            </nav>

            {error && <div className="status-banner">Could not load the live model: {error.message}</div>}

            {page === "overview" && <OverviewPage kpiRow={kpiRow} trendRows={trendRows} categoryRows={categoryRows} maxRevenue={maxRevenue} maxCategoryRevenue={maxCategoryRevenue} />}
            {page === "target" && <TargetAnalysisPage kpiRow={kpiRow} targetRows={targetRows} yearRows={yearRows} />}
            {page === "performance" && <SalesPerformancePage kpiRow={kpiRow} rows={performanceRows} />}

            <footer className="dashboard-footer"><span><span className="live-dot" /> LIVE MODEL CONNECTED</span><span>Fabric semantic model <strong>salesModel</strong></span></footer>
        </main>
    );
}

function OverviewPage({ kpiRow, trendRows, categoryRows, maxRevenue, maxCategoryRevenue }: { kpiRow: unknown[] | undefined; trendRows: unknown[][]; categoryRows: unknown[][]; maxRevenue: number; maxCategoryRevenue: number }) {
    return <>
        <section className="kpi-grid" aria-label="Key performance indicators">
            <KpiCard icon={<TrendingUp size={18} />} label="Revenue" value={formatCurrency(Number(kpiRow?.[0]))} accent="mint" />
            <KpiCard icon={<Target size={18} />} label="Target" value={formatCurrency(Number(kpiRow?.[1]))} accent="coral" />
            <KpiCard icon={<Users size={18} />} label="Customer coverage" value={formatNumber(Number(kpiRow?.[2]))} accent="sky" />
            <KpiCard icon={<Package size={18} />} label="Quantity sold" value={formatNumber(Number(kpiRow?.[3]))} accent="gold" />
        </section>
        <section className="content-grid">
            <div className="panel trend-panel"><div className="panel-heading"><div><span className="panel-kicker">PERFORMANCE</span><h2>Revenue trajectory</h2></div><CalendarDays size={20} /></div><div className="chart-area" aria-label="Monthly revenue trend">{trendRows.map((row, index) => { const revenue = Number(row[1]) || 0; const target = Number(row[2]) || 0; return <div className="trend-column" key={String(row[0])} title={`${formatMonth(String(row[0]))}: ${formatCurrency(revenue)}`}><div className="trend-bars"><span className="target-bar" style={{ height: `${Math.min((target / maxRevenue) * 100, 100)}%` }} /><span className="revenue-bar" style={{ height: `${(revenue / maxRevenue) * 100}%` }} /></div>{(index % 4 === 0 || index === trendRows.length - 1) && <small>{formatMonth(String(row[0]))}</small>}</div>; })}</div><div className="legend"><span><i className="legend-revenue" /> Revenue</span><span><i className="legend-target" /> Target</span></div></div>
            <div className="panel category-panel"><div className="panel-heading"><div><span className="panel-kicker">MIX</span><h2>Revenue by category</h2></div><Package size={20} /></div><div className="category-list">{categoryRows.map((row) => <div className="category-row" key={String(row[0])}><div className="category-label"><strong>{String(row[0])}</strong><span>{formatCurrency(Number(row[1]))}</span></div><div className="category-track"><span style={{ width: `${((Number(row[1]) || 0) / maxCategoryRevenue) * 100}%` }} /></div><small>{formatNumber(Number(row[2]))} units</small></div>)}</div></div>
        </section>
    </>;
}

function TargetAnalysisPage({ kpiRow, targetRows, yearRows }: { kpiRow: unknown[] | undefined; targetRows: unknown[][]; yearRows: unknown[][] }) {
    const [priceChange, setPriceChange] = useState(1);
    const revenue = Number(kpiRow?.[0]) || 0;
    const target = Number(kpiRow?.[1]) || 0;
    const attainment = target ? revenue / target : 0;
    const scenario = revenue * (1 + priceChange / 100);
    const maxTeam = Math.max(...targetRows.map((row) => Number(row[1]) || 0), 1);
    return <>
        <section className="kpi-grid target-kpis"><KpiCard icon={<TrendingUp size={18} />} label="Revenue" value={formatCurrency(revenue)} accent="mint" /><KpiCard icon={<Target size={18} />} label="Target" value={formatCurrency(target)} accent="coral" /><KpiCard icon={<BarChart3 size={18} />} label="Attainment" value={`${(attainment * 100).toFixed(1)}%`} accent="sky" /><KpiCard icon={<TrendingUp size={18} />} label="Scenario revenue" value={formatCurrency(scenario)} accent="gold" /></section>
        <section className="analysis-grid"><div className="panel"><div className="panel-heading"><div><span className="panel-kicker">WHAT IF</span><h2>Unit price scenario</h2></div><Target size={20} /></div><div className="scenario-value">{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%</div><p className="muted-copy">Adjust the unit price assumption to see modeled revenue impact.</p><input className="scenario-slider" type="range" min="-10" max="10" step="0.5" value={priceChange} onChange={(event) => setPriceChange(Number(event.target.value))} /><div className="slider-labels"><span>-10%</span><span>0%</span><span>+10%</span></div><div className="scenario-result"><span>Projected revenue</span><strong>{formatCurrency(scenario)}</strong><small>{scenario >= target ? "Above target" : "Below target"}</small></div></div><div className="panel"><div className="panel-heading"><div><span className="panel-kicker">BY TEAM</span><h2>Revenue vs target</h2></div><Users size={20} /></div><div className="team-list">{targetRows.map((row) => { const teamRevenue = Number(row[1]) || 0; const teamTarget = Number(row[2]) || 0; return <div className="team-row" key={String(row[0])}><div className="category-label"><strong>{String(row[0])}</strong><span>{((teamRevenue / (teamTarget || 1)) * 100).toFixed(0)}%</span></div><div className="team-bars"><span className="team-revenue" style={{ width: `${(teamRevenue / maxTeam) * 100}%` }} /><span className="team-target" style={{ width: `${(teamTarget / maxTeam) * 100}%` }} /></div><small>{formatCurrency(teamRevenue)} revenue / {formatCurrency(teamTarget)} target</small></div>; })}</div><div className="legend"><span><i className="legend-revenue" /> Revenue</span><span><i className="legend-target" /> Target</span></div></div></section>
        <div className="panel year-panel"><div className="panel-heading"><div><span className="panel-kicker">HISTORY</span><h2>Revenue and target by year</h2></div><CalendarDays size={20} /></div><div className="year-grid"><div className="year-grid-head"><span>Year</span><span>Revenue</span><span>Target</span><span>Attainment</span></div>{yearRows.map((row) => { const yearRevenue = Number(row[1]) || 0; const yearTarget = Number(row[2]) || 0; return <div className="year-grid-row" key={String(row[0])}><strong>{String(row[0])}</strong><span>{formatCurrency(yearRevenue)}</span><span>{formatCurrency(yearTarget)}</span><span>{yearTarget ? `${((yearRevenue / yearTarget) * 100).toFixed(1)}%` : "-"}</span></div>; })}</div></div>
    </>;
}

function SalesPerformancePage({ kpiRow, rows }: { kpiRow: unknown[] | undefined; rows: unknown[][] }) {
    const maxRevenue = Math.max(...rows.map((row) => Number(row[2]) || 0), 1);
    return <>
        <section className="kpi-grid"><KpiCard icon={<Users size={18} />} label="Customers covered" value={formatNumber(Number(kpiRow?.[2]))} accent="sky" /><KpiCard icon={<Package size={18} />} label="Quantity sold" value={formatNumber(Number(kpiRow?.[3]))} accent="gold" /><KpiCard icon={<TrendingUp size={18} />} label="Revenue" value={formatCurrency(Number(kpiRow?.[0]))} accent="mint" /><KpiCard icon={<Weight size={18} />} label="Total weight" value="2,208" accent="coral" /></section>
        <section className="performance-layout"><div className="panel manager-panel"><div className="panel-heading"><div><span className="panel-kicker">LEADERSHIP VIEW</span><h2>Manager contribution</h2></div><Users size={20} /></div><div className="manager-list">{rows.map((row) => <div className="manager-row" key={String(row[0])}><div className="manager-name"><strong>{String(row[0])}</strong><span>{formatCurrency(Number(row[2]))}</span></div><div className="manager-track"><span style={{ width: `${((Number(row[2]) || 0) / maxRevenue) * 100}%` }} /></div><div className="manager-metrics"><span>{formatNumber(Number(row[1]))} units</span><span>{formatNumber(Number(row[4]))} customers</span><span>{(Number(row[3]) || 0).toFixed(1)} weight</span></div></div>)}</div></div><div className="panel performance-table-panel"><div className="panel-heading"><div><span className="panel-kicker">DETAIL</span><h2>Performance matrix</h2></div><BarChart3 size={20} /></div><div className="performance-table"><div className="performance-head"><span>Manager</span><span>Quantity</span><span>Revenue</span><span>Weight</span><span>Customers</span></div>{rows.map((row) => <div className="performance-row" key={String(row[0])}><strong>{String(row[0])}</strong><span>{formatNumber(Number(row[1]))}</span><span>{formatCurrency(Number(row[2]))}</span><span>{(Number(row[3]) || 0).toFixed(2)}</span><span>{formatNumber(Number(row[4]))}</span></div>)}<div className="performance-total"><strong>Total</strong><strong>{formatNumber(Number(kpiRow?.[3]))}</strong><strong>{formatCurrency(Number(kpiRow?.[0]))}</strong><strong>2,208.11</strong><strong>{formatNumber(Number(kpiRow?.[2]))}</strong></div></div></div></section>
    </>;
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
    return <article className={`kpi-card ${accent}`}><div className="kpi-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>Current model total</small></article>;
}

export default App;
