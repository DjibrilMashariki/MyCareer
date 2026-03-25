import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
    resumeId: string;
    onUploadComplete?: (version: any) => void;
    onError?: (error: string) => void;
    className?: string;
    disabled?: boolean;
}

export function FileUpload({
    resumeId,
    onUploadComplete,
    onError,
    className,
    disabled = false,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    const validateFile = (file: File): string | null => {
        if (!allowedTypes.includes(file.type)) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (!["pdf", "docx", "doc"].includes(ext || "")) {
                return "Only PDF and DOCX files are accepted";
            }
        }
        if (file.size > maxSize) {
            return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 10MB limit`;
        }
        return null;
    };

    const handleFile = useCallback(
        (file: File) => {
            const error = validateFile(file);
            if (error) {
                onError?.(error);
                return;
            }
            setSelectedFile(file);
            setUploadStatus("idle");
        },
        [onError]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !resumeId) return;

        setIsUploading(true);
        setUploadStatus("uploading");
        setUploadProgress(0);

        try {
            const token = localStorage.getItem("mycareer_token");
            const formData = new FormData();
            formData.append("file", selectedFile);

            // Simulate progress (real progress would need XMLHttpRequest)
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await fetch(`/api/resumes/${resumeId}/upload`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
                throw new Error(errorData.error || "Upload failed");
            }

            const version = await response.json();
            setUploadProgress(100);
            setUploadStatus("success");
            onUploadComplete?.(version);
        } catch (error: any) {
            setUploadStatus("error");
            onError?.(error.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setUploadStatus("idle");
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    return (
        <div className={cn("space-y-3", className)}>
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                    isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/30",
                    disabled && "opacity-50 cursor-not-allowed",
                    uploadStatus === "success" && "border-green-500/50 bg-green-500/5"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled}
                />

                {uploadStatus === "success" ? (
                    <div className="space-y-2">
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                        <p className="text-sm font-medium text-green-600">
                            File uploaded successfully!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                            <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {isDragging ? "Drop your file here" : "Drag & drop your resume"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                PDF or DOCX, up to 10MB
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Selected File */}
            {selectedFile && uploadStatus !== "success" && (
                <Card className="p-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedFile.size)}
                            </p>
                        </div>
                        {!isUploading && (
                            <button
                                onClick={handleRemoveFile}
                                className="p-1 hover:bg-muted rounded-md transition-colors"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Progress */}
                    {isUploading && (
                        <div className="mt-3 space-y-1">
                            <Progress value={uploadProgress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground text-right">
                                {uploadProgress}%
                            </p>
                        </div>
                    )}

                    {uploadStatus === "error" && (
                        <div className="mt-3 flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <p className="text-xs">Upload failed. Please try again.</p>
                        </div>
                    )}
                </Card>
            )}

            {/* Upload Button */}
            {selectedFile && uploadStatus !== "success" && (
                <Button
                    onClick={handleUpload}
                    disabled={isUploading || disabled}
                    className="w-full gradient-primary"
                >
                    {isUploading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Uploading...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload Resume
                        </div>
                    )}
                </Button>
            )}
        </div>
    );
}
