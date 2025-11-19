import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { generateQuizQuestions, extractTopicsFromCourse } from '../../services/geminiService';

const CreateQuiz = () => {
    // Form State
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [timeLimit, setTimeLimit] = useState(10);
    const [questions, setQuestions] = useState([
        { questionText: '', options: ['', '', '', ''], correctAnswer: 0 } // Store as index now
    ]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- NEW AI FLOW STATE ---
    const [showAiModal, setShowAiModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // Data Sources
    const [myCourses, setMyCourses] = useState([]);
    const [extractedTopics, setExtractedTopics] = useState([]);

    // AI Selections
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate');
    const [aiQuestionCount, setAiQuestionCount] = useState(5);

    // 1. Fetch Tutor's Courses on Load
    useEffect(() => {
        const fetchCourses = async () => {
            const user = auth.currentUser;
            if (user) {
                const q = query(collection(db, "courses"), where("tutorId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                const coursesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().title,
                    description: doc.data().description
                }));
                setMyCourses(coursesData);
            }
        };
        fetchCourses();
    }, []);

    // 2. Handle Course Selection -> Trigger AI Topic Extraction
    const handleCourseChange = async (e) => {
        const courseId = e.target.value;
        setSelectedCourseId(courseId);
        setExtractedTopics([]); // Reset topics
        setSelectedTopic('');

        if (!courseId) return;

        const course = myCourses.find(c => c.id === courseId);
        if (course) {
            setIsExtracting(true);
            try {
                // Call AI to get topics
                const topics = await extractTopicsFromCourse(course.title, course.description);
                setExtractedTopics(topics);
                // Auto-fill quiz title/description based on course
                setQuizTitle(`${course.title} Quiz`);
                setQuizDescription(`A quiz covering key concepts from ${course.title}.`);
            } catch (error) {
                alert("Could not extract topics. Please try again.");
            } finally {
                setIsExtracting(false);
            }
        }
    };

    // 3. Handle Final Generation
    const handleAiGenerate = async () => {
        if (!selectedTopic) {
            alert("Please select a topic first.");
            return;
        }

        setIsGenerating(true);
        try {
            const course = myCourses.find(c => c.id === selectedCourseId);
            const courseName = course ? course.title : "";

            // Pass courseName as context to the AI
            const generatedQuestions = await generateQuizQuestions(
                selectedTopic,
                selectedDifficulty,
                aiQuestionCount,
                courseName
            );

            setQuestions(generatedQuestions);

            // Update title to be more specific
            setQuizTitle(`${selectedTopic} Quiz (${selectedDifficulty})`);
            setShowAiModal(false);
            alert("Questions generated successfully!");
        } catch (error) {
            alert(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Updated Helper Functions ---
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

    // Updated correct answer selection - store as index
    const handleCorrectAnswerChange = (qIndex, oIndex) => {
        const values = [...questions];
        values[qIndex].correctAnswer = oIndex; // Store the index, not the text
        setQuestions(values);
    };

    const addQuestion = () => setQuestions([...questions, {
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0 // Default to first option
    }]);

    const removeQuestion = (index) => {
        const values = [...questions];
        values.splice(index, 1);
        setQuestions(values);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizTitle || questions.some(q => !q.questionText || q.correctAnswer === undefined)) {
            return alert('Please fill all fields and select correct answers for all questions.');
        }
        setLoading(true);
        try {
            await addDoc(collection(db, 'quizzes'), {
                quizTitle,
                quizDescription,
                deadline,
                timeLimit,
                questions,
                totalPoints: questions.length * 10, // Calculate total points
                totalMarks: questions.length * 10,
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                attempts: [], // Initialize empty attempts array
                attemptsAllowed: 1, // Default to 1 attempt
                isActive: true
            });
            alert('Quiz created successfully!');
            navigate('/tutor-dashboard');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 mt-16 mb-16 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Create a New Quiz</h1>
                    <button
                        type="button"
                        onClick={() => setShowAiModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
                    >
                        ✨ Generate with Ai
                    </button>
                </div>

                {/* --- NEW AI MODAL --- */}
                {showAiModal && (
                    <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-xl animate-fade-in relative">
                        <button onClick={() => setShowAiModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">✕</button>
                        <h3 className="font-bold text-purple-800 text-lg mb-4">Generate Quiz from Your Courses</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* 1. Select Course */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-purple-900 mb-1">Select Course</label>
                                <select
                                    value={selectedCourseId}
                                    onChange={handleCourseChange}
                                    className="w-full p-2 border border-purple-200 rounded-md bg-white"
                                >
                                    <option value="">-- Choose a Course --</option>
                                    {myCourses.map(course => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Select Topic (Populated by AI) */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-purple-900 mb-1">
                                    Select Topic
                                    {isExtracting && <span className="text-xs text-purple-500 ml-2 animate-pulse">(Extracting topics...)</span>}
                                </label>
                                <select
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    disabled={!selectedCourseId || isExtracting}
                                    className="w-full p-2 border border-purple-200 rounded-md bg-white disabled:bg-gray-100"
                                >
                                    <option value="">-- {extractedTopics.length > 0 ? 'Choose a Topic' : 'Waiting for Course...'} --</option>
                                    {extractedTopics.map((topic, index) => (
                                        <option key={index} value={topic}>{topic}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Difficulty */}
                            <div>
                                <label className="block text-sm font-medium text-purple-900 mb-1">Difficulty</label>
                                <select
                                    value={selectedDifficulty}
                                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    className="w-full p-2 border border-purple-200 rounded-md bg-white"
                                >
                                    <option>Beginner</option>
                                    <option>Intermediate</option>
                                    <option>Advanced</option>
                                </select>
                            </div>

                            {/* 4. Question Count */}
                            <div>
                                <label className="block text-sm font-medium text-purple-900 mb-1">No. of Questions</label>
                                <input
                                    type="number" min="1" max="20"
                                    value={aiQuestionCount}
                                    onChange={(e) => setAiQuestionCount(parseInt(e.target.value))}
                                    className="w-full p-2 border border-purple-200 rounded-md"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={isGenerating || !selectedTopic}
                            className="mt-6 w-full bg-purple-600 text-white py-3 rounded-md font-semibold hover:bg-purple-700 disabled:opacity-50 shadow-md transition-all"
                        >
                            {isGenerating ? 'Generating Questions...' : 'Generate Questions'}
                        </button>
                    </div>
                )}

                {/* Existing Manual Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quiz Title</label>
                        <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" rows="3"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Deadline</label>
                            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Time Limit (mins)</label>
                            <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                        </div>
                    </div>

                    <hr />
                    <h2 className="text-xl font-semibold text-gray-800">Questions</h2>

                    {questions.map((question, qIndex) => (
                        <div key={qIndex} className="p-4 border rounded-lg space-y-4 relative bg-gray-50">
                            <h3 className="font-semibold text-gray-700">Question {qIndex + 1}</h3>
                            <textarea
                                name="questionText"
                                placeholder="Question text"
                                value={question.questionText}
                                onChange={e => handleQuestionChange(qIndex, e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md" required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {question.options.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name={`correct-${qIndex}`}
                                            checked={question.correctAnswer === oIndex}
                                            onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                            className="h-4 w-4 text-green-600"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder={`Option ${oIndex + 1}`}
                                            value={option}
                                            onChange={e => handleOptionChange(qIndex, oIndex, e)}
                                            className={`w-full px-3 py-2 border rounded-md ${question.correctAnswer === oIndex ? 'border-green-500 bg-green-50' : 'border-gray-300'
                                                }`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                            {questions.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(qIndex)}
                                    className="absolute top-2 right-2 text-red-500 p-2 hover:bg-red-100 rounded-full"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-between pt-4">
                        <button type="button" onClick={addQuestion} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50">+ Add Question</button>
                        <button type="submit" disabled={loading} className="px-8 py-3 bg-[#4CBC9A] text-white rounded-md font-medium hover:bg-[#3aa384] disabled:bg-gray-400">{loading ? 'Creating...' : 'Create Quiz'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateQuiz;