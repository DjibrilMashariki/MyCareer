import { useState, useEffect } from "react";
import { FileText, Download, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getResumeVersions, getDownloadUrl } from "@/lib/api";

interface Version {
    versionId: string;
    resumeId: string;
    versionNumber: number;
    filename: string;
    fileSize?: number;
    uploadedAt: string;
}

interface VersionHistoryProps {
    resumeId: string;
    currentVersionId?: string;
    className?: string;
}

export function VersionHistory({
    resumeId,
    currentVersionId,
    className,
}: VersionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        loadVersions();
    }, [resumeId]);

    const loadVersions = async () => {
        try {
            setIsLoading(true);
            const data = await getResumeVersions(resumeId);
            setVersions(data);
        } catch (error) {
            console.error("Failed to load versions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (versionId: string, filename: string) => {
        try {
            setDownloadingId(versionId);
            const { downloadUrl } = await getDownloadUrl(resumeId, versionId);
            // Open download in new tab
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Download failed:", error);
        } finally {
            setDownloadingId(null);
        }
    };

    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    if (isLoading) {
        return (
            <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-3", className)}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading versions...
            </div>
        );
    }

    if (versions.length === 0) {
        return (
            <div className={cn("text-sm text-muted-foreground py-3", className)}>
                <p className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    No file versions uploaded yet
                </p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-2", className)}>
            <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Version History ({versions.length})
            </h4>
            <div className="space-y-1.5">
                {versions.map((version) => {
                    const isCurrent = version.versionId === currentVersionId;
                    return (
                        <div
                            key={version.versionId}
                            className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                isCurrent
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-border/50 hover:bg-muted/30"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                                        isCurrent
                                            ? "bg-primary/10 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    v{version.versionNumber}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">
                                            {version.filename}
                                        </p>
                                        {isCurrent && (
                                            <span className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(version.uploadedAt).toLocaleString()}
                                        {version.fileSize ? ` • ${formatFileSize(version.fileSize)}` : ""}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(version.versionId, version.filename)}
                                disabled={downloadingId === version.versionId}
                                className="shrink-0 ml-2"
                            >
                                {downloadingId === version.versionId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
