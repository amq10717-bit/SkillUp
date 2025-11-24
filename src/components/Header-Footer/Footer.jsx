import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

function Footer() {
    return (
        <footer className="mt-auto bg-white border-t shadow-inner">
            <div className="mx-auto max-w-6xl w-full px-4 py-6 lg:py-10">
                <div className="flex justify-center mb-4 lg:mb-6">
                    <Link to="/" className="flex items-center">
                        <img src={logo} alt="Logo" className="h-14 lg:h-20" />
                    </Link>
                </div>

                <hr className="border-gray-300 my-4 lg:my-6" />

                <div className="flex justify-center text-xs lg:text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
