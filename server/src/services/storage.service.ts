import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";
import fs from "fs";
import path from "path";

const BUCKET_NAME = "resume-files";

/**
 * Upload a file to Supabase Storage.
 * In demo mode, moves the file to a local directory instead.
 */
export async function uploadFile(
    userId: string,
    resumeId: string,
    versionId: string,
    filePath: string,
    originalFilename: string
): Promise<string> {
    // Storage path: userId/resumeId/versionId-filename
    const ext = path.extname(originalFilename);
    const storagePath = `${userId}/${resumeId}/${versionId}${ext}`;

    if (!isSupabaseConfigured()) {
        // Demo mode: store locally
        const demoDir = path.join(__dirname, "../../uploads/stored", userId, resumeId);
        if (!fs.existsSync(demoDir)) {
            fs.mkdirSync(demoDir, { recursive: true });
        }
        const destPath = path.join(demoDir, `${versionId}${ext}`);
        fs.copyFileSync(filePath, destPath);
        return storagePath;
    }

    // Read the file and upload to Supabase Storage
    const fileBuffer = fs.readFileSync(filePath);
    const { error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
            contentType: getMimeType(originalFilename),
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    return storagePath;
}

/**
 * Get a signed URL for downloading a file.
 * Valid for 1 hour.
 */
export async function getFileUrl(storagePath: string): Promise<string> {
    if (!isSupabaseConfigured()) {
        // Demo mode: return local file path
        return `/api/files/${encodeURIComponent(storagePath)}`;
    }

    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
        throw new Error(`Failed to generate download URL: ${error?.message}`);
    }

    return data.signedUrl;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
    if (!isSupabaseConfigured()) {
        const localPath = path.join(__dirname, "../../uploads/stored", storagePath);
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }
        return;
    }

    const { error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

    if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}

/**
 * Get the local file path for demo mode downloads.
 */
export function getLocalFilePath(storagePath: string): string {
    return path.join(__dirname, "../../uploads/stored", storagePath);
}

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case ".pdf":
            return "application/pdf";
        case ".docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case ".doc":
            return "application/msword";
        default:
            return "application/octet-stream";
    }
}
