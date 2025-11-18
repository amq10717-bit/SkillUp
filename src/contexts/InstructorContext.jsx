// src/contexts/InstructorContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase'; // This should be correct for contexts directory
import { useAuthState } from 'react-firebase-hooks/auth';

const InstructorContext = createContext();

export const useInstructors = () => {
    const context = useContext(InstructorContext);
    if (!context) {
        throw new Error('useInstructors must be used within an InstructorProvider');
    }
    return context;
};

export const InstructorProvider = ({ children }) => {
    const [user] = useAuthState(auth);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [error, setError] = useState(null);

    // Fetch all tutors/instructors
    const fetchInstructors = async () => {
        try {
            setLoading(true);
            setError(null);
            const usersQuery = query(
                collection(db, 'users'),
                where('role', '==', 'tutor')
            );
            const snapshot = await getDocs(usersQuery);

            const instructorsData = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const instructorData = docSnap.data();

                    // Fetch instructor's courses
                    let courses = [];
                    try {
                        const coursesQuery = query(
                            collection(db, 'courses'),
                            where('instructorId', '==', docSnap.id)
                        );
                        const coursesSnapshot = await getDocs(coursesQuery);
                        courses = coursesSnapshot.docs.map(courseDoc => ({
                            id: courseDoc.id,
                            ...courseDoc.data()
                        }));
                    } catch (error) {
                        console.error(`Error fetching courses for instructor ${docSnap.id}:`, error);
                    }

                    // Fetch instructor's reviews
                    let reviews = [];
                    try {
                        const reviewsQuery = query(
                            collection(db, 'reviews'),
                            where('instructorId', '==', docSnap.id)
                        );
                        const reviewsSnapshot = await getDocs(reviewsQuery);
                        reviews = reviewsSnapshot.docs.map(reviewDoc => ({
                            id: reviewDoc.id,
                            ...reviewDoc.data()
                        }));
                    } catch (error) {
                        console.error(`Error fetching reviews for instructor ${docSnap.id}:`, error);
                    }

                    // Calculate average rating
                    const avgRating = reviews.length > 0
                        ? reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0) / reviews.length
                        : 0;

                    return {
                        id: docSnap.id,
                        ...instructorData,
                        courses,
                        reviews,
                        avgRating: avgRating.toFixed(1),
                        totalReviews: reviews.length,
                        totalStudents: courses.reduce((sum, course) => sum + (course.enrolledStudents || 0), 0)
                    };
                })
            );

            setInstructors(instructorsData);
        } catch (error) {
            console.error('Error fetching instructors:', error);
            setError('Failed to load instructors. Please check your permissions.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch student's enrolled courses
    const fetchEnrolledCourses = async () => {
        if (!user) {
            setEnrolledCourses([]);
            return;
        }

        try {
            const enrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user.uid)
            );
            const snapshot = await getDocs(enrollmentsQuery);
            const enrolledCourseIds = snapshot.docs.map(doc => doc.data().courseId);
            setEnrolledCourses(enrolledCourseIds);
        } catch (error) {
            console.error('Error fetching enrolled courses:', error);
            setEnrolledCourses([]);
        }
    };

    useEffect(() => {
        fetchInstructors();
        if (user) {
            fetchEnrolledCourses();
        }
    }, [user]);

    const value = {
        instructors,
        loading,
        enrolledCourses,
        error,
        refetchInstructors: fetchInstructors,
        refetchEnrolledCourses: fetchEnrolledCourses
    };

    return (
        <InstructorContext.Provider value={value}>
            {children}
        </InstructorContext.Provider>
    );
};