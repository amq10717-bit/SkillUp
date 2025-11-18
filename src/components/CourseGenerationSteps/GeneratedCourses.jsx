// src/components/GeneratedCourses/GeneratedCourses.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import animation from '../../assets/animation.png';
import Education from '../../assets/Education.png';
import Brain from '../../assets/Brain.png';
import Microscope from '../../assets/Microscope.png';
import CoursePreview from '../CardsPreview/CoursePreview';
import CourseFilters from '../CourseFilters';
import HeroSection from '../Hero Section/HeroSection';

function GeneratedCourses() {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        category: 'all',
        difficulty: 'all',
        tutor: 'all',
        search: '',
        sortBy: 'newest'
    });
    const [tutors, setTutors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tutorsData, setTutorsData] = useState({}); // Store tutor details

    useEffect(() => {
        const fetchCoursesAndTutors = async () => {
            try {
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
                                        // Store tutor data for filters
                                        setTutorsData(prev => ({
                                            ...prev,
                                            [courseData.tutorId]: tutorData
                                        }));
                                    }
                                } catch (error) {
                                    console.error('Error fetching tutor data:', error);
                                }
                            }

                            return {
                                id: doc.id,
                                ...courseData,
                                tutor: tutorData,
                                // Ensure we have safe defaults
                                enrolledCount: courseData.enrolledCount || 0,
                                rating: courseData.rating || 0,
                                lessonsCount: courseData.lessonsCount || 0,
                                duration: courseData.duration || 'Not specified',
                                difficulty: courseData.difficulty || 'beginner',
                                category: courseData.category || 'Uncategorized'
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

    // Apply filters and sorting
    useEffect(() => {
        let result = [...courses];

        // Category filter
        if (filters.category !== 'all') {
            result = result.filter(course => course.category === filters.category);
        }

        // Difficulty filter
        if (filters.difficulty !== 'all') {
            result = result.filter(course => course.difficulty === filters.difficulty);
        }

        // Tutor filter
        if (filters.tutor !== 'all') {
            result = result.filter(course => course.tutorId === filters.tutor);
        }

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            result = result.filter(course =>
                course.title?.toLowerCase().includes(searchTerm) ||
                course.description?.toLowerCase().includes(searchTerm) ||
                (course.tutor?.displayName && course.tutor.displayName.toLowerCase().includes(searchTerm)) ||
                course.category?.toLowerCase().includes(searchTerm)
            );
        }

        // Sorting
        switch (filters.sortBy) {
            case 'newest':
                result = result.sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0));
                break;
            case 'oldest':
                result = result.sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt || 0) - new Date(b.createdAt?.toDate?.() || b.createdAt || 0));
                break;
            case 'popular':
                result = result.sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0));
                break;
            case 'rating':
                result = result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'title-asc':
                result = result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'title-desc':
                result = result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
            default:
                break;
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
            search: '',
            sortBy: 'newest'
        });
    };

    // Get tutor display name
    const getTutorDisplayName = (tutorId) => {
        const tutor = tutorsData[tutorId];
        return tutor?.displayName || tutor?.name || tutor?.fullName || tutor?.username || `Tutor ${tutorId?.slice(0, 8)}` || 'Unknown Tutor';
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
        <div>
            <HeroSection
                title='Explore Our Courses'
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: 'Courses' },
                ]}
            />
            <div className="min-h-screen mt-30 mb-30">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Discover Amazing Courses
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Learn from expert tutors across various subjects. All courses are completely free to enroll and start learning immediately.
                        </p>
                    </div>

                    {/* Course Features */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
                            Why Choose Our Courses?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                                    <img src={animation} alt="Animations" className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Interactive Animations</h3>
                                <p className="text-gray-600 text-sm">Engaging visual content to enhance learning</p>
                            </div>
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                                    <img src={Education} alt="IDE Integration" className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">IDE Integration</h3>
                                <p className="text-gray-600 text-sm">Practice coding with built-in development environment</p>
                            </div>
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                                    <img src={Brain} alt="Quizzes & Assignments" className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Quizzes & Assignments</h3>
                                <p className="text-gray-600 text-sm">Test your knowledge with interactive assessments</p>
                            </div>
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                                    <img src={Microscope} alt="Expert Tutors" className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Expert Tutors</h3>
                                <p className="text-gray-600 text-sm">Learn from experienced industry professionals</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <CourseFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={clearFilters}
                        tutors={tutors}
                        categories={categories}
                        tutorsData={tutorsData}
                        totalCourses={courses.length}
                        filteredCount={filteredCourses.length}
                        getTutorDisplayName={getTutorDisplayName}
                    />

                    {/* Courses Grid Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Available Courses
                            </h2>
                            <p className="text-gray-600">
                                Showing {filteredCourses.length} of {courses.length} courses
                            </p>
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6c5dd3] focus:border-transparent"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                                <option value="rating">Highest Rated</option>
                                <option value="title-asc">Title (A-Z)</option>
                                <option value="title-desc">Title (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {/* Courses Grid */}
                    <div className="mt-8">
                        {filteredCourses.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                                <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
                                <h3 className="text-xl font-semibold text-gray-600 mb-2">No courses found</h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    {courses.length === 0
                                        ? 'No courses available yet. Check back later for new courses.'
                                        : 'Try adjusting your filters or search terms to find more courses.'
                                    }
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="bg-[#6c5dd3] text-white px-6 py-3 rounded-lg hover:bg-[#5a4bbf] transition font-semibold"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        ) : (
                            <CoursePreview courses={filteredCourses} />
                        )}
                    </div>

                    {/* Call to Action */}
                    <div className="mt-16 bg-gradient-to-r from-[#6c5dd3] to-[#4CBC9A] rounded-2xl p-8 text-center text-white">
                        <h2 className="text-2xl font-bold mb-4">Ready to Start Learning?</h2>
                        <p className="text-lg mb-6 max-w-2xl mx-auto">
                            Join thousands of students who are already advancing their skills with our free courses.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="bg-white text-[#6c5dd3] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                            >
                                Browse Top Courses
                            </button>
                            <button className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#6c5dd3] transition">
                                How to Enroll
                            </button>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <div className="text-2xl font-bold text-[#6c5dd3] mb-2">{courses.length}</div>
                            <div className="text-gray-600">Total Courses</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <div className="text-2xl font-bold text-[#4CBC9A] mb-2">
                                {tutors.length}
                            </div>
                            <div className="text-gray-600">Expert Tutors</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <div className="text-2xl font-bold text-[#FEC64F] mb-2">
                                {categories.length}
                            </div>
                            <div className="text-gray-600">Categories</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm">
                            <div className="text-2xl font-bold text-[#FF6B6B] mb-2">
                                {courses.reduce((total, course) => total + (course.enrolledCount || 0), 0)}
                            </div>
                            <div className="text-gray-600">Total Enrollments</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GeneratedCourses;