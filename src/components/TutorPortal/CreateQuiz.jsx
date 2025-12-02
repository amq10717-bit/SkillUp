import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';

// IMPORT SERVICE FUNCTIONS
// Ensure generateQuizWithRAG is exported from your geminiService.js
import {
    generateQuizQuestions,
    extractTopicsFromCourse,
    generateQuizWithRAG
} from '../../services/geminiService';

// IMPORT ICONS
import {
    DocumentIcon,
    CloudArrowUpIcon,
    TrashIcon,
    PlusIcon,
    SparklesIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

const CreateQuiz = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // --- FORM STATE ---
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [timeLimit, setTimeLimit] = useState(10);
    const [questions, setQuestions] = useState([
        { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }
    ]);

    // --- AI MODAL STATE ---
    const [showAiModal, setShowAiModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // --- AI CONFIGURATION STATE ---
    const [aiMode, setAiMode] = useState('topic'); // 'topic' | 'file'
    const [ragFile, setRagFile] = useState(null); // The uploaded file for RAG

    const [myCourses, setMyCourses] = useState([]);
    const [extractedTopics, setExtractedTopics] = useState([]);

    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTopic, setSelectedTopic] = useState(''); // Acts as 'Instructions' in File mode
    const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate');
    const [aiQuestionCount, setAiQuestionCount] = useState(5);

    // 1. Fetch Tutor's Courses on Load
    useEffect(() => {
        const fetchCourses = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const q = query(collection(db, "courses"), where("tutorId", "==", user.uid));
                    const querySnapshot = await getDocs(q);
                    const coursesData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        title: doc.data().title,
                        description: doc.data().description
                    }));
                    setMyCourses(coursesData);
                } catch (error) {
                    console.error("Error fetching courses:", error);
                }
            }
        };
        fetchCourses();
    }, []);

    // 2. Handle Course Selection & Topic Extraction
    const handleCourseChange = async (e) => {
        const courseId = e.target.value;
        setSelectedCourseId(courseId);
        setExtractedTopics([]);
        setSelectedTopic('');

        if (!courseId) return;

        const course = myCourses.find(c => c.id === courseId);
        if (course) {
            // Only auto-extract topics if in 'topic' mode
            if (aiMode === 'topic') {
                setIsExtracting(true);
                try {
                    const topics = await extractTopicsFromCourse(course.title, course.description);
                    setExtractedTopics(topics);
                } catch (error) {
                    console.error("Topic extraction failed:", error);
                } finally {
                    setIsExtracting(false);
                }
            }
            // Auto-fill title based on course
            setQuizTitle(`${course.title} Quiz`);
            setQuizDescription(`A quiz covering key concepts from ${course.title}.`);
        }
    };

    // 3. AI Generation Handler (Standard + RAG)
    const handleAiGenerate = async () => {
        // Validation
        if (aiMode === 'topic' && !selectedTopic) return alert("Please select a topic.");
        if (aiMode === 'file' && !ragFile) return alert("Please upload a document.");
        if (aiMode === 'file' && !selectedTopic) return alert("Please enter instructions (e.g., 'Focus on Chapter 1').");

        setIsGenerating(true);
        try {
            const course = myCourses.find(c => c.id === selectedCourseId);
            const courseName = course ? course.title : "";
            let generatedQuestions = [];

            if (aiMode === 'file') {
                // --- RAG FLOW ---
                console.log("🚀 Starting RAG Generation...");
                // Note: selectedTopic variable is used as the 'instructions' argument here
                generatedQuestions = await generateQuizWithRAG(ragFile, selectedTopic, selectedDifficulty, aiQuestionCount);
            } else {
                // --- STANDARD FLOW ---
                console.log("✨ Starting Standard Generation...");
                generatedQuestions = await generateQuizQuestions(selectedTopic, selectedDifficulty, aiQuestionCount, courseName);
            }

            console.log('Raw generated questions:', generatedQuestions);

            // Process AI response to ensure correctAnswer is an integer index (0-3)
            const processedQuestions = generatedQuestions.map((question, index) => {
                let correctAnswerIndex = 0; // Default

                if (typeof question.correctAnswer === 'number') {
                    correctAnswerIndex = question.correctAnswer;
                } else if (typeof question.correctAnswer === 'string') {
                    // Try parsing "0", "1", etc.
                    const parsed = parseInt(question.correctAnswer);
                    if (!isNaN(parsed) && parsed >= 0 && parsed < 4) {
                        correctAnswerIndex = parsed;
                    } else {
                        // Try matching option text (e.g. "Hyper Text Markup Language" -> find index)
                        const matchIndex = question.options.findIndex(opt =>
                            opt.toLowerCase().includes(question.correctAnswer.toLowerCase())
                        );
                        if (matchIndex !== -1) correctAnswerIndex = matchIndex;
                    }
                }
                return { ...question, correctAnswer: correctAnswerIndex };
            });

            // Update Form State
            setQuestions(processedQuestions);

            // Smart Title Update
            const contextTitle = aiMode === 'file' ? "Document Analysis" : selectedTopic;
            setQuizTitle(`${contextTitle} Quiz (${selectedDifficulty})`);
            setQuizDescription(`Automatically generated quiz based on ${aiMode === 'file' ? 'uploaded document' : 'course topics'}.`);

            setShowAiModal(false);
            setRagFile(null); // Reset file
            alert("Quiz generated successfully!");

        } catch (error) {
            console.error('AI Generation Error:', error);
            alert(error.message || "Failed to generate questions. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- FORM HELPERS ---

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

    const handleCorrectAnswerChange = (qIndex, oIndex) => {
        const values = [...questions];
        values[qIndex].correctAnswer = oIndex;
        setQuestions(values);
    };

    const addQuestion = () => setQuestions([...questions, {
        questionText: '', options: ['', '', '', ''], correctAnswer: 0
    }]);

    const removeQuestion = (index) => {
        const values = [...questions];
        values.splice(index, 1);
        setQuestions(values);
    };

    const validateQuestions = () => {
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].questionText.trim()) {
                alert(`Please fill in the text for Question ${i + 1}`);
                return false;
            }
            for (let j = 0; j < 4; j++) {
                if (!questions[i].options[j].trim()) {
                    alert(`Please fill in all options for Question ${i + 1}`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizTitle.trim()) return alert('Please enter a quiz title.');
        if (!validateQuestions()) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'quizzes'), {
                quizTitle,
                quizDescription,
                deadline,
                timeLimit,
                questions,
                totalPoints: questions.length * 10,
                totalMarks: questions.length * 10,
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                attempts: [],
                attemptsAllowed: 1,
                isActive: true
            });
            alert('✅ Quiz created successfully!');
            navigate('/tutor-dashboard');
        } catch (error) {
            console.error(error);
            alert("Error creating quiz: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 mt-20 pb-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-[#4CBC9A] to-[#2E8B57] p-6 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <DocumentIcon className="w-8 h-8" />
                                Create New Quiz
                            </h1>
                            <p className="text-green-100 text-sm mt-1">Design assessments manually or use AI magic</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAiModal(true)}
                            className="bg-white text-[#2E8B57] px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-gray-100 transition flex items-center gap-2 animate-pulse-slow"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Generate with AI
                        </button>
                    </div>

                    {/* --- AI MODAL START --- */}
                    {showAiModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 animate-fade-in">
                                {/* Modal Header */}
                                <div className="bg-purple-50 p-6 border-b border-purple-100 flex justify-between items-center">
                                    <h3 className="font-bold text-purple-900 text-xl flex items-center gap-2">
                                        <SparklesIcon className="w-6 h-6 text-purple-600" />
                                        AI Quiz Generator
                                    </h3>
                                    <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-700 transition">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Tabs */}
                                    <div className="bg-gray-100 p-1 rounded-lg flex">
                                        <button
                                            onClick={() => { setAiMode('topic'); setSelectedTopic(''); }}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${aiMode === 'topic' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            From Course Topics
                                        </button>
                                        <button
                                            onClick={() => { setAiMode('file'); setSelectedTopic(''); }}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${aiMode === 'file' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            From Document (RAG)
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Configuration Column */}
                                        <div className="space-y-4">
                                            {/* Course Selection (Only in Topic Mode) */}
                                            {aiMode === 'topic' && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Course</label>
                                                    <select
                                                        value={selectedCourseId}
                                                        onChange={handleCourseChange}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                                    >
                                                        <option value="">-- Choose Course --</option>
                                                        {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Topic or Instructions Input */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                    {aiMode === 'topic' ? 'Select Topic' : 'Instructions'}
                                                    {isExtracting && <span className="text-xs text-purple-600 ml-2 animate-pulse">(Extracting...)</span>}
                                                </label>

                                                {aiMode === 'topic' ? (
                                                    <select
                                                        value={selectedTopic}
                                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                                        disabled={!selectedCourseId || isExtracting}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                                    >
                                                        <option value="">{extractedTopics.length > 0 ? 'Choose a Topic' : 'Waiting for Course...'}</option>
                                                        {extractedTopics.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                                    </select>
                                                ) : (
                                                    <textarea
                                                        value={selectedTopic}
                                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                                        placeholder="e.g. Generate questions focusing on the second chapter regarding thermodynamics..."
                                                        rows={3}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                                    />
                                                )}
                                            </div>

                                            {/* Difficulty & Count */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
                                                    <select
                                                        value={selectedDifficulty}
                                                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg"
                                                    >
                                                        <option>Beginner</option>
                                                        <option>Intermediate</option>
                                                        <option>Advanced</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Count</label>
                                                    <input
                                                        type="number" min="1" max="20"
                                                        value={aiQuestionCount}
                                                        onChange={(e) => setAiQuestionCount(parseInt(e.target.value))}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* File Upload Column (Only in File Mode) */}
                                        {aiMode === 'file' && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Source Document</label>
                                                <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center bg-purple-50 hover:bg-purple-100 transition-colors">
                                                    <input
                                                        type="file"
                                                        id="ragQuizFile"
                                                        accept=".pdf,.txt,.docx"
                                                        className="hidden"
                                                        onChange={(e) => setRagFile(e.target.files[0])}
                                                    />
                                                    <label htmlFor="ragQuizFile" className="cursor-pointer flex flex-col items-center justify-center h-full">
                                                        {ragFile ? (
                                                            <div className="animate-fade-in">
                                                                <DocumentIcon className="w-12 h-12 text-purple-600 mb-2 mx-auto" />
                                                                <p className="text-purple-900 font-medium truncate max-w-xs">{ragFile.name}</p>
                                                                <p className="text-xs text-purple-500 mt-1">Click to change file</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <CloudArrowUpIcon className="w-12 h-12 text-purple-400 mb-2" />
                                                                <span className="text-purple-800 font-medium">Click to upload PDF/DOCX</span>
                                                                <span className="text-xs text-purple-500 mt-1">Max size 10MB</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Generate Button */}
                                    <button
                                        type="button"
                                        onClick={handleAiGenerate}
                                        disabled={isGenerating || (aiMode === 'topic' && !selectedTopic) || (aiMode === 'file' && (!ragFile || !selectedTopic))}
                                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-lg font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                {aiMode === 'file' ? 'Analyzing Document & Generating...' : 'Generating Questions...'}
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="w-5 h-5" />
                                                Generate Quiz Content
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- AI MODAL END --- */}


                    {/* Main Form */}
                    <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-8">

                        {/* 1. Quiz Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
                                <input
                                    type="text"
                                    value={quizTitle}
                                    onChange={(e) => setQuizTitle(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent outline-none transition"
                                    placeholder="e.g. Introduction to React Hooks"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={quizDescription}
                                    onChange={(e) => setQuizDescription(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent outline-none transition"
                                    rows="3"
                                    placeholder="Briefly describe what this quiz covers..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (mins)</label>
                                <input
                                    type="number"
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 my-6"></div>

                        {/* 2. Questions Section */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Questions ({questions.length})</h2>
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    Total Points: {questions.length * 10}
                                </span>
                            </div>

                            {questions.map((question, qIndex) => (
                                <div key={qIndex} className="bg-gray-50 border border-gray-200 rounded-xl p-6 relative group hover:border-[#4CBC9A] transition-colors">
                                    {/* Remove Button */}
                                    {questions.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeQuestion(qIndex)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                                            title="Remove Question"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}

                                    <div className="mb-4 pr-10">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Question {qIndex + 1}</label>
                                        <input
                                            type="text"
                                            name="questionText"
                                            placeholder="Enter your question here..."
                                            value={question.questionText}
                                            onChange={e => handleQuestionChange(qIndex, e)}
                                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] outline-none font-medium"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {question.options.map((option, oIndex) => (
                                            <div key={oIndex} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${question.correctAnswer === oIndex ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'bg-white border-gray-300'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name={`correct-${qIndex}`}
                                                    checked={question.correctAnswer === oIndex}
                                                    onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                                    className="w-5 h-5 text-[#4CBC9A] focus:ring-[#4CBC9A] cursor-pointer"
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={e => handleOptionChange(qIndex, oIndex, e)}
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    className="w-full bg-transparent border-none focus:ring-0 outline-none text-sm text-gray-700"
                                                    required
                                                />
                                                {question.correctAnswer === oIndex && (
                                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded ml-auto">Correct</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addQuestion}
                                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-[#4CBC9A] hover:text-[#4CBC9A] hover:bg-green-50 transition flex justify-center items-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Add Another Question
                            </button>
                        </div>

                        {/* 3. Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => navigate('/tutor-dashboard')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-[#4CBC9A] text-white font-bold rounded-lg hover:bg-[#3aa384] shadow-lg hover:shadow-xl transition disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving Quiz...
                                    </>
                                ) : 'Create & Publish Quiz'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateQuiz;