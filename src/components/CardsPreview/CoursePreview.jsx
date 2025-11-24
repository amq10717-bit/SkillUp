// src/components/CardsPreview/CoursePreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const CoursePreview = ({ courses }) => {
    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };



    const getTutorDisplayName = (tutor) => {
        if (!tutor) return 'Tutor';
        return tutor.displayName || tutor.name || tutor.fullName || tutor.username || 'Tutor';
    };

    return (
        <div className="px-[15px] lg:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                {courses.map((course) => (
                    <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Course Image */}
                        <div className="relative h-40 lg:h-48 bg-gray-200">
                            {course.thumbnail ? (
                                <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#6c5dd3] to-[#4CBC9A] flex items-center justify-center">
                                    <i className="fas fa-book-open text-white text-3xl lg:text-4xl"></i>
                                </div>
                            )}
                            <div className="absolute top-3 left-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
                                    {course.difficulty || 'All Levels'}
                                </span>
                            </div>
                        </div>

                        {/* Course Content */}
                        <div className="p-3 lg:p-4">
                            {/* Tutor Info */}
                            <div className="flex items-center gap-3 mb-2 lg:mb-3">
                                <div className="w-8 h-8 bg-[#4CBC9A] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                    {getTutorDisplayName(course.tutor).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {getTutorDisplayName(course.tutor)}
                                    </p>
                                    <p className="text-xs text-gray-500">Tutor</p>
                                </div>
                            </div>

                            {/* Course Title & Description */}
                            <h3 className="font-semibold text-base lg:text-lg text-gray-900 mb-1 lg:mb-2 line-clamp-2">
                                {course.title}
                            </h3>
                            <p className="text-gray-600 text-xs lg:text-sm mb-2 lg:mb-3 line-clamp-2">
                                {course.description}
                            </p>

                            {/* Course Meta */}
                            <div className="flex items-center justify-between text-xs lg:text-sm text-gray-500 mb-3 lg:mb-4">
                                <div className="flex items-center gap-2 lg:gap-4">
                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                        <i className="fas fa-play-circle"></i>
                                        {course.lessonsCount || 0} lessons
                                    </span>
                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                        <i className="fas fa-clock"></i>
                                        {course.duration || 'Self-paced'}
                                    </span>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <div className="flex items-center gap-1">
                                    <div className="flex text-yellow-400 text-xs lg:text-sm">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <i
                                                key={star}
                                                className={`fas fa-star ${star <= (course.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                                            ></i>
                                        ))}
                                    </div>
                                    <span className="text-xs lg:text-sm text-gray-600 ml-1">
                                        ({course.reviewsCount || 0})
                                    </span>
                                </div>
                                <span className="text-xs lg:text-sm text-gray-500 whitespace-nowrap">
                                    {course.enrolledCount || 0} students
                                </span>
                            </div>

                            {/* Action Button */}
                            <Link
                                to={`/course/${course.id}`}
                                className="w-full bg-[#6c5dd3] text-white py-2 px-4 rounded-lg hover:bg-[#5a4bbf] transition text-center block font-medium text-sm lg:text-base active:scale-95 duration-200"
                            >
                                {course.price > 0 ? 'Enroll Now' : 'Start Learning'}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CoursePreview;