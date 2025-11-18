import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

function QuizSession() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                setLoading(true);
                const quizDoc = await getDoc(doc(db, 'quizzes', id));

                if (quizDoc.exists()) {
                    const quizData = quizDoc.data();
                    console.log('Quiz data loaded:', quizData);
                    setQuiz({
                        id: quizDoc.id,
                        ...quizData
                    });
                    setTimeLeft((quizData.timeLimit || 30) * 60);
                    setAnswers(Array(quizData.questions?.length || 0).fill(null));
                } else {
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

    useEffect(() => {
        if (!submitted && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [submitted, timeLeft]);

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
                <div className="text-center p-8">
                    <h2 className="text-2xl text-red-600 mb-4">Quiz Not Found</h2>
                    <p className="text-gray-600 mb-4">
                        No quiz found with ID: {id}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-primary py-2 px-6"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Extract data from quiz object with safe fallbacks
    const questions = quiz.questions || [];
    const totalPoints = quiz.totalPoints || 100;
    const timeLimit = quiz.timeLimit || 30;

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl text-red-600 mb-4">No Questions Available</h2>
                    <p className="text-gray-600 mb-4">
                        This quiz doesn't have any questions yet.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-primary py-2 px-6"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const handleAnswerSelect = (questionIndex, optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const calculateScore = () => {
        return questions.reduce((score, question, index) => {
            const points = question.points || 1;
            return answers[index] === question.correctAnswer ? score + points : score;
        }, 0);
    };

    const handleSubmit = () => {
        setSubmitted(true);
        // Add logic to save attempt results
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestionData = questions[currentQuestion] || {};
    const questionText = currentQuestionData.text || 'Question not available';
    const questionPoints = currentQuestionData.points || 1;
    const questionOptions = currentQuestionData.options || ['Option A', 'Option B', 'Option C', 'Option D'];
    const correctAnswer = currentQuestionData.correctAnswer ?? 0;

    return (
        <div className="mt-30 mb-30 font-poppins">
            <div className='grid grid-cols-[65%_35%] max-w-6xl mx-auto'>
                {/* Right Sidebar */}
                <div className='order-2 z-1'>
                    <div className='shadow-lg rounded-sm p-5 m-4 bg-white sticky top-20 pb-10'>
                        <div className='flex flex-col gap-4'>
                            <div className='flex justify-between items-center mb-4'>
                                <span className='text-lg font-semibold'>Time Remaining</span>
                                <div className='flex items-center bg-red-50 px-3 py-1 rounded-lg'>
                                    <ClockIcon className='w-5 h-5 mr-1 text-red-600' />
                                    <span className='font-medium text-red-600'>{formatTime(timeLeft)}</span>
                                </div>
                            </div>

                            <div className='grid grid-cols-5 gap-2'>
                                {questions.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentQuestion(index)}
                                        className={`h-10 rounded flex items-center justify-center ${currentQuestion === index
                                            ? 'bg-purple-600 text-white'
                                            : answers[index] !== undefined && answers[index] !== null
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100'
                                            }`}
                                    >
                                        Q{index + 1}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitted}
                                className='btn-primary w-full py-3 text-sm mt-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400'
                            >
                                {submitted ? 'Quiz Submitted' : 'Submit Quiz'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className='order-1 pr-5'>
                    <div className='bg-white rounded-2xl pb-10 px-10 shadow-2xl'>
                        {submitted ? (
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <h1 className='text-3xl font-bold mb-6'>Quiz Results</h1>
                                <div className='bg-green-50 p-6 rounded-xl mb-8'>
                                    <div className='flex items-center justify-center gap-4'>
                                        <div className='text-center'>
                                            <div className='text-4xl font-bold text-green-600'>
                                                {calculateScore()}/{totalPoints}
                                            </div>
                                            <div className='text-sm'>Final Score</div>
                                        </div>
                                    </div>
                                </div>

                                <div className='space-y-8'>
                                    {questions.map((question, qIndex) => {
                                        const questionText = question.text || `Question ${qIndex + 1}`;
                                        const questionOptions = question.options || [];
                                        const correctAnswer = question.correctAnswer ?? 0;

                                        return (
                                            <div key={qIndex} className='border-b pb-6'>
                                                <div className='flex items-center gap-2 mb-4'>
                                                    {answers[qIndex] === correctAnswer ? (
                                                        <CheckCircleIcon className='w-6 h-6 text-green-600' />
                                                    ) : (
                                                        <XCircleIcon className='w-6 h-6 text-red-600' />
                                                    )}
                                                    <h3 className='text-xl font-semibold'>Question {qIndex + 1}</h3>
                                                </div>
                                                <p className='text-lg mb-4'>{questionText}</p>
                                                <div className='grid grid-cols-1 gap-2'>
                                                    {questionOptions.map((option, oIndex) => (
                                                        <div
                                                            key={oIndex}
                                                            className={`p-3 rounded-lg border ${oIndex === correctAnswer
                                                                ? 'border-green-600 bg-green-50'
                                                                : answers[qIndex] === oIndex
                                                                    ? 'border-red-600 bg-red-50'
                                                                    : 'border-gray-200'
                                                                }`}
                                                        >
                                                            {option}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <div className='flex justify-between items-center mb-8'>
                                    <h1 className='text-2xl font-semibold'>
                                        Question {currentQuestion + 1} of {questions.length}
                                    </h1>
                                    <span className='text-purple-600 font-semibold'>
                                        {questionPoints} Points
                                    </span>
                                </div>

                                <p className='text-xl mb-8'>{questionText}</p>

                                <div className='space-y-4'>
                                    {questionOptions.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswerSelect(currentQuestion, index)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestion] === index
                                                ? 'border-purple-600 bg-purple-50'
                                                : 'border-gray-200 hover:border-purple-400'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>

                                <div className='flex justify-between mt-10'>
                                    <button
                                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestion === 0}
                                        className='btn-secondary py-2 px-6 disabled:opacity-50'
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                                        disabled={currentQuestion === questions.length - 1}
                                        className='btn-primary bg-purple-600 hover:bg-purple-700 py-2 px-6 disabled:opacity-50'
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuizSession;