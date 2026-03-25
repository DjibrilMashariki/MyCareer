import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { StatusBadge } from "@/components/resume/StatusBadge";
import { VersionHistory } from "@/components/resume/VersionHistory";
import { ResumeViewer } from "@/components/resume/ResumeViewer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Search,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllResumes,
  updateResumeStatus,
  getStaffWorkload,
  getResumeFeedback,
  addFeedback,
} from "@/lib/api";
import { Resume, ResumeStatus } from "@/lib/resumeData";

export default function Staff() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedResume, setExpandedResume] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [feedbackList, setFeedbackList] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      setIsLoading(true);
      const data = await getAllResumes();
      setResumes(data);
    } catch (error) {
      toast.error("Failed to load resumes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (resumeId: string) => {
    try {
      await updateResumeStatus(resumeId, "approved");
      toast.success("Resume approved!");
      await loadResumes();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve resume");
    }
  };

  const handleRequestChanges = async (resumeId: string) => {
    try {
      await updateResumeStatus(resumeId, "changes_required");
      toast.success("Changes requested");
      await loadResumes();
    } catch (error: any) {
      toast.error(error.message || "Failed to request changes");
    }
  };

  const handleSubmitFeedback = async (resumeId: string) => {
    const text = feedbackText[resumeId]?.trim();
    if (!text) {
      toast.error("Please enter feedback before submitting");
      return;
    }
    try {
      await addFeedback(resumeId, text);
      toast.success("Feedback submitted!");
      setFeedbackText((prev) => ({ ...prev, [resumeId]: "" }));
      // Reload feedback for this resume
      await loadFeedback(resumeId);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit feedback");
    }
  };

  const loadFeedback = async (resumeId: string) => {
    try {
      const data = await getResumeFeedback(resumeId);
      setFeedbackList((prev) => ({ ...prev, [resumeId]: data }));
    } catch (error) {
      console.error("Failed to load feedback:", error);
    }
  };

  const handleExpand = async (resumeId: string) => {
    if (expandedResume === resumeId) {
      setExpandedResume(null);
    } else {
      setExpandedResume(resumeId);
      if (!feedbackList[resumeId]) {
        await loadFeedback(resumeId);
      }
    }
  };

  const filteredResumes = resumes.filter((r) => {
    const matchesSearch =
      r.resumeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = resumes.filter((r) => r.status === "submitted").length;
  const reviewedCount = resumes.filter(
    (r) => r.status === "approved" || r.status === "changes_required"
  ).length;

  const quickStats = [
    { label: "Assigned", value: resumes.length },
    { label: "Pending Review", value: pendingCount },
    { label: "Reviewed", value: reviewedCount },
  ];

  return (
    <PortalLayout
      sidebar={<PortalSidebar portalType="staff" quickStats={quickStats} />}
      headerTitle={`Welcome, ${user?.fullName || "Staff"}`}
      headerSubtitle="Review and manage assigned resumes"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 items-center">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="submitted">Pending Review</option>
              <option value="changes_required">Changes Required</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadResumes} disabled={isLoading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="py-3 px-4 text-center">
              <p className="text-2xl font-bold">{resumes.length}</p>
              <p className="text-xs text-muted-foreground">Total Assigned</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-amber-500/5">
            <CardContent className="py-3 px-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-green-500/5">
            <CardContent className="py-3 px-4 text-center">
              <p className="text-2xl font-bold text-green-600">{reviewedCount}</p>
              <p className="text-xs text-muted-foreground">Reviewed</p>
            </CardContent>
          </Card>
        </div>

        {/* Resume List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading assigned resumes...</p>
          </div>
        ) : filteredResumes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No resumes to review</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all"
                  ? "No resumes match the selected filter"
                  : "No resumes have been assigned to you yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResumes.map((resume) => (
              <Card key={resume.resumeId} className="border-border/50">
                <CardContent className="p-4">
                  {/* Resume Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{resume.resumeId}</p>
                        <p className="text-xs text-muted-foreground">
                          Student: {resume.studentId} • Updated:{" "}
                          {new Date(resume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={resume.status} />
                      <Button variant="ghost" size="sm" onClick={() => handleExpand(resume.resumeId)}>
                        {expandedResume === resume.resumeId ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  {resume.status === "submitted" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(resume.resumeId)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestChanges(resume.resumeId)}
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Request Changes
                      </Button>
                    </div>
                  )}

                  {/* Expanded Feedback Section */}
                  {expandedResume === resume.resumeId && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                      {/* Version History */}
                      <VersionHistory
                        resumeId={resume.resumeId}
                        currentVersionId={resume.currentVersionId}
                      />

                      {/* Resume Viewer & Annotations */}
                      <ResumeViewer
                        resumeId={resume.resumeId}
                        userRole="staff"
                        currentUserId={user?.id}
                      />

                      {/* Feedback Form */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Add Feedback
                        </h4>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Write your feedback for the student..."
                            value={feedbackText[resume.resumeId] || ""}
                            onChange={(e) =>
                              setFeedbackText((prev) => ({
                                ...prev,
                                [resume.resumeId]: e.target.value,
                              }))
                            }
                            className="flex-1 min-h-[80px] resize-none"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="mt-2 gradient-primary"
                          onClick={() => handleSubmitFeedback(resume.resumeId)}
                          disabled={!feedbackText[resume.resumeId]?.trim()}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Send Feedback
                        </Button>
                      </div>

                      {/* Existing Feedback */}
                      {feedbackList[resume.resumeId] &&
                        feedbackList[resume.resumeId].length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Previous Feedback</h4>
                            <div className="space-y-2">
                              {feedbackList[resume.resumeId].map((fb: any, i: number) => (
                                <div
                                  key={fb.feedbackId || i}
                                  className="p-3 rounded-lg bg-muted/50 text-sm"
                                >
                                  <p className="text-muted-foreground text-xs mb-1">
                                    {fb.staffName || "Staff"} •{" "}
                                    {new Date(fb.createdAt).toLocaleString()}
                                  </p>
                                  <p>{fb.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
