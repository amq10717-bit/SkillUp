import React from 'react';


function AboutSection() {
    return (
        <section className="p-12 bg-gray-100 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-w-6xl w-full">


                <div className="lg:w-1/2 w-full">

                </div>


                <div className="lg:w-1/2 w-full p-10 flex flex-col justify-center">
                    <h2 className="text-4xl font-bold text-amber-700 mb-6 text-center lg:text-left">
                        About Us
                    </h2>
                    <p className="text-lg text-gray-700 max-w-2xl mx-auto lg:mx-0">
                        We are passionate about helping learners and educators connect. Our platform enables users to explore top-quality courses and contribute their own.
                    </p>
                </div>
            </div>
        </section>
    );
}

export default AboutSection;
