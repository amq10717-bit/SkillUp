import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase.js';
import { askCourseAssistant, reviewStudentCode } from '../../services/geminiService.js';
import { useAuthState } from 'react-firebase-hooks/auth';

const StudentCourseView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user] = useAuthState(auth);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeModule, setActiveModule] = useState(0);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [aiAssistant, setAiAssistant] = useState({
        isOpen: false,
        question: '',
        answer: '',
        loading: false
    });
    const [codePractice, setCodePractice] = useState({
        isOpen: false,
        code: '',
        language: 'python',
        task: '',
        feedback: '',
        reviewing: false
    });

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setLoading(true);
                const courseDoc = await getDoc(doc(db, 'courses', id));

                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    setCourse({
                        id: courseDoc.id,
                        ...courseData
                    });

                    // Check if user is enrolled
                    if (user) {
                        const enrollmentQuery = query(
                            collection(db, 'enrollments'),
                            where('courseId', '==', id),
                            where('studentId', '==', user.uid)
                        );
                        const enrollmentSnapshot = await getDocs(enrollmentQuery);
                        setIsEnrolled(!enrollmentSnapshot.empty);
                    }
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                alert('Failed to load course');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchCourse();
        }
    }, [id, user]);

    const handleEnroll = async () => {
        if (!user) {
            alert('Please log in to enroll in this course');
            navigate('/login-screen');
            return;
        }

        setEnrolling(true);
        try {
            const enrollmentId = `${user.uid}_${id}`;
            await addDoc(collection(db, 'enrollments'), {
                courseId: id,
                studentId: user.uid,
                tutorId: course.tutorId,
                enrolledAt: serverTimestamp(),
                courseTitle: course.title,
                studentName: user.displayName || user.email,
                tutorName: course.tutorName,
                progress: 0,
                currentModule: 0
            });

            // Update course enrolled count
            await addDoc(collection(db, 'course_analytics'), {
                courseId: id,
                studentId: user.uid,
                action: 'enrolled',
                timestamp: serverTimestamp()
            });

            setIsEnrolled(true);
            alert('Successfully enrolled in the course!');
        } catch (error) {
            console.error('Error enrolling in course:', error);
            alert('Failed to enroll: ' + error.message);
        } finally {
            setEnrolling(false);
        }
    };

    const askAIQuestion = async () => {
        if (!aiAssistant.question.trim()) return;

        setAiAssistant(prev => ({ ...prev, loading: true, answer: '' }));
        try {
            const currentModule = course.modules[activeModule];
            const answer = await askCourseAssistant(
                aiAssistant.question,
                currentModule.content,
                `Course: ${course.title}\nModule: ${currentModule.title}\nDifficulty: ${course.difficulty}`
            );

            setAiAssistant(prev => ({
                ...prev,
                answer,
                loading: false
            }));

            // Save question to history
            if (user && isEnrolled) {
                await addDoc(collection(db, 'learning_analytics'), {
                    courseId: id,
                    studentId: user.uid,
                    moduleIndex: activeModule,
                    question: aiAssistant.question,
                    answer: answer,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error asking AI question:', error);
            setAiAssistant(prev => ({
                ...prev,
                answer: 'Sorry, I encountered an error. Please try again.',
                loading: false
            }));
        }
    };

    const getCodeReview = async () => {
        if (!codePractice.code.trim()) return;

        setCodePractice(prev => ({ ...prev, reviewing: true, feedback: '' }));
        try {
            const feedback = await reviewStudentCode(
                codePractice.code,
                codePractice.language,
                codePractice.task || 'Practice exercise for current module',
                'Student practice code'
            );

            setCodePractice(prev => ({
                ...prev,
                feedback,
                reviewing: false
            }));

            // Save code practice session
            if (user && isEnrolled) {
                await addDoc(collection(db, 'code_practice_sessions'), {
                    courseId: id,
                    studentId: user.uid,
                    moduleIndex: activeModule,
                    language: codePractice.language,
                    code: codePractice.code,
                    feedback: feedback,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error getting code review:', error);
            setCodePractice(prev => ({
                ...prev,
                feedback: 'Sorry, I encountered an error reviewing your code. Please try again.',
                reviewing: false
            }));
        }
    };

    const generatePracticeTask = () => {
        const currentModule = course.modules[activeModule];
        const tasks = {
            python: `# Practice Exercise for: ${currentModule.title}
# Write a Python function that demonstrates the concepts from this module
# Example: Create a function that solves a problem related to ${currentModule.title}

def practice_exercise():
    # Your code here
    pass

# Test your function here
if __name__ == "__main__":
    result = practice_exercise()
    print("Result:", result)`,
            javascript: `// Practice Exercise for: ${currentModule.title}
// Write a JavaScript function that demonstrates the concepts from this module

function practiceExercise() {
    // Your code here
}

// Test your function here
console.log(practiceExercise());`,
            java: `// Practice Exercise for: ${currentModule.title}
// Write a Java method that demonstrates the concepts from this module

public class Practice {
    public static void practiceExercise() {
        // Your code here
    }
    
    public static void main(String[] args) {
        practiceExercise();
    }
}`
        };

        setCodePractice(prev => ({
            ...prev,
            task: `Create a ${codePractice.language} program that demonstrates concepts from: ${currentModule.title}`,
            code: tasks[codePractice.language] || tasks.python
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-[#6c5dd3] mb-4"></i>
                    <p className="text-gray-600">Loading course...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 mt-20 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 text-lg">Course not found</p>
                    <button
                        onClick={() => navigate('/courses-page')}
                        className="mt-4 bg-[#6c5dd3] text-white px-6 py-2 rounded-lg"
                    >
                        Browse Courses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-10">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-6 text-white">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                            <div className="flex-1">
                                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{course.title}</h1>
                                <p className="text-blue-100 text-lg">{course.description}</p>
                                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-user-tie"></i>
                                        By {course.tutorName}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-users"></i>
                                        {course.enrolledCount || 0} students
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-star"></i>
                                        {course.rating || 0} rating
                                    </span>
                                </div>
                            </div>

                            {!isEnrolled && (
                                <div className="mt-4 lg:mt-0">
                                    <button
                                        onClick={handleEnroll}
                                        disabled={enrolling}
                                        className="bg-white text-[#6c5dd3] px-6 py-3 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition font-semibold text-lg"
                                    >
                                        {enrolling ? (
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                        ) : (
                                            <i className="fas fa-rocket mr-2"></i>
                                        )}
                                        Enroll Now
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar - Modules Navigation */}
                    <div className="lg:w-1/4">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                            <h3 className="text-lg font-semibold mb-4">Course Modules</h3>
                            <div className="space-y-2">
                                {course.modules && course.modules.map((module, index) => (
                                    <button
                                        key={module.id}
                                        onClick={() => setActiveModule(index)}
                                        className={`w-full text-left p-3 rounded-lg transition ${activeModule === index
                                            ? 'bg-[#6c5dd3] text-white'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeModule === index
                                                ? 'bg-white text-[#6c5dd3]'
                                                : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <span className="font-medium text-sm">{module.title}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* AI Assistant Quick Access */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">AI Learning Assistant</h4>
                                <p className="text-blue-700 text-sm mb-3">
                                    Get help with any concept from this course
                                </p>
                                <button
                                    onClick={() => setAiAssistant(prev => ({ ...prev, isOpen: true }))}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-robot"></i>
                                    Ask AI Assistant
                                </button>
                            </div>

                            {/* Code Practice Quick Access */}
                            <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">Practice Coding</h4>
                                <p className="text-green-700 text-sm mb-3">
                                    Practice with AI code review
                                </p>
                                <button
                                    onClick={() => {
                                        setCodePractice(prev => ({ ...prev, isOpen: true }));
                                        generatePracticeTask();
                                    }}
                                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-code"></i>
                                    Open Code Practice
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:w-3/4">

                        {/* Video Player Section - Added */}
                        {course.promotionalVideo && (
                            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <i className="fas fa-video text-[#6c5dd3] text-xl"></i>
                                    <h3 className="text-xl font-bold text-gray-800">Course Intro Video</h3>
                                </div>
                                <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video">
                                    <video
                                        controls
                                        className="w-full h-full object-contain"
                                        src={course.promotionalVideo}
                                        poster={course.thumbnail}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            {course.modules && course.modules.length > 0 && (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
                                                {course.modules[activeModule].title}
                                            </h2>
                                            <p className="text-gray-600">
                                                Module {activeModule + 1} of {course.modules.length}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setActiveModule(prev => Math.max(0, prev - 1))}
                                                disabled={activeModule === 0}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                                            >
                                                <i className="fas fa-arrow-left mr-2"></i>
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setActiveModule(prev => Math.min(course.modules.length - 1, prev + 1))}
                                                disabled={activeModule === course.modules.length - 1}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                                            >
                                                Next
                                                <i className="fas fa-arrow-right ml-2"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="prose max-w-none">
                                        <div
                                            className="module-content"
                                            dangerouslySetInnerHTML={{
                                                __html: course.modules[activeModule].content?.replace(/\n/g, '<br>') || 'No content available for this module.'
                                            }}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t">
                                        <button
                                            onClick={() => setAiAssistant(prev => ({ ...prev, isOpen: true }))}
                                            className="bg-[#6c5dd3] text-white px-6 py-3 rounded-lg hover:bg-[#5a4bbf] transition flex items-center gap-2"
                                        >
                                            <i className="fas fa-robot"></i>
                                            Ask AI About This Module
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCodePractice(prev => ({ ...prev, isOpen: true }));
                                                generatePracticeTask();
                                            }}
                                            className="bg-[#4CBC9A] text-white px-6 py-3 rounded-lg hover:bg-[#3aa384] transition flex items-center gap-2"
                                        >
                                            <i className="fas fa-code"></i>
                                            Practice Coding
                                        </button>
                                        <button
                                            onClick={() => navigate('/ide')}
                                            className="bg-[#FEC64F] text-white px-6 py-3 rounded-lg hover:bg-amber-500 transition flex items-center gap-2"
                                        >
                                            <i className="fas fa-laptop-code"></i>
                                            Open Full IDE
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Assistant Modal */}
            {aiAssistant.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <i className="fas fa-robot text-[#6c5dd3]"></i>
                                    AI Learning Assistant
                                </h3>
                                <button
                                    onClick={() => setAiAssistant({ isOpen: false, question: '', answer: '', loading: false })}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            <p className="text-gray-600 mt-1">
                                Ask questions about: {course.modules[activeModule].title}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {aiAssistant.answer && (
                                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <i className="fas fa-robot text-blue-600 mt-1"></i>
                                        <div className="flex-1">
                                            <p className="text-blue-800 whitespace-pre-wrap">{aiAssistant.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {aiAssistant.loading && (
                                <div className="flex items-center justify-center py-4">
                                    <i className="fas fa-spinner fa-spin text-2xl text-[#6c5dd3] mr-3"></i>
                                    <span className="text-gray-600">AI is thinking...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={aiAssistant.question}
                                    onChange={(e) => setAiAssistant(prev => ({ ...prev, question: e.target.value }))}
                                    placeholder="Ask a question about this module..."
                                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6c5dd3]"
                                    onKeyPress={(e) => e.key === 'Enter' && askAIQuestion()}
                                />
                                <button
                                    onClick={askAIQuestion}
                                    disabled={aiAssistant.loading || !aiAssistant.question.trim()}
                                    className="bg-[#6c5dd3] text-white px-6 py-3 rounded-lg hover:bg-[#5a4bbf] disabled:opacity-50 transition"
                                >
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Code Practice Modal */}
            {codePractice.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <i className="fas fa-code text-[#4CBC9A]"></i>
                                    Code Practice with AI Review
                                </h3>
                                <button
                                    onClick={() => setCodePractice({ isOpen: false, code: '', language: 'python', task: '', feedback: '', reviewing: false })}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            <p className="text-gray-600 mt-1">
                                {codePractice.task}
                            </p>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Code Editor */}
                            <div className="lg:w-1/2 border-r p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-medium text-gray-700">Programming Language</label>
                                    <select
                                        value={codePractice.language}
                                        onChange={(e) => {
                                            setCodePractice(prev => ({ ...prev, language: e.target.value }));
                                            generatePracticeTask();
                                        }}
                                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                    </select>
                                </div>
                                <textarea
                                    value={codePractice.code}
                                    onChange={(e) => setCodePractice(prev => ({ ...prev, code: e.target.value }))}
                                    rows="15"
                                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#4CBC9A] resize-none"
                                    placeholder="Write your code here..."
                                />
                                <button
                                    onClick={getCodeReview}
                                    disabled={codePractice.reviewing || !codePractice.code.trim()}
                                    className="w-full bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 transition mt-3 flex items-center justify-center gap-2"
                                >
                                    {codePractice.reviewing ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        <i className="fas fa-robot"></i>
                                    )}
                                    Get AI Code Review
                                </button>
                            </div>

                            {/* AI Feedback */}
                            <div className="lg:w-1/2 p-4 overflow-y-auto">
                                <h4 className="font-semibold text-gray-800 mb-3">AI Code Review</h4>
                                {codePractice.feedback ? (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="prose max-w-none">
                                            <p className="text-gray-800 whitespace-pre-wrap">{codePractice.feedback}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <i className="fas fa-code text-3xl mb-3"></i>
                                        <p>Write some code and get AI feedback</p>
                                        <p className="text-sm">The AI will review your code and provide suggestions for improvement</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCourseView;