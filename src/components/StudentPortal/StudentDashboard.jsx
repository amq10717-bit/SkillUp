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
        <div className="min-h-screen my-10 lg:mt-30 lg:mb-30">
            <div className='flex flex-col lg:grid lg:grid-cols-[75%_25%] max-w-7xl mx-auto px-[15px] lg:px-0 gap-8 lg:gap-0'>

                {/* Sidebar (Stacked on mobile) */}
                <div className='order-2 lg:order-2 z-1 w-full'>
                    <div className='space-y-6 lg:space-y-8 static lg:sticky lg:top-25'>
                        {/* Quick Actions */}
                        <div className='bg-white p-4 lg:p-6 rounded-xl shadow-md'>
                            <h3 className='text-base lg:text-lg font-bold mb-3 lg:mb-4'>🚀 Quick Actions</h3>
                            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3'>
                                <Link
                                    to="/ide"
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-blue-200 bg-gray-50 lg:bg-white"
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-code text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm lg:text-base">Code IDE</p>
                                        <p className="text-xs text-gray-500">Practice coding online</p>
                                    </div>
                                </Link>

                                <Link
                                    to="/courses"
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-blue-200 bg-gray-50 lg:bg-white"
                                >
                                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-book text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm lg:text-base">Browse Courses</p>
                                        <p className="text-xs text-gray-500">Find new courses to enroll</p>
                                    </div>
                                </Link>

                                <Link
                                    to="/performance-analysis"
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-blue-200 bg-gray-50 lg:bg-white"
                                >
                                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-chart-line text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm lg:text-base">Performance Analysis</p>
                                        <p className="text-xs text-gray-500">View detailed insights</p>
                                    </div>
                                </Link>

                                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition bg-gray-50 lg:bg-white">
                                    <i className="fas fa-video text-[#4CBC9A] w-8 text-center"></i>
                                    <span className="text-sm lg:text-base font-medium">Join Live Session</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition bg-gray-50 lg:bg-white">
                                    <i className="fas fa-tasks text-[#FEC64F] w-8 text-center"></i>
                                    <span className="text-sm lg:text-base font-medium">View Study Plan</span>
                                </button>
                            </div>
                        </div>

                        {/* Upcoming Deadlines */}
                        <div className='bg-white p-4 lg:p-6 rounded-xl shadow-md'>
                            <h3 className='text-base lg:text-lg font-bold mb-3 lg:mb-4'>⏳ Upcoming Deadlines</h3>
                            <div className='space-y-3 lg:space-y-4'>
                                {upcomingDeadlines.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4 text-sm">No upcoming deadlines</div>
                                ) : (
                                    upcomingDeadlines.map((item) => (
                                        <div key={item.id} className='flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors'>
                                            <div className={`w-8 h-8 ${item.type === 'quiz' ? 'bg-[#FEC64F]' : 'bg-[#4CBC9A]'} rounded-full flex items-center justify-center mt-1 flex-shrink-0`}>
                                                <i className={`fas ${item.type === 'quiz' ? 'fa-question-circle' : 'fa-file-alt'} text-white text-sm`}></i>
                                            </div>
                                            <div className="min-w-0">
                                                <p className='font-medium text-sm truncate'>{item.title}</p>
                                                <p className='text-xs text-gray-500'>Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Course Progress */}
                        <div className='bg-white p-4 lg:p-6 rounded-xl shadow-md'>
                            <h3 className='text-base lg:text-lg font-bold mb-3 lg:mb-4'>📈 Course Progress</h3>
                            <div className='space-y-4'>
                                {enrolledCourses.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center">No enrolled courses yet</p>
                                ) : (
                                    enrolledCourses.slice(0, 3).map((course) => (
                                        <div key={course.id}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs lg:text-sm font-medium truncate pr-2">{course.title}</span>
                                                <span className="text-xs text-gray-500">65%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 lg:h-2">
                                                <div className="bg-[#4CBC9A] h-1.5 lg:h-2 rounded-full" style={{ width: '65%' }}></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* IDE Quick Access */}
                        <div className='bg-gradient-to-br from-blue-600 to-purple-700 p-4 lg:p-6 rounded-xl shadow-md text-white'>
                            <h3 className='text-base lg:text-lg font-bold mb-2 lg:mb-3 flex items-center gap-2'>
                                <i className="fas fa-laptop-code"></i>
                                Coding Practice
                            </h3>
                            <p className='text-xs lg:text-sm text-blue-100 mb-3 lg:mb-4'>
                                Practice coding in multiple languages with our built-in IDE. Perfect for programming assignments and learning.
                            </p>
                            <Link
                                to="/ide"
                                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 lg:py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm lg:text-base active:scale-95"
                            >
                                <i className="fas fa-rocket"></i>
                                Open Code IDE
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Section */}
                <div className='order-1 w-full lg:pr-5 mb-8 lg:mb-0'>
                    {/* Hero Section */}
                    <div className='relative flex flex-col bg-BgPrimary rounded-xl lg:rounded-2xl py-8 px-6 lg:py-14 lg:px-10 shadow-lg lg:shadow-2xl overflow-hidden mb-8 lg:mb-10'>
                        <i className='fas fa-circle-half-stroke rotate-180 absolute text-white text-[120px] lg:text-[200px] opacity-20 -right-10 lg:-right-25 -bottom-10 lg:bottom-auto'></i>
                        <div className='text-left w-full lg:w-[80%] relative z-10'>
                            <h1 className='text-xl lg:heading-text-lg font-bold font-poppins pb-2 text-white'>
                                Welcome Back, {user?.displayName || 'Student'}!
                            </h1>
                            <p className='text-white font-poppins text-sm lg:text-base opacity-90'>
                                Continue your learning journey with SkillUp. You have {enrolledCourses.length} enrolled courses.
                            </p>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Stats Cards */}
                    <div className='mb-8 lg:mb-10 -mx-[15px] lg:mx-0 px-[15px] lg:px-0'>
                        <div className='flex overflow-x-auto gap-4 lg:gap-7 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory lg:snap-none'>
                            {/* Enrolled Courses Card */}
                            <div className='flex-shrink-0 relative group w-64 lg:w-80 flex flex-col bg-BgPrimary rounded-xl lg:rounded-2xl p-6 lg:py-14 lg:px-10 justify-between shadow-lg snap-center'>
                                <i className="fas fa-check-square absolute text-white text-[100px] lg:text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-5 lg:-right-10 -bottom-5 lg:bottom-auto"></i>
                                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-5">
                                    <i className="fas fa-check-square text-greenSmall text-xl lg:text-3xl"></i>
                                </div>
                                <div>
                                    <p className='font-poppins text-2xl lg:text-3xl text-white font-bold mb-1 lg:mb-2'>{enrolledCourses.length}</p>
                                    <p className='font-poppins text-sm lg:text-xl text-white'>Enrolled Courses</p>
                                </div>
                            </div>

                            {/* Active Assignments Card */}
                            <div className='flex-shrink-0 relative group w-64 lg:w-80 flex flex-col bg-[#FEC64F] rounded-xl lg:rounded-2xl p-6 lg:py-14 lg:px-10 justify-between shadow-lg snap-center'>
                                <i className="fas fa-lightbulb absolute text-white text-[100px] lg:text-[150px] opacity-26 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-5 lg:-right-10 -bottom-5 lg:bottom-auto"></i>
                                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-5">
                                    <i className="fas fa-lightbulb text-[#FEC64F] text-xl lg:text-3xl"></i>
                                </div>
                                <div>
                                    <p className='font-poppins text-2xl lg:text-3xl text-white font-bold mb-1 lg:mb-2'>{assignments.length}</p>
                                    <p className='font-poppins text-sm lg:text-xl text-white'>Active Assignments</p>
                                </div>
                            </div>

                            {/* Active Quizzes Card */}
                            <div className='flex-shrink-0 relative group w-64 lg:w-80 flex flex-col bg-[#6c5dd3] rounded-xl lg:rounded-2xl p-6 lg:py-14 lg:px-10 justify-between shadow-lg snap-center'>
                                <i className="fas fa-question-circle absolute text-white text-[100px] lg:text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-5 lg:-right-10 -bottom-5 lg:bottom-auto"></i>
                                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-5">
                                    <i className="fas fa-question-circle text-[#6c5dd3] text-xl lg:text-3xl"></i>
                                </div>
                                <div>
                                    <p className='font-poppins text-2xl lg:text-3xl text-white font-bold mb-1 lg:mb-2'>{quizzes.length}</p>
                                    <p className='font-poppins text-sm lg:text-xl text-white'>Active Quizzes</p>
                                </div>
                            </div>

                            {/* Completed Courses Card */}
                            <div className='flex-shrink-0 relative group w-64 lg:w-80 flex flex-col bg-[#4CBC9A] rounded-xl lg:rounded-2xl p-6 lg:py-14 lg:px-10 justify-between shadow-lg snap-center'>
                                <i className="fas fa-trophy absolute text-white text-[100px] lg:text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-5 lg:-right-10 -bottom-5 lg:bottom-auto"></i>
                                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-5">
                                    <i className="fas fa-trophy text-[#4CBC9A] text-xl lg:text-3xl"></i>
                                </div>
                                <div>
                                    <p className='font-poppins text-2xl lg:text-3xl text-white font-bold mb-1 lg:mb-2'>{completedCoursesCount}</p>
                                    <p className='font-poppins text-sm lg:text-xl text-white'>Completed Courses</p>
                                </div>
                            </div>

                            {/* Certificates Card */}
                            <div className='flex-shrink-0 relative group w-64 lg:w-80 flex flex-col bg-[#FF6B6B] rounded-xl lg:rounded-2xl p-6 lg:py-14 lg:px-10 justify-between shadow-lg snap-center'>
                                <i className="fas fa-certificate absolute text-white text-[100px] lg:text-[150px] opacity-20 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none -right-5 lg:-right-10 -bottom-5 lg:bottom-auto"></i>
                                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-5">
                                    <i className="fas fa-certificate text-[#FF6B6B] text-xl lg:text-3xl"></i>
                                </div>
                                <div>
                                    <p className='font-poppins text-2xl lg:text-3xl text-white font-bold mb-1 lg:mb-2'>{completedCoursesCount}</p>
                                    <p className='font-poppins text-sm lg:text-xl text-white'>Certificates Earned</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Report */}
                    
                    <div className="flex flex-col lg:flex-row w-full gap-5 mb-10">
                        <div className="w-full lg:w-2/3 bg-white shadow-md rounded-lg p-4 lg:p-5 h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'black', color: '#ffff', borderRadius: '6px', fontSize: '12px' }}
                                        formatter={(value) => [`${value}`, 'Score']}
                                    />
                                    <Line type="monotone" dataKey="lastWeek" stroke="#FFC107" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="thisWeek" stroke="#4BB998" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="w-full lg:w-1/3 bg-white shadow-md rounded-lg p-4 lg:p-5 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 lg:w-24 lg:h-24 mb-4">
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
                            <p className="text-xs lg:text-sm text-gray-500 text-center px-2 mb-3 lg:mb-2">
                                {enrolledCourses.length === 0
                                    ? 'Enroll in courses to start tracking your progress'
                                    : `Tracking ${enrolledCourses.length} enrolled courses`
                                }
                            </p>
                            <Link
                                to="/generated-courses"
                                className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] transition text-sm lg:text-base"
                            >
                                {enrolledCourses.length === 0 ? 'Browse Courses' : 'View All Courses'}
                            </Link>
                        </div>
                    </div>

                    {/* Coding Practice Section */}
                    <div className='text-left mb-6 lg:mb-10'>
                        <div className="flex justify-between items-center">
                            <h1 className='text-xl lg:heading-text-lg font-bold font-poppins'>Coding Practice</h1>
                            <Link
                                to="/ide"
                                className="text-BgPrimary hover:text-blue-700 font-medium flex items-center gap-2 text-sm lg:text-base"
                            >
                                View All <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-10">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 lg:p-6 hover:shadow-lg transition-shadow">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-3 lg:mb-4">
                                <i className="fas fa-code text-white text-lg lg:text-xl"></i>
                            </div>
                            <h3 className="font-bold text-base lg:text-lg text-gray-800 mb-1 lg:mb-2">Multi-Language</h3>
                            <p className="text-gray-600 text-xs lg:text-sm mb-3 lg:mb-4">Python, JS, Java, C++</p>
                            <Link
                                to="/ide"
                                className="text-blue-600 hover:text-blue-700 text-xs lg:text-sm font-medium flex items-center gap-1"
                            >
                                Try now <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 lg:p-6 hover:shadow-lg transition-shadow">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-600 rounded-lg flex items-center justify-center mb-3 lg:mb-4">
                                <i className="fas fa-bolt text-white text-lg lg:text-xl"></i>
                            </div>
                            <h3 className="font-bold text-base lg:text-lg text-gray-800 mb-1 lg:mb-2">Instant Run</h3>
                            <p className="text-gray-600 text-xs lg:text-sm mb-3 lg:mb-4">See results in real-time</p>
                            <Link
                                to="/ide"
                                className="text-green-600 hover:text-green-700 text-xs lg:text-sm font-medium flex items-center gap-1"
                            >
                                Start coding <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 lg:p-6 hover:shadow-lg transition-shadow">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-3 lg:mb-4">
                                <i className="fas fa-cloud text-white text-lg lg:text-xl"></i>
                            </div>
                            <h3 className="font-bold text-base lg:text-lg text-gray-800 mb-1 lg:mb-2">Cloud-Based</h3>
                            <p className="text-gray-600 text-xs lg:text-sm mb-3 lg:mb-4">No setup required</p>
                            <Link
                                to="/ide"
                                className="text-purple-600 hover:text-purple-700 text-xs lg:text-sm font-medium flex items-center gap-1"
                            >
                                Explore IDE <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>
                    </div>

                    {/* Enrolled Courses List */}
                    <div className='text-left mb-6 lg:mb-10'>
                        <div className="flex justify-between items-center">
                            <h1 className='text-xl lg:heading-text-lg font-bold font-poppins'>Enrolled Courses</h1>
                            {enrolledCourses.length > 0 && (
                                <Link
                                    to="/generated-courses"
                                    className="text-BgPrimary hover:text-blue-700 font-medium flex items-center gap-2 text-sm lg:text-base"
                                >
                                    View All <i className="fas fa-arrow-right text-xs"></i>
                                </Link>
                            )}
                        </div>
                    </div>

                    {enrolledCourses.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md p-6 lg:p-8 text-center">
                            <i className="fas fa-book-open text-3xl lg:text-4xl text-gray-300 mb-3 lg:mb-4"></i>
                            <h3 className="text-base lg:text-xl font-semibold text-gray-600 mb-2">No Enrolled Courses Yet</h3>
                            <p className="text-sm lg:text-base text-gray-500 mb-6">
                                Start your learning journey by enrolling in courses that interest you.
                            </p>
                            <Link
                                to="/courses"
                                className="bg-[#6c5dd3] text-white px-6 py-3 rounded-lg hover:bg-[#5a4bbf] transition font-semibold text-sm lg:text-base inline-block"
                            >
                                Browse Available Courses
                            </Link>
                        </div>
                    ) : (
                        <CoursePreview courses={enrolledCourses.slice(0, 2)} />
                    )}

                    {/* Active Assignments */}
                    <div className='text-left mt-10 lg:mt-15 mb-6 lg:mb-10'>
                        <h1 className='text-xl lg:heading-text-lg font-bold font-poppins'>Active Assignments</h1>
                    </div>
                    <AssignmentPreview assignment={assignments.slice(0, 3)} />

                    {/* Active Quizzes */}
                    <div className='text-left mt-10 lg:mt-15 mb-6 lg:mb-10'>
                        <h1 className='text-xl lg:heading-text-lg font-bold font-poppins'>Active Quizzes</h1>
                    </div>
                    <QuizPreview quizzes={quizzes.slice(0, 3)} />
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;

