import React, { useState } from 'react';
import { BookOpenIcon, StarIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import HeroSection from '../Hero Section/HeroSection';

function BookRecommendation() {
    // UI state
    const [activeTab, setActiveTab] = useState('recommendations');

    // Inputs the user can provide to influence the recommender
    const [interestsInput, setInterestsInput] = useState('programming, web-development'); // comma-separated
    const [recentAssignmentsText, setRecentAssignmentsText] = useState('');
    const [desiredDifficulty, setDesiredDifficulty] = useState('Intermediate');
    const [skillLevel, setSkillLevel] = useState(3); // 1..5
    const [numResults, setNumResults] = useState(5);

    // Recommendation state
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]); // results from backend
    const [recError, setRecError] = useState(null);

    // Reading list (local)
    const [readingList, setReadingList] = useState([]);

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
        'Beginner': 'bg-green-100 text-green-800',
        'Intermediate': 'bg-yellow-100 text-yellow-800',
        'Advanced': 'bg-red-100 text-red-800'
    };

    // helper: parse comma-separated interests into array
    const parseInterests = (str) =>
        str.split(',').map(s => s.trim()).filter(Boolean);

    // Call backend recommender
    const handleGetRecommendations = async () => {
        setLoading(true);
        setRecError(null);
        setRecommendations([]); // clear previous

        try {
            const payload = {
                user_id: "student123", // replace with actual logged-in id when available
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

            // Ensure each book has an id (fallback)
            const books = data.books.map((b, i) => ({ id: b.id ?? i + 1, ...b }));
            setRecommendations(books);
        } catch (err) {
            console.error('Recommendation error:', err);
            setRecError(err.message || 'Failed to fetch recommendations');
        } finally {
            setLoading(false);
        }
    };

    // client-side filtered list shown on page
    const filteredBooks = recommendations.filter(book => {
        const matchesGenre = selectedGenre === 'all' || (book.genre && book.genre === selectedGenre);
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q || (book.title && book.title.toLowerCase().includes(q)) ||
            (book.author && book.author.toLowerCase().includes(q)) ||
            (book.description && book.description.toLowerCase().includes(q));
        return matchesGenre && matchesSearch;
    });

    // add to local reading list
    const addToReadingList = (book) => {
        setReadingList(prev => {
            if (prev.find(b => b.title === book.title && b.author === book.author)) return prev;
            return [book, ...prev];
        });
    };

    // remove from reading list
    const removeFromReadingList = (idx) => {
        setReadingList(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div>
            <HeroSection
                title="Book Recommendations"
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: 'Book Recommendations' },
                ]}
            />

            <div className="my-8 lg:mt-30 lg:mb-30 font-poppins max-w-7xl mx-auto px-[15px] lg:px-4">
                {/* Mobile-first: Flex-col for mobile, Grid for desktop */}
                <div className='flex flex-col lg:grid lg:grid-cols-[1fr_360px] gap-6'>

                    {/* Main content */}
                    <div className="order-1 lg:order-1">
                        <div className='bg-white rounded-2xl p-4 lg:p-6 shadow'>
                            <h1 className='text-2xl lg:text-3xl font-extrabold mb-3 text-gray-900'>Personalized Book Recommendations</h1>
                            <p className='text-sm lg:text-base text-gray-600 mb-4 leading-relaxed'>
                                Use the form below to tell the recommender what you like and what you're working on.
                                The AI will use this to suggest the most relevant technical books.
                            </p>

                            {/* Input form */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Interests (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={interestsInput}
                                        onChange={(e) => setInterestsInput(e.target.value)}
                                        placeholder="e.g. programming, web-development, data-science"
                                        className='w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm'
                                    />
                                </div>

                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Desired difficulty</label>
                                    <select
                                        value={desiredDifficulty}
                                        onChange={(e) => setDesiredDifficulty(e.target.value)}
                                        className='w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white'
                                    >
                                        <option>Beginner</option>
                                        <option>Intermediate</option>
                                        <option>Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Skill level (1-5)</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={skillLevel}
                                        onChange={(e) => setSkillLevel(Number(e.target.value))}
                                        className='w-full accent-indigo-600'
                                    />
                                    <div className='text-xs text-gray-600 mt-1'>Current skill level: {skillLevel}</div>
                                </div>

                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Number of results</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={numResults}
                                        onChange={(e) => setNumResults(e.target.value)}
                                        className='w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm'
                                    />
                                </div>
                            </div>

                            <div className='mb-4'>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>Recent assignments or topics (one per line)</label>
                                <textarea
                                    rows={4}
                                    value={recentAssignmentsText}
                                    onChange={(e) => setRecentAssignmentsText(e.target.value)}
                                    placeholder="Paste assignment summaries, topics, or notes..."
                                    className='w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm'
                                />
                                <div className='text-xs text-gray-500 mt-1'>Optional — helps the model match books to recent work.</div>
                            </div>

                            <div className='flex flex-col sm:flex-row gap-3 items-center'>
                                <button
                                    onClick={handleGetRecommendations}
                                    disabled={loading}
                                    className='w-full sm:w-auto btn-primary px-6 py-2.5 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium'
                                >
                                    {loading ? 'Generating...' : 'Generate AI Recommendations'}
                                </button>

                                <button
                                    onClick={() => {
                                        setRecommendations([
                                            { id: 1, title: 'Clean Code', author: 'Robert C. Martin', description: 'Learn to write maintainable code.', genre: 'programming', rating: 4.7, pages: 464, aiExplanation: 'Suggested for improving code quality', difficulty: 'Intermediate' },
                                            { id: 2, title: 'Design Patterns', author: 'Gamma et al.', description: 'Classic design patterns book.', genre: 'programming', rating: 4.6, pages: 395, aiExplanation: 'Good for architecture & design', difficulty: 'Advanced' }
                                        ]);
                                        setRecError(null);
                                    }}
                                    className='w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium'
                                >
                                    Demo results
                                </button>

                                <div className='w-full sm:w-auto sm:ml-auto text-center sm:text-right text-sm text-gray-500'>
                                    {recommendations.length} recommendations
                                </div>
                            </div>

                            {recError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    Recommendation error: {recError}
                                </div>
                            )}
                        </div>

                        {/* Search + Filters for results */}
                        <div className='bg-white rounded-2xl p-4 mt-6 shadow'>
                            <div className='flex flex-col sm:flex-row gap-3'>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder='Search in recommendations...'
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className='w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm'
                                    />
                                    <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                                </div>
                                <select
                                    value={selectedGenre}
                                    onChange={(e) => setSelectedGenre(e.target.value)}
                                    className='w-full sm:w-auto p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white'
                                >
                                    {genres.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Results */}
                        <div className='mt-6 space-y-4'>
                            {filteredBooks.length === 0 ? (
                                <div className='bg-white p-8 rounded-xl shadow text-center text-gray-500'>
                                    <i className="fas fa-book-reader text-4xl mb-3 text-gray-300"></i>
                                    <p>No recommendations yet — generate some above.</p>
                                </div>
                            ) : (
                                filteredBooks.map(book => (
                                    <div key={book.id} className='bg-white p-4 lg:p-5 rounded-xl shadow flex flex-col sm:flex-row gap-4 items-start hover:shadow-md transition-shadow'>
                                        <div className='w-full sm:w-24 h-32 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 self-center sm:self-start'>
                                            <BookOpenIcon className='w-10 h-10 text-gray-400' />
                                        </div>

                                        <div className='flex-1 w-full'>
                                            <div className='flex flex-col sm:flex-row justify-between items-start gap-2 mb-2'>
                                                <div>
                                                    <h3 className='text-lg font-bold text-gray-900 leading-tight'>{book.title}</h3>
                                                    <div className='text-sm text-gray-600 mt-0.5'>by {book.author}</div>
                                                </div>

                                                <div className='flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 w-full sm:w-auto justify-between sm:justify-start'>
                                                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${difficultyLevels[book.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                                                        {book.difficulty || 'Unknown'}
                                                    </div>
                                                    <div className='text-sm font-semibold text-yellow-500 sm:mt-1 flex items-center gap-1'>
                                                        {book.rating ?? '-'} <i className="fas fa-star text-xs"></i>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className='text-sm text-gray-700 mt-2 line-clamp-3 leading-relaxed'>{book.description}</p>

                                            <div className='mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3'>
                                                <div className='bg-blue-50 p-2.5 rounded-lg text-xs lg:text-sm text-blue-800 w-full sm:w-auto flex-1 border border-blue-100'>
                                                    <strong className="block sm:inline mb-1 sm:mb-0 mr-1">AI Insight:</strong>
                                                    {book.aiExplanation ?? book.reason ?? 'No explanation provided.'}
                                                </div>

                                                <button
                                                    onClick={() => addToReadingList(book)}
                                                    className='w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95'
                                                >
                                                    Add to List
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: sidebar (Stacked below on mobile) */}
                    <aside className="order-2 lg:order-2 space-y-4 lg:sticky lg:top-6 h-fit">
                        <div className='bg-white p-4 lg:p-5 rounded-xl shadow'>
                            <h4 className='font-bold text-gray-900 mb-3 text-sm lg:text-base'>Quick Stats</h4>
                            <div className='text-sm text-gray-600 space-y-2'>
                                <div className='flex justify-between py-1 border-b border-gray-100 last:border-0'>
                                    <span>Recommendations</span>
                                    <span className='font-medium text-gray-900'>{recommendations.length}</span>
                                </div>
                                <div className='flex justify-between py-1 border-b border-gray-100 last:border-0'>
                                    <span>Reading List</span>
                                    <span className='font-medium text-gray-900'>{readingList.length}</span>
                                </div>
                                <div className='flex justify-between py-1 border-b border-gray-100 last:border-0'>
                                    <span>Skill Level</span>
                                    <span className='font-medium text-gray-900'>{skillLevel}/5</span>
                                </div>
                            </div>
                        </div>

                        <div className='bg-white p-4 lg:p-5 rounded-xl shadow'>
                            <h4 className='font-bold text-gray-900 mb-3 text-sm lg:text-base'>Recommendation Criteria</h4>
                            <div className='text-sm text-gray-600 space-y-3'>
                                <div className='flex items-center gap-2'>
                                    <div className="p-1.5 bg-indigo-50 rounded text-indigo-600"><AcademicCapIcon className='w-4 h-4' /></div>
                                    Assignment Performance
                                </div>
                                <div className='flex items-center gap-2'>
                                    <div className="p-1.5 bg-green-50 rounded text-green-600"><BookOpenIcon className='w-4 h-4' /></div>
                                    Learning Objectives
                                </div>
                                <div className='flex items-center gap-2'>
                                    <div className="p-1.5 bg-yellow-50 rounded text-yellow-600"><StarIcon className='w-4 h-4' /></div>
                                    Skill Level & Interests
                                </div>
                            </div>
                        </div>

                        <div className='bg-white p-4 lg:p-5 rounded-xl shadow'>
                            <h4 className='font-bold text-gray-900 mb-3 text-sm lg:text-base flex items-center justify-between'>
                                My Reading List
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{readingList.length}</span>
                            </h4>
                            {readingList.length === 0 ? (
                                <div className='text-sm text-gray-500 text-center py-4 italic bg-gray-50 rounded-lg border border-dashed border-gray-200'>
                                    No books added yet.
                                </div>
                            ) : (
                                <div className='space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar'>
                                    {readingList.map((b, idx) => (
                                        <div key={idx} className='flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group'>
                                            <div className='w-10 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0'>
                                                <BookOpenIcon className='w-5 h-5 text-gray-400' />
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <div className='font-medium text-sm text-gray-900 truncate'>{b.title}</div>
                                                <div className='text-xs text-gray-500 truncate'>{b.author}</div>
                                            </div>
                                            <button
                                                onClick={() => removeFromReadingList(idx)}
                                                className='text-gray-400 hover:text-red-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100'
                                                aria-label="Remove book"
                                            >
                                                <i className="fas fa-trash-alt text-sm"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default BookRecommendation;
