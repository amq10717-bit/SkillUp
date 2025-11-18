// src/pages/CourseModules.jsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function CourseModules() {
    const navigate = useNavigate();
    const location = useLocation();

    const initialModules = location.state?.modules || [];

    const [modules, setModules] = useState(initialModules);
    const [expandedModule, setExpandedModule] = useState(null);

    const handleModuleEdit = (id, value) => {
        setModules(prevModules =>
            prevModules.map(module =>
                module.id === id ? { ...module, name: value } : module
            )
        );
    };

    const toggleModule = (id) => {
        setExpandedModule(expandedModule === id ? null : id);
    };

    const handleConfirm = () => {
        console.log('Modules confirmed:', modules);
        // Navigate to the next page, passing the confirmed modules and original course info
        navigate('/add-course/module-details', {
            state: {
                modules: modules,
                courseInfo: location.state?.courseInfo
            }
        });
    };

    if (modules.length === 0) {
        return (
            <div className="min-h-screen mt-30 mb-30">
                <div className="max-w-6xl mx-auto pt-20 p-4 flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold mb-4">No Modules Generated</h1>
                    <p className="text-gray-600 mb-4">
                        Please go back and generate course modules first.
                    </p>
                    <button
                        onClick={() => navigate('/add-course')}
                        className="btn-primary px-6 py-2"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-30 mb-30">
            {/* Header Section */}
            <div className='max-w-6xl mx-auto flex flex-row justify-between items-center p-4'>
                <h1 className='heading-text-lg'>
                    Generate your course in 4 easy steps!
                </h1>
                <div className="flex items-center gap-4 text-[15px] text-black ">
                    <i className="fas fa-calendar-alt cursor-pointer"></i>
                    <i className="fas fa-bookmark cursor-pointer"></i>
                    <i className="fas fa-share-alt cursor-pointer"></i>
                </div>
            </div>

            {/* Progress Steps Component */}
            <div className="flex justify-center pt-10">
                {/* Step 1 - Completed */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="z-10 w-16 h-16 bg-BgPrimary rounded-full flex items-center justify-center text-white text-xl font-bold">
                        1
                    </div>
                    <div className="absolute top-0 w-20 h-10 border-2 border-hoverGreen rounded-t-full border-b-0"></div>
                    <div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white border-1 border-hoverGreen rounded-full"></div>
                </div>
                {/* Step 2 - Active */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="z-10 w-16 h-16 bg-BgPrimary rounded-full flex items-center justify-center text-white text-xl font-bold">
                        2
                    </div>
                    <div className="absolute bottom-0 w-20 h-10 border-2 border-hoverGreen rounded-b-full border-t-0"></div>
                    <div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white border-1 z-1 border-hoverGreen rounded-full"></div>
                </div>
                {/* Step 3 - Inactive */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="z-10 w-16 h-16 bg-BgSecondary rounded-full flex items-center justify-center text-black text-xl font-bold">
                        3
                    </div>
                    <div className="absolute top-0 w-20 h-10 border-2 border-hoverLightGreen rounded-t-full border-b-0"></div>
                    <div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white z-1 border-1 border-hoverLightGreen rounded-full"></div>
                </div>
                {/* Step 4 - Inactive */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="z-10 w-16 h-16 bg-BgSecondary rounded-full flex items-center justify-center text-black text-xl font-bold">
                        4
                    </div>
                    <div className="absolute bottom-0 w-20 h-10 border-2 border-hoverLightGreen rounded-b-full border-t-0"></div>
                    <div className="absolute -left-[2.9px] bottom-[35px] w-2 h-2 bg-white z-1 border-1 border-hoverLightGreen rounded-full"></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className='max-w-6xl mx-auto pt-20 p-4 flex flex-col'>
                <h1 className='text-2xl font-bold pb-10'>
                    Review and Edit Your Course Modules
                </h1>

                <div className="space-y-4 mb-8">
                    <p className="text-gray-700">
                        Below are the modules generated based on your course description. You can review and edit each module name as needed.
                    </p>
                </div>

                {/* Modules List */}
                <div className="space-y-4">
                    {modules.map((module) => (
                        <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div
                                className="bg-BgGreyColor p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleModule(module.id)}
                            >
                                <div className="flex items-center space-x-4 flex-1">
                                    <span className="text-lg font-semibold text-gray-500 w-8">
                                        {module.id}.
                                    </span>
                                    <input
                                        type="text"
                                        value={module.name}
                                        onChange={(e) => handleModuleEdit(module.id, e.target.value)}
                                        className="bg-transparent border-none text-lg font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1 w-full"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">
                                        {expandedModule === module.id ? 'Collapse' : 'Expand'}
                                    </span>
                                    <i className={`fas fa-chevron-${expandedModule === module.id ? 'up' : 'down'} text-gray-500`}></i>
                                </div>
                            </div>

                            {expandedModule === module.id && (
                                <div className="p-4 bg-white border-t border-gray-200">
                                    <div className="text-sm text-gray-500">
                                        Module name updated successfully. You can continue editing if needed.
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-200">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="btn-primary px-8 py-3"
                    >
                        Confirm Modules & Generate Full Course
                    </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start">
                        <i className="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                        <div>
                            <h4 className="font-semibold text-blue-800">Next Steps</h4>
                            <p className="text-blue-700 text-sm mt-1">
                                After confirming, we'll generate the complete course structure including lessons, materials, and assessments for each module.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseModules;