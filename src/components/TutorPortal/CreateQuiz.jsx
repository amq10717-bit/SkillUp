// src/components/Tutor/CreateQuiz.jsx

import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const CreateQuiz = () => {
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [timeLimit, setTimeLimit] = useState(10); // Default time limit in minutes
    const [questions, setQuestions] = useState([
        { questionText: '', options: ['', '', '', ''], correctAnswer: '' }
    ]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleQuestionChange = (index, event) => {
        const values = [...questions];
        values[index][event.target.name] = event.target.value;
        setQuestions(values);
    };

    const handleOptionChange = (qIndex, oIndex, event) => {
        const values = [...questions];
        values[qIndex].options[oIndex] = event.target.value;
        setQuestions(values);
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: '' }]);
    };

    const removeQuestion = (index) => {
        const values = [...questions];
        values.splice(index, 1);
        setQuestions(values);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizTitle || questions.some(q => !q.questionText || q.options.some(o => o === '') || !q.correctAnswer)) {
            alert('Please fill in all quiz details, questions, options, and select a correct answer for each.');
            return;
        }
        setLoading(true);
        try {
            await addDoc(collection(db, 'quizzes'), {
                quizTitle,
                quizDescription,
                deadline,
                timeLimit,
                questions,
                totalMarks: questions.length * 10, // Example: 10 marks per question
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp(),
            });
            alert('Quiz created successfully!');
            navigate('/tutor-dashboard');
        } catch (error) {
            console.error("Error creating quiz: ", error);
            alert('Failed to create quiz: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 mt-16 mb-16 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Create a New Quiz</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Quiz Details */}
                    <div>
                        <label htmlFor="quizTitle" className="block text-sm font-medium text-gray-700">Quiz Title</label>
                        <input type="text" id="quizTitle" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required />
                    </div>
                    <div>
                        <label htmlFor="quizDescription" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="quizDescription" value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            rows="3"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">Deadline</label>
                            <input type="date" id="deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required />
                        </div>
                        <div>
                            <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                            <input type="number" id="timeLimit" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required />
                        </div>
                    </div>

                    <hr />

                    {/* Questions Section */}
                    <h2 className="text-xl font-semibold text-gray-800">Questions</h2>
                    {questions.map((question, qIndex) => (
                        <div key={qIndex} className="p-4 border rounded-lg space-y-4 relative">
                            <h3 className="font-semibold">Question {qIndex + 1}</h3>
                            <textarea
                                name="questionText"
                                placeholder="Enter your question here"
                                value={question.questionText}
                                onChange={event => handleQuestionChange(qIndex, event)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                            {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder={`Option ${oIndex + 1}`}
                                        value={option}
                                        onChange={event => handleOptionChange(qIndex, oIndex, event)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        required
                                    />
                                    <input
                                        type="radio"
                                        name={`correctAnswer-${qIndex}`}
                                        value={option}
                                        checked={question.correctAnswer === option}
                                        onChange={() => {
                                            const values = [...questions];
                                            values[qIndex].correctAnswer = option;
                                            setQuestions(values);
                                        }}
                                        className="h-5 w-5 text-green-600"
                                        required
                                    />
                                </div>
                            ))}
                            {questions.length > 1 && (
                                <button type="button" onClick={() => removeQuestion(qIndex)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50">
                                    <i className="fas fa-trash"></i>
                                </button>
                            )}
                        </div>
                    ))}
                    <div className="flex justify-between items-center">
                        <button type="button" onClick={addQuestion} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
                            Add Another Question
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={loading} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#4CBC9A] hover:bg-[#3aa384] disabled:bg-gray-400">
                            {loading ? 'Creating...' : 'Create Quiz'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateQuiz;