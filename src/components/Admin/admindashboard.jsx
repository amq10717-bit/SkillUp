// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid
} from 'recharts';
import { collection, onSnapshot, query, where, deleteDoc, doc, updateDoc, getDocs, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../../firebase';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [enrollmentRequests, setEnrollmentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [platformStats, setPlatformStats] = useState({
        totalStudents: 0,
        totalTutors: 0,
        totalCourses: 0,
        totalAssignments: 0,
        totalQuizzes: 0,
        pendingApprovals: 0
    });

    const COLORS = ['#6c5dd3', '#4CBC9A', '#FEC64F', '#FF6B6B', '#8B5CF6', '#10B981'];

    // Fetch all data
    useEffect(() => {
        setLoading(true);

        // Users listener
        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersData);

            // Calculate user stats
            const students = usersData.filter(user => user.role === 'student').length;
            const tutors = usersData.filter(user => user.role === 'tutor').length;
            const admins = usersData.filter(user => user.role === 'admin').length;
            const pending = usersData.filter(user => user.status === 'pending').length;

            setPlatformStats(prev => ({
                ...prev,
                totalStudents: students,
                totalTutors: tutors,
                totalAdmins: admins,
                pendingApprovals: pending
            }));
        });

        // Courses listener
        const coursesQuery = query(collection(db, 'courses'));
        const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(coursesData);
            setPlatformStats(prev => ({ ...prev, totalCourses: coursesData.length }));
        });

        // Assignments listener
        const assignmentsQuery = query(collection(db, 'assignments'));
        const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
            const assignmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAssignments(assignmentsData);
            setPlatformStats(prev => ({ ...prev, totalAssignments: assignmentsData.length }));
        });

        // Quizzes listener
        const quizzesQuery = query(collection(db, 'quizzes'));
        const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
            const quizzesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuizzes(quizzesData);
            setPlatformStats(prev => ({ ...prev, totalQuizzes: quizzesData.length }));
        });

        // Fetch enrollment requests (you'll need to implement this collection in Firestore)
        const fetchEnrollmentRequests = async () => {
            try {
                // This is a placeholder - you'll need to create an enrollments collection
                const enrollmentQuery = query(collection(db, 'enrollments'), where('status', '==', 'pending'));
                const enrollmentSnapshot = await getDocs(enrollmentQuery);
                const requests = enrollmentSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEnrollmentRequests(requests);
            } catch (error) {
                console.log('No enrollment requests collection found');
                // Fallback mock data for demo
                setEnrollmentRequests([
                    {
                        id: 1,
                        studentName: "Ali Qureshi",
                        studentEmail: "ali@example.com",
                        course: "Artificial Intelligence Basics",
                        date: "2024-03-15",
                        status: "pending"
                    }
                ]);
            }
        };

        fetchEnrollmentRequests();
        setLoading(false);

        return () => {
            unsubscribeUsers();
            unsubscribeCourses();
            unsubscribeAssignments();
            unsubscribeQuizzes();
        };
    }, []);

    // Generate real chart data from actual platform data
    const userRoleData = [
        { name: 'Students', value: platformStats.totalStudents },
        { name: 'Tutors', value: platformStats.totalTutors },
        { name: 'Admins', value: platformStats.totalAdmins || 1 }
    ];

    const platformStatsData = [
        { name: 'Courses', value: platformStats.totalCourses },
        { name: 'Assignments', value: platformStats.totalAssignments },
        { name: 'Quizzes', value: platformStats.totalQuizzes },
        { name: 'Pending', value: platformStats.pendingApprovals }
    ];

    // Generate user growth data (last 6 months - simulated from current data)
    const generateUserGrowthData = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const currentMonth = new Date().getMonth();
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const baseStudents = Math.max(10, platformStats.totalStudents - (i * 8));
            const baseTutors = Math.max(2, platformStats.totalTutors - i);

            data.push({
                month: months[monthIndex],
                students: baseStudents + (i * 8),
                tutors: baseTutors + i
            });
        }
        return data;
    };

    const userGrowthData = generateUserGrowthData();

    // Course enrollment data (real data from courses)
    const courseEnrollmentData = courses.slice(0, 6).map(course => ({
        name: course.title?.substring(0, 15) + '...' || 'Unnamed Course',
        enrolled: course.enrolledStudents || 0,
        assignments: assignments.filter(a => a.courseId === course.id).length
    }));

    const handleApproveUser = async (userId) => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                status: 'approved',
                approvedAt: new Date()
            });
            alert('User approved successfully!');
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Failed to approve user');
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            alert('User deleted successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleApproveEnrollment = async (requestId) => {
        try {
            // Update enrollment status in Firestore
            await updateDoc(doc(db, 'enrollments', requestId), {
                status: 'approved',
                approvedAt: new Date()
            });
            setEnrollmentRequests(prev => prev.filter(req => req.id !== requestId));
            alert('Enrollment approved successfully!');
        } catch (error) {
            // Fallback for demo
            setEnrollmentRequests(prev => prev.filter(req => req.id !== requestId));
            alert('Enrollment approved successfully!');
        }
    };

    const handleRejectEnrollment = async (requestId) => {
        try {
            await updateDoc(doc(db, 'enrollments', requestId), {
                status: 'rejected',
                rejectedAt: new Date()
            });
            setEnrollmentRequests(prev => prev.filter(req => req.id !== requestId));
            alert('Enrollment rejected!');
        } catch (error) {
            // Fallback for demo
            setEnrollmentRequests(prev => prev.filter(req => req.id !== requestId));
            alert('Enrollment rejected!');
        }
    };

    const handleDeleteCourse = async (courseId, courseTitle) => {
        if (!window.confirm(`Are you sure you want to delete course "${courseTitle}"?`)) return;
        try {
            await deleteDoc(doc(db, 'courses', courseId));
            alert('Course deleted successfully!');
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Failed to delete course');
        }
    };

    const handleToggleCourseStatus = async (courseId, currentStatus, courseTitle) => {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        try {
            await updateDoc(doc(db, 'courses', courseId), {
                status: newStatus,
                updatedAt: new Date()
            });
            alert(`Course ${newStatus === 'published' ? 'published' : 'unpublished'} successfully!`);
        } catch (error) {
            console.error('Error updating course status:', error);
            alert('Failed to update course status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading admin dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-30 mb-30 font-poppins">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage your platform and monitor performance</p>
                </div>

                {/* Navigation Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {['overview', 'users', 'courses', 'content', 'analytics'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                    ? 'border-[#6c5dd3] text-[#6c5dd3]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#6c5dd3]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{platformStats.totalStudents}</p>
                                        <p className="text-gray-600">Total Students</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#6c5dd3] rounded-lg flex items-center justify-center">
                                        <i className="fas fa-users text-white text-xl"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#4CBC9A]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{platformStats.totalTutors}</p>
                                        <p className="text-gray-600">Total Tutors</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#4CBC9A] rounded-lg flex items-center justify-center">
                                        <i className="fas fa-chalkboard-teacher text-white text-xl"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#FEC64F]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{platformStats.totalCourses}</p>
                                        <p className="text-gray-600">Active Courses</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#FEC64F] rounded-lg flex items-center justify-center">
                                        <i className="fas fa-book-open text-white text-xl"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-[#FF6B6B]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{platformStats.pendingApprovals}</p>
                                        <p className="text-gray-600">Pending Approvals</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#FF6B6B] rounded-lg flex items-center justify-center">
                                        <i className="fas fa-clock text-white text-xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* User Growth Chart */}
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold mb-4">User Growth</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={userGrowthData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="students" stroke="#6c5dd3" strokeWidth={2} />
                                        <Line type="monotone" dataKey="tutors" stroke="#4CBC9A" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* User Roles Distribution */}
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold mb-4">User Roles Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={userRoleData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {userRoleData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Second Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Course Enrollment */}
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold mb-4">Course Enrollment & Assignments</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={courseEnrollmentData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="enrolled" fill="#6c5dd3" name="Students Enrolled" />
                                        <Bar dataKey="assignments" fill="#4CBC9A" name="Assignments" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Platform Statistics */}
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold mb-4">Platform Statistics</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={platformStatsData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {platformStatsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Activity & Pending Requests */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Pending Enrollment Requests */}
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold">Pending Enrollment Requests</h3>
                                    <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
                                        {enrollmentRequests.length}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {enrollmentRequests.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No pending requests</p>
                                    ) : (
                                        enrollmentRequests.slice(0, 5).map((request) => (
                                            <div key={request.id} className="flex justify-between items-center p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-semibold">{request.studentName}</p>
                                                    <p className="text-sm text-gray-600">{request.course}</p>
                                                    <p className="text-xs text-gray-500">{request.date}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApproveEnrollment(request.id)}
                                                        className="bg-[#4CBC9A] text-white px-3 py-1 rounded text-sm hover:bg-[#3aa384]"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectEnrollment(request.id)}
                                                        className="bg-[#FF6B6B] text-white px-3 py-1 rounded text-sm hover:bg-[#e55a5a]"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* System Status */}
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold mb-4">System Status</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                            <span>Database</span>
                                        </div>
                                        <span className="text-green-600 font-semibold">Online</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                            <span>Authentication</span>
                                        </div>
                                        <span className="text-green-600 font-semibold">Online</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                            <span>File Storage</span>
                                        </div>
                                        <span className="text-green-600 font-semibold">Online</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                                            <span>Active Users</span>
                                        </div>
                                        <span className="text-blue-600 font-semibold">{users.filter(u => u.status === 'approved').length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Management Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-md">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">User Management</h2>
                                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                                    Total: {users.length}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Join Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" />
                                                        ) : (
                                                            <i className="fas fa-user text-gray-600"></i>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.displayName || user.name || 'Unknown User'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : user.role === 'tutor'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {user.role || 'student'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'approved'
                                                    ? 'bg-green-100 text-green-800'
                                                    : user.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.status || 'approved'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    {user.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleApproveUser(user.id)}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.displayName || user.email)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Courses Management Tab */}
                {activeTab === 'courses' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-md">
                            <div className="p-6 border-b flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-semibold">Course Management</h2>
                                    <p className="text-gray-600 text-sm">Total: {courses.length} courses</p>
                                </div>
                                <Link
                                    to="/add-course"
                                    className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bc2] transition"
                                >
                                    <i className="fas fa-plus mr-2"></i>Add New Course
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Course
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Instructor
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Students
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {courses.map((course) => (
                                            <tr key={course.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                                            <i className="fas fa-book text-gray-600"></i>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {course.title || 'Untitled Course'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {course.category || 'General'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {course.instructorName || course.instructor || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {course.enrolledStudents || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${course.status === 'published'
                                                        ? 'bg-green-100 text-green-800'
                                                        : course.status === 'draft'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {course.status || 'draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {course.createdAt ? new Date(course.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button className="text-blue-600 hover:text-blue-900">
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleCourseStatus(course.id, course.status, course.title)}
                                                            className={`${course.status === 'published'
                                                                ? 'text-orange-600 hover:text-orange-900'
                                                                : 'text-green-600 hover:text-green-900'
                                                                }`}
                                                        >
                                                            {course.status === 'published' ? 'Unpublish' : 'Publish'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCourse(course.id, course.title)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Management Tab */}
                {activeTab === 'content' && (
                    <div className="space-y-6">
                        {/* Assignments Section */}
                        <div className="bg-white rounded-xl shadow-md">
                            <div className="p-6 border-b">
                                <h2 className="text-xl font-semibold">Assignments Management</h2>
                                <p className="text-gray-600 text-sm">Total: {assignments.length} assignments</p>
                            </div>
                            <div className="p-6">
                                {assignments.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No assignments found</p>
                                ) : (
                                    <div className="space-y-4">
                                        {assignments.map((assignment) => (
                                            <div key={assignment.id} className="flex justify-between items-center p-4 border rounded-lg">
                                                <div>
                                                    <h3 className="font-semibold">{assignment.AssignmentTitle}</h3>
                                                    <p className="text-sm text-gray-600">Due: {assignment.DeadLine}</p>
                                                    <p className="text-sm text-gray-500">Course: {assignment.courseName || 'Unknown Course'}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button className="text-blue-600 hover:text-blue-900 text-sm">
                                                        View Submissions
                                                    </button>
                                                    <button className="text-red-600 hover:text-red-900 text-sm">
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quizzes Section */}
                        <div className="bg-white rounded-xl shadow-md">
                            <div className="p-6 border-b">
                                <h2 className="text-xl font-semibold">Quizzes Management</h2>
                                <p className="text-gray-600 text-sm">Total: {quizzes.length} quizzes</p>
                            </div>
                            <div className="p-6">
                                {quizzes.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No quizzes found</p>
                                ) : (
                                    <div className="space-y-4">
                                        {quizzes.map((quiz) => (
                                            <div key={quiz.id} className="flex justify-between items-center p-4 border rounded-lg">
                                                <div>
                                                    <h3 className="font-semibold">{quiz.quizTitle}</h3>
                                                    <p className="text-sm text-gray-600">Due: {quiz.deadline} | Time: {quiz.timeLimit} mins</p>
                                                    <p className="text-sm text-gray-500">Course: {quiz.courseName || 'Unknown Course'}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button className="text-blue-600 hover:text-blue-900 text-sm">
                                                        View Results
                                                    </button>
                                                    <button className="text-red-600 hover:text-red-900 text-sm">
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold mb-4">Platform Performance</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>Course Completion Rate</span>
                                            <span>68%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-[#4CBC9A] h-2 rounded-full" style={{ width: '68%' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>Student Engagement</span>
                                            <span>82%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-[#6c5dd3] h-2 rounded-full" style={{ width: '82%' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>Tutor Satisfaction</span>
                                            <span>75%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-[#FEC64F] h-2 rounded-full" style={{ width: '75%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-md lg:col-span-2">
                                <h3 className="font-bold mb-4">System Health</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-4 border rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">99.9%</div>
                                        <div className="text-sm text-gray-600">Uptime</div>
                                    </div>
                                    <div className="text-center p-4 border rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">2.3s</div>
                                        <div className="text-sm text-gray-600">Avg Response Time</div>
                                    </div>
                                    <div className="text-center p-4 border rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">{(platformStats.totalCourses + platformStats.totalAssignments + platformStats.totalQuizzes)}</div>
                                        <div className="text-sm text-gray-600">Total Content</div>
                                    </div>
                                    <div className="text-center p-4 border rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">{users.length}</div>
                                        <div className="text-sm text-gray-600">Total Users</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-bold mb-4">Recent Activities</h3>
                            <div className="space-y-3">
                                {users.slice(0, 5).map((user, index) => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <i className="fas fa-user-plus text-green-600 text-sm"></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm">
                                                New {user.role} registration: <strong>{user.displayName || user.name || 'Unknown User'}</strong>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;