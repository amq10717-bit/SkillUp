import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ClockIcon, QuestionMarkCircleIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import HeroSection from '../Hero Section/HeroSection';
import { Link } from 'react-router-dom';

function QuizDetail() {
    const { id } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('instructions');
    const [hasAttempted, setHasAttempted] = useState(false);
    const [previousAttempt, setPreviousAttempt] = useState(null);

    useEffect(() => {
        const fetchQuizAndAttempts = async () => {
            try {
                setLoading(true);
                console.log('Fetching quiz with ID:', id);

                const quizDoc = await getDoc(doc(db, 'quizzes', id));

                if (quizDoc.exists()) {
                    const quizData = quizDoc.data();
                    console.log('Quiz found:', quizData);
                    setQuiz({
                        id: quizDoc.id,
                        ...quizData
                    });

                    // Check if current user has attempted this quiz
                    const user = auth.currentUser;
                    if (user) {
                        const attemptsQuery = query(
                            collection(db, 'quizAttempts'),
                            where('studentId', '==', user.uid),
                            where('quizId', '==', id)
                        );
                        const attemptsSnapshot = await getDocs(attemptsQuery);

                        if (!attemptsSnapshot.empty) {
                            setHasAttempted(true);
                            const latestAttempt = attemptsSnapshot.docs[0].data();
                            setPreviousAttempt(latestAttempt);
                            console.log('Previous attempt found:', latestAttempt);
                        }
                    }
                } else {
                    console.log('No quiz found with ID:', id);
                    setQuiz(null);
                }
            } catch (error) {
                console.error('Error fetching quiz:', error);
                setQuiz(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchQuizAndAttempts();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading quiz...</div>
                </div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">Quiz not found.</div>
                    <p className="text-gray-600 mb-4">
                        The quiz you're looking for doesn't exist or has been removed.
                    </p>
                    <div className="text-sm text-gray-500 mb-4">
                        <p>URL ID: {id}</p>
                    </div>
                    <Link to="/student-dashboard" className="btn-primary mt-4 inline-block">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Safe data extraction with fallbacks
    const quizTitle = quiz.QuizTitle || quiz.quizTitle || 'Untitled Quiz';
    const quizDescription = quiz.QuizDescription || quiz.quizDescription || 'No description available';
    const difficulty = quiz.difficulty || 'Intermediate';
    const totalPoints = quiz.totalPoints || 100;
    const questionsCount = quiz.questionsCount || (quiz.questions && quiz.questions.length) || 0;
    const timeLimit = quiz.timeLimit || 30;
    const attemptsAllowed = quiz.attemptsAllowed || 1;
    const passingScore = quiz.passingScore || 75;
    const timePerQuestion = quiz.timePerQuestion || 90;
    const bestScore = previousAttempt?.score || quiz.bestScore || 0;

    // Calculate attempts left
    const attemptsUsed = hasAttempted ? 1 : 0;
    const attemptsLeft = Math.max(0, attemptsAllowed - attemptsUsed);

    // Safe array fallbacks
    const structure = quiz.structure || [
        'Multiple Choice Questions',
        'No negative marking'
    ];

    const scoringPolicy = quiz.scoringPolicy || [
        { category: 'Correct Answer', value: '+1 point' },
        { category: 'Wrong Answer', value: '0 points' }
    ];

    const attempts = quiz.attempts || [];
    const sampleQuestion = quiz.sampleQuestion || {
        text: 'Sample question not available',
        options: ['Option A', 'Option B', 'Option C', 'Option D']
    };

    const getDifficultyColor = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <HeroSection
                title={quizTitle}
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: 'Quiz' },
                ]}
            />
            <div className="my-10 lg:mt-30 lg:mb-30 font-poppins">
                <div className='flex flex-col lg:grid lg:grid-cols-[65%_35%] max-w-6xl mx-auto px-[15px] lg:px-0 gap-8 lg:gap-0'>

                    {/* Sidebar (Stacked on mobile) */}
                    <div className='order-2 lg:order-2 z-1 w-full'>
                        <div className='shadow-lg rounded-sm p-4 lg:p-5 bg-white static lg:sticky lg:top-20 pb-6 lg:pb-10'>
                            <div className='flex flex-col gap-4'>
                                <div className='flex justify-between items-center mb-4'>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                                        {difficulty}
                                    </span>
                                    <p className='text-gray-500 text-sm flex items-center'>
                                        <TrophyIcon className='w-4 h-4 mr-1' />
                                        {totalPoints} Points
                                    </p>
                                </div>

                                <div className='space-y-4 border rounded-lg p-4 bg-purple-50'>
                                    <div className='flex items-center justify-between text-sm lg:text-base'>
                                        <span className='font-medium'>Questions</span>
                                        <span className='text-purple-600 font-bold'>{questionsCount}</span>
                                    </div>
                                    <div className='flex items-center justify-between text-sm lg:text-base'>
                                        <span className='font-medium'>Time Limit</span>
                                        <span className='text-gray-600'>{timeLimit} mins</span>
                                    </div>
                                    <div className='flex items-center justify-between text-sm lg:text-base'>
                                        <span className='font-medium'>Attempts</span>
                                        <span className='text-gray-600'>{attemptsLeft} remaining</span>
                                    </div>
                                </div>

                                <div className='mt-6'>
                                    <h3 className='font-semibold mb-3 text-sm lg:text-base'>Your Progress</h3>
                                    <div className='space-y-2 text-sm lg:text-base'>
                                        <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                                            <span>Best Score</span>
                                            <span className='font-medium text-purple-600'>{bestScore}%</span>
                                        </div>
                                        <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                                            <span>Status</span>
                                            <span className={`font-medium ${hasAttempted ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {hasAttempted ? 'Completed' : 'Not Attempted'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {hasAttempted ? (
                                    <>
                                        <Link
                                            to={`/quiz/${id}/results`}
                                            className='btn-primary w-full py-3 text-sm mt-6 bg-blue-600 hover:bg-blue-700 text-center block rounded-lg active:scale-95 transition-transform'
                                        >
                                            View Your Results
                                        </Link>
                                        <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
                                            <div className='flex items-center text-sm text-green-800'>
                                                <TrophyIcon className='w-4 h-4 mr-2 flex-shrink-0' />
                                                <span>You have already completed this quiz</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to={`/quiz/${id}/start`}
                                            className='btn-primary w-full py-3 text-sm mt-6 bg-purple-600 hover:bg-purple-700 text-center block rounded-lg active:scale-95 transition-transform'
                                        >
                                            Start Quiz Now
                                        </Link>
                                        <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                                            <div className='flex items-center text-sm text-yellow-800'>
                                                <ClockIcon className='w-4 h-4 mr-2 flex-shrink-0' />
                                                <span>You have {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className='order-1 w-full lg:pr-5'>
                        <div className='bg-white rounded-xl lg:rounded-2xl pb-6 lg:pb-10 px-4 lg:px-10 shadow-lg lg:shadow-2xl'>
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <h1 className='font-poppins text-2xl lg:text-4xl font-extrabold mb-5 break-words'>{quizTitle}</h1>

                                <div className='mb-8'>
                                    <h2 className='text-xl lg:text-2xl font-semibold mb-3'>Quiz Overview</h2>
                                    <p className='text-gray-600 leading-relaxed text-sm lg:text-base'>{quizDescription}</p>
                                </div>

                                {hasAttempted && previousAttempt && (
                                    <div className='mb-8 bg-green-50 p-4 lg:p-6 rounded-xl border border-green-200'>
                                        <h2 className='text-xl lg:text-2xl font-semibold mb-3 text-green-800 flex items-center gap-2'>
                                            <span>🎯</span> Your Previous Attempt
                                        </h2>
                                        <div className='grid grid-cols-3 gap-2 lg:gap-4'>
                                            <div className='text-center'>
                                                <div className='text-2xl lg:text-3xl font-bold text-green-600'>{previousAttempt.score}%</div>
                                                <div className='text-xs lg:text-sm text-green-700'>Score</div>
                                            </div>
                                            <div className='text-center'>
                                                <div className='text-2xl lg:text-3xl font-bold text-blue-600'>
                                                    {previousAttempt.correctAnswers}/{previousAttempt.totalQuestions}
                                                </div>
                                                <div className='text-xs lg:text-sm text-blue-700'>Correct Answers</div>
                                            </div>
                                            <div className='text-center'>
                                                <div className='text-2xl lg:text-3xl font-bold text-purple-600'>
                                                    {previousAttempt.timeSpent?.toFixed(1) || 'N/A'} min
                                                </div>
                                                <div className='text-xs lg:text-sm text-purple-700'>Time Spent</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className='mb-8 bg-blue-50 p-4 lg:p-6 rounded-xl'>
                                    <h2 className='text-xl lg:text-2xl font-semibold mb-3'>📌 Quick Facts</h2>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <div className='flex items-center text-sm lg:text-base'>
                                            <ChartBarIcon className='w-5 h-5 mr-2 text-blue-600 flex-shrink-0' />
                                            <span>Passing Score: {passingScore}%</span>
                                        </div>
                                        <div className='flex items-center text-sm lg:text-base'>
                                            <ClockIcon className='w-5 h-5 mr-2 text-blue-600 flex-shrink-0' />
                                            <span>Time Per Question: {timePerQuestion}s</span>
                                        </div>
                                    </div>
                                </div>

                                <div className='mt-10'>
                                    <div className='flex gap-0 mb-6 lg:mb-10 border-b overflow-x-auto no-scrollbar'>
                                        <button
                                            onClick={() => setActiveTab('instructions')}
                                            className={`text-base lg:text-xl font-semibold px-4 py-2 whitespace-nowrap ${activeTab === 'instructions'
                                                ? 'border-b-2 border-purple-600 text-black'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Instructions
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('attempts')}
                                            className={`text-base lg:text-xl font-semibold px-4 py-2 whitespace-nowrap ${activeTab === 'attempts'
                                                ? 'border-b-2 border-purple-600 text-black'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Previous Attempts ({attempts.length})
                                        </button>
                                    </div>

                                    {activeTab === 'instructions' && (
                                        <div className='prose max-w-none'>
                                            <h3 className='text-lg lg:text-xl font-semibold mb-3'>📝 Quiz Structure</h3>
                                            <ul className='list-disc pl-6 space-y-2 text-sm lg:text-base'>
                                                {structure.map((item, index) => (
                                                    <li key={index} className='text-gray-600'>{item}</li>
                                                ))}
                                            </ul>

                                            <h3 className='text-lg lg:text-xl font-semibold mt-6 mb-3'>🎯 Scoring Policy</h3>
                                            <div className='space-y-3 text-sm lg:text-base'>
                                                {scoringPolicy.map((policy, index) => (
                                                    <div key={index} className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                                                        <span>{policy.category}</span>
                                                        <span className='font-medium'>{policy.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'attempts' && (
                                        <div className='space-y-4'>
                                            {attempts.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <TrophyIcon className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-base lg:text-lg">No previous attempts yet</p>
                                                    <p className="text-sm">Complete the quiz to see your results here</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {attempts.map((attempt, index) => (
                                                        <div key={index} className='p-4 border rounded-lg hover:bg-gray-50 transition-colors'>
                                                            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0'>
                                                                <div className='flex items-center gap-3'>
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${attempt.score >= 80 ? 'bg-green-100 text-green-600' :
                                                                        attempt.score >= 60 ? 'bg-yellow-100 text-yellow-600' :
                                                                            'bg-red-100 text-red-600'
                                                                        }`}>
                                                                        <TrophyIcon className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <span className='font-medium text-sm lg:text-base'>Attempt #{index + 1}</span>
                                                                        // In the QuizDetail component, update the date display:
                                                                        <p className="text-xs text-gray-500">
                                                                            {attempt.date?.toDate ? attempt.date.toDate().toLocaleDateString() :
                                                                                attempt.date instanceof Date ? attempt.date.toLocaleDateString() :
                                                                                    new Date(attempt.timestamp || attempt.date).toLocaleDateString() || 'Unknown date'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-left sm:text-right w-full sm:w-auto pl-13 sm:pl-0">
                                                                    <span className={`text-lg font-bold ${attempt.score >= passingScore ? 'text-green-600' : 'text-red-600'
                                                                        }`}>
                                                                        {attempt.score}%
                                                                    </span>
                                                                    <p className="text-xs text-gray-500">
                                                                        {attempt.score >= passingScore ? 'Passed' : 'Failed'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className='flex justify-between text-sm text-gray-500 mb-3 pl-13 sm:pl-0'>
                                                                <span>Time: {attempt.timeSpent ? `${attempt.timeSpent.toFixed(1)}m` : 'N/A'}</span>
                                                                <span>Score: {attempt.score}%</span>
                                                            </div>
                                                            <div className="flex gap-2 pl-0 sm:pl-13">
                                                                <Link
                                                                    to={`/quiz/${id}/results/${attempt.attemptId}`}
                                                                    className="w-full sm:w-auto text-center bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700 transition-colors"
                                                                >
                                                                    View Detailed Results
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className='mt-10 bg-green-50 p-4 lg:p-6 rounded-xl'>
                                    <h3 className='text-lg lg:text-xl font-semibold mb-4'>🔍 Sample Question</h3>
                                    <div className='space-y-4'>
                                        <p className='font-medium text-sm lg:text-base'>{sampleQuestion.text}</p>
                                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4'>
                                            {sampleQuestion.options.map((option, index) => (
                                                <div key={index} className='p-3 border rounded hover:bg-white transition-colors text-sm lg:text-base bg-white/50'>
                                                    {option}
                                                </div>
                                            ))}
                                        </div>
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

export default QuizDetail;