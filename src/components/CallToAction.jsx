import React from 'react';

function CallToAction() {
    return (
        <section className="bg-amber-700 text-white text-center p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="mb-6">Join our community and enhance your knowledge with a wide range of courses.</p>
            <a href="/add-course" className="bg-white text-amber-700 px-6 py-3 rounded font-semibold hover:bg-gray-200">
                Add New Course
            </a>
        </section>
    );
}

export default CallToAction;
