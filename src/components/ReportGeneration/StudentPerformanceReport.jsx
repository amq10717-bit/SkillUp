// src/components/StudentPerformanceReport.jsx
import React from 'react';

const StudentPerformanceReport = ({ student, remarks }) => {
    const generateReport = () => {
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Performance Report - ${student.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; border-bottom: 2px solid #4CBC9A; padding-bottom: 20px; margin-bottom: 30px; }
                    .section { margin-bottom: 30px; }
                    .remark { border-left: 4px solid #4CBC9A; padding-left: 15px; margin: 10px 0; }
                    .important { border-left-color: #dc2626; background: #fef2f2; }
                    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
                    .stat-card { text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Student Performance Report</h1>
                    <h2>${student.name}</h2>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>

                <div class="section">
                    <h3>Performance Summary</h3>
                    <div class="stats">
                        <div class="stat-card">
                            <h4>Overall Score</h4>
                            <p style="font-size: 24px; color: #4CBC9A; margin: 5px 0;">${student.progress.overallScore}%</p>
                        </div>
                        <div class="stat-card">
                            <h4>Assignments</h4>
                            <p style="font-size: 24px; color: #10b981; margin: 5px 0;">${student.progress.avgAssignmentScore}%</p>
                        </div>
                        <div class="stat-card">
                            <h4>Quizzes</h4>
                            <p style="font-size: 24px; color: #8b5cf6; margin: 5px 0;">${student.progress.avgQuizScore}%</p>
                        </div>
                        <div class="stat-card">
                            <h4>Courses Completed</h4>
                            <p style="font-size: 24px; color: #f59e0b; margin: 5px 0;">${student.progress.completedCourses}/${student.progress.totalCourses}</p>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>Tutor Remarks & Feedback</h3>
                    ${remarks.length === 0 ?
                '<p>No remarks available.</p>' :
                remarks.map(remark => `
                            <div class="remark ${remark.isImportant ? 'important' : ''}">
                                <p><strong>${remark.category.toUpperCase()}</strong> ${remark.isImportant ? '🚩 IMPORTANT' : ''}</p>
                                <p>${remark.remarkText}</p>
                                <p><small>By ${remark.tutorName} on ${remark.createdAt?.toDate?.().toLocaleDateString() || 'Unknown date'}</small></p>
                            </div>
                        `).join('')
            }
                </div>

                <div class="section">
                    <h3>Recommendations</h3>
                    <ul>
                        ${generateRecommendations(student, remarks)}
                    </ul>
                </div>
            </body>
            </html>
        `);
        reportWindow.document.close();
    };

    const generateRecommendations = (student, remarks) => {
        const recommendations = [];

        if (student.progress.overallScore < 70) {
            recommendations.push('Focus on foundational concepts and regular practice');
        }

        if (student.progress.pendingAssignments > 0) {
            recommendations.push('Complete pending assignments to improve overall score');
        }

        const improvementRemarks = remarks.filter(r => r.category === 'improvement');
        improvementRemarks.forEach(remark => {
            recommendations.push(remark.remarkText);
        });

        return recommendations.map(rec => `<li>${rec}</li>`).join('');
    };

    return (
        <button
            onClick={generateReport}
            className="bg-[#6c5dd3] text-white py-2 px-4 rounded-lg hover:bg-[#5a4bbf] flex items-center"
        >
            <i className="fas fa-file-pdf mr-2"></i>
            Generate Performance Report
        </button>
    );
};

export default StudentPerformanceReport;