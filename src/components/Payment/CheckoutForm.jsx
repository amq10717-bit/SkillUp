import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

const CheckoutForm = ({ onSuccess, amount }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return to this page if a redirect is needed
                return_url: window.location.href,
            },
            // 'if_required' allows us to handle success without a page reload 
            // if the card doesn't require 3D secure authentication.
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Payment success!
            setErrorMessage(null);
            setIsProcessing(false);
            onSuccess(); // Trigger the upgrade logic
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <PaymentElement />
            </div>

            {errorMessage && (
                <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full bg-[#6c5dd3] text-white py-3 rounded-lg hover:bg-[#5a4bbf] disabled:opacity-50 font-semibold transition flex justify-center items-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <i className="fas fa-spinner fa-spin"></i> Processing...
                    </>
                ) : (
                    `Pay $${amount}`
                )}
            </button>
        </form>
    );
};

export default CheckoutForm;