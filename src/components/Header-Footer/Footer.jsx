import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

function Footer() {
    return (
        <footer className="mt-auto bg-white border-t shadow-inner">
            <div className="mx-auto max-w-6xl w-full px-4 py-10">
                {/* Logo Section */}
                <div className="flex justify-center mb-6">
                    <Link to="/" className="flex items-center">
                        <img src={logo} alt="Logo" className="h-20" />
                    </Link>
                </div>

                {/* Divider */}
                <hr className="border-gray-300 my-6" />

                {/* Bottom Text */}
                <div className="flex justify-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} All rights reserved.</p>
                </div>
            </div>
        </footer>

    );
}

export default Footer;
