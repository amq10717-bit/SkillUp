import React from 'react';

import AboutSection from './AboutSection';
import CoursePreview from './CardsPreview/CoursePreview';
import CallToAction from './CallToAction';


function HomePage({ courses }) {
    return (
        <div>

            <AboutSection />
            <CoursePreview courses={courses} />
            <CallToAction />
        </div>
    );
}

export default HomePage;
