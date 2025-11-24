import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ClockIcon, CheckCircleIcon, XCircleIcon, TrophyIcon, HomeIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import HeroSection from '../Hero Section/HeroSection';

function QuizResults() {
    const { id, attemptId } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const fetchQuizAndAttempt = async () => {
            try {
                setLoading(true);

                // Fetch quiz data
                const quizDoc = await getDoc(doc(db, 'quizzes', id));
                if (!quizDoc.exists()) {
                    console.error('Quiz not found');
                    setQuiz(null);
                    return;
                }

                const quizData = quizDoc.data();
                setQuiz({
                    id: quizDoc.id,
                    ...quizData
                });

                // Fetch attempt data
                let attemptData;
                if (attemptId) {
                    // If specific attempt ID provided, fetch that attempt
                    const attemptQuery = query(
                        collection(db, 'quizAttempts'),
                        where('quizId', '==', id),
                        where('studentId', '==', auth.currentUser.uid)
                    );
                    const attemptsSnapshot = await getDocs(attemptQuery);

                    if (!attemptsSnapshot.empty) {
                        // Find the specific attempt or get the latest
                        const attempts = attemptsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        if (attemptId === 'latest') {
                            attemptData = attempts[0]; // Latest attempt
                        } else {
                            attemptData = attempts.find(a => a.id === attemptId) || attempts[0];
                        }
                        setAttempt(attemptData);
                    }
                } else {
                    // If no attempt ID, fetch the latest attempt
                    const attemptQuery = query(
                        collection(db, 'quizAttempts'),
                        where('quizId', '==', id),
                        where('studentId', '==', auth.currentUser.uid)
                    );
                    const attemptsSnapshot = await getDocs(attemptQuery);

                    if (!attemptsSnapshot.empty) {
                        const latestAttempt = attemptsSnapshot.docs[0].data();
                        setAttempt({
                            id: attemptsSnapshot.docs[0].id,
                            ...latestAttempt
                        });
                    }
                }

            } catch (error) {
                console.error('Error fetching quiz results:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id && auth.currentUser) {
            fetchQuizAndAttempt();
        }
    }, [id, attemptId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading results...</div>
                </div>
            </div>
        );
    }

    if (!quiz || !attempt) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl text-red-600 mb-4">Results Not Found</h2>
                    <p className="text-gray-600 mb-4">
                        No quiz results found for this attempt.
                    </p>
                    <button
                        onClick={() => navigate('/student-dashboard')}
                        className="btn-primary py-2 px-6"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const quizTitle = quiz.QuizTitle || quiz.quizTitle || 'Untitled Quiz';
    const questions = quiz.questions || [];
    const totalPoints = quiz.totalPoints || questions.reduce((sum, q) => sum + (q.points || 1), 0);

    // Helper functions to extract question data
    const getQuestionText = (question) => {
        if (!question) return 'Question not available';
        return question.text || question.question || question.questionText || question.title || 'Question';
    };

    const getQuestionOptions = (question) => {
        if (!question) return ['Option A', 'Option B', 'Option C', 'Option D'];
        return question.options || question.choices || question.answers || ['Option A', 'Option B', 'Option C', 'Option D'];
    };

    return (
        <div>
            <HeroSection
                title="Quiz Results"
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: 'Quiz', path: `/quiz/${id}` },
                    { label: 'Results' },
                ]}
            />

            <div className="my-10 lg:mt-30 lg:mb-30 font-poppins">
                <div className="max-w-6xl mx-auto px-[15px] lg:px-4">
                    {/* Results Summary */}
                    <div className="bg-white rounded-2xl shadow-2xl p-4 lg:p-8 mb-6 lg:mb-8">
                        <div className="text-center mb-6 lg:mb-8">
                            <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-4 break-words">{quizTitle}</h1>
                            <p className="text-lg lg:text-xl text-gray-600">Your Quiz Results</p>
                        </div>

                        {/* Score Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 lg:p-6 rounded-xl border border-green-200 text-center">
                                <TrophyIcon className="w-10 h-10 lg:w-12 lg:h-12 text-green-600 mx-auto mb-3 lg:mb-4" />
                                <div className="text-2xl lg:text-3xl font-bold text-green-700">{attempt.score}%</div>
                                <div className="text-green-800 font-medium text-sm lg:text-base">Overall Score</div>
                                <div className="text-xs lg:text-sm text-green-600 mt-1 lg:mt-2">
                                    {attempt.score >= 80 ? 'Excellent! 🎉' :
                                        attempt.score >= 60 ? 'Good job! 👍' :
                                            'Keep practicing! 💪'}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 lg:p-6 rounded-xl border border-blue-200 text-center">
                                <CheckCircleIcon className="w-10 h-10 lg:w-12 lg:h-12 text-blue-600 mx-auto mb-3 lg:mb-4" />
                                <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                                    {attempt.correctAnswers}/{attempt.totalQuestions}
                                </div>
                                <div className="text-blue-800 font-medium text-sm lg:text-base">Correct Answers</div>
                                <div className="text-xs lg:text-sm text-blue-600 mt-1 lg:mt-2">
                                    {Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)}% accuracy
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 lg:p-6 rounded-xl border border-purple-200 text-center">
                                <ClockIcon className="w-10 h-10 lg:w-12 lg:h-12 text-purple-600 mx-auto mb-3 lg:mb-4" />
                                <div className="text-2xl lg:text-3xl font-bold text-purple-700">
                                    {attempt.timeSpent ? attempt.timeSpent.toFixed(1) : 'N/A'} min
                                </div>
                                <div className="text-purple-800 font-medium text-sm lg:text-base">Time Spent</div>
                                <div className="text-xs lg:text-sm text-purple-600 mt-1 lg:mt-2">
                                    Completed on {attempt.completedAt?.toDate ? attempt.completedAt.toDate().toLocaleDateString() :
                                        attempt.date instanceof Date ? attempt.date.toLocaleDateString() :
                                            new Date(attempt.timestamp || attempt.date).toLocaleDateString() || 'Unknown date'}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6 lg:mb-8">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Performance</span>
                                <span className="text-sm font-medium text-gray-700">{attempt.score}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full ${attempt.score >= 80 ? 'bg-green-500' :
                                        attempt.score >= 60 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}
                                    style={{ width: `${attempt.score}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4 justify-center">
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="btn-primary bg-purple-600 hover:bg-purple-700 py-3 px-6 text-sm lg:text-base w-full sm:w-auto text-center rounded-lg"
                            >
                                {showDetails ? 'Hide Details' : 'Show Question Details'}
                            </button>
                            <Link
                                to={`/student-dashboard`}
                                className="btn-secondary py-3 px-6 border border-gray-300 hover:bg-gray-50 text-sm lg:text-base w-full sm:w-auto text-center rounded-lg block sm:inline-block"
                            >
                                Back to Dashboard
                            </Link>

                        </div>
                    </div>

                    {/* Detailed Question Results */}
                    {showDetails && (
                        <div className="bg-white rounded-2xl shadow-2xl p-4 lg:p-8">
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 text-center">
                                Detailed Question Analysis
                            </h2>

                            <div className="space-y-6 lg:space-y-8">
                                {questions.map((question, qIndex) => {
                                    const questionText = getQuestionText(question);
                                    const questionOptions = getQuestionOptions(question);
                                    const correctAnswerIndex = question.correctAnswer;
                                    const userAnswer = attempt.answers?.[qIndex];
                                    const isCorrect = userAnswer === correctAnswerIndex;

                                    return (
                                        <div key={qIndex} className="border-b pb-6 lg:pb-8 last:border-b-0">
                                            <div className="flex items-start lg:items-center gap-3 mb-4">
                                                {isCorrect ? (
                                                    <CheckCircleIcon className="w-6 h-6 lg:w-7 lg:h-7 text-green-600 flex-shrink-0 mt-1 lg:mt-0" />
                                                ) : (
                                                    <XCircleIcon className="w-6 h-6 lg:w-7 lg:h-7 text-red-600 flex-shrink-0 mt-1 lg:mt-0" />
                                                )}
                                                <h3 className="text-lg lg:text-xl font-semibold flex-1">Question {qIndex + 1}</h3>
                                                <span className="text-xs lg:text-sm text-gray-500 ml-auto whitespace-nowrap">
                                                    {question.points || 1} point{question.points !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            <p className="text-base lg:text-lg mb-4 lg:mb-6 font-medium text-gray-800">{questionText}</p>

                                            <div className="grid grid-cols-1 gap-3">
                                                {questionOptions.map((option, oIndex) => (
                                                    <div
                                                        key={oIndex}
                                                        className={`p-3 lg:p-4 rounded-lg border-2 transition-all ${oIndex === correctAnswerIndex
                                                            ? 'border-green-500 bg-green-50 shadow-sm'
                                                            : userAnswer === oIndex
                                                                ? 'border-red-500 bg-red-50 shadow-sm'
                                                                : 'border-gray-200 bg-gray-50'
                                                            }`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                                            <span className={`font-medium text-sm lg:text-base ${oIndex === correctAnswerIndex ? 'text-green-800' :
                                                                userAnswer === oIndex ? 'text-red-800' : 'text-gray-700'
                                                                }`}>
                                                                {option}
                                                            </span>
                                                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                                                {oIndex === correctAnswerIndex && (
                                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs lg:text-sm font-medium whitespace-nowrap">
                                                                        ✓ Correct
                                                                    </span>
                                                                )}
                                                                {userAnswer === oIndex && oIndex !== correctAnswerIndex && (
                                                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs lg:text-sm font-medium whitespace-nowrap">
                                                                        ✗ Your Choice
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Explanation */}
                                            <div className={`mt-4 p-3 lg:p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                                }`}>
                                                <p className={`font-medium text-sm lg:text-base ${isCorrect ? 'text-green-800' : 'text-red-800'
                                                    }`}>
                                                    {isCorrect
                                                        ? '✅ You answered this question correctly!'
                                                        : '❌ Your answer was incorrect. The correct option is highlighted in green.'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Next Steps */}
                    <div className="bg-blue-50 rounded-2xl p-4 lg:p-6 mt-6 lg:mt-8 border border-blue-200">
                        <h3 className="text-lg lg:text-xl font-semibold text-blue-900 mb-3">What's Next?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm lg:text-base">1</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-800 text-sm lg:text-base">Review Your Performance</h4>
                                    <p className="text-blue-600 text-xs lg:text-sm">Check your performance analysis for detailed insights</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm lg:text-base">2</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-800 text-sm lg:text-base">Practice More</h4>
                                    <p className="text-blue-600 text-xs lg:text-sm">Take similar quizzes to improve your skills</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuizResults;