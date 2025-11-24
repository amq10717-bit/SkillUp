import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase.js';
import { generateModuleContent } from '../../services/geminiService.js';



const TutorCourseView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedModules, setExpandedModules] = useState({});
    const [regenerating, setRegenerating] = useState({});
    useEffect(() => {
        console.log('TutorCourseView mounted with ID:', id);
        console.log('Current auth state:', auth.currentUser);
    }, [id]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setLoading(true);

                // Wait for auth to initialize
                await new Promise((resolve) => {
                    const unsubscribe = auth.onAuthStateChanged((user) => {
                        unsubscribe();
                        resolve(user);
                    });
                });

                const user = auth.currentUser;
                console.log('Current user:', user); // Debug log

                if (!user) {
                    console.error('No user found - redirecting to login');
                    navigate('/login-screen');
                    return;
                }

                const courseDoc = await getDoc(doc(db, 'courses', id));

                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    console.log('Course data:', courseData); // Debug log
                    console.log('Course tutor ID:', courseData.tutorId); // Debug log
                    console.log('Current user ID:', user.uid); // Debug log

                    // Check if current user is the tutor who created this course
                    if (courseData.tutorId !== user.uid) {
                        console.error('Permission denied: User is not the course tutor');
                        alert('You do not have permission to view this course as a tutor');
                        navigate('/tutor-dashboard');
                        return;
                    }

                    setCourse({
                        id: courseDoc.id,
                        ...courseData
                    });
                } else {
                    console.error('Course not found with ID:', id);
                    alert('Course not found');
                    navigate('/tutor-dashboard');
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                alert('Failed to load course: ' + error.message);
                navigate('/tutor-dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [id, navigate]);

    const toggleModule = (moduleId) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    const regenerateModuleContent = async (moduleIndex) => {
        if (!course) return;

        setRegenerating(prev => ({ ...prev, [moduleIndex]: true }));
        try {
            const module = course.modules[moduleIndex];
            const content = await generateModuleContent(
                module.title,
                course.difficulty,
                course.title,
                course.description
            );

            const updatedModules = [...course.modules];
            updatedModules[moduleIndex] = {
                ...updatedModules[moduleIndex],
                content: content
            };

            await updateDoc(doc(db, 'courses', id), {
                modules: updatedModules,
                updatedAt: new Date()
            });

            setCourse(prev => ({
                ...prev,
                modules: updatedModules
            }));

            alert('Module content regenerated successfully!');
        } catch (error) {
            console.error('Error regenerating content:', error);
            alert('Failed to regenerate content');
        } finally {
            setRegenerating(prev => ({ ...prev, [moduleIndex]: false }));
        }
    };

    const updateModuleContent = async (moduleIndex, content) => {
        if (!course) return;

        const updatedModules = [...course.modules];
        updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            content: content
        };

        setCourse(prev => ({
            ...prev,
            modules: updatedModules
        }));

        // Auto-save after a delay
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(async () => {
            try {
                await updateDoc(doc(db, 'courses', id), {
                    modules: updatedModules,
                    updatedAt: new Date()
                });
            } catch (error) {
                console.error('Error saving module content:', error);
            }
        }, 1000);
    };

    const updateCourseStatus = async (status) => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'courses', id), {
                status: status,
                updatedAt: new Date()
            });

            setCourse(prev => ({
                ...prev,
                status: status
            }));

            alert(`Course ${status === 'published' ? 'published' : 'moved to draft'} successfully!`);
        } catch (error) {
            console.error('Error updating course status:', error);
            alert('Failed to update course status');
        } finally {
            setSaving(false);
        }
    };

    const deleteCourse = async () => {
        if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;

        setSaving(true);
        try {
            await deleteDoc(doc(db, 'courses', id));
            alert('Course deleted successfully!');
            navigate('/tutor-dashboard');
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Failed to delete course');
        } finally {
            setSaving(false);
        }
    };

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
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-6 text-white">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                    <h1 className="text-2xl lg:text-3xl font-bold">{course.title}</h1>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${course.status === 'published'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-yellow-500 text-white'
                                        }`}>
                                        {course.status || 'draft'}
                                    </span>
                                </div>
                                <p className="text-blue-100 text-lg">{course.description}</p>
                                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-user"></i>
                                        {course.enrolledCount || 0} students
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-star"></i>
                                        {course.rating || 0} rating
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-clock"></i>
                                        {course.duration || 'Self-paced'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4 lg:mt-0">
                                <Link
                                    to={`/course/${course.id}`}
                                    className="bg-white text-[#6c5dd3] px-4 py-2 rounded-lg hover:bg-gray-100 transition font-semibold"
                                >
                                    <i className="fas fa-eye mr-2"></i>
                                    Student View
                                </Link>
                                <button
                                    onClick={() => updateCourseStatus(course.status === 'published' ? 'draft' : 'published')}
                                    disabled={saving}
                                    className="bg-[#4CBC9A] text-white px-4 py-2 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 transition font-semibold"
                                >
                                    {saving ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : course.status === 'published' ? (
                                        'Unpublish'
                                    ) : (
                                        'Publish'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-4 font-semibold border-b-2 transition ${activeTab === 'overview'
                                ? 'border-[#6c5dd3] text-[#6c5dd3]'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <i className="fas fa-info-circle mr-2"></i>
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('modules')}
                            className={`px-6 py-4 font-semibold border-b-2 transition ${activeTab === 'modules'
                                ? 'border-[#6c5dd3] text-[#6c5dd3]'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <i className="fas fa-book mr-2"></i>
                            Modules ({course.modules?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-6 py-4 font-semibold border-b-2 transition ${activeTab === 'analytics'
                                ? 'border-[#6c5dd3] text-[#6c5dd3]'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <i className="fas fa-chart-bar mr-2"></i>
                            Analytics
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 mb-2">Course Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Category:</strong> {course.category}</p>
                                        <p><strong>Difficulty:</strong> {course.difficulty}</p>
                                        <p><strong>Duration:</strong> {course.duration || 'Not specified'}</p>
                                        <p><strong>Lessons:</strong> {course.lessonsCount || 0}</p>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-green-800 mb-2">Student Engagement</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Enrolled Students:</strong> {course.enrolledCount || 0}</p>
                                        <p><strong>Course Rating:</strong> {course.rating || 'No ratings yet'}</p>
                                        <p><strong>Reviews:</strong> {course.reviewsCount || 0}</p>
                                    </div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-purple-800 mb-2">Quick Actions</h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setActiveTab('modules')}
                                            className="w-full text-left text-sm text-purple-700 hover:text-purple-900"
                                        >
                                            <i className="fas fa-edit mr-2"></i>
                                            Edit Modules
                                        </button>
                                        <Link
                                            to="/create-assignment"
                                            className="block text-sm text-purple-700 hover:text-purple-900"
                                        >
                                            <i className="fas fa-tasks mr-2"></i>
                                            Create Assignment
                                        </Link>
                                        <button
                                            onClick={deleteCourse}
                                            disabled={saving}
                                            className="w-full text-left text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                                        >
                                            <i className="fas fa-trash mr-2"></i>
                                            Delete Course
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* What Students Will Learn */}
                            {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3">What Students Will Learn</h3>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {course.whatYouWillLearn.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <i className="fas fa-check text-green-500 mt-1"></i>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Requirements */}
                            {course.requirements && course.requirements.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3">Requirements</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        {course.requirements.map((item, index) => (
                                            <li key={index}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Target Audience */}
                            {course.targetAudience && course.targetAudience.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3">Target Audience</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        {course.targetAudience.map((item, index) => (
                                            <li key={index}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'modules' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Course Modules</h2>
                                <span className="text-gray-600">{course.modules?.length || 0} modules</span>
                            </div>

                            {course.modules && course.modules.length > 0 ? (
                                <div className="space-y-4">
                                    {course.modules.map((module, index) => (
                                        <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div
                                                className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition"
                                                onClick={() => toggleModule(module.id)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 bg-[#6c5dd3] text-white rounded-full flex items-center justify-center font-semibold">
                                                            {index + 1}
                                                        </div>
                                                        <h3 className="text-lg font-semibold">{module.title}</h3>
                                                        {module.generated && (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                                                AI Generated
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                regenerateModuleContent(index);
                                                            }}
                                                            disabled={regenerating[index]}
                                                            className="p-2 text-[#4CBC9A] hover:bg-[#4CBC9A] hover:text-white rounded transition"
                                                            title="Regenerate Content"
                                                        >
                                                            {regenerating[index] ? (
                                                                <i className="fas fa-spinner fa-spin"></i>
                                                            ) : (
                                                                <i className="fas fa-sync-alt"></i>
                                                            )}
                                                        </button>
                                                        <i className={`fas fa-chevron-${expandedModules[module.id] ? 'up' : 'down'} text-gray-500`}></i>
                                                    </div>
                                                </div>
                                            </div>

                                            {expandedModules[module.id] && (
                                                <div className="p-4 bg-white">
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Module Content
                                                        </label>
                                                        <textarea
                                                            value={module.content || ''}
                                                            onChange={(e) => updateModuleContent(index, e.target.value)}
                                                            rows="12"
                                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] resize-none font-mono text-sm"
                                                            placeholder="Module content will be generated by AI..."
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm text-gray-500">
                                                        <span>Last updated: {module.updatedAt?.toDate?.().toLocaleString() || 'Not saved yet'}</span>
                                                        <span>{module.content?.length || 0} characters</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <i className="fas fa-book-open text-4xl mb-4"></i>
                                    <p>No modules created yet.</p>
                                    <Link
                                        to={`/add-course/modules/${course.id}`}
                                        className="mt-4 inline-block bg-[#6c5dd3] text-white px-6 py-2 rounded-lg hover:bg-[#5a4bbf] transition"
                                    >
                                        Add Modules
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="text-center py-8">
                            <i className="fas fa-chart-bar text-4xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Analytics Coming Soon</h3>
                            <p className="text-gray-500">
                                Detailed course analytics and student performance metrics will be available here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TutorCourseView;