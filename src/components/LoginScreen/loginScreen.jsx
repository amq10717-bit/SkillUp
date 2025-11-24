import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import logoWhite from '../../assets/logoWhite.png'

function Login_Screen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [socialLoading, setSocialLoading] = useState(null)
    const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetLoading, setResetLoading] = useState(false)
    const navigate = useNavigate()

    // Initialize providers
    const googleProvider = new GoogleAuthProvider()
    googleProvider.addScope('email')
    googleProvider.addScope('profile')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (email.trim() === '' || password.trim() === '') {
            setError('Kindly fill all required fields')
            setSuccess('')
            return
        }

        try {
            setLoading(true)
            setError('')

            // Sign in user
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Get user role from Firestore
            const userDocRef = doc(db, 'users', user.uid)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                setError('User profile not found in database.')
                setLoading(false)
                return
            }

            const userData = userDoc.data()
            const role = userData.role

            // Check if user is trying to access admin from regular login
            if (role === 'admin') {
                setError('Please use the admin login portal for administrator access.')
                setLoading(false)
                return
            }

            setSuccess('You have been logged in successfully!')
            setEmail('')
            setPassword('')

            // Redirect based on user role
            setTimeout(() => {
                if (role === 'student') {
                    navigate('/student-dashboard')
                } else if (role === 'tutor') {
                    navigate('/tutor-dashboard')
                } else {
                    navigate('/')
                }
            }, 1500)

        } catch (error) {
            console.error('Login error:', error)
            let errorMessage = 'An error occurred during login'
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email'
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password'
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address'
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled'
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.'
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.'
            }
            setError(errorMessage)
            setSuccess('')
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault()

        if (!resetEmail.trim()) {
            setError('Please enter your email address')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(resetEmail)) {
            setError('Please enter a valid email address')
            return
        }

        try {
            setResetLoading(true)
            setError('')
            setSuccess('')

            await sendPasswordResetEmail(auth, resetEmail)

            setSuccess(`Password reset link has been sent to ${resetEmail}. Please check your inbox and spam folder.`)
            setResetEmail('')

            setTimeout(() => {
                setShowForgotPassword(false)
                setSuccess('')
            }, 5000)

        } catch (error) {
            console.error('Password reset error:', error)
            let errorMessage = 'Failed to send reset email. Please try again.'

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address.'
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.'
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many reset attempts. Please try again in a few minutes.'
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.'
            }

            setError(errorMessage)
            setSuccess('')
        } finally {
            setResetLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            setSocialLoading('Google')
            setError('')

            const result = await signInWithPopup(auth, googleProvider)
            const user = result.user

            // Check if user document exists
            const userDocRef = doc(db, 'users', user.uid)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                // Create new user document for social login
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    role: 'student', // Default role for social signups
                    provider: 'Google',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    phone: '',
                    bio: '',
                    location: '',
                    website: ''
                })
            } else {
                // Update existing user document with latest info
                await setDoc(userDocRef, {
                    displayName: user.displayName || userDoc.data().displayName,
                    photoURL: user.photoURL || userDoc.data().photoURL,
                    updatedAt: serverTimestamp()
                }, { merge: true })
            }

            // Get user role for redirection
            const updatedUserDoc = await getDoc(userDocRef)
            const userData = updatedUserDoc.data()
            const role = userData.role

            setSuccess(`Signed in with Google successfully!`)

            // Redirect based on user role
            setTimeout(() => {
                if (role === 'student') {
                    navigate('/student-dashboard')
                } else if (role === 'tutor') {
                    navigate('/tutor-dashboard')
                } else {
                    navigate('/')
                }
            }, 1000)

        } catch (error) {
            console.error('Google login error:', error)

            let errorMessage = `An error occurred during Google login`

            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    errorMessage = 'Login popup was closed. Please try again.'
                    break
                case 'auth/popup-blocked':
                    errorMessage = 'Login popup was blocked by your browser. Please allow popups for this site.'
                    break
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection.'
                    break
                default:
                    if (error.message.includes('network error')) {
                        errorMessage = 'Network error. Please check your internet connection.'
                    }
            }

            setError(errorMessage)
        } finally {
            setSocialLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-BgGradient flex items-center justify-center py-10 px-[15px] sm:p-10">
            <div className="flex flex-col lg:flex-row max-w-6xl w-full bg-transparent pt-4 lg:pt-20">
                {/* Logo Section */}
                <div className="lg:w-1/2 flex flex-col justify-center items-center lg:items-start mb-8 lg:mb-0">
                    <img src={logoWhite} alt="logo" className="w-48 lg:w-100" />
                </div>

                {/* Form Section */}
                <div className="lg:w-1/2 bg-BgWhiteColor flex flex-col p-6 lg:p-10 justify-center rounded-2xl shadow-lg">
                    <h1 className="text-2xl lg:heading-text-lg font-bold text-[headingColor] text-center lg:text-left mb-2 lg:mb-0">
                        {showForgotPassword ? 'Reset Your Password' : 'Sign In'}
                    </h1>

                    {!showForgotPassword ? (
                        // Login Form
                        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5 py-4 lg:py-5">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Enter your Email Address*
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                    placeholder="your@email.com"
                                    disabled={loading}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Enter your Password*
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>

                            {/* Forget Password */}
                            <div className="text-right text-sm">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(true)
                                        setError('')
                                        setSuccess('')
                                    }}
                                    className="text-greenSmall hover:underline"
                                >
                                    Forgot Your Password?
                                </button>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center">
                                        <i className="fas fa-exclamation-circle text-red-500 mr-2 flex-shrink-0"></i>
                                        <span className="text-red-700 text-sm">{error}</span>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center">
                                        <i className="fas fa-check-circle text-green-500 mr-2 flex-shrink-0"></i>
                                        <span className="text-green-700 text-sm">{success}</span>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex justify-center">
                                <button
                                    type="submit"
                                    className="btn-primary w-full max-w-xs py-3 text-base"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Signing In...
                                        </>
                                    ) : (
                                        'Login'
                                    )}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-BgWhiteColor text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            {/* Social Login Buttons */}
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={socialLoading}
                                    className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    {socialLoading === 'Google' ? (
                                        <i className="fas fa-spinner fa-spin text-gray-400"></i>
                                    ) : (
                                        <i className="fab fa-google text-red-500 text-lg"></i>
                                    )}
                                    <span className="text-sm font-medium">Google</span>
                                </button>
                            </div>

                            {/* Registration Link */}
                            <div className="mt-6 text-center text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/registration-screen" className="text-greenSmall font-semibold hover:underline">
                                    Register Now
                                </Link>
                            </div>

                            {/* Admin Login Link */}
                            <div className="mt-4 text-center text-sm text-gray-600">
                                Are you an administrator?{' '}
                                <Link to="/admin-login" className="text-[#6c5dd3] font-semibold hover:underline">
                                    Login as Admin
                                </Link>
                            </div>
                        </form>
                    ) : (
                        // Forgot Password Form
                        <form onSubmit={handleForgotPassword} className="space-y-5 py-5">
                            {/* Instructions */}
                            <div className="text-sm text-gray-600 mb-4">
                                Enter your email address and we'll send you a link to reset your password.
                            </div>

                            {/* Reset Email */}
                            <div>
                                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address*
                                </label>
                                <input
                                    type="email"
                                    id="resetEmail"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                    placeholder="your@email.com"
                                    disabled={resetLoading}
                                    autoFocus
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center">
                                        <i className="fas fa-exclamation-circle text-red-500 mr-2 flex-shrink-0"></i>
                                        <span className="text-red-700 text-sm">{error}</span>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center">
                                        <i className="fas fa-check-circle text-green-500 mr-2 flex-shrink-0"></i>
                                        <span className="text-green-700 text-sm">{success}</span>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    className="btn-primary w-full py-3 text-base"
                                    disabled={resetLoading}
                                >
                                    {resetLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Sending Reset Link...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(false)
                                        setError('')
                                        setSuccess('')
                                        setResetEmail('')
                                    }}
                                    className="w-full p-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-base"
                                    disabled={resetLoading}
                                >
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login_Screen
