import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import { useAuthState } from 'react-firebase-hooks/auth';
import HeroSection from './Hero Section/HeroSection';

function CourseDetail() {
    const { id } = useParams();
    const [user] = useAuthState(auth);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('course');
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const toggleSection = (index) => {
        setActiveIndex(index === activeIndex ? null : index);
    };

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!id) {
                    setError('Course ID not provided');
                    return;
                }

                const courseDoc = await getDoc(doc(db, 'courses', id));

                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    setCourse({
                        id: courseDoc.id,
                        ...courseData
                    });

                    // Check if user is enrolled
                    if (user) {
                        const enrollmentQuery = query(
                            collection(db, 'enrollments'),
                            where('courseId', '==', id),
                            where('studentId', '==', user.uid)
                        );
                        const enrollmentSnapshot = await getDocs(enrollmentQuery);
                        setIsEnrolled(!enrollmentSnapshot.empty);
                    }
                } else {
                    setError('Course not found');
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                setError('Failed to load course: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [id, user]);

    const handleEnroll = async () => {
        if (!user) {
            alert('Please log in to enroll in this course');
            return;
        }

        if (isEnrolled) {
            alert('You are already enrolled in this course!');
            return;
        }

        if (!course) {
            alert('Course information not available');
            return;
        }

        setEnrolling(true);
        try {
            // Create enrollment record
            const enrollmentId = `${user.uid}_${id}`;
            await setDoc(doc(db, 'enrollments', enrollmentId), {
                courseId: id,
                studentId: user.uid,
                tutorId: course.tutorId,
                enrolledAt: new Date(),
                courseTitle: course.title,
                studentName: user.displayName || user.email,
                tutorName: course.tutorName
            });

            // Update course enrolled count
            await setDoc(doc(db, 'courses', id), {
                enrolledCount: (course.enrolledCount || 0) + 1
            }, { merge: true });

            setIsEnrolled(true);
            alert('Successfully enrolled in the course!');
        } catch (error) {
            console.error('Error enrolling in course:', error);
            alert('Failed to enroll: ' + error.message);
        } finally {
            setEnrolling(false);
        }
    };

    // Helper to estimate read time based on HTML content length
    const getReadTime = (content) => {
        if (!content) return "5 min";
        const words = content.length / 5; // Rough estimate
        const minutes = Math.ceil(words / 200); // 200 words per minute
        return `${minutes} min read`;
    };

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading course...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">Error</div>
                    <div className="text-gray-600">{error}</div>
                    <button
                        onClick={() => window.history.back()}
                        className="mt-4 bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf]"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">Course Not Found</div>
                    <button
                        onClick={() => window.history.back()}
                        className="mt-4 bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf]"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <HeroSection
                title={course?.title || 'Course Title'}
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: course?.title || 'Course' },
                ]}
            />
            <div className='min-h-screen mt-0'>
                <div className="mt-6 lg:mt-13 mb-10 lg:mb-30 font-poppins px-[15px] lg:px-0">
                    <div className='flex flex-col lg:grid lg:grid-cols-[70%_30%] max-w-6xl mx-auto gap-5'>
                        <div className='order-1 z-1 bg-white rounded-2xl py-5 px-4 lg:py-10 lg:px-10 shadow-md'>
                            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 sm:gap-0'>
                                <h1 className='heading-text-lg'>
                                    {course?.title || 'Course Title'}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">By {course?.tutorName || 'Tutor'}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 text-sm text-gray-600">
                                {course?.difficulty && (
                                    <span className={`px-2 py-1 rounded-full text-xs ${course.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                                        course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {course.difficulty}
                                    </span>
                                )}
                                {course?.category && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                        {course.category}
                                    </span>
                                )}
                                {course?.modules && (
                                    <span>📚 {course.modules.length} Modules</span>
                                )}
                            </div>

                            {/* Tabs Header - REMOVED ANIMATIONS TAB */}
                            <div className='flex flex-row gap-0 mb-6 lg:mb-10 overflow-x-auto pb-2 lg:pb-0'>
                                <button onClick={() => setActiveTab('course')} className={`text-base lg:text-[20px] whitespace-nowrap font-bold font-poppins px-4 py-2 ${activeTab === 'course' ? 'border-b-3 border-hoverGreen  text-black' : 'border-b border-gray-200  text-black'}`}>
                                    Course
                                </button>
                                <button onClick={() => setActiveTab('videos')} className={`text-base lg:text-[20px] whitespace-nowrap font-bold font-poppins px-4 py-2 ${activeTab === 'videos' ? 'border-b-3 border-hoverGreen  text-black' : 'border-b border-gray-200  text-black'}`}>
                                    Videos
                                </button>
                            </div>

                            <div className=' '>
                                {activeTab === 'course' && (
                                    <div>
                                        <h1 className="text-2xl lg:text-3xl font-bold mb-6 text-left text-black">
                                            {course?.title || 'Course Title'}
                                        </h1>

                                        <section className="mb-10">
                                            <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">Course Description</h2>
                                            <p className="text-gray-700 mb-4 text-sm lg:text-base">
                                                {course?.description || 'No description available for this course.'}
                                            </p>
                                        </section>

                                        {course?.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">What You'll Learn</h2>
                                                <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm lg:text-base">
                                                    {course.whatYouWillLearn.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {course?.requirements && course.requirements.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">Requirements</h2>
                                                <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm lg:text-base">
                                                    {course.requirements.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {course?.targetAudience && course.targetAudience.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">Who This Course Is For</h2>
                                                <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm lg:text-base">
                                                    {course.targetAudience.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {course?.thumbnail && (
                                            <img
                                                src={course.thumbnail}
                                                alt={course.title}
                                                className="w-full max-w-2xl mx-auto object-cover mb-6 lg:mb-13 rounded-lg shadow-sm"
                                            />
                                        )}

                                        <section className="mb-10">
                                            <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">Course Content Overview</h2>
                                            <p className="text-gray-700 mb-4 text-sm lg:text-base">
                                                This course includes detailed modules designed to take you from basics to advanced concepts.
                                            </p>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'videos' && (
                                    <div className="py-4">
                                        {course?.promotionalVideo ? (
                                            <div className="space-y-4">
                                                <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video">
                                                    <video
                                                        controls
                                                        className="w-full h-full object-contain"
                                                        src={course.promotionalVideo}
                                                        poster={course.thumbnail}
                                                    >
                                                        Your browser does not support the video tag.
                                                    </video>
                                                </div>
                                                <div className="px-2">
                                                    <h3 className="font-bold text-xl text-gray-800">Promotional Video</h3>
                                                    <p className="text-gray-600 mt-2">
                                                        Watch this introduction to get a better understanding of what this course offers.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="bg-gray-100 rounded-lg p-8">
                                                    <i className="fas fa-video text-4xl text-gray-400 mb-4"></i>
                                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Video Content</h3>
                                                    <p className="text-gray-500">
                                                        No promotional video is currently available for this course.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className='order-2 pr-0 lg:pr-5'>
                            <div className="shadow-md rounded-2xl p-5 bg-white static lg:sticky lg:top-20">
                                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                                    <div className="text-center mb-4">
                                        <span className="text-2xl font-bold text-[#4CBC9A]">
                                            FREE
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleEnroll}
                                        disabled={enrolling || isEnrolled}
                                        className={`w-full py-3 rounded-lg transition font-semibold ${isEnrolled
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : enrolling
                                                ? 'bg-[#5a4bbf] text-white cursor-wait'
                                                : 'bg-[#6c5dd3] text-white hover:bg-[#5a4bbf]'
                                            }`}
                                    >
                                        {enrolling ? 'Enrolling...' : isEnrolled ? (
                                            <Link to={`/learn/course/${course.id}`} className="block">
                                                Start Learning
                                            </Link>
                                        ) : 'Enroll Now'}
                                    </button>
                                </div>

                                <h2 className="text-lg font-semibold mb-4">Curriculum</h2>

                                {/* Dynamic Curriculum Rendering */}
                                {course?.modules && course.modules.length > 0 ? (
                                    course.modules.map((module, index) => (
                                        <div key={index} className="border border-green-100 rounded-md mb-2 overflow-hidden bg-[#eefffa]">
                                            <button
                                                className={`w-full text-left px-4 py-4 rounded-[10px] flex justify-between items-center ${activeIndex === index ? "bg-BgPrimary text-white" : "bg-BgSecondary text-black"
                                                    }`}
                                                onClick={() => toggleSection(index)}
                                            >
                                                <span className='text-[15px] font-medium truncate pr-2'>{index + 1}. {module.title}</span>
                                                <i
                                                    className={`fas fa-chevron-down transition-transform duration-200 flex-shrink-0 ${activeIndex === index ? "rotate-180" : ""
                                                        }`}
                                                ></i>
                                            </button>

                                            {activeIndex === index && (
                                                <div className="divide-y divide-green-100 bg-white">
                                                    {/* Since we don't have sub-lessons array, we show the main module content as the lesson item */}
                                                    <div className="flex justify-between items-center px-4 py-4 text-sm hover:bg-gray-50 transition">
                                                        <div className="flex items-center gap-3 text-gray-700">
                                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                                <i className="fas fa-file-alt text-xs"></i>
                                                            </div>
                                                            <span className="font-medium text-gray-600">Module Content</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                            {getReadTime(module.content)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
                                        <i className="fas fa-book-open mb-2 block"></i>
                                        Curriculum details coming soon.
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="font-semibold mb-3">Course Details</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Status</span>
                                            <span className={`font-medium ${course?.status === 'published' ? 'text-green-600' : 'text-yellow-600'
                                                }`}>
                                                {course?.status || 'draft'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Students</span>
                                            <span className="font-medium">{course?.enrolledCount || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Rating</span>
                                            <span className="font-medium">{course?.rating || 0} ⭐</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseDetail;