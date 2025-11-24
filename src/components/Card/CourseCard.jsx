import React from 'react';
import { Link } from 'react-router-dom';

function CourseCard({ course }) {
    return (
        <div className="p-4 lg:p-5 rounded-lg shadow-md w-full flex flex-col bg-white">
            <div className='flex-1 flex-col items-start mb-4 lg:mb-5'>
                <img
                    src={course.image}
                    alt="ali"
                    className="w-full h-48 lg:h-auto object-cover rounded-md mb-4"
                />
                <h2 className="font-poppins text-lg lg:text-[20px] font-bold mb-2 text-left">
                    {course.title}
                </h2>
                <p className="text-sm lg:text-base text-gray-600 text-left line-clamp-3">
                    {course.description}
                </p>
            </div>
            <button
                onClick={() => window.location.href = `/enroll-course-single/${course.id}`}
                className='btn-primary w-full lg:w-46 py-3 text-sm rounded-lg transition-transform active:scale-95'
            >
                Enroll Course
            </button>
        </div>
    );
}

export default CourseCard;
