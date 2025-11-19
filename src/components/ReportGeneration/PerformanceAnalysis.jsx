// src/pages/PerformanceAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function PerformanceAnalysis() {
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState({
        overallScore: 0,
        avgAssignmentScore: 0,
        avgQuizScore: 0,
        totalAssignments: 0,
        totalQuizzes: 0,
        completedCourses: 0,
        weeklyProgress: [],
        subjectPerformance: []
    });
    const [activeTab, setActiveTab] = useState('overview');
    const [knowledgeStatus, setKnowledgeStatus] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const [tutorRemarks, setTutorRemarks] = useState([]);
    const [courses, setCourses] = useState({});

    useEffect(() => {
        const fetchPerformanceData = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) return;

                // Fetch user's submissions, quiz attempts, course progress
                const [submissionsSnapshot, quizAttemptsSnapshot, coursesSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'submissions'), where('studentId', '==', user.uid))),
                    getDocs(query(collection(db, 'quizAttempts'), where('studentId', '==', user.uid))),
                    getDocs(query(collection(db, 'enrollments'), where('studentId', '==', user.uid)))
                ]);

                const submissions = submissionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Ensure dates are properly converted
                    submittedAt: doc.data().submittedAt?.toDate?.() || null
                }));

                const quizAttempts = quizAttemptsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Ensure dates are properly converted
                    completedAt: doc.data().completedAt?.toDate?.() || doc.data().submittedAt?.toDate?.() || null
                }));

                const enrollments = coursesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log('Submissions:', submissions);
                console.log('Quiz Attempts:', quizAttempts);
                console.log('Enrollments:', enrollments);

                // Process performance data
                const processedData = processPerformanceData(submissions, quizAttempts, enrollments);
                setPerformanceData(processedData);
                setKnowledgeStatus(calculateKnowledgeStatus(submissions, quizAttempts));
                setRecentActivities(getRecentActivities(submissions, quizAttempts));

                // Fetch tutor remarks without ordering to avoid index requirement
                await fetchTutorRemarks(user.uid);

            } catch (error) {
                console.error('Error fetching performance data:', error);
                // Set default data to prevent null errors
                setPerformanceData({
                    overallScore: 0,
                    avgAssignmentScore: 0,
                    avgQuizScore: 0,
                    totalAssignments: 0,
                    totalQuizzes: 0,
                    completedCourses: 0,
                    weeklyProgress: generateWeeklyProgress([], []),
                    subjectPerformance: calculateSubjectPerformance([], [])
                });
            } finally {
                setLoading(false);
            }
        };

        const fetchTutorRemarks = async (userId) => {
            try {
                // Simple query without ordering to avoid index requirement
                const remarksQuery = query(
                    collection(db, 'tutorRemarks'),
                    where('studentId', '==', userId)
                );
                const remarksSnapshot = await getDocs(remarksQuery);
                const remarks = remarksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort manually on client side
                remarks.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA; // Newest first
                });

                // Fetch course details for remarks
                const courseDetails = {};
                for (const remark of remarks) {
                    if (remark.courseId && !courseDetails[remark.courseId]) {
                        try {
                            const courseDoc = await getDoc(doc(db, 'courses', remark.courseId));
                            if (courseDoc.exists()) {
                                courseDetails[remark.courseId] = courseDoc.data();
                            }
                        } catch (error) {
                            console.error('Error fetching course details:', error);
                        }
                    }
                }

                setTutorRemarks(remarks);
                setCourses(courseDetails);
            } catch (error) {
                console.error('Error fetching tutor remarks:', error);
                setTutorRemarks([]);
            }
        };

        fetchPerformanceData();
    }, []);

    const processPerformanceData = (submissions, quizAttempts, enrollments) => {
        // Calculate overall performance metrics
        const totalAssignments = submissions.length;
        const totalQuizzes = quizAttempts.length;

        const assignmentScores = submissions.filter(s => s.grade).map(s => (s.grade / s.totalMarks) * 100);
        const quizScores = quizAttempts.filter(q => q.score).map(q => q.score);

        const avgAssignmentScore = assignmentScores.length > 0 ?
            assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length : 0;
        const avgQuizScore = quizScores.length > 0 ?
            quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0;

        const overallScore = (avgAssignmentScore + avgQuizScore) / 2 || 0;

        // Generate progress data for charts
        const weeklyProgress = generateWeeklyProgress(submissions, quizAttempts);
        const subjectPerformance = calculateSubjectPerformance(submissions, quizAttempts);

        return {
            overallScore: Math.round(overallScore),
            avgAssignmentScore: Math.round(avgAssignmentScore),
            avgQuizScore: Math.round(avgQuizScore),
            totalAssignments,
            totalQuizzes,
            completedCourses: enrollments.filter(e => e.progress === 100).length,
            weeklyProgress,
            subjectPerformance
        };
    };

    const calculateKnowledgeStatus = (submissions, quizAttempts) => {
        // Analyze performance by topic/subject
        const topics = {};

        submissions.forEach(sub => {
            if (sub.aiAnalysis && sub.aiAnalysis.topics) {
                sub.aiAnalysis.topics.forEach(topic => {
                    if (!topics[topic]) topics[topic] = { score: 0, count: 0 };
                    topics[topic].score += (sub.grade / sub.totalMarks) * 100;
                    topics[topic].count += 1;
                });
            }
        });

        return Object.entries(topics).map(([topic, data]) => ({
            topic,
            proficiency: Math.round(data.score / data.count),
            status: getProficiencyStatus(data.score / data.count)
        }));
    };

    const getProficiencyStatus = (score) => {
        if (score >= 90) return 'Expert';
        if (score >= 75) return 'Proficient';
        if (score >= 60) return 'Intermediate';
        return 'Beginner';
    };

    const getRecentActivities = (submissions, quizAttempts) => {
        const allActivities = [
            ...submissions.map(s => ({
                type: 'assignment',
                title: s.assignmentTitle || 'Assignment',
                score: s.grade ? Math.round((s.grade / s.totalMarks) * 100) : null,
                date: s.submittedAt,
                status: s.status || 'submitted'
            })),
            ...quizAttempts.map(q => ({
                type: 'quiz',
                title: q.quizTitle || 'Quiz',
                score: q.score,
                date: q.completedAt,
                status: 'completed'
            }))
        ];

        // Sort by date, most recent first
        return allActivities
            .filter(activity => activity.date) // Only include activities with dates
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
    };

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading performance data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-30 mb-30">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Performance Analysis</h1>
                    <p className="text-gray-600 mt-2">Track your learning progress and get personalized insights</p>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {['overview', 'progress', 'knowledge', 'feedback', 'reports'].map(tab => (
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {activeTab === 'overview' && <OverviewTab data={performanceData} activities={recentActivities} />}
                        {activeTab === 'progress' && <ProgressTab data={performanceData} />}
                        {activeTab === 'knowledge' && <KnowledgeTab knowledge={knowledgeStatus} />}
                        {activeTab === 'feedback' && <FeedbackTab remarks={tutorRemarks} courses={courses} />}
                        {activeTab === 'reports' && <ReportsTab data={performanceData} />}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Overall Score</span>
                                    <span className="font-bold text-[#4CBC9A]">{performanceData.overallScore}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Assignments Completed</span>
                                    <span className="font-bold">{performanceData.totalAssignments}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Quizzes Taken</span>
                                    <span className="font-bold">{performanceData.totalQuizzes}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Courses Completed</span>
                                    <span className="font-bold">{performanceData.completedCourses}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Tutor Feedback</span>
                                    <span className="font-bold">{tutorRemarks.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Feedback */}
                        <AIFeedback knowledge={knowledgeStatus} overallScore={performanceData.overallScore} />

                        {/* Progress Indicators */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Learning Pace</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm">This Week</span>
                                        <span className="text-sm font-medium">3 activities</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-[#4CBC9A] h-2 rounded-full" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm">This Month</span>
                                        <span className="text-sm font-medium">12 activities</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-[#6c5dd3] h-2 rounded-full" style={{ width: '75%' }}></div>
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

// Sub-components for each tab
const OverviewTab = ({ data, activities }) => (
    <div className="space-y-6">
        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                    <CircularProgressbar
                        value={data.overallScore || 0}
                        text={`${data.overallScore || 0}%`}
                        styles={buildStyles({
                            textColor: '#4CBC9A',
                            pathColor: '#4CBC9A',
                            trailColor: '#f0f0f0',
                        })}
                    />
                </div>
                <h3 className="font-semibold">Overall Performance</h3>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                    <CircularProgressbar
                        value={data.avgAssignmentScore || 0}
                        text={`${data.avgAssignmentScore || 0}%`}
                        styles={buildStyles({
                            textColor: '#FEC64F',
                            pathColor: '#FEC64F',
                            trailColor: '#f0f0f0',
                        })}
                    />
                </div>
                <h3 className="font-semibold">Assignment Score</h3>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                    <CircularProgressbar
                        value={data.avgQuizScore || 0}
                        text={`${data.avgQuizScore || 0}%`}
                        styles={buildStyles({
                            textColor: '#6c5dd3',
                            pathColor: '#6c5dd3',
                            trailColor: '#f0f0f0',
                        })}
                    />
                </div>
                <h3 className="font-semibold">Quiz Score</h3>
            </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.weeklyProgress || []}>
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="assignments" stroke="#4CBC9A" strokeWidth={2} />
                    <Line type="monotone" dataKey="quizzes" stroke="#6c5dd3" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            <div className="space-y-3">
                {activities && activities.length > 0 ? (
                    activities.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'assignment' ? 'bg-[#4CBC9A]' : 'bg-[#6c5dd3]'
                                    }`}>
                                    <i className={`fas ${activity.type === 'assignment' ? 'fa-file-alt' : 'fa-question-circle'} text-white text-sm`}></i>
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium">{activity.title || 'Activity'}</p>
                                    <p className="text-sm text-gray-500">
                                        {activity.date?.toLocaleDateString() || 'Recently'} • {activity.type}
                                    </p>
                                </div>
                            </div>
                            {activity.score && (
                                <span className={`px-2 py-1 rounded text-sm font-medium ${activity.score >= 80 ? 'bg-green-100 text-green-800' :
                                    activity.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {activity.score}%
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 text-gray-500">
                        No recent activities found
                    </div>
                )}
            </div>
        </div>
    </div>
);

const ProgressTab = ({ data }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.weeklyProgress || []}>
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="assignments" fill="#4CBC9A" name="Assignments" />
                    <Bar dataKey="quizzes" fill="#6c5dd3" name="Quizzes" />
                    <Bar dataKey="overall" fill="#FEC64F" name="Overall" />
                </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Subject Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data.subjectPerformance || []}
                            dataKey="score"
                            nameKey="subject"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {(data.subjectPerformance || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#4CBC9A', '#6c5dd3', '#FEC64F', '#FF6B6B'][index % 4]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Improvement Areas</h3>
                <div className="space-y-4">
                    {(data.subjectPerformance || [])
                        .filter(subject => subject.score < 70)
                        .map((subject, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span>{subject.subject}</span>
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${subject.score}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-600">{subject.score}%</span>
                            </div>
                        ))
                    }
                    {(!data.subjectPerformance || data.subjectPerformance.filter(s => s.score < 70).length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                            No improvement areas identified
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const KnowledgeTab = ({ knowledge }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Knowledge Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knowledge && knowledge.length > 0 ? (
                    knowledge.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{item.topic}</h4>
                                <span className={`px-2 py-1 rounded text-xs ${item.status === 'Expert' ? 'bg-green-100 text-green-800' :
                                    item.status === 'Proficient' ? 'bg-blue-100 text-blue-800' :
                                        item.status === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${item.proficiency >= 90 ? 'bg-green-500' :
                                        item.proficiency >= 75 ? 'bg-blue-500' :
                                            item.proficiency >= 60 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                        }`}
                                    style={{ width: `${item.proficiency}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>Proficiency</span>
                                <span>{item.proficiency}%</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                        <i className="fas fa-chart-bar text-3xl mb-2"></i>
                        <p>No knowledge data available yet</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const FeedbackTab = ({ remarks, courses }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tutor Feedback & Remarks</h3>

            {remarks.length === 0 ? (
                <div className="text-center py-12">
                    <i className="fas fa-comments text-4xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Feedback Yet</h3>
                    <p className="text-gray-500">
                        Your tutors haven't provided any feedback yet. Check back later for updates.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {remarks.map((remark) => (
                        <div key={remark.id} className={`border-l-4 p-6 rounded-lg ${remark.isImportant ? 'border-red-500 bg-red-50' : 'border-[#4CBC9A] bg-green-50'
                            }`}>
                            <div className="flex justify-between items-start mb-4">
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
                                <div className="text-sm text-gray-500">
                                    {remark.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                                </div>
                            </div>

                            <p className="text-gray-700 text-lg mb-4 leading-relaxed">{remark.remarkText}</p>

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-4">
                                    <div>
                                        <p className="font-medium text-gray-800">By {remark.tutorName}</p>
                                        {remark.courseId && courses[remark.courseId] && (
                                            <p className="text-sm text-gray-600">
                                                For: {courses[remark.courseId].title || courses[remark.courseId].name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!remark.courseId && (
                                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        General Feedback
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Feedback Summary */}
        {remarks.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Feedback Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {remarks.filter(r => r.category === 'strength').length}
                        </div>
                        <div className="text-sm text-blue-600">Strengths</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                            {remarks.filter(r => r.category === 'improvement').length}
                        </div>
                        <div className="text-sm text-yellow-600">Areas to Improve</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {remarks.filter(r => r.isImportant).length}
                        </div>
                        <div className="text-sm text-green-600">Important Notes</div>
                    </div>
                </div>
            </div>
        )}
    </div>
);

const ReportsTab = ({ data }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Generate Performance Report</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button className="bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384]">
                    <i className="fas fa-download mr-2"></i>
                    Download PDF Report
                </button>
                <button className="bg-[#6c5dd3] text-white py-3 rounded-lg hover:bg-[#5a4bbf]">
                    <i className="fas fa-chart-line mr-2"></i>
                    Detailed Analytics
                </button>
                <button className="bg-[#FEC64F] text-white py-3 rounded-lg hover:bg-[#e6b447]">
                    <i className="fas fa-share mr-2"></i>
                    Share with Tutor
                </button>
            </div>

            <div className="border-t pt-6">
                <h4 className="font-semibold mb-3">Report Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-[#4CBC9A]">{data.overallScore || 0}%</div>
                        <div className="text-sm text-gray-600">Overall Score</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-[#6c5dd3]">{data.totalAssignments || 0}</div>
                        <div className="text-sm text-gray-600">Assignments</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-[#FEC64F]">{data.totalQuizzes || 0}</div>
                        <div className="text-sm text-gray-600">Quizzes</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-[#FF6B6B]">{data.completedCourses || 0}</div>
                        <div className="text-sm text-gray-600">Courses Completed</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const AIFeedback = ({ knowledge, overallScore }) => {
    const getFeedback = () => {
        if (overallScore >= 90) {
            return "Excellent work! You're demonstrating mastery across all topics. Consider taking on more challenging assignments.";
        } else if (overallScore >= 75) {
            return "Great progress! You're performing well overall. Focus on your weaker areas to reach the next level.";
        } else if (overallScore >= 60) {
            return "Good foundation. You're on the right track. Practice more in areas where you're struggling.";
        } else {
            return "Let's focus on building fundamentals. Start with basic concepts and practice regularly.";
        }
    };

    const getRecommendations = () => {
        const weakAreas = (knowledge || []).filter(item => item.proficiency < 70);
        if (weakAreas.length === 0) return ["Continue with advanced topics", "Help peers learn"];

        return weakAreas.map(area => `Focus on ${area.topic} - current proficiency ${area.proficiency}%`);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
                <i className="fas fa-robot text-[#4CBC9A] mr-2"></i>
                AI Personalized Feedback
            </h3>
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{getFeedback()}</p>
                </div>
                <div>
                    <h4 className="font-medium mb-2">Recommended Actions:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                        {getRecommendations().map((rec, index) => (
                            <li key={index} className="flex items-center">
                                <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

// Helper functions
const generateWeeklyProgress = (submissions, quizAttempts) => {
    // Generate sample weekly data - in real app, this would be calculated from actual dates
    return [
        { week: 'Week 1', assignments: 65, quizzes: 70, overall: 68 },
        { week: 'Week 2', assignments: 72, quizzes: 68, overall: 70 },
        { week: 'Week 3', assignments: 78, quizzes: 75, overall: 77 },
        { week: 'Week 4', assignments: 82, quizzes: 80, overall: 81 },
        { week: 'Week 5', assignments: 85, quizzes: 83, overall: 84 },
        { week: 'Week 6', assignments: 88, quizzes: 85, overall: 87 }
    ];
};

const calculateSubjectPerformance = (submissions, quizAttempts) => {
    // Sample subject performance - in real app, this would be calculated from actual data
    return [
        { subject: 'Programming', score: 85 },
        { subject: 'Mathematics', score: 78 },
        { subject: 'Algorithms', score: 65 },
        { subject: 'Data Structures', score: 72 }
    ];
};

export default PerformanceAnalysis;