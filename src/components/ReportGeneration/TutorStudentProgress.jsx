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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center mb-4">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-lg text-gray-600 font-medium">Loading student progress...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-poppins">
            <div className="max-w-7xl mt-[70px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 lg:p-8 text-white shadow-lg">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold mb-2">Student Progress Monitoring</h1>
                                <p className="text-indigo-100 text-base lg:text-lg max-w-2xl">
                                    Track and manage all student progress in one place
                                </p>
                            </div>
                            <div className="mt-4 lg:mt-0 flex gap-3">
                                {filterCourse !== 'all' && (
                                    <button
                                        onClick={createCourseGroupChat}
                                        className="inline-flex items-center px-4 py-3 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg"
                                    >
                                        <i className="fas fa-comments mr-2"></i>
                                        Create Group Chat
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Students List Sidebar */}
                    <div className="lg:w-1/4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                            {/* Search and Filter */}
                            <div className="mb-6">
                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    />
                                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                </div>

                                <div className="space-y-3">
                                    <select
                                        value={filterCourse}
                                        onChange={(e) => setFilterCourse(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="all">All Courses</option>
                                        {availableCourses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.title || course.name || `Course ${course.id.slice(0, 4)}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Students List */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-users text-indigo-600"></i>
                                    Students ({filteredStudents.length})
                                </h3>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {filteredStudents.map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => setSelectedStudent(student)}
                                            className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 group ${selectedStudent?.id === student.id
                                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                {getUserAvatar(student, 'w-10 h-10')}
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
                                                        {getUserDisplayName(student)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                                </div>
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${student.progress.overallScore >= 80 ? 'bg-green-500' :
                                                    student.progress.overallScore >= 60 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`}></div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">Overall Progress</span>
                                                    <span className="font-semibold text-gray-800">{student.progress.overallScore}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                                                        style={{ width: `${student.progress.overallScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <i className="fas fa-user-slash text-3xl mb-3 text-gray-300"></i>
                                            <p className="text-sm">
                                                {filterCourse === 'all' ? 'No students found' : 'No students enrolled in this course'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-chart-bar text-indigo-600"></i>
                                    {filterCourse === 'all' ? 'Class Summary' : 'Course Summary'}
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <div className="text-xl font-bold text-blue-600">{classSummary.totalStudents}</div>
                                        <div className="text-xs text-blue-600 font-medium">Total Students</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <div className="text-xl font-bold text-green-600">{classSummary.classAverage}%</div>
                                        <div className="text-xs text-green-600 font-medium">Class Average</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 rounded-lg col-span-2">
                                        <div className="text-xl font-bold text-purple-600">{classSummary.completedCourses}</div>
                                        <div className="text-xs text-purple-600 font-medium">Completed Courses</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student Details Main Content */}
                    <div className="lg:w-3/4">
                        {selectedStudent ? (
                            <div className="space-y-6">
                                {/* Student Header Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 lg:p-8">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                {getUserAvatar(selectedStudent, 'w-16 h-16 lg:w-20 lg:h-20')}
                                                <div>
                                                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
                                                        {getUserDisplayName(selectedStudent)}
                                                    </h2>
                                                    <p className="text-gray-600 text-sm lg:text-base mt-1">
                                                        {selectedStudent.email}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                            {selectedStudent.progress.totalCourses} courses enrolled
                                                        </span>
                                                        {filterCourse !== 'all' && (
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                                {availableCourses.find(c => c.id === filterCourse)?.title || 'Selected Course'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-center lg:text-right">
                                                <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                                    {selectedStudent.progress.overallScore}%
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium">Overall Score</div>
                                                <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-medium ${selectedStudent.progress.overallScore >= 80 ? 'bg-green-100 text-green-800' :
                                                    selectedStudent.progress.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    <i className={`fas ${selectedStudent.progress.overallScore >= 80 ? 'fa-check-circle' :
                                                        selectedStudent.progress.overallScore >= 60 ? 'fa-exclamation-circle' :
                                                            'fa-times-circle'
                                                        }`}></i>
                                                    {selectedStudent.progress.overallScore >= 80 ? 'Excellent' :
                                                        selectedStudent.progress.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Navigation Tabs */}
                                        <div className="mt-8 border-b border-gray-200">
                                            <nav className="-mb-px flex space-x-8">
                                                {[
                                                    { key: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                                                    { key: 'assignments', icon: 'fa-file-alt', label: 'Assignments' },
                                                    { key: 'quizzes', icon: 'fa-question-circle', label: 'Quizzes' },
                                                    { key: 'remarks', icon: 'fa-comments', label: 'Remarks' }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.key}
                                                        onClick={() => setActiveTab(tab.key)}
                                                        className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === tab.key
                                                            ? 'border-indigo-500 text-indigo-600'
                                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <i className={`fas ${tab.icon}`}></i>
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </nav>
                                        </div>

                                        {/* Tab Content */}
                                        <div className="mt-6">
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
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <i className="fas fa-users text-3xl text-indigo-600"></i>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                                    {filterCourse === 'all' ? 'Select a Student' : 'No Students in Selected Course'}
                                </h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    {filterCourse === 'all'
                                        ? 'Choose a student from the list to view their detailed progress and analytics'
                                        : 'There are currently no students enrolled in the selected course'
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

// Enhanced Sub-components with real data
const StudentOverview = ({ student, getUserDisplayName }) => {
    const progressData = [
        { name: 'Assignments', score: student.progress.avgAssignmentScore, color: '#10B981' },
        { name: 'Quizzes', score: student.progress.avgQuizScore, color: '#8B5CF6' },
        { name: 'Courses', score: Math.round((student.progress.completedCourses / student.progress.totalCourses) * 100) || 0, color: '#F59E0B' }
    ];

    // Generate real activity timeline from submissions and quiz attempts
    const generateActivityTimeline = () => {
        const allActivities = [
            ...student.submissions.map(sub => ({
                type: 'assignment',
                title: sub.assignmentTitle || 'Assignment',
                date: sub.submittedAt?.toDate?.(),
                score: sub.grade ? Math.round((sub.grade / sub.totalMarks) * 100) : null,
                status: sub.status || 'submitted'
            })),
            ...student.quizAttempts.map(quiz => ({
                type: 'quiz',
                title: quiz.quizTitle || 'Quiz',
                date: quiz.completedAt?.toDate?.() || quiz.submittedAt?.toDate?.(),
                score: quiz.score || null,
                status: 'completed'
            }))
        ];

        // Sort by date, most recent first
        return allActivities
            .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
            .slice(0, 10); // Show last 10 activities
    };

    const activityTimeline = generateActivityTimeline();

    // Calculate submission distribution
    const submissionDistribution = [
        { name: 'Graded', value: student.submissions.filter(s => s.status === 'graded').length },
        { name: 'Pending', value: student.submissions.filter(s => s.status !== 'graded').length }
    ];

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

    return (
        <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <i className="fas fa-chart-line text-white"></i>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{student.progress.overallScore}%</div>
                            <div className="text-sm text-blue-600 font-medium">Overall</div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <i className="fas fa-file-alt text-white"></i>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">{student.progress.avgAssignmentScore}%</div>
                            <div className="text-sm text-green-600 font-medium">Assignments</div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                            <i className="fas fa-question-circle text-white"></i>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600">{student.progress.avgQuizScore}%</div>
                            <div className="text-sm text-purple-600 font-medium">Quizzes</div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <i className="fas fa-book-open text-white"></i>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-orange-600">
                                {student.progress.completedCourses}/{student.progress.totalCourses}
                            </div>
                            <div className="text-sm text-orange-600 font-medium">Courses</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                        <i className="fas fa-chart-bar text-indigo-600"></i>
                        Performance Breakdown
                    </h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={progressData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(value) => [`${value}%`, 'Score']}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Bar
                                    dataKey="score"
                                    radius={[4, 4, 0, 0]}
                                >
                                    {progressData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                        <i className="fas fa-tasks text-indigo-600"></i>
                        Submission Status
                    </h4>
                    <div className="h-64">
                        {submissionDistribution.some(item => item.value > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={submissionDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {submissionDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`${value} submissions`, 'Count']}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No submission data available
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        {submissionDistribution.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                                <span>{entry.name}</span>
                                <span className="font-semibold">({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                    <i className="fas fa-clock text-indigo-600"></i>
                    Recent Activity
                </h4>
                <div className="space-y-4">
                    {activityTimeline.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.type === 'assignment'
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                    }`}>
                                    <i className={`fas ${activity.type === 'assignment' ? 'fa-file-alt' : 'fa-question-circle'} text-white text-sm`}></i>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-800 truncate">{activity.title}</p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {activity.type === 'assignment' ? 'Assignment' : 'Quiz'} •
                                        {activity.date ? ` ${activity.date.toLocaleDateString()}` : ' Recently'}
                                    </p>
                                </div>
                            </div>
                            {activity.score !== null && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${activity.score >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                                    activity.score >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                        'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                    {activity.score}%
                                </span>
                            )}
                        </div>
                    ))}
                    {activityTimeline.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fas fa-file-alt text-3xl mb-3 text-gray-300"></i>
                            <p>No recent activity</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StudentAssignments = ({ student }) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <i className="fas fa-file-alt text-indigo-600"></i>
                Assignment Submissions ({student.submissions.length})
            </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Assignment</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Score</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Submitted</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {student.submissions.map((submission, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-file-alt text-indigo-600 text-sm"></i>
                                        </div>
                                        <span className="font-medium text-gray-800">{submission.assignmentTitle || 'Assignment'}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${submission.status === 'graded' ? 'bg-green-100 text-green-800 border border-green-200' :
                                        submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                            'bg-gray-100 text-gray-800 border border-gray-200'
                                        }`}>
                                        {submission.status || 'submitted'}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    {submission.grade ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800">
                                                {submission.grade}/{submission.totalMarks}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${(submission.grade / submission.totalMarks) * 100 >= 80 ? 'bg-green-100 text-green-800' :
                                                (submission.grade / submission.totalMarks) * 100 >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {Math.round((submission.grade / submission.totalMarks) * 100)}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Not graded</span>
                                    )}
                                </td>
                                <td className="py-4 px-6 text-gray-600 text-sm">
                                    {submission.submittedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                                </td>
                            </tr>
                        ))}
                        {student.submissions.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-gray-500">
                                    <i className="fas fa-file-alt text-3xl mb-3 text-gray-300"></i>
                                    <p>No assignment submissions found</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const StudentQuizzes = ({ student }) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <i className="fas fa-question-circle text-indigo-600"></i>
                Quiz Attempts ({student.quizAttempts.length})
            </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Quiz</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Score</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Correct Answers</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Time Spent</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Completed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {student.quizAttempts.map((attempt, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-question-circle text-purple-600 text-sm"></i>
                                        </div>
                                        <span className="font-medium text-gray-800">{attempt.quizTitle || 'Quiz'}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`font-semibold ${attempt.score >= 80 ? 'text-green-600' :
                                        attempt.score >= 60 ? 'text-yellow-600' :
                                            'text-red-600'
                                        }`}>
                                        {attempt.score}%
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-gray-700">
                                    {attempt.correctAnswers || 0}/{attempt.totalQuestions || 'N/A'}
                                </td>
                                <td className="py-4 px-6 text-gray-700">
                                    {attempt.timeSpent ? `${attempt.timeSpent.toFixed(1)} min` : 'N/A'}
                                </td>
                                <td className="py-4 px-6 text-gray-600 text-sm">
                                    {attempt.completedAt?.toDate?.().toLocaleDateString() ||
                                        attempt.submittedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                                </td>
                            </tr>
                        ))}
                        {student.quizAttempts.length === 0 && (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-gray-500">
                                    <i className="fas fa-question-circle text-3xl mb-3 text-gray-300"></i>
                                    <p>No quiz attempts found</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
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
    <div className="space-y-8">
        {/* Add Remark Form */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
            <h3 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
                <i className="fas fa-edit text-indigo-600"></i>
                Add New Remark
            </h3>
            {currentCourse && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                        <i className="fas fa-info-circle"></i>
                        This remark will be associated with: <strong>{currentCourse.title || currentCourse.name}</strong>
                    </p>
                </div>
            )}
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            value={remarkCategory}
                            onChange={(e) => setRemarkCategory(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="general">General Feedback</option>
                            <option value="improvement">Areas for Improvement</option>
                            <option value="strength">Strengths</option>
                            <option value="behavior">Behavior</option>
                            <option value="academic">Academic Performance</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
                    <textarea
                        value={newRemark}
                        onChange={(e) => setNewRemark(e.target.value)}
                        rows="4"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter your remarks for this student..."
                    />
                </div>
                <button
                    onClick={onAddRemark}
                    disabled={!newRemark.trim()}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                    <i className="fas fa-plus mr-2"></i>
                    Add Remark
                </button>
            </div>
        </div>

        {/* Remarks List */}
        <div>
            <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                <i className="fas fa-comments text-indigo-600"></i>
                Previous Remarks ({remarks.length})
            </h3>
            {remarks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                    <i className="fas fa-comments text-4xl mb-4 text-gray-300"></i>
                    <p className="text-lg mb-2">No remarks added yet</p>
                    <p className="text-sm">Add your first remark to start tracking student feedback</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {remarks.map((remark) => (
                        <div key={remark.id} className={`p-6 rounded-xl border-l-4 transition-all duration-200 ${remark.isImportant
                            ? 'border-red-500 bg-red-50 border border-red-100'
                            : 'border-indigo-500 bg-white border border-gray-200 hover:border-indigo-300'
                            }`}>
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${remark.category === 'strength' ? 'bg-green-100 text-green-800 border border-green-200' :
                                        remark.category === 'improvement' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                            remark.category === 'academic' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                'bg-gray-100 text-gray-800 border border-gray-200'
                                        }`}>
                                        {remark.category?.charAt(0).toUpperCase() + remark.category?.slice(1) || 'General'}
                                    </span>
                                    {remark.isImportant && (
                                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1 border border-red-200">
                                            <i className="fas fa-flag"></i>
                                            Important
                                        </span>
                                    )}
                                    {remark.courseName && (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium border border-purple-200">
                                            {remark.courseName}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-500">
                                        {remark.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                                    </div>
                                    <button
                                        onClick={() => onToggleImportant(remark.id, remark.isImportant)}
                                        className={`p-2 rounded-lg transition-colors ${remark.isImportant
                                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}
                                    >
                                        <i className="fas fa-flag"></i>
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-700 text-base mb-4 leading-relaxed">{remark.remarkText}</p>
                            <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">By {remark.tutorName}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

export default TutorStudentProgress;