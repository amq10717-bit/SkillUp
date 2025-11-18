// src/components/CourseFilters.jsx
import React from 'react';

const CourseFilters = ({
    filters,
    onFilterChange,
    onClearFilters,
    tutors,
    categories,
    tutorsData,
    totalCourses,
    filteredCount,
    getTutorDisplayName
}) => {
    const handleFilterUpdate = (key, value) => {
        onFilterChange({
            ...filters,
            [key]: value
        });
    };

    const difficultyOptions = [
        { value: 'all', label: 'All Levels' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Find Your Perfect Course</h3>
                    <p className="text-gray-600">
                        <span className="font-semibold text-[#6c5dd3]">{filteredCount}</span> of{" "}
                        <span className="font-semibold">{totalCourses}</span> courses match your criteria
                    </p>
                </div>
                <button
                    onClick={onClearFilters}
                    className="px-4 py-2 text-[#6c5dd3] hover:text-[#5a4bbf] font-medium text-sm border border-[#6c5dd3] hover:border-[#5a4bbf] rounded-lg transition"
                >
                    Clear All Filters
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Search courses, tutors, categories, or topics..."
                        value={filters.search}
                        onChange={(e) => handleFilterUpdate('search', e.target.value)}
                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent text-lg shadow-sm"
                    />
                </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <i className="fas fa-tag mr-2 text-[#4CBC9A]"></i>
                        Category
                    </label>
                    <select
                        value={filters.category}
                        onChange={(e) => handleFilterUpdate('category', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent shadow-sm"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((category, index) => (
                            <option key={index} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Difficulty Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <i className="fas fa-signal mr-2 text-[#FEC64F]"></i>
                        Difficulty Level
                    </label>
                    <select
                        value={filters.difficulty}
                        onChange={(e) => handleFilterUpdate('difficulty', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent shadow-sm"
                    >
                        {difficultyOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tutor Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <i className="fas fa-chalkboard-teacher mr-2 text-[#6c5dd3]"></i>
                        Instructor
                    </label>
                    <select
                        value={filters.tutor}
                        onChange={(e) => handleFilterUpdate('tutor', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent shadow-sm"
                    >
                        <option value="all">All Instructors</option>
                        {tutors.map((tutorId) => (
                            <option key={tutorId} value={tutorId}>
                                {getTutorDisplayName(tutorId)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Active Filters */}
            {(filters.category !== 'all' || filters.difficulty !== 'all' || filters.tutor !== 'all' || filters.search) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Active Filters:</h4>
                    <div className="flex flex-wrap gap-2">
                        {filters.category !== 'all' && (
                            <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-sm font-medium border border-blue-200">
                                <i className="fas fa-tag text-blue-500"></i>
                                Category: {filters.category}
                                <button
                                    onClick={() => handleFilterUpdate('category', 'all')}
                                    className="hover:text-blue-900 ml-1"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.difficulty !== 'all' && (
                            <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-full text-sm font-medium border border-green-200">
                                <i className="fas fa-signal text-green-500"></i>
                                Level: {filters.difficulty}
                                <button
                                    onClick={() => handleFilterUpdate('difficulty', 'all')}
                                    className="hover:text-green-900 ml-1"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.tutor !== 'all' && (
                            <span className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-full text-sm font-medium border border-purple-200">
                                <i className="fas fa-chalkboard-teacher text-purple-500"></i>
                                Instructor: {getTutorDisplayName(filters.tutor)}
                                <button
                                    onClick={() => handleFilterUpdate('tutor', 'all')}
                                    className="hover:text-purple-900 ml-1"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.search && (
                            <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-2 rounded-full text-sm font-medium border border-orange-200">
                                <i className="fas fa-search text-orange-500"></i>
                                Search: "{filters.search}"
                                <button
                                    onClick={() => handleFilterUpdate('search', '')}
                                    className="hover:text-orange-900 ml-1"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseFilters;