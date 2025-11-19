import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';

function QuizSession() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizResult, setQuizResult] = useState(null);
    const [hasExistingAttempt, setHasExistingAttempt] = useState(false);
    const [savedAttemptId, setSavedAttemptId] = useState(null);

    useEffect(() => {
        const fetchQuizAndCheckAttempts = async () => {
            try {
                setLoading(true);
                const quizDoc = await getDoc(doc(db, 'quizzes', id));

                if (quizDoc.exists()) {
                    const quizData = quizDoc.data();
                    console.log('Quiz data loaded:', quizData);

                    // Check if user has already attempted this quiz
                    const user = auth.currentUser;
                    if (user) {
                        const attemptsQuery = query(
                            collection(db, 'quizAttempts'),
                            where('studentId', '==', user.uid),
                            where('quizId', '==', id)
                        );
                        const attemptsSnapshot = await getDocs(attemptsQuery);

                        if (!attemptsSnapshot.empty) {
                            setHasExistingAttempt(true);
                            const existingAttempt = attemptsSnapshot.docs[0].data();
                            setQuizResult({
                                totalScore: existingAttempt.totalScore,
                                percentage: existingAttempt.score,
                                correctAnswers: existingAttempt.correctAnswers,
                                totalQuestions: existingAttempt.totalQuestions,
                                questionResults: existingAttempt.questionResults
                            });
                            setAnswers(existingAttempt.answers || {});
                            setSubmitted(true);

                            // Redirect to results page if already attempted
                            navigate(`/quiz/${id}/results/latest`, { replace: true });
                            return;
                        } else {
                            // Initialize time left based on timeLimit (in minutes)
                            const initialTime = (quizData.timeLimit || 30) * 60;
                            setTimeLeft(initialTime);
                            setQuizStarted(true);
                        }
                    }

                    setQuiz({
                        id: quizDoc.id,
                        ...quizData
                    });
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
            fetchQuizAndCheckAttempts();
        }
    }, [id, navigate]);

    useEffect(() => {
        if (quizStarted && !submitted && timeLeft > 0 && !hasExistingAttempt) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleAutoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [quizStarted, submitted, timeLeft, hasExistingAttempt]);

    const handleAnswerSelect = (questionIndex, optionIndex) => {
        if (submitted || hasExistingAttempt) return;

        setAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const calculateScore = () => {
        if (!quiz || !quiz.questions) return 0;

        let correctAnswers = 0;
        const questionResults = quiz.questions.map((question, index) => {
            const userAnswer = answers[index];
            // Compare the stored index with the correct answer index
            const isCorrect = userAnswer !== undefined &&
                userAnswer !== null &&
                userAnswer === question.correctAnswer;

            if (isCorrect) correctAnswers++;

            return {
                questionIndex: index,
                questionText: getQuestionText(question),
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                points: question.points || 1
            };
        });

        const totalScore = quiz.questions.reduce((score, question, index) => {
            const points = question.points || 1;
            const userAnswer = answers[index];
            const isCorrect = userAnswer !== undefined &&
                userAnswer !== null &&
                userAnswer === question.correctAnswer;

            return isCorrect ? score + points : score;
        }, 0);

        const percentage = Math.round((correctAnswers / quiz.questions.length) * 100);

        return {
            totalScore,
            percentage,
            correctAnswers,
            totalQuestions: quiz.questions.length,
            questionResults
        };
    };

    const saveQuizAttempt = async (result) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('No user logged in');
                return null;
            }

            const quizAttemptData = {
                studentId: user.uid,
                studentName: user.displayName || user.email,
                quizId: id,
                quizTitle: quiz.QuizTitle || quiz.quizTitle || 'Untitled Quiz',
                score: result.percentage,
                totalScore: result.totalScore,
                totalPoints: quiz.totalPoints || result.totalQuestions * 10,
                correctAnswers: result.correctAnswers,
                totalQuestions: result.totalQuestions,
                answers: answers,
                questionResults: result.questionResults,
                timeSpent: ((quiz.timeLimit || 30) * 60 - timeLeft) / 60, // in minutes
                completedAt: serverTimestamp(),
                submittedAt: serverTimestamp(),
                status: 'completed'
            };

            console.log('Saving quiz attempt:', quizAttemptData);

            // Save to quizAttempts collection
            const attemptRef = await addDoc(collection(db, 'quizAttempts'), quizAttemptData);

            // Also update the quiz document to include this attempt in its attempts array
            await updateDoc(doc(db, 'quizzes', id), {
                attempts: arrayUnion({
                    attemptId: attemptRef.id,
                    studentId: user.uid,
                    score: result.percentage,
                    date: serverTimestamp(),
                    timeSpent: quizAttemptData.timeSpent
                })
            });

            console.log('Quiz attempt saved successfully with ID:', attemptRef.id);
            return attemptRef.id;
        } catch (error) {
            console.error('Error saving quiz attempt:', error);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (submitted || hasExistingAttempt) return;

        if (window.confirm('Are you sure you want to submit the quiz?')) {
            setSubmitted(true);
            const result = calculateScore();
            setQuizResult(result);

            // Save the quiz attempt
            const attemptId = await saveQuizAttempt(result);
            if (attemptId) {
                setSavedAttemptId(attemptId);
                console.log('Quiz submitted successfully. Attempt ID:', attemptId);

                // Redirect to results page after a brief delay
                setTimeout(() => {
                    navigate(`/quiz/${id}/results/${attemptId}`);
                }, 2000);
            } else {
                console.error('Failed to save quiz attempt');
            }
        }
    };

    const handleAutoSubmit = async () => {
        if (submitted || hasExistingAttempt) return;

        setSubmitted(true);
        const result = calculateScore();
        setQuizResult(result);

        // Save the quiz attempt
        const attemptId = await saveQuizAttempt(result);
        if (attemptId) {
            setSavedAttemptId(attemptId);
            // Redirect to results page after a brief delay
            setTimeout(() => {
                navigate(`/quiz/${id}/results/${attemptId}`);
            }, 2000);
        }
        console.log('Quiz auto-submitted due to time limit');
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper function to extract question text from different possible field names
    const getQuestionText = (question) => {
        if (!question) return 'Question not available';

        return question.text ||
            question.question ||
            question.questionText ||
            question.title ||
            `Question`;
    };

    // Helper function to extract options from different possible field names
    const getQuestionOptions = (question) => {
        if (!question) return ['Option A', 'Option B', 'Option C', 'Option D'];

        return question.options ||
            question.choices ||
            question.answers ||
            ['Option A', 'Option B', 'Option C', 'Option D'];
    };

    // Helper function to extract points
    const getQuestionPoints = (question) => {
        if (!question) return 1;
        return question.points || question.point || 1;
    };

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
    const totalPoints = quiz.totalPoints || questions.reduce((sum, q) => sum + getQuestionPoints(q), 0);
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

    // If user has already attempted, show redirect message
    if (hasExistingAttempt && !submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl text-red-600 mb-4">Quiz Already Attempted</h2>
                    <p className="text-gray-600 mb-4">
                        You have already completed this quiz. Redirecting to results...
                    </p>
                    <button
                        onClick={() => navigate(`/quiz/${id}/results/latest`)}
                        className="btn-primary py-2 px-6"
                    >
                        View Results
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestionData = questions[currentQuestion] || {};
    const questionText = getQuestionText(currentQuestionData);
    const questionPoints = getQuestionPoints(currentQuestionData);
    const questionOptions = getQuestionOptions(currentQuestionData);

    return (
        <div className="mt-30 mb-30 font-poppins">
            <div className='grid grid-cols-[65%_35%] max-w-6xl mx-auto'>
                {/* Right Sidebar */}
                <div className='order-2 z-1'>
                    <div className='shadow-lg rounded-sm p-5 m-4 bg-white sticky top-20 pb-10'>
                        <div className='flex flex-col gap-4'>
                            <div className='flex justify-between items-center mb-4'>
                                <span className='text-lg font-semibold'>Time Remaining</span>
                                <div className={`flex items-center px-3 py-1 rounded-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <ClockIcon className='w-5 h-5 mr-1' />
                                    <span className='font-medium'>{formatTime(timeLeft)}</span>
                                </div>
                            </div>

                            <div className='grid grid-cols-5 gap-2'>
                                {questions.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentQuestion(index)}
                                        disabled={submitted || hasExistingAttempt}
                                        className={`h-10 rounded flex items-center justify-center text-sm font-medium ${currentQuestion === index
                                            ? 'bg-purple-600 text-white'
                                            : answers[index] !== undefined
                                                ? 'bg-green-100 text-green-800 border border-green-300'
                                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                                            } ${submitted || hasExistingAttempt ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Q{index + 1}
                                    </button>
                                ))}
                            </div>

                            <div className='mt-4 p-3 bg-gray-50 rounded-lg'>
                                <div className='flex justify-between text-sm'>
                                    <span>Answered: {Object.keys(answers).length}</span>
                                    <span>Remaining: {questions.length - Object.keys(answers).length}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitted || hasExistingAttempt}
                                className='btn-primary w-full py-3 text-sm mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                            >
                                {submitted ? 'Submitting...' : hasExistingAttempt ? 'Quiz Completed' : 'Submit Quiz'}
                            </button>

                            {submitted && savedAttemptId && (
                                <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
                                    <div className='flex items-center text-sm text-green-800'>
                                        <CheckCircleIcon className='w-4 h-4 mr-2' />
                                        <span>Quiz submitted! Redirecting to results...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content - Only show if not submitted or during quiz */}
                {!submitted && (
                    <div className='order-1 pr-5'>
                        <div className='bg-white rounded-2xl pb-10 px-10 shadow-2xl'>
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
                                            disabled={submitted || hasExistingAttempt}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestion] === index
                                                ? 'border-purple-600 bg-purple-50'
                                                : 'border-gray-200 hover:border-purple-400 hover:bg-purple-25'
                                                } ${submitted || hasExistingAttempt ? 'cursor-not-allowed' : ''}`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>

                                <div className='flex justify-between mt-10'>
                                    <button
                                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestion === 0 || submitted || hasExistingAttempt}
                                        className='btn-secondary py-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                                        disabled={currentQuestion === questions.length - 1 || submitted || hasExistingAttempt}
                                        className='btn-primary bg-purple-600 hover:bg-purple-700 py-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Show loading message when submitted and redirecting */}
                {submitted && (
                    <div className='order-1 pr-5'>
                        <div className='bg-white rounded-2xl pb-10 px-10 shadow-2xl'>
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800 text-center">
                                <div className='py-12'>
                                    <CheckCircleIcon className='w-16 h-16 text-green-500 mx-auto mb-4' />
                                    <h2 className='text-2xl font-semibold text-gray-800 mb-2'>Quiz Submitted Successfully!</h2>
                                    <p className='text-gray-600 mb-6'>Your results are being calculated...</p>
                                    <div className='animate-pulse'>
                                        <div className='w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto animate-spin'></div>
                                    </div>
                                    <p className='text-sm text-gray-500 mt-4'>Redirecting to results page</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuizSession;