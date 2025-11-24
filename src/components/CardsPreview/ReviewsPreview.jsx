import React from 'react'
import ReviewsCard from '../Card/ReviewsCard'

function ReviewsPreview({ reviews }) {
    return (
        <div className='flex flex-col gap-3 w-full px-[15px] lg:px-0'>
            {reviews.map(reviews => (
                <ReviewsCard key={reviews.id} reviews={reviews} />
            ))}
        </div>
    )
}

export default ReviewsPreview


