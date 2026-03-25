import { useState, useEffect, useRef } from "react";
import {
    FileText,
    Download,
    Upload,
    Trash2,
    FileType,
    X,
    Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
    getTemplates,
    uploadTemplate,
    downloadTemplate,
    deleteTemplate,
} from "../../lib/api";

interface Template {
    id: string;
    name: string;
    description: string;
    filePath: string;
    originalFilename: string;
    fileSizeBytes: number;
    uploadedBy: string;
    createdAt: string;
}

interface TemplateGalleryProps {
    isAdmin?: boolean;
}

export function TemplateGallery({ isAdmin = false }: TemplateGalleryProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadName, setUploadName] = useState("");
    const [uploadDesc, setUploadDesc] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            setIsLoading(true);
            const data = await getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error("Failed to load templates:", err);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleUpload() {
        if (!uploadFile || !uploadName.trim()) {
            toast.error("Please provide a name and select a file");
            return;
        }

        try {
            setUploading(true);
            await uploadTemplate(uploadName.trim(), uploadDesc.trim(), uploadFile);
            toast.success("Template uploaded successfully");
            setShowUpload(false);
            setUploadName("");
            setUploadDesc("");
            setUploadFile(null);
            loadTemplates();
        } catch (err: any) {
            toast.error(err.message || "Failed to upload template");
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(templateId: string, name: string) {
        if (!confirm(`Delete template "${name}"?`)) return;
        try {
            await deleteTemplate(templateId);
            toast.success("Template deleted");
            loadTemplates();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete template");
        }
    }

    async function handleDownload(templateId: string) {
        const url = await downloadTemplate(templateId);
        window.open(url, "_blank");
    }

    const formatSize = (bytes: number) => {
        if (!bytes) return "—";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split(".").pop()?.toLowerCase();
        if (ext === "pdf") return "📄";
        if (ext === "docx" || ext === "doc") return "📝";
        return "📎";
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Loading templates...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileType className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Resume Templates</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {templates.length}
                    </span>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showUpload
                                ? "bg-red-500/10 text-red-500"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                    >
                        {showUpload ? (
                            <>
                                <X className="w-3.5 h-3.5" /> Cancel
                            </>
                        ) : (
                            <>
                                <Plus className="w-3.5 h-3.5" /> Upload Template
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Upload form (admin only) */}
            {showUpload && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <input
                        type="text"
                        placeholder="Template name *"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-dashed border-input rounded-lg hover:bg-muted transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            {uploadFile ? uploadFile.name : "Choose file..."}
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={uploading || !uploadFile || !uploadName.trim()}
                            className="ml-auto px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </div>
            )}

            {/* Template grid */}
            {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No templates available yet</p>
                    {isAdmin && (
                        <p className="text-xs mt-1 opacity-70">
                            Upload resume templates for students to use
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getFileIcon(template.originalFilename)}</span>
                                    <div>
                                        <h4 className="text-sm font-semibold line-clamp-1">{template.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSize(template.fileSizeBytes)}
                                        </p>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(template.id, template.name)}
                                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete template"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            {template.description && (
                                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                    {template.description}
                                </p>
                            )}
                            <button
                                onClick={() => handleDownload(template.id)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
