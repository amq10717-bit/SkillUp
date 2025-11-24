// src/utils/cloudinary.js
export const uploadToCloudinarySigned = async (file, folder = "assignments") => {
    try {
        console.log('🚀 Starting Cloudinary upload process...');
        console.log('📁 File details:', {
            name: file.name,
            type: file.type,
            size: file.size,
            folder: folder
        });

        const baseURL = import.meta.env.VITE_API_BASE_URL;

        // If backend URL is defined, try to get signature from backend
        if (baseURL && baseURL !== 'undefined') {
            try {
                console.log('🔍 Getting signature from backend...');
                const signatureResponse = await fetch(`${baseURL}/api/cloudinary-signature`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (signatureResponse.ok) {
                    const signatureData = await signatureResponse.json();
                    console.log('✅ Signature received from backend');

                    if (signatureData.timestamp && signatureData.signature && signatureData.apiKey && signatureData.cloudName) {
                        return await uploadWithSignature(file, folder, signatureData);
                    }
                }
            } catch (backendError) {
                console.warn('❌ Backend signature failed, using direct upload:', backendError.message);
            }
        }

        // Fallback to direct upload with environment variables
        console.log('🔄 Using direct upload with env credentials');
        return await uploadToCloudinaryDirect(file, folder);

    } catch (error) {
        console.error("❌ Cloudinary upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
    }
};

// Upload with backend signature
const uploadWithSignature = async (file, folder, signatureData) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signatureData.apiKey);
    formData.append("timestamp", signatureData.timestamp);
    formData.append("signature", signatureData.signature);
    formData.append("folder", folder || "assignments");

    // Set resource type based on file type
    if (file.type === 'application/pdf') {
        formData.append("resource_type", "raw");
    } else if (file.type.startsWith('image/')) {
        formData.append("resource_type", "image");
    } else if (file.type.startsWith('video/')) {
        formData.append("resource_type", "video");
    } else {
        formData.append("resource_type", "auto");
    }

    console.log('📤 Uploading to Cloudinary with signature...');

    const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/auto/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Cloudinary upload failed:', uploadResponse.status, errorText);
        throw new Error(`Cloudinary upload failed: ${uploadResponse.status}`);
    }

    const data = await uploadResponse.json();
    console.log('✅ Cloudinary upload successful:', {
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type,
        format: data.format,
        bytes: data.bytes
    });

    return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        format: data.format,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        resource_type: data.resource_type,
        original_filename: data.original_filename,
        created_at: data.created_at
    };
};

// Direct upload with environment variables
const uploadToCloudinaryDirect = async (file, folder = "assignments") => {
    console.log('🔄 Using direct upload with environment credentials');

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

    if (!cloudName) {
        throw new Error("Cloudinary cloud name not configured");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    // Add API key if available (for signed uploads)
    if (apiKey) {
        formData.append("api_key", apiKey);
    }

    // Set resource type
    if (file.type === 'application/pdf') {
        formData.append("resource_type", "raw");
    } else if (file.type.startsWith('image/')) {
        formData.append("resource_type", "image");
    } else if (file.type.startsWith('video/')) {
        formData.append("resource_type", "video");
    }

    console.log('📤 Uploading to Cloudinary direct:', {
        cloudName: cloudName,
        folder: folder,
        fileType: file.type,
        fileSize: file.size,
        uploadPreset: uploadPreset
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
        console.error('❌ Cloudinary direct upload failed:', uploadResponse.status, errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const data = await uploadResponse.json();
    console.log('✅ Direct upload successful:', {
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type
    });

    return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        format: data.format,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        resource_type: data.resource_type,
        original_filename: data.original_filename,
        created_at: data.created_at
    };
};

// Alias for backward compatibility
export const uploadToCloudinary = uploadToCloudinarySigned;

// Get optimized image URL for display
export const getOptimizedImageUrl = (publicId, options = {}) => {
    const { width = 800, height, quality = 'auto', format = 'auto' } = options;

    let transformation = `q_${quality},f_${format}`;
    if (width) transformation += `,w_${width}`;
    if (height) transformation += `,h_${height}`;

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

export const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// New function to validate file before upload
export const validateFile = (file, options = {}) => {
    const {
        maxSize = 25 * 1024 * 1024, // 25MB default
        allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'text/plain'
        ]
    } = options;

    // Check file size
    if (file.size > maxSize) {
        throw new Error(`File size too large. Maximum size is ${formatFileSize(maxSize)}.`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return true;
};