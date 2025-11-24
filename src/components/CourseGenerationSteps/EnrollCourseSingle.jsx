import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import CoursePreview from '../CardsPreview/CoursePreview';
import ReviewsPreview from '../CardsPreview/ReviewsPreview';
import HeroSection from '../Hero Section/HeroSection';

function EnrollCourseSingle({ instructor, courses, reviews }) {
    const { id } = useParams();
    const course = courses.find(c => c.id === parseInt(id));
    const myInstructor = course ? instructor.find(i => i.id == course.instructorId) : null;

    const [activeTab, setActiveTab] = useState('about')
    // console.log('Course:', course);
    // console.log('Looking for instructor with ID:', course?.instructorId);
    // console.log('All instructors:', instructor);

    if (!course || !myInstructor) {
        return <div className="text-red-500 text-center p-8">Course or Instructor not found.</div>;
    }


    return (
        <div>
            <HeroSection
                title={course.title}
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: course.title },
                ]}
            />
            <div className="my-10 lg:mt-30 lg:mb-30 font-poppins">

                <div className='flex flex-col lg:grid lg:grid-cols-[65%_35%] max-w-6xl mx-auto px-[15px] lg:px-0 gap-8 lg:gap-0'>

                    {/* Sidebar / Price Card */}
                    <div className='order-2 lg:order-2 z-1 w-full'>
                        <div className='shadow-lg rounded-sm p-4 lg:p-5 bg-white static lg:sticky lg:top-20 pb-6 lg:pb-10'>
                            <img src={course.image} alt="" className='w-full h-auto lg:h-60 object-cover rounded-t-sm' />
                            <div>
                                <div className='flex flex-row gap-2 mt-5 items-center mb-6 lg:mb-10 justify-center lg:justify-start'>
                                    <p className='font-poppins text-3xl font-bold'>$49</p>
                                    <p className='font-poppins line-through text-gray-500'>$90</p>
                                    <div className='border font-poppins ml-5 border-red-500 text-red-500 px-0 py-1 text-center w-[100px] rounded-md'>
                                        <p> Save 50%</p>
                                    </div>
                                </div>

                                <div className='space-y-0'>
                                    <div className='flex flex-row justify-between items-center border-t border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-check text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Courses Title</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold text-right max-w-[50%] truncate'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-t border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-camera text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Lessons</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title} Videos</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-globe text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Language</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-globe text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Course Level</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-star text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Reviews</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-globe text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Quizzes</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-clock text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Duration</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-users text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Students</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-certificate text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Certifications</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-percentage text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Pass Percentage</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-calendar text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Deadline </p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                    <div className='flex flex-row justify-between items-center border-b border-gray-200 py-4 lg:py-5'>
                                        <div className='flex flex-row gap-2'>
                                            <i className="fas fa-user text-greenSmall"></i>
                                            <p className="font-poppins text-[13px] -mb-[7px]">Instructor</p>
                                        </div>
                                        <p className='font-poppins text-[13px] font-semibold'>{course.title}</p>
                                    </div>
                                </div>

                                <div className='flex justify-center'>
                                    <button onClick={() => window.location.href = `/course/${course.id}`} className='btn-primary w-full lg:w-46 py-3 text-sm mt-6 lg:mt-10 rounded-lg transition-transform active:scale-95'>
                                        View Course
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className='order-1 w-full lg:pr-5'>
                        <div className='flex flex-col bg-white rounded-xl lg:rounded-2xl pb-6 lg:pb-10 px-4 lg:px-10 shadow-lg lg:shadow-2xl'>
                            <div className="font-poppins pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <p className='font-poppins text-2xl lg:text-4xl font-extrabold mb-5'>{course.title}</p>
                                <p className="mb-6 text-sm lg:text-base leading-relaxed">
                                    Unlock the power of Python, one of the most versatile and in-demand programming languages today. This comprehensive course is designed for both beginners and experienced programmers looking to enhance their skills. Whether you're aiming to start a new career in software development, data analysis, or simply want to automate everyday tasks, this course will provide you with the skills and knowledge you need to succeed.
                                </p>

                                <h2 className="text-xl lg:text-2xl font-semibold mb-3">What You Will Learn:</h2>



                                <ul className="list-disc pl-6 space-y-2 mb-6 text-sm lg:text-base">
                                    <li>
                                        <strong>Foundations of Python:</strong> Understand the basics of Python programming, including syntax, variables, and data types. Learn how to write, debug, and execute Python scripts.
                                    </li>
                                    <li>
                                        <strong>Data Structures and Algorithms:</strong> Master Python's built-in data structures such as lists, dictionaries, and sets. Implement algorithms for sorting, searching, and manipulating data efficiently.
                                    </li>
                                    <li>
                                        <strong>Object-Oriented Programming (OOP):</strong> Gain proficiency in OOP concepts like classes, objects, inheritance, and polymorphism, which are crucial for developing complex and modular programs.
                                    </li>
                                    <li>
                                        <strong>File Handling and I/O Operations:</strong> Learn how to read from and write to files, manage file directories, and handle exceptions for robust file operations.
                                    </li>
                                    <li>
                                        <strong>Libraries and Frameworks:</strong> Explore essential Python libraries such as NumPy, Pandas, Matplotlib, and Seaborn for data manipulation and visualization. Get an introduction to web frameworks like Flask and Django.
                                    </li>
                                    <li>
                                        <strong>Data Science and Machine Learning:</strong> Dive into data analysis and visualization. Use Scikit-learn for building and evaluating machine learning models.
                                    </li>
                                    <li>
                                        <strong>Project Development:</strong> Apply your skills in real-world scenarios with hands-on projects. Develop a comprehensive capstone project that showcases your mastery of Python.
                                    </li>
                                </ul>

                                <h2 className="text-xl lg:text-2xl font-semibold mb-3">Why Choose This Course:</h2>
                                <ul className="list-disc pl-6 space-y-2 mb-6 text-sm lg:text-base">
                                    <li><strong>Expert Instruction:</strong> Learn from Dr. Jane Smith, an experienced software developer and educator, who brings real-world insights and practical knowledge to the classroom.</li>
                                    <li><strong>Hands-On Learning:</strong> Engage in interactive exercises and projects that reinforce your learning and provide practical experience.</li>
                                    <li><strong>Flexible Learning:</strong> Study at your own pace with lifetime access to all course materials, including video lectures, coding exercises, and downloadable resources.</li>
                                    <li><strong>Comprehensive Curriculum:</strong> Cover all essential aspects of Python programming, from the basics to advanced topics, ensuring a well-rounded understanding of the language.</li>
                                    <li><strong>Supportive Community:</strong> Benefit from a supportive learning environment with access to the course forum, where you can ask questions, share insights, and collaborate with fellow learners.</li>
                                </ul>

                                <h2 className="text-xl lg:text-2xl font-semibold mb-3">Ideal For:</h2>
                                <ul className="list-disc pl-6 space-y-2 mb-6 text-sm lg:text-base">
                                    <li>Beginners with no prior programming experience looking to start a career in software development or data science.</li>
                                    <li>Intermediate programmers who want to deepen their understanding of Python and explore advanced topics.</li>
                                    <li>Professionals seeking to automate tasks, analyze data, or develop web applications using Python.</li>
                                </ul>

                                <h2 className="text-xl lg:text-2xl font-semibold mb-3">Enroll Today:</h2>
                                <p className="mb-6 text-sm lg:text-base">
                                    Take the first step towards mastering Python. Enroll now and start your journey to becoming a proficient Python programmer!
                                </p>
                            </div>

                            {/* Instructor Section */}
                            <div className='bg-[#eefffa] rounded-2xl py-6 lg:py-10 px-4 lg:px-5 w-full mb-10 flex flex-col mt-5'>
                                <div className='flex flex-col md:flex-row items-center gap-5 text-center md:text-left'>
                                    <div>
                                        <img
                                            src={myInstructor.image}
                                            alt={myInstructor.name}
                                            className="w-32 lg:w-40 h-32 lg:h-auto object-cover bg-gray-300 rounded-full md:mr-5 mx-auto"
                                        />
                                    </div>
                                    <div>
                                        <div className='flex flex-col md:flex-row items-center justify-center md:justify-start'>
                                            <p className='font-poppins text-2xl lg:text-4xl font-extrabold'>{myInstructor.name}</p>
                                            <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-2 md:mt-0 md:ml-3">
                                                {myInstructor.skills.map((skill, index) => (
                                                    <span
                                                        key={index}
                                                        className="bg-BgSecondary text-black px-3 py-1 rounded-[4px] text-xs font-medium"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <p className='mt-3 lg:mt-5 text-sm lg:text-base'>{myInstructor.description}</p>
                                        <div className="flex mt-3 justify-center md:justify-start">
                                            <div className='flex flex-row gap-3 items-center'>
                                                <p className="font-poppins font-bold text-[13px] -mb-[7px]">{myInstructor.ranking}</p>
                                                <i className="fas fa-star text-yellow-400"></i>
                                            </div>

                                            <p className="text-gray-300 mx-3">|</p>
                                            <div>
                                                <p className="font-poppins text-[13px] -mb-[7px]"> Reviews ({myInstructor.reviews})</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-6 lg:mt-10'>
                                <div className='flex flex-row gap-0 mb-6 lg:mb-10 overflow-x-auto no-scrollbar'>
                                    <button onClick={() => setActiveTab('about')} className={`text-base lg:text-[20px] font-bold font-poppins px-4 py-2 whitespace-nowrap ${activeTab === 'about' ? 'border-b-3 border-hoverGreen text-black' : 'border-b border-gray-200 text-black'}`}>
                                        About
                                    </button>
                                    <button onClick={() => setActiveTab('reviews')} className={`text-base lg:text-[20px] font-bold font-poppins px-4 py-2 whitespace-nowrap ${activeTab === 'reviews' ? 'border-b-3 border-hoverGreen text-black' : 'border-b border-gray-200 text-black'}`}>
                                        Reviews
                                    </button>
                                </div>
                                <div>
                                    {activeTab === 'about' && (
                                        <div>
                                            <div>
                                                <p className='font-poppins font-bold text-[15px]'>What will you learn:</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 lg:gap-y-2 lg:ml-3 items-start mt-4 lg:mt-6">
                                                {course.learningPoints.map((learningPoint, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <i className="fas fa-check-circle text-[#32c799] text-sm flex-shrink-0"></i>
                                                        <span className="text-sm font-medium text-black">{learningPoint}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'reviews' && (
                                        <ReviewsPreview reviews={reviews.filter(reviews => myInstructor.HisReviews.includes(reviews.id))} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EnrollCourseSingle

