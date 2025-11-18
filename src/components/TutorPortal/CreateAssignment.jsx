import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { uploadToCloudinarySigned } from "../../utils/cloudinary";

const CreateAssignment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);

    // Simplified state - only what we actually use in the form
    const [assignmentData, setAssignmentData] = useState({
        AssignmentTitle: "",
        AssignmentDescription: "",
        DeadLine: "",
        totalMarks: 100,
        questionsCount: 1,
        attemptsLeft: 3,
    });

    // Simple input handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAssignmentData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle file upload
    const handleAttachmentUpload = async (file) => {
        try {
            const uploadData = await uploadToCloudinarySigned(file);
            const raw = {
                name: file.name,
                url: uploadData?.secure_url,
                type: file.type || uploadData?.resource_type || undefined,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                public_id: uploadData?.public_id,
                format: uploadData?.format,
            };
            // Strip undefined fields to satisfy Firestore
            const sanitized = Object.fromEntries(
                Object.entries(raw).filter(([, v]) => v !== undefined)
            );
            return sanitized;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw error;
        }
    };

    // Submit assignment - CLEANED AND SIMPLIFIED
    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            // Upload attachment if exists
            let attachments = [];
            if (attachmentFile) {
                const attachment = await handleAttachmentUpload(attachmentFile);
                attachments = [attachment];
            }

            // Prepare Firestore document - ONLY DEFINED VALUES
            const assignmentToCreateRaw = {
                // Basic form data
                AssignmentTitle: assignmentData.AssignmentTitle,
                AssignmentDescription: assignmentData.AssignmentDescription,
                DeadLine: assignmentData.DeadLine,
                totalMarks: Number(assignmentData.totalMarks) || 100,
                questionsCount: Number(assignmentData.questionsCount) || 1,
                attemptsLeft: Number(assignmentData.attemptsLeft) || 3,

                // Arrays with default empty arrays (not undefined)
                objectives: [],
                guidelines: [],
                requirements: [],
                gradingCriteria: [{ category: "Correctness", percentage: 100 }],

                // File attachments
                attachments: attachments.map(att => (
                    Object.fromEntries(Object.entries(att).filter(([, v]) => v !== undefined))
                )),

                // System fields
                status: "active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.displayName || "Tutor",
                AssignmentId: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };

            const assignmentToCreate = Object.fromEntries(
                Object.entries(assignmentToCreateRaw).filter(([, v]) => v !== undefined)
            );

            console.log("Saving to Firestore:", assignmentToCreate); // Debug log

            // Save to Firestore
            await addDoc(collection(db, "assignments"), assignmentToCreate);

            alert("✅ Assignment created successfully!");
            navigate("/tutor-dashboard");
        } catch (error) {
            console.error("Error creating assignment:", error);
            alert("❌ Failed to create assignment: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setAssignmentData({
            AssignmentTitle: "",
            AssignmentDescription: "",
            DeadLine: "",
            totalMarks: 100,
            questionsCount: 1,
            attemptsLeft: 3,
        });
        setAttachmentFile(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#4CBC9A] to-[#6c5dd3] p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Create New Assignment</h1>
                                <p className="text-blue-100 mt-1">
                                    Fill in the details to create a new assignment
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/tutor-dashboard")}
                                className="text-white hover:text-blue-100 transition-colors"
                            >
                                <i className="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCreateAssignment} className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assignment Title *
                                </label>
                                <input
                                    type="text"
                                    name="AssignmentTitle"
                                    value={assignmentData.AssignmentTitle}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                                    required
                                    placeholder="Enter assignment title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Deadline *
                                </label>
                                <input
                                    type="date"
                                    name="DeadLine"
                                    value={assignmentData.DeadLine}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Numbers */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Total Marks
                                </label>
                                <input
                                    type="number"
                                    name="totalMarks"
                                    value={assignmentData.totalMarks}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Questions Count
                                </label>
                                <input
                                    type="number"
                                    name="questionsCount"
                                    value={assignmentData.questionsCount}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Attempts Allowed
                                </label>
                                <input
                                    type="number"
                                    name="attemptsLeft"
                                    value={assignmentData.attemptsLeft}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assignment Description *
                            </label>
                            <textarea
                                name="AssignmentDescription"
                                value={assignmentData.AssignmentDescription}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                                required
                                placeholder="Describe the assignment objectives and requirements..."
                            />
                        </div>

                        {/* Attachment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attachment (Optional)
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setAttachmentFile(e.target.files[0])}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A]"
                            />
                            {attachmentFile && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <i className="fas fa-paperclip text-green-600 mr-2"></i>
                                            <span className="text-sm font-medium">
                                                {attachmentFile.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachmentFile(null)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-6 border-t">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 font-medium"
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Creating Assignment...
                                    </>
                                ) : (
                                    "Create Assignment"
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/tutor-dashboard")}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateAssignment;