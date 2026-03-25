import { useState, useEffect, useRef } from "react";
import {
    FileText,
    MessageSquarePlus,
    Trash2,
    X,
    Send,
    MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { getAnnotations, createAnnotation, deleteAnnotation } from "../../lib/api";

interface Annotation {
    id: string;
    resumeId: string;
    staffId: string;
    staffName?: string;
    pageNumber: number;
    xPosition: number;
    yPosition: number;
    content: string;
    createdAt: string;
}

interface ResumeViewerProps {
    resumeId: string;
    fileUrl?: string;
    userRole: "student" | "staff" | "admin";
    currentUserId?: string;
}

export function ResumeViewer({
    resumeId,
    fileUrl,
    userRole,
    currentUserId,
}: ResumeViewerProps) {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
    const [newAnnotation, setNewAnnotation] = useState({ x: 0, y: 0, content: "" });
    const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    const canAnnotate = userRole === "staff" || userRole === "admin";

    useEffect(() => {
        loadAnnotations();
    }, [resumeId]);

    async function loadAnnotations() {
        try {
            setIsLoading(true);
            const data = await getAnnotations(resumeId);
            setAnnotations(data);
        } catch (err) {
            console.error("Failed to load annotations:", err);
        } finally {
            setIsLoading(false);
        }
    }

    function handleViewerClick(e: React.MouseEvent<HTMLDivElement>) {
        if (!canAnnotate || !isAddingAnnotation) return;

        const rect = viewerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setNewAnnotation({ x, y, content: "" });
    }

    async function handleSubmitAnnotation() {
        if (!newAnnotation.content.trim()) {
            toast.error("Annotation content is required");
            return;
        }

        try {
            await createAnnotation(resumeId, {
                pageNumber: 1,
                xPosition: newAnnotation.x,
                yPosition: newAnnotation.y,
                content: newAnnotation.content.trim(),
            });
            toast.success("Annotation added");
            setIsAddingAnnotation(false);
            setNewAnnotation({ x: 0, y: 0, content: "" });
            loadAnnotations();
        } catch (err: any) {
            toast.error(err.message || "Failed to add annotation");
        }
    }

    async function handleDeleteAnnotation(annotationId: string) {
        try {
            await deleteAnnotation(resumeId, annotationId);
            toast.success("Annotation deleted");
            setSelectedAnnotation(null);
            loadAnnotations();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete annotation");
        }
    }

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Resume Viewer</span>
                    <span className="text-xs text-muted-foreground">
                        ({annotations.length} annotation{annotations.length !== 1 ? "s" : ""})
                    </span>
                </div>
                {canAnnotate && (
                    <button
                        onClick={() => {
                            setIsAddingAnnotation(!isAddingAnnotation);
                            setNewAnnotation({ x: 0, y: 0, content: "" });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isAddingAnnotation
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                    >
                        {isAddingAnnotation ? (
                            <>
                                <X className="w-3.5 h-3.5" /> Cancel
                            </>
                        ) : (
                            <>
                                <MessageSquarePlus className="w-3.5 h-3.5" /> Add Annotation
                            </>
                        )}
                    </button>
                )}
            </div>

            {isAddingAnnotation && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-700">
                    Click anywhere on the document below to place an annotation marker.
                </div>
            )}

            {/* Document viewer area */}
            <div
                ref={viewerRef}
                onClick={handleViewerClick}
                className={`relative border border-border rounded-xl overflow-hidden bg-white min-h-[400px] ${isAddingAnnotation ? "cursor-crosshair" : ""
                    }`}
                style={{ aspectRatio: "8.5 / 11" }}
            >
                {/* PDF/Image preview */}
                {fileUrl ? (
                    <iframe
                        src={fileUrl}
                        className="w-full h-full absolute inset-0"
                        title="Resume document"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center space-y-2">
                            <FileText className="w-12 h-12 mx-auto opacity-30" />
                            <p className="text-sm">No document uploaded yet</p>
                            <p className="text-xs opacity-60">Upload a resume to enable annotations</p>
                        </div>
                    </div>
                )}

                {/* Annotation markers */}
                {annotations.map((ann) => (
                    <button
                        key={ann.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnnotation(selectedAnnotation?.id === ann.id ? null : ann);
                        }}
                        className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 group"
                        style={{ left: `${ann.xPosition}%`, top: `${ann.yPosition}%` }}
                        title={ann.content}
                    >
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all ${selectedAnnotation?.id === ann.id
                                    ? "bg-primary text-white scale-125"
                                    : "bg-amber-500 text-white hover:scale-110"
                                }`}
                        >
                            <MapPin className="w-3.5 h-3.5" />
                        </div>
                    </button>
                ))}

                {/* New annotation placement */}
                {isAddingAnnotation && newAnnotation.x > 0 && (
                    <div
                        className="absolute z-20 transform -translate-x-1/2 -translate-y-full"
                        style={{ left: `${newAnnotation.x}%`, top: `${newAnnotation.y}%` }}
                    >
                        <div className="bg-popover border border-border rounded-xl shadow-xl p-3 w-64 animate-in zoom-in-95 fade-in-0 duration-200">
                            <textarea
                                value={newAnnotation.content}
                                onChange={(e) =>
                                    setNewAnnotation({ ...newAnnotation, content: e.target.value })
                                }
                                placeholder="Enter your annotation..."
                                className="w-full h-20 px-2.5 py-2 text-sm border border-input rounded-lg resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => setNewAnnotation({ x: 0, y: 0, content: "" })}
                                    className="px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitAnnotation}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Send className="w-3 h-3" /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Selected annotation detail */}
            {selectedAnnotation && (
                <div className="bg-card border border-border rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                    {selectedAnnotation.staffName || "Staff"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {timeAgo(selectedAnnotation.createdAt)}
                                </span>
                            </div>
                            <p className="text-sm text-foreground">{selectedAnnotation.content}</p>
                        </div>
                        {(selectedAnnotation.staffId === currentUserId || userRole === "admin") && (
                            <button
                                onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Delete annotation"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Annotations list */}
            {annotations.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        All Annotations
                    </h4>
                    <div className="space-y-1.5">
                        {annotations.map((ann) => (
                            <button
                                key={ann.id}
                                onClick={() => setSelectedAnnotation(ann)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedAnnotation?.id === ann.id
                                        ? "bg-primary/10 border border-primary/20"
                                        : "hover:bg-muted border border-transparent"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-xs">
                                        {ann.staffName || "Staff"} — Page {ann.pageNumber}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {timeAgo(ann.createdAt)}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {ann.content}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading annotations...
                </div>
            )}
        </div>
    );
}
