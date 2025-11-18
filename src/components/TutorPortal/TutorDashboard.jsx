// src/pages/TutorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
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

    // Mock data for charts
    const performanceData = [
        { name: 'Week 1', score: 65 },
        { name: 'Week 2', score: 75 },
        { name: 'Week 3', score: 82 },
        { name: 'Week 4', score: 78 },
        { name: 'Week 5', score: 88 },
    ];
    const submissionData = [
        { name: 'Graded', value: 75 },
        { name: 'Pending', value: 25 },
    ];
    const COLORS = ['#4CBC9A', '#FEC64F'];

    // Fetch tutor's data
    useEffect(() => {
        const fetchTutorData = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) return;

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
                        // Ensure we have safe defaults
                        enrolledCount: doc.data().enrolledCount || 0,
                        rating: doc.data().rating || 0,
                        price: doc.data().price || 0
                    }));

                    console.log('Tutor courses:', coursesData);
                    setCourses(coursesData);

                    // Fetch enrollments for these courses
                    let totalStudents = 0;
                    if (coursesData.length > 0) {
                        // We can't use 'in' query with empty array, so we'll fetch enrollments for each course individually
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

    return (
        <div className="min-h-screen mt-16 mb-16 font-poppins px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[75%_25%] max-w-6xl mx-auto gap-6">
                {/* --- MAIN CONTENT --- */}
                <div className="order-1 lg:pr-5">
                    {/* Welcome Header */}
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] rounded-2xl p-6 text-white mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, Tutor!</h1>
                        <p className="text-blue-100">
                            Manage your courses, track student progress, and grow your teaching business.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-6 md:mt-10">
                        <div className="bg-[#6c5dd3] p-4 md:p-6 rounded-xl text-white shadow-lg flex justify-between items-center">
                            <div>
                                <p className="text-xl md:text-2xl font-bold">{courses.length}</p>
                                <p className="text-xs md:text-sm">Courses</p>
                            </div>
                            <div className="w-10 h-10 bg-white rounded-[5px] flex items-center justify-center">
                                <i className="fas fa-book-open text-[#6c5dd3]"></i>
                            </div>
                        </div>
                        <div className="bg-[#4CBC9A] p-4 md:p-6 rounded-xl text-white shadow-lg flex justify-between items-center">
                            <div>
                                <p className="text-xl md:text-2xl font-bold">{assignments.length}</p>
                                <p className="text-xs md:text-sm">Assignments</p>
                            </div>
                            <div className="w-10 h-10 bg-white rounded-[5px] flex items-center justify-center">
                                <i className="fas fa-file-alt text-[#4CBC9A]"></i>
                            </div>
                        </div>
                        <div className="bg-[#FEC64F] p-4 md:p-6 rounded-xl text-white shadow-lg flex justify-between items-center">
                            <div>
                                <p className="text-xl md:text-2xl font-bold">{stats.totalStudents}</p>
                                <p className="text-xs md:text-sm">Students</p>
                            </div>
                            <div className="w-10 h-10 bg-white rounded-[5px] flex items-center justify-center">
                                <i className="fas fa-users text-[#FEC64F]"></i>
                            </div>
                        </div>
                        <div className="bg-black p-4 md:p-6 rounded-xl text-white shadow-lg flex justify-between items-center">
                            <div>
                                <p className="text-xl md:text-2xl font-bold">${stats.totalEarnings}</p>
                                <p className="text-xs md:text-sm">Earnings</p>
                            </div>
                            <div className="w-10 h-10 bg-white rounded-[5px] flex items-center justify-center">
                                <i className="fas fa-dollar-sign text-black"></i>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="flex flex-col md:flex-row gap-5 mt-8 md:mt-10">
                        <div className="w-full md:w-2/3 bg-white shadow-md rounded-lg p-5">
                            <h3 className="font-bold mb-4">Student Performance Trend</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={performanceData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="score" stroke="#6c5dd3" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="w-full md:w-1/3 bg-white shadow-md rounded-lg p-5">
                            <h3 className="font-bold mb-4">Submissions Status</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={submissionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {submissionData.map((entry, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-4 mt-3">
                                {submissionData.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }}></div>
                                        {entry.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- Courses --- */}
                    <div className="mt-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl md:text-2xl font-semibold">Your Courses</h2>
                            <Link to="/tutor/create-course" className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] transition">
                                <i className="fas fa-plus mr-2"></i>Create New Course
                            </Link>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-md">
                            {loading ? (
                                <div className="text-center py-6">Loading courses...</div>
                            ) : courses.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <i className="fas fa-book-open text-4xl text-gray-300 mb-4"></i>
                                    <p className="text-lg mb-2">No courses created yet.</p>
                                    <p className="text-sm mb-4">Start sharing your knowledge by creating your first course.</p>
                                    <Link to="/tutor/create-course" className="bg-[#6c5dd3] text-white px-6 py-3 rounded-lg hover:bg-[#5a4bbf] transition">
                                        Create Your First Course
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {courses.map((course) => (
                                        <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 transition group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg text-gray-800 mb-2">{course.title}</h3>
                                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description}</p>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <span>{course.enrolledCount || 0} students</span>
                                                        <span>{course.rating || 0}⭐</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs ${course.status === 'published' ? 'bg-green-100 text-green-800' :
                                                            course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {course.status || 'draft'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete('courses', course.id, course.title)}
                                                    disabled={deleteLoading === course.id}
                                                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition p-2"
                                                >
                                                    {deleteLoading === course.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                                                </button>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <Link
                                                    to={`/tutor/course/${course.id}/edit`}
                                                    className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    Edit
                                                </Link>
                                                <Link
                                                    to={`/course/${course.id}`}
                                                    className="text-sm text-green-600 hover:text-green-800"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    to={`/tutor/course/${course.id}/analytics`}
                                                    className="text-sm text-purple-600 hover:text-purple-800"
                                                >
                                                    Analytics
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Assignments --- */}
                    <div className="mt-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl md:text-2xl font-semibold">Your Assignments</h2>
                            <Link to="/create-assignment" className="bg-[#4CBC9A] text-white px-4 py-2 rounded-lg hover:bg-[#3aa384] transition">
                                <i className="fas fa-plus mr-2"></i>Create New
                            </Link>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-md">
                            {loading ? (
                                <div className="text-center py-6">Loading assignments...</div>
                            ) : assignments.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <p>No assignments created yet.</p>
                                    <Link to="/create-assignment" className="mt-4 inline-block bg-[#4CBC9A] text-white px-6 py-2 rounded-lg">
                                        Create First Assignment
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {assignments.map((a) => (
                                        <div key={a.id} className="p-4 border rounded-lg hover:bg-gray-50 transition group">
                                            <div className="flex justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg text-gray-800">{a.AssignmentTitle}</h3>
                                                    <p className="text-sm text-gray-500">Due: {a.DeadLine}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete('assignments', a.id, a.AssignmentTitle)}
                                                    disabled={deleteLoading === a.id}
                                                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition p-1"
                                                >
                                                    {deleteLoading === a.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Quizzes --- */}
                    <div className="mt-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl md:text-2xl font-semibold">Your Quizzes</h2>
                            <Link to="/create-quiz" className="bg-[#FEC64F] text-white px-4 py-2 rounded-lg hover:bg-amber-500 transition">
                                <i className="fas fa-plus mr-2"></i>Create New
                            </Link>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-md">
                            {loading ? (
                                <div className="text-center py-6">Loading quizzes...</div>
                            ) : quizzes.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <p>No quizzes created yet.</p>
                                    <Link to="/create-quiz" className="mt-4 inline-block bg-[#FEC64F] text-white px-6 py-2 rounded-lg">
                                        Create First Quiz
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {quizzes.map((q) => (
                                        <div key={q.id} className="p-4 border rounded-lg hover:bg-gray-50 transition group">
                                            <div className="flex justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg text-gray-800">{q.quizTitle}</h3>
                                                    <p className="text-sm text-gray-500">Due: {q.deadline} | Time: {q.timeLimit} mins</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete('quizzes', q.id, q.quizTitle)}
                                                    disabled={deleteLoading === q.id}
                                                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition p-1"
                                                >
                                                    {deleteLoading === q.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT SIDEBAR --- */}
                <div className="order-2">
                    <div className="space-y-6 lg:space-y-8 sticky top-25">
                        <div className="bg-white p-5 rounded-xl shadow-md">
                            <h3 className="font-bold mb-4">🚀 Quick Actions</h3>
                            <div className="space-y-2">
                                <Link to="/tutor/create-course" className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition">
                                    <i className="fas fa-plus text-[#6c5dd3]"></i> Create Course
                                </Link>
                                <Link to="/create-assignment" className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition">
                                    <i className="fas fa-file-alt text-[#4CBC9A]"></i> Create Assignment
                                </Link>
                                <Link to="/create-quiz" className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition">
                                    <i className="fas fa-question-circle text-[#FEC64F]"></i> Create Quiz
                                </Link>
                                <Link to="/tutor/student-progress" className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition">
                                    <i className="fas fa-chart-line text-[#6c5dd3]"></i> Student Progress
                                </Link>
                                <button className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition">
                                    <i className="fas fa-video text-[#4CBC9A]"></i> Schedule Session
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-md">
                            <h3 className="font-bold mb-4">📊 Quick Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Students</span>
                                    <span className="font-semibold">{stats.totalStudents}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Earnings</span>
                                    <span className="font-semibold">${stats.totalEarnings}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Average Rating</span>
                                    <span className="font-semibold">{stats.averageRating.toFixed(1)}⭐</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Completion Rate</span>
                                    <span className="font-semibold">78%</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-md">
                            <h3 className="font-bold mb-4">🎯 Top Performing Courses</h3>
                            {courses.filter(c => c.enrolledCount > 0).length === 0 ? (
                                <p className="text-sm text-gray-500">No student enrollments yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {courses
                                        .filter(c => c.enrolledCount > 0)
                                        .sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0))
                                        .slice(0, 3)
                                        .map((course) => (
                                            <div key={course.id} className="border-b pb-2 last:border-b-0">
                                                <p className="font-medium text-sm">{course.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {course.enrolledCount} students • {course.rating || 0}⭐
                                                </p>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorDashboard;