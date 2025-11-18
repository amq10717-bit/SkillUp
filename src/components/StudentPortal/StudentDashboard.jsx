// src/pages/StudentDashboard.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import animation from '../../assets/animation.png';
import Education from '../../assets/Education.png';
import Brain from '../../assets/Brain.png';
import Microscope from '../../assets/Microscope.png';
import CourseCard from '../Card/CourseCard';
import CoursePreview from '../CardsPreview/CoursePreview';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import AssignmentPreview from '../CardsPreview/AssignmentPreview';
import QuizPreview from '../CardsPreview/QuizPreview';
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    limit,
    where,
    getDocs,
    doc,
    getDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

function StudentDashboard() {
    const [user] = useAuthState(auth);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completedCoursesCount, setCompletedCoursesCount] = useState(0);

    // Chart data
    const data = [
        { name: 'Mon', lastWeek: 50, thisWeek: 65 },
        { name: 'Tue', lastWeek: 60, thisWeek: 40 },
        { name: 'Wed', lastWeek: 70, thisWeek: 80 },
        { name: 'Thu', lastWeek: 50, thisWeek: 90 },
        { name: 'Fri', lastWeek: 85, thisWeek: 65 },
        { name: 'Sat', lastWeek: 55, thisWeek: 95 },
        { name: 'Sun', lastWeek: 70, thisWeek: 80 },
    ];

    // Fetch enrolled courses for the student
    useEffect(() => {
        const fetchEnrolledCourses = async () => {
            if (!user) return;

            try {
                console.log('Fetching enrolled courses for student:', user.uid);

                // Query enrollments for this student
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('studentId', '==', user.uid)
                );

                const unsubscribeEnrollments = onSnapshot(enrollmentsQuery, async (snapshot) => {
                    const enrollments = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    console.log('Found enrollments:', enrollments);

                    // Fetch course details for each enrollment
                    const coursesData = await Promise.all(
                        enrollments.map(async (enrollment) => {
                            try {
                                const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
                                if (courseDoc.exists()) {
                                    return {
                                        id: courseDoc.id,
                                        ...courseDoc.data(),
                                        enrollmentDate: enrollment.enrolledAt,
                                        enrollmentId: enrollment.id
                                    };
                                }
                                return null;
                            } catch (error) {
                                console.error('Error fetching course:', error);
                                return null;
                            }
                        })
                    );

                    const validCourses = coursesData.filter(course => course !== null);
                    console.log('Enrolled courses:', validCourses);
                    setEnrolledCourses(validCourses);

                    // Calculate completed courses (you can add completion logic later)
                    setCompletedCoursesCount(0); // For now, set to 0
                });

                return () => unsubscribeEnrollments();
            } catch (error) {
                console.error('Error fetching enrolled courses:', error);
            }
        };

        fetchEnrolledCourses();
    }, [user]);

    // Fetch assignments + quizzes with listeners
    useEffect(() => {
        setLoading(true);

        // --- Assignments listener ---
        const assignmentsQuery = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
            const assignmentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                type: 'assignment',
                ...doc.data()
            }));
            setAssignments(assignmentsData);
        });

        // --- Quizzes listener ---
        const quizzesQuery = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
            const quizzesData = snapshot.docs.map(doc => ({
                id: doc.id,
                type: 'quiz',
                ...doc.data()
            }));
            setQuizzes(quizzesData);
        });

        return () => {
            unsubscribeAssignments();
            unsubscribeQuizzes();
        };
    }, []);

    // Combine assignments + quizzes for upcoming deadlines
    useEffect(() => {
        const allItems = [
            ...assignments.map(a => ({ ...a, dueDate: a.DeadLine, title: a.AssignmentTitle })),
            ...quizzes.map(q => ({ ...q, dueDate: q.deadline, title: q.quizTitle }))
        ];

        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const upcoming = allItems
            .filter(item => {
                if (!item.dueDate) return false;
                const dueDate = new Date(item.dueDate);
                return dueDate > now && dueDate <= nextWeek;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);

        setUpcomingDeadlines(upcoming);

        // Set loading to false when we have some data
        if ((assignments.length > 0 || quizzes.length > 0) && enrolledCourses.length >= 0) {
            setLoading(false);
        }
    }, [assignments, quizzes, enrolledCourses]);

    // Calculate overall progress based on enrolled courses
    const calculateOverallProgress = () => {
        if (enrolledCourses.length === 0) return 0;

        // For now, return a fixed progress. You can implement real progress tracking later
        return 75; // Example: 75% overall progress
    };

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-30 mb-30">
            <div className='grid grid-cols-[75%_25%] max-w-6xl mx-auto'>
                {/* --- Sidebar --- */}
                <div className='order-2 z-1'>
                    <div className='space-y-8 sticky top-25'>
                        {/* Quick Actions */}
                        <div className='bg-white p-6 rounded-xl shadow-md'>
                            <h3 className='text-lg font-bold mb-4'>🚀 Quick Actions</h3>
                            <div className='space-y-3'>
                                <Link
                                    to="/ide"
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-blue-200"
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                        <i className="fas fa-code text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">Code IDE</p>
                                        <p className="text-xs text-gray-500">Practice coding online</p>
                                    </div>
                                </Link>

                                <Link
                                    to="/courses"
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-blue-200"
                                >
                                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                        <i className="fas fa-book text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">Browse Courses</p>
                                        <p className="text-xs text-gray-500">Find new courses to enroll</p>
                                    </div>
                                </Link>

                                <Link
                                    to="/performance-analysis"
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-blue-200"
                                >
                                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                        <i className="fas fa-chart-line text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">Performance Analysis</p>
                                        <p className="text-xs text-gray-500">View detailed insights</p>
                                    </div>
                                </Link>
                                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                                    <i className="fas fa-video text-[#4CBC9A]"></i>
                                    Join Live Session
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                                    <i className="fas fa-tasks text-[#FEC64F]"></i>
                                    View Study Plan
                                </button>
                            </div>
                        </div>

                        {/* Upcoming Deadlines */}
                        <div className='bg-white p-6 rounded-xl shadow-md'>
                            <h3 className='text-lg font-bold mb-4'>⏳ Upcoming Deadlines</h3>
                            <div className='space-y-4'>
                                {upcomingDeadlines.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">No upcoming deadlines</div>
                                ) : (
                                    upcomingDeadlines.map((item) => (
                                        <div key={item.id} className='flex items-start gap-3'>
                                            <div className={`w-8 h-8 ${item.type === 'quiz' ? 'bg-[#FEC64F]' : 'bg-[#4CBC9A]'} rounded-full flex items-center justify-center mt-1`}>
                                                <i className={`fas ${item.type === 'quiz' ? 'fa-question-circle' : 'fa-file-alt'} text-white text-sm`}></i>
                                            </div>
                                            <div>
                                                <p className='font-medium text-sm'>{item.title}</p>
                                                <p className='text-xs text-gray-500'>Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Course Progress */}
                        <div className='bg-white p-6 rounded-xl shadow-md'>
                            <h3 className='text-lg font-bold mb-4'>📈 Course Progress</h3>
                            <div className='space-y-4'>
                                {enrolledCourses.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center">No enrolled courses yet</p>
                                ) : (
                                    enrolledCourses.slice(0, 3).map((course) => (
                                        <div key={course.id}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-medium truncate">{course.title}</span>
                                                <span className="text-xs text-gray-500">65%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-[#4CBC9A] h-2 rounded-full" style={{ width: '65%' }}></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* IDE Quick Access */}
                        <div className='bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-xl shadow-md text-white'>
                            <h3 className='text-lg font-bold mb-3 flex items-center gap-2'>
                                <i className="fas fa-laptop-code"></i>
                                Coding Practice
                            </h3>
                            <p className='text-sm text-blue-100 mb-4'>
                                Practice coding in multiple languages with our built-in IDE. Perfect for programming assignments and learning.
                            </p>
                            <Link
                                to="/ide"
                                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-rocket"></i>
                                Open Code IDE
                            </Link>
                        </div>
                    </div>
                </div>

                {/* --- Main Section --- */}
                <div className='order-1 pr-5'>
                    {/* Hero Section */}
                    <div className='max-w-6xl relative mx-auto flex flex-col bg-BgPrimary rounded-2xl py-14 px-10 shadow-2xl'>
                        <i className='fas fa-circle-half-stroke rotate-180 absolute text-white text-[200px] opacity-20 -right-25'></i>
                        <div className='text-left w-[80%]'>
                            <h1 className='heading-text-lg font-poppins pb-2 text-white'>
                                Welcome Back, {user?.displayName || 'Student'}!
                            </h1>
                            <p className='text-white font-poppins'>
                                Continue your learning journey with SkillUp. You have {enrolledCourses.length} enrolled courses.
                            </p>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Stats Cards */}
                    <div className='max-w-6xl mx-auto mt-10'>
                        <div className='flex overflow-x-auto gap-7 pb-4 scrollbar-hide scroll-smooth'>
                            {/* Enrolled Courses Card */}
                            <div className='flex-shrink-0 relative group w-80 flex flex-col bg-BgPrimary rounded-2xl py-14 px-10 justify-between shadow-lg'>
                                <i className="fas fa-check-square absolute text-white text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-10 "></i>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5">
                                    <i className="fas fa-check-square text-greenSmall text-3xl"></i>
                                </div>
                                <p className='font-poppins text-3xl text-white font-bold mb-2'>{enrolledCourses.length}</p>
                                <p className='font-poppins text-1xl text-white'>Enrolled Courses</p>
                            </div>

                            {/* Active Assignments Card */}
                            <div className='flex-shrink-0 relative group w-80 flex flex-col bg-[#FEC64F] rounded-2xl py-14 px-10 justify-between shadow-lg'>
                                <i className="fas fa-lightbulb absolute text-white text-[150px] opacity-26 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-10 "></i>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5">
                                    <i className="fas fa-lightbulb text-[#FEC64F] text-3xl"></i>
                                </div>
                                <p className='font-poppins text-3xl text-white font-bold mb-2'>{assignments.length}</p>
                                <p className='font-poppins text-1xl text-white'>Active Assignments</p>
                            </div>

                            {/* Active Quizzes Card */}
                            <div className='flex-shrink-0 relative group w-80 flex flex-col bg-[#6c5dd3] rounded-2xl py-14 px-10 justify-between shadow-lg'>
                                <i className="fas fa-question-circle absolute text-white text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-10 "></i>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5">
                                    <i className="fas fa-question-circle text-[#6c5dd3] text-3xl"></i>
                                </div>
                                <p className='font-poppins text-3xl text-white font-bold mb-2'>{quizzes.length}</p>
                                <p className='font-poppins text-1xl text-white'>Active Quizzes</p>
                            </div>

                            {/* Completed Courses Card */}
                            <div className='flex-shrink-0 relative group w-80 flex flex-col bg-[#4CBC9A] rounded-2xl py-14 px-10 justify-between shadow-lg'>
                                <i className="fas fa-trophy absolute text-white text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-10 "></i>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5">
                                    <i className="fas fa-trophy text-[#4CBC9A] text-3xl"></i>
                                </div>
                                <p className='font-poppins text-3xl text-white font-bold mb-2'>{completedCoursesCount}</p>
                                <p className='font-poppins text-1xl text-white'>Completed Courses</p>
                            </div>

                            {/* IDE Card */}
                            <div className='flex-shrink-0 relative group w-80 flex flex-col bg-black rounded-2xl py-14 px-10 justify-between shadow-lg'>
                                <i className="fas fa-laptop-code absolute text-white text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-10 "></i>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5">
                                    <i className="fas fa-laptop-code text-black text-3xl"></i>
                                </div>
                                <p className='font-poppins text-3xl text-white font-bold mb-2'>IDE</p>
                                <Link
                                    to="/ide"
                                    className='font-poppins text-1xl text-white hover:text-blue-200 transition-colors flex items-center gap-2'
                                >
                                    Code Practice <i className="fas fa-arrow-right text-sm"></i>
                                </Link>
                            </div>

                            {/* Certificates Card */}
                            <div className='flex-shrink-0 relative group w-80 flex flex-col bg-[#FF6B6B] rounded-2xl py-14 px-10 justify-between shadow-lg'>
                                <i className="fas fa-certificate absolute text-white text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-10 "></i>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5">
                                    <i className="fas fa-certificate text-[#FF6B6B] text-3xl"></i>
                                </div>
                                <p className='font-poppins text-3xl text-white font-bold mb-2'>{completedCoursesCount}</p>
                                <p className='font-poppins text-1xl text-white'>Certificates Earned</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Report */}
                    <div className='text-left mt-15 mb-10'>
                        <h1 className='heading-text-lg font-poppins'>Progress Report</h1>
                    </div>
                    <div className="flex w-full gap-5 mt-10">
                        <div className="w-2/3 bg-white shadow-md rounded-lg p-5">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={data}>
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'black', color: '#ffff', borderRadius: '6px' }}
                                        formatter={(value) => [`${value}`, 'Score']}
                                    />
                                    <Line type="monotone" dataKey="lastWeek" stroke="#FFC107" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="thisWeek" stroke="#4BB998" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="w-1/3 bg-white shadow-md rounded-lg p-5 flex flex-col items-center justify-center">
                            <div className="w-24 h-24 mb-4">
                                <CircularProgressbar
                                    value={calculateOverallProgress()}
                                    text={`${calculateOverallProgress()}%`}
                                    styles={buildStyles({
                                        textColor: '#000',
                                        pathColor: '#4BB998',
                                        trailColor: '#f0f0f0',
                                        textSize: '18px'
                                    })}
                                />
                            </div>
                            <h3 className="text-base font-bold text-gray-700 mb-1">My Progress</h3>
                            <p className="text-sm text-gray-500 text-center px-2 mb-2">
                                {enrolledCourses.length === 0
                                    ? 'Enroll in courses to start tracking your progress'
                                    : `Tracking ${enrolledCourses.length} enrolled courses`
                                }
                            </p>
                            <Link
                                to="/courses"
                                className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] transition"
                            >
                                {enrolledCourses.length === 0 ? 'Browse Courses' : 'View All Courses'}
                            </Link>
                        </div>
                    </div>

                    {/* Coding Practice Section */}
                    <div className='text-left mt-15 mb-10'>
                        <div className="flex justify-between items-center">
                            <h1 className='heading-text-lg font-poppins'>Coding Practice</h1>
                            <Link
                                to="/ide"
                                className="text-BgPrimary hover:text-blue-700 font-medium flex items-center gap-2"
                            >
                                View All Features <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                                <i className="fas fa-code text-white text-xl"></i>
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 mb-2">Multi-Language Support</h3>
                            <p className="text-gray-600 text-sm mb-4">Python, JavaScript, Java, C++ and more</p>
                            <Link
                                to="/ide"
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                            >
                                Try now <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                                <i className="fas fa-bolt text-white text-xl"></i>
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 mb-2">Instant Execution</h3>
                            <p className="text-gray-600 text-sm mb-4">Run code and see results in real-time</p>
                            <Link
                                to="/ide"
                                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
                            >
                                Start coding <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                                <i className="fas fa-cloud text-white text-xl"></i>
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 mb-2">Cloud-Based</h3>
                            <p className="text-gray-600 text-sm mb-4">No setup required, works in browser</p>
                            <Link
                                to="/ide"
                                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                            >
                                Explore IDE <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>
                    </div>

                    {/* Enrolled Courses */}
                    <div className='text-left mt-15 mb-10'>
                        <div className="flex justify-between items-center">
                            <h1 className='heading-text-lg font-poppins'>Enrolled Courses</h1>
                            {enrolledCourses.length > 0 && (
                                <Link
                                    to="/my-courses"
                                    className="text-BgPrimary hover:text-blue-700 font-medium flex items-center gap-2"
                                >
                                    View All <i className="fas fa-arrow-right"></i>
                                </Link>
                            )}
                        </div>
                    </div>

                    {enrolledCourses.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md p-8 text-center">
                            <i className="fas fa-book-open text-4xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Enrolled Courses Yet</h3>
                            <p className="text-gray-500 mb-6">
                                Start your learning journey by enrolling in courses that interest you.
                            </p>
                            <Link
                                to="/courses"
                                className="bg-[#6c5dd3] text-white px-6 py-3 rounded-lg hover:bg-[#5a4bbf] transition font-semibold"
                            >
                                Browse Available Courses
                            </Link>
                        </div>
                    ) : (
                        <CoursePreview courses={enrolledCourses.slice(0, 2)} />
                    )}

                    {/* Active Assignments */}
                    <div className='text-left mt-15 mb-10'>
                        <h1 className='heading-text-lg font-poppins'>Active Assignments</h1>
                    </div>
                    <AssignmentPreview assignment={assignments.slice(0, 3)} />

                    {/* Active Quizzes */}
                    <div className='text-left mt-15 mb-10'>
                        <h1 className='heading-text-lg font-poppins'>Active Quizzes</h1>
                    </div>
                    <QuizPreview quizzes={quizzes.slice(0, 3)} />
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;

