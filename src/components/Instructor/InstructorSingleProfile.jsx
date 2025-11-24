// src/components/Instructor/InstructorSingleProfile.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useInstructors } from '../../contexts/InstructorContext';
import CoursePreview from '../CardsPreview/CoursePreview';
import ReviewsPreview from '../CardsPreview/ReviewsPreview';
import HeroSection from '../Hero Section/HeroSection';

function InstructorSingleProfile() {
    const { id } = useParams();
    const [user] = useAuthState(auth);
    const { instructors, enrolledCourses } = useInstructors();
    const [instructor, setInstructor] = useState(null);
    const [courses, setCourses] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('course');
    const [enrolling, setEnrolling] = useState({});

    useEffect(() => {
        const fetchInstructorData = async () => {
            try {
                setLoading(true);

                // Fetch instructor data
                const instructorDoc = await getDoc(doc(db, 'users', id));
                if (!instructorDoc.exists()) {
                    throw new Error('Instructor not found');
                }

                const instructorData = instructorDoc.data();

                // Fetch instructor's courses - FIXED: using tutorId instead of instructorId
                const coursesQuery = query(
                    collection(db, 'courses'),
                    where('tutorId', '==', id)
                );
                const coursesSnapshot = await getDocs(coursesQuery);
                const coursesData = coursesSnapshot.docs.map(courseDoc => ({
                    id: courseDoc.id,
                    ...courseDoc.data()
                }));

                console.log('Fetched courses:', coursesData); // Debug log

                // Fetch instructor's reviews
                const reviewsQuery = query(
                    collection(db, 'reviews'),
                    where('instructorId', '==', id)
                );
                const reviewsSnapshot = await getDocs(reviewsQuery);
                const reviewsData = reviewsSnapshot.docs.map(reviewDoc => ({
                    id: reviewDoc.id,
                    ...reviewDoc.data()
                }));

                // Sort reviews by createdAt manually (newest first)
                reviewsData.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                setInstructor({
                    id: instructorDoc.id,
                    ...instructorData
                });
                setCourses(coursesData);
                setReviews(reviewsData);

            } catch (error) {
                console.error('Error fetching instructor data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchInstructorData();
        }
    }, [id]);

    const enrollInCourse = async (courseId) => {
        if (!user) {
            alert('Please log in to enroll in courses');
            return;
        }

        try {
            setEnrolling(prev => ({ ...prev, [courseId]: true }));

            // Check if already enrolled
            const enrollmentQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user.uid),
                where('courseId', '==', courseId)
            );
            const enrollmentSnapshot = await getDocs(enrollmentQuery);

            if (!enrollmentSnapshot.empty) {
                alert('You are already enrolled in this course');
                return;
            }

            // Get course data for enrollment
            const courseDoc = await getDoc(doc(db, 'courses', courseId));
            const courseData = courseDoc.data();

            // Create enrollment
            await addDoc(collection(db, 'enrollments'), {
                studentId: user.uid,
                courseId: courseId,
                instructorId: id,
                courseTitle: courseData?.title || 'Course',
                enrolledAt: serverTimestamp(),
                progress: 0,
                status: 'active'
            });

            // Update course enrolled count
            await updateDoc(doc(db, 'courses', courseId), {
                enrolledCount: (courseData?.enrolledCount || 0) + 1
            });

            alert('Successfully enrolled in the course!');

        } catch (error) {
            console.error('Error enrolling in course:', error);
            alert('Failed to enroll in course. Please try again.');
        } finally {
            setEnrolling(prev => ({ ...prev, [courseId]: false }));
        }
    };

    const startChatWithInstructor = async () => {
        if (!user) {
            alert('Please log in to start a chat');
            return;
        }

        try {
            // Check if chat already exists
            const existingChatQuery = query(
                collection(db, 'privateChats'),
                where('participants', 'array-contains', user.uid)
            );

            const snapshot = await getDocs(existingChatQuery);
            const existingChat = snapshot.docs.find(doc => {
                const data = doc.data();
                return data.participants.includes(id);
            });

            if (existingChat) {
                // Redirect to existing chat
                window.location.href = `/private-chat?chat=${existingChat.id}`;
            } else {
                // Create new chat
                const chatData = {
                    participants: [user.uid, id],
                    createdAt: serverTimestamp(),
                    lastMessage: '',
                    lastMessageTime: serverTimestamp(),
                    type: 'private'
                };

                const docRef = await addDoc(collection(db, 'privateChats'), chatData);
                // Redirect to new chat
                window.location.href = `/private-chat?chat=${docRef.id}`;
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Failed to start chat. Please try again.');
        }
    };

    // Check if user is enrolled in a course
    const isEnrolledInCourse = async (courseId) => {
        if (!user) return false;

        try {
            const enrollmentQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user.uid),
                where('courseId', '==', courseId)
            );
            const enrollmentSnapshot = await getDocs(enrollmentQuery);
            return !enrollmentSnapshot.empty;
        } catch (error) {
            console.error('Error checking enrollment:', error);
            return false;
        }
    };

    if (loading) {
        return (
            <div>
                <HeroSection
                    title="Loading..."
                    breadcrumb={[
                        { label: 'Home', path: '/' },
                        { label: 'Instructors', path: '/instructors' },
                        { label: 'Loading...' },
                    ]}
                />
                <div className="min-h-screen my-10 lg:mt-30 lg:mb-30 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg text-gray-600">Loading instructor profile...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!instructor) {
        return (
            <div>
                <HeroSection
                    title="Instructor Not Found"
                    breadcrumb={[
                        { label: 'Home', path: '/' },
                        { label: 'Instructors', path: '/instructors' },
                        { label: 'Not Found' },
                    ]}
                />
                <div className="min-h-screen my-10 lg:mt-30 lg:mb-30 flex items-center justify-center px-[15px]">
                    <div className="text-center">
                        <div className="text-red-500 text-lg font-semibold mb-2">Instructor not found</div>
                        <Link to="/instructors" className="text-blue-500 hover:underline inline-block">
                            Back to Instructors
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate average rating
    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0) / reviews.length).toFixed(1)
        : '0.0';

    return (
        <div>
            <HeroSection
                title={instructor.displayName || instructor.name || 'Instructor'}
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: 'Instructors', path: '/instructors' },
                    { label: instructor.displayName || instructor.name },
                ]}
            />
            <div className="my-10 lg:mt-30 lg:mb-30 min-h-screen">
                <div className='flex flex-col lg:grid lg:grid-cols-[1fr_300px] max-w-6xl mx-auto gap-6 px-[15px] lg:px-0'>

                    {/* Main Content */}
                    <div className='order-1 lg:order-1 w-full'>
                        <div className='bg-white rounded-2xl py-6 lg:py-8 px-4 lg:px-6 shadow-lg'>
                            {/* Instructor Header */}
                            <div className='flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left'>
                                <div className="flex-shrink-0">
                                    <img
                                        src={instructor.photoURL || instructor.image || '/default-avatar.png'}
                                        alt={instructor.displayName}
                                        className="w-32 h-32 md:w-40 md:h-40 object-cover bg-gray-300 rounded-full mx-auto md:mx-0"
                                        onError={(e) => {
                                            e.target.src = '/default-avatar.png';
                                        }}
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <div className='flex flex-col md:flex-row items-center md:items-start justify-between gap-4'>
                                        <div>
                                            <p className='font-poppins text-2xl lg:text-3xl md:text-4xl font-extrabold break-words'>
                                                {instructor.displayName || instructor.name}
                                            </p>
                                            <p className="text-gray-600 mt-1 text-sm lg:text-base">{instructor.title || 'Professional Instructor'}</p>
                                        </div>
                                        <button
                                            onClick={startChatWithInstructor}
                                            className="bg-green-500 text-white px-6 py-2 lg:py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm lg:text-base w-full md:w-auto justify-center"
                                        >
                                            <i className="fas fa-comment"></i>
                                            Start Chat
                                        </button>
                                    </div>

                                    <p className='mt-4 lg:mt-5 text-gray-700 leading-relaxed text-sm lg:text-base text-justify md:text-left'>
                                        {instructor.bio || instructor.description || 'No biography available.'}
                                    </p>

                                    <div className="flex flex-wrap mt-4 items-center justify-center md:justify-start gap-3 lg:gap-4 text-sm lg:text-base">
                                        <div className='flex flex-row gap-2 items-center'>
                                            <p className="font-poppins font-bold">{averageRating}</p>
                                            <i className="fas fa-star text-yellow-400"></i>
                                        </div>
                                        <div className="hidden md:block w-px h-4 bg-gray-300"></div>
                                        <div className="w-full md:w-auto text-center md:text-left">
                                            <p className="font-poppins">Reviews ({reviews.length})</p>
                                        </div>
                                        <div className="hidden md:block w-px h-4 bg-gray-300"></div>
                                        <div className="w-full md:w-auto text-center md:text-left">
                                            <p className="font-poppins">Students ({instructor.totalStudents || 0})</p>
                                        </div>
                                        <div className="hidden md:block w-px h-4 bg-gray-300"></div>
                                        <div className="w-full md:w-auto text-center md:text-left">
                                            <p className="font-poppins">Courses ({courses.length})</p>
                                        </div>
                                    </div>

                                    {/* Skills */}
                                    {instructor.skills && instructor.skills.length > 0 && (
                                        <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-4">
                                            {instructor.skills.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="bg-BgSecondary text-black px-3 py-1 rounded-[4px] text-xs font-medium"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className='mt-8 lg:mt-10'>
                                <div className='flex flex-row gap-0 mb-6 lg:mb-8 border-b overflow-x-auto no-scrollbar'>
                                    <button
                                        onClick={() => setActiveTab('course')}
                                        className={`text-base lg:text-[20px] font-bold font-poppins px-4 py-2 whitespace-nowrap ${activeTab === 'course' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Courses ({courses.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('reviews')}
                                        className={`text-base lg:text-[20px] font-bold font-poppins px-4 py-2 whitespace-nowrap ${activeTab === 'reviews' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Reviews ({reviews.length})
                                    </button>
                                </div>

                                <div>
                                    {activeTab === 'course' && (
                                        <div>
                                            {courses.length === 0 ? (
                                                <div className="text-center py-8 lg:py-12">
                                                    <i className="fas fa-book-open text-3xl lg:text-4xl text-gray-300 mb-4"></i>
                                                    <h3 className="text-base lg:text-lg font-semibold text-gray-600 mb-2">
                                                        No Courses Available
                                                    </h3>
                                                    <p className="text-sm lg:text-base text-gray-500">
                                                        This instructor hasn't created any courses yet.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4 lg:gap-6">
                                                    {courses.map(course => (
                                                        <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow">
                                                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                                <div className="flex-1 w-full">
                                                                    <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-2 break-words">
                                                                        {course.title}
                                                                    </h3>
                                                                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm lg:text-base">
                                                                        {course.description}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-500">
                                                                        {course.duration && (
                                                                            <span className="flex items-center gap-1">
                                                                                <i className="fas fa-clock"></i>
                                                                                {course.duration}
                                                                            </span>
                                                                        )}
                                                                        {course.level && (
                                                                            <span className="flex items-center gap-1">
                                                                                <i className="fas fa-signal"></i>
                                                                                {course.level}
                                                                            </span>
                                                                        )}
                                                                        {course.category && (
                                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] lg:text-xs">
                                                                                {course.category}
                                                                            </span>
                                                                        )}
                                                                        {course.enrolledCount > 0 && (
                                                                            <span className="flex items-center gap-1">
                                                                                <i className="fas fa-users"></i>
                                                                                {course.enrolledCount} enrolled
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                                                    {enrolledCourses.includes(course.id) ? (
                                                                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium text-center text-sm lg:text-base">
                                                                            Enrolled
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => enrollInCourse(course.id)}
                                                                            disabled={enrolling[course.id]}
                                                                            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm lg:text-base w-full"
                                                                        >
                                                                            {enrolling[course.id] ? (
                                                                                <span className="flex items-center justify-center gap-2">
                                                                                    <i className="fas fa-spinner fa-spin"></i>
                                                                                    Enrolling...
                                                                                </span>
                                                                            ) : (
                                                                                'Enroll Now'
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                    <Link
                                                                        to={`/course/${course.id}`}
                                                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm lg:text-base w-full"
                                                                    >
                                                                        View Details
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'reviews' && (
                                        <ReviewsPreview reviews={reviews} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Stacked on mobile) */}
                    <div className='order-2 lg:order-2 w-full'>
                        <div className='shadow-lg rounded-lg p-4 lg:p-6 bg-white static lg:sticky lg:top-20 space-y-6'>
                            {/* Quick Actions */}
                            <div>
                                <h3 className='font-poppins font-bold text-[16px] mb-3'>Quick Actions</h3>
                                <button
                                    onClick={startChatWithInstructor}
                                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 mb-3 text-sm lg:text-base"
                                >
                                    <i className="fas fa-comment"></i>
                                    Chat with Instructor
                                </button>
                                <Link
                                    to="/private-chat"
                                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm lg:text-base"
                                >
                                    <i className="fas fa-inbox"></i>
                                    View All Chats
                                </Link>
                            </div>

                            {/* Instructor Stats */}
                            <div>
                                <h3 className='font-poppins font-bold text-[16px] mb-3'>Instructor Stats</h3>
                                <div className="space-y-3 text-sm lg:text-base">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Total Courses</span>
                                        <span className="font-semibold">{courses.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Average Rating</span>
                                        <span className="font-semibold flex items-center gap-1">
                                            {averageRating} <i className="fas fa-star text-yellow-400 text-sm"></i>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Total Reviews</span>
                                        <span className="font-semibold">{reviews.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Total Students</span>
                                        <span className="font-semibold">{instructor.totalStudents || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Sidebar Block (redundant but good for desktop sidebar) */}
                            {instructor.skills && instructor.skills.length > 0 && (
                                <div className="hidden lg:block">
                                    <h3 className='font-poppins font-bold text-[16px] mb-3'>Expertise</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {instructor.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InstructorSingleProfile;