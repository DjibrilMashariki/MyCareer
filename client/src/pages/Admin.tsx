import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { StatusBadge } from "@/components/resume/StatusBadge";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { TemplateGallery } from "@/components/resume/TemplateGallery";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  RefreshCcw,
  BarChart3,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllResumes,
  getStats,
  getStaffWorkload,
  updateResumeStatus,
  reassignStaff,
} from "@/lib/api";
import { Resume, ResumeStatus } from "@/lib/resumeData";

export default function Admin() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, draft: 0, submitted: 0, changesRequired: 0, approved: 0 });
  const [workload, setWorkload] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"dashboard" | "resumes" | "workload" | "analytics" | "templates">("dashboard");

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const [resumesData, statsData, workloadData] = await Promise.all([
        getAllResumes(),
        getStats(),
        getStaffWorkload(),
      ]);
      setResumes(resumesData);
      setStats(statsData);
      setWorkload(workloadData);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (resumeId: string, newStatus: ResumeStatus) => {
    try {
      await updateResumeStatus(resumeId, newStatus);
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      await refreshData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const filteredResumes = resumes.filter((r) => {
    const matchesSearch =
      r.resumeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const quickStats = [
    { label: "Total Resumes", value: stats.total },
    { label: "Pending Review", value: stats.submitted },
    { label: "Approved", value: stats.approved },
  ];

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "resumes" as const, label: "All Resumes", icon: FileText },
    { id: "workload" as const, label: "Staff Workload", icon: Users },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUp },
    { id: "templates" as const, label: "Templates", icon: FileText },
  ];

  return (
    <PortalLayout
      sidebar={<PortalSidebar portalType="admin" quickStats={quickStats} />}
      headerTitle={`Admin Panel`}
      headerSubtitle={`Welcome, ${user?.fullName || "Admin"}`}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Overview</h2>
              <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="border-border/50">
                <CardContent className="py-4 px-4 text-center">
                  <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-slate-500/5">
                <CardContent className="py-4 px-4 text-center">
                  <Edit className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.draft}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-blue-500/5">
                <CardContent className="py-4 px-4 text-center">
                  <Clock className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.submitted}</p>
                  <p className="text-xs text-muted-foreground">In Review</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-amber-500/5">
                <CardContent className="py-4 px-4 text-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.changesRequired}</p>
                  <p className="text-xs text-muted-foreground">Changes Needed</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-green-500/5">
                <CardContent className="py-4 px-4 text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution Bar */}
            {stats.total > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex rounded-full overflow-hidden h-4">
                    {stats.draft > 0 && (
                      <div
                        className="bg-slate-400 transition-all"
                        style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                        title={`Draft: ${stats.draft}`}
                      />
                    )}
                    {stats.submitted > 0 && (
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${(stats.submitted / stats.total) * 100}%` }}
                        title={`Submitted: ${stats.submitted}`}
                      />
                    )}
                    {stats.changesRequired > 0 && (
                      <div
                        className="bg-amber-500 transition-all"
                        style={{ width: `${(stats.changesRequired / stats.total) * 100}%` }}
                        title={`Changes Required: ${stats.changesRequired}`}
                      />
                    )}
                    {stats.approved > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                        title={`Approved: ${stats.approved}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Draft</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Submitted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Changes Needed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Approved</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* All Resumes Tab */}
        {activeTab === "resumes" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by resume or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="changes_required">Changes Required</option>
                  <option value="approved">Approved</option>
                </select>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                  <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading resumes...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResumes.map((resume) => (
                  <Card key={resume.resumeId} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{resume.resumeId}</p>
                            <p className="text-xs text-muted-foreground">
                              Student: {resume.studentId} • Staff:{" "}
                              {resume.assignedStaffId || "Unassigned"} • Updated:{" "}
                              {new Date(resume.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={resume.status} />
                          <select
                            value={resume.status}
                            onChange={(e) =>
                              handleStatusChange(resume.resumeId, e.target.value as ResumeStatus)
                            }
                            className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                          >
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="changes_required">Changes Required</option>
                            <option value="approved">Approved</option>
                          </select>
                          <select
                            value={resume.assignedStaffId || ""}
                            onChange={async (e) => {
                              try {
                                await reassignStaff(resume.resumeId, e.target.value);
                                toast.success("Staff reassigned");
                                await refreshData();
                              } catch (error: any) {
                                toast.error(error.message || "Reassignment failed");
                              }
                            }}
                            className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                          >
                            <option value="" disabled>Assign Staff</option>
                            {Object.keys(workload).map((staffId) => (
                              <option key={staffId} value={staffId}>
                                {staffId} ({workload[staffId]} assigned)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredResumes.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No resumes found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Staff Workload Tab */}
        {activeTab === "workload" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Staff Workload</h2>
              <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {Object.keys(workload).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No staff data</h3>
                  <p className="text-muted-foreground">
                    Staff workload data will appear here once staff are assigned resumes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(workload).map(([staffId, count]) => {
                  const maxLoad = Math.max(...Object.values(workload), 1);
                  return (
                    <Card key={staffId} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{staffId}</p>
                            <p className="text-xs text-muted-foreground">{count} assigned</p>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${(count / maxLoad) * 100}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
            <AnalyticsDashboard />
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Resume Templates</h2>
            <TemplateGallery isAdmin={true} />
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
