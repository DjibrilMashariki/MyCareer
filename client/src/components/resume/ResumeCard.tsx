import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Calendar, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ResumeStatus = "draft" | "submitted" | "changes_required" | "approved";

interface Resume {
  resumeId: string;
  studentId: string;
  status: ResumeStatus;
  assignedStaffId?: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResumeCardProps {
  resume: Resume;
  showActions?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function ResumeCard({ resume, showActions, actions, className }: ResumeCardProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-shadow duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Resume #{resume.resumeId.slice(0, 8)}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <User className="w-3.5 h-3.5" />
              Student: {resume.studentId}
            </p>
          </div>
          <StatusBadge status={resume.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {resume.assignedStaffId && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Assigned to: <span className="text-foreground font-medium">{resume.assignedStaffId}</span></span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Created: {new Date(resume.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Updated: {new Date(resume.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        {showActions && actions && (
          <div className="mt-4 pt-4 border-t border-border">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
