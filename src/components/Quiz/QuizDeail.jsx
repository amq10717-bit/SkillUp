import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ClockIcon, QuestionMarkCircleIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import HeroSection from '../Hero Section/HeroSection';
import { Link } from 'react-router-dom';

function QuizDetail() {
    const { id } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('instructions');

    useEffect(() => {
        const fetchQuiz = async () => {
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
            fetchQuiz();
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
    const questionsCount = quiz.questionsCount || quiz.questions?.length || 0;
    const timeLimit = quiz.timeLimit || 30;
    const attemptsLeft = quiz.attemptsLeft || 1;
    const passingScore = quiz.passingScore || 75;
    const timePerQuestion = quiz.timePerQuestion || 90;
    const bestScore = quiz.bestScore || 0;

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
            <div className="mt-30 mb-30 font-poppins">
                <div className='grid grid-cols-[65%_35%] max-w-6xl mx-auto'>

                    <div className='order-2 z-1'>
                        <div className='shadow-lg rounded-sm p-5 m-4 bg-white sticky top-20 pb-10'>
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
                                    <div className='flex items-center justify-between'>
                                        <span className='font-medium'>Questions</span>
                                        <span className='text-purple-600 font-bold'>{questionsCount}</span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='font-medium'>Time Limit</span>
                                        <span className='text-gray-600'>{timeLimit} mins</span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='font-medium'>Attempts</span>
                                        <span className='text-gray-600'>{attemptsLeft} remaining</span>
                                    </div>
                                </div>

                                <div className='mt-6'>
                                    <h3 className='font-semibold mb-3'>Your Progress</h3>
                                    <div className='space-y-2'>
                                        <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                                            <span>Best Score</span>
                                            <span className='font-medium text-purple-600'>{bestScore}/100</span>
                                        </div>
                                        <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                                            <span>Average Score</span>
                                            <span className='font-medium text-gray-600'>72/100</span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/quiz/${quiz.id}/start`}
                                    className='btn-primary w-full py-3 text-sm mt-6 bg-purple-600 hover:bg-purple-700 text-center block'
                                >
                                    Start Quiz Now
                                </Link>

                                <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                                    <div className='flex items-center text-sm text-yellow-800'>
                                        <ClockIcon className='w-4 h-4 mr-2' />
                                        <span>You have {attemptsLeft} attempts remaining</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='order-1 pr-5'>
                        <div className='bg-white rounded-2xl pb-10 px-10 shadow-2xl'>
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <h1 className='font-poppins text-4xl font-extrabold mb-5'>{quizTitle}</h1>

                                <div className='mb-8'>
                                    <h2 className='text-2xl font-semibold mb-3'>Quiz Overview</h2>
                                    <p className='text-gray-600 leading-relaxed'>{quizDescription}</p>
                                </div>

                                <div className='mb-8 bg-blue-50 p-6 rounded-xl'>
                                    <h2 className='text-2xl font-semibold mb-3'>📌 Quick Facts</h2>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='flex items-center'>
                                            <ChartBarIcon className='w-5 h-5 mr-2 text-blue-600' />
                                            <span>Passing Score: {passingScore}%</span>
                                        </div>
                                        <div className='flex items-center'>
                                            <ClockIcon className='w-5 h-5 mr-2 text-blue-600' />
                                            <span>Time Per Question: {timePerQuestion}s</span>
                                        </div>
                                    </div>
                                </div>

                                <div className='mt-10'>
                                    <div className='flex gap-0 mb-10 border-b'>
                                        <button
                                            onClick={() => setActiveTab('instructions')}
                                            className={`text-xl font-semibold px-4 py-2 ${activeTab === 'instructions'
                                                ? 'border-b-2 border-purple-600 text-black'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Instructions
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('attempts')}
                                            className={`text-xl font-semibold px-4 py-2 ${activeTab === 'attempts'
                                                ? 'border-b-2 border-purple-600 text-black'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Previous Attempts ({attempts.length})
                                        </button>
                                    </div>

                                    {activeTab === 'instructions' && (
                                        <div className='prose max-w-none'>
                                            <h3 className='text-xl font-semibold mb-3'>📝 Quiz Structure</h3>
                                            <ul className='list-disc pl-6 space-y-2'>
                                                {structure.map((item, index) => (
                                                    <li key={index} className='text-gray-600'>{item}</li>
                                                ))}
                                            </ul>

                                            <h3 className='text-xl font-semibold mt-6 mb-3'>🎯 Scoring Policy</h3>
                                            <div className='space-y-3'>
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
                                                    No previous attempts
                                                </div>
                                            ) : (
                                                attempts.map((attempt, index) => (
                                                    <div key={index} className='p-4 border rounded-lg hover:bg-gray-50'>
                                                        <div className='flex justify-between items-center mb-2'>
                                                            <div className='flex items-center'>
                                                                <span className='font-medium'>Attempt #{index + 1}</span>
                                                            </div>
                                                            <span className={`text-sm ${attempt.score >= passingScore ? 'text-green-600' :
                                                                'text-red-600'
                                                                }`}>
                                                                {attempt.score}%
                                                            </span>
                                                        </div>
                                                        <div className='flex justify-between text-sm text-gray-500'>
                                                            <span>{attempt.date || 'Unknown date'}</span>
                                                            <span>Time Spent: {attempt.timeSpent || 'N/A'}m</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className='mt-10 bg-green-50 p-6 rounded-xl'>
                                    <h3 className='text-xl font-semibold mb-4'>🔍 Sample Question</h3>
                                    <div className='space-y-4'>
                                        <p className='font-medium'>{sampleQuestion.text}</p>
                                        <div className='grid grid-cols-2 gap-4'>
                                            {sampleQuestion.options.map((option, index) => (
                                                <div key={index} className='p-3 border rounded hover:bg-white transition-colors'>
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