import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { generateModuleVideo, getVideoUrl } from '../../services/videoService.js';
import { testBackendConnection, checkBackendStatus } from '../../services/videoServiceDebug.js';

const CourseVideoGeneration = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState({});
    const [activeModule, setActiveModule] = useState(0);
    const [modules, setModules] = useState([]);
    const [progress, setProgress] = useState({});
    const [backendStatus, setBackendStatus] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initialize = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check backend status first
                const status = await checkBackendStatus();
                setBackendStatus(status);
                console.log("🔍 Backend Status:", status);

                // Then fetch course data
                await fetchCourse();
            } catch (err) {
                console.error('Initialization error:', err);
                setError('Failed to initialize video generation');
                setLoading(false);
            }
        };

        const fetchCourse = async () => {
            try {
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    setCourse(courseData);
                    setModules(courseData.modules || []);
                } else {
                    setError('Course not found');
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                setError('Failed to load course data');
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, [courseId]);

    const testBackend = async () => {
        setProgress(prev => ({ ...prev, test: 'Testing backend connection...' }));
        try {
            const result = await testBackendConnection();
            setBackendStatus(result);
            setProgress(prev => ({ ...prev, test: result.success ? 'Backend is working!' : `Backend error: ${result.error}` }));
        } catch (err) {
            setProgress(prev => ({ ...prev, test: `Test failed: ${err.message}` }));
        }

        setTimeout(() => {
            setProgress(prev => ({ ...prev, test: '' }));
        }, 5000);
    };

    const generateVideoForModule = async (moduleIndex) => {
        if (!course || !modules[moduleIndex]) return;

        setGenerating(prev => ({ ...prev, [moduleIndex]: true }));
        setProgress(prev => ({ ...prev, [moduleIndex]: 'Starting video generation...' }));

        try {
            const module = modules[moduleIndex];
            setProgress(prev => ({ ...prev, [moduleIndex]: 'Calling backend API...' }));

            const videoData = await generateModuleVideo(
                module.title,
                course.title,
                course.description
            );

            if (videoData.isFallback) {
                setProgress(prev => ({ ...prev, [moduleIndex]: 'Using fallback mode (backend unavailable)' }));
            } else {
                setProgress(prev => ({ ...prev, [moduleIndex]: 'Video generated successfully!' }));
            }

            // Update module with video URL
            const updatedModules = modules.map((mod, index) =>
                index === moduleIndex ? {
                    ...mod,
                    videoUrl: videoData.file_path || getVideoUrl(videoData.filename),
                    videoGenerated: true,
                    videoStatus: 'completed',
                    isFallback: videoData.isFallback || false
                } : mod
            );

            setModules(updatedModules);

            // Auto-save to Firestore
            await updateDoc(doc(db, 'courses', courseId), {
                modules: updatedModules,
                updatedAt: new Date()
            });

            setTimeout(() => {
                setProgress(prev => ({ ...prev, [moduleIndex]: '' }));
            }, 3000);

        } catch (error) {
            console.error('Error generating video:', error);
            setProgress(prev => ({ ...prev, [moduleIndex]: `Error: ${error.message}` }));
            alert(`Video generation failed: ${error.message}`);
        } finally {
            setGenerating(prev => ({ ...prev, [moduleIndex]: false }));
        }
    };

    const generateAllVideos = async () => {
        for (let i = 0; i < modules.length; i++) {
            if (!modules[i].videoGenerated) {
                await generateVideoForModule(i);
                // Add delay between generations to avoid overwhelming the backend
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    };

    const saveAndContinue = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'courses', courseId), {
                modules: modules,
                updatedAt: new Date(),
                creationStep: 'completed',
                status: 'published'
            });

            alert('Course completed successfully!');
            navigate('/tutor-dashboard');
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-[#6c5dd3] mb-4"></i>
                    <p className="text-gray-600">Loading course...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !course) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-exclamation-triangle text-3xl text-red-500 mb-4"></i>
                    <p className="text-red-500 text-lg mb-4">{error || 'Course not found'}</p>
                    <button
                        onClick={() => navigate('/tutor-dashboard')}
                        className="bg-[#6c5dd3] text-white px-6 py-2 rounded-lg hover:bg-[#5a4bbf] transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const generatedVideosCount = modules.filter(module => module.videoGenerated).length;
    const totalModules = modules.length;

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-10">
            <div className="max-w-6xl mx-auto px-4">
                {/* Backend Status Alert */}
                {backendStatus && !backendStatus.isRunning && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-exclamation-triangle text-red-600"></i>
                                <div>
                                    <h4 className="font-semibold text-red-800">Backend Not Reachable</h4>
                                    <p className="text-red-700 text-sm">
                                        Video generation backend is not running. Videos will use fallback mode.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={testBackend}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                            >
                                Test Connection
                            </button>
                        </div>
                        {progress.test && (
                            <p className="text-red-600 text-sm mt-2">{progress.test}</p>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-4 lg:p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl lg:text-2xl font-bold">Generate Module Videos</h1>
                                <p className="text-blue-100 mt-2">Step 4: Create AI-generated videos for each module</p>
                                <p className="text-blue-100 text-sm mt-1">Course: {course.title}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-100">{generatedVideosCount}/{totalModules} Videos Generated</p>
                                <p className="text-blue-100 text-sm">Click modules to generate videos</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        {/* Module Navigation */}
                        <div className="lg:w-1/4 border-r border-gray-200 bg-white">
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-gray-800">Course Modules</h3>
                                    {modules.length > 1 && (
                                        <button
                                            onClick={generateAllVideos}
                                            disabled={generatedVideosCount === totalModules || Object.values(generating).some(v => v)}
                                            className="bg-[#4CBC9A] text-white px-3 py-1 rounded text-sm hover:bg-[#3aa384] disabled:opacity-50"
                                        >
                                            Generate All
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {modules.map((module, index) => (
                                        <button
                                            key={module.id || index}
                                            onClick={() => setActiveModule(index)}
                                            className={`w-full text-left p-3 rounded-lg transition ${activeModule === index
                                                ? 'bg-[#6c5dd3] text-white'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeModule === index
                                                    ? 'bg-white text-[#6c5dd3]'
                                                    : module.videoGenerated
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                    {module.videoGenerated ? (
                                                        <i className="fas fa-check text-xs"></i>
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </div>
                                                <span className="font-medium truncate flex-1">
                                                    {module.title || `Module ${index + 1}`}
                                                </span>
                                            </div>
                                            {generating[index] && (
                                                <div className="flex items-center gap-1 text-xs mt-1 text-yellow-200">
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    <span>Generating...</span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Video Generation Panel */}
                        <div className="lg:w-3/4 bg-gray-50">
                            {modules.length > 0 ? (
                                <div className="p-4 lg:p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                                                {modules[activeModule].title || `Module ${activeModule + 1}`}
                                            </h2>
                                            <p className="text-gray-600">Module {activeModule + 1} of {modules.length}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {!modules[activeModule].videoGenerated ? (
                                                <button
                                                    onClick={() => generateVideoForModule(activeModule)}
                                                    disabled={generating[activeModule]}
                                                    className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] disabled:opacity-50 transition flex items-center gap-2"
                                                >
                                                    {generating[activeModule] ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-video"></i>
                                                            Generate Video
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                                    <i className="fas fa-check"></i>
                                                    Video Ready
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Status */}
                                    {progress[activeModule] && (
                                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-info-circle text-blue-600"></i>
                                                <p className="text-blue-800 text-sm">{progress[activeModule]}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Video Preview */}
                                    {modules[activeModule].videoGenerated && modules[activeModule].videoUrl && (
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
                                            <div className="p-4 border-b border-gray-200">
                                                <h3 className="font-semibold text-gray-800">Generated Video Preview</h3>
                                                {modules[activeModule].isFallback && (
                                                    <p className="text-yellow-600 text-sm mt-1">
                                                        Fallback mode - using placeholder video
                                                    </p>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <video
                                                    controls
                                                    className="w-full rounded-lg max-h-96"
                                                    poster="https://via.placeholder.com/960x540/6c5dd3/ffffff?text=Video+Preview"
                                                >
                                                    <source src={modules[activeModule].videoUrl} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        </div>
                                    )}

                                    {/* Video Generation Info */}
                                    {!modules[activeModule].videoGenerated && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                                            <div className="flex items-start gap-3">
                                                <i className="fas fa-lightbulb text-yellow-600 mt-1"></i>
                                                <div>
                                                    <h4 className="font-semibold text-yellow-800 mb-2">AI Video Generation</h4>
                                                    <p className="text-yellow-700 text-sm mb-3">
                                                        Our AI will create an engaging educational video for this module including:
                                                    </p>
                                                    <ul className="text-yellow-700 text-sm space-y-1">
                                                        <li>• Visual content related to "{modules[activeModule].title}"</li>
                                                        <li>• Professional voice-over narration</li>
                                                        <li>• Background music and smooth transitions</li>
                                                        <li>• Duration: 30-60 seconds per module</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation between modules */}
                                    <div className="flex justify-between pt-6 border-t mt-6">
                                        <button
                                            onClick={() => setActiveModule(prev => Math.max(0, prev - 1))}
                                            disabled={activeModule === 0}
                                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition flex items-center gap-2"
                                        >
                                            <i className="fas fa-arrow-left"></i>
                                            Previous Module
                                        </button>
                                        <button
                                            onClick={() => setActiveModule(prev => Math.min(modules.length - 1, prev + 1))}
                                            disabled={activeModule === modules.length - 1}
                                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition flex items-center gap-2"
                                        >
                                            Next Module
                                            <i className="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <i className="fas fa-video text-4xl text-gray-300 mb-4"></i>
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Modules Found</h3>
                                    <p className="text-gray-500 mb-4">This course doesn't have any modules yet.</p>
                                    <button
                                        onClick={() => navigate(`/add-course/modules/${courseId}`)}
                                        className="bg-[#6c5dd3] text-white px-6 py-2 rounded-lg hover:bg-[#5a4bbf] transition"
                                    >
                                        Add Modules First
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-4 p-6 border-t">
                        <button
                            onClick={() => navigate(`/add-course/module-details/${courseId}`)}
                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            <i className="fas fa-arrow-left mr-2"></i>
                            Back to Content
                        </button>

                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <button
                                onClick={() => navigate('/tutor-dashboard')}
                                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
                            >
                                Save as Draft
                            </button>
                            <button
                                onClick={saveAndContinue}
                                disabled={saving || generatedVideosCount === 0}
                                className="flex-1 bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <>
                                        <i className="fas fa-rocket"></i>
                                        Complete Course
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#4CBC9A] text-white rounded-full flex items-center justify-center font-semibold">
                                <i className="fas fa-check"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Course Description</p>
                                <p className="text-sm text-gray-600">Completed</p>
                            </div>
                        </div>

                        <div className="flex-1 h-1 bg-gray-200 mx-4">
                            <div className="h-1 bg-[#4CBC9A] w-full"></div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#4CBC9A] text-white rounded-full flex items-center justify-center font-semibold">
                                <i className="fas fa-check"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Module Organization</p>
                                <p className="text-sm text-gray-600">Completed</p>
                            </div>
                        </div>

                        <div className="flex-1 h-1 bg-gray-200 mx-4">
                            <div className="h-1 bg-[#4CBC9A] w-full"></div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#4CBC9A] text-white rounded-full flex items-center justify-center font-semibold">
                                <i className="fas fa-check"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Content Generation</p>
                                <p className="text-sm text-gray-600">Completed</p>
                            </div>
                        </div>

                        <div className="flex-1 h-1 bg-gray-200 mx-4">
                            <div className="h-1 bg-[#4CBC9A] w-full"></div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#6c5dd3] text-white rounded-full flex items-center justify-center font-semibold">
                                4
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Video Generation</p>
                                <p className="text-sm text-gray-600">Current Step</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <i className="fas fa-video text-green-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{generatedVideosCount}</p>
                                <p className="text-sm text-gray-600">Videos Generated</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <i className="fas fa-clock text-blue-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{totalModules - generatedVideosCount}</p>
                                <p className="text-sm text-gray-600">Pending Videos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <i className="fas fa-robot text-purple-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{Object.values(generating).filter(v => v).length}</p>
                                <p className="text-sm text-gray-600">In Progress</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fix the CSS-in-JS issue - Remove the style tag and use regular CSS classes */}
            <style>{`
                .module-content-preview h1 {
                    color: #2c3e50;
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 1rem;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 0.5rem;
                }
                
                .module-content-preview h2 {
                    color: #34495e;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }
                
                .module-content-preview h3 {
                    color: #2c3e50;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-top: 1.25rem;
                    margin-bottom: 0.5rem;
                }
                
                .module-content-preview p {
                    line-height: 1.6;
                    margin-bottom: 1rem;
                    color: #4a5568;
                }
                
                .module-content-preview ul, .module-content-preview ol {
                    margin: 1rem 0;
                    padding-left: 1.5rem;
                }
                
                .module-content-preview li {
                    line-height: 1.6;
                    margin-bottom: 0.5rem;
                    color: #4a5568;
                }
                
                .module-content-preview code {
                    background: #2c3e50;
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9rem;
                }
                
                .module-content-preview pre {
                    background: #2c3e50;
                    color: white;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    overflow-x: auto;
                    margin: 1rem 0;
                    font-family: 'Courier New', monospace;
                }
                
                .module-content-preview blockquote {
                    border-left: 4px solid #3498db;
                    background: #f8f9fa;
                    padding: 1rem;
                    margin: 1rem 0;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
};

export default CourseVideoGeneration;