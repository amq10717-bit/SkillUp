import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import student from '../../assets/student.png';
import tutor from '../../assets/tutor.png';

const RoleSelection = () => {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null);

    const roles = [
        {
            title: 'Student',
            description: 'Join to learn new skills, access courses, and track your progress',
            color: 'from-[#4CBC9A] to-[#3aa37f]',
            image: student,
            path: '/login-screen'
        },
        {
            title: 'Tutor',
            description: 'Share your knowledge, create courses, and guide learners',
            color: 'from-[#FF6B6B] to-[#FF8E53]',
            image: tutor,
            path: '/login-screen'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center py-12 px-[15px] lg:p-4 lg:pt-30 lg:pb-30">
            <div className="text-center max-w-6xl w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-3xl lg:text-5xl font-bold text-white mb-3 lg:mb-4">
                        Welcome to <span className="text-[#4CBC9A]">SkillUp</span>
                    </h1>
                    <p className="text-base lg:text-xl text-gray-300 mb-8 lg:mb-12">
                        Begin your educational journey as a learner or educator
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 lg:px-4">
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.2, duration: 0.5 }}
                            className={`relative group cursor-pointer transition-transform duration-300 ${selectedRole === role.title ? 'scale-[1.02]' : 'hover:scale-105'
                                }`}
                            onClick={() => setSelectedRole(role.title)}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${role.color} rounded-3xl 
            transition-all duration-300 shadow-xl ${selectedRole === role.title
                                    ? 'opacity-100 shadow-2xl'
                                    : 'opacity-90 group-hover:opacity-100'
                                }`}
                            />

                            {/* Card Content: Auto height on mobile, fixed 500px on desktop */}
                            <div className="relative p-6 lg:p-8 min-h-[350px] lg:h-[500px] flex flex-col items-center justify-center">
                                <motion.div
                                    className="mb-6 lg:mb-8 w-full flex justify-center"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <img
                                        src={role.image}
                                        alt={role.title}
                                        className="w-24 lg:w-34 object-contain drop-shadow-2xl"
                                    />
                                </motion.div>

                                <div className="space-y-2 lg:space-y-4">
                                    <h2 className="text-2xl lg:text-4xl font-bold text-white mb-2">
                                        {role.title}
                                    </h2>
                                    <p className="text-sm lg:text-lg text-gray-200 px-2 lg:px-8">
                                        {role.description}
                                    </p>
                                </div>

                                {selectedRole === role.title && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        // Mobile: Relative position with margin. Desktop: Absolute bottom position.
                                        className="relative mt-6 w-full px-0 lg:absolute lg:bottom-8 lg:mt-0 lg:px-8"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent double triggering if parent has click
                                                navigate(role.path);
                                            }}
                                            className="w-full bg-white text-gray-900 px-6 py-3 lg:px-8 lg:py-4 rounded-xl 
                      font-semibold hover:bg-opacity-90 transition-all flex items-center 
                      justify-center gap-2 shadow-lg text-base lg:text-xl"
                                        >
                                            <span>Continue as {role.title}</span>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 lg:h-6 lg:w-6"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                />
                                            </svg>
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-8 lg:mt-12 text-gray-400 text-sm lg:text-base"
                >
                    <p>
                        Are you an administrator?
                        <button
                            onClick={() => navigate('/admin-login')}
                            className="ml-2 text-[#4CBC9A] hover:underline font-medium"
                        >
                            Login as Admin
                        </button>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default RoleSelection;