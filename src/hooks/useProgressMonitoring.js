// src/hooks/useProgressMonitoring.js
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const useProgressMonitoring = () => {
    const [realTimeProgress, setRealTimeProgress] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Monitor submissions in real-time
        const submissionsQuery = query(
            collection(db, 'submissions'),
            where('studentId', '==', user.uid),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
            const submissions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Calculate real-time metrics
            const recentSubmissions = submissions.slice(0, 5);
            const avgScore = submissions.length > 0 ?
                submissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / submissions.length : 0;

            const completionRate = (submissions.filter(s => s.status === 'graded').length / submissions.length) * 100;

            setRealTimeProgress({
                recentSubmissions,
                averageScore: Math.round(avgScore),
                completionRate: Math.round(completionRate),
                totalSubmissions: submissions.length,
                lastUpdated: new Date()
            });

            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { realTimeProgress, isLoading };
};