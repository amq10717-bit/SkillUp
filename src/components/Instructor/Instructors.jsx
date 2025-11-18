// src/components/Instructor/Instructors.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase'; // Changed from "../firebase" to "../../firebase"
import { useInstructors } from '../../contexts/InstructorContext'; // Changed from "../contexts/InstructorContext"
import InstructorPreview from '../CardsPreview/InstructorPreview';
import HeroSection from '../Hero Section/HeroSection';

function Instructors() {
    const [user] = useAuthState(auth);
    const { instructors, loading, enrolledCourses, error, refetchInstructors } = useInstructors();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeTab, setActiveTab] = useState('all');

    // Get unique categories from all courses
    const allCategories = [...new Set(
        instructors.flatMap(instructor =>
            instructor.courses.flatMap(course => course.category || 'Uncategorized')
        )
    )].filter(category => category); // Remove empty categories

    // Filter instructors based on search, category, and tab
    const filteredInstructors = instructors.filter(instructor => {
        // Search filter
        const matchesSearch = !searchTerm ||
            instructor.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            instructor.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));

        // Category filter
        const matchesCategory = selectedCategory === 'all' ||
            instructor.courses.some(course =>
                course.category?.includes(selectedCategory)
            );

        // Tab filter
        if (activeTab === 'enrolled') {
            const hasEnrolledCourse = instructor.courses.some(course =>
                enrolledCourses.includes(course.id)
            );
            return matchesSearch && matchesCategory && hasEnrolledCourse;
        }

        return matchesSearch && matchesCategory;
    });

    // Get instructors with enrolled courses for the enrolled tab
    const enrolledInstructors = instructors.filter(instructor =>
        instructor.courses.some(course => enrolledCourses.includes(course.id))
    );

    if (error) {
        return (
            <div>
                <HeroSection
                    title='Our Instructors'
                    breadcrumb={[
                        { label: 'Home', path: '/' },
                        { label: 'Instructors' },
                    ]}
                />
                <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                    <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
                        <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Permission Error</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Please make sure you're logged in and have the necessary permissions to view instructors.
                        </p>
                        <button
                            onClick={refetchInstructors}
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div>
                <HeroSection
                    title='Our Instructors'
                    breadcrumb={[
                        { label: 'Home', path: '/' },
                        { label: 'Instructors' },
                    ]}
                />
                <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg text-gray-600">Loading instructors...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <HeroSection
                title='Our Instructors'
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: 'Instructors' },
                ]}
            />
            <div className="mt-30 mb-30">
                <div className='grid grid-cols-[80%_20%] max-w-6xl mx-auto'>
                    {/* Sidebar */}
                    <div className='order-2 z-1'>
                        <div className='shadow-lg rounded-sm p-5 bg-white sticky top-20'>
                            {/* Search */}
                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search instructors..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-800 mb-3">Filter by Category</h3>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Categories</option>
                                    {allCategories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quick Stats */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium">Total Instructors</span>
                                        <span className="text-sm font-bold">{instructors.length}</span>
                                    </div>
                                </div>
                                {user && (
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium">Your Instructors</span>
                                            <span className="text-sm font-bold">{enrolledInstructors.length}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className='order-1 pr-5'>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 mb-6">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'all'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                All Instructors ({instructors.length})
                            </button>
                            {user && (
                                <button
                                    onClick={() => setActiveTab('enrolled')}
                                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'enrolled'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Your Instructors ({enrolledInstructors.length})
                                </button>
                            )}
                        </div>

                        {/* Category Tabs */}
                        {allCategories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    All
                                </button>
                                {allCategories.slice(0, 6).map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className='text-left mb-10'>
                            <h1 className='heading-text-lg font-poppins'>
                                {activeTab === 'enrolled' ? 'Your Instructors' : 'Available Instructors'}
                            </h1>
                            <p className="text-gray-600 mt-2">
                                {filteredInstructors.length} instructor{filteredInstructors.length !== 1 ? 's' : ''} found
                                {selectedCategory !== 'all' && ` in ${selectedCategory}`}
                            </p>
                        </div>

                        {filteredInstructors.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                    No instructors found
                                </h3>
                                <p className="text-gray-500">
                                    {searchTerm
                                        ? `No instructors match "${searchTerm}"`
                                        : activeTab === 'enrolled'
                                            ? "You haven't enrolled in any courses yet"
                                            : "No instructors available in this category"
                                    }
                                </p>
                            </div>
                        ) : (
                            <InstructorPreview instructor={filteredInstructors} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Instructors;