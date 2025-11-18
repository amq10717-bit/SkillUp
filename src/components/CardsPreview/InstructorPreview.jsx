// src/components/CardsPreview/InstructorPreview.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function InstructorPreview({ instructor }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructor.map((instructor) => (
                <div key={instructor.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                            <img
                                src={instructor.photoURL || instructor.image || '/default-avatar.png'}
                                alt={instructor.displayName}
                                className="w-16 h-16 rounded-full object-cover"
                            />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {instructor.displayName || instructor.name}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    {instructor.title || 'Professional Instructor'}
                                </p>
                                <div className="flex items-center mt-1">
                                    <span className="text-yellow-400 flex items-center">
                                        <i className="fas fa-star text-sm"></i>
                                        <span className="ml-1 text-gray-700 font-medium">
                                            {instructor.avgRating || '0.0'}
                                        </span>
                                    </span>
                                    <span className="text-gray-400 mx-2">•</span>
                                    <span className="text-gray-500 text-sm">
                                        {instructor.totalReviews || 0} reviews
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {instructor.bio || instructor.description || 'No description available.'}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {instructor.skills?.slice(0, 3).map((skill, index) => (
                                <span
                                    key={index}
                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                                >
                                    {skill}
                                </span>
                            ))}
                            {instructor.skills?.length > 3 && (
                                <span className="text-gray-500 text-xs">
                                    +{instructor.skills.length - 3} more
                                </span>
                            )}
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-500">
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
                            className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-center block"
                        >
                            View Profile
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default InstructorPreview;