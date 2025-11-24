import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { collection, onSnapshot, query, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const TutorDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalEarnings: 0,
        averageRating: 0
    });

    // Dynamic data for charts based on real data
    const [studentGrowthData, setStudentGrowthData] = useState([]);
    const [contentDistributionData, setContentDistributionData] = useState([]);

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];
    const CHART_COLORS = {
        primary: '#4F46E5',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#F8FAFC'
    };

    // Generate student growth data based on actual enrollment trends
    const generateStudentGrowthData = (courses, totalStudents) => {
        if (courses.length === 0) return [];

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();

        return months.slice(0, currentMonth + 1).map((month, index) => {
            // Simulate growth pattern based on actual student count
            const baseGrowth = Math.floor(totalStudents / (currentMonth + 1));
            const students = Math.min(totalStudents, baseGrowth * (index + 1) + Math.floor(Math.random() * 10));

            return {
                name: month,
                students: students,
                growth: index > 0 ? Math.floor((students / (baseGrowth * index)) * 100 - 100) : 0
            };
        });
    };

    // Generate content distribution data based on actual counts
    const generateContentDistributionData = (courses, assignments, quizzes) => {
        return [
            { name: 'Courses', value: courses.length, count: courses.length },
            { name: 'Assignments', value: assignments.length, count: assignments.length },
            { name: 'Quizzes', value: quizzes.length, count: quizzes.length },
            { name: 'Students', value: stats.totalStudents, count: stats.totalStudents }
        ];
    };

    // Fetch tutor's data
    useEffect(() => {
        const fetchTutorData = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) {
                    console.log('No user logged in');
                    setLoading(false);
                    return;
                }

                console.log('Fetching data for tutor:', user.uid);

                // Fetch tutor's courses
                const coursesQuery = query(
                    collection(db, 'courses'),
                    where('tutorId', '==', user.uid)
                );

                const coursesUnsubscribe = onSnapshot(coursesQuery, async (snapshot) => {
                    const coursesData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        enrolledCount: doc.data().enrolledCount || 0,
                        rating: doc.data().rating || 0,
                        price: doc.data().price || 0
                    }));

                    console.log('Tutor courses:', coursesData);
                    setCourses(coursesData);

                    // Fetch enrollments for these courses
                    let totalStudents = 0;
                    if (coursesData.length > 0) {
                        const enrollmentPromises = coursesData.map(async (course) => {
                            const enrollmentsQuery = query(
                                collection(db, 'enrollments'),
                                where('courseId', '==', course.id)
                            );
                            const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
                            return enrollmentsSnapshot.size;
                        });

                        const enrollmentCounts = await Promise.all(enrollmentPromises);
                        totalStudents = enrollmentCounts.reduce((sum, count) => sum + count, 0);
                    }

                    // Calculate stats
                    const totalEarnings = coursesData.reduce((sum, course) => {
                        return sum + (course.price * (course.enrolledCount || 0));
                    }, 0);

                    const averageRating = coursesData.length > 0 ?
                        coursesData.reduce((sum, course) => sum + (course.rating || 0), 0) / coursesData.length : 0;

                    setStats({
                        totalStudents,
                        totalEarnings,
                        averageRating
                    });

                    // Generate dynamic chart data
                    setStudentGrowthData(generateStudentGrowthData(coursesData, totalStudents));
                    setContentDistributionData(generateContentDistributionData(coursesData, assignments, quizzes));

                    setLoading(false);
                });

                // Fetch tutor's assignments
                const assignmentsQuery = query(
                    collection(db, 'assignments'),
                    where('createdBy', '==', user.uid)
                );
                const assignmentsUnsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
                    const assignmentsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setAssignments(assignmentsData);
                    // Update content distribution when assignments change
                    setContentDistributionData(generateContentDistributionData(courses, assignmentsData, quizzes));
                });

                // Fetch tutor's quizzes
                const quizzesQuery = query(
                    collection(db, 'quizzes'),
                    where('createdBy', '==', user.uid)
                );
                const quizzesUnsubscribe = onSnapshot(quizzesQuery, (snapshot) => {
                    const quizzesData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setQuizzes(quizzesData);
                    // Update content distribution when quizzes change
                    setContentDistributionData(generateContentDistributionData(courses, assignments, quizzesData));
                });

                return () => {
                    coursesUnsubscribe();
                    assignmentsUnsubscribe();
                    quizzesUnsubscribe();
                };
            } catch (error) {
                console.error('Error fetching tutor data:', error);
                setLoading(false);
            }
        };

        fetchTutorData();
    }, []);

    // Update chart data when stats change
    useEffect(() => {
        if (courses.length > 0) {
            setStudentGrowthData(generateStudentGrowthData(courses, stats.totalStudents));
            setContentDistributionData(generateContentDistributionData(courses, assignments, quizzes));
        }
    }, [stats.totalStudents, courses.length, assignments.length, quizzes.length]);

    // Delete handler
    const handleDelete = async (collectionName, docId, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
        setDeleteLoading(docId);
        try {
            await deleteDoc(doc(db, collectionName, docId));
            alert(`${collectionName.slice(0, -1)} deleted successfully!`);
        } catch (error) {
            console.error(`Error deleting ${collectionName}:`, error);
            alert(`Failed to delete: ${error.message}`);
        } finally {
            setDeleteLoading(null);
        }
    };

    // Custom tooltip for student growth chart
    const StudentGrowthTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{label}</p>
                    <p className="text-sm text-indigo-600">
                        Students: <span className="font-bold">{payload[0].value}</span>
                    </p>
                    {payload[0].payload.growth !== 0 && (
                        <p className={`text-xs ${payload[0].payload.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {payload[0].payload.growth >= 0 ? '↑' : '↓'} {Math.abs(payload[0].payload.growth)}%
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for content distribution
    const ContentDistributionTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
                    <p className="text-sm text-gray-600">
                        Count: <span className="font-bold">{payload[0].payload.count}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                        {((payload[0].value / contentDistributionData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}% of total
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 font-poppins">
            <div className="max-w-7xl mt-[70px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 lg:p-8 text-white shadow-lg">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold mb-2">Welcome back, Tutor!</h1>
                                <p className="text-indigo-100 text-base lg:text-lg max-w-2xl">
                                    Manage your courses, track student progress, and grow your teaching business.
                                </p>
                            </div>
                            <div className="mt-4 lg:mt-0">
                                <Link
                                    to="/add-course"
                                    className="inline-flex items-center px-6 py-3 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    Create New Course
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mr-4">
                                <i className="fas fa-book-open text-xl"></i>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Courses</p>
                                <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 mr-4">
                                <i className="fas fa-users text-xl"></i>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Students</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                            <div className="p-3 rounded-lg bg-amber-50 text-amber-600 mr-4">
                                <i className="fas fa-tasks text-xl"></i>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Content</p>
                                <p className="text-2xl font-bold text-gray-800">{assignments.length + quizzes.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                            <div className="p-3 rounded-lg bg-purple-50 text-purple-600 mr-4">
                                <i className="fas fa-star text-xl"></i>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Average Rating</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.averageRating.toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="lg:w-2/3 space-y-8">
                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Student Growth Chart */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 col-span-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800">Student Growth</h3>
                                    <div className="text-sm text-gray-500">
                                        Total: {stats.totalStudents} students
                                    </div>
                                </div>
                                <div className="h-72">
                                    {studentGrowthData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-500">
                                            No student data available
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={studentGrowthData}>
                                                <defs>
                                                    <linearGradient id="studentGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip content={<StudentGrowthTooltip />} />
                                                <Bar
                                                    dataKey="students"
                                                    fill="url(#studentGradient)"
                                                    radius={[4, 4, 0, 0]}
                                                    maxBarSize={40}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Content Distribution */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 col-span-1">
                                <h3 className="text-lg font-semibold text-gray-800 mb-6">Content Distribution</h3>
                                <div className="h-72">
                                    {contentDistributionData.filter(item => item.value > 0).length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-500">
                                            No content data available
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={contentDistributionData.filter(item => item.value > 0)}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}
                                                >
                                                    {contentDistributionData.filter(item => item.value > 0).map((entry, index) => (
                                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ContentDistributionTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-center gap-4 mt-4">
                                    {contentDistributionData.filter(item => item.value > 0).map((entry, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }}></div>
                                            <span className="text-gray-700">{entry.name}</span>
                                            <span className="font-semibold text-gray-900">({entry.count})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Courses Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-800">Your Courses</h2>
                                <Link
                                    to="/add-course"
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    New Course
                                </Link>
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center justify-center">
                                            <i className="fas fa-spinner fa-spin text-indigo-600 text-xl mr-3"></i>
                                            <span className="text-gray-600">Loading courses...</span>
                                        </div>
                                    </div>
                                ) : courses.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i className="fas fa-book-open text-indigo-600 text-2xl"></i>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                            Start sharing your knowledge by creating your first course.
                                        </p>
                                        <Link
                                            to="/add-course"
                                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                                        >
                                            Create Your First Course
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {courses.map((course) => (
                                            <div key={course.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden group">
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="font-semibold text-gray-800 text-lg line-clamp-1 flex-1 pr-2">{course.title}</h3>
                                                        <button
                                                            onClick={() => handleDelete('courses', course.id, course.title)}
                                                            disabled={deleteLoading === course.id}
                                                            className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded"
                                                        >
                                                            {deleteLoading === course.id ?
                                                                <i className="fas fa-spinner fa-spin"></i> :
                                                                <i className="fas fa-trash-alt"></i>
                                                            }
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                                        <span className="flex items-center">
                                                            <i className="fas fa-users mr-1"></i>
                                                            {course.enrolledCount || 0} students
                                                        </span>
                                                        <span className="flex items-center">
                                                            <i className="fas fa-star text-amber-500 mr-1"></i>
                                                            {course.rating || 0}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-full text-xs ${course.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                                                            course.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {course.status || 'draft'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                        <Link
                                                            to={`/tutor/course/${course.id}`}
                                                            className="flex-1 text-center py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                                                        >
                                                            Manage
                                                        </Link>
                                                        <Link
                                                            to={`/tutor/course/${course.id}/analytics`}
                                                            className="flex-1 text-center py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                                                        >
                                                            Analytics
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assignments & Quizzes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Assignments */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-800">Assignments</h2>
                                    <Link
                                        to="/create-assignment"
                                        className="flex items-center px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
                                    >
                                        <i className="fas fa-plus mr-1"></i>
                                        New
                                    </Link>
                                </div>
                                <div className="p-6">
                                    {loading ? (
                                        <div className="text-center py-4">
                                            <i className="fas fa-spinner fa-spin text-emerald-600 mr-2"></i>
                                            <span className="text-gray-600 text-sm">Loading...</span>
                                        </div>
                                    ) : assignments.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500 text-sm mb-3">No assignments created yet.</p>
                                            <Link
                                                to="/create-assignment"
                                                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
                                            >
                                                Create First Assignment
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {assignments.slice(0, 4).map((a) => (
                                                <div key={a.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200 group">
                                                    <div className="flex justify-between items-center">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-medium text-gray-800 truncate">{a.AssignmentTitle}</h3>
                                                            <p className="text-sm text-gray-500 mt-1">Due: {a.DeadLine}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDelete('assignments', a.id, a.AssignmentTitle)}
                                                            disabled={deleteLoading === a.id}
                                                            className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded ml-2"
                                                        >
                                                            {deleteLoading === a.id ?
                                                                <i className="fas fa-spinner fa-spin"></i> :
                                                                <i className="fas fa-trash-alt"></i>
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {assignments.length > 4 && (
                                                <div className="text-center pt-2">
                                                    <Link
                                                        to="/tutor/assignments"
                                                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                                                    >
                                                        View all assignments ({assignments.length})
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quizzes */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-800">Quizzes</h2>
                                    <Link
                                        to="/create-quiz"
                                        className="flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                                    >
                                        <i className="fas fa-plus mr-1"></i>
                                        New
                                    </Link>
                                </div>
                                <div className="p-6">
                                    {loading ? (
                                        <div className="text-center py-4">
                                            <i className="fas fa-spinner fa-spin text-amber-600 mr-2"></i>
                                            <span className="text-gray-600 text-sm">Loading...</span>
                                        </div>
                                    ) : quizzes.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-gray-500 text-sm mb-3">No quizzes created yet.</p>
                                            <Link
                                                to="/create-quiz"
                                                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                                            >
                                                Create First Quiz
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {quizzes.slice(0, 4).map((q) => (
                                                <div key={q.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200 group">
                                                    <div className="flex justify-between items-center">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-medium text-gray-800 truncate">{q.quizTitle}</h3>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                Due: {q.deadline} • {q.timeLimit} mins
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDelete('quizzes', q.id, q.quizTitle)}
                                                            disabled={deleteLoading === q.id}
                                                            className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded ml-2"
                                                        >
                                                            {deleteLoading === q.id ?
                                                                <i className="fas fa-spinner fa-spin"></i> :
                                                                <i className="fas fa-trash-alt"></i>
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {quizzes.length > 4 && (
                                                <div className="text-center pt-2">
                                                    <Link
                                                        to="/tutor/quizzes"
                                                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                                                    >
                                                        View all quizzes ({quizzes.length})
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-1/3 space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    to="/add-course"
                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-indigo-200 transition-colors duration-200">
                                        <i className="fas fa-plus text-indigo-600"></i>
                                    </div>
                                    <span className="font-medium text-gray-700">Create Course</span>
                                </Link>

                                <Link
                                    to="/create-assignment"
                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-emerald-200 transition-colors duration-200">
                                        <i className="fas fa-file-alt text-emerald-600"></i>
                                    </div>
                                    <span className="font-medium text-gray-700">Create Assignment</span>
                                </Link>

                                <Link
                                    to="/create-quiz"
                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-colors duration-200">
                                        <i className="fas fa-question-circle text-amber-600"></i>
                                    </div>
                                    <span className="font-medium text-gray-700">Create Quiz</span>
                                </Link>

                                <Link
                                    to="/tutor/student-progress"
                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors duration-200">
                                        <i className="fas fa-chart-line text-purple-600"></i>
                                    </div>
                                    <span className="font-medium text-gray-700">Student Progress</span>
                                </Link>
                            </div>
                        </div>

                        {/* Top Performing Courses */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Courses</h3>
                            {courses.filter(c => c.enrolledCount > 0).length === 0 ? (
                                <p className="text-gray-500 text-sm">No student enrollments yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {courses
                                        .filter(c => c.enrolledCount > 0)
                                        .sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0))
                                        .slice(0, 3)
                                        .map((course, index) => (
                                            <div key={course.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 text-indigo-600 font-semibold">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 truncate text-sm">{course.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {course.enrolledCount} students • {course.rating || 0}⭐
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Overview</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Content Created</span>
                                        <span className="font-medium text-gray-800">{courses.length + assignments.length + quizzes.length}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{
                                                width: `${Math.min(100, ((courses.length + assignments.length + quizzes.length) / 20) * 100)}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Student Engagement</span>
                                        <span className="font-medium text-gray-800">
                                            {stats.totalStudents > 0 ? Math.min(100, Math.floor((stats.totalStudents / courses.length) * 10)) : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-emerald-600 h-2 rounded-full"
                                            style={{
                                                width: `${stats.totalStudents > 0 ? Math.min(100, Math.floor((stats.totalStudents / courses.length) * 10)) : 0}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Course Quality</span>
                                        <span className="font-medium text-gray-800">
                                            {stats.averageRating > 0 ? Math.floor((stats.averageRating / 5) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-amber-600 h-2 rounded-full"
                                            style={{
                                                width: `${stats.averageRating > 0 ? Math.floor((stats.averageRating / 5) * 100) : 0}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorDashboard;