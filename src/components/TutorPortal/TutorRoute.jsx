import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase.js';

const TutorRoute = ({ children }) => {
    const [user, loading] = useAuthState(auth);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-[#6c5dd3] mb-4"></i>
                    <p className="text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login-screen" replace />;
    }

    return children;
};

export default TutorRoute;