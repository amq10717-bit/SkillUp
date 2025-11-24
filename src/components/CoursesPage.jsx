// src/components/CoursesPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import CoursePreview from './CardsPreview/CoursePreview';
import CourseFilters from './CourseFilters';

function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        category: 'all',
        difficulty: 'all',
        tutor: 'all',
        search: ''
    });
    const [tutors, setTutors] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCoursesAndTutors = async () => {
            try {
                // Temporary debug in CoursesPage.jsx
                console.log('Firebase db:', db);
                console.log('Firebase auth:', auth);
                console.log('Import path resolved correctly');
                setLoading(true);

                console.log('Fetching courses from Firebase...');

                // Fetch all courses with tutor information
                const coursesQuery = query(
                    collection(db, 'courses'),
                    orderBy('createdAt', 'desc')
                );

                const unsubscribe = onSnapshot(coursesQuery, async (snapshot) => {
                    console.log('Courses snapshot received:', snapshot.docs.length, 'courses');

                    const coursesData = await Promise.all(
                        snapshot.docs.map(async (doc) => {
                            const courseData = doc.data();

                            // Fetch tutor details for each course
                            let tutorData = {};
                            if (courseData.tutorId) {
                                try {
                                    const tutorDoc = await getDoc(doc(db, 'users', courseData.tutorId));
                                    if (tutorDoc.exists()) {
                                        tutorData = tutorDoc.data();
                                    }
                                } catch (error) {
                                    console.error('Error fetching tutor data:', error);
                                }
                            }

                            return {
                                id: doc.id,
                                ...courseData,
                                tutor: tutorData
                            };
                        })
                    );

                    console.log('Processed courses data:', coursesData);
                    setCourses(coursesData);
                    setFilteredCourses(coursesData);

                    // Extract unique tutors and categories
                    const uniqueTutors = [...new Set(coursesData.map(course => course.tutorId).filter(Boolean))];
                    const uniqueCategories = [...new Set(coursesData.map(course => course.category).filter(Boolean))];

                    console.log('Unique tutors:', uniqueTutors);
                    console.log('Unique categories:', uniqueCategories);

                    setTutors(uniqueTutors);
                    setCategories(uniqueCategories);
                    setLoading(false);
                }, (error) => {
                    console.error('Error in courses snapshot:', error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching courses:', error);
                setLoading(false);
            }
        };

        fetchCoursesAndTutors();
    }, []);

    // Apply filters
    useEffect(() => {
        let result = courses;

        if (filters.category !== 'all') {
            result = result.filter(course => course.category === filters.category);
        }

        if (filters.difficulty !== 'all') {
            result = result.filter(course => course.difficulty === filters.difficulty);
        }

        if (filters.tutor !== 'all') {
            result = result.filter(course => course.tutorId === filters.tutor);
        }



        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            result = result.filter(course =>
                course.title?.toLowerCase().includes(searchTerm) ||
                course.description?.toLowerCase().includes(searchTerm) ||
                (course.tutor?.displayName && course.tutor.displayName.toLowerCase().includes(searchTerm))
            );
        }

        setFilteredCourses(result);
    }, [courses, filters]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const clearFilters = () => {
        setFilters({
            category: 'all',
            difficulty: 'all',
            tutor: 'all',
            search: ''
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading courses...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen my-10 lg:mt-30 lg:mb-30">
            <div className="max-w-7xl mx-auto px-[15px] lg:px-4">
                {/* Header */}
                <div className="text-center mb-8 lg:mb-12">
                    <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">
                        Explore Our Courses
                    </h1>
                    <p className="text-base lg:text-xl text-gray-600 max-w-3xl mx-auto">
                        Learn from expert tutors across various subjects. Find the perfect course to advance your skills and knowledge.
                    </p>
                </div>

                {/* Filters */}
                <CourseFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    tutors={tutors}
                    categories={categories}
                    totalCourses={courses.length}
                    filteredCount={filteredCourses.length}
                />

                {/* Courses Grid */}
                <div className="mt-6 lg:mt-8">
                    {filteredCourses.length === 0 ? (
                        <div className="text-center py-10 lg:py-12 bg-white rounded-lg shadow-sm">
                            <i className="fas fa-search text-3xl lg:text-4xl text-gray-300 mb-4"></i>
                            <h3 className="text-lg lg:text-xl font-semibold text-gray-600 mb-2">No courses found</h3>
                            <p className="text-gray-500 text-sm lg:text-base px-4">
                                {courses.length === 0
                                    ? 'No courses available yet. Check back later or create a course if you are a tutor.'
                                    : 'Try adjusting your filters or search terms to find more courses.'
                                }
                            </p>
                            <button
                                onClick={clearFilters}
                                className="mt-4 bg-[#4CBC9A] text-white px-6 py-2 rounded-lg hover:bg-[#3aa384] transition text-sm lg:text-base"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <p className="text-gray-600 text-sm lg:text-base">
                                    Showing {filteredCourses.length} of {courses.length} courses
                                </p>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
                                    <select className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                                        <option>Most Popular</option>
                                        <option>Newest</option>
                                        <option>Highest Rated</option>
                                        <option>Price: Low to High</option>
                                        <option>Price: High to Low</option>
                                    </select>
                                </div>
                            </div>
                            <CoursePreview courses={filteredCourses} />
                        </>
                    )}
                </div>

                {/* Call to Action for Tutors */}
                <div className="mt-10 lg:mt-16 bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] rounded-2xl p-6 lg:p-8 text-center text-white">
                    <h2 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">Become a Tutor</h2>
                    <p className="text-base lg:text-lg mb-6 max-w-2xl mx-auto">
                        Share your knowledge and expertise with students worldwide. Create your own courses and build your teaching portfolio.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
                        <button className="bg-white text-[#6c5dd3] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition active:scale-95 text-sm lg:text-base">
                            Start Teaching Today
                        </button>
                        <button className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#6c5dd3] transition active:scale-95 text-sm lg:text-base">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CoursesPage;