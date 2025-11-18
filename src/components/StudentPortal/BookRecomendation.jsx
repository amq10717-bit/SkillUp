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

            <div className="mt-8 mb-12 font-poppins max-w-7xl mx-auto px-4">
                <div className='grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6'>

                    {/* Left: main content */}
                    <div>
                        <div className='bg-white rounded-2xl p-6 shadow'>
                            <h1 className='text-3xl font-extrabold mb-3'>Personalized Book Recommendations</h1>
                            <p className='text-gray-600 mb-4'>
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
                                        className='w-full p-2 border rounded'
                                    />
                                </div>

                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Desired difficulty</label>
                                    <select
                                        value={desiredDifficulty}
                                        onChange={(e) => setDesiredDifficulty(e.target.value)}
                                        className='w-full p-2 border rounded'
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
                                        className='w-full'
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
                                        className='w-full p-2 border rounded'
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
                                    className='w-full p-2 border rounded'
                                />
                                <div className='text-xs text-gray-500 mt-1'>Optional — helps the model match books to recent work.</div>
                            </div>

                            <div className='flex gap-3 items-center'>
                                <button
                                    onClick={handleGetRecommendations}
                                    disabled={loading}
                                    className='btn-primary px-4 py-2 rounded bg-indigo-600 text-white shadow'
                                >
                                    {loading ? 'Generating...' : 'Generate AI Recommendations'}
                                </button>

                                <button
                                    onClick={() => {
                                        // quick demo fallback: populate with a small sample without calling backend
                                        setRecommendations([
                                            { id: 1, title: 'Clean Code', author: 'Robert C. Martin', description: 'Learn to write maintainable code.', genre: 'programming', rating: 4.7, pages: 464, aiExplanation: 'Suggested for improving code quality', difficulty: 'Intermediate' },
                                            { id: 2, title: 'Design Patterns', author: 'Gamma et al.', description: 'Classic design patterns book.', genre: 'programming', rating: 4.6, pages: 395, aiExplanation: 'Good for architecture & design', difficulty: 'Advanced' }
                                        ]);
                                        setRecError(null);
                                    }}
                                    className='px-3 py-2 border rounded'
                                >
                                    Demo results
                                </button>

                                <div className='ml-auto text-sm text-gray-500'>
                                    {recommendations.length} recommendations
                                </div>
                            </div>

                            {recError && (
                                <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">
                                    Recommendation error: {recError}
                                </div>
                            )}
                        </div>

                        {/* Search + Filters for results */}
                        <div className='bg-white rounded-2xl p-4 mt-6 shadow'>
                            <div className='flex flex-col md:flex-row md:items-center gap-3'>
                                <input
                                    type="text"
                                    placeholder='Search in recommendations...'
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className='flex-1 p-2 border rounded'
                                />
                                <select
                                    value={selectedGenre}
                                    onChange={(e) => setSelectedGenre(e.target.value)}
                                    className='p-2 border rounded'
                                >
                                    {genres.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Results */}
                        <div className='mt-6 space-y-4'>
                            {filteredBooks.length === 0 ? (
                                <div className='bg-white p-6 rounded shadow text-gray-600'>No recommendations yet — generate some above.</div>
                            ) : (
                                filteredBooks.map(book => (
                                    <div key={book.id} className='bg-white p-4 rounded shadow flex gap-4 items-start'>
                                        <div className='w-20 h-28 bg-gray-100 rounded flex items-center justify-center'>
                                            <BookOpenIcon className='w-8 h-8 text-gray-400' />
                                        </div>

                                        <div className='flex-1'>
                                            <div className='flex justify-between items-start'>
                                                <div>
                                                    <h3 className='text-lg font-semibold'>{book.title}</h3>
                                                    <div className='text-sm text-gray-600'>by {book.author}</div>
                                                </div>

                                                <div className='text-right'>
                                                    <div className={`px-2 py-1 rounded text-xs font-medium ${difficultyLevels[book.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                                                        {book.difficulty || 'Unknown'}
                                                    </div>
                                                    <div className='text-sm text-gray-500 mt-1'>{book.rating ?? '-'} ★</div>
                                                </div>
                                            </div>

                                            <p className='text-gray-700 mt-2'>{book.description}</p>

                                            <div className='mt-3 flex flex-wrap items-center gap-3'>
                                                <div className='bg-blue-50 p-2 rounded text-sm text-blue-800'>
                                                    <strong>AI Insight:</strong> {book.aiExplanation ?? book.reason ?? 'No explanation provided.'}
                                                </div>

                                                <button
                                                    onClick={() => addToReadingList(book)}
                                                    className='ml-auto px-3 py-1 bg-green-600 text-white rounded text-sm'
                                                >
                                                    Add to Reading List
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: sidebar */}
                    <aside>
                        <div className='bg-white p-4 rounded shadow mb-4'>
                            <h4 className='font-semibold mb-2'>Quick Stats</h4>
                            <div className='text-sm text-gray-600'>
                                <div className='flex justify-between py-1'><span>Recommendations</span><span className='font-medium'>{recommendations.length}</span></div>
                                <div className='flex justify-between py-1'><span>Reading List</span><span className='font-medium'>{readingList.length}</span></div>
                                <div className='flex justify-between py-1'><span>Skill Level</span><span className='font-medium'>{skillLevel}/5</span></div>
                            </div>
                        </div>

                        <div className='bg-white p-4 rounded shadow mb-4'>
                            <h4 className='font-semibold mb-2'>Recommendation Criteria</h4>
                            <div className='text-sm text-gray-600 space-y-2'>
                                <div className='flex items-center gap-2'><AcademicCapIcon className='w-4 h-4 text-gray-500' /> Assignment Performance</div>
                                <div className='flex items-center gap-2'><BookOpenIcon className='w-4 h-4 text-gray-500' /> Learning Objectives</div>
                                <div className='flex items-center gap-2'><StarIcon className='w-4 h-4 text-gray-500' /> Skill Level & Interests</div>
                            </div>
                        </div>

                        <div className='bg-white p-4 rounded shadow'>
                            <h4 className='font-semibold mb-2'>My Reading List</h4>
                            {readingList.length === 0 ? (
                                <div className='text-sm text-gray-600'>No books added yet.</div>
                            ) : (
                                <div className='space-y-2'>
                                    {readingList.map((b, idx) => (
                                        <div key={idx} className='flex items-start gap-3'>
                                            <div className='w-10 h-12 bg-gray-100 rounded flex items-center justify-center'>
                                                <BookOpenIcon className='w-5 h-5 text-gray-400' />
                                            </div>
                                            <div className='flex-1 text-sm'>
                                                <div className='font-medium'>{b.title}</div>
                                                <div className='text-gray-500'>{b.author}</div>
                                            </div>
                                            <button onClick={() => removeFromReadingList(idx)} className='text-sm text-red-600'>Remove</button>
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
