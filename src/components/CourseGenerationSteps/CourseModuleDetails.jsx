// src/pages/CourseModuleDetails.jsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getModuleContentFromAPI } from '../../services/contentService';

// (The pickDescription function remains the same, so it's omitted for brevity)
function pickDescription(content, moduleName) {
    const candidates = [
        content?.description,
        content?.module_description,
        content?.overview,
        content?.summary,
        content?.intro,
        content?.introduction,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed.length > 0) return trimmed;
        }
    }
    if (Array.isArray(content?.lessons) && content.lessons.length > 0) {
        const firstLessonDesc = content.lessons[0]?.description;
        if (typeof firstLessonDesc === 'string' && firstLessonDesc.trim().length > 0) {
            return firstLessonDesc.trim();
        }
    }
    if (Array.isArray(content?.objectives) && content.objectives.length > 0) {
        return `Objectives: ${content.objectives.slice(0, 3).join('; ')}`;
    }
    return '';
}


function CourseModuleDetails() {
    const navigate = useNavigate();
    const location = useLocation();

    const initialModules = location.state?.modules || [];

    const [moduleDetails, setModuleDetails] = useState(
        initialModules.map(module => ({
            ...module,
            description: `Details for ${module.name} will be generated here.`,
            duration: 'Pending...',
            objectives: [],
            lessons: [],
            assessment: { type: 'Pending...', weight: 'Pending...', description: '' },
            isGenerated: false, // Add a flag to track generation status
        }))
    );

    const [expandedModule, setExpandedModule] = useState(null);
    const [expandedLesson, setExpandedLesson] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contentGenerated, setContentGenerated] = useState(false);

    // (Helper functions toggleModule, toggleLesson, handleModuleEdit, handleLessonEdit remain the same)
    const toggleModule = (id) => {
        setExpandedModule(expandedModule === id ? null : id);
        setExpandedLesson(null);
    };

    const toggleLesson = (lessonId) => {
        setExpandedLesson(expandedLesson === lessonId ? null : lessonId);
    };

    const handleModuleEdit = (moduleId, field, value) => {
        setModuleDetails(prevModules =>
            prevModules.map(module =>
                module.id === moduleId ? { ...module, [field]: value } : module
            )
        );
    };

    const handleLessonEdit = (moduleId, lessonId, field, value) => {
        setModuleDetails(prevModules =>
            prevModules.map(module =>
                module.id === moduleId
                    ? {
                        ...module,
                        lessons: module.lessons.map(lesson =>
                            lesson.id === lessonId ? { ...lesson, [field]: value } : lesson
                        )
                    }
                    : module
            )
        );
    };

    // --- REWRITTEN FOR PROGRESSIVE UPDATES ---
    const generateModuleContent = async () => {
        if (contentGenerated || loading) return;

        setLoading(true);
        setError('');

        const courseInfo = location.state?.courseInfo || {
            title: "Course",
            description: "A comprehensive course",
            expertiseLevel: "Beginners"
        };

        let successfulGenerations = 0;
        let failedGenerations = 0;

        // Process modules sequentially to update UI as each one completes
        for (const moduleToProcess of initialModules) {
            try {
                console.log(`🚀 Starting content generation for: ${moduleToProcess.name}`);
                const content = await getModuleContentFromAPI(
                    moduleToProcess.name,
                    courseInfo.description,
                    courseInfo.expertiseLevel
                );

                // Update the state for THIS specific module immediately
                setModuleDetails(prevModules =>
                    prevModules.map(m =>
                        m.id === moduleToProcess.id
                            ? {
                                ...m,
                                description: pickDescription(content, m.name) || `AI-generated description for ${m.name}.`,
                                duration: content.duration || '2 weeks',
                                objectives: content.objectives || ['Understand core concepts.'],
                                lessons: (content.lessons || []).map((lesson, lessonIndex) => ({
                                    id: lesson.id || lessonIndex + 1,
                                    ...lesson,
                                })),
                                assessment: content.assessment || { type: 'Project', weight: '30%', description: 'Final project.' },
                                isGenerated: true,
                            }
                            : m
                    )
                );
                successfulGenerations++;

            } catch (err) {
                console.error(`❌ Failed to generate content for module "${moduleToProcess.name}":`, err);
                failedGenerations++;

                // Update the specific module to show an error state
                setModuleDetails(prevModules =>
                    prevModules.map(m =>
                        m.id === moduleToProcess.id
                            ? {
                                ...m,
                                description: `Failed to generate content for ${m.name}. Please try again or fill in the details manually.`,
                                isGenerated: false, // Mark as not generated
                            }
                            : m
                    )
                );
            }
        }

        console.log("🎉 Content generation process finished.");
        setLoading(false);
        setContentGenerated(true); // Mark the overall process as complete

        if (failedGenerations > 0) {
            setError(`${failedGenerations} out of ${initialModules.length} modules failed to generate. Please review them and check the console for details.`);
        }
    };


    const handleConfirm = () => {
        console.log('Module details confirmed:', moduleDetails);
        navigate('/add-course/final-review', { state: { moduleDetails } });
    };

    // ... (rest of the JSX remains the same) ...

    // You can also use the `isGenerated` flag for more granular UI feedback,
    // for example, by adding a small checkmark icon next to generated modules.

    return (
        <div className="min-h-screen mt-30 mb-30">
            {/* Header Section */}
            <div className='max-w-6xl mx-auto flex flex-row justify-between items-center p-4'>
                <h1 className='heading-text-lg'>Generate your course in 4 easy steps!</h1>
                <div className="flex items-center gap-4 text-[15px] text-black "><i className="fas fa-calendar-alt cursor-pointer"></i><i className="fas fa-bookmark cursor-pointer"></i><i className="fas fa-share-alt cursor-pointer"></i></div>
            </div>

            {/* Progress Steps Component */}
            <div className="flex justify-center pt-10">
                <div className="relative flex items-center justify-center w-20 h-20"><div className="z-10 w-16 h-16 bg-BgPrimary rounded-full flex items-center justify-center text-white text-xl font-bold">1</div><div className="absolute top-0 w-20 h-10 border-2 border-hoverGreen rounded-t-full border-b-0"></div><div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white border-1 border-hoverGreen rounded-full"></div></div>
                <div className="relative flex items-center justify-center w-20 h-20"><div className="z-10 w-16 h-16 bg-BgPrimary rounded-full flex items-center justify-center text-white text-xl font-bold">2</div><div className="absolute bottom-0 w-20 h-10 border-2 border-hoverGreen rounded-b-full border-t-0"></div><div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white border-1 z-1 border-hoverGreen rounded-full"></div></div>
                <div className="relative flex items-center justify-center w-20 h-20"><div className="z-10 w-16 h-16 bg-BgPrimary rounded-full flex items-center justify-center text-white text-xl font-bold">3</div><div className="absolute top-0 w-20 h-10 border-2 border-hoverGreen rounded-t-full border-b-0"></div><div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white z-1 border-1 border-hoverGreen rounded-full"></div></div>
                <div className="relative flex items-center justify-center w-20 h-20"><div className="z-10 w-16 h-16 bg-BgSecondary rounded-full flex items-center justify-center text-black text-xl font-bold">4</div><div className="absolute bottom-0 w-20 h-10 border-2 border-hoverLightGreen rounded-b-full border-t-0"></div><div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white z-1 border-1 border-hoverLightGreen rounded-full"></div></div>
            </div>

            {/* Main Content Area */}
            <div className='max-w-6xl mx-auto pt-20 p-4 flex flex-col'>
                <h1 className='text-2xl font-bold pb-6'>Review Module Details and Lesson Structure</h1>
                <div className="space-y-4 mb-8">
                    <p className="text-gray-700">Review the detailed structure of each module. You can expand modules to see individual lessons, edit content, and customize the learning experience for your students.</p>
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-800 mb-1">{contentGenerated ? 'Content Generation Complete!' : 'Generate AI-Powered Content'}</h3>
                            <p className="text-sm text-blue-600">{contentGenerated ? 'Module content has been generated. You can now review and edit the details below.' : 'Click the button below to generate detailed content, lessons, and objectives for all modules using AI.'}</p>
                        </div>
                        <button onClick={generateModuleContent} disabled={loading || contentGenerated} className={`px-6 py-2 rounded-lg font-medium transition-colors ${loading || contentGenerated ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {loading ? (<div className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Generating...</span></div>) : contentGenerated ? (<div className="flex items-center gap-2"><i className="fas fa-check"></i><span>Generated</span></div>) : (<div className="flex items-center gap-2"><i className="fas fa-magic"></i><span>Generate Content</span></div>)}
                        </button>
                    </div>
                    {error && (<div className="p-4 bg-red-50 rounded-lg border border-red-200"><div className="flex items-center gap-2"><i className="fas fa-exclamation-triangle text-red-600"></i><span className="text-red-800 font-medium">Error</span></div><p className="text-sm text-red-600 mt-1">{error}</p></div>)}
                </div>
                <div className="space-y-6">
                    {moduleDetails.map((module) => (
                        <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-BgGreyColor p-6 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleModule(module.id)}>
                                <div className="flex items-start space-x-4 flex-1">
                                    <div className="flex-shrink-0 w-10 h-10 bg-BgPrimary rounded-full flex items-center justify-center text-white font-bold">{module.id}</div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">{module.name}</h3>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1"><i className="fas fa-clock"></i>{module.duration}</span>
                                            <span className="flex items-center gap-1"><i className="fas fa-book"></i>{module.lessons.length} lessons</span>
                                            <span className="flex items-center gap-1"><i className="fas fa-tasks"></i>{module.assessment.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-500 font-medium">{expandedModule === module.id ? 'Collapse' : 'Expand Details'}</span>
                                    <i className={`fas fa-chevron-${expandedModule === module.id ? 'up' : 'down'} text-gray-500 text-lg`}></i>
                                </div>
                            </div>
                            {expandedModule === module.id && (
                                <div className="p-6 bg-white border-t border-gray-200 space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i className="fas fa-align-left text-BgPrimary"></i>Module Description</h4>
                                            <textarea value={module.description} onChange={(e) => handleModuleEdit(module.id, 'description', e.target.value)} className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-BgPrimary focus:border-transparent resize-vertical" placeholder="Enter module description..." />
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><i className="fas fa-bullseye text-BgPrimary"></i>Learning Objectives</h4>
                                                <div className="space-y-2">{module.objectives.map((objective, index) => (<div key={index} className="flex items-start gap-2"><i className="fas fa-check text-green-500 mt-1 text-sm"></i><span className="text-sm text-gray-700">{objective}</span></div>))}</div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><i className="fas fa-chart-pie text-BgPrimary"></i>Assessment</h4>
                                                <div className="bg-blue-50 p-3 rounded-lg"><p className="text-sm text-gray-700"><strong>Type:</strong> {module.assessment.type}</p><p className="text-sm text-gray-700"><strong>Weight:</strong> {module.assessment.weight}</p><p className="text-sm text-gray-700 mt-1">{module.assessment.description}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-4"><h4 className="font-semibold text-gray-800 text-lg flex items-center gap-2"><i className="fas fa-play-circle text-BgPrimary"></i>Lessons in this Module</h4><span className="text-sm text-gray-500">{module.lessons.length} lessons</span></div>
                                        <div className="space-y-4">
                                            {module.lessons.map((lesson) => (
                                                <div key={lesson.id} className="border border-gray-200 rounded-lg">
                                                    <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleLesson(lesson.id)}>
                                                        <div className="flex items-start space-x-4 flex-1">
                                                            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm font-bold">{lesson.id}</div>
                                                            <div className="flex-1">
                                                                <input type="text" value={lesson.title} onChange={(e) => handleLessonEdit(module.id, lesson.id, 'title', e.target.value)} className="text-lg font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-BgPrimary rounded px-2 py-1 w-full mb-1" onClick={(e) => e.stopPropagation()} />
                                                                <div className="flex flex-wrap gap-3 text-sm text-gray-600"><span className="flex items-center gap-1"><i className="fas fa-clock"></i>{lesson.duration}</span><span className="flex items-center gap-1"><i className="fas fa-tag"></i>{lesson.type}</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2"><span className="text-sm text-gray-500">{expandedLesson === lesson.id ? 'Less' : 'More'}</span><i className={`fas fa-chevron-${expandedLesson === lesson.id ? 'up' : 'down'} text-gray-500`}></i></div>
                                                    </div>
                                                    {expandedLesson === lesson.id && (
                                                        <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div><h5 className="font-semibold text-gray-700 mb-2">Lesson Description</h5><textarea value={lesson.description} onChange={(e) => handleLessonEdit(module.id, lesson.id, 'description', e.target.value)} className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-BgPrimary focus:border-transparent resize-vertical text-sm" onClick={(e) => e.stopPropagation()} /></div>
                                                            <div>
                                                                <h5 className="font-semibold text-gray-700 mb-2">Learning Materials</h5>
                                                                <div className="space-y-2">{(lesson.materials || []).map((material, index) => (<div key={index} className="flex items-center gap-2 text-sm text-gray-700"><i className="fas fa-file-alt text-BgPrimary text-xs"></i>{material}</div>))}</div>
                                                                <h5 className="font-semibold text-gray-700 mt-4 mb-2">Lesson Objectives</h5>
                                                                <div className="space-y-1">{(lesson.objectives || []).map((objective, index) => (<div key={index} className="flex items-start gap-2 text-sm text-gray-700"><i className="fas fa-circle text-BgPrimary text-xs mt-1"></i>{objective}</div>))}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-200">
                    <button onClick={() => navigate(-1)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"><i className="fas fa-arrow-left"></i>Back to Modules</button>
                    <button onClick={handleConfirm} className="btn-primary px-8 py-3 font-medium flex items-center gap-2">Continue to Final Review<i className="fas fa-arrow-right"></i></button>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                        <i className="fas fa-info-circle text-blue-500 mt-1 mr-3 text-lg"></i>
                        <div><h4 className="font-semibold text-blue-800">Next: Final Course Review</h4><p className="text-blue-700 text-sm mt-1">In the next step, you'll review the complete course structure, set pricing, and configure additional settings before publishing your course.</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseModuleDetails;