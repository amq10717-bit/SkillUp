import React from 'react';
import { ClockIcon, DocumentTextIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

function AssignmentCard({ assignment }) {
    // Safe data extraction with fallbacks
    const assignmentId = assignment.id || assignment.AssignmentId || 'unknown';
    const assignmentTitle = assignment.AssignmentTitle || 'Untitled Assignment';
    const assignmentDescription = assignment.AssignmentDescription || 'No description available';
    const deadline = assignment.DeadLine || 'No deadline set';
    const status = assignment.status || 'Active';
    const questionsCount = assignment.questionsCount || 'N/A';
    const totalMarks = assignment.totalMarks || 'N/A';
    const attemptsLeft = assignment.attemptsLeft || 'N/A';

    // Calculate days until deadline (if deadline exists)
    const getDaysUntilDue = () => {
        if (!assignment.DeadLine) return 'No deadline';

        try {
            const dueDate = new Date(assignment.DeadLine);
            const today = new Date();
            const timeDiff = dueDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (daysDiff < 0) return 'Overdue';
            if (daysDiff === 0) return 'Due today';
            if (daysDiff === 1) return 'Due tomorrow';
            return `Due in ${daysDiff} days`;
        } catch (error) {
            return 'Invalid date';
        }
    };

    return (
        <div className="group relative p-4 lg:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border-l-4 border-hoverGreen hover:border-hoverYellow">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3 sm:gap-0">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                        <AcademicCapIcon className="w-6 h-6 text-greenSmall" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-base lg:text-lg text-gray-900 mb-1 truncate">
                            {assignmentTitle}
                        </h2>
                        <span className={`inline-block px-3 py-1 text-xs font-medium text-white rounded-full ${status === 'Graded' ? 'bg-green-500' :
                            status === 'Submitted' ? 'bg-blue-500' :
                                status === 'Overdue' ? 'bg-red-500' :
                                    'bg-BgPrimary'
                            }`}>
                            {status}
                        </span>
                    </div>
                </div>
                <span className="text-xs lg:text-sm text-gray-500 whitespace-nowrap sm:ml-2">
                    {deadline}
                </span>
            </div>

            <p className="text-gray-600 text-sm mb-4 lg:mb-6 line-clamp-2">
                {assignmentDescription}
            </p>

            {/* Assignment Details */}
            <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-4 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                    <DocumentTextIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{questionsCount} Questions</span>
                </div>
                <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{getDaysUntilDue()}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="font-medium">Marks:</span>
                    <span>{totalMarks}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="font-medium">Attempts:</span>
                    <span className="truncate">{attemptsLeft} left</span>
                </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between border-t pt-4 gap-3 sm:gap-0">
                <div className="text-xs text-gray-500 w-full sm:w-auto text-center sm:text-left">
                    Last updated: {new Date().toLocaleDateString()}
                </div>

                <Link
                    to={`/assignment/${assignmentId}`}
                    className="w-full sm:w-auto text-center px-4 py-2 bg-BgPrimary hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                >
                    {status === 'Submitted' || status === 'Graded' ? 'Review' : 'View Assignment'}
                </Link>
            </div>

            {/* Progress Section - Only show if relevant */}
            {(status === 'Submitted' || status === 'Graded') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">
                            {status === 'Graded' ? 'Grade' : 'Progress'}
                        </span>
                        <span className="text-xs font-medium text-greenSmall">
                            {status === 'Graded' ?
                                `${assignment.grade || 'N/A'}/${totalMarks}` :
                                '75%'
                            }
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-BgPrimary rounded-full h-2 transition-all duration-500"
                            style={{
                                width: status === 'Graded' && assignment.grade && totalMarks !== 'N/A' ?
                                    `${(assignment.grade / totalMarks) * 100}%` : '75%'
                            }}
                        />
                    </div>
                    {assignment.feedback && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-1">
                            Feedback: {assignment.feedback}
                        </p>
                    )}
                </div>
            )}

            {/* Empty state handling */}
            {!assignment.AssignmentTitle && (
                <div className="absolute inset-0 bg-yellow-50 bg-opacity-50 flex items-center justify-center rounded-xl">
                    <p className="text-yellow-700 text-sm font-medium">Assignment data incomplete</p>
                </div>
            )}
        </div>
    );
}

export default AssignmentCard;