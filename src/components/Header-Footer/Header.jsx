import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore,
    doc,
    onSnapshot,
    updateDoc,
    collection,
    query,
    where,
    deleteDoc, // Added for reset function
    getDocs   // Added for reset function
} from 'firebase/firestore';
import { auth } from '../../firebase';
import logo from '../../assets/logo.png';
import defaultAvatar from '../../assets/avatar.png';
import PaymentModal from '../Payment/PaymentModal';

export default function Header() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // --- STATE FOR PAYMENT & CREDITS ---
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [enrolledCount, setEnrolledCount] = useState(0);

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const db = getFirestore();

    // 1. Load User Data
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
                    if (doc.exists()) {
                        const userDataFromDb = doc.data();
                        setUserData({
                            uid: user.uid,
                            displayName: userDataFromDb.displayName || user.displayName || 'User',
                            email: userDataFromDb.email || user.email,
                            photoURL: userDataFromDb.photoURL || user.photoURL || defaultAvatar,
                            role: userDataFromDb.role || 'student',
                            subscriptionStatus: userDataFromDb.subscriptionStatus || 'free'
                        });
                    } else {
                        setUserData({
                            uid: user.uid,
                            displayName: user.displayName || 'User',
                            email: user.email,
                            photoURL: user.photoURL || defaultAvatar,
                            role: 'student',
                            subscriptionStatus: 'free'
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
    }, [db]);

    // 2. Load Enrollment Count (STRICT CHECK + DEBUGGING)
    useEffect(() => {
        if (userData && userData.uid && userData.role === 'student' && userData.subscriptionStatus === 'free') {

            const q = query(
                collection(db, 'enrollments'),
                where('studentId', '==', userData.uid)
            );

            const unsubscribeEnrollments = onSnapshot(q, (snapshot) => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const thisMonthEnrollments = snapshot.docs.filter(doc => {
                    const data = doc.data();

                    // Filter invalid data
                    if (!data.enrolledAt) return false;

                    let enrollmentDate;
                    if (data.enrolledAt.toDate) {
                        enrollmentDate = data.enrolledAt.toDate();
                    } else {
                        enrollmentDate = new Date(data.enrolledAt);
                    }

                    // Check strict equality
                    const isSameMonth = enrollmentDate.getMonth() === currentMonth;
                    const isSameYear = enrollmentDate.getFullYear() === currentYear;

                    return isSameMonth && isSameYear;
                });

                console.log(`[DEBUG] Found ${thisMonthEnrollments.length} enrollments for ${currentMonth + 1}/${currentYear}`);
                setEnrolledCount(thisMonthEnrollments.length);
            });

            return () => unsubscribeEnrollments();
        } else {
            setEnrolledCount(0);
        }
    }, [userData, db]);

    // --- DEV FUNCTION: RESET LIMIT ---
    const handleResetLimit = async () => {
        if (!userData || !window.confirm("Are you sure? This will delete ALL your enrollments to reset the counter.")) return;

        try {
            const q = query(collection(db, 'enrollments'), where('studentId', '==', userData.uid));
            const snapshot = await getDocs(q);

            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            alert("Enrollments reset! You should now have 5/5 credits.");
            setDropdownOpen(false);
        } catch (error) {
            console.error("Error resetting limit:", error);
            alert("Failed to reset limit.");
        }
    };

    const handlePaymentSuccess = async () => {
        try {
            if (userData && userData.uid) {
                const userRef = doc(db, 'users', userData.uid);
                await updateDoc(userRef, {
                    subscriptionStatus: 'pro',
                    proSince: new Date()
                });
                setIsPaymentModalOpen(false);
                alert("🎉 Congratulations! You are now a Pro member. You have unlimited access!");
            }
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("Payment successful, but failed to update profile. Please contact support.");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserData(null);
            navigate('/login-screen');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

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

        return [...commonItems, ...studentItems, ...tutorItems, ...adminItems].filter(item => item.show);
    };

    const navigationItems = getNavigationItems();

    const getPageTitle = () => {
        if (!userData) return 'Welcome';
        const currentPath = window.location.pathname;
        if (currentPath === '/profile') return 'My Profile';
        if (currentPath === '/private-chat') return 'Private Chat';
        if (userData.role === 'student') return 'Student Dashboard';
        if (userData.role === 'tutor') return 'Tutor Dashboard';
        if (userData.role === 'admin') return 'Admin Dashboard';
        return 'SkillUp';
    };

    // Calculate remaining (Ensure it doesn't go below 0)
    const coursesLeft = Math.max(0, 5 - enrolledCount);
    const isFreeStudent = userData && userData.role === 'student' && userData.subscriptionStatus === 'free';

    return (
        <div className="mt-auto">
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={handlePaymentSuccess}
                amount={15}
            />

            <div className="max-w-6xl mx-auto">
                {sidebarOpen && (
                    <div className="fixed inset-0 bg-black/80 z-40" onClick={() => setSidebarOpen(false)}></div>
                )}

                <div className={`fixed top-0 left-0 h-full w-64 lg:w-80 bg-white z-50 shadow-lg transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex justify-between items-center p-2 lg:p-4">
                        <Link to="/" className="flex items-center" onClick={() => setSidebarOpen(false)}>
                            <img src={logo} alt="Logo" className="w-28 lg:w-40" />
                        </Link>
                        <button onClick={() => setSidebarOpen(false)}>
                            <i className="fas fa-times cursor-pointer text-gray-600 text-lg lg:text-xl"></i>
                        </button>
                    </div>

                    <div className="space-y-2 lg:space-y-4 h-full overflow-y-auto pb-20 lg:pb-30">
                        <div className="bg-BgPrimary py-8 lg:py-15 relative">
                            {userData?.subscriptionStatus === 'pro' && (
                                <div className="absolute top-4 right-4 bg-[#FEC64F] text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm border border-white/20">
                                    PRO
                                </div>
                            )}

                            <div className="font-semibold text-white text-center pt-2 lg:pt-4">
                                {loading ? '...' : userData ? userData.displayName : 'Guest User'}
                            </div>
                            <div className="text-white text-center text-xs lg:text-sm opacity-90 mt-1">
                                {userData?.role === 'tutor' ? 'Tutor Account' : userData?.role === 'admin' ? 'Admin Account' : 'Student Account'}
                            </div>

                            {/* --- SIDEBAR CREDITS DISPLAY --- */}
                            {isFreeStudent && (
                                <div className="text-white/80 text-center text-xs mt-2 font-medium">
                                    <span className="bg-white/20 px-3 py-1 rounded-full">
                                        {coursesLeft} free courses left
                                    </span>
                                </div>
                            )}

                            <div className="absolute left-1/2 transform -translate-x-1/2 translate-y-1/5">
                                <img
                                    src={userData?.photoURL || defaultAvatar}
                                    alt="Avatar"
                                    className={`w-16 h-16 lg:w-24 lg:h-24 rounded-full border-4 ${userData?.subscriptionStatus === 'pro' ? 'border-[#FEC64F]' : 'border-white'} bg-white shadow-lg object-cover`}
                                    onError={(e) => { e.target.src = defaultAvatar; }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col p-2 lg:p-4 space-y-2 lg:space-y-3 mt-8 lg:mt-16 text-gray-700">
                            {isFreeStudent && (
                                <button
                                    onClick={() => {
                                        setSidebarOpen(false);
                                        setIsPaymentModalOpen(true);
                                    }}
                                    className="mb-4 w-full bg-gradient-to-r from-[#FEC64F] to-[#F59E0B] text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 animate-pulse"
                                >
                                    <i className="fas fa-crown"></i>
                                    Upgrade to PRO
                                </button>
                            )}

                            {userData ? (
                                <>
                                    {navigationItems.map((item, index) => (
                                        <Link key={index} to={item.path} onClick={() => setSidebarOpen(false)}>
                                            <SidebarItem icon={item.icon} text={item.text} />
                                        </Link>
                                    ))}
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

                        {userData && (
                            <div className="p-4 border-t border-gray-200">
                                <button
                                    onClick={() => { handleLogout(); setSidebarOpen(false); }}
                                    className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 w-full z-40 fixed top-0 left-0 right-0 mx-auto max-w-7xl">
                    <header className="bg-white p-2 lg:p-4 flex items-center justify-between shadow-lg rounded-t-0 rounded-b-xl lg:rounded-b-2xl">
                        <div className="flex-shrink-0">
                            <button onClick={() => setSidebarOpen(true)} className="text-lg lg:text-xl text-gray-700 hover:text-greenSmall transition-colors">
                                <i className="fas cursor-pointer fa-bars"></i>
                            </button>
                        </div>

                        <div className="flex-1 flex items-center justify-between gap-2 lg:gap-4 mx-2 lg:mx-4">
                            <div className="flex-shrink-0 hidden lg:block">
                                <h1 className="text-md font-bold text-gray-800 whitespace-nowrap">
                                    {getPageTitle()}
                                </h1>
                            </div>
                            <div className="flex-1 w-full lg:max-w-2xl">
                                <form className="w-full">
                                    <div className="relative">
                                        <input type="text" placeholder="Search courses..." className="pl-8 lg:pl-10 w-full rounded-md bg-BgGreyColor focus:outline-none focus:ring-2 focus:ring-greenSmall focus:border-transparent py-1.5 lg:py-2 px-3 lg:px-4 text-xs lg:text-sm" />
                                        <i className="fas fa-search absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 text-greenSmall text-xs lg:text-base"></i>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-3 text-gray-600 flex-shrink-0">

                            {/* --- HEADER CREDITS DISPLAY (DESKTOP) --- */}
                            {isFreeStudent && (
                                <div className="hidden lg:flex flex-col items-end mr-2">
                                    <span className="text-xs font-semibold text-gray-500">
                                        Free Plan
                                    </span>
                                    <span className={`text-xs font-bold ${coursesLeft === 0 ? 'text-red-500' : 'text-greenSmall'}`}>
                                        {coursesLeft}/5 Enrollments Left
                                    </span>
                                </div>
                            )}

                            {isFreeStudent && (
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="hidden lg:flex items-center gap-2 bg-[#FEC64F] hover:bg-[#F59E0B] text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm transition-all hover:scale-105"
                                >
                                    <i className="fas fa-crown"></i>
                                    <span>Go Pro</span>
                                </button>
                            )}

                            {userData?.subscriptionStatus === 'pro' && (
                                <div className="hidden lg:flex items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                    <i className="fas fa-check-circle"></i>
                                    <span>PRO USER</span>
                                </div>
                            )}

                            <div className="relative">
                                <i className="fas fa-bell cursor-pointer hover:text-greenSmall transition-colors text-base lg:text-lg"></i>
                                <span className="absolute -top-1 lg:-top-2 -right-1 lg:-right-2 bg-red-500 text-white rounded-full w-3 h-3 lg:w-4 lg:h-4 flex items-center justify-center text-[8px] lg:text-[10px]">3</span>
                            </div>

                            {userData && (
                                <div className="flex items-center gap-2">
                                    <img src={userData.photoURL || defaultAvatar} alt="User Avatar" className="w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-gray-300 object-cover flex-shrink-0" onError={(e) => { e.target.src = defaultAvatar; }} />
                                    <div className="hidden lg:flex flex-col items-start min-w-0">
                                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap truncate max-w-24">{userData.displayName}</span>
                                        <span className="text-xs text-gray-500 capitalize">{userData.role}</span>
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <i className="fas fa-cog cursor-pointer hover:text-greenSmall transition-colors text-base lg:text-lg" onClick={() => setDropdownOpen(!dropdownOpen)}></i>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-40 lg:w-48 bg-white shadow-lg rounded-lg border z-50">
                                        {userData ? (
                                            <>
                                                <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 text-xs lg:text-sm" onClick={() => setDropdownOpen(false)}>
                                                    <i className="fas fa-user w-4"></i> Profile
                                                </Link>

                                                {/* --- DEV TOOL: RESET LIMIT --- */}
                                                {isFreeStudent && (
                                                    <>
                                                        <div className="border-t border-gray-200"></div>
                                                        <button onClick={handleResetLimit} className="flex items-center gap-2 w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 text-xs lg:text-sm">
                                                            <i className="fas fa-trash-alt w-4"></i> Reset Limit (Dev)
                                                        </button>
                                                    </>
                                                )}

                                                <div className="border-t border-gray-200"></div>
                                                <button onClick={() => { handleLogout(); setDropdownOpen(false); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-xs lg:text-sm">
                                                    <i className="fas fa-sign-out-alt w-4"></i> Logout
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Link to="/login-screen" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 text-xs lg:text-sm" onClick={() => setDropdownOpen(false)}>
                                                    <i className="fas fa-sign-in-alt w-4"></i> Login
                                                </Link>
                                                <Link to="/registration-screen" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 text-xs lg:text-sm" onClick={() => setDropdownOpen(false)}>
                                                    <i className="fas fa-user-plus w-4"></i> Register
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

const SidebarItem = ({ icon, text }) => (
    <div className="flex items-center gap-3 cursor-pointer hover:text-greenSmall hover:bg-gray-50 p-2 lg:p-3 rounded-lg transition-all duration-200">
        <i className={`fas ${icon} w-5 text-center`}></i>
        <span className="font-medium text-sm lg:text-base">{text}</span>
    </div>
);