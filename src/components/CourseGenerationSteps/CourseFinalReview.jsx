import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

function CourseFinalReview() {
    const navigate = useNavigate();
    const location = useLocation();
    const { courseData, detailedModules } = location.state || {};
    const [saving, setSaving] = useState(false);

    if (!courseData) return <div>No Data</div>;

    const handleSave = async () => {
        setSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            const coursePayload = {
                title: courseData.title,
                description: courseData.description,
                difficulty: courseData.difficulty,
                modules: detailedModules,
                creatorId: user.uid,
                creatorRole: courseData.userRole,
                createdAt: serverTimestamp(),
                status: courseData.userRole === 'tutor' ? 'draft' : 'personal', // Distinction here
                enrolledCount: 0,
                rating: 0
            };

            await addDoc(collection(db, "courses"), coursePayload);

            alert(courseData.userRole === 'tutor'
                ? "Course Created Successfully! You can now publish it from your dashboard."
                : "Study Plan Generated! It has been saved to your dashboard.");

            navigate(courseData.userRole === 'tutor' ? '/tutor-dashboard' : '/student-dashboard');

        } catch (error) {
            console.error("Save Error:", error);
            alert("Failed to save course: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen my-10 lg:mt-30 lg:mb-30 font-poppins">
            {/* Header & Stepper (Step 4 Active) */}
            <div className='max-w-6xl mx-auto p-4'>
                <h1 className='text-2xl font-bold text-center mb-8'>Final Review</h1>
                {/* (Insert Stepper with Step 4 active here if desired) */}
            </div>

            <div className='max-w-4xl mx-auto px-4'>
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className={`p-6 text-white ${courseData.userRole === 'tutor' ? 'bg-[#6c5dd3]' : 'bg-[#4CBC9A]'}`}>
                        <h2 className="text-3xl font-bold">{courseData.title}</h2>
                        <p className="opacity-90 mt-2">{courseData.difficulty} Level • {detailedModules.length} Modules</p>
                    </div>

                    <div className="p-8">
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Description</h3>
                            <p className="text-gray-600">{courseData.description}</p>
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 mb-4">Curriculum Breakdown</h3>
                        <div className="space-y-4">
                            {detailedModules.map((mod, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-gray-800">{idx + 1}. {mod.title}</h4>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{mod.duration}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{mod.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {mod.topics.map((t, i) => (
                                            <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 flex gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex-1 py-4 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Edit Content
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`flex-1 text-white py-4 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1 
                                    ${courseData.userRole === 'tutor' ? 'bg-[#6c5dd3] hover:bg-[#5a4bbf]' : 'bg-[#4CBC9A] hover:bg-[#3aa384]'}`}
                            >
                                {saving ? 'Saving...' : (courseData.userRole === 'tutor' ? 'Create Course' : 'Save Study Plan')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseFinalReview;