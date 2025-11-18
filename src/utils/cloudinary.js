// src/utils/cloudinary.js
export const uploadToCloudinarySigned = async (file, folder = "chat_media") => {
    try {
        // ✅ Works in Vite
        const baseURL = import.meta.env.VITE_API_BASE_URL;

        if (!baseURL) {
            throw new Error("VITE_API_BASE_URL is not defined in environment variables");
        }

        console.log('Fetching Cloudinary signature from:', `${baseURL}/api/cloudinary-signature`);

        const response = await fetch(`${baseURL}/api/cloudinary-signature`);

        if (!response.ok) {
            throw new Error(`Failed to get signature from backend: ${response.status} ${response.statusText}`);
        }

        const signatureData = await response.json();
        console.log('Signature data received:', signatureData);

        const { timestamp, signature, apiKey, cloudName, folder: signedFolder } = signatureData;

        // Validate required fields
        if (!timestamp || !signature || !apiKey || !cloudName) {
            throw new Error("Invalid signature data received from server");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);
        // Use the folder parameter passed to the function, fallback to signed folder or "chat_media"
        formData.append("folder", folder || signedFolder || "chat_media");

        console.log('Uploading to Cloudinary...', {
            cloudName: cloudName,
            folder: folder || signedFolder || "chat_media",
            fileType: file.type,
            fileSize: file.size
        });

        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Cloudinary upload failed:', uploadResponse.status, errorText);
            throw new Error(`Cloudinary upload failed: ${uploadResponse.status} ${errorText}`);
        }

        const data = await uploadResponse.json();
        console.log('Cloudinary upload successful:', data);

        return {
            url: data.secure_url,
            publicId: data.public_id,
            format: data.format,
            bytes: data.bytes,
            width: data.width,
            height: data.height,
            resourceType: data.resource_type,
            originalFilename: data.original_filename,
            createdAt: data.created_at
        };
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error;
    }
};

// Alias for backward compatibility
export const uploadToCloudinary = uploadToCloudinarySigned;

// Get optimized image URL for display
export const getOptimizedImageUrl = (publicId, options = {}) => {
    const { width = 800, height, quality = 'auto', format = 'auto' } = options;

    let transformation = `q_${quality},f_${format}`;
    if (width) transformation += `,w_${width}`;
    if (height) transformation += `,h_${height}`;

    // You'll need to set VITE_CLOUDINARY_CLOUD_NAME in your .env file
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
        console.warn('VITE_CLOUDINARY_CLOUD_NAME is not defined in environment variables');
        return null;
    }

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
};

// Helper functions for file handling
export const isImageFile = (file) => {
    return file.type.startsWith('image/');
};

export const isVideoFile = (file) => {
    return file.type.startsWith('video/');
};

export const getFileCategory = (file) => {
    if (isImageFile(file)) return 'image';
    if (isVideoFile(file)) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('document') || file.type.includes('msword') || file.type.includes('wordprocessing')) return 'document';
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'spreadsheet';
    if (file.type.includes('presentation') || file.type.includes('powerpoint')) return 'presentation';
    return 'file';
};

// Format file size for display
export const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};