import { useState, useEffect } from "react";
import {
    BarChart3,
    Clock,
    CheckCircle2,
    TrendingUp,
    Users,
    FileText,
} from "lucide-react";
import { getAnalytics } from "../../lib/api";

interface AnalyticsData {
    totalResumes: number;
    avgProcessingHours: number;
    approvalRate: number;
    monthlyVolumes: Record<string, number>;
    statusDistribution: Record<string, number>;
    staffPerformance: Record<string, { assigned: number; approved: number }>;
}

export function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics() {
        try {
            setIsLoading(true);
            const result = await getAnalytics();
            setData(result);
        } catch (err) {
            console.error("Failed to load analytics:", err);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Loading analytics...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Failed to load analytics</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        draft: "#94a3b8",
        submitted: "#60a5fa",
        changes_required: "#fbbf24",
        approved: "#34d399",
    };

    const statusLabels: Record<string, string> = {
        draft: "Draft",
        submitted: "Submitted",
        changes_required: "Changes Req.",
        approved: "Approved",
    };

    const maxStatusCount = Math.max(...Object.values(data.statusDistribution), 1);

    // Monthly volumes for bar chart
    const months = Object.keys(data.monthlyVolumes).sort();
    const maxMonthly = Math.max(...Object.values(data.monthlyVolumes), 1);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Resumes</p>
                            <p className="text-2xl font-bold">{data.totalResumes}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Avg Processing Time</p>
                            <p className="text-2xl font-bold">
                                {data.avgProcessingHours < 24
                                    ? `${data.avgProcessingHours}h`
                                    : `${(data.avgProcessingHours / 24).toFixed(1)}d`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Approval Rate</p>
                            <p className="text-2xl font-bold">{data.approvalRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Distribution */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Status Distribution</h3>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(data.statusDistribution).map(([status, count]) => (
                            <div key={status} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: statusColors[status] }}
                                        />
                                        <span className="text-muted-foreground">
                                            {statusLabels[status] || status}
                                        </span>
                                    </div>
                                    <span className="font-medium">{count}</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(count / maxStatusCount) * 100}%`,
                                            backgroundColor: statusColors[status],
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Volume */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Monthly Volume</h3>
                    </div>
                    {months.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No data yet</p>
                    ) : (
                        <div className="flex items-end gap-2 h-32">
                            {months.map((month) => {
                                const value = data.monthlyVolumes[month];
                                const heightPct = (value / maxMonthly) * 100;
                                return (
                                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[10px] font-medium">{value}</span>
                                        <div
                                            className="w-full rounded-t-md bg-primary/70 transition-all duration-500 min-h-[4px]"
                                            style={{ height: `${heightPct}%` }}
                                        />
                                        <span className="text-[9px] text-muted-foreground">
                                            {month.slice(5)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Staff Performance */}
            {Object.keys(data.staffPerformance).length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Staff Performance</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">
                                        Staff ID
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">
                                        Assigned
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">
                                        Approved
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">
                                        Rate
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.staffPerformance).map(([staffId, perf]) => (
                                    <tr key={staffId} className="border-b border-border/50 hover:bg-muted/50">
                                        <td className="py-2 px-3 text-xs font-medium">{staffId}</td>
                                        <td className="py-2 px-3 text-xs text-right">{perf.assigned}</td>
                                        <td className="py-2 px-3 text-xs text-right text-emerald-500 font-medium">
                                            {perf.approved}
                                        </td>
                                        <td className="py-2 px-3 text-xs text-right">
                                            {perf.assigned > 0
                                                ? `${Math.round((perf.approved / perf.assigned) * 100)}%`
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
