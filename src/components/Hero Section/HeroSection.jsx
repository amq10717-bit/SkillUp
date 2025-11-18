import React from 'react';
import { Link } from 'react-router-dom';
import heroImage1 from '../../assets/heroImage1.png';
import heroImage2 from '../../assets/heroImage2.png';
import heroImage3 from '../../assets/heroImage3.png';

function HeroSection({ title, subtitle, breadcrumb = [], floatingImages = [] }) {

    const defaultFloatingImages = [
        {
            src: heroImage1, x: 'left-10', y: 'top-20', animation: 'animate-float1'
        },
        { src: heroImage2, x: 'right-20', y: 'top-32', animation: 'animate-float2' },
        { src: heroImage3, x: 'left-32', y: 'bottom-20', animation: 'animate-float3' },
    ];

    const imagesToUse = floatingImages.length > 0 ? floatingImages : defaultFloatingImages;

    return (
        <div className="relative h-[500px] text-black pt-24 px-4 bg-[#EEFFFA] overflow-hidden">

            {imagesToUse.map((image, index) => (
                <img
                    key={index}
                    src={image.src}
                    alt=""
                    className={`absolute w-24 opacity-70 ${image.x} ${image.y} ${image.animation}`}
                />
            ))}


            <div className="absolute inset-0 opacity-10 ">
                <div className="w-full h-full bg-gradient-to-r from-green-300 via-blue-400 to-purple-300" />
            </div>

            <div className="max-w-6xl mx-auto flex flex-col items-center pt-25 relative z-10">
                <h1 className="text-5xl font-bold mb-4 text-center text-greenSmall">
                    {title}
                </h1>




                <nav className=" bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mt-5">
                    <ol className="list-reset flex items-center space-x-2">
                        {breadcrumb.map((item, index) => (
                            <li key={index} className="flex items-center">
                                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                                {item.path ? (
                                    <Link
                                        to={item.path}
                                        className="hover:underline text-gray-600 hover:text-greenSmall flex items-center gap-1 text-sm"
                                    >
                                        {item.label === "Home" && <i className="fas fa-home text-sm"></i>}
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className="text-greenSmall flex items-center gap-1 font-medium">
                                        {item.label}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>






            </div>
        </div>
    );
}

export default HeroSection;