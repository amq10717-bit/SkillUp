import React from 'react'
import AssignmentCard from '../Card/AssignmentCard'

function AssignmentPreview({ assignment }) {
    // Add debug logging
    console.log('AssignmentPreview received assignments:', assignment);

    if (!assignment || assignment.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No assignments available
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-5">
            {assignment.map((assignmentItem, index) => (
                <AssignmentCard
                    key={assignmentItem.id || assignmentItem.AssignmentId || index}
                    assignment={assignmentItem}
                />
            ))}
        </div>
    )
}

export default AssignmentPreview