import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { extractTopicsFromCourse } from '../../services/geminiService.js';

const CourseModules = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [modules, setModules] = useState([]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    setCourse(courseData);
                    setModules(courseData.modules || []);
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

    const handleModuleChange = (index, field, value) => {
        const updatedModules = modules.map((module, i) =>
            i === index ? { ...module, [field]: value } : module
        );
        setModules(updatedModules);
    };

    const addModule = () => {
        setModules(prev => [...prev, {
            id: `module-${Date.now()}`,
            title: '',
            content: '',
            order: prev.length,
            generated: false
        }]);
    };

    const removeModule = (index) => {
        if (modules.length <= 1) {
            alert('Course must have at least one module');
            return;
        }
        setModules(prev => prev.filter((_, i) => i !== index));
    };

    const moveModule = (index, direction) => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) return;

        const newModules = [...modules];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];

        // Update order
        newModules.forEach((module, i) => {
            module.order = i;
        });

        setModules(newModules);
    };

    const regenerateModules = async () => {
        if (!course) return;

        setRegenerating(true);
        try {
            const newModules = await extractTopicsFromCourse(course.title, course.description);
            const formattedModules = newModules.map((module, index) => ({
                id: `module-${Date.now()}-${index}`,
                title: module,
                content: '',
                order: index,
                generated: true
            }));
            setModules(formattedModules);
        } catch (error) {
            console.error('Error regenerating modules:', error);
            alert('Failed to regenerate modules');
        } finally {
            setRegenerating(false);
        }
    };

    const saveAndContinue = async () => {
        if (modules.some(module => !module.title.trim())) {
            alert('Please fill in all module titles');
            return;
        }

        setSaving(true);
        try {
            await updateDoc(doc(db, 'courses', courseId), {
                modules: modules,
                updatedAt: new Date(),
                creationStep: 'module-details'
            });

            navigate(`/add-course/module-details/${courseId}`);
        } catch (error) {
            console.error('Error saving modules:', error);
            alert('Failed to save modules');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-[#6c5dd3] mb-4"></i>
                    <p className="text-gray-600">Loading course modules...</p>
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
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-4 lg:p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl lg:text-2xl font-bold">Organize Course Modules</h1>
                                <p className="text-blue-100 mt-2">Step 2: Review and edit the AI-generated modules</p>
                                <p className="text-blue-100 text-sm mt-1">Course: {course.title}</p>
                            </div>
                            <button
                                onClick={regenerateModules}
                                disabled={regenerating}
                                className="bg-white text-[#6c5dd3] px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
                            >
                                {regenerating ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fas fa-sync-alt"></i>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Modules List */}
                    <div className="p-4 lg:p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Course Modules</h2>
                            <button
                                onClick={addModule}
                                className="bg-[#4CBC9A] text-white px-4 py-2 rounded-lg hover:bg-[#3aa384] transition flex items-center gap-2"
                            >
                                <i className="fas fa-plus"></i>
                                Add Module
                            </button>
                        </div>

                        <div className="space-y-4">
                            {modules.map((module, index) => (
                                <div key={module.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                    <div className="flex items-start gap-4">
                                        {/* Order Controls */}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveModule(index, 'up')}
                                                disabled={index === 0}
                                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
                                            >
                                                <i className="fas fa-chevron-up text-xs"></i>
                                            </button>
                                            <div className="w-8 h-8 flex items-center justify-center bg-[#6c5dd3] text-white rounded font-semibold">
                                                {index + 1}
                                            </div>
                                            <button
                                                onClick={() => moveModule(index, 'down')}
                                                disabled={index === modules.length - 1}
                                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
                                            >
                                                <i className="fas fa-chevron-down text-xs"></i>
                                            </button>
                                        </div>

                                        {/* Module Content */}
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={module.title}
                                                onChange={(e) => handleModuleChange(index, 'title', e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-lg font-semibold mb-2"
                                                placeholder="Module title..."
                                            />
                                            {module.generated && (
                                                <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                                                    <i className="fas fa-robot"></i>
                                                    <span>AI Generated</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove Button */}
                                        {modules.length > 1 && (
                                            <button
                                                onClick={() => removeModule(index)}
                                                className="p-2 text-red-500 hover:text-red-700 transition"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {modules.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <i className="fas fa-inbox text-4xl mb-4"></i>
                                <p>No modules yet. Add your first module or regenerate with AI.</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-8 border-t mt-8">
                            <button
                                onClick={() => navigate(`/add-course`)}
                                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                <i className="fas fa-arrow-left mr-2"></i>
                                Back
                            </button>
                            <button
                                onClick={saveAndContinue}
                                disabled={saving || modules.length === 0}
                                className="flex-1 bg-[#6c5dd3] text-white py-3 rounded-lg hover:bg-[#5a4bbf] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Generate Detailed Content
                                        <i className="fas fa-arrow-right"></i>
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
                                1
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
                            <div className="w-10 h-10 bg-[#6c5dd3] text-white rounded-full flex items-center justify-center font-semibold">
                                2
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Module Organization</p>
                                <p className="text-sm text-gray-600">Current Step</p>
                            </div>
                        </div>

                        <div className="flex-1 h-1 bg-gray-200 mx-4">
                            <div className="h-1 bg-gray-200 w-0"></div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                                3
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Content Generation</p>
                                <p className="text-sm text-gray-500">Next</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                                4
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Video Generation</p>
                                <p className="text-sm text-gray-500">Final Step</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseModules;