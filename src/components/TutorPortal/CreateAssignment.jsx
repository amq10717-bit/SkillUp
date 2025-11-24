import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { uploadToCloudinarySigned } from "../../utils/cloudinary";
import { generateAssignment, extractTopicsFromCourse } from "../../services/geminiService";
import { DocumentIcon, CalendarIcon, AcademicCapIcon, ClockIcon, UserGroupIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

const CreateAssignment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showAiModal, setShowAiModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
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
            setIsExtracting(true);
            try {
                const topics = await extractTopicsFromCourse(course.title, course.description);
                setExtractedTopics(topics);
                setAssignmentData(prev => ({
                    ...prev,
                    AssignmentTitle: `${course.title} Assignment`
                }));
            } catch (error) {
                console.error("Topic extraction failed:", error);
            } finally {
                setIsExtracting(false);
            }
        }
    };

    const handleAiGenerate = async () => {
        if (!selectedTopic) {
            alert("Please select a topic first.");
            return;
        }
        setIsGenerating(true);
        try {
            const course = myCourses.find(c => c.id === selectedCourseId);
            const courseName = course ? course.title : "";

            // Call updated gemini service that returns teacherSolution
            const aiResult = await generateAssignment(
                selectedTopic,
                selectedDifficulty,
                courseName
            );

            setAssignmentData(prev => ({
                ...prev,
                AssignmentTitle: aiResult.title || prev.AssignmentTitle,
                AssignmentDescription: aiResult.description || prev.AssignmentDescription,
                instructions: aiResult.instructions || prev.instructions,
                learningObjectives: aiResult.learningObjectives || [],
                totalMarks: aiResult.totalMarks || 100,
                estimatedDuration: aiResult.estimatedDuration || 60,
                // Automatically populate teacher solution
                teacherSolution: aiResult.teacherSolution || prev.teacherSolution
            }));

            setShowAiModal(false);
            alert("Assignment content generated successfully! Please review the details and teacher solution.");
        } catch (error) {
            console.error("AI generation error:", error);
            alert(error.message || "Failed to generate assignment content.");
        } finally {
            setIsGenerating(false);
        }
    };

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
        setAssignmentData(prev => ({
            ...prev,
            instructions: updatedInstructions
        }));
    };

    const addInstruction = () => {
        setAssignmentData(prev => ({
            ...prev,
            instructions: [...prev.instructions, ""]
        }));
    };

    const removeInstruction = (index) => {
        setAssignmentData(prev => ({
            ...prev,
            instructions: prev.instructions.filter((_, i) => i !== index)
        }));
    };

    const handleLearningObjectiveChange = (index, value) => {
        const updatedObjectives = [...assignmentData.learningObjectives];
        updatedObjectives[index] = value;
        setAssignmentData(prev => ({
            ...prev,
            learningObjectives: updatedObjectives
        }));
    };

    const addLearningObjective = () => {
        setAssignmentData(prev => ({
            ...prev,
            learningObjectives: [...prev.learningObjectives, ""]
        }));
    };

    const removeLearningObjective = (index) => {
        setAssignmentData(prev => ({
            ...prev,
            learningObjectives: prev.learningObjectives.filter((_, i) => i !== index)
        }));
    };

    const handleAttachmentUpload = async (file) => {
        try {
            setUploadProgress(0);
            const maxSize = 25 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error(`File size too large. Maximum size is 25MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            }
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'application/zip'
            ];
            if (!allowedTypes.includes(file.type)) {
                throw new Error(`File type not supported. Please upload PDF, Word, PowerPoint, Text, or ZIP files.`);
            }
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);
            const uploadData = await uploadToCloudinarySigned(file, "assignments");
            clearInterval(progressInterval);
            setUploadProgress(100);
            if (!uploadData.secure_url) {
                throw new Error("Upload failed - no URL returned");
            }
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
        if (!assignmentData.AssignmentTitle.trim()) {
            alert("Please enter an assignment title");
            return;
        }
        if (!assignmentData.courseId) {
            alert("Please select a course");
            return;
        }
        if (!assignmentData.DeadLine) {
            alert("Please set a deadline");
            return;
        }
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
                    const shouldContinue = window.confirm(
                        `File upload failed: ${uploadError.message}\n\nWould you like to create the assignment without the attachment?`
                    );
                    if (!shouldContinue) {
                        setLoading(false);
                        return;
                    }
                }
            }
            const assignmentPayload = {
                AssignmentTitle: assignmentData.AssignmentTitle.trim(),
                AssignmentDescription: assignmentData.AssignmentDescription.trim(),
                courseId: assignmentData.courseId,
                courseName: myCourses.find(c => c.id === assignmentData.courseId)?.title || "",
                DeadLine: assignmentData.DeadLine,
                estimatedDuration: assignmentData.estimatedDuration,
                attemptsLeft: assignmentData.attemptsLeft,
                allowLateSubmission: assignmentData.allowLateSubmission,
                lateSubmissionPenalty: assignmentData.lateSubmissionPenalty,
                totalMarks: assignmentData.totalMarks,
                questionsCount: assignmentData.questionsCount,
                assignmentType: assignmentData.assignmentType,
                priority: assignmentData.priority,
                submissionFormat: assignmentData.submissionFormat,
                teacherSolution: assignmentData.teacherSolution.trim(),
                instructions: assignmentData.instructions.filter(instruction => instruction.trim() !== ""),
                learningObjectives: assignmentData.learningObjectives.filter(objective => objective.trim() !== ""),
                resources: assignmentData.resources.trim(),
                isGroupAssignment: assignmentData.isGroupAssignment,
                maxGroupSize: assignmentData.isGroupAssignment ? assignmentData.maxGroupSize : 1,
                attachments: attachments,
                status: "active",
                visibility: assignmentData.visibility,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.displayName || user.email,
                createdByEmail: user.email
            };
            await addDoc(collection(db, "assignments"), assignmentPayload);
            alert("✅ Assignment created successfully!");
            navigate("/tutor-dashboard");
        } catch (error) {
            console.error("❌ Assignment creation error:", error);
            alert("Failed to create assignment: " + error.message);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    const maxDateString = maxDate.toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-16">
            <div className="max-w-6xl mx-auto px-[15px] lg:px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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

                    {showAiModal && (
                        <div className="p-4 lg:p-6 bg-purple-50 border-b border-purple-200 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-purple-800 text-lg">AI Assignment Generator</h3>
                                <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-gray-800 text-lg">✕</button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-2">Course *</label>
                                    <select
                                        className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
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
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-2">
                                        Topic {isExtracting && <span className="text-xs animate-pulse text-purple-600">(Extracting...)</span>}
                                    </label>
                                    <select
                                        className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-sm lg:text-base"
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        disabled={!selectedCourseId || isExtracting}
                                        required
                                    >
                                        <option value="">{extractedTopics.length > 0 ? 'Select Topic' : 'Choose course first'}</option>
                                        {extractedTopics.map((topic, index) => (
                                            <option key={index} value={topic}>{topic}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-2">Difficulty</label>
                                    <select
                                        className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
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
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !selectedTopic}
                                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm lg:text-base"
                            >
                                {isGenerating ? 'Generating Assignment...' : 'Generate Assignment Content'}
                            </button>
                        </div>
                    )}

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
                                    max={maxDateString}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (minutes)</label>
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                                <input
                                    type="number"
                                    name="totalMarks"
                                    value={assignmentData.totalMarks}
                                    onChange={handleNumberChange}
                                    min="1"
                                    max="1000"
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
                                    max="50"
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

                        <div className="border rounded-lg p-4 lg:p-6 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Learning Objectives</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                What students should be able to do after completing this assignment
                            </p>
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Description *</label>
                            <textarea
                                name="AssignmentDescription"
                                value={assignmentData.AssignmentDescription}
                                onChange={handleInputChange}
                                rows="6"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                required
                                placeholder="Provide a clear, well-structured overview of the assignment. Use clear paragraphs and sections to make it easy to read."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Tip: Break your description into clear paragraphs. Use blank lines to separate different sections.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Resources & References</label>
                            <textarea
                                name="resources"
                                value={assignmentData.resources}
                                onChange={handleInputChange}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                placeholder="Textbooks, websites, or other resources students might find helpful..."
                            />
                        </div>

                        {/* AI Grading Configuration Section */}
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
                                    placeholder="Paste the model answer or solution key here. The AI will use this text to calculate similarity scores for student submissions. You can also use the AI Assistant above to generate this automatically."
                                />
                                <p className="text-xs text-blue-600 mt-2">
                                    Tip: Provide a comprehensive answer. The more detailed the solution, the more accurate the AI grading assistance will be.
                                </p>
                            </div>
                        </div>

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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Group Size</label>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Visibility</label>
                                        <select
                                            name="visibility"
                                            value={assignmentData.visibility}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base bg-white"
                                        >
                                            <option value="draft">Draft (Hidden from students)</option>
                                            <option value="published">Published (Visible to students)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attachment {uploadProgress > 0 && `- Uploading... ${uploadProgress}%`}
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setAttachmentFile(e.target.files[0])}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                            />
                            {attachmentFile && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                                        <span className="font-medium truncate">{attachmentFile.name}</span>
                                        <span className="text-sm whitespace-nowrap">({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </div>
                                </div>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Supported formats: PDF, Word, PowerPoint, Text, ZIP (Max: 25MB)</p>
                        </div>

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
                                            Creating Assignment...
                                        </>
                                    ) : (
                                        'Publish Assignment'
                                    )}
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