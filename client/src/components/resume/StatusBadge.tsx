import { cn } from "@/lib/utils";
import { FileEdit, Send, AlertTriangle, CheckCircle } from "lucide-react";

type ResumeStatus = "draft" | "submitted" | "changes_required" | "approved";

interface StatusBadgeProps {
  status: ResumeStatus;
  className?: string;
}

const statusConfig = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className: "status-draft"
  },
  submitted: {
    label: "Submitted",
    icon: Send,
    className: "status-submitted"
  },
  changes_required: {
    label: "Changes Required",
    icon: AlertTriangle,
    className: "status-changes"
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "status-approved"
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
        config.className,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
