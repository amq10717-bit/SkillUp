// src/pages/CreateCourse.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase.js'; // Fixed import

const CreateCourse = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [thumbnail, setThumbnail] = useState(null);

    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        duration: '',
        lessonsCount: 0,
        whatYouWillLearn: [''],
        requirements: [''],
        targetAudience: [''],
        status: 'draft'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCourseData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

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

                // Tutor info
                tutorId: user.uid,
                tutorName: user.displayName || user.email?.split('@')[0] || 'Tutor',

                // System fields
                status: courseData.status,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                enrolledCount: 0,
                rating: 0,
                reviewsCount: 0
            };

            // Save to Firestore
            await addDoc(collection(db, "courses"), courseToCreate);

            alert("✅ Course created successfully!");
            navigate("/tutor-dashboard");
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
                        <h1 className="text-xl lg:text-2xl font-bold">Create New Course</h1>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCreateCourse} className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 gap-4">
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
                                    placeholder="Enter course title"
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
                                    rows="4"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                    required
                                    placeholder="Describe what students will learn in this course..."
                                />
                            </div>
                        </div>

                        {/* Course Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <option value="Business">Business</option>
                                    <option value="Design">Design</option>
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
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price ($)
                                </label>
                                <input
                                    type="number"
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3] text-sm lg:text-base"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate("/tutor-dashboard")}
                                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm lg:text-base"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-[#6c5dd3] text-white py-3 rounded-lg hover:bg-[#5a4bbf] disabled:opacity-50 font-medium text-sm lg:text-base"
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Creating Course...
                                    </>
                                ) : (
                                    "Create Course"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateCourse;