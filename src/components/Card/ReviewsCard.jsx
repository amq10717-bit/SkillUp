
import React from 'react'

function ReviewsCard({ reviews }) {
    return (
        <div className="p-5 rounded-lg shadow-md w-full flex flex-col  ">
            <div className='flex-1 flex-col items-start mb-5'>

                <h2 className="font-poppins text-[20px] font-bold mb-2 text-left">{reviews.reviewerName}</h2>
                <div className="flex mt-3 flex-col">
                    <div className='flex flex-row gap-3'>
                        <p className="font-poppins font-bold text-[13px] -mb-[7px]">{reviews.rating}</p>
                        <i className="fas fa-star text-yellow-400"></i>
                    </div>


                    <div>
                        <p className="font-poppins text-[13px] mt-3">{reviews.reviews}</p>
                    </div>
                </div>

            </div>

        </div>
    )
}

export default ReviewsCard


