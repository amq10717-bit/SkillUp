import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

// REPLACE WITH YOUR STRIPE PUBLISHABLE KEY
const stripePromise = loadStripe('pk_test_51SYUGEBIV5p3SygoYQHlPMuZ4pJbfP6s0Ls89Nyh1mOLaATjsk7j7WMGLFm3dLYMtM1ER9pYan4T0gklQ9D2pGnO00k5GKu7bU');

const PaymentModal = ({ isOpen, onClose, onSuccess, amount = 10, currency = 'usd' }) => {
    const [clientSecret, setClientSecret] = useState("");

    // Fetch the PaymentIntent from your Node server when modal opens
    useEffect(() => {
        if (isOpen) {
            // Ensure this URL matches your backend port (8000)
            fetch("http://localhost:8000/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount * 100, currency }), // Stripe expects cents
            })
                .then((res) => res.json())
                .then((data) => setClientSecret(data.clientSecret))
                .catch((err) => console.error("Error fetching payment intent:", err));
        }
    }, [isOpen, amount, currency]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe',
    };

    const options = {
        clientSecret,
        appearance,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] p-6 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Upgrade to Pro</h2>
                            <p className="text-blue-100 text-sm mt-1">Unlimited access for ${amount}/month</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {clientSecret ? (
                        <Elements options={options} stripe={stripePromise}>
                            <CheckoutForm onSuccess={onSuccess} amount={amount} />
                        </Elements>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10">
                            <i className="fas fa-circle-notch fa-spin text-4xl text-[#6c5dd3] mb-4"></i>
                            <p className="text-gray-500">Initializing secure payment...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;