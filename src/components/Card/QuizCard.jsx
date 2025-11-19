import React, { useState, useEffect } from 'react';
import { ClockIcon, QuestionMarkCircleIcon, PuzzlePieceIcon, CheckCircleIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';

function QuizCard({ quizzes }) {
    // Safe data extraction with fallbacks
    const quizId = quizzes.id || quizzes.QuizId || 'unknown';
    const quizTitle = quizzes.quizTitle || quizzes.QuizTitle || 'Untitled Quiz';
    const quizDescription = quizzes.quizDescription || quizzes.QuizDescription || 'No description available';
    const difficulty = quizzes.difficulty || 'Intermediate';
    const category = quizzes.category || 'General';
    const timeLimit = quizzes.timeLimit || '15';
    const questionsCount = quizzes.questionsCount || quizzes.questions?.length || 'N/A';
    const totalPoints = quizzes.totalPoints || quizzes.totalPoints || 'N/A';

    // State for user-specific data
    const [hasAttempted, setHasAttempted] = useState(false);
    const [bestScore, setBestScore] = useState(quizzes.bestScore || 'N/A');
    const [loading, setLoading] = useState(true);

    // Check if user has attempted this quiz
    useEffect(() => {
        const checkUserAttempts = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    setLoading(false);
                    return;
                }

                const attemptsQuery = query(
                    collection(db, 'quizAttempts'),
                    where('studentId', '==', user.uid),
                    where('quizId', '==', quizId)
                );

                const attemptsSnapshot = await getDocs(attemptsQuery);

                if (!attemptsSnapshot.empty) {
                    setHasAttempted(true);
                    // Find the best score from all attempts
                    const attempts = attemptsSnapshot.docs.map(doc => doc.data());
                    const bestAttempt = attempts.reduce((best, current) =>
                        current.score > best.score ? current : best
                    );
                    setBestScore(bestAttempt.score);
                }
            } catch (error) {
                console.error('Error checking user attempts:', error);
            } finally {
                setLoading(false);
            }
        };

        checkUserAttempts();
    }, [quizId]);

    // Determine difficulty color
    const getDifficultyColor = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Determine status color and text
    const getStatusInfo = () => {
        if (loading) return { color: 'text-gray-500', bg: 'bg-gray-100', text: 'Loading...' };
        if (hasAttempted) return { color: 'text-green-600', bg: 'bg-green-100', text: 'Completed' };
        return { color: 'text-blue-600', bg: 'bg-blue-100', text: 'Available' };
    };

    // Determine button text and style based on attempt status
    const getButtonInfo = () => {
        if (loading) {
            return {
                text: 'Loading...',
                style: 'bg-gray-400 cursor-not-allowed',
                link: '#'
            };
        }
        if (hasAttempted) {
            return {
                text: 'View Results',
                style: 'bg-green-600 hover:bg-green-700',
                link: `/quiz/${quizId}/results/latest`
            };
        }
        return {
            text: 'Start Quiz',
            style: 'bg-BgPrimary hover:bg-blue-700',
            link: `/quiz/${quizId}`
        };
    };

    const statusInfo = getStatusInfo();
    const buttonInfo = getButtonInfo();

    // Add debug logging
    console.log('QuizCard rendering:', { quizId, quizTitle, hasAttempted, bestScore });

    return (
        <div className={`group relative p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 ${hasAttempted ? 'border-green-500' : 'border-hoverGreen hover:border-hoverYellow'
            } font-poppins`}>
            {/* Status Badge */}


            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${hasAttempted ? 'bg-green-50' : 'bg-emerald-50'
                        }`}>
                        <PuzzlePieceIcon className={`w-6 h-6 ${hasAttempted ? 'text-green-600' : 'text-greenSmall'
                            }`} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-md text-gray-900 mb-1">
                            {quizTitle}
                        </h2>
                        <div className="flex items-center space-x-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(difficulty)}`}>
                                {difficulty}
                            </span>
                            <span className="inline-block px-2 py-1 text-xs font-medium text-black bg-gray-100 rounded-full">
                                {category}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
            <div className='flex items-center justify-start mb-5'>
                <div className="flex items-center justify-center mr-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        {hasAttempted && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                        {statusInfo.text}
                    </span>
                </div>
                <div className="flex items-center justify-center space-x-1 text-sm text-black">
                    <ClockIcon className="w-4 h-4" />
                    <span>{timeLimit} mins</span>
                </div>

            </div>


            <p className="text-black text-sm mb-6 line-clamp-2">
                {quizDescription}
            </p>

            <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center space-x-4 text-sm text-black">
                    <div className="flex items-center space-x-1">
                        <QuestionMarkCircleIcon className="w-4 h-4" />
                        <span>{questionsCount} Questions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        {hasAttempted ? (
                            <>
                                <TrophyIcon className="w-4 h-4 text-yellow-500" />
                                <span>{bestScore}% Score</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-star text-yellow-300 text-1xl"></i>
                                <span>{totalPoints} Points</span>
                            </>
                        )}
                    </div>
                </div>

                <Link
                    to={buttonInfo.link}
                    className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg ${buttonInfo.style} ${loading ? 'cursor-not-allowed' : ''
                        }`}
                    onClick={(e) => {
                        if (loading) {
                            e.preventDefault();
                        } else {
                            console.log('Navigating to:', buttonInfo.link);
                        }
                    }}
                >
                    {buttonInfo.text}
                </Link>
            </div>

            {/* Quiz Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                        <span className="font-medium">Points:</span>
                        <span>{totalPoints}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="font-medium">Status:</span>
                        <span className={statusInfo.color}>{statusInfo.text}</span>
                    </div>
                </div>

                {/* Best Score Display */}
                {hasAttempted && !loading && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-600">Your Best Score:</span>
                            <div className="flex items-center space-x-1">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div
                                        className="bg-green-500 h-1.5 rounded-full"
                                        style={{ width: `${bestScore}%` }}
                                    ></div>
                                </div>
                                <span className="font-bold text-green-600">{bestScore}%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-600">Checking status...</span>
                    </div>
                </div>
            )}

            {/* Empty state handling */}
            {!quizzes.quizTitle && !quizzes.QuizTitle && (
                <div className="absolute inset-0 bg-yellow-50 bg-opacity-50 flex items-center justify-center rounded-xl">
                    <p className="text-yellow-700 text-sm font-medium">Quiz data incomplete</p>
                </div>
            )}
        </div>
    );
}

export default QuizCard;