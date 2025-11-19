import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { uploadToCloudinarySigned } from "../../utils/cloudinary";
// Import AI services
import { generateAssignment, extractTopicsFromCourse } from "../../services/geminiService";

const CreateAssignment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);

    // --- AI STATE ---
    const [showAiModal, setShowAiModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [myCourses, setMyCourses] = useState([]);
    const [extractedTopics, setExtractedTopics] = useState([]);

    // AI Selections
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate');

    // Form Data
    const [assignmentData, setAssignmentData] = useState({
        AssignmentTitle: "",
        AssignmentDescription: "",
        DeadLine: "",
        totalMarks: 100,
        questionsCount: 1,
        attemptsLeft: 3,
    });

    // 1. Fetch Tutor's Courses on Load (For AI Context)
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
        setExtractedTopics([]);
        setSelectedTopic('');

        if (!courseId) return;

        const course = myCourses.find(c => c.id === courseId);
        if (course) {
            setIsExtracting(true);
            try {
                const topics = await extractTopicsFromCourse(course.title, course.description);
                setExtractedTopics(topics);
            } catch (error) {
                alert("Could not extract topics. Manual entry required.");
            } finally {
                setIsExtracting(false);
            }
        }
    };

    // 3. Generate Assignment Content
    const handleAiGenerate = async () => {
        if (!selectedTopic) return alert("Please select a topic.");

        setIsGenerating(true);
        try {
            const course = myCourses.find(c => c.id === selectedCourseId);
            const courseName = course ? course.title : "";

            const aiResult = await generateAssignment(
                selectedTopic,
                selectedDifficulty,
                courseName
            );

            // Populate the form with AI Data
            setAssignmentData(prev => ({
                ...prev,
                AssignmentTitle: aiResult.title,
                AssignmentDescription: aiResult.description,
                totalMarks: aiResult.totalMarks || 100
            }));

            setShowAiModal(false);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Existing Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAssignmentData(prev => ({ ...prev, [name]: value }));
    };

    const handleAttachmentUpload = async (file) => {
        const uploadData = await uploadToCloudinarySigned(file);
        return {
            name: file.name,
            url: uploadData?.secure_url,
            type: file.type || uploadData?.resource_type,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        };
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            let attachments = [];
            if (attachmentFile) {
                const attachment = await handleAttachmentUpload(attachmentFile);
                attachments = [attachment];
            }

            await addDoc(collection(db, "assignments"), {
                ...assignmentData,
                totalMarks: Number(assignmentData.totalMarks),
                questionsCount: Number(assignmentData.questionsCount),
                attemptsLeft: Number(assignmentData.attemptsLeft),
                attachments,
                status: "active",
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.displayName || "Tutor",
            });
            alert("✅ Assignment created successfully!");
            navigate("/tutor-dashboard");
        } catch (error) {
            alert("❌ Failed to create assignment: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 mt-20 pb-10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#4CBC9A] to-[#6c5dd3] p-6 text-white flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Create New Assignment</h1>
                            <p className="text-blue-100 mt-1">Fill details below or use AI Assistant</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAiModal(true)}
                            className="bg-white text-[#6c5dd3] px-4 py-2 rounded-lg font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-2"
                        >
                            ✨ AI Assistant
                        </button>
                    </div>

                    {/* --- AI MODAL --- */}
                    {showAiModal && (
                        <div className="p-6 bg-purple-50 border-b border-purple-200 animate-fade-in">
                            <div className="flex justify-between mb-4">
                                <h3 className="font-bold text-purple-800 text-lg">Generate Assignment from Course</h3>
                                <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-gray-800">✕</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Course Select */}
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">Course</label>
                                    <select
                                        className="w-full p-2 border border-purple-200 rounded-md bg-white"
                                        value={selectedCourseId}
                                        onChange={handleCourseChange}
                                    >
                                        <option value="">Select Course</option>
                                        {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>

                                {/* Topic Select */}
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">
                                        Topic {isExtracting && <span className="text-xs animate-pulse">...</span>}
                                    </label>
                                    <select
                                        className="w-full p-2 border border-purple-200 rounded-md bg-white disabled:bg-gray-100"
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        disabled={!selectedCourseId || isExtracting}
                                    >
                                        <option value="">{extractedTopics.length > 0 ? 'Select Topic' : 'Waiting...'}</option>
                                        {extractedTopics.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                {/* Difficulty */}
                                <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">Difficulty</label>
                                    <select
                                        className="w-full p-2 border border-purple-200 rounded-md bg-white"
                                        value={selectedDifficulty}
                                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    >
                                        <option>Beginner</option>
                                        <option>Intermediate</option>
                                        <option>Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !selectedTopic}
                                className="mt-4 w-full bg-purple-600 text-white py-2 rounded-md font-bold hover:bg-purple-700 disabled:opacity-50 transition"
                            >
                                {isGenerating ? 'Generating Assignment...' : 'Generate Assignment Content'}
                            </button>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleCreateAssignment} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title *</label>
                                <input type="text" name="AssignmentTitle" value={assignmentData.AssignmentTitle} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" required placeholder="Enter title" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                                <input type="date" name="DeadLine" value={assignmentData.DeadLine} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                                <input type="number" name="totalMarks" value={assignmentData.totalMarks} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" min="1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Questions Count</label>
                                <input type="number" name="questionsCount" value={assignmentData.questionsCount} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" min="1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Attempts Allowed</label>
                                <input type="number" name="attemptsLeft" value={assignmentData.attemptsLeft} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" min="1" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Description *</label>
                            <textarea name="AssignmentDescription" value={assignmentData.AssignmentDescription} onChange={handleInputChange} rows="6" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" required placeholder="Describe the assignment..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                            <input type="file" onChange={(e) => setAttachmentFile(e.target.files[0])} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]" />
                            {attachmentFile && <div className="mt-2 text-green-600 text-sm">Selected: {attachmentFile.name}</div>}
                        </div>

                        <div className="flex gap-3 pt-6 border-t">
                            <button type="submit" disabled={loading} className="flex-1 bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 font-medium">
                                {loading ? "Creating..." : "Create Assignment"}
                            </button>
                            <button type="button" onClick={() => navigate("/tutor-dashboard")} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateAssignment;