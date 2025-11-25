import React, { useState, useEffect } from 'react';
import { BookOpenIcon, StarIcon, AcademicCapIcon, BookmarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { readingListService } from '../../firebase'; // Adjust path as needed

function BookRecommendation() {
    // UI state
    const [activeTab, setActiveTab] = useState('recommendations');

    // Inputs the user can provide to influence the recommender
    const [interestsInput, setInterestsInput] = useState('programming, web-development');
    const [recentAssignmentsText, setRecentAssignmentsText] = useState('');
    const [desiredDifficulty, setDesiredDifficulty] = useState('Intermediate');
    const [skillLevel, setSkillLevel] = useState(3);
    const [numResults, setNumResults] = useState(5);

    // Recommendation state
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [recError, setRecError] = useState(null);

    // Reading list (now with Firebase persistence)
    const [readingList, setReadingList] = useState([]);
    const [readingListLoading, setReadingListLoading] = useState(true);
    const userId = "student123"; // In real app, get from auth

    // Client-side filtering/search UI
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('all');

    const genres = [
        { value: 'all', label: 'All Genres' },
        { value: 'programming', label: 'Programming' },
        { value: 'software-engineering', label: 'Software Engineering' },
        { value: 'computer-science', label: 'Computer Science' },
        { value: 'data-science', label: 'Data Science' },
        { value: 'web-development', label: 'Web Development' }
    ];

    const difficultyLevels = {
        'Beginner': 'bg-green-100 text-green-800 border border-green-200',
        'Intermediate': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        'Advanced': 'bg-red-100 text-red-800 border border-red-200'
    };

    // Load reading list from Firebase on component mount
    useEffect(() => {
        loadReadingList();
    }, []);

    const loadReadingList = async () => {
        setReadingListLoading(true);
        try {
            const books = await readingListService.getReadingList(userId);
            setReadingList(books);
        } catch (error) {
            console.error('Failed to load reading list:', error);
        } finally {
            setReadingListLoading(false);
        }
    };
    const getRandomCoverColor = () => {
        const colors = [

            'bg-gradient-to-br from-purple-500 to-purple-600',

        ];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // helper: parse comma-separated interests into array
    const parseInterests = (str) =>
        str.split(',').map(s => s.trim()).filter(Boolean);

    // Call backend recommender with artificial delay
    const handleGetRecommendations = async () => {
        setLoading(true);
        setRecError(null);
        setRecommendations([]);

        try {
            const payload = {
                user_id: userId,
                interests: parseInterests(interestsInput),
                recent_assignments:
                    recentAssignmentsText
                        .split('\n')
                        .map(s => s.trim())
                        .filter(Boolean),
                desired_difficulty: desiredDifficulty,
                skill_level: skillLevel,
                num_results: Number(numResults) || 5
            };

            // Add artificial delay of 4-5 seconds
            const delay = Math.random() * 1000 + 4000; // 4000-5000ms
            await new Promise(resolve => setTimeout(resolve, delay));

            const res = await fetch('http://localhost:8000/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Server ${res.status}: ${txt}`);
            }

            const data = await res.json();

            if (!data || !Array.isArray(data.books)) {
                throw new Error('Invalid response format. Expected { books: [...] }');
            }

            const books = data.books.map((b, i) => ({
                id: b.id ?? i + 1,
                ...b,
                coverColor: getRandomCoverColor()
            }));
            setRecommendations(books);
        } catch (err) {
            console.error('Recommendation error:', err);
            setRecError(err.message || 'Failed to fetch recommendations');
        } finally {
            setLoading(false);
        }
    };

    // Demo books with proper cover colors
    const demoBooks = [
        {
            id: 1,
            title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
            author: 'Robert C. Martin',
            description: 'Learn to write clean, maintainable code with practical examples and best practices that will make you a better programmer.',
            genre: 'programming',
            rating: 4.7,
            pages: 464,
            aiExplanation: 'Perfect for improving code quality and learning software craftsmanship principles that align with your recent assignments.',
            difficulty: 'Intermediate',
            coverColor: 'bg-gradient-to-br from-blue-500 to-blue-600'
        },
        {
            id: 2,
            title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
            author: 'Gamma, Helm, Johnson, Vlissides',
            description: 'The classic book on design patterns that every serious software developer should read. Learn reusable solutions to common problems.',
            genre: 'software-engineering',
            rating: 4.6,
            pages: 395,
            aiExplanation: 'Excellent for understanding software architecture and design principles relevant to your current projects.',
            difficulty: 'Advanced',
            coverColor: 'bg-gradient-to-br from-purple-500 to-purple-600'
        },
        {
            id: 3,
            title: 'The Pragmatic Programmer',
            author: 'Andrew Hunt, David Thomas',
            description: 'A practical guide to software development that covers everything from personal responsibility to architectural techniques.',
            genre: 'programming',
            rating: 4.8,
            pages: 352,
            aiExplanation: 'Great for developing practical programming skills and professional development.',
            difficulty: 'Intermediate',
            coverColor: 'bg-gradient-to-br from-green-500 to-green-600'
        },
        {
            id: 4,
            title: 'Introduction to Algorithms',
            author: 'Cormen, Leiserson, Rivest, Stein',
            description: 'The comprehensive guide to algorithms used by students and professionals worldwide.',
            genre: 'computer-science',
            rating: 4.5,
            pages: 1312,
            aiExplanation: 'Essential for building strong fundamentals in algorithms and data structures.',
            difficulty: 'Advanced',
            coverColor: 'bg-gradient-to-br from-red-500 to-red-600'
        },
        {
            id: 5,
            title: 'You Don\'t Know JS',
            author: 'Kyle Simpson',
            description: 'Deep dive into JavaScript mechanisms and how to effectively use the language.',
            genre: 'web-development',
            rating: 4.6,
            pages: 450,
            aiExplanation: 'Perfect for mastering JavaScript fundamentals and advanced concepts.',
            difficulty: 'Intermediate',
            coverColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600'
        }
    ];

    // client-side filtered list shown on page
    const filteredBooks = recommendations.filter(book => {
        const matchesGenre = selectedGenre === 'all' || (book.genre && book.genre === selectedGenre);
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q || (book.title && book.title.toLowerCase().includes(q)) ||
            (book.author && book.author.toLowerCase().includes(q)) ||
            (book.description && book.description.toLowerCase().includes(q));
        return matchesGenre && matchesSearch;
    });

    // Updated: add to reading list with Firebase persistence
    const addToReadingList = async (book) => {
        // Check if book already exists in reading list
        const existingBook = readingList.find(b =>
            b.id === book.id || b.title === book.title && b.author === book.author
        );

        if (existingBook) {
            return; // Book already in reading list
        }

        // Optimistic update
        const newBook = {
            ...book,
            addedAt: new Date().toISOString(),
            firebaseId: book.id || Date.now() // Ensure unique ID
        };

        setReadingList(prev => [newBook, ...prev]);

        // Sync with Firebase
        try {
            const success = await readingListService.addToReadingList(userId, newBook);
            if (!success) {
                // Revert on error
                setReadingList(prev => prev.filter(b => b.firebaseId !== newBook.firebaseId));
                console.error('Failed to add book to reading list');
            }
        } catch (error) {
            // Revert on error
            setReadingList(prev => prev.filter(b => b.firebaseId !== newBook.firebaseId));
            console.error('Error adding to reading list:', error);
        }
    };

    // Updated: remove from reading list with Firebase persistence
    const removeFromReadingList = async (bookId) => {
        // Optimistic update
        setReadingList(prev => prev.filter(book =>
            book.firebaseId !== bookId && book.id !== bookId
        ));

        // Sync with Firebase
        try {
            const success = await readingListService.removeFromReadingList(userId, bookId);
            if (!success) {
                // Reload from Firebase on error
                loadReadingList();
            }
        } catch (error) {
            // Reload from Firebase on error
            loadReadingList();
            console.error('Error removing from reading list:', error);
        }
    };

    // Updated: clear reading list with Firebase persistence
    const clearReadingList = async () => {
        // Optimistic update
        setReadingList([]);

        // Sync with Firebase
        try {
            const success = await readingListService.clearReadingList(userId);
            if (!success) {
                // Reload from Firebase on error
                loadReadingList();
            }
        } catch (error) {
            // Reload from Firebase on error
            loadReadingList();
            console.error('Error clearing reading list:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-poppins">
            <div className="max-w-7xl mt-[70px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className='flex flex-col lg:flex-row gap-8'>

                    {/* Main Content */}
                    <div className="lg:w-3/4 space-y-8">
                        {/* Header Card */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 lg:p-8 text-white shadow-lg">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h1 className="text-2xl md:text-4xl font-bold mb-2">Personalized Book Recommendations</h1>
                                    <p className="text-indigo-100 text-base lg:text-lg max-w-2xl">
                                        Get AI-powered book suggestions tailored to your interests, skill level, and learning goals.
                                    </p>
                                </div>
                                <div className="mt-4 lg:mt-0">
                                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                                        <div className="text-2xl font-bold">{recommendations.length}</div>
                                        <div className="text-sm text-indigo-100">Books Recommended</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Input Form Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
                            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                <i className="fas fa-robot text-indigo-600"></i>
                                AI Recommendation Settings
                            </h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-heart text-red-500"></i>
                                        Interests
                                    </label>
                                    <input
                                        type="text"
                                        value={interestsInput}
                                        onChange={(e) => setInterestsInput(e.target.value)}
                                        placeholder="e.g. programming, web-development, data-science"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-chart-line text-blue-500"></i>
                                        Desired Difficulty
                                    </label>
                                    <select
                                        value={desiredDifficulty}
                                        onChange={(e) => setDesiredDifficulty(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                                    >
                                        <option>Beginner</option>
                                        <option>Intermediate</option>
                                        <option>Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-brain text-purple-500"></i>
                                        Skill Level: {skillLevel}/5
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={skillLevel}
                                        onChange={(e) => setSkillLevel(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Beginner</span>
                                        <span>Expert</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-list-ol text-green-500"></i>
                                        Number of Results
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={numResults}
                                        onChange={(e) => setNumResults(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <i className="fas fa-tasks text-orange-500"></i>
                                    Recent Assignments & Topics
                                </label>
                                <textarea
                                    rows={4}
                                    value={recentAssignmentsText}
                                    onChange={(e) => setRecentAssignmentsText(e.target.value)}
                                    placeholder="Paste assignment summaries, topics, or notes (one per line)..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                                />
                                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <i className="fas fa-info-circle text-blue-500"></i>
                                    Optional — helps the AI match books to your recent work
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <button
                                    onClick={handleGetRecommendations}
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-8 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Generating Recommendations...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-magic"></i>
                                            Generate AI Recommendations
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setRecommendations(demoBooks);
                                        setRecError(null);
                                    }}
                                    disabled={loading}
                                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50"
                                >
                                    <i className="fas fa-eye"></i>
                                    View Demo Results
                                </button>
                            </div>

                            {recError && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                    <i className="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
                                    <div>
                                        <div className="font-medium text-red-800">Recommendation Error</div>
                                        <div className="text-sm text-red-600 mt-1">{recError}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Loading Animation */}
                        {loading && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                                <div className="max-w-md mx-auto">
                                    {/* Animated AI Icon */}
                                    <div className="w-20 h-20 mx-auto mb-6 relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse z-0"></div>

                                        <i className="fas fa-robot text-white text-2xl absolute inset-0 flex items-center justify-center z-10"></i>
                                    </div>


                                    {/* Loading Text */}
                                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Analyzing Your Preferences</h3>
                                    <p className="text-gray-600 mb-6">
                                        Our AI is carefully selecting books based on your interests, skill level, and learning goals...
                                    </p>

                                    {/* Animated Progress */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Processing interests...</span>
                                            <span>Analyzing skill level...</span>
                                            <span>Matching books...</span>
                                        </div>

                                        {/* Animated Progress Bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full animate-pulse transition-all duration-1000"
                                                style={{
                                                    width: '100%',
                                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                                }}
                                            ></div>
                                        </div>

                                        {/* Loading Dots */}
                                        <div className="flex justify-center space-x-1">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>

                                        <div className="text-sm text-gray-500 italic">
                                            This usually takes 4-5 seconds...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search and Filter Card */}
                        {!loading && recommendations.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex flex-col lg:flex-row gap-4 items-center">
                                    <div className="relative flex-1 w-full">
                                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search in recommendations..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                                        />
                                    </div>
                                    <select
                                        value={selectedGenre}
                                        onChange={(e) => setSelectedGenre(e.target.value)}
                                        className="w-full lg:w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                                    >
                                        {genres.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>
                                </div>
                                <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fas fa-filter text-indigo-500"></i>
                                    Showing {filteredBooks.length} of {recommendations.length} books
                                </div>
                            </div>
                        )}

                        {/* Recommendations Grid */}
                        {!loading && (
                            <div className="space-y-6">
                                {filteredBooks.length === 0 && recommendations.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <BookOpenIcon className="w-10 h-10 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Recommendations Yet</h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Use the AI recommendation tool above to get personalized book suggestions based on your interests and learning goals.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                                        {filteredBooks.map(book => (
                                            <div key={book.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                                                <div className="p-6">
                                                    <div className="flex gap-4">
                                                        {/* Book Cover - FIXED: Using proper gradient classes */}
                                                        <div className={`w-20 h-28 rounded-lg ${book.coverColor || 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                                                            <BookOpenIcon className="w-8 h-8 text-white" />
                                                        </div>

                                                        {/* Book Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                                                <div className="flex-1">
                                                                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                                                        {book.title}
                                                                    </h3>
                                                                    <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                                                        <i className="fas fa-user-edit text-gray-400"></i>
                                                                        by {book.author}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col items-end gap-2">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyLevels[book.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                                                                        {book.difficulty || 'Unknown'}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                                                                        {book.rating ?? '4.5'}
                                                                        <i className="fas fa-star text-xs"></i>
                                                                        <span className="text-gray-400 text-xs">({book.pages || '300'} pages)</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-4">
                                                                {book.description}
                                                            </p>

                                                            {/* AI Insight */}
                                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 mb-4">
                                                                <div className="flex items-start gap-2">
                                                                    <i className="fas fa-brain text-blue-500 mt-0.5"></i>
                                                                    <div>
                                                                        <div className="text-xs font-medium text-blue-800 mb-1">AI INSIGHT</div>
                                                                        <div className="text-sm text-blue-700 leading-relaxed">
                                                                            {book.aiExplanation ?? book.reason ?? 'Recommended based on your learning profile and interests.'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <i className="fas fa-tag text-gray-400"></i>
                                                                    {book.genre || 'Programming'}
                                                                </div>
                                                                <button
                                                                    onClick={() => addToReadingList(book)}
                                                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center gap-2 text-sm"
                                                                >
                                                                    <BookmarkIcon className="w-4 h-4" />
                                                                    Add to Reading List
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-1/4 space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-chart-bar text-indigo-600"></i>
                                Reading Analytics
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <div>
                                        <div className="text-2xl font-bold text-blue-600">{recommendations.length}</div>
                                        <div className="text-sm text-blue-600 font-medium">Books Recommended</div>
                                    </div>
                                    <i className="fas fa-book text-blue-400 text-xl"></i>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">{readingList.length}</div>
                                        <div className="text-sm text-green-600 font-medium">Reading List</div>
                                    </div>
                                    <i className="fas fa-bookmark text-green-400 text-xl"></i>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                    <div>
                                        <div className="text-2xl font-bold text-purple-600">{skillLevel}/5</div>
                                        <div className="text-sm text-purple-600 font-medium">Skill Level</div>
                                    </div>
                                    <i className="fas fa-brain text-purple-400 text-xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Recommendation Criteria */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-cogs text-indigo-600"></i>
                                Recommendation Criteria
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-800 text-sm">Assignment Performance</div>
                                        <div className="text-xs text-gray-600">Based on recent work</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpenIcon className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-800 text-sm">Learning Objectives</div>
                                        <div className="text-xs text-gray-600">Matches your goals</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <StarIcon className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-800 text-sm">Skill Level & Interests</div>
                                        <div className="text-xs text-gray-600">Personalized to you</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reading List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-bookmark text-indigo-600"></i>
                                    My Reading List
                                </h3>
                                <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium">
                                    {readingList.length}
                                </span>
                            </div>

                            {readingListLoading ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                    <i className="fas fa-spinner fa-spin text-2xl text-indigo-500 mb-3"></i>
                                    <div className="text-sm font-medium text-gray-600">Loading reading list...</div>
                                </div>
                            ) : readingList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                    <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <div className="text-sm font-medium text-gray-600 mb-1">No books added yet</div>
                                    <div className="text-xs text-gray-500">Add books from recommendations</div>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    {readingList.map((book, idx) => (
                                        <div key={book.firebaseId || book.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                                            {/* Reading list book covers with proper gradients */}
                                            <div className={`w-12 h-16 rounded ${book.coverColor || 'bg-gradient-to-br from-indigo-400 to-purple-500'} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                <BookOpenIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800 text-sm leading-tight line-clamp-2">{book.title}</div>
                                                <div className="text-xs text-gray-500 truncate">{book.author}</div>
                                            </div>
                                            <button
                                                onClick={() => removeFromReadingList(book.firebaseId || book.id)}
                                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-all duration-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                aria-label="Remove book"
                                            >
                                                <i className="fas fa-trash-alt text-sm"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {readingList.length > 0 && (
                                <button
                                    onClick={clearReadingList}
                                    className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-trash"></i>
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookRecommendation;