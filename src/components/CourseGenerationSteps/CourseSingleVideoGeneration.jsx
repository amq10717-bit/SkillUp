import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { uploadToCloudinary } from '../../utils/cloudinary.js';

const CourseSingleVideoGeneration = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    // State
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    // Topic Selection State
    const [selectedTopic, setSelectedTopic] = useState('arrays'); // Default to first option

    // Generation State
    const [generating, setGenerating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [jobId, setJobId] = useState(null);
    const [error, setError] = useState('');

    // Video Handling
    const [videoUrl, setVideoUrl] = useState(null);
    const [localBlobUrl, setLocalBlobUrl] = useState(null);

    const timerRef = useRef(null);

    // Config
    const API_BASE_URL = "https://vyingly-micrologic-darron.ngrok-free.dev";
    const TOTAL_WAIT_TIME_MS = 50000;
    const UPDATE_INTERVAL_MS = 100;

    // Hardcoded Topics List
    const AVAILABLE_TOPICS = [
        { value: 'arrays', label: 'Arrays' },
        { value: 'graphs', label: 'Graphs' },
        { value: 'linked_list', label: 'Linked List' },
        { value: 'queue', label: 'Queue' },
        { value: 'stack', label: 'Stack' },
        { value: 'trees', label: 'Trees' }
    ];

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        };
    }, [localBlobUrl]);

    // 1. Fetch Course
    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    const data = courseDoc.data();
                    setCourse(data);
                    if (data.promotionalVideo) {
                        setVideoUrl(data.promotionalVideo);
                    }
                } else {
                    setError('Course not found');
                }
            } catch (err) {
                console.error('Error fetching course:', err);
                setError('Failed to load course details');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId]);

    // --- Dynamic Status Messages ---
    const getStatusMessage = () => {
        if (generating) return "Connecting to AI Engine...";
        if (uploading) return "Uploading to Cloud Storage & Saving...";

        if (processing) {
            if (progress < 15) return "Initializing AI Model...";
            if (progress < 35) return "Scripting & Scene Analysis...";
            if (progress < 60) return "Synthesizing Voiceover...";
            if (progress < 85) return "Generating Visual Assets...";
            return "Rendering Final Video...";
        }
        return "Ready";
    };

    // 2. Start Generation Process
    const handleGenerateVideo = async () => {
        if (!selectedTopic) return;

        setGenerating(true);
        setError('');
        setLocalBlobUrl(null);
        setVideoUrl(null);
        setJobId(null);
        setProcessing(false);
        setUploading(false);
        setProgress(0);

        try {
            const topicEncoded = encodeURIComponent(selectedTopic);
            const endpoint = `${API_BASE_URL}/api/generate?topic=${topicEncoded}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: selectedTopic,
                    courseId: courseId
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

            const data = await response.json();

            if (data && data.job_id) {
                setJobId(data.job_id);
                setGenerating(false);
                setProcessing(true);
                startProgressBar(data.job_id);
            } else {
                throw new Error("Invalid response format from server");
            }

        } catch (err) {
            console.error('Generation failed:', err);
            setError('Failed to contact generation server.');
            setGenerating(false);
        }
    };

    const startProgressBar = (currentJobId) => {
        const increment = 100 / (TOTAL_WAIT_TIME_MS / UPDATE_INTERVAL_MS);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev + increment;
                if (newProgress >= 100) {
                    clearInterval(timerRef.current);
                    setTimeout(() => downloadAndUpload(currentJobId), 500);
                    return 100;
                }
                return newProgress;
            });
        }, UPDATE_INTERVAL_MS);
    };

    // 3. Download -> Upload -> Save
    const downloadAndUpload = async (currentJobId) => {
        setProcessing(false);
        setUploading(true);

        const rawUrl = `${API_BASE_URL}/download/${currentJobId}`;

        try {
            // A. Fetch Blob
            const response = await fetch(rawUrl, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });

            if (!response.ok) throw new Error("Failed to download generated video");

            const blob = await response.blob();
            const localUrl = URL.createObjectURL(blob);
            setLocalBlobUrl(localUrl);

            // B. Cloudinary Upload
            const filename = `course_${courseId}_promo_${Date.now()}.mp4`;
            const file = new File([blob], filename, { type: 'video/mp4' });

            const uploadResult = await uploadToCloudinary(file, 'course_promos');

            if (!uploadResult || !uploadResult.secure_url) {
                throw new Error("Cloudinary upload failed");
            }

            // C. Save to Firebase
            await updateDoc(doc(db, 'courses', courseId), {
                promotionalVideo: uploadResult.secure_url,
                videoGeneratedAt: new Date(),
                creationStep: 'completed'
            });

            setVideoUrl(uploadResult.secure_url);

        } catch (err) {
            console.error("Upload/Save workflow failed:", err);
            setError(`Error saving video: ${err.message}.`);
        } finally {
            setUploading(false);
        }
    };

    // 4. Skip / Finish Logic
    const handleFinish = async () => {
        setUploading(true);
        try {
            // If we have a video, it's already saved.
            // If we don't, we just mark the course as complete.
            await updateDoc(doc(db, 'courses', courseId), {
                creationStep: 'completed',
                updatedAt: new Date()
            });
            navigate('/tutor-dashboard');
        } catch (err) {
            console.error('Error finishing course:', err);
            alert('Failed to update course status.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-[#6c5dd3] mb-4"></i>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-4 lg:p-6 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-xl lg:text-2xl font-bold">Course Video Generation</h1>
                                <p className="text-blue-100 text-sm mt-1">Course: {course?.title}</p>
                            </div>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-white/30">
                                Optional Step
                            </span>
                        </div>
                    </div>

                    <div className="p-6 lg:p-8">
                        {error && (
                            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 rounded-lg">
                                <p><i className="fas fa-exclamation-circle mr-2"></i>{error}</p>
                            </div>
                        )}

                        <div className="text-center">

                            {/* 1. SELECTION & IDLE STATE */}
                            {!videoUrl && !localBlobUrl && !generating && !processing && !uploading && (
                                <div className="py-8 animate-fade-in">
                                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <i className="fas fa-video text-3xl text-[#6c5dd3]"></i>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Generate Promotional Video</h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                        Select a core topic to generate a specialized 3D-style explanation video.
                                    </p>

                                    {/* TOPIC SELECTION DROPDOWN */}
                                    <div className="max-w-xs mx-auto mb-8 text-left">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Video Topic
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedTopic}
                                                onChange={(e) => setSelectedTopic(e.target.value)}
                                                className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-[#6c5dd3] focus:border-[#6c5dd3] sm:text-sm rounded-xl border bg-gray-50 hover:bg-white transition shadow-sm"
                                            >
                                                {AVAILABLE_TOPICS.map((topic) => (
                                                    <option key={topic.id} value={topic.value}>
                                                        {topic.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                                                <i className="fas fa-chevron-down text-xs"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <button
                                            onClick={handleGenerateVideo}
                                            className="bg-[#6c5dd3] text-white px-8 py-3 rounded-xl hover:bg-[#5a4bbf] transition shadow-lg flex items-center justify-center gap-2 text-lg font-semibold"
                                        >
                                            <i className="fas fa-magic"></i>
                                            Generate Video
                                        </button>

                                        <button
                                            onClick={handleFinish}
                                            className="px-8 py-3 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition font-semibold"
                                        >
                                            Skip This Step
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 2. LOADING / PROCESSING STATES */}
                            {(generating || processing || uploading) && (
                                <div className="py-12 px-4 sm:px-12 animate-fade-in">
                                    <div className="mb-8">
                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                            {uploading ? (
                                                <i className="fas fa-cloud-upload-alt text-3xl text-[#6c5dd3]"></i>
                                            ) : (
                                                <i className="fas fa-cogs text-3xl text-[#6c5dd3]"></i>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                                            {uploading ? "Finalizing..." : "Creating Your Video"}
                                        </h3>
                                        <p className="text-[#6c5dd3] font-medium h-6">
                                            {getStatusMessage()}
                                        </p>
                                    </div>

                                    <div className="relative pt-1 max-w-lg mx-auto">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#6c5dd3] bg-purple-100">
                                                    {uploading ? "Saving" : "Processing"}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-[#6c5dd3]">
                                                    {uploading ? 100 : Math.round(progress)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200">
                                            <div
                                                style={{ width: uploading ? '100%' : `${progress}%` }}
                                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] transition-all duration-300 ease-out ${uploading ? 'animate-pulse' : ''}`}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. FINAL SUCCESS STATE */}
                            {(videoUrl || localBlobUrl) && !processing && !uploading && !generating && (
                                <div className="animate-fade-in">
                                    <div className="bg-black rounded-xl overflow-hidden shadow-2xl mx-auto max-w-2xl w-full">
                                        <video
                                            controls
                                            className="w-full h-auto min-h-[300px] object-contain bg-black"
                                            src={videoUrl || localBlobUrl}
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>

                                    <div className="mt-6 flex flex-col items-center gap-4">
                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                                            <i className="fas fa-check-circle"></i>
                                            <span className="font-medium">Video Generated & Saved!</span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setVideoUrl(null);
                                                setLocalBlobUrl(null);
                                            }}
                                            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
                                        >
                                            <i className="fas fa-redo"></i>
                                            Create Different Video
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Navigation Footer */}
                        <div className="flex justify-between items-center pt-8 border-t mt-8">
                            <button
                                onClick={() => navigate(`/add-course/module-details/${courseId}`)}
                                disabled={processing || uploading}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-600 disabled:opacity-50"
                            >
                                <i className="fas fa-arrow-left mr-2"></i>
                                Back
                            </button>

                            <button
                                // Enabled if:
                                // 1. Video exists (User wants to finish with video)
                                // 2. Video DOESN'T exist (User wants to skip/finish without video)
                                // Disabled only during active processing
                                disabled={processing || uploading}
                                onClick={handleFinish}
                                className={`px-8 py-3 text-white rounded-lg font-medium shadow-md transition flex items-center gap-2 ${videoUrl
                                    ? "bg-[#4CBC9A] hover:bg-[#3aa384]"
                                    : "bg-gray-600 hover:bg-gray-700"
                                    }`}
                            >
                                {videoUrl ? "Finish Course" : "Skip & Finish"}
                                <i className={`fas ${videoUrl ? "fa-check" : "fa-forward"}`}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseSingleVideoGeneration;