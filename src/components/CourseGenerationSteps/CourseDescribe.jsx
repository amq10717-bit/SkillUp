import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase.js';
import { extractTopicsFromCourse } from '../../services/geminiService.js';

const CourseDescribe = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [generatingModules, setGeneratingModules] = useState(false);

    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        duration: '',
        lessonsCount: 0,
        whatYouWillLearn: [''],
        requirements: [''],
        targetAudience: ['']
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCourseData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleArrayInputChange = (field, index, value) => {
        setCourseData(prev => ({
            ...prev,
            [field]: prev[field].map((item, i) => i === index ? value : item)
        }));
    };

    const addArrayItem = (field) => {
        setCourseData(prev => ({
            ...prev,
            [field]: [...prev[field], '']
        }));
    };

    const removeArrayItem = (field, index) => {
        setCourseData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const generateModules = async () => {
        if (!courseData.title || !courseData.description) {
            alert('Please fill in course title and description first');
            return;
        }

        setGeneratingModules(true);
        try {
            const modules = await extractTopicsFromCourse(courseData.title, courseData.description);
            return modules;
        } catch (error) {
            console.error('Error generating modules:', error);
            alert('Failed to generate modules. Please try again.');
            return null;
        } finally {
            setGeneratingModules(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            // Generate modules first
            const generatedModules = await generateModules();
            if (!generatedModules) return;

            // Prepare course data
            const courseToCreate = {
                // Basic info
                title: courseData.title,
                description: courseData.description,
                category: courseData.category,
                difficulty: courseData.difficulty,
                duration: courseData.duration,
                lessonsCount: Number(courseData.lessonsCount) || 0,

                // Arrays
                whatYouWillLearn: courseData.whatYouWillLearn.filter(item => item.trim()),
                requirements: courseData.requirements.filter(item => item.trim()),
                targetAudience: courseData.targetAudience.filter(item => item.trim()),

                // Generated modules
                modules: generatedModules.map((module, index) => ({
                    id: `module-${Date.now()}-${index}`,
                    title: module,
                    content: '',
                    order: index,
                    generated: true
                })),

                // Tutor info
                tutorId: user.uid,
                tutorName: user.displayName || user.email?.split('@')[0] || 'Tutor',

                // System fields
                status: 'draft',
                creationStep: 'modules', // Next step
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                enrolledCount: 0,
                rating: 0,
                reviewsCount: 0
            };

            // Save to Firestore
            const docRef = await addDoc(collection(db, "courses"), courseToCreate);

            alert("✅ Course created! Now let's organize the modules.");
            navigate(`/add-course/modules/${docRef.id}`);
        } catch (error) {
            console.error("Error creating course:", error);
            alert("❌ Failed to create course: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-4 lg:p-6 text-white">
                        <h1 className="text-xl lg:text-2xl font-bold">Describe Your Course</h1>
                        <p className="text-blue-100 mt-2">Step 1: Tell us about your course and we'll generate the modules</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCreateCourse} className="p-4 lg:p-6 space-y-6 lg:space-y-8">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={courseData.title}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                    required
                                    placeholder="e.g., Complete Web Development Bootcamp 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    name="description"
                                    value={courseData.description}
                                    onChange={handleInputChange}
                                    rows="5"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                    required
                                    placeholder="Describe what students will learn in this course, the approach you'll take, and what makes it unique..."
                                />
                            </div>
                        </div>

                        {/* Course Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={courseData.category}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base bg-white"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    <option value="Programming">Programming</option>
                                    <option value="Web Development">Web Development</option>
                                    <option value="Data Science">Data Science</option>
                                    <option value="Machine Learning">Machine Learning</option>
                                    <option value="Mobile Development">Mobile Development</option>
                                    <option value="Game Development">Game Development</option>
                                    <option value="Business">Business</option>
                                    <option value="Design">Design</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Photography">Photography</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty Level
                                </label>
                                <select
                                    name="difficulty"
                                    value={courseData.difficulty}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base bg-white"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="all-levels">All Levels</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estimated Duration
                                </label>
                                <input
                                    type="text"
                                    name="duration"
                                    value={courseData.duration}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                    placeholder="e.g., 8 weeks, 40 hours"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Number of Lessons
                                </label>
                                <input
                                    type="number"
                                    name="lessonsCount"
                                    value={courseData.lessonsCount}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                    min="0"
                                    placeholder="Estimated number of lessons"
                                />
                            </div>
                        </div>

                        {/* What Students Will Learn */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                What Students Will Learn *
                            </label>
                            <div className="space-y-3">
                                {courseData.whatYouWillLearn.map((item, index) => (
                                    <div key={index} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => handleArrayInputChange('whatYouWillLearn', index, e.target.value)}
                                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                            placeholder="e.g., Build responsive websites with HTML, CSS, and JavaScript"
                                        />
                                        {courseData.whatYouWillLearn.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayItem('whatYouWillLearn', index)}
                                                className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addArrayItem('whatYouWillLearn')}
                                    className="flex items-center gap-2 text-[#6c5dd3] hover:text-[#5a4bbf] transition"
                                >
                                    <i className="fas fa-plus"></i>
                                    Add Learning Outcome
                                </button>
                            </div>
                        </div>

                        {/* Requirements */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Requirements
                            </label>
                            <div className="space-y-3">
                                {courseData.requirements.map((item, index) => (
                                    <div key={index} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => handleArrayInputChange('requirements', index, e.target.value)}
                                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                            placeholder="e.g., Basic computer knowledge"
                                        />
                                        {courseData.requirements.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayItem('requirements', index)}
                                                className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addArrayItem('requirements')}
                                    className="flex items-center gap-2 text-[#6c5dd3] hover:text-[#5a4bbf] transition"
                                >
                                    <i className="fas fa-plus"></i>
                                    Add Requirement
                                </button>
                            </div>
                        </div>

                        {/* Target Audience */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Target Audience
                            </label>
                            <div className="space-y-3">
                                {courseData.targetAudience.map((item, index) => (
                                    <div key={index} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => handleArrayInputChange('targetAudience', index, e.target.value)}
                                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                            placeholder="e.g., Beginners who want to learn web development"
                                        />
                                        {courseData.targetAudience.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayItem('targetAudience', index)}
                                                className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addArrayItem('targetAudience')}
                                    className="flex items-center gap-2 text-[#6c5dd3] hover:text-[#5a4bbf] transition"
                                >
                                    <i className="fas fa-plus"></i>
                                    Add Target Audience
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate("/tutor-dashboard")}
                                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm lg:text-base"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || generatingModules}
                                className="flex-1 bg-[#6c5dd3] text-white py-3 rounded-lg hover:bg-[#5a4bbf] disabled:opacity-50 font-medium text-sm lg:text-base flex items-center justify-center gap-2"
                            >
                                {loading || generatingModules ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        {generatingModules ? 'Generating Modules...' : 'Creating Course...'}
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-magic"></i>
                                        Generate Course Modules
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* AI Features Preview */}
                <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 AI-Powered Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                            <i className="fas fa-robot text-blue-600 text-xl mt-1"></i>
                            <div>
                                <h4 className="font-semibold text-blue-800">Smart Module Generation</h4>
                                <p className="text-blue-700 text-sm">AI will create relevant course modules based on your description</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                            <i className="fas fa-book text-green-600 text-xl mt-1"></i>
                            <div>
                                <h4 className="font-semibold text-green-800">Detailed Content</h4>
                                <p className="text-green-700 text-sm">Each module will have comprehensive learning materials</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                            <i className="fas fa-edit text-purple-600 text-xl mt-1"></i>
                            <div>
                                <h4 className="font-semibold text-purple-800">Full Control</h4>
                                <p className="text-purple-700 text-sm">Edit and customize everything before publishing</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDescribe;