import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { ResumeCard } from "@/components/resume/ResumeCard";
import { TemplateGallery } from "@/components/resume/TemplateGallery";
import { StatusBadge } from "@/components/resume/StatusBadge";
import { FileUpload } from "@/components/resume/FileUpload";
import { VersionHistory } from "@/components/resume/VersionHistory";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  FileText,
  Search,
  Send,
  RefreshCcw,
  Upload,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllResumes,
  createDraftResume,
  submitResumeForReview,
  getStats,
  getResumeFeedback,
} from "@/lib/api";
import { Resume, ResumeStatus } from "@/lib/resumeData";

export default function Student() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedResume, setExpandedResume] = useState<string | null>(null);
  const [feedbackList, setFeedbackList] = useState<Record<string, any[]>>({});
  const [stats, setStats] = useState({ total: 0, draft: 0, submitted: 0, changesRequired: 0, approved: 0 });

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      setIsLoading(true);
      const data = await getAllResumes();
      setResumes(data);
      const statsData = await getStats();
      setStats(statsData);
    } catch (error) {
      toast.error("Failed to load resumes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    try {
      setIsCreating(true);
      const newResume = await createDraftResume();
      toast.success("Draft resume created! Upload your file below.");
      setExpandedResume(newResume.resumeId);
      await loadResumes();
    } catch (error: any) {
      toast.error(error.message || "Failed to create draft");
    } finally {
      setIsCreating(false);
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

  const loadFeedback = async (resumeId: string) => {
    try {
      const data = await getResumeFeedback(resumeId);
      setFeedbackList((prev) => ({ ...prev, [resumeId]: data }));
    } catch (error) {
      console.error("Failed to load feedback:", error);
    }
  };

  const handleSubmit = async (resumeId: string) => {
    try {
      await submitResumeForReview(resumeId);
      toast.success("Resume submitted for review!");
      await loadResumes();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit resume");
    }
  };

  const filteredResumes = resumes.filter(
    (r) =>
      r.resumeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quickStats = [
    { label: "Total Resumes", value: stats.total },
    { label: "Drafts", value: stats.draft },
    { label: "Under Review", value: stats.submitted },
    { label: "Approved", value: stats.approved },
  ];

  return (
    <PortalLayout
      sidebar={<PortalSidebar portalType="student" quickStats={quickStats} />}
      headerTitle={`Welcome, ${user?.fullName || "Student"}`}
      headerSubtitle="Manage your resume submissions"
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadResumes} disabled={isLoading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateDraft} disabled={isCreating} className="gradient-primary">
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  New Draft
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { status: "draft" as ResumeStatus, count: stats.draft, label: "Drafts" },
            { status: "submitted" as ResumeStatus, count: stats.submitted, label: "Under Review" },
            { status: "changes_required" as ResumeStatus, count: stats.changesRequired, label: "Changes Needed" },
            { status: "approved" as ResumeStatus, count: stats.approved, label: "Approved" },
          ].map((item) => (
            <Card key={item.status} className="border-border/50">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
                <StatusBadge status={item.status} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resume List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your resumes...</p>
          </div>
        ) : filteredResumes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No resumes yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first resume draft to get started
              </p>
              <Button onClick={handleCreateDraft} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Draft
              </Button>
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
                          Updated: {new Date(resume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={resume.status} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExpand(resume.resumeId)
                        }
                      >
                        {expandedResume === resume.resumeId ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {(resume.status === "draft" || resume.status === "changes_required") && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(resume.resumeId)}
                        className="gradient-primary"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Submit for Review
                      </Button>
                    )}
                    {resume.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExpand(resume.resumeId)
                        }
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload File
                      </Button>
                    )}
                  </div>

                  {/* Expandable Section */}
                  {expandedResume === resume.resumeId && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-6">
                      {/* Upload */}
                      {(resume.status === "draft" || resume.status === "changes_required") && (
                        <div>
                          <h4 className="text-sm font-medium mb-3">Upload Resume File</h4>
                          <FileUpload
                            resumeId={resume.resumeId}
                            onUploadComplete={async () => {
                              toast.success("File uploaded successfully!");
                              await loadResumes();
                            }}
                            onError={(error) => toast.error(error)}
                          />
                        </div>
                      )}

                      {/* Version History */}
                      <VersionHistory
                        resumeId={resume.resumeId}
                        currentVersionId={resume.currentVersionId}
                      />

                      {/* Feedback from Staff */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Staff Feedback
                        </h4>
                        {feedbackList[resume.resumeId] &&
                          feedbackList[resume.resumeId].length > 0 ? (
                          <div className="space-y-2">
                            {feedbackList[resume.resumeId].map(
                              (fb: any, i: number) => (
                                <div
                                  key={fb.feedbackId || i}
                                  className="p-3 rounded-lg bg-muted/50 text-sm border border-border/30"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-xs text-primary">
                                      {fb.staffName || "Career Staff"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(fb.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-foreground">{fb.content}</p>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No feedback yet
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Template Gallery */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <TemplateGallery isAdmin={false} />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
