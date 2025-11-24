import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import logoWhite from '../../assets/logoWhite.png'

function Registration_Screen() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        location: '',
        website: '',
        bio: ''
    })
    const [role, setRole] = useState('student') // default role
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (
            formData.name.trim() === '' ||
            formData.email.trim() === '' ||
            formData.password.trim() === '' ||
            role.trim() === ''
        ) {
            setError('Kindly fill all required fields')
            setSuccess('')
            return
        }

        try {
            setLoading(true)
            setError('')

            // Create user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
            const user = userCredential.user

            // Update user profile with display name
            await updateProfile(user, {
                displayName: formData.name
            })

            // Create complete Firestore document for user profile
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: formData.email,
                username: formData.name,
                displayName: formData.name,
                role: role,
                phone: formData.phone || "",
                location: formData.location || "",
                website: formData.website || "",
                bio: formData.bio || "",
                photoURL: "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })

            setSuccess('Account created successfully!')

            // Reset form
            setFormData({
                name: '',
                email: '',
                password: '',
                phone: '',
                location: '',
                website: '',
                bio: ''
            })
            setRole('student')

            setTimeout(() => {
                navigate('/login-screen') // after registration go to login
            }, 1500)

        } catch (error) {
            let errorMessage = 'An error occurred during registration'
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email is already registered'
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters'
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address'
            }
            setError(errorMessage)
            setSuccess('')
        } finally {
            setLoading(false)
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
                    <h1 className="text-2xl lg:heading-text-lg font-bold text-[headingColor] text-center lg:text-left mb-2 lg:mb-0">Create Account</h1>
                    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5 py-4 lg:py-5">

                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name*
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address*
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password*
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                required
                                minLength="6"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                placeholder="Optional"
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                                Location
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                placeholder="Optional"
                            />
                        </div>

                        {/* Website */}
                        <div>
                            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                                Website
                            </label>
                            <input
                                type="url"
                                id="website"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 text-base"
                                placeholder="https://example.com"
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows="3"
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 resize-none text-base"
                                placeholder="Tell us a bit about yourself..."
                            />
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Role*
                            </label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full border-b border-gray-400 focus:outline-none focus:border-primary py-2 bg-transparent text-base"
                                required
                            >
                                <option value="student">Student</option>
                                <option value="tutor">Tutor</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {role === 'tutor' ?
                                    'Tutor accounts may require additional verification.' :
                                    'Students can enroll in courses and track progress.'
                                }
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200 flex items-center">
                                <i className="fas fa-exclamation-circle mr-2 flex-shrink-0"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="text-green-600 text-sm p-3 bg-green-50 rounded-lg border border-green-200 flex items-center">
                                <i className="fas fa-check-circle mr-2 flex-shrink-0"></i>
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex justify-center pt-2">
                            <button
                                type="submit"
                                className="btn-primary w-full max-w-xs py-3 text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </div>

                        {/* Terms Notice */}
                        <div className="text-center text-xs text-gray-500 mt-4 px-4">
                            By creating an account, you agree to our Terms of Service and Privacy Policy
                        </div>

                        {/* Social Login */}
                        <div className="mt-6 text-center text-sm text-gray-500">Or Register with Social Media</div>
                        <div className="flex justify-center space-x-6 mt-4 text-2xl text-gray-600">
                            <i className="fab fa-twitter cursor-pointer hover:text-greenSmall transition-colors duration-300"></i>
                            <i className="fab fa-google cursor-pointer hover:text-greenSmall transition-colors duration-300"></i>
                            <i className="fab fa-github cursor-pointer hover:text-greenSmall transition-colors duration-300"></i>
                            <i className="fab fa-facebook cursor-pointer hover:text-greenSmall transition-colors duration-300"></i>
                        </div>

                        {/* Login Link */}
                        <div className="mt-6 text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login-screen" className="text-greenSmall font-semibold hover:underline">
                                Login Now
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Registration_Screen