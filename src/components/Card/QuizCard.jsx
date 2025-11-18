import React from 'react';
import { ClockIcon, QuestionMarkCircleIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

function QuizCard({ quizzes }) {
    // Safe data extraction with fallbacks
    const quizId = quizzes.id || quizzes.QuizId || 'unknown';
    const quizTitle = quizzes.quizTitle || quizzes.QuizTitle || 'Untitled Quiz';
    const quizDescription = quizzes.quizDescription || quizzes.QuizDescription || 'No description available';
    const difficulty = quizzes.difficulty || 'Intermediate';
    const category = quizzes.category || 'General';
    const timeLimit = quizzes.timeLimit || '15';
    const questionsCount = quizzes.questionsCount || quizzes.questions?.length || 'N/A';
    const bestScore = quizzes.bestScore || 'N/A';
    const totalPoints = quizzes.totalPoints || quizzes.totalPoints || 'N/A';

    // Determine difficulty color
    const getDifficultyColor = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Add debug logging
    console.log('QuizCard rendering:', { quizId, quizTitle });

    return (
        <div className="group relative p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border-l-4 border-hoverGreen hover:border-hoverYellow font-poppins">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <PuzzlePieceIcon className="w-6 h-6 text-greenSmall" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg text-gray-900 mb-1">
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
                        <i className="fas fa-star text-yellow-300 text-1xl"></i>
                        <span>{bestScore} Rating</span>
                    </div>
                </div>

                {/* Try different route paths */}
                <Link
                    to={`/quizzes/${quizId}`}
                    className="px-4 py-2 bg-BgPrimary text-white rounded-lg text-sm font-medium transition-colors duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => console.log('Navigating to quiz:', quizId)}
                >
                    Start Quiz
                </Link>
            </div>

            {/* Quiz Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                        <span className="font-medium">Points:</span>
                        <span>{totalPoints}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="font-medium">Status:</span>
                        <span className="text-green-600">Active</span>
                    </div>
                </div>
            </div>

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