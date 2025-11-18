import React from 'react'
import ReviewsCard from '../Card/ReviewsCard'

function ReviewsPreview({ reviews }) {
    return (
        <div className='flex flex-col gap-3'>
            {reviews.map(reviews => (
                <ReviewsCard key={reviews.id} reviews={reviews} />
            ))}
        </div>
    )
}

export default ReviewsPreview


