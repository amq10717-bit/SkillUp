import React from 'react'
import QuizCard from '../Card/QuizCard'

function QuizPreview({ quizzes }) {
    // Add debug logging
    console.log('QuizPreview received quizzes:', quizzes);

    if (!quizzes || quizzes.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <i className="fas fa-question-circle text-4xl mb-4 text-gray-300"></i>
                <p>No quizzes available</p>
                <p className="text-sm mt-2">Check back later for new quizzes</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-5">
            {quizzes.map((quizItem, index) => (
                <QuizCard
                    key={quizItem.id || quizItem.QuizId || index}
                    quizzes={quizItem}
                />
            ))}
        </div>
    )
}

export default QuizPreview