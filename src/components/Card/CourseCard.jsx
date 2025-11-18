import React from 'react';
import { Link } from 'react-router-dom';

function CourseCard({ course }) {
    return (
        <div className="p-5 rounded-lg shadow-md w-full flex flex-col  ">
            <div className='flex-1 flex-col items-start mb-5'>
                <img
                    src={course.image}
                    alt="ali"
                    className="w-full object-cover mb-4"
                />
                <h2 className="font-poppins text-[20px] font-bold mb-2 text-left">{course.title}</h2>
                <p className="text-gray-600 text-left">{course.description}</p>
            </div>
            {/* <button onClick={() => window.location.href = `/course/${course.id}`} className='btn-primary w-46 py-3 text-sm'>
                View Course
            </button> */}
            <button onClick={() => window.location.href = `/enroll-course-single/${course.id}`} className='btn-primary w-46 py-3 text-sm'>
                Enroll Course
            </button>

        </div>
    );
}

export default CourseCard;
