// src/utils/autoGrader.js
export const autoGradeAssignment = async (submissionText, criteria) => {
    // This would integrate with your AI analysis backend
    try {
        const response = await fetch('http://localhost:8000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                submission_text: submissionText,
                criteria: criteria,
                max_marks: criteria.totalMarks
            })
        });

        const result = await response.json();
        return {
            grade: result.grade,
            feedback: result.feedback,
            score_percent: result.score_percent,
            criteria_breakdown: result.criteria_breakdown
        };
    } catch (error) {
        console.error('Auto-grading failed:', error);
        return null;
    }
};

export const autoGradeQuiz = (questions, studentAnswers) => {
    let correctCount = 0;
    const results = questions.map((question, index) => {
        const isCorrect = question.correctAnswer === studentAnswers[index];
        if (isCorrect) correctCount++;

        return {
            questionIndex: index,
            question: question.text,
            studentAnswer: studentAnswers[index],
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            points: question.points || 1
        };
    });

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const score = (correctCount / questions.length) * 100;
    const pointsEarned = results.reduce((sum, r) => sum + (r.isCorrect ? r.points : 0), 0);

    return {
        score: Math.round(score),
        pointsEarned,
        totalPoints,
        correctCount,
        totalQuestions: questions.length,
        detailedResults: results
    };
};