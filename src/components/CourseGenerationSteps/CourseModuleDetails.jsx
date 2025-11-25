import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { generateModuleContent } from '../../services/geminiService.js';

const CourseModuleDetails = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState({});
    const [activeModule, setActiveModule] = useState(0);
    const [modules, setModules] = useState([]);
    const [editMode, setEditMode] = useState({});
    const [rawContent, setRawContent] = useState({});

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    setCourse(courseData);
                    setModules(courseData.modules || []);

                    // Generate content for modules that don't have it
                    const modulesWithContent = await Promise.all(
                        (courseData.modules || []).map(async (module, index) => {
                            if (!module.content && module.title) {
                                setGenerating(prev => ({ ...prev, [index]: true }));
                                try {
                                    const content = await generateModuleContent(
                                        module.title,
                                        courseData.difficulty,
                                        courseData.title,
                                        courseData.description
                                    );
                                    return { ...module, content };
                                } catch (error) {
                                    console.error(`Error generating content for module ${index}:`, error);
                                    return { ...module, content: '<div style="font-family: Arial, sans-serif; padding: 20px;"><h1 style="color: #2c3e50;">' + module.title + '</h1><p>Content generation failed. Please try regenerating this module.</p></div>' };
                                } finally {
                                    setGenerating(prev => ({ ...prev, [index]: false }));
                                }
                            }
                            return module;
                        })
                    );
                    setModules(modulesWithContent);
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                alert('Failed to load course');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId]);

    const handleContentChange = (index, content) => {
        const updatedModules = modules.map((module, i) =>
            i === index ? { ...module, content } : module
        );
        setModules(updatedModules);
    };

    const toggleEditMode = (index) => {
        setEditMode(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
        if (!editMode[index]) {
            setRawContent(prev => ({
                ...prev,
                [index]: modules[index].content
            }));
        }
    };

    const regenerateModuleContent = async (index) => {
        if (!course) return;

        setGenerating(prev => ({ ...prev, [index]: true }));
        try {
            const content = await generateModuleContent(
                modules[index].title,
                course.difficulty,
                course.title,
                course.description
            );

            const updatedModules = modules.map((module, i) =>
                i === index ? { ...module, content } : module
            );
            setModules(updatedModules);
            setEditMode(prev => ({ ...prev, [index]: false }));
        } catch (error) {
            console.error('Error regenerating content:', error);
            alert('Failed to regenerate content');
        } finally {
            setGenerating(prev => ({ ...prev, [index]: false }));
        }
    };

    const saveContent = async (index) => {
        if (editMode[index]) {
            handleContentChange(index, rawContent[index]);
        }
        setEditMode(prev => ({ ...prev, [index]: false }));
    };

    const saveAndContinue = async () => {
        if (modules.some(module => !module.content.trim())) {
            alert('Please ensure all modules have content');
            return;
        }

        setSaving(true);
        try {
            await updateDoc(doc(db, 'courses', courseId), {
                modules: modules,
                updatedAt: new Date(),
                creationStep: 'video-generation' // Changed from 'completed'
            });

            alert('Content saved! Now generate a promotional video for your course.');
            navigate(`/add-course/video-generation/${courseId}`); // Navigate to single video generation
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    // Function to safely render HTML content
    const renderModuleContent = (content) => {
        return { __html: content };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-[#6c5dd3] mb-4"></i>
                    <p className="text-gray-600">Generating course content...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 text-lg">Course not found</p>
                    <button
                        onClick={() => navigate('/tutor-dashboard')}
                        className="mt-4 bg-[#6c5dd3] text-white px-6 py-2 rounded-lg"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-10">
            <div className="max-w-6xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-4 lg:p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl lg:text-2xl font-bold">Generate Module Content</h1>
                                <p className="text-blue-100 mt-2">Step 3: Review and edit AI-generated content</p>
                                <p className="text-blue-100 text-sm mt-1">Course: {course.title}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-100">{modules.length} Modules</p>
                                <p className="text-blue-100 text-sm">Click modules to preview content</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        {/* Module Navigation */}
                        <div className="lg:w-1/4 border-r border-gray-200 bg-white">
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-800 mb-4">Course Modules</h3>
                                <div className="space-y-2">
                                    {modules.map((module, index) => (
                                        <button
                                            key={module.id}
                                            onClick={() => setActiveModule(index)}
                                            className={`w-full text-left p-3 rounded-lg transition ${activeModule === index
                                                ? 'bg-[#6c5dd3] text-white'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeModule === index
                                                    ? 'bg-white text-[#6c5dd3]'
                                                    : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <span className="font-medium truncate">{module.title}</span>
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

                        {/* Module Content Preview */}
                        <div className="lg:w-3/4 bg-gray-50">
                            {modules.length > 0 && (
                                <div className="p-4 lg:p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                                                {modules[activeModule].title}
                                            </h2>
                                            <p className="text-gray-600">Module {activeModule + 1} of {modules.length}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleEditMode(activeModule)}
                                                className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] transition flex items-center gap-2"
                                            >
                                                <i className="fas fa-edit"></i>
                                                {editMode[activeModule] ? 'Preview' : 'Edit HTML'}
                                            </button>
                                            <button
                                                onClick={() => regenerateModuleContent(activeModule)}
                                                disabled={generating[activeModule]}
                                                className="bg-[#4CBC9A] text-white px-4 py-2 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 transition flex items-center gap-2"
                                            >
                                                {generating[activeModule] ? (
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                ) : (
                                                    <i className="fas fa-sync-alt"></i>
                                                )}
                                                Regenerate
                                            </button>
                                        </div>
                                    </div>

                                    {editMode[activeModule] ? (
                                        // Edit Mode - Raw HTML Editor
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Edit HTML Content
                                                </label>
                                                <button
                                                    onClick={() => saveContent(activeModule)}
                                                    className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                            <textarea
                                                value={rawContent[activeModule] || modules[activeModule].content}
                                                onChange={(e) => setRawContent(prev => ({ ...prev, [activeModule]: e.target.value }))}
                                                rows="20"
                                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] resize-none font-mono text-sm"
                                                placeholder="Edit HTML content here..."
                                            />
                                        </div>
                                    ) : (
                                        // Preview Mode - Beautiful Frontend Display
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                            <div
                                                className="module-content-preview p-6 lg:p-8 min-h-[500px] overflow-y-auto"
                                                dangerouslySetInnerHTML={renderModuleContent(modules[activeModule].content)}
                                            />
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
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-4 p-6 border-t">
                        <button
                            onClick={() => navigate(`/add-course/modules/${courseId}`)}
                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            <i className="fas fa-arrow-left mr-2"></i>
                            Back to Modules
                        </button>

                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <button
                                onClick={() => saveAndPublish('draft')}
                                disabled={saving}
                                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 disabled:opacity-50 font-medium"
                            >
                                {saving ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    'Save as Draft'
                                )}
                            </button>
                            <button
                                onClick={saveAndContinue}
                                disabled={saving}
                                className="flex-1 bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <>
                                        <i className="fas fa-arrow-right"></i>
                                        Continue to Video Generation
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
                            <div className="w-10 h-10 bg-[#6c5dd3] text-white rounded-full flex items-center justify-center font-semibold">
                                3
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Content Generation</p>
                                <p className="text-sm text-gray-600">Current Step</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Tips */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <i className="fas fa-lightbulb text-blue-600 mt-1"></i>
                        <div>
                            <h4 className="font-semibold text-blue-800 mb-1">Quick Tips</h4>
                            <ul className="text-blue-700 text-sm space-y-1">
                                <li>• Click "Preview" to see how students will view the content</li>
                                <li>• Use "Edit HTML" to make custom changes to the formatting</li>
                                <li>• "Regenerate" creates new content if you're not satisfied</li>
                                <li>• Navigate between modules using Previous/Next buttons</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add CSS for better content display */}
            <style jsx>{`
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

export default CourseModuleDetails;