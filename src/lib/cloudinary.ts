import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

export async function uploadFile(
  file: File,
  folder: string = "chat-attachments"
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

export function getPublicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;
    let rest = parts.slice(uploadIndex + 1);
    if (/^v\d+$/.test(rest[0])) rest = rest.slice(1);
    let publicPath = rest.join('/');
    publicPath = publicPath.replace(/\.[^/.]+$/, '');
    return decodeURIComponent(publicPath);
  } catch {
    return null;
  }
}

export async function deleteFile(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // silently fail - file might already be gone
  }
}

export async function deleteFiles(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch {
    // silently fail
  }
}
