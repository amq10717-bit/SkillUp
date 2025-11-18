// src/pages/CourseAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';

const CourseAnalytics = () => {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Mock data for charts
    const enrollmentData = [
        { month: 'Jan', enrollments: 12 },
        { month: 'Feb', enrollments: 19 },
        { month: 'Mar', enrollments: 8 },
        { month: 'Apr', enrollments: 15 },
        { month: 'May', enrollments: 22 },
    ];

    const performanceData = [
        { student: 'Student 1', progress: 85, assignments: 90, quizzes: 80 },
        { student: 'Student 2', progress: 72, assignments: 75, quizzes: 70 },
        { student: 'Student 3', progress: 90, assignments: 85, quizzes: 95 },
        { student: 'Student 4', progress: 60, assignments: 65, quizzes: 55 },
    ];

    const COLORS = ['#4CBC9A', '#FEC64F', '#6c5dd3', '#FF6B6B'];

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                setLoading(true);

                // Fetch course details
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    setCourse({
                        id: courseDoc.id,
                        ...courseDoc.data()
                    });
                }

                // Fetch enrollments for this course
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('courseId', '==', courseId)
                );
                const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
                const enrollmentsData = enrollmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEnrollments(enrollmentsData);

            } catch (error) {
                console.error('Error fetching course analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchCourseData();
        }
    }, [courseId]);

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading analytics...</div>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">Course Not Found</div>
                    <Link to="/tutor-dashboard" className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-30 mb-30">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {course.title} - Analytics
                            </h1>
                            <p className="text-gray-600">
                                Track student performance and course engagement
                            </p>
                        </div>
                        <Link
                            to="/tutor-dashboard"
                            className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] transition"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <div className="text-2xl font-bold text-[#6c5dd3] mb-2">
                            {enrollments.length}
                        </div>
                        <div className="text-gray-600">Total Enrollments</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <div className="text-2xl font-bold text-[#4CBC9A] mb-2">
                            {course.rating || 0}⭐
                        </div>
                        <div className="text-gray-600">Average Rating</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <div className="text-2xl font-bold text-[#FEC64F] mb-2">
                            {course.lessonsCount || 0}
                        </div>
                        <div className="text-gray-600">Total Lessons</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <div className="text-2xl font-bold text-[#FF6B6B] mb-2">
                            78%
                        </div>
                        <div className="text-gray-600">Completion Rate</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg mb-8">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            {['overview', 'students', 'performance', 'engagement'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 px-6 font-medium text-sm border-b-2 transition ${activeTab === tab
                                        ? 'border-[#6c5dd3] text-[#6c5dd3]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-50 p-6 rounded-xl">
                                    <h3 className="text-lg font-semibold mb-4">Enrollment Trend</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={enrollmentData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="enrollments" stroke="#6c5dd3" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-xl">
                                    <h3 className="text-lg font-semibold mb-4">Student Distribution</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Completed', value: 45 },
                                                    { name: 'In Progress', value: 35 },
                                                    { name: 'Not Started', value: 20 },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Completed', value: 45 },
                                                    { name: 'In Progress', value: 35 },
                                                    { name: 'Not Started', value: 20 },
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeTab === 'students' && (
                            <div className="bg-gray-50 p-6 rounded-xl">
                                <h3 className="text-lg font-semibold mb-4">Enrolled Students</h3>
                                <div className="space-y-4">
                                    {enrollments.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">No students enrolled yet.</p>
                                    ) : (
                                        enrollments.map((enrollment) => (
                                            <div key={enrollment.id} className="bg-white p-4 rounded-lg shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-semibold">{enrollment.studentName}</h4>
                                                        <p className="text-sm text-gray-500">
                                                            Enrolled: {new Date(enrollment.enrolledAt?.toDate()).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-gray-900">Progress: 65%</div>
                                                        <div className="text-xs text-gray-500">Last active: 2 days ago</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'performance' && (
                            <div className="bg-gray-50 p-6 rounded-xl">
                                <h3 className="text-lg font-semibold mb-4">Student Performance</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={performanceData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="student" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="progress" fill="#4CBC9A" name="Progress %" />
                                        <Bar dataKey="assignments" fill="#FEC64F" name="Assignments" />
                                        <Bar dataKey="quizzes" fill="#6c5dd3" name="Quizzes" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {activeTab === 'engagement' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm">
                                    <h4 className="font-semibold mb-3">Course Engagement</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span>Video Completion</span>
                                                <span>78%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-[#4CBC9A] h-2 rounded-full" style={{ width: '78%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span>Assignment Submission</span>
                                                <span>65%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-[#FEC64F] h-2 rounded-full" style={{ width: '65%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span>Quiz Participation</span>
                                                <span>82%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-[#6c5dd3] h-2 rounded-full" style={{ width: '82%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm">
                                    <h4 className="font-semibold mb-3">Activity Overview</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Average Time Spent</span>
                                            <span className="font-medium">4.2 hours</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Discussion Posts</span>
                                            <span className="font-medium">23</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Questions Asked</span>
                                            <span className="font-medium">15</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Resources Downloaded</span>
                                            <span className="font-medium">89</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseAnalytics;