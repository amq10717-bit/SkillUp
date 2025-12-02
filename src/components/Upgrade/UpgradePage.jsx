import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import stripePromise from '../../config/stripe';

// Custom CardElement styling
const cardElementOptions = {
    style: {
        base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
                color: '#aab7c4',
            },
            fontFamily: '"Inter", sans-serif',
            padding: '10px 12px',
        },
        invalid: {
            color: '#9e2146',
        },
    },
};

const CheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user] = useAuthState(auth);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!stripe || !elements) {
            setError('Stripe has not loaded yet. Please try again.');
            setLoading(false);
            return;
        }

        const cardElement = elements.getElement(CardElement);

        try {
            // Validate the card element first
            const { error: cardError } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
            });

            if (cardError) {
                setError(cardError.message);
                setLoading(false);
                return;
            }

            // For demo purposes - simulate successful payment
            // In production, you would create a payment intent on your backend
            console.log('Simulating payment processing...');

            // Show processing for 2 seconds to simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update user subscription in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                subscription: {
                    status: 'active',
                    plan: 'pro',
                    price: 999, // $9.99 in cents
                    currentPeriodStart: serverTimestamp(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    updatedAt: serverTimestamp()
                }
            });

            // Record the payment
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                amount: 999,
                currency: 'usd',
                status: 'completed',
                type: 'subscription',
                createdAt: serverTimestamp()
            });

            alert('🎉 Successfully upgraded to Pro! You now have unlimited course enrollments.');
            navigate('/student-dashboard');

        } catch (err) {
            console.error('Payment error:', err);
            setError(err.message || 'An error occurred during payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Information</h3>

                {/* Card Element Container with better styling */}
                <div className="border border-gray-300 rounded-lg p-4 bg-white hover:border-gray-400 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200">
                    <CardElement options={cardElementOptions} />
                </div>

                {/* Instructions */}
                <div className="mt-3 text-sm text-gray-600">
                    <p>💡 Test card: <strong>4242 4242 4242 4242</strong></p>
                    <p>Any future expiry, CVC, and postal code will work</p>
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            {error}
                        </p>
                    </div>
                )}
            </div>

            <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                {loading ? (
                    <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Processing Payment...
                    </>
                ) : (
                    <>
                        <i className="fas fa-lock"></i>
                        Upgrade to Pro - $9.99/month
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
                🔒 Secure payment powered by Stripe. Your payment information is encrypted and secure.
            </p>
        </form>
    );
};

const UpgradePage = () => {
    const { isProUser, enrollmentCount, freeEnrollmentsLeft } = useSubscription();
    const [user] = useAuthState(auth);
    const navigate = useNavigate();

    if (!user) {
        navigate('/login-screen');
        return null;
    }

    if (isProUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8 mt-20">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-crown text-white text-2xl"></i>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-4">You're a Pro Member! 🎉</h1>
                        <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                            Thank you for being a Pro member. You have unlimited course enrollments and access to all premium features.
                        </p>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6 max-w-md mx-auto">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <i className="fas fa-infinity text-green-600 text-xl"></i>
                                <h3 className="text-lg font-semibold text-green-800">Unlimited Enrollments</h3>
                            </div>
                            <p className="text-green-700">
                                Enroll in as many courses as you want with no restrictions.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/student-dashboard')}
                            className="mt-8 bg-[#6c5dd3] text-white px-8 py-3 rounded-lg hover:bg-[#5a4bbf] transition font-semibold"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8 mt-20">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                        Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Pro</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Get unlimited course enrollments and take your learning to the next level
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Pricing Card */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-purple-500 relative">
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-bl-xl rounded-tr-xl font-bold text-sm">
                            MOST POPULAR
                        </div>

                        <div className="text-center mb-8">
                            <div className="flex items-baseline justify-center gap-2 mb-4">
                                <span className="text-5xl font-bold text-gray-800">$9.99</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <p className="text-gray-600">Billed monthly, cancel anytime</p>
                        </div>

                        <Elements stripe={stripePromise}>
                            <CheckoutForm />
                        </Elements>
                    </div>

                    {/* Features & Benefits */}
                    <div className="space-y-6">
                        {/* Current Usage */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">
                                <i className="fas fa-chart-bar text-purple-600"></i>
                                Your Current Usage
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-600">Free enrollments used this month</span>
                                        <span className="font-semibold">{enrollmentCount}/5</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (enrollmentCount / 5) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {freeEnrollmentsLeft} free {freeEnrollmentsLeft === 1 ? 'enrollment' : 'enrollments'} remaining this month
                                    </p>
                                </div>

                                {/* Warning message when running low */}
                                {freeEnrollmentsLeft <= 2 && freeEnrollmentsLeft > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-yellow-800">
                                            <i className="fas fa-exclamation-triangle"></i>
                                            <span className="text-sm font-medium">
                                                Only {freeEnrollmentsLeft} {freeEnrollmentsLeft === 1 ? 'enrollment' : 'enrollments'} left!
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Critical message when no enrollments left */}
                                {freeEnrollmentsLeft === 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-red-800">
                                            <i className="fas fa-times-circle"></i>
                                            <span className="text-sm font-medium">
                                                No free enrollments left this month
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Features List */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">
                                <i className="fas fa-star text-yellow-500"></i>
                                Pro Features
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-3 bg-green-50 rounded-lg">
                                    <i className="fas fa-infinity text-green-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-green-800">Unlimited Course Enrollments</h4>
                                        <p className="text-green-700 text-sm">Enroll in as many courses as you want each month</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg">
                                    <i className="fas fa-bolt text-blue-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-blue-800">No Monthly Limits</h4>
                                        <p className="text-blue-700 text-sm">Go beyond the 5 free courses per month restriction</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 bg-purple-50 rounded-lg">
                                    <i className="fas fa-gem text-purple-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-purple-800">Premium Badge</h4>
                                        <p className="text-purple-700 text-sm">Showcase your Pro status in the community</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 bg-indigo-50 rounded-lg">
                                    <i className="fas fa-headset text-indigo-600 text-xl mt-1"></i>
                                    <div>
                                        <h4 className="font-semibold text-indigo-800">Priority Support</h4>
                                        <p className="text-indigo-700 text-sm">Get faster responses from our support team</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial */}
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <i className="fas fa-quote-left text-white text-xl opacity-80"></i>
                                <span className="font-semibold">Student Testimonial</span>
                            </div>
                            <p className="text-white text-sm mb-4 italic">
                                "Upgrading to Pro was the best decision I made. I went from being limited to 5 courses to exploring multiple subjects simultaneously. My learning accelerated dramatically!"
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                    <span className="text-purple-600 font-bold text-sm">S</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Sarah Chen</p>
                                    <p className="text-purple-200 text-xs">Pro Member since 2024</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Frequently Asked Questions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 pb-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Can I cancel anytime?</h3>
                                <p className="text-gray-600 text-sm">Yes, you can cancel your Pro subscription at any time. You'll keep Pro benefits until the end of your billing period.</p>
                            </div>
                            <div className="border-b border-gray-200 pb-4">
                                <h3 className="font-semibold text-gray-800 mb-2">What happens to my enrolled courses if I cancel?</h3>
                                <p className="text-gray-600 text-sm">You keep access to all courses you've already enrolled in, even after canceling Pro.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 pb-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Are courses free?</h3>
                                <p className="text-gray-600 text-sm">Yes! All courses are completely free. The Pro subscription only removes the monthly enrollment limit.</p>
                            </div>
                            <div className="border-b border-gray-200 pb-4">
                                <h3 className="font-semibold text-gray-800 mb-2">What payment methods do you accept?</h3>
                                <p className="text-gray-600 text-sm">We accept all major credit cards through our secure Stripe payment system.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePage;