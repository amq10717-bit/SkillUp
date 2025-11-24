import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// Import avatar images
import avatar1 from '../../assets/avatar.png';
import avatar2 from '../../assets/avatar12.png';
import avatar3 from '../../assets/avatar13.png';
import avatar4 from '../../assets/avatar4.png';
import avatar5 from '../../assets/avatar5.png';
import avatar6 from '../../assets/avatar6.png';

function ProfileSettings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    // User data state
    const [userData, setUserData] = useState({
        displayName: '',
        email: '',
        phone: '',
        bio: '',
        location: '',
        website: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const navigate = useNavigate();

    // Avatar options
    const avatars = [
        { id: 1, src: avatar1, alt: 'Avatar 1' },
        { id: 2, src: avatar2, alt: 'Avatar 2' },
        { id: 3, src: avatar3, alt: 'Avatar 3' },
        { id: 4, src: avatar4, alt: 'Avatar 4' },
        { id: 5, src: avatar5, alt: 'Avatar 5' },
        { id: 6, src: avatar6, alt: 'Avatar 6' }
    ];

    // Initialize Firebase services
    const auth = getAuth();
    const db = getFirestore();

    // Load user data on component mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user);
            setCurrentUser(user);

            if (user) {
                await loadUserData(user);
            } else {
                // No user is logged in
                setLoading(false);
                setAuthChecked(true);
                // Redirect to login page since profile settings requires authentication
                navigate('/login-screen');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const loadUserData = async (user) => {
        try {
            console.log('Loading data for user:', user.uid);

            // Get basic auth data
            setUserData(prev => ({
                ...prev,
                displayName: user.displayName || '',
                email: user.email || ''
            }));

            // Set initial avatar from user's photoURL
            if (user.photoURL) {
                setSelectedAvatar(user.photoURL);
            }

            // Get additional user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            console.log('Firestore document exists:', userDoc.exists());

            if (userDoc.exists()) {
                const userDataFromDb = userDoc.data();
                console.log('User data from Firestore:', userDataFromDb);

                setUserData(prev => ({
                    ...prev,
                    displayName: userDataFromDb.displayName || user.displayName || '',
                    email: userDataFromDb.email || user.email || '',
                    phone: userDataFromDb.phone || '',
                    bio: userDataFromDb.bio || '',
                    location: userDataFromDb.location || '',
                    website: userDataFromDb.website || ''
                }));

                // Set avatar from Firestore if available
                if (userDataFromDb.photoURL) {
                    setSelectedAvatar(userDataFromDb.photoURL);
                } else if (user.photoURL) {
                    setSelectedAvatar(user.photoURL);
                }
            } else {
                console.log('No Firestore document found, creating one...');
                // Create user document if it doesn't exist
                await updateDoc(doc(db, 'users', user.uid), {
                    displayName: user.displayName || '',
                    email: user.email || '',
                    phone: '',
                    bio: '',
                    location: '',
                    website: '',
                    photoURL: user.photoURL || '',
                    updatedAt: new Date()
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showMessage('error', `Failed to load user data: ${error.message}`);
        } finally {
            setLoading(false);
            setAuthChecked(true);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarSelect = (avatarSrc) => {
        setSelectedAvatar(avatarSrc);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user authenticated');
            }

            console.log('Starting profile update...');

            const updates = {};

            // Update display name if changed
            if (userData.displayName !== user.displayName) {
                await updateProfile(user, {
                    displayName: userData.displayName
                });
                updates.displayName = userData.displayName;
            }

            // Update avatar if selected
            if (selectedAvatar && selectedAvatar !== user.photoURL) {
                await updateProfile(user, {
                    photoURL: selectedAvatar
                });
                updates.photoURL = selectedAvatar;
            }

            // Update additional user data in Firestore
            const firestoreUpdates = {
                displayName: userData.displayName,
                phone: userData.phone,
                bio: userData.bio,
                location: userData.location,
                website: userData.website,
                photoURL: selectedAvatar || user.photoURL || '',
                updatedAt: new Date()
            };

            console.log('Updating Firestore with:', firestoreUpdates);
            await updateDoc(doc(db, 'users', user.uid), firestoreUpdates);

            showMessage('success', 'Profile updated successfully!');

        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage('error', `Failed to update profile: ${error.message}`);
        }
        setLoading(false);
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user authenticated');
            }

            if (userData.email === user.email) {
                showMessage('info', 'Email is already set to this address');
                setLoading(false);
                return;
            }

            await updateEmail(user, userData.email);

            // Update email in Firestore as well
            await updateDoc(doc(db, 'users', user.uid), {
                email: userData.email,
                updatedAt: new Date()
            });

            showMessage('success', 'Email updated successfully!');
        } catch (error) {
            console.error('Error updating email:', error);

            if (error.code === 'auth/requires-recent-login') {
                showMessage('error', 'Please re-authenticate to update your email. Sign out and sign in again.');
            } else {
                showMessage('error', `Failed to update email: ${error.message}`);
            }
        }
        setLoading(false);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();

        if (userData.newPassword !== userData.confirmPassword) {
            showMessage('error', 'New passwords do not match');
            return;
        }

        if (userData.newPassword.length < 6) {
            showMessage('error', 'Password should be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user authenticated');
            }

            console.log('Reauthenticating user...');

            // Re-authenticate user before password change
            const credential = EmailAuthProvider.credential(
                user.email,
                userData.currentPassword
            );
            await reauthenticateWithCredential(user, credential);

            console.log('Updating password...');

            // Update password
            await updatePassword(user, userData.newPassword);

            // Clear password fields
            setUserData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

            showMessage('success', 'Password updated successfully!');
        } catch (error) {
            console.error('Error updating password:', error);

            if (error.code === 'auth/wrong-password') {
                showMessage('error', 'Current password is incorrect');
            } else if (error.code === 'auth/requires-recent-login') {
                showMessage('error', 'Please re-authenticate to update your password. Sign out and sign in again.');
            } else {
                showMessage('error', `Failed to update password: ${error.message}`);
            }
        }
        setLoading(false);
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    // Show loading only during initial auth check
    if (loading && !authChecked) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading user data...</div>
                </div>
            </div>
        );
    }

    // If auth is checked and no user, don't show anything (will redirect)
    if (authChecked && !currentUser) {
        return null;
    }

    return (
        <div className="min-h-screen pt-[50px] my-10 lg:mt-30 lg:mb-30">
            <div className='max-w-7xl mx-auto px-[15px] lg:px-0'>
                {/* Header */}
                <div className='text-left mb-6 lg:mb-10'>
                    <h1 className='text-2xl lg:heading-text-lg font-bold font-poppins'>
                        Account Settings
                    </h1>
                    <p className='text-sm lg:text-base text-gray-600 mt-1 lg:mt-2'>Manage your account information and preferences</p>
                </div>

                {/* Main Content Grid */}
                <div className='flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:gap-8'>
                    {/* Sidebar Navigation */}
                    <div className='col-span-1 w-full'>
                        <div className='bg-white rounded-xl shadow-md p-4 lg:p-6 flex lg:flex-col gap-2 lg:gap-4 lg:sticky lg:top-25 overflow-x-auto no-scrollbar whitespace-nowrap lg:whitespace-normal'>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex-shrink-0 lg:w-full text-left px-4 py-2 lg:p-3 rounded-lg transition text-sm lg:text-base ${activeTab === 'profile'
                                    ? 'bg-[#4CBC9A] text-white'
                                    : 'bg-gray-50 lg:bg-transparent hover:bg-gray-100 lg:hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <i className="fas fa-user mr-2 lg:mr-3"></i>
                                Profile Information
                            </button>
                            <button
                                onClick={() => setActiveTab('email')}
                                className={`flex-shrink-0 lg:w-full text-left px-4 py-2 lg:p-3 rounded-lg transition text-sm lg:text-base ${activeTab === 'email'
                                    ? 'bg-[#4CBC9A] text-white'
                                    : 'bg-gray-50 lg:bg-transparent hover:bg-gray-100 lg:hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <i className="fas fa-envelope mr-2 lg:mr-3"></i>
                                Email Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('password')}
                                className={`flex-shrink-0 lg:w-full text-left px-4 py-2 lg:p-3 rounded-lg transition text-sm lg:text-base ${activeTab === 'password'
                                    ? 'bg-[#4CBC9A] text-white'
                                    : 'bg-gray-50 lg:bg-transparent hover:bg-gray-100 lg:hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <i className="fas fa-lock mr-2 lg:mr-3"></i>
                                Change Password
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className='col-span-1 lg:col-span-3 w-full'>
                        {/* Status Message */}
                        {message.text && (
                            <div className={`mb-6 p-3 lg:p-4 rounded-lg text-sm lg:text-base flex items-start ${message.type === 'success'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : message.type === 'error'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                <i className={`mt-0.5 mr-2 flex-shrink-0 ${message.type === 'success' ? 'fas fa-check-circle' :
                                    message.type === 'error' ? 'fas fa-exclamation-circle' :
                                        'fas fa-info-circle'
                                    }`}></i>
                                <span>{message.text}</span>
                            </div>
                        )}

                        {/* Profile Information Tab */}
                        {activeTab === 'profile' && (
                            <div className='bg-white rounded-xl shadow-md p-4 lg:p-8'>
                                <h2 className='text-xl lg:text-2xl font-bold mb-4 lg:mb-6'>Profile Information</h2>
                                <form onSubmit={handleProfileUpdate}>
                                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6'>
                                        {/* Avatar Selection */}
                                        <div className='col-span-1 lg:col-span-2'>
                                            <label className='block text-sm font-medium text-gray-700 mb-3'>
                                                Choose Avatar
                                            </label>
                                            <div className='flex flex-wrap gap-3 lg:gap-4 mb-4'>
                                                {avatars.map((avatar) => (
                                                    <div
                                                        key={avatar.id}
                                                        className={`cursor-pointer transform transition-all duration-200 ${selectedAvatar === avatar.src
                                                            ? 'ring-4 ring-[#4CBC9A] scale-110'
                                                            : 'hover:scale-105 hover:ring-2 hover:ring-gray-300'
                                                            } rounded-full p-1`}
                                                        onClick={() => handleAvatarSelect(avatar.src)}
                                                    >
                                                        <img
                                                            src={avatar.src}
                                                            alt={avatar.alt}
                                                            className="w-12 h-12 lg:w-16 lg:h-16 rounded-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs lg:text-sm text-gray-500">
                                                Click on an avatar to select it
                                            </p>
                                        </div>

                                        {/* Current Avatar Preview */}
                                        <div className='col-span-1 lg:col-span-2'>
                                            <label className='block text-sm font-medium text-gray-700 mb-3'>
                                                Selected Avatar Preview
                                            </label>
                                            <div className='flex items-center space-x-4 lg:space-x-6'>
                                                <div className='w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300 flex-shrink-0'>
                                                    {selectedAvatar ? (
                                                        <img
                                                            src={selectedAvatar}
                                                            alt="Selected Avatar"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                                            <i className="fas fa-user text-gray-400 text-2xl"></i>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs lg:text-sm text-gray-600">
                                                        This is how your avatar will appear to others
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Display Name */}
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="displayName"
                                                value={userData.displayName}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                required
                                            />
                                        </div>

                                        {/* Phone Number */}
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={userData.phone}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                            />
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={userData.location}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                            />
                                        </div>

                                        {/* Website */}
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Website
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={userData.website}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                            />
                                        </div>

                                        {/* Bio */}
                                        <div className='col-span-1 lg:col-span-2'>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Bio
                                            </label>
                                            <textarea
                                                name="bio"
                                                value={userData.bio}
                                                onChange={handleInputChange}
                                                rows="4"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                placeholder="Tell us about yourself..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full lg:w-auto disabled:opacity-50 flex items-center justify-center py-3 lg:py-2 px-6"
                                    >
                                        {loading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update Profile'
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Email Settings Tab */}
                        {activeTab === 'email' && (
                            <div className='bg-white rounded-xl shadow-md p-4 lg:p-8'>
                                <h2 className='text-xl lg:text-2xl font-bold mb-4 lg:mb-6'>Email Settings</h2>
                                <form onSubmit={handleEmailUpdate}>
                                    <div className='mb-6'>
                                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={userData.email}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                            required
                                        />
                                        <p className="text-xs lg:text-sm text-gray-500 mt-1">
                                            We'll send account-related emails to this address.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full lg:w-auto disabled:opacity-50 flex items-center justify-center py-3 lg:py-2 px-6"
                                    >
                                        {loading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update Email'
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Change Password Tab */}
                        {activeTab === 'password' && (
                            <div className='bg-white rounded-xl shadow-md p-4 lg:p-8'>
                                <h2 className='text-xl lg:text-2xl font-bold mb-4 lg:mb-6'>Change Password</h2>
                                <form onSubmit={handlePasswordUpdate}>
                                    <div className='space-y-4 mb-6'>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Current Password *
                                            </label>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                value={userData.currentPassword}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                New Password *
                                            </label>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={userData.newPassword}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                required
                                                minLength="6"
                                            />
                                        </div>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Confirm New Password *
                                            </label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={userData.confirmPassword}
                                                onChange={handleInputChange}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] focus:border-transparent text-sm lg:text-base"
                                                required
                                                minLength="6"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full lg:w-auto disabled:opacity-50 flex items-center justify-center py-3 lg:py-2 px-6"
                                    >
                                        {loading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                                Updating...
                                            </>
                                        ) : (
                                            'Change Password'
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileSettings;