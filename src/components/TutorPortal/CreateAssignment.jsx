import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { uploadToCloudinarySigned } from "../../utils/cloudinary";
// IMPORT THE NEW RAG FUNCTION HERE
import { generateAssignment, extractTopicsFromCourse, generateAssignmentWithRAG } from "../../services/geminiService";
import { DocumentIcon, AcademicCapIcon, PlusIcon, TrashIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

const CreateAssignment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // RAG & AI Config State
    const [aiMode, setAiMode] = useState('topic'); // 'topic' | 'file'
    const [ragFile, setRagFile] = useState(null); // The file for RAG context

    const [myCourses, setMyCourses] = useState([]);
    const [extractedTopics, setExtractedTopics] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate');

    const [assignmentData, setAssignmentData] = useState({
        AssignmentTitle: "",
        AssignmentDescription: "",
        DeadLine: "",
        totalMarks: 100,
        questionsCount: 1,
        attemptsLeft: 3,
        courseId: "",
        assignmentType: "homework",
        priority: "medium",
        estimatedDuration: 60,
        submissionFormat: "document",
        teacherSolution: "",
        instructions: [
            "Submit your work in PDF format",
            "Include your name and student ID on the first page",
            "Show all calculations and reasoning for full marks",
            "Cite all references used in your research",
            "Submit before the deadline to avoid penalties"
        ],
        learningObjectives: [],
        resources: "",
        isGroupAssignment: false,
        maxGroupSize: 1,
        allowLateSubmission: false,
        lateSubmissionPenalty: 0,
        visibility: "draft"
    });

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
                        description: doc.data().description,
                        code: doc.data().courseCode || doc.data().code
                    }));
                    setMyCourses(coursesData);
                } catch (error) {
                    console.error("Error fetching courses:", error);
                }
            }
        };
        fetchCourses();
    }, []);

    const handleCourseChange = async (e) => {
        const courseId = e.target.value;
        setSelectedCourseId(courseId);
        setAssignmentData(prev => ({ ...prev, courseId }));
        setExtractedTopics([]);
        setSelectedTopic('');

        if (!courseId) return;

        const course = myCourses.find(c => c.id === courseId);
        if (course) {
            // Only auto-extract topics if we are in topic mode
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

            // Set default title
            setAssignmentData(prev => ({
                ...prev,
                AssignmentTitle: `${course.title} Assignment`
            }));
        }
    };

    // --- MODIFIED AI GENERATION HANDLER ---
    const handleAiGenerate = async () => {
        // Validation
        if (aiMode === 'topic' && !selectedTopic) {
            alert("Please select a topic first.");
            return;
        }
        if (aiMode === 'file' && !ragFile) {
            alert("Please upload a document for RAG analysis.");
            return;
        }
        if (aiMode === 'file' && !selectedTopic) {
            alert("Please enter instructions for the assignment generation.");
            return;
        }

        setIsGenerating(true);
        try {
            const course = myCourses.find(c => c.id === selectedCourseId);
            const courseName = course ? course.title : "";
            let aiResult;

            if (aiMode === 'file') {
                // --- RAG FLOW ---
                console.log("🚀 Starting RAG Generation...");
                // Call the RAG service function (frontend -> backend)
                // selectedTopic acts as the "Instruction" here
                aiResult = await generateAssignmentWithRAG(ragFile, selectedTopic, selectedDifficulty);
            } else {
                // --- STANDARD FLOW ---
                console.log("✨ Starting Standard AI Generation...");
                aiResult = await generateAssignment(
                    selectedTopic,
                    selectedDifficulty,
                    courseName
                );
            }

            // Populate Form
            setAssignmentData(prev => ({
                ...prev,
                AssignmentTitle: aiResult.title || prev.AssignmentTitle,
                AssignmentDescription: aiResult.description || prev.AssignmentDescription,
                instructions: aiResult.instructions || prev.instructions,
                learningObjectives: aiResult.learningObjectives || [],
                totalMarks: aiResult.totalMarks || 100,
                estimatedDuration: aiResult.estimatedDuration || 60,
                teacherSolution: aiResult.teacherSolution || prev.teacherSolution
            }));

            setShowAiModal(false);
            setRagFile(null); // Reset file
            alert("Assignment generated successfully using " + (aiMode === 'file' ? "Document Context!" : "Course Topics!"));

        } catch (error) {
            console.error("AI generation error:", error);
            alert(error.message || "Failed to generate assignment content.");
        } finally {
            setIsGenerating(false);
        }
    };

    // ... (Existing input handlers remain unchanged)
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setAssignmentData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setAssignmentData(prev => ({
            ...prev,
            [name]: value === '' ? '' : Number(value)
        }));
    };

    const handleInstructionChange = (index, value) => {
        const updatedInstructions = [...assignmentData.instructions];
        updatedInstructions[index] = value;
        setAssignmentData(prev => ({ ...prev, instructions: updatedInstructions }));
    };

    const addInstruction = () => {
        setAssignmentData(prev => ({ ...prev, instructions: [...prev.instructions, ""] }));
    };

    const removeInstruction = (index) => {
        setAssignmentData(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }));
    };

    const handleLearningObjectiveChange = (index, value) => {
        const updatedObjectives = [...assignmentData.learningObjectives];
        updatedObjectives[index] = value;
        setAssignmentData(prev => ({ ...prev, learningObjectives: updatedObjectives }));
    };

    const addLearningObjective = () => {
        setAssignmentData(prev => ({ ...prev, learningObjectives: [...prev.learningObjectives, ""] }));
    };

    const removeLearningObjective = (index) => {
        setAssignmentData(prev => ({ ...prev, learningObjectives: prev.learningObjectives.filter((_, i) => i !== index) }));
    };

    const handleAttachmentUpload = async (file) => {
        try {
            setUploadProgress(0);
            const maxSize = 25 * 1024 * 1024;
            if (file.size > maxSize) throw new Error(`File too large. Max 25MB.`);

            const progressInterval = setInterval(() => {
                setUploadProgress(prev => (prev >= 90 ? prev : prev + 10));
            }, 200);

            const uploadData = await uploadToCloudinarySigned(file, "assignments");
            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!uploadData.secure_url) throw new Error("Upload failed");

            return {
                name: file.name,
                url: uploadData.secure_url,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                publicId: uploadData.public_id
            };
        } catch (error) {
            setUploadProgress(0);
            throw new Error(`Upload failed: ${error.message}`);
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        if (!assignmentData.AssignmentTitle.trim()) return alert("Please enter title");
        if (!assignmentData.courseId) return alert("Please select a course");
        if (!assignmentData.DeadLine) return alert("Please set a deadline");

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            let attachments = [];
            if (attachmentFile) {
                try {
                    const attachment = await handleAttachmentUpload(attachmentFile);
                    attachments = [attachment];
                } catch (uploadError) {
                    if (!window.confirm(`File upload failed: ${uploadError.message}\nContinue without attachment?`)) {
                        setLoading(false);
                        return;
                    }
                }
            }

            const assignmentPayload = {
                ...assignmentData,
                AssignmentTitle: assignmentData.AssignmentTitle.trim(),
                AssignmentDescription: assignmentData.AssignmentDescription.trim(),
                courseName: myCourses.find(c => c.id === assignmentData.courseId)?.title || "",
                instructions: assignmentData.instructions.filter(i => i.trim() !== ""),
                learningObjectives: assignmentData.learningObjectives.filter(o => o.trim() !== ""),
                resources: assignmentData.resources.trim(),
                teacherSolution: assignmentData.teacherSolution.trim(),
                maxGroupSize: assignmentData.isGroupAssignment ? assignmentData.maxGroupSize : 1,
                attachments: attachments,
                status: "active",
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.displayName || user.email,
                createdByEmail: user.email
            };

            await addDoc(collection(db, "assignments"), assignmentPayload);
            alert("✅ Assignment created successfully!");
            navigate("/tutor-dashboard");
        } catch (error) {
            console.error("Creation error:", error);
            alert("Failed to create: " + error.message);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-16">
            <div className="max-w-6xl mx-auto px-[15px] lg:px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#4CBC9A] to-[#6c5dd3] p-4 lg:p-6 text-white">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <AcademicCapIcon className="w-8 h-8 flex-shrink-0" />
                                <div>
                                    <h1 className="text-xl lg:text-2xl font-bold">Create New Assignment</h1>
                                    <p className="text-blue-100 mt-1 text-sm lg:text-base">Design comprehensive learning assignments</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAiModal(true)}
                                className="w-full lg:w-auto bg-white text-[#6c5dd3] px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-gray-100 transition flex items-center justify-center gap-2 text-sm lg:text-base"
                            >
                                <span className="text-lg">✨</span> AI Assistant
                            </button>
                        </div>
                    </div>

                    {/* --- AI MODAL START --- */}
                    {showAiModal && (
                        <div className="p-4 lg:p-6 bg-purple-50 border-b border-purple-200 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-purple-800 text-lg">AI Assignment Generator</h3>
                                <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-gray-800 text-lg">✕</button>
                            </div>

                            {/* Mode Selection Tabs */}
                            <div className="flex space-x-1 bg-purple-100 p-1 rounded-lg mb-6 w-full max-w-md">
                                <button
                                    onClick={() => {
                                        setAiMode('topic');
                                        setSelectedTopic(''); // Clear instruction/topic when switching
                                    }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${aiMode === 'topic'
                                        ? 'bg-white text-purple-700 shadow'
                                        : 'text-purple-600 hover:bg-purple-200'
                                        }`}
                                >
                                    From Course Topics
                                </button>
                                <button
                                    onClick={() => {
                                        setAiMode('file');
                                        setSelectedTopic(''); // Clear instruction/topic when switching
                                    }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${aiMode === 'file'
                                        ? 'bg-white text-purple-700 shadow'
                                        : 'text-purple-600 hover:bg-purple-200'
                                        }`}
                                >
                                    From Document (RAG)
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 ${aiMode === 'topic' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 mb-4`}>
                                {/* Course Selection - Only Visible in Topic Mode */}
                                {aiMode === 'topic' && (
                                    <div>
                                        <label className="block text-sm font-medium text-purple-900 mb-2">Course *</label>
                                        <select
                                            className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                                            value={selectedCourseId}
                                            onChange={handleCourseChange}
                                            required
                                        >
                                            <option value="">Select Course</option>
                                            {myCourses.map(course => (
                                                <option key={course.id} value={course.id}>
                                                    {course.code ? `${course.code} - ${course.title}` : course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Dynamic Middle Column */}
                                <div>
                                    {aiMode === 'topic' ? (
                                        <>
                                            <label className="block text-sm font-medium text-purple-900 mb-2">
                                                Select Topic {isExtracting && <span className="text-xs animate-pulse text-purple-600">(Extracting...)</span>}
                                            </label>
                                            <select
                                                className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-sm"
                                                value={selectedTopic}
                                                onChange={(e) => setSelectedTopic(e.target.value)}
                                                disabled={!selectedCourseId || isExtracting}
                                            >
                                                <option value="">{extractedTopics.length > 0 ? 'Select Topic' : 'Choose course first'}</option>
                                                {extractedTopics.map((topic, index) => (
                                                    <option key={index} value={topic}>{topic}</option>
                                                ))}
                                            </select>
                                        </>
                                    ) : (
                                        <>
                                            <label className="block text-sm font-medium text-purple-900 mb-2">
                                                Instructions for Assignment *
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                                                placeholder="e.g. Create a quiz from this file covering key concepts..."
                                                value={selectedTopic} // Reusing selectedTopic as instruction input
                                                onChange={(e) => setSelectedTopic(e.target.value)}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Common: Difficulty */}
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-2">Difficulty</label>
                                    <select
                                        className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                                        value={selectedDifficulty}
                                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                        <option value="Expert">Expert</option>
                                    </select>
                                </div>
                            </div>

                            {/* RAG File Upload Area */}
                            {aiMode === 'file' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-purple-900 mb-2">
                                        Upload Reference Document (PDF/TXT)
                                    </label>
                                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:bg-purple-50 transition-colors">
                                        <input
                                            type="file"
                                            id="ragFileUpload"
                                            accept=".pdf,.txt,.docx"
                                            className="hidden"
                                            onChange={(e) => setRagFile(e.target.files[0])}
                                        />
                                        <label htmlFor="ragFileUpload" className="cursor-pointer flex flex-col items-center">
                                            {ragFile ? (
                                                <>
                                                    <DocumentIcon className="w-10 h-10 text-purple-600 mb-2" />
                                                    <span className="text-purple-800 font-medium">{ragFile.name}</span>
                                                    <span className="text-xs text-purple-500">Click to change file</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CloudArrowUpIcon className="w-10 h-10 text-purple-400 mb-2" />
                                                    <span className="text-gray-600">Click to upload source document</span>
                                                    <span className="text-xs text-gray-400">PDF, Word or TXT files only</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating || (aiMode === 'topic' && !selectedTopic) || (aiMode === 'file' && (!ragFile || !selectedTopic))}
                                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm lg:text-base shadow-md"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        {aiMode === 'file' ? 'Analyzing Doc & Generating...' : 'Generating Assignment...'}
                                    </>
                                ) : (
                                    'Generate Assignment Content'
                                )}
                            </button>
                        </div>
                    )}
                    {/* --- AI MODAL END --- */}

                    {/* Standard Form Below */}
                    <form onSubmit={handleCreateAssignment} className="p-4 lg:p-6 space-y-6 lg:space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title *</label>
                                <input
                                    type="text"
                                    name="AssignmentTitle"
                                    value={assignmentData.AssignmentTitle}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                    required
                                    placeholder="Enter a clear and descriptive title"
                                />
                            </div>

                            {/* ... Rest of your existing form inputs (Course, Type, Deadline etc.) ... */}
                            {/* I am keeping the rest of the form exactly as you had it to save space, it is unchanged */}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                                <select
                                    name="courseId"
                                    value={assignmentData.courseId}
                                    onChange={handleCourseChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                    required
                                >
                                    <option value="">Select Course</option>
                                    {myCourses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.code ? `${course.code} - ${course.title}` : course.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
                                <select
                                    name="assignmentType"
                                    value={assignmentData.assignmentType}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                >
                                    <option value="homework">Homework</option>
                                    <option value="project">Project</option>
                                    <option value="quiz">Quiz</option>
                                    <option value="essay">Essay</option>
                                    <option value="presentation">Presentation</option>
                                    <option value="lab">Lab Work</option>
                                    <option value="research">Research Paper</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                                <input
                                    type="date"
                                    name="DeadLine"
                                    value={assignmentData.DeadLine}
                                    onChange={handleInputChange}
                                    min={today}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (mins)</label>
                                <input
                                    type="number"
                                    name="estimatedDuration"
                                    value={assignmentData.estimatedDuration}
                                    onChange={handleNumberChange}
                                    min="15"
                                    max="480"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Attempts Allowed</label>
                                <input
                                    type="number"
                                    name="attemptsLeft"
                                    value={assignmentData.attemptsLeft}
                                    onChange={handleNumberChange}
                                    min="1"
                                    max="10"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                />
                            </div>
                        </div>

                        {/* Marks & Priority */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                                <input
                                    type="number"
                                    name="totalMarks"
                                    value={assignmentData.totalMarks}
                                    onChange={handleNumberChange}
                                    min="1"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Questions Count</label>
                                <input
                                    type="number"
                                    name="questionsCount"
                                    value={assignmentData.questionsCount}
                                    onChange={handleNumberChange}
                                    min="1"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                                <select
                                    name="priority"
                                    value={assignmentData.priority}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="border rounded-lg p-4 lg:p-6 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Instructions</h3>
                            <div className="space-y-3">
                                {assignmentData.instructions.map((instruction, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={instruction}
                                                onChange={(e) => handleInstructionChange(index, e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                placeholder={`Instruction ${index + 1}`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeInstruction(index)}
                                            className="p-3 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                            disabled={assignmentData.instructions.length <= 1}
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addInstruction}
                                    className="flex items-center gap-2 text-[#4CBC9A] hover:text-[#3aa384] font-medium transition-colors text-sm lg:text-base"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add Another Instruction
                                </button>
                            </div>
                        </div>

                        {/* Learning Objectives */}
                        <div className="border rounded-lg p-4 lg:p-6 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Learning Objectives</h3>
                            <div className="space-y-3">
                                {assignmentData.learningObjectives.map((objective, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={objective}
                                                onChange={(e) => handleLearningObjectiveChange(index, e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                placeholder={`Learning objective ${index + 1}`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeLearningObjective(index)}
                                            className="p-3 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addLearningObjective}
                                    className="flex items-center gap-2 text-[#4CBC9A] hover:text-[#3aa384] font-medium transition-colors text-sm lg:text-base"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add Learning Objective
                                </button>
                            </div>
                        </div>

                        {/* Description & Resources */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Description *</label>
                            <textarea
                                name="AssignmentDescription"
                                value={assignmentData.AssignmentDescription}
                                onChange={handleInputChange}
                                rows="6"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                required
                                placeholder="Provide a clear, well-structured overview..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Resources</label>
                            <textarea
                                name="resources"
                                value={assignmentData.resources}
                                onChange={handleInputChange}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                placeholder="Textbooks, websites..."
                            />
                        </div>

                        {/* Teacher Solution (AI Grading) */}
                        <div className="border-t pt-6">
                            <div className="bg-blue-50 p-4 lg:p-6 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                                    <h3 className="text-lg font-bold text-blue-800">AI Grading Configuration</h3>
                                </div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Teacher's Solution / Answer Key
                                    <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">Hidden from Students</span>
                                </label>
                                <textarea
                                    name="teacherSolution"
                                    value={assignmentData.teacherSolution}
                                    onChange={handleInputChange}
                                    rows="8"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm lg:text-base font-mono bg-white"
                                    placeholder="Paste the model answer or solution key here. The AI will use this text to calculate similarity scores."
                                />
                            </div>
                        </div>

                        {/* Advanced Settings */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Advanced Settings</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isGroupAssignment"
                                            checked={assignmentData.isGroupAssignment}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-[#4CBC9A] focus:ring-[#4CBC9A] border-gray-300 rounded"
                                        />
                                        <label className="ml-2 text-sm font-medium text-gray-700">Group Assignment</label>
                                    </div>
                                    {assignmentData.isGroupAssignment && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Group Size</label>
                                            <input
                                                type="number"
                                                name="maxGroupSize"
                                                value={assignmentData.maxGroupSize}
                                                onChange={handleNumberChange}
                                                min="2"
                                                max="10"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent"
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="allowLateSubmission"
                                            checked={assignmentData.allowLateSubmission}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-[#4CBC9A] focus:ring-[#4CBC9A] border-gray-300 rounded"
                                        />
                                        <label className="ml-2 text-sm font-medium text-gray-700">Allow Late Submission</label>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Submission Format</label>
                                        <select
                                            name="submissionFormat"
                                            value={assignmentData.submissionFormat}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base bg-white"
                                        >
                                            <option value="document">Document (PDF, Word)</option>
                                            <option value="code">Code Files</option>
                                            <option value="presentation">Presentation</option>
                                            <option value="video">Video</option>
                                            <option value="multiple">Multiple Formats</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                                        <select
                                            name="visibility"
                                            value={assignmentData.visibility}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base bg-white"
                                        >
                                            <option value="draft">Draft (Hidden)</option>
                                            <option value="published">Published (Visible)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Standard File Attachment (Non-RAG) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assignment Attachment {uploadProgress > 0 && `- Uploading... ${uploadProgress}%`}
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setAttachmentFile(e.target.files[0])}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                            />
                            {attachmentFile && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                                    <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium truncate">{attachmentFile.name}</span>
                                    <span className="text-sm whitespace-nowrap">({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                            )}
                        </div>

                        {/* Form Buttons */}
                        <div className="flex flex-col-reverse lg:flex-row gap-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => navigate("/tutor-dashboard")}
                                className="w-full lg:w-auto px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm lg:text-base"
                            >
                                Cancel
                            </button>
                            <div className="flex-1 flex flex-col sm:flex-row gap-4">
                                <button
                                    type="button"
                                    onClick={() => setAssignmentData(prev => ({ ...prev, visibility: 'draft' }))}
                                    className="w-full sm:w-auto px-8 py-3 border border-gray-300 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm lg:text-base"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 text-sm lg:text-base"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Creating...
                                        </>
                                    ) : 'Publish Assignment'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateAssignment;