import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

function Footer() {
    return (
        <footer className="mt-auto bg-white border-t shadow-inner">
            <div className="mx-auto max-w-6xl flex flex-col px-4 py-10">
                <div className="flex flex-col md:flex-row justify-between">
                    <div className="mb-8 md:mb-0 flex-shrink-0">
                        <Link to="/" className="flex items-center">
                            <img src={logo} alt="Logo" className="h-25" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Quick Links</h2>
                            <ul className="space-y-1 text-gray-600">
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/add-course">Add Course</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-2">Courses</h2>
                            <ul className="space-y-1 text-gray-600">
                                <li><Link to="/">React Basics</Link></li>
                                <li><Link to="/">Advanced React</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-2">Support</h2>
                            <ul className="space-y-1 text-gray-600">
                                <li><Link to="/">Contact</Link></li>
                                <li><Link to="/">Help Center</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-gray-200" />

                <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} All rights reserved.</p>
                    <ul className="flex gap-4 mt-4 md:mt-0">
                        <li><Link to="/">Privacy Policy</Link></li>
                        <li><Link to="/">Terms & Conditions</Link></li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
