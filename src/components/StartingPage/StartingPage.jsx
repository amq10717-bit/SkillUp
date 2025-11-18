import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import slide1 from '../../assets/slide1.png';
import slide2 from '../../assets/slide2.png';
import slide3 from '../../assets/slide3.png';

function StartingPage() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const navigate = useNavigate();

    const slides = [
        {
            title: '👋 Welcome to SkillUp!',
            heading: 'Your personalized journey to mastering skills starts here.',
            text: 'At SkillUp, we believe learning should be fun, flexible, and focused. Whether you\'re brushing up or starting fresh, we\'re excited to have you on board.',
            image: slide1
        },
        {
            title: '📚 Learn & Track',
            heading: 'Everything you need in one platform',
            text: 'Explore engaging lessons, complete interactive quizzes, and monitor your progress through detailed dashboards.',
            features: ['Interactive Lessons', 'Progress Dashboard', 'Achievements & Badges'],
            image: slide2
        },
        {
            title: '⏳ Stay Consistent',
            heading: 'Your goals are within reach',
            text: 'We help you maintain consistency with smart reminders, revision schedules, and motivation tracking.',
            features: ['Smart Reminders', 'Daily Goals', 'Progress Analytics'],
            image: slide3
        }
    ];

    const handleNext = () => {
        if (currentSlide === slides.length - 1) {
            navigate('/select-role');
        } else {
            setCurrentSlide(prev => prev + 1);
        }
    };

    return (
        <div className='min-h-screen bg-BgGradient flex items-center justify-center sm:p-10 font-poppins'>
            <div className='flex flex-col lg:flex-row max-w-6xl w-full bg-transparent pt-20'>
                <div className='w-full'>
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className='bg-[#4CBC9A]/60 backdrop-blur-sm rounded-2xl p-8 lg:p-12'
                        >
                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-center'>

                                <motion.div
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className='order-last lg:order-first'
                                >
                                    <img
                                        src={slides[currentSlide].image}
                                        alt='Illustration'
                                        className='w-full h-auto max-w-md mx-auto object-contain'
                                    />
                                </motion.div>


                                <div className='space-y-6'>
                                    <h1 className='text-4xl font-bold text-white'>{slides[currentSlide].title}</h1>
                                    <h2 className='text-[20px] text-white'>{slides[currentSlide].heading}</h2>
                                    <p className='text-[15px] text-white'>{slides[currentSlide].text}</p>

                                    {slides[currentSlide].features && (
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-6'>
                                            {slides[currentSlide].features.map((feature, index) => (
                                                <div
                                                    key={index}
                                                    className='p-4 bg-white/10 rounded-lg flex items-start gap-3'
                                                >
                                                    <div className='w-2 h-2 bg-white rounded-full mt-2' />
                                                    <span className='text-white text-[14px]'>{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className='flex justify-between items-center mt-8'>
                                        <div className='flex gap-2'>
                                            {slides.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentSlide(index)}
                                                    className={`w-3 h-3 rounded-full transition-all ${currentSlide === index ? 'bg-white' : 'bg-white/30'
                                                        }`}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleNext}
                                            className='flex items-center gap-2 bg-white hover:bg-[#3aa37f] text-[#4CBC9A] hover:text-white px-6 py-3 rounded-xl transition-colors'
                                        >
                                            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
                                            <svg
                                                xmlns='http://www.w3.org/2000/svg'
                                                className='h-5 w-5'
                                                viewBox='0 0 20 20'
                                                fill='currentColor'
                                            >
                                                <path
                                                    fillRule='evenodd'
                                                    d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                                                    clipRule='evenodd'
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default StartingPage;