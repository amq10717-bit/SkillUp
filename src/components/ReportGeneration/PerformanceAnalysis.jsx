// src/pages/PerformanceAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'react-circular-progressbar/dist/styles.css';

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const [recentActivities, setRecentActivities] = useState([]);
    const [tutorRemarks, setTutorRemarks] = useState([]);
    const [courses, setCourses] = useState({});
    const [enrollments, setEnrollments] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [generatedReport, setGeneratedReport] = useState(null);

    useEffect(() => {
        const fetchPerformanceData = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) return;

                // Fetch user's submissions, quiz attempts, course progress
                const [submissionsSnapshot, quizAttemptsSnapshot, enrollmentsSnapshot] = await Promise.all([
                    getDocs(query(collection(db, 'submissions'), where('studentId', '==', user.uid))),
                    getDocs(query(collection(db, 'quizAttempts'), where('studentId', '==', user.uid))),
                    getDocs(query(collection(db, 'enrollments'), where('studentId', '==', user.uid)))
                ]);

                const submissions = submissionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    submittedAt: doc.data().submittedAt?.toDate?.() || null
                }));

                const quizAttempts = quizAttemptsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    completedAt: doc.data().completedAt?.toDate?.() || doc.data().submittedAt?.toDate?.() || null
                }));

                const enrollmentsData = enrollmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEnrollments(enrollmentsData);

                // Fetch course details for enrolled courses
                const courseDetails = {};
                for (const enrollment of enrollmentsData) {
                    if (enrollment.courseId && !courseDetails[enrollment.courseId]) {
                        try {
                            const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
                            if (courseDoc.exists()) {
                                courseDetails[enrollment.courseId] = courseDoc.data();
                            }
                        } catch (error) {
                            console.error('Error fetching course details:', error);
                        }
                    }
                }
                setCourses(courseDetails);

                // Process performance data
                const processedData = processPerformanceData(submissions, quizAttempts, enrollmentsData);
                setPerformanceData(processedData);
                setRecentActivities(getRecentActivities(submissions, quizAttempts));

                // Fetch tutor remarks
                await fetchTutorRemarks(user.uid);

            } catch (error) {
                console.error('Error fetching performance data:', error);
                setPerformanceData({
                    overallScore: 0,
                    avgAssignmentScore: 0,
                    avgQuizScore: 0,
                    totalAssignments: 0,
                    totalQuizzes: 0,
                    completedCourses: 0,
                    weeklyProgress: [],
                    subjectPerformance: []
                });
            } finally {
                setLoading(false);
            }
        };

        const fetchTutorRemarks = async (userId) => {
            try {
                const remarksQuery = query(
                    collection(db, 'tutorRemarks'),
                    where('studentId', '==', userId)
                );
                const remarksSnapshot = await getDocs(remarksQuery);
                const remarks = remarksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                remarks.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                setTutorRemarks(remarks);
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
        const subjectPerformance = calculateSubjectPerformance(submissions, quizAttempts, courses);

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

        return allActivities
            .filter(activity => activity.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
    };

    const generateWeeklyProgress = (submissions, quizAttempts) => {
        const last6Weeks = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const weekSubmissions = submissions.filter(sub => {
                const subDate = sub.submittedAt;
                return subDate && subDate >= weekStart && subDate <= weekEnd;
            });

            const weekQuizzes = quizAttempts.filter(quiz => {
                const quizDate = quiz.completedAt;
                return quizDate && quizDate >= weekStart && quizDate <= weekEnd;
            });

            const assignmentScore = weekSubmissions.length > 0 ?
                weekSubmissions.reduce((sum, sub) => sum + (sub.grade / sub.totalMarks) * 100, 0) / weekSubmissions.length : 0;

            const quizScore = weekQuizzes.length > 0 ?
                weekQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / weekQuizzes.length : 0;

            const overall = (assignmentScore + quizScore) / 2 || 0;

            last6Weeks.push({
                week: `Week ${6 - i}`,
                assignments: Math.round(assignmentScore),
                quizzes: Math.round(quizScore),
                overall: Math.round(overall),
                assignmentCount: weekSubmissions.length,
                quizCount: weekQuizzes.length
            });
        }

        return last6Weeks;
    };

    const calculateSubjectPerformance = (submissions, quizAttempts, courseDetails) => {
        const courseScores = {};

        submissions.forEach(sub => {
            if (sub.courseId && sub.grade) {
                if (!courseScores[sub.courseId]) {
                    courseScores[sub.courseId] = { total: 0, count: 0 };
                }
                courseScores[sub.courseId].total += (sub.grade / sub.totalMarks) * 100;
                courseScores[sub.courseId].count += 1;
            }
        });

        quizAttempts.forEach(quiz => {
            if (quiz.courseId && quiz.score) {
                if (!courseScores[quiz.courseId]) {
                    courseScores[quiz.courseId] = { total: 0, count: 0 };
                }
                courseScores[quiz.courseId].total += quiz.score;
                courseScores[quiz.courseId].count += 1;
            }
        });

        return Object.entries(courseScores)
            .map(([courseId, data]) => ({
                subject: courseDetails[courseId]?.title || courseDetails[courseId]?.name || `Course ${courseId.slice(0, 4)}`,
                score: Math.round(data.total / data.count),
                activityCount: data.count
            }))
            .sort((a, b) => b.score - a.score);
    };

    const calculateLearningPace = () => {
        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);

        const oneMonthAgo = new Date(now);
        oneMonthAgo.setDate(now.getDate() - 30);

        const weeklyActivities = recentActivities.filter(activity =>
            activity.date && activity.date >= oneWeekAgo
        ).length;

        const monthlyActivities = recentActivities.filter(activity =>
            activity.date && activity.date >= oneMonthAgo
        ).length;

        return {
            weeklyCount: weeklyActivities,
            monthlyCount: monthlyActivities,
            weeklyPercentage: Math.min(100, (weeklyActivities / 10) * 100),
            monthlyPercentage: Math.min(100, (monthlyActivities / 30) * 100)
        };
    };

    // Generate professional report using Gemini AI
    const generatePerformanceReport = async () => {
        try {
            setReportLoading(true);

            const prompt = `
                Create a comprehensive and professional performance analysis report for a student based on the following data:

                OVERALL PERFORMANCE:
                - Overall Score: ${performanceData.overallScore}%
                - Assignment Average: ${performanceData.avgAssignmentScore}%
                - Quiz Average: ${performanceData.avgQuizScore}%
                - Completed Courses: ${performanceData.completedCourses}
                - Total Assignments: ${performanceData.totalAssignments}
                - Total Quizzes: ${performanceData.totalQuizzes}

                COURSE PERFORMANCE:
                ${performanceData.subjectPerformance.map(course =>
                `- ${course.subject}: ${course.score}% (${course.activityCount} activities)`
            ).join('\n')}

                RECENT ACTIVITIES: ${recentActivities.length} activities in the last period
                TUTOR FEEDBACK: ${tutorRemarks.length} remarks received

                WEEKLY TREND: ${performanceData.weeklyProgress.map(week =>
                `${week.week}: ${week.overall}% overall (${week.assignmentCount} assignments, ${week.quizCount} quizzes)`
            ).join(' | ')}

                Please generate a professional educational performance report that includes:
                1. Executive Summary with overall assessment
                2. Strengths and key achievements
                3. Areas for improvement with specific recommendations
                4. Learning patterns and study habits analysis
                5. Personalized recommendations for academic growth
                6. Progress trajectory and future outlook

                Format the report professionally with clear sections, using appropriate educational terminology.
                Make it insightful and actionable for the student.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const reportContent = response.text();

            setGeneratedReport(reportContent);
        } catch (error) {
            console.error('Error generating report:', error);
            setGeneratedReport('Unable to generate report at this time. Please try again later.');
        } finally {
            setReportLoading(false);
        }
    };

    // Download report as PDF
    const downloadReportAsPDF = () => {
        if (!generatedReport) return;

        const element = document.createElement('div');
        element.innerHTML = `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
                    Student Performance Report
                </h1>
                <div style="color: #7f8c8d; text-align: center; margin-bottom: 30px;">
                    Generated on ${new Date().toLocaleDateString()}
                </div>
                <div style="line-height: 1.6; color: #2c3e50;">
                    ${generatedReport.replace(/\n/g, '<br>')}
                </div>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #bdc3c7; color: #7f8c8d;">
                    <p><strong>Performance Summary:</strong></p>
                    <p>Overall Score: ${performanceData.overallScore}%</p>
                    <p>Assignments Completed: ${performanceData.totalAssignments}</p>
                    <p>Quizzes Taken: ${performanceData.totalQuizzes}</p>
                    <p>Courses Completed: ${performanceData.completedCourses}</p>
                </div>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Student Performance Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${element.innerHTML}
                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Print as PDF
                        </button>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const learningPace = calculateLearningPace();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center mb-4">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-lg text-gray-600 font-medium">Loading performance data...</div>
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
                        <div>
                            <h1 className="text-2xl md:text-4xl font-bold mb-2">Performance Analysis</h1>
                            <p className="text-indigo-100 text-base lg:text-lg max-w-2xl">
                                Track your learning progress and get personalized insights
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs - Removed Knowledge tab */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { key: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                            { key: 'progress', icon: 'fa-chart-line', label: 'Progress' },
                            { key: 'feedback', icon: 'fa-comments', label: 'Feedback' },
                            { key: 'reports', icon: 'fa-file-alt', label: 'Reports' }
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
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="lg:w-3/4 space-y-6">
                        {activeTab === 'overview' && <OverviewTab data={performanceData} activities={recentActivities} />}
                        {activeTab === 'progress' && <ProgressTab data={performanceData} />}
                        {activeTab === 'feedback' && <FeedbackTab remarks={tutorRemarks} courses={courses} />}
                        {activeTab === 'reports' && (
                            <ReportsTab
                                data={performanceData}
                                onGenerateReport={generatePerformanceReport}
                                reportLoading={reportLoading}
                                generatedReport={generatedReport}
                                onDownloadReport={downloadReportAsPDF}
                            />
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-1/4 space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-chart-bar text-indigo-600"></i>
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Overall Score</span>
                                    <span className="font-bold text-indigo-600">{performanceData.overallScore}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Assignments Completed</span>
                                    <span className="font-bold text-gray-800">{performanceData.totalAssignments}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Quizzes Taken</span>
                                    <span className="font-bold text-gray-800">{performanceData.totalQuizzes}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Courses Completed</span>
                                    <span className="font-bold text-gray-800">{performanceData.completedCourses}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Tutor Feedback</span>
                                    <span className="font-bold text-gray-800">{tutorRemarks.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Feedback */}
                        <AIFeedback
                            knowledge={[]}
                            overallScore={performanceData.overallScore}
                            assignmentsCount={performanceData.totalAssignments}
                            quizzesCount={performanceData.totalQuizzes}
                        />

                        {/* Learning Pace */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-tachometer-alt text-indigo-600"></i>
                                Learning Pace
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-gray-600">This Week</span>
                                        <span className="text-sm font-medium text-gray-800">{learningPace.weeklyCount} activities</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${learningPace.weeklyPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-gray-600">This Month</span>
                                        <span className="text-sm font-medium text-gray-800">{learningPace.monthlyCount} activities</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${learningPace.monthlyPercentage}%` }}
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
}

// Sub-components for each tab (OverviewTab, ProgressTab, FeedbackTab remain the same as previous version)
const OverviewTab = ({ data, activities }) => (
    <div className="space-y-8">
        {/* Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                    <CircularProgressbar
                        value={data.overallScore || 0}
                        text={`${data.overallScore || 0}%`}
                        styles={buildStyles({
                            textColor: '#4F46E5',
                            pathColor: '#4F46E5',
                            trailColor: '#E0E7FF',
                        })}
                    />
                </div>
                <h3 className="font-semibold text-gray-800">Overall Performance</h3>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                    <CircularProgressbar
                        value={data.avgAssignmentScore || 0}
                        text={`${data.avgAssignmentScore || 0}%`}
                        styles={buildStyles({
                            textColor: '#10B981',
                            pathColor: '#10B981',
                            trailColor: '#D1FAE5',
                        })}
                    />
                </div>
                <h3 className="font-semibold text-gray-800">Assignment Score</h3>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                    <CircularProgressbar
                        value={data.avgQuizScore || 0}
                        text={`${data.avgQuizScore || 0}%`}
                        styles={buildStyles({
                            textColor: '#8B5CF6',
                            pathColor: '#8B5CF6',
                            trailColor: '#EDE9FE',
                        })}
                    />
                </div>
                <h3 className="font-semibold text-gray-800">Quiz Score</h3>
            </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                <i className="fas fa-chart-line text-indigo-600"></i>
                Weekly Progress Trend
            </h3>
            <div className="h-80">
                {data.weeklyProgress && data.weeklyProgress.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.weeklyProgress}>
                            <XAxis dataKey="week" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="assignments" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="quizzes" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="overall" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        No progress data available yet
                    </div>
                )}
            </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                <i className="fas fa-clock text-indigo-600"></i>
                Recent Activities
            </h3>
            <div className="space-y-4">
                {activities && activities.length > 0 ? (
                    activities.map((activity, index) => (
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
                                        {activity.date ? activity.date.toLocaleDateString() : 'Recently'} • {activity.type}
                                    </p>
                                </div>
                            </div>
                            {activity.score && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${activity.score >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                                    activity.score >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                        'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                    {activity.score}%
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-file-alt text-3xl mb-3 text-gray-300"></i>
                        <p>No recent activities found</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const ProgressTab = ({ data }) => (
    <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                <i className="fas fa-chart-bar text-indigo-600"></i>
                Performance Trends
            </h3>
            <div className="h-80">
                {data.weeklyProgress && data.weeklyProgress.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.weeklyProgress}>
                            <XAxis dataKey="week" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="assignments" fill="#10B981" name="Assignments" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="quizzes" fill="#8B5CF6" name="Quizzes" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        No progress data available yet
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                    <i className="fas fa-chart-pie text-indigo-600"></i>
                    Course Performance
                </h3>
                <div className="h-80">
                    {data.subjectPerformance && data.subjectPerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.subjectPerformance}
                                    dataKey="score"
                                    nameKey="subject"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ subject, score }) => `${subject}: ${score}%`}
                                >
                                    {data.subjectPerformance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            No course performance data available
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                    <i className="fas fa-bullseye text-indigo-600"></i>
                    Improvement Areas
                </h3>
                <div className="space-y-4">
                    {data.subjectPerformance && data.subjectPerformance
                        .filter(subject => subject.score < 70)
                        .map((subject, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-800 truncate flex-1 mr-4">{subject.subject}</span>
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${subject.score}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-600 ml-3 w-10 text-right">{subject.score}%</span>
                            </div>
                        ))
                    }
                    {(!data.subjectPerformance || data.subjectPerformance.filter(s => s.score < 70).length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fas fa-check-circle text-3xl mb-3 text-green-300"></i>
                            <p>No major improvement areas identified</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const FeedbackTab = ({ remarks, courses }) => (
    <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                <i className="fas fa-comments text-indigo-600"></i>
                Tutor Feedback & Remarks
            </h3>

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
                                </div>
                                <div className="text-sm text-gray-500">
                                    {remark.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                                </div>
                            </div>

                            <p className="text-gray-700 text-base mb-4 leading-relaxed">{remark.remarkText}</p>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-200 gap-2">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                    <i className="fas fa-chart-pie text-indigo-600"></i>
                    Feedback Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="text-3xl font-bold text-blue-600">
                            {remarks.filter(r => r.category === 'strength').length}
                        </div>
                        <div className="text-sm text-blue-600 font-medium">Strengths</div>
                    </div>
                    <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                        <div className="text-3xl font-bold text-yellow-600">
                            {remarks.filter(r => r.category === 'improvement').length}
                        </div>
                        <div className="text-sm text-yellow-600 font-medium">Areas to Improve</div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                        <div className="text-3xl font-bold text-green-600">
                            {remarks.filter(r => r.isImportant).length}
                        </div>
                        <div className="text-sm text-green-600 font-medium">Important Notes</div>
                    </div>
                </div>
            </div>
        )}
    </div>
);

// Updated ReportsTab with Gemini AI integration
const ReportsTab = ({ data, onGenerateReport, reportLoading, generatedReport, onDownloadReport }) => (
    <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-6 text-lg flex items-center gap-2">
                <i className="fas fa-file-alt text-indigo-600"></i>
                AI Performance Reports
            </h3>

            {/* Report Generation Section */}
            <div className="mb-8">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200 mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <i className="fas fa-robot text-indigo-600"></i>
                        Generate AI Performance Report
                    </h4>
                    <p className="text-gray-600 mb-4 text-sm">
                        Get a comprehensive analysis of your performance with personalized insights and recommendations
                        generated by AI based on your learning data.
                    </p>
                    <button
                        onClick={onGenerateReport}
                        disabled={reportLoading}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        {reportLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-magic"></i>
                                Generate AI Report
                            </>
                        )}
                    </button>
                </div>

                {/* Generated Report Display */}
                {generatedReport && (
                    <div className="mt-8 p-6 bg-white border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-800 text-lg">Generated Performance Report</h4>
                            <button
                                onClick={onDownloadReport}
                                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <i className="fas fa-download"></i>
                                Download PDF
                            </button>
                        </div>
                        <div className="prose max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                {generatedReport}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Performance Summary */}
            <div className="border-t pt-8">
                <h4 className="font-semibold text-gray-800 mb-6 text-lg">Performance Summary</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{data.overallScore || 0}%</div>
                        <div className="text-sm text-blue-600 font-medium">Overall Score</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{data.totalAssignments || 0}</div>
                        <div className="text-sm text-green-600 font-medium">Assignments</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">{data.totalQuizzes || 0}</div>
                        <div className="text-sm text-purple-600 font-medium">Quizzes</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">{data.completedCourses || 0}</div>
                        <div className="text-sm text-orange-600 font-medium">Courses Completed</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const AIFeedback = ({ overallScore, assignmentsCount, quizzesCount }) => {
    const getFeedback = () => {
        if (overallScore >= 90) {
            return "Excellent work! You're demonstrating mastery across all topics. Consider taking on more challenging assignments to further enhance your skills.";
        } else if (overallScore >= 75) {
            return "Great progress! You're performing well overall. Focus on your weaker areas to reach the next level of proficiency.";
        } else if (overallScore >= 60) {
            return "Good foundation. You're on the right track. Regular practice in areas where you're struggling will help improve your scores.";
        } else {
            return "Let's focus on building strong fundamentals. Start with basic concepts and practice regularly to build your confidence and skills.";
        }
    };

    const getActivityLevel = () => {
        const totalActivities = assignmentsCount + quizzesCount;
        if (totalActivities >= 20) return "Very Active";
        if (totalActivities >= 10) return "Active";
        if (totalActivities >= 5) return "Moderate";
        return "Getting Started";
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-robot text-indigo-600"></i>
                AI Personalized Feedback
            </h3>
            <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 leading-relaxed">{getFeedback()}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-600">Learning Activity Level:</span>
                        <span className="font-semibold text-indigo-600">{getActivityLevel()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Activities:</span>
                        <span className="font-semibold text-gray-800">{assignmentsCount + quizzesCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalysis;