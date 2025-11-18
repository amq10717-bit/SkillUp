// src/pages/TutorStudentProgress.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

function TutorStudentProgress() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [remarks, setRemarks] = useState('');
    const [remarkCategory, setRemarkCategory] = useState('general');
    const [studentRemarks, setStudentRemarks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('all');
    const [availableCourses, setAvailableCourses] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [courseEnrollments, setCourseEnrollments] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCurrentUserData = async () => {
            if (!auth.currentUser) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setCurrentUserData({
                        id: userDoc.id,
                        displayName: userData.displayName || userData.name || userData.fullName || userData.username || userData.email?.split('@')[0] || `User ${userDoc.id.slice(0, 4)}`,
                        email: userData.email || 'No email',
                        role: userData.role || 'tutor',
                        photoURL: userData.photoURL || userData.avatar || null
                    });
                }
            } catch (error) {
                console.error('Error fetching current user data:', error);
            }
        };

        fetchCurrentUserData();
    }, []);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                if (auth.currentUser) {
                    const coursesQuery = query(collection(db, 'courses'));
                    const snapshot = await getDocs(coursesQuery);
                    const coursesData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setAvailableCourses(coursesData);
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
                setAvailableCourses([]);
            }
        };

        fetchCourses();
    }, []);

    useEffect(() => {
        const fetchStudentsData = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) return;

                console.log('Fetching students data...');

                // Fetch all users with role 'student'
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const allUsers = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log('All users:', allUsers);

                // Filter students
                const studentsData = allUsers.filter(user => user.role === 'student');
                console.log('Students found:', studentsData);

                // Fetch enrollments for all students to build course enrollment map
                const enrollmentsQuery = query(collection(db, 'enrollments'));
                const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
                const allEnrollments = enrollmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Build course enrollment map
                const courseEnrollmentsMap = {};
                allEnrollments.forEach(enrollment => {
                    if (!courseEnrollmentsMap[enrollment.courseId]) {
                        courseEnrollmentsMap[enrollment.courseId] = [];
                    }
                    courseEnrollmentsMap[enrollment.courseId].push(enrollment.studentId);
                });
                setCourseEnrollments(courseEnrollmentsMap);

                // Fetch additional data for each student
                const studentsWithProgress = await Promise.all(
                    studentsData.map(async (student) => {
                        try {
                            // Fetch enrollments for this student
                            const enrollmentsQuery = query(
                                collection(db, 'enrollments'),
                                where('studentId', '==', student.id)
                            );
                            const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
                            const enrollments = enrollmentsSnapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));

                            // Fetch submissions
                            const submissionsQuery = query(
                                collection(db, 'submissions'),
                                where('studentId', '==', student.id)
                            );
                            const submissionsSnapshot = await getDocs(submissionsQuery);
                            const submissions = submissionsSnapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));

                            // Fetch quiz attempts
                            const quizAttemptsQuery = query(
                                collection(db, 'quizAttempts'),
                                where('studentId', '==', student.id)
                            );
                            const quizAttemptsSnapshot = await getDocs(quizAttemptsQuery);
                            const quizAttempts = quizAttemptsSnapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));

                            return {
                                ...student,
                                enrollments: enrollments || [],
                                submissions: submissions || [],
                                quizAttempts: quizAttempts || [],
                                progress: calculateStudentProgress(enrollments, submissions, quizAttempts)
                            };
                        } catch (error) {
                            console.error(`Error fetching data for student ${student.id}:`, error);
                            return {
                                ...student,
                                enrollments: [],
                                submissions: [],
                                quizAttempts: [],
                                progress: calculateStudentProgress([], [], [])
                            };
                        }
                    })
                );

                console.log('Students with progress:', studentsWithProgress);
                setStudents(studentsWithProgress);
            } catch (error) {
                console.error('Error fetching students data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentsData();
    }, []);

    // Real-time remarks listener
    useEffect(() => {
        if (!selectedStudent) {
            setStudentRemarks([]);
            return;
        }

        const remarksQuery = query(
            collection(db, 'tutorRemarks'),
            where('studentId', '==', selectedStudent.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(remarksQuery, (snapshot) => {
            const remarksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Real-time remarks update:', remarksData); // Debug log
            setStudentRemarks(remarksData);
        }, (error) => {
            console.error('Error in real-time remarks listener:', error);
        });

        return () => unsubscribe();
    }, [selectedStudent]);

    const calculateStudentProgress = (enrollments, submissions, quizAttempts) => {
        const totalCourses = enrollments?.length || 0;
        const completedCourses = enrollments?.filter(e => e.progress === 100).length || 0;

        const assignmentScores = submissions?.filter(s => s.grade).map(s => (s.grade / s.totalMarks) * 100) || [];
        const quizScores = quizAttempts?.filter(q => q.score).map(q => q.score) || [];

        const avgAssignmentScore = assignmentScores.length > 0 ?
            assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length : 0;
        const avgQuizScore = quizScores.length > 0 ?
            quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0;

        const overallScore = assignmentScores.length > 0 || quizScores.length > 0 ?
            (avgAssignmentScore + avgQuizScore) / 2 : 0;

        return {
            overallScore: Math.round(overallScore),
            avgAssignmentScore: Math.round(avgAssignmentScore),
            avgQuizScore: Math.round(avgQuizScore),
            totalCourses,
            completedCourses,
            pendingAssignments: submissions?.filter(s => s.status !== 'graded').length || 0,
            totalSubmissions: submissions?.length || 0,
            totalQuizAttempts: quizAttempts?.length || 0
        };
    };

    const addRemark = async () => {
        if (!remarks.trim() || !selectedStudent) return;

        try {
            const user = auth.currentUser;

            // Get course info if a specific course is selected
            let courseInfo = {};
            if (filterCourse !== 'all') {
                const course = availableCourses.find(c => c.id === filterCourse);
                if (course) {
                    courseInfo = {
                        courseId: filterCourse,
                        courseName: course.title || course.name
                    };
                }
            }

            const remarkData = {
                studentId: selectedStudent.id,
                studentName: selectedStudent.displayName || selectedStudent.name || selectedStudent.email,
                tutorId: user.uid,
                tutorName: currentUserData?.displayName || user.displayName || 'Tutor',
                remarkText: remarks.trim(),
                category: remarkCategory,
                createdAt: serverTimestamp(),
                isImportant: false,
                ...courseInfo
            };

            console.log('Adding remark:', remarkData); // Debug log

            await addDoc(collection(db, 'tutorRemarks'), remarkData);

            // Clear the form
            setRemarks('');
            setRemarkCategory('general');

            // No need to manually refresh - real-time listener will handle it
            alert('Remark added successfully!');
        } catch (error) {
            console.error('Error adding remark:', error);
            alert('Failed to add remark. Please try again.');
        }
    };

    const markRemarkImportant = async (remarkId, isImportant) => {
        try {
            await updateDoc(doc(db, 'tutorRemarks', remarkId), {
                isImportant: !isImportant
            });
            // Real-time listener will automatically update the UI
        } catch (error) {
            console.error('Error updating remark:', error);
            alert('Failed to update remark importance.');
        }
    };

    // Get students enrolled in the selected course
    const getEnrolledStudentsForCourse = (courseId) => {
        if (courseId === 'all') return students;

        const enrolledStudentIds = courseEnrollments[courseId] || [];
        return students.filter(student =>
            enrolledStudentIds.includes(student.id)
        );
    };

    const filteredStudents = getEnrolledStudentsForCourse(filterCourse).filter(student => {
        const matchesSearch = student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Function to create group chat for selected course
    const createCourseGroupChat = async () => {
        if (filterCourse === 'all') {
            alert('Please select a specific course first');
            return;
        }

        try {
            const course = availableCourses.find(c => c.id === filterCourse);
            if (!course) {
                alert('Course not found');
                return;
            }

            const enrolledStudents = getEnrolledStudentsForCourse(filterCourse);
            const studentIds = enrolledStudents.map(student => student.id);

            // Include tutor in the group
            const participants = [auth.currentUser.uid, ...studentIds];

            const groupData = {
                name: `${course.title || course.name} - Study Group`,
                description: `Group chat for ${course.title || course.name} course`,
                createdBy: auth.currentUser.uid,
                courseId: filterCourse,
                participants: participants,
                createdAt: serverTimestamp(),
                lastMessage: '',
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isCourseGroup: true
            };

            const docRef = await addDoc(collection(db, 'groupChats'), groupData);

            // Navigate to chat page with the new group
            navigate(`/private-chat?chat=${docRef.id}&type=group`);

            alert(`Group chat created successfully for ${course.title || course.name}!`);
        } catch (error) {
            console.error('Error creating group chat:', error);
            alert('Failed to create group chat. Please try again.');
        }
    };

    // Calculate class summary for filtered students
    const calculateClassSummary = () => {
        const enrolledStudents = getEnrolledStudentsForCourse(filterCourse);

        const totalStudents = enrolledStudents.length;
        const classAverage = totalStudents > 0 ?
            Math.round(enrolledStudents.reduce((sum, s) => sum + s.progress.overallScore, 0) / totalStudents) : 0;
        const completedCourses = enrolledStudents.reduce((sum, s) => sum + s.progress.completedCourses, 0);

        return { totalStudents, classAverage, completedCourses };
    };

    const classSummary = calculateClassSummary();

    // Get user display name
    const getUserDisplayName = (userData) => {
        if (!userData) return 'Student';
        return userData.displayName || userData.name || userData.fullName || userData.username || userData.email?.split('@')[0] || `Student ${userData.id?.slice(0, 4)}` || 'Student';
    };

    // Get user avatar with color based on user ID
    const getUserAvatar = (userData, size = 'w-12 h-12') => {
        if (userData?.photoURL) {
            return (
                <img
                    src={userData.photoURL}
                    alt={getUserDisplayName(userData)}
                    className={`${size} rounded-full object-cover border-2 border-gray-200`}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            );
        }

        const userId = userData?.id || userData?.email || 'user';
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
            'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
        ];
        const colorIndex = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        const color = colors[colorIndex];

        return (
            <div className={`${size} ${color} rounded-full flex items-center justify-center text-white font-semibold border-2 border-white shadow-sm`}>
                {getUserDisplayName(userData).charAt(0).toUpperCase()}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading student progress...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-30 mb-30">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Student Progress Monitoring</h1>
                    <p className="text-gray-600 mt-2">Track and manage all student progress in one place</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Students List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-20">
                            {/* Search and Filter */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                                />
                                <div className="space-y-2">
                                    <select
                                        value={filterCourse}
                                        onChange={(e) => setFilterCourse(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="all">All Courses</option>
                                        {availableCourses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.title || course.name || `Course ${course.id.slice(0, 4)}`}
                                            </option>
                                        ))}
                                    </select>

                                    {filterCourse !== 'all' && (
                                        <button
                                            onClick={createCourseGroupChat}
                                            className="w-full bg-[#4CBC9A] text-white py-2 px-4 rounded-lg hover:bg-[#3aa384] transition flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-comments"></i>
                                            Create Course Group Chat
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Students List */}
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {filteredStudents.map(student => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudent(student)}
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedStudent?.id === student.id
                                            ? 'border-[#4CBC9A] bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{getUserDisplayName(student)}</p>
                                                <p className="text-sm text-gray-500">{student.email}</p>
                                            </div>
                                            <div className={`w-3 h-3 rounded-full ${student.progress.overallScore >= 80 ? 'bg-green-500' :
                                                student.progress.overallScore >= 60 ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`}></div>
                                        </div>
                                        <div className="mt-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Overall</span>
                                                <span className="font-medium">{student.progress.overallScore}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                <div
                                                    className="h-1 rounded-full bg-[#4CBC9A]"
                                                    style={{ width: `${student.progress.overallScore}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <div className="text-center py-4 text-gray-500">
                                        {filterCourse === 'all' ? 'No students found' : 'No students enrolled in this course'}
                                    </div>
                                )}
                            </div>

                            {/* Summary Stats */}
                            <div className="mt-6 pt-4 border-t">
                                <h4 className="font-semibold mb-3">
                                    {filterCourse === 'all' ? 'Class Summary' : 'Course Summary'}
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Total Students</span>
                                        <span className="font-medium">{classSummary.totalStudents}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Class Average</span>
                                        <span className="font-medium">{classSummary.classAverage}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Completed Courses</span>
                                        <span className="font-medium">{classSummary.completedCourses}</span>
                                    </div>
                                    {filterCourse !== 'all' && (
                                        <div className="flex justify-between">
                                            <span>Enrolled in Course</span>
                                            <span className="font-medium">{classSummary.totalStudents}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student Details */}
                    <div className="lg:col-span-3">
                        {selectedStudent ? (
                            <div className="space-y-6">
                                {/* Student Header */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            {getUserAvatar(selectedStudent, 'w-16 h-16')}
                                            <div>
                                                <h2 className="text-2xl font-bold">{getUserDisplayName(selectedStudent)}</h2>
                                                <p className="text-gray-600">{selectedStudent.email}</p>
                                                <p className="text-sm text-gray-500">
                                                    Enrolled in {selectedStudent.progress.totalCourses} courses
                                                    {filterCourse !== 'all' && (
                                                        <span> • Currently viewing: {
                                                            availableCourses.find(c => c.id === filterCourse)?.title ||
                                                            availableCourses.find(c => c.id === filterCourse)?.name ||
                                                            'Selected Course'
                                                        }</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-[#4CBC9A]">
                                                {selectedStudent.progress.overallScore}%
                                            </div>
                                            <div className="text-sm text-gray-500">Overall Score</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Tabs */}
                                <div className="border-b border-gray-200">
                                    <nav className="-mb-px flex space-x-8">
                                        {['overview', 'assignments', 'quizzes', 'remarks'].map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                                    ? 'border-[#4CBC9A] text-[#4CBC9A]'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </nav>
                                </div>

                                {/* Tab Content */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    {activeTab === 'overview' && (
                                        <StudentOverview student={selectedStudent} getUserDisplayName={getUserDisplayName} />
                                    )}
                                    {activeTab === 'assignments' && (
                                        <StudentAssignments student={selectedStudent} />
                                    )}
                                    {activeTab === 'quizzes' && (
                                        <StudentQuizzes student={selectedStudent} />
                                    )}
                                    {activeTab === 'remarks' && (
                                        <StudentRemarks
                                            student={selectedStudent}
                                            remarks={studentRemarks}
                                            newRemark={remarks}
                                            setNewRemark={setRemarks}
                                            remarkCategory={remarkCategory}
                                            setRemarkCategory={setRemarkCategory}
                                            onAddRemark={addRemark}
                                            onToggleImportant={markRemarkImportant}
                                            getUserDisplayName={getUserDisplayName}
                                            currentCourse={filterCourse !== 'all' ? availableCourses.find(c => c.id === filterCourse) : null}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                                    {filterCourse === 'all' ? 'Select a Student' : 'No Students in Selected Course'}
                                </h3>
                                <p className="text-gray-500">
                                    {filterCourse === 'all'
                                        ? 'Choose a student from the list to view their progress details'
                                        : 'There are no students enrolled in the selected course'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


// Sub-components remain the same as in your original code...
const StudentOverview = ({ student, getUserDisplayName }) => {
    const progressData = [
        { name: 'Assignments', score: student.progress.avgAssignmentScore },
        { name: 'Quizzes', score: student.progress.avgQuizScore },
        { name: 'Courses', score: Math.round((student.progress.completedCourses / student.progress.totalCourses) * 100) || 0 }
    ];

    const weeklyProgress = [
        { week: 'Week 1', score: 65 },
        { week: 'Week 2', score: 72 },
        { week: 'Week 3', score: 68 },
        { week: 'Week 4', score: 85 },
        { week: 'Week 5', score: 78 },
        { week: 'Week 6', score: 82 }
    ];

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{student.progress.overallScore}%</div>
                    <div className="text-sm text-blue-600">Overall</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{student.progress.avgAssignmentScore}%</div>
                    <div className="text-sm text-green-600">Assignments</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{student.progress.avgQuizScore}%</div>
                    <div className="text-sm text-purple-600">Quizzes</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">
                        {student.progress.completedCourses}/{student.progress.totalCourses}
                    </div>
                    <div className="text-sm text-orange-600">Courses</div>
                </div>
            </div>

            {/* Progress Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold mb-4">Performance Breakdown</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={progressData}>
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#4CBC9A" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div>
                    <h4 className="font-semibold mb-4">Weekly Progress</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={weeklyProgress}>
                            <XAxis dataKey="week" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="score" stroke="#6c5dd3" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h4 className="font-semibold mb-4">Recent Activity</h4>
                <div className="space-y-3">
                    {student.submissions.slice(0, 5).map((submission, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <i className="fas fa-file-alt text-green-600 text-sm"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium">{submission.assignmentTitle || 'Assignment'}</p>
                                    <p className="text-sm text-gray-500">
                                        Submitted {submission.submittedAt?.toDate?.().toLocaleDateString() || 'Recently'}
                                    </p>
                                </div>
                            </div>
                            {submission.grade && (
                                <span className={`px-2 py-1 rounded text-sm font-medium ${(submission.grade / submission.totalMarks) * 100 >= 80 ? 'bg-green-100 text-green-800' :
                                    (submission.grade / submission.totalMarks) * 100 >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {Math.round((submission.grade / submission.totalMarks) * 100)}%
                                </span>
                            )}
                        </div>
                    ))}
                    {student.submissions.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                            No assignment submissions yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StudentAssignments = ({ student }) => (
    <div className="space-y-4">
        <h3 className="text-lg font-semibold">Assignment Submissions</h3>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Assignment</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Score</th>
                        <th className="text-left py-2">Submitted</th>
                        <th className="text-left py-2">Feedback</th>
                    </tr>
                </thead>
                <tbody>
                    {student.submissions.map((submission, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3">{submission.assignmentTitle || 'Assignment'}</td>
                            <td className="py-3">
                                <span className={`px-2 py-1 rounded text-xs ${submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                                    submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {submission.status || 'submitted'}
                                </span>
                            </td>
                            <td className="py-3">
                                {submission.grade ? `${submission.grade}/${submission.totalMarks}` : 'Not graded'}
                            </td>
                            <td className="py-3 text-sm text-gray-500">
                                {submission.submittedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="py-3">
                                {submission.feedback ? (
                                    <span className="text-blue-600 cursor-pointer">View Feedback</span>
                                ) : (
                                    <span className="text-gray-400">No feedback</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {student.submissions.length === 0 && (
                        <tr>
                            <td colSpan="5" className="py-4 text-center text-gray-500">
                                No assignment submissions found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const StudentQuizzes = ({ student }) => (
    <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quiz Attempts</h3>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Quiz</th>
                        <th className="text-left py-2">Score</th>
                        <th className="text-left py-2">Time Spent</th>
                        <th className="text-left py-2">Completed</th>
                        <th className="text-left py-2">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {student.quizAttempts.map((attempt, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3">{attempt.quizTitle || 'Quiz'}</td>
                            <td className="py-3">
                                <span className={`font-medium ${attempt.score >= 80 ? 'text-green-600' :
                                    attempt.score >= 60 ? 'text-yellow-600' :
                                        'text-red-600'
                                    }`}>
                                    {attempt.score}%
                                </span>
                            </td>
                            <td className="py-3">{attempt.timeSpent || 'N/A'} min</td>
                            <td className="py-3 text-sm text-gray-500">
                                {attempt.completedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="py-3">
                                <button className="text-blue-600 hover:text-blue-800 text-sm">
                                    View Details
                                </button>
                            </td>
                        </tr>
                    ))}
                    {student.quizAttempts.length === 0 && (
                        <tr>
                            <td colSpan="5" className="py-4 text-center text-gray-500">
                                No quiz attempts found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const StudentRemarks = ({
    student,
    remarks,
    newRemark,
    setNewRemark,
    remarkCategory,
    setRemarkCategory,
    onAddRemark,
    onToggleImportant,
    getUserDisplayName,
    currentCourse
}) => (
    <div className="space-y-6">
        {/* Add Remark Form */}
        <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Add New Remark</h3>
            {currentCourse && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <i className="fas fa-info-circle mr-2"></i>
                        This remark will be associated with: <strong>{currentCourse.title || currentCourse.name}</strong>
                    </p>
                </div>
            )}
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        value={remarkCategory}
                        onChange={(e) => setRemarkCategory(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                        <option value="general">General Feedback</option>
                        <option value="improvement">Areas for Improvement</option>
                        <option value="strength">Strengths</option>
                        <option value="behavior">Behavior</option>
                        <option value="academic">Academic Performance</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                    <textarea
                        value={newRemark}
                        onChange={(e) => setNewRemark(e.target.value)}
                        rows="3"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Enter your remarks for this student..."
                    />
                </div>
                <button
                    onClick={onAddRemark}
                    disabled={!newRemark.trim()}
                    className="bg-[#4CBC9A] text-white py-2 px-4 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Add Remark
                </button>
            </div>
        </div>

        {/* Remarks List */}
        <div>
            <h3 className="font-semibold mb-3">Previous Remarks</h3>
            {remarks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-comments text-3xl mb-2"></i>
                    <p>No remarks added yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {remarks.map((remark) => (
                        <div key={remark.id} className={`border-l-4 p-4 rounded-lg ${remark.isImportant ? 'border-red-500 bg-red-50' : 'border-[#4CBC9A] bg-white border'
                            }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${remark.category === 'strength' ? 'bg-green-100 text-green-800' :
                                        remark.category === 'improvement' ? 'bg-yellow-100 text-yellow-800' :
                                            remark.category === 'academic' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {remark.category?.charAt(0).toUpperCase() + remark.category?.slice(1) || 'General'}
                                    </span>
                                    {remark.isImportant && (
                                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                            <i className="fas fa-flag mr-1"></i>
                                            Important
                                        </span>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onToggleImportant(remark.id, remark.isImportant)}
                                        className={`p-1 rounded ${remark.isImportant ? 'text-red-600' : 'text-gray-400'
                                            }`}
                                    >
                                        <i className="fas fa-flag"></i>
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-700 text-lg mb-3">{remark.remarkText}</p>
                            <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                                <div>
                                    <span>By {remark.tutorName}</span>
                                    {remark.courseName && (
                                        <span className="ml-3 text-blue-600">
                                            • For: {remark.courseName}
                                        </span>
                                    )}
                                </div>
                                <span>{remark.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

export default TutorStudentProgress;