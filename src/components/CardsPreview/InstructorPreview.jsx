// src/components/CardsPreview/InstructorPreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function InstructorPreview({ instructor }) {
    return (
        <div className="px-[15px] lg:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {instructor.map((instructor) => (
                    <div key={instructor.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="p-4 lg:p-6">
                            <div className="flex items-center space-x-3 lg:space-x-4 mb-3 lg:mb-4">
                                <img
                                    src={instructor.photoURL || instructor.image || '/default-avatar.png'}
                                    alt={instructor.displayName}
                                    className="w-14 h-14 lg:w-16 lg:h-16 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <h3 className="text-base lg:text-lg font-semibold text-gray-800 truncate">
                                        {instructor.displayName || instructor.name}
                                    </h3>
                                    <p className="text-gray-600 text-xs lg:text-sm truncate">
                                        {instructor.title || 'Professional Instructor'}
                                    </p>
                                    <div className="flex items-center mt-1">
                                        <span className="text-yellow-400 flex items-center">
                                            <i className="fas fa-star text-xs lg:text-sm"></i>
                                            <span className="ml-1 text-gray-700 font-medium text-xs lg:text-sm">
                                                {instructor.avgRating || '0.0'}
                                            </span>
                                        </span>
                                        <span className="text-gray-400 mx-2 text-xs lg:text-sm">•</span>
                                        <span className="text-gray-500 text-xs lg:text-sm">
                                            {instructor.totalReviews || 0} reviews
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-600 text-xs lg:text-sm mb-3 lg:mb-4 line-clamp-2">
                                {instructor.bio || instructor.description || 'No description available.'}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-3 lg:mb-4">
                                {instructor.skills?.slice(0, 3).map((skill, index) => (
                                    <span
                                        key={index}
                                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] lg:text-xs"
                                    >
                                        {skill}
                                    </span>
                                ))}
                                {instructor.skills?.length > 3 && (
                                    <span className="text-gray-500 text-[10px] lg:text-xs pt-1">
                                        +{instructor.skills.length - 3} more
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-xs lg:text-sm text-gray-500">
                                <span>
                                    <i className="fas fa-book mr-1"></i>
                                    {instructor.courses?.length || 0} courses
                                </span>
                                <span>
                                    <i className="fas fa-users mr-1"></i>
                                    {instructor.totalStudents || 0} students
                                </span>
                            </div>

                            <Link
                                to={`/instructor-Profile/${instructor.id}`}
                                className="mt-3 lg:mt-4 w-full bg-blue-500 text-white py-2 lg:py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-center block text-sm lg:text-base active:scale-95"
                            >
                                View Profile
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default InstructorPreview;