import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import logoWhite from '../../assets/logoWhite.png'
import logoGreen from '../../assets/logo.png'

function AdminLoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (email.trim() === '' || password.trim() === '') {
            setError('Please fill all required fields')
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
                setError('Admin account not found in database.')
                setLoading(false)
                return
            }

            const userData = userDoc.data()
            const role = userData.role

            // Check if user is admin
            if (role !== 'admin') {
                setError('Access denied. This is not an admin account.')
                setLoading(false)
                return
            }

            setSuccess('Admin login successful!')
            setEmail('')
            setPassword('')

            // Redirect to admin dashboard
            setTimeout(() => {
                navigate('/admin-dashboard')
            }, 1500)

        } catch (error) {
            console.error('Admin login error:', error)
            let errorMessage = 'An error occurred during login'
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No admin account found with this email'
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

    return (
        <div className="min-h-screen bg-BgGradient flex items-center justify-center sm:p-10">
            <div className="flex flex-col lg:flex-row max-w-6xl w-full bg-transparent pt-20">
                {/* Logo Section */}
                <div className="lg:w-1/2 flex flex-col justify-center sm:items-center lg:items-start p-8">
                    <img src={logoWhite} alt="logo" className="w-80 mb-8" />

                </div>

                {/* Form Section */}
                <div className="lg:w-1/2 bg-white flex flex-col p-10 justify-center rounded-2xl shadow-lg">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[#6c5dd3] rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-lock text-white text-2xl"></i>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Admin Sign In
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Access the admin dashboard
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 py-5">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Email Address*
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent"
                                    placeholder="admin@skillup.com"
                                    disabled={loading}
                                />
                                <i className="fas fa-envelope absolute right-3 top-3 text-gray-400"></i>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password*
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                                <i className="fas fa-lock absolute right-3 top-3 text-gray-400"></i>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center">
                                    <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                                    <span className="text-red-700">{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center">
                                    <i className="fas fa-check-circle text-green-500 mr-3"></i>
                                    <span className="text-green-700">{success}</span>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <div>
                            <button
                                type="submit"
                                className="w-full bg-[#6c5dd3] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#5a4bc2] transition-colors disabled:opacity-50 flex items-center justify-center"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Signing In...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sign-in-alt mr-2"></i>
                                        Sign In as Admin
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Back to Role Selection */}
                        <div className="text-center pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                Not an admin?{' '}
                                <Link
                                    to="/select-role"
                                    className="text-[#6c5dd3] font-semibold hover:underline"
                                >
                                    Go back to role selection
                                </Link>
                            </p>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <div className="flex items-start">
                                <i className="fas fa-shield-alt text-blue-500 mr-3 mt-1"></i>
                                <div>
                                    <p className="text-sm text-blue-800 font-semibold">Security Notice</p>
                                    <p className="text-xs text-blue-700">
                                        This portal is restricted to authorized administrators only.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AdminLoginScreen