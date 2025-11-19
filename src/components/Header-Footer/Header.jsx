import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { auth } from '../../firebase';
import logo from '../../assets/logo.png';
import defaultAvatar from '../../assets/avatar.png';
import medal from '../../assets/Medal.png';

export default function Header() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Load user data on component mount with real-time listener
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const db = getFirestore();

                // Set up real-time listener for user document
                const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
                    if (doc.exists()) {
                        const userDataFromDb = doc.data();
                        setUserData({
                            displayName: userDataFromDb.displayName || user.displayName || 'User',
                            email: userDataFromDb.email || user.email,
                            photoURL: userDataFromDb.photoURL || user.photoURL || defaultAvatar,
                            role: userDataFromDb.role || 'student'
                        });
                    } else {
                        // Fallback to auth data if Firestore doc doesn't exist
                        setUserData({
                            displayName: user.displayName || 'User',
                            email: user.email,
                            photoURL: user.photoURL || defaultAvatar,
                            role: 'student'
                        });
                    }
                    setLoading(false);
                });

                return () => unsubscribeUser();
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // ✅ Logout handler
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserData(null);
            navigate('/login-screen');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Navigation items based on user role
    const getNavigationItems = () => {
        const commonItems = [
            { path: '/profile', icon: 'fa-user', text: 'My Profile', show: true },
            { path: '/private-chat', icon: 'fa-comments', text: 'Private Chat', show: true },
        ];

        const studentItems = [
            { path: '/student-dashboard', icon: 'fa-gauge', text: 'Dashboard', show: userData?.role === 'student' },
            { path: '/generated-courses', icon: 'fa-graduation-cap', text: 'My Courses', show: userData?.role === 'student' },
            { path: '/book-recomendation', icon: 'fa-book', text: 'Book Recommendation', show: userData?.role === 'student' },
            { path: '/instructors', icon: 'fa-chalkboard-user', text: 'Instructors', show: userData?.role === 'student' },
            { path: '/performance-analysis', icon: 'fa-chart-line', text: 'Performance Analysis', show: userData?.role === 'student' },
            { path: '/generated-courses', icon: 'fa-search', text: 'Browse Courses', show: userData?.role === 'student' },
        ];

        const tutorItems = [
            { path: '/tutor-dashboard', icon: 'fa-gauge', text: 'Tutor Dashboard', show: userData?.role === 'tutor' },
            { path: '/tutor/create-course', icon: 'fa-plus-circle', text: 'Create Course', show: userData?.role === 'tutor' },
            { path: '/tutor/student-progress', icon: 'fa-user-graduate', text: 'Student Progress', show: userData?.role === 'tutor' },
            { path: '/create-assignment', icon: 'fa-tasks', text: 'Create Assignment', show: userData?.role === 'tutor' },
            { path: '/create-quiz', icon: 'fa-question-circle', text: 'Create Quiz', show: userData?.role === 'tutor' },
            { path: '/instructors', icon: 'fa-users', text: 'All Instructors', show: userData?.role === 'tutor' },
        ];

        const adminItems = [
            { path: '/admin-dashboard', icon: 'fa-gauge', text: 'Admin Dashboard', show: userData?.role === 'admin' },
            { path: '/instructors', icon: 'fa-chalkboard-user', text: 'Manage Instructors', show: userData?.role === 'admin' },
            { path: '/courses-page', icon: 'fa-book', text: 'Manage Courses', show: userData?.role === 'admin' },
        ];

        return [
            ...commonItems,
            ...studentItems,
            ...tutorItems,
            ...adminItems
        ].filter(item => item.show);
    };

    const navigationItems = getNavigationItems();

    // Get page title based on current route and user role
    const getPageTitle = () => {
        if (!userData) return 'Welcome';

        const currentPath = window.location.pathname;

        // Common titles
        if (currentPath === '/profile') return 'My Profile';
        if (currentPath === '/private-chat') return 'Private Chat';

        // Role-specific titles
        if (userData.role === 'student') {
            if (currentPath === '/student-dashboard') return 'Student Dashboard';
            if (currentPath === '/generated-courses') return 'My Courses';
            if (currentPath === '/book-recomendation') return 'Book Recommendations';
            if (currentPath === '/instructors') return 'Instructors';
            if (currentPath === '/performance-analysis') return 'Performance Analysis';
            if (currentPath === '/courses-page') return 'Browse Courses';
        }

        if (userData.role === 'tutor') {
            if (currentPath === '/tutor-dashboard') return 'Tutor Dashboard';
            if (currentPath === '/tutor/create-course') return 'Create Course';
            if (currentPath === '/tutor/student-progress') return 'Student Progress';
            if (currentPath === '/create-assignment') return 'Create Assignment';
            if (currentPath === '/create-quiz') return 'Create Quiz';
            if (currentPath === '/instructors') return 'All Instructors';
        }

        if (userData.role === 'admin') {
            if (currentPath === '/admin-dashboard') return 'Admin Dashboard';
            if (currentPath === '/instructors') return 'Manage Instructors';
            if (currentPath === '/courses-page') return 'Manage Courses';
        }

        return userData.role === 'tutor' ? 'Tutor Dashboard' :
            userData.role === 'admin' ? 'Admin Dashboard' : 'Courses';
    };

    return (
        <div className="mt-auto">
            <div className="max-w-7xl mx-auto">
                {/* Sidebar Background Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/80 z-40"
                        onClick={() => setSidebarOpen(false)}
                    ></div>
                )}

                {/* Sidebar Menu */}
                <div
                    className={`fixed top-0 left-0 h-full w-80 bg-white z-100 shadow-lg transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="flex justify-between items-center p-4">
                        <Link to="/" className="flex items-center" onClick={() => setSidebarOpen(false)}>
                            <img src={logo} alt="Logo" className="w-40" />
                        </Link>
                        <button onClick={() => setSidebarOpen(false)}>
                            <i className="fas fa-times cursor-pointer text-gray-600 text-xl"></i>
                        </button>
                    </div>

                    <div className="space-y-4 h-full overflow-y-auto pb-30">
                        {/* User Profile Section */}
                        <div className="bg-BgPrimary py-15 relative">
                            <div className="font-semibold text-white text-center pt-4">
                                {loading ? (
                                    <div className="animate-pulse bg-white/20 h-6 w-32 mx-auto rounded"></div>
                                ) : userData ? (
                                    userData.displayName
                                ) : (
                                    'Guest User'
                                )}
                            </div>
                            <div className="text-white text-center text-sm opacity-90 mt-1">
                                {loading ? (
                                    <div className="animate-pulse bg-white/20 h-4 w-24 mx-auto rounded"></div>
                                ) : userData ? (
                                    userData.role === 'tutor' ? 'Tutor Account' :
                                        userData.role === 'admin' ? 'Admin Account' : 'Student Account'
                                ) : (
                                    'Please Log In'
                                )}
                            </div>
                            <div className="absolute left-1/2 transform -translate-x-1/2 translate-y-1/5">
                                {loading ? (
                                    <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-300 shadow-lg animate-pulse"></div>
                                ) : (
                                    <img
                                        src={userData?.photoURL || defaultAvatar}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg object-cover"
                                        onError={(e) => {
                                            e.target.src = defaultAvatar;
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex flex-col p-4 space-y-3 mt-16 text-gray-700">
                            {userData ? (
                                <>
                                    {/* Role-specific sections */}
                                    {userData.role === 'student' && (
                                        <div className="mb-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                                Student Portal
                                            </div>
                                            {navigationItems.filter(item =>
                                                ['/student-dashboard', '/generated-courses', '/book-recomendation', '/performance-analysis'].includes(item.path)
                                            ).map((item, index) => (
                                                <Link
                                                    key={index}
                                                    to={item.path}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    <SidebarItem icon={item.icon} text={item.text} />
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {userData.role === 'tutor' && (
                                        <div className="mb-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                                Tutor Portal
                                            </div>
                                            {navigationItems.filter(item =>
                                                ['/tutor-dashboard', '/tutor/create-course', '/tutor/student-progress', '/create-assignment', '/create-quiz'].includes(item.path)
                                            ).map((item, index) => (
                                                <Link
                                                    key={index}
                                                    to={item.path}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    <SidebarItem icon={item.icon} text={item.text} />
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {userData.role === 'admin' && (
                                        <div className="mb-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                                Admin Portal
                                            </div>
                                            {navigationItems.filter(item =>
                                                ['/admin-dashboard'].includes(item.path)
                                            ).map((item, index) => (
                                                <Link
                                                    key={index}
                                                    to={item.path}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    <SidebarItem icon={item.icon} text={item.text} />
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {/* Common items for all roles */}
                                    <div className="mb-2">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                            General
                                        </div>
                                        {navigationItems.filter(item =>
                                            ['/instructors', '/courses-page'].includes(item.path)
                                        ).map((item, index) => (
                                            <Link
                                                key={index}
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <SidebarItem icon={item.icon} text={item.text} />
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Communication & Profile */}
                                    <div className="mb-2">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                            Account
                                        </div>
                                        {navigationItems.filter(item =>
                                            ['/profile', '/private-chat'].includes(item.path)
                                        ).map((item, index) => (
                                            <Link
                                                key={index}
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <SidebarItem icon={item.icon} text={item.text} />
                                            </Link>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link to="/login-screen" onClick={() => setSidebarOpen(false)}>
                                        <SidebarItem icon="fa-sign-in-alt" text="Login" />
                                    </Link>
                                    <Link to="/registration-screen" onClick={() => setSidebarOpen(false)}>
                                        <SidebarItem icon="fa-user-plus" text="Register" />
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Upgrade Card - Only show for logged-in students */}
                        {userData && userData.role === 'student' && (
                            <div className="shadow-lg rounded-sm p-5 m-5 border border-gray-200">
                                <div className="flex flex-row justify-between items-start">
                                    <h1 className="font-poppins font-extrabold text-[18px] w-3/4">
                                        Upgrade your Account to Pro
                                    </h1>
                                    <img
                                        src={medal}
                                        alt="Medal"
                                        className="w-12 h-12 object-contain"
                                    />
                                </div>
                                <p className="font-poppins text-[14px] mt-3 mb-6 text-gray-600">
                                    Upgrade to premium to get exclusive features and unlimited access
                                </p>
                                <button className="btn-primary w-full">Upgrade to Pro</button>
                            </div>
                        )}

                        {/* Logout Button - Only show when logged in */}
                        {userData && (
                            <div className="p-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setSidebarOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Navbar */}
                <div className="flex-1 w-full z-99 fixed top-0 max-w-6xl">
                    <header className="bg-white p-4 flex items-center justify-between shadow-lg rounded-t-0 rounded-b-2xl">
                        {/* Left: Menu Icon */}
                        <div className="flex-shrink-0">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="text-xl text-gray-700 hover:text-greenSmall transition-colors"
                            >
                                <i className="fas cursor-pointer fa-bars"></i>
                            </button>
                        </div>

                        {/* Center: Title + Search */}
                        <div className="flex-1 flex items-center justify-between gap-4 mx-4">
                            {/* Page Title */}
                            <div className="flex-shrink-0">
                                <h1 className="text-md font-bold text-gray-800 whitespace-nowrap">
                                    {getPageTitle()}
                                </h1>
                            </div>

                            {/* Search Bar */}
                            <div className="flex-1 max-w-2xl">
                                <form className="w-full">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search courses, books, instructors..."
                                            className="pl-10 w-full rounded-md bg-BgGreyColor focus:outline-none focus:ring-2 focus:ring-greenSmall focus:border-transparent py-2 px-4 text-sm"
                                        />
                                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-greenSmall"></i>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Right: Icons and User Info */}
                        <div className="flex items-center gap-3 text-gray-600 flex-shrink-0">
                            {/* Notification Bell */}
                            <div className="relative">
                                <i className="fas fa-bell cursor-pointer hover:text-greenSmall transition-colors text-lg"></i>
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                                    3
                                </span>
                            </div>

                            {/* User Info */}
                            {userData && (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={userData.photoURL || defaultAvatar}
                                        alt="User Avatar"
                                        className="w-8 h-8 rounded-full border-2 border-gray-300 object-cover flex-shrink-0"
                                        onError={(e) => {
                                            e.target.src = defaultAvatar;
                                        }}
                                    />
                                    <div className="hidden lg:flex flex-col items-start min-w-0">
                                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap truncate max-w-24">
                                            {userData.displayName}
                                        </span>
                                        <span className="text-xs text-gray-500 capitalize">
                                            {userData.role}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Settings Dropdown */}
                            <div className="relative">
                                <i
                                    className="fas fa-cog cursor-pointer hover:text-greenSmall transition-colors text-lg"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                ></i>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border z-50">
                                        {userData ? (
                                            <>
                                                <Link
                                                    to="/profile"
                                                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    <i className="fas fa-user w-4"></i>
                                                    Profile
                                                </Link>
                                                <div className="border-t border-gray-200"></div>
                                                <button
                                                    onClick={() => {
                                                        handleLogout();
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm"
                                                >
                                                    <i className="fas fa-sign-out-alt w-4"></i>
                                                    Logout
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Link
                                                    to="/login-screen"
                                                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    <i className="fas fa-sign-in-alt w-4"></i>
                                                    Login
                                                </Link>
                                                <Link
                                                    to="/registration-screen"
                                                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    <i className="fas fa-user-plus w-4"></i>
                                                    Register
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                </div>
            </div>
        </div>
    );
}

// Sidebar Item Component
const SidebarItem = ({ icon, text }) => (
    <div className="flex items-center gap-3 cursor-pointer hover:text-greenSmall hover:bg-gray-50 p-3 rounded-lg transition-all duration-200">
        <i className={`fas ${icon} w-5 text-center`}></i>
        <span className="font-medium">{text}</span>
    </div>
);
