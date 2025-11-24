import React from 'react';
import medal from '../../assets/Medal.png';


function InstructorCard({ instructor }) {
    return (
        <div className="p-4 lg:p-5 rounded-lg shadow-md w-full flex flex-col bg-white">
            <div className="flex flex-col items-center justify-center mb-4 lg:mb-5">
                <img
                    src={instructor.image}
                    alt={instructor.name}
                    className="w-24 lg:w-30 object-cover mb-4 bg-gray-300 rounded-3xl h-auto"
                />
                <h2 className="font-poppins text-lg lg:text-[20px] font-bold mb-2 text-center">
                    {instructor.name}
                </h2>

                <div className="flex items-center justify-center lg:justify-start lg:ml-11 w-full lg:w-auto">
                    <div className='flex flex-row gap-2 lg:gap-3 items-center'>
                        <p className="font-poppins font-bold text-xs lg:text-[13px] lg:-mb-[7px]">{instructor.ranking}</p>
                        <i className="fas fa-star text-yellow-400 text-xs lg:text-sm"></i>
                    </div>

                    <p className="text-gray-300 mx-2 lg:mx-3">|</p>
                    <div>
                        <p className="font-poppins text-xs lg:text-[13px] lg:-mb-[7px]"> Reviews ({instructor.reviews})</p>
                    </div>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap justify-center">
                    {instructor.skills.map((skill, index) => (
                        <span
                            key={index}
                            className="bg-BgSecondary text-black px-2 lg:px-3 py-1 rounded-[4px] text-[10px] lg:text-xs font-medium"
                        >
                            {skill}
                        </span>
                    ))}
                </div>

                <div className='flex flex-row gap-3 lg:gap-5 mt-4 lg:mt-5 mb-2 w-full lg:w-auto justify-center'>
                    <div className='rounded-sm bg-gray-50 p-3 lg:p-5 flex-1 lg:flex-none text-center'>
                        <div className='flex flex-row items-center justify-center gap-2'>
                            <img src={medal} alt="Logo" className="w-4 lg:w-5 h-auto object-contain" />
                            <h1 className='font-poppins font-[600] text-xs lg:text-[15px]'>Achievement</h1>
                        </div>
                        <div className='flex justify-center'>
                            <p className='font-poppins font-[900] text-lg lg:text-[23px] mt-1 lg:mt-2'>{instructor.achievements}</p>
                        </div>
                    </div>
                    <div className='rounded-sm bg-gray-50 p-3 lg:p-5 flex-1 lg:flex-none text-center'>
                        <div className='flex flex-row items-center justify-center gap-2'>
                            <img src={medal} alt="Logo" className="w-4 lg:w-5 h-auto object-contain" />
                            <h1 className='font-poppins font-[600] text-xs lg:text-[15px]'>Certificate</h1>
                        </div>
                        <div className='flex justify-center'>
                            <p className='font-poppins font-[900] text-lg lg:text-[23px] mt-1 lg:mt-2'>{instructor.certificates}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => window.location.href = `/instructor-Profile/${instructor.id}`}
                    className="btn-primary w-full lg:w-46 py-3 text-sm mt-4 rounded-lg transition-transform active:scale-95"
                >
                    View Class
                </button>
            </div>
        </div>
    );
}

export default InstructorCard;
