
import React from 'react'

function ReviewsCard({ reviews }) {
    return (
        <div className="p-4 lg:p-5 rounded-lg shadow-md w-full flex flex-col bg-white">
            <div className='flex-1 flex-col items-start mb-4 lg:mb-5'>
                <h2 className="font-poppins text-lg lg:text-[20px] font-bold mb-2 text-left break-words">
                    {reviews.reviewerName}
                </h2>
                <div className="flex mt-2 lg:mt-3 flex-col">
                    <div className='flex flex-row gap-3 items-center'>
                        <p className="font-poppins font-bold text-xs lg:text-[13px] lg:-mb-[7px]">
                            {reviews.rating}
                        </p>
                        <i className="fas fa-star text-yellow-400 text-sm lg:text-base"></i>
                    </div>
                    <div>
                        <p className="font-poppins text-sm lg:text-[13px] mt-2 lg:mt-3 text-gray-600 leading-relaxed">
                            {reviews.reviews}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReviewsCard


