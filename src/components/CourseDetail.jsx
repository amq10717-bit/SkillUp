import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

    const curriculumData = [
        {
            title: "1. Introduction",
            lessons: [
                { name: "What is Web Development?", duration: "10:00" },
                { name: "Frontend vs Backend", duration: "12:30" },
                { name: "How Websites Work", duration: "11:15" },
            ],
        },
        {
            title: "2. Getting Started with HTML",
            lessons: [
                { name: "HTML Basics", duration: "15:00" },
                { name: "Common HTML Tags", duration: "17:20" },
                { name: "Creating a Simple Page", duration: "14:50" },
            ],
        },
        {
            title: "3. Styling with CSS",
            lessons: [
                { name: "CSS Syntax and Selectors", duration: "16:45" },
                { name: "Colors, Fonts, and Layout", duration: "19:30" },
                { name: "Box Model & Positioning", duration: "20:10" },
            ],
        },
    ];

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

                console.log('Fetching course with ID:', id);

                const courseDoc = await getDoc(doc(db, 'courses', id));

                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    console.log('Course data found:', courseData);
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
                    console.log('No course found with ID:', id);
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
                    <div className="text-gray-600">The course you're looking for doesn't exist.</div>
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
                <div className="mt-13 mb-30 font-poppins ">
                    <div className='grid grid-cols-[70%_30%] max-w-6xl mx-auto gap-5'>
                        <div className='order-1 z-1 bg-white rounded-2xl py-10 px-10 shadow-md'>
                            <div className='flex flex-row justify-between items-center mb-5 '>
                                <h1 className='heading-text-lg'>
                                    {course?.title || 'Course Title'}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">By {course?.tutorName || 'Tutor'}</span>
                                </div>
                            </div>

                            {/* Course Meta Info */}
                            <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
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
                                {course?.duration && (
                                    <span>⏱️ {course.duration}</span>
                                )}
                                {course?.lessonsCount > 0 && (
                                    <span>📚 {course.lessonsCount} lessons</span>
                                )}
                            </div>

                            <div className='flex flex-row gap-0 mb-10'>
                                <button onClick={() => setActiveTab('course')} className={`text-[20px] font-bold font-poppins px-4 py-2 ${activeTab === 'course' ? 'border-b-3 border-hoverGreen  text-black' : 'border-b border-gray-200  text-black'}`}>
                                    Course
                                </button>
                                <button onClick={() => setActiveTab('videos')} className={`text-[20px] font-bold font-poppins px-4 py-2 ${activeTab === 'videos' ? 'border-b-3 border-hoverGreen  text-black' : 'border-b border-gray-200  text-black'}`}>
                                    Videos
                                </button>
                                <button onClick={() => setActiveTab('animations')} className={` text-[20px] font-bold font-poppins px-4 py-2 ${activeTab === 'animations' ? 'border-b-3 border-hoverGreen  text-black' : 'border-b border-gray-200  text-black'}`}>
                                    Animations
                                </button>
                            </div>
                            <div className=' '>
                                {activeTab == 'course' && <div>
                                    <div >
                                        <h1 className="text-3xl font-bold mb-6 text-left text-black">
                                            {course?.title || 'Course Title'}
                                        </h1>

                                        <section className="mb-10">
                                            <h2 className="text-2xl font-semibold mb-3 text-gray-800">Course Description</h2>
                                            <p className="text-gray-700 mb-4">
                                                {course?.description || 'No description available for this course.'}
                                            </p>
                                        </section>

                                        {course?.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-2xl font-semibold mb-3 text-gray-800">What You'll Learn</h2>
                                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                                    {course.whatYouWillLearn.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {course?.requirements && course.requirements.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-2xl font-semibold mb-3 text-gray-800">Requirements</h2>
                                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                                    {course.requirements.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {course?.targetAudience && course.targetAudience.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-2xl font-semibold mb-3 text-gray-800">Who This Course Is For</h2>
                                                <ul className="list-disc list-inside text-gray-700 space-y-2">
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
                                                className="w-full max-w-2xl mx-auto object-cover mb-13 rounded-lg"
                                            />
                                        )}

                                        {/* Sample content for demonstration */}
                                        <section className="mb-10">
                                            <h2 className="text-2xl font-semibold mb-3 text-gray-800">Course Content Overview</h2>
                                            <p className="text-gray-700 mb-4">
                                                This course will take you from beginner to advanced level with hands-on projects and real-world examples.
                                            </p>
                                        </section>

                                    </div>
                                </div>}
                                {activeTab === 'videos' && (
                                    <div className="text-center py-8">
                                        <div className="bg-gray-100 rounded-lg p-8">
                                            <i className="fas fa-video text-4xl text-gray-400 mb-4"></i>
                                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Video Content</h3>
                                            <p className="text-gray-500">
                                                Video lessons will be available once the course content is fully developed.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {activeTab == 'animations' && (
                                    <div className="text-center py-8">
                                        <div className="bg-gray-100 rounded-lg p-8">
                                            <i className="fas fa-film text-4xl text-gray-400 mb-4"></i>
                                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Animation Content</h3>
                                            <p className="text-gray-500">
                                                Interactive animations will be available once the course content is fully developed.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className='order-2 pr-5'>
                            <div className="shadow-md rounded-2xl p-5 bg-white sticky top-20">
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
                                        {enrolling ? 'Enrolling...' : isEnrolled ? 'Already Enrolled' : 'Enroll Now'}
                                    </button>
                                </div>

                                <h2 className="text-lg font-semibold mb-4">Curriculum</h2>
                                {curriculumData.map((section, index) => (
                                    <div key={index} className="border border-green-100 rounded-md mb-2 overflow-hidden bg-[#eefffa]">
                                        <button
                                            className={`w-full text-left px-4 py-4 rounded-[10px] flex justify-between items-center ${activeIndex === index ? "bg-BgPrimary text-white" : "bg-BgSecondary text-black"
                                                }`}
                                            onClick={() => toggleSection(index)}
                                        >
                                            <span className='text-[15px]'>{section.title}</span>
                                            <i
                                                className={`fas fa-chevron-down transition-transform duration-200 ${activeIndex === index ? "rotate-180" : ""
                                                    }`}
                                            ></i>
                                        </button>

                                        {activeIndex === index && (
                                            <div className="divide-y divide-green-100">
                                                {section.lessons.map((lesson, idx) => (
                                                    <div key={idx} className="flex justify-between items-center px-4 py-5 text-sm">
                                                        <div className="flex items-center gap-2 text-gray-700">
                                                            <i className="fas fa-play-circle text-greenSmall"></i>
                                                            {lesson.name}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{lesson.duration}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Course Stats */}
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