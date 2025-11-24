import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { reviewStudentCode } from '../services/geminiService.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import { useAuthState } from 'react-firebase-hooks/auth';

const IDE = () => {
    const [user] = useAuthState(auth);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [codeReview, setCodeReview] = useState({
        task: '',
        feedback: '',
        reviewing: false,
        showReview: false
    });
    const [savedSnippets, setSavedSnippets] = useState([]);
    const [showSnippets, setShowSnippets] = useState(false);
    const [activeTab, setActiveTab] = useState('editor');

    // Sample starter code for different languages
    const starterCode = {
        python: `# Welcome to Python IDE with AI Assistant
# Write your Python code here and get instant execution + AI feedback

def welcome_message():
    return "Hello, World! Welcome to AI-Powered IDE"

def calculate_factorial(n):
    if n == 0:
        return 1
    else:
        return n * calculate_factorial(n-1)

# Example usage
if __name__ == "__main__":
    print(welcome_message())
    number = 5
    result = calculate_factorial(number)
    print(f"The factorial of {number} is: {result}")
    
    # Try adding your own functions below!`,

        javascript: `// Welcome to JavaScript IDE with AI Assistant
// Write your JavaScript code here and get instant execution + AI feedback

function welcomeMessage() {
    return "Hello, World! Welcome to AI-Powered IDE";
}

function calculateFactorial(n) {
    if (n === 0) return 1;
    return n * calculateFactorial(n - 1);
}

// Example usage
console.log(welcomeMessage());
const number = 5;
const result = calculateFactorial(number);
console.log(\`The factorial of \${number} is: \${result}\`);

// Try adding your own functions below!`,

        java: `// Welcome to Java IDE with AI Assistant
// Write your Java code here and get instant execution + AI feedback

public class Main {
    
    public static String welcomeMessage() {
        return "Hello, World! Welcome to AI-Powered IDE";
    }
    
    public static int calculateFactorial(int n) {
        if (n == 0) return 1;
        return n * calculateFactorial(n - 1);
    }
    
    public static void main(String[] args) {
        System.out.println(welcomeMessage());
        int number = 5;
        int result = calculateFactorial(number);
        System.out.println("The factorial of " + number + " is: " + result);
        
        // Try adding your own methods below!
    }
}`,

        cpp: `// Welcome to C++ IDE with AI Assistant
// Write your C++ code here and get instant execution + AI feedback

#include <iostream>
#include <string>
using namespace std;

string welcomeMessage() {
    return "Hello, World! Welcome to AI-Powered IDE";
}

int calculateFactorial(int n) {
    if (n == 0) return 1;
    return n * calculateFactorial(n - 1);
}

int main() {
    cout << welcomeMessage() << endl;
    int number = 5;
    int result = calculateFactorial(number);
    cout << "The factorial of " << number << " is: " << result << endl;
    
    // Try adding your own functions below!
    return 0;
}`,

        c: `// Welcome to C IDE with AI Assistant
// Write your C code here and get instant execution + AI feedback

#include <stdio.h>
#include <string.h>

char* welcomeMessage() {
    return "Hello, World! Welcome to AI-Powered IDE";
}

int calculateFactorial(int n) {
    if (n == 0) return 1;
    return n * calculateFactorial(n - 1);
}

int main() {
    printf("%s\\n", welcomeMessage());
    int number = 5;
    int result = calculateFactorial(number);
    printf("The factorial of %d is: %d\\n", number, result);
    
    // Try adding your own functions below!
    return 0;
}`
    };

    // Set initial code based on selected language
    useEffect(() => {
        setCode(starterCode[language]);
        setOutput('');
        setError('');
        setCodeReview(prev => ({ ...prev, feedback: '', task: '' }));
    }, [language]);

    // Load user's saved code snippets
    useEffect(() => {
        const loadSavedSnippets = async () => {
            if (!user) return;

            try {
                // This would typically fetch from Firestore
                // For now, we'll use localStorage as a demo
                const saved = localStorage.getItem(`ide_snippets_${user.uid}`);
                if (saved) {
                    setSavedSnippets(JSON.parse(saved));
                }
            } catch (error) {
                console.error('Error loading snippets:', error);
            }
        };

        loadSavedSnippets();
    }, [user]);

    // Piston API configuration
    const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

    const executeCode = async () => {
        setIsLoading(true);
        setError('');
        setOutput('');
        setCodeReview(prev => ({ ...prev, showReview: false }));

        try {
            const response = await axios.post(PISTON_API_URL, {
                language: language,
                version: getLanguageVersion(language),
                files: [
                    {
                        content: code
                    }
                ]
            });

            const result = response.data;
            if (result.run) {
                if (result.run.stdout) {
                    setOutput(result.run.stdout);
                } else if (result.run.stderr) {
                    setOutput(`Error: ${result.run.stderr}`);
                } else {
                    setOutput('Code executed successfully (no output)');
                }
            }

            // Save execution history
            if (user) {
                try {
                    await addDoc(collection(db, 'code_executions'), {
                        userId: user.uid,
                        language: language,
                        code: code,
                        output: result.run.stdout || result.run.stderr || 'No output',
                        timestamp: serverTimestamp(),
                        success: !result.run.stderr
                    });
                } catch (dbError) {
                    console.error('Error saving execution history:', dbError);
                }
            }
        } catch (err) {
            setError('Failed to execute code: ' + err.message);
            console.error('Execution error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getLanguageVersion = (lang) => {
        const versions = {
            python: '3.10.0',
            javascript: '18.15.0',
            java: '15.0.2',
            cpp: '10.2.0',
            c: '10.2.0',
            rust: '1.68.2',
            go: '1.16.2'
        };
        return versions[lang] || 'latest';
    };

    const getCodeReview = async () => {
        if (!code.trim()) {
            setError('Please write some code first');
            return;
        }

        setCodeReview(prev => ({ ...prev, reviewing: true, feedback: '' }));
        try {
            const feedback = await reviewStudentCode(
                code,
                language,
                codeReview.task || 'General code practice and improvement',
                'Student practicing programming in the IDE'
            );

            setCodeReview(prev => ({
                ...prev,
                feedback,
                reviewing: false,
                showReview: true
            }));

            // Save code review session
            if (user) {
                try {
                    await addDoc(collection(db, 'code_reviews'), {
                        userId: user.uid,
                        language: language,
                        code: code,
                        task: codeReview.task,
                        feedback: feedback,
                        timestamp: serverTimestamp()
                    });
                } catch (dbError) {
                    console.error('Error saving code review:', dbError);
                }
            }
        } catch (error) {
            console.error('Error getting code review:', error);
            setCodeReview(prev => ({
                ...prev,
                feedback: 'Sorry, I encountered an error reviewing your code. Please try again.',
                reviewing: false,
                showReview: true
            }));
        }
    };

    const handleClear = () => {
        setCode(starterCode[language]);
        setOutput('');
        setError('');
        setCodeReview(prev => ({ ...prev, feedback: '', task: '', showReview: false }));
    };

    const saveCodeSnippet = () => {
        if (!user) {
            alert('Please log in to save code snippets');
            return;
        }

        const snippetName = prompt('Enter a name for your code snippet:');
        if (!snippetName) return;

        const newSnippet = {
            id: Date.now().toString(),
            name: snippetName,
            code: code,
            language: language,
            timestamp: new Date().toISOString()
        };

        const updatedSnippets = [newSnippet, ...savedSnippets.slice(0, 9)]; // Keep last 10
        setSavedSnippets(updatedSnippets);

        // Save to localStorage (in real app, save to Firestore)
        localStorage.setItem(`ide_snippets_${user.uid}`, JSON.stringify(updatedSnippets));

        alert('Code snippet saved successfully!');
    };

    const loadCodeSnippet = (snippet) => {
        setCode(snippet.code);
        setLanguage(snippet.language);
        setShowSnippets(false);
        setOutput('');
        setError('');
        setCodeReview(prev => ({ ...prev, feedback: '', showReview: false }));
    };

    const deleteCodeSnippet = (snippetId) => {
        const updatedSnippets = savedSnippets.filter(s => s.id !== snippetId);
        setSavedSnippets(updatedSnippets);
        localStorage.setItem(`ide_snippets_${user.uid}`, JSON.stringify(updatedSnippets));
    };

    const exportCode = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code.${getFileExtension(language)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getFileExtension = (lang) => {
        const extensions = {
            python: 'py',
            javascript: 'js',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            rust: 'rs',
            go: 'go'
        };
        return extensions[lang] || 'txt';
    };

    const suggestImprovements = () => {
        const suggestions = {
            python: `# AI Suggestions for Python Code:

# 1. Add error handling
try:
    # your code here
    pass
except Exception as e:
    print(f"Error: {e}")

# 2. Use type hints for better readability
def function_name(param: type) -> return_type:
    pass

# 3. Add docstrings for documentation
def my_function():
    """Explain what this function does."""
    pass

# 4. Use list comprehensions for concise code
# Instead of:
# result = []
# for item in items:
#     result.append(item * 2)
# Use:
# result = [item * 2 for item in items]

# 5. Follow PEP 8 style guide`,

            javascript: `// AI Suggestions for JavaScript Code:

// 1. Use const/let instead of var
const constantValue = 'hello';
let variableValue = 'world';

// 2. Add error handling
try {
    // your code here
} catch (error) {
    console.error('Error:', error);
}

// 3. Use arrow functions for concise syntax
const myFunction = (param) => {
    return param * 2;
};

// 4. Use template literals for string interpolation
const name = 'John';
console.log(\`Hello, \${name}!\`);

// 5. Add JSDoc comments for documentation
/**
 * Describe what this function does
 * @param {type} param - parameter description
 * @returns {type} return description
 */`,

            java: `// AI Suggestions for Java Code:

// 1. Use meaningful variable names
int numberOfStudents = 10; // Instead of 'int n = 10;'

// 2. Add proper exception handling
try {
    // your code here
} catch (Exception e) {
    System.err.println("Error: " + e.getMessage());
}

// 3. Use StringBuilder for string concatenation in loops
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10; i++) {
    sb.append(i);
}

// 4. Add JavaDoc comments
/**
 * Describe what this method does
 * @param parameter description
 * @return return description
 */

// 5. Follow Java naming conventions
// Classes: PascalCase, methods: camelCase, constants: UPPER_CASE`
        };

        setCodeReview(prev => ({
            ...prev,
            task: 'General coding best practices and improvements',
            feedback: suggestions[language] || 'Focus on: Error handling, Code readability, Documentation, Performance optimization'
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6 lg:py-8">
            <div className="max-w-7xl mx-auto px-[15px] lg:px-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1 lg:mb-2 flex items-center gap-2">
                                <i className="fas fa-laptop-code text-[#6c5dd3]"></i>
                                AI-Powered Code IDE
                            </h1>
                            <p className="text-gray-600 text-sm lg:text-base">
                                Write, execute, and get AI feedback on your code in multiple programming languages
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowSnippets(!showSnippets)}
                                className="bg-[#6c5dd3] text-white px-4 py-2 rounded-lg hover:bg-[#5a4bbf] transition flex items-center gap-2 text-sm"
                            >
                                <i className="fas fa-save"></i>
                                My Snippets ({savedSnippets.length})
                            </button>
                            <button
                                onClick={exportCode}
                                className="bg-[#4CBC9A] text-white px-4 py-2 rounded-lg hover:bg-[#3aa384] transition flex items-center gap-2 text-sm"
                            >
                                <i className="fas fa-download"></i>
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* Saved Snippets Panel */}
                {showSnippets && (
                    <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">My Code Snippets</h3>
                            <button
                                onClick={() => setShowSnippets(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        {savedSnippets.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <i className="fas fa-code text-3xl mb-3"></i>
                                <p>No saved code snippets yet</p>
                                <p className="text-sm">Save your code to access it later</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savedSnippets.map((snippet) => (
                                    <div key={snippet.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-800 truncate">{snippet.name}</h4>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => loadCodeSnippet(snippet)}
                                                    className="text-green-600 hover:text-green-800 p-1"
                                                    title="Load snippet"
                                                >
                                                    <i className="fas fa-play text-sm"></i>
                                                </button>
                                                <button
                                                    onClick={() => deleteCodeSnippet(snippet.id)}
                                                    className="text-red-600 hover:text-red-800 p-1"
                                                    title="Delete snippet"
                                                >
                                                    <i className="fas fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2">
                                            {snippet.language} • {new Date(snippet.timestamp).toLocaleDateString()}
                                        </p>
                                        <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-hidden whitespace-pre-wrap max-h-20">
                                            {snippet.code.substring(0, 100)}...
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Left Column - Code Editor */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                                <h2 className="text-lg lg:text-xl font-semibold text-gray-800">Code Editor</h2>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="flex-1 sm:flex-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                        <option value="c">C</option>
                                        <option value="rust">Rust</option>
                                        <option value="go">Go</option>
                                    </select>

                                    <button
                                        onClick={handleClear}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <i className="fas fa-broom"></i>
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="border border-gray-300 rounded-md overflow-hidden">
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full h-64 lg:h-96 p-3 lg:p-4 font-mono text-sm focus:outline-none resize-none bg-gray-900 text-white"
                                    spellCheck="false"
                                    placeholder={`Write your ${language} code here...`}
                                />
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                                <div className="text-sm text-gray-600 flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-code"></i>
                                        <span className="font-semibold capitalize">{language}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="fas fa-font"></i>
                                        {code.length} characters
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveCodeSnippet}
                                        disabled={!user}
                                        className="px-4 py-2 bg-[#6c5dd3] text-white rounded-md hover:bg-[#5a4bbf] disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <i className="fas fa-save"></i>
                                        Save
                                    </button>
                                    <button
                                        onClick={executeCode}
                                        disabled={isLoading}
                                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center space-x-2 text-sm"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Running...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-play text-xs"></i>
                                                <span>Run Code</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Output & AI Review */}
                    <div className="space-y-4">
                        {/* Tabs for Output and AI Review */}
                        <div className="bg-white rounded-lg shadow-md">
                            <div className="flex border-b">
                                <button
                                    onClick={() => setActiveTab('output')}
                                    className={`flex-1 px-4 py-3 font-semibold text-sm border-b-2 transition ${activeTab === 'output'
                                        ? 'border-[#6c5dd3] text-[#6c5dd3]'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <i className="fas fa-terminal mr-2"></i>
                                    Output
                                </button>
                                <button
                                    onClick={() => setActiveTab('review')}
                                    className={`flex-1 px-4 py-3 font-semibold text-sm border-b-2 transition ${activeTab === 'review'
                                        ? 'border-[#4CBC9A] text-[#4CBC9A]'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <i className="fas fa-robot mr-2"></i>
                                    AI Code Review
                                </button>
                            </div>

                            <div className="p-4">
                                {activeTab === 'output' && (
                                    <div className="space-y-4">
                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                                <div className="flex items-center space-x-2 text-red-700">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    <span className="font-semibold text-sm">Error:</span>
                                                </div>
                                                <p className="mt-1 text-red-600 text-sm">{error}</p>
                                            </div>
                                        )}

                                        <div className="border border-gray-300 rounded-md bg-gray-900 text-white p-3 lg:p-4 min-h-48 lg:min-h-96 max-h-96 overflow-auto">
                                            <pre className="font-mono text-xs lg:text-sm whitespace-pre-wrap">
                                                {isLoading ? 'Executing code...' : output || 'Your output will appear here...'}
                                            </pre>
                                        </div>

                                        <div className="text-xs lg:text-sm text-gray-600 flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <i className="fas fa-info-circle"></i>
                                                    <span>Powered by Piston API</span>
                                                </div>
                                                {output && (
                                                    <span className="flex items-center space-x-1">
                                                        <i className="fas fa-check-circle text-green-500"></i>
                                                        <span>Execution completed</span>
                                                    </span>
                                                )}
                                            </div>
                                            {output && (
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(output)}
                                                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                    <i className="fas fa-copy text-xs"></i>
                                                    Copy Output
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'review' && (
                                    <div className="space-y-4 min-h-96">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={codeReview.task}
                                                onChange={(e) => setCodeReview(prev => ({ ...prev, task: e.target.value }))}
                                                placeholder="What specific feedback do you want? (optional)"
                                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CBC9A] text-sm"
                                                onKeyPress={(e) => e.key === 'Enter' && getCodeReview()}
                                            />
                                            <button
                                                onClick={suggestImprovements}
                                                className="px-4 py-3 bg-[#FEC64F] text-white rounded-lg hover:bg-amber-500 transition flex items-center gap-2 text-sm"
                                            >
                                                <i className="fas fa-lightbulb"></i>
                                                Tips
                                            </button>
                                        </div>

                                        <button
                                            onClick={getCodeReview}
                                            disabled={codeReview.reviewing || !code.trim()}
                                            className="w-full bg-[#4CBC9A] text-white py-3 rounded-lg hover:bg-[#3aa384] disabled:opacity-50 transition flex items-center justify-center gap-2"
                                        >
                                            {codeReview.reviewing ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    AI is analyzing your code...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-robot"></i>
                                                    Get AI Code Review
                                                </>
                                            )}
                                        </button>

                                        {codeReview.feedback && (
                                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <i className="fas fa-robot text-[#4CBC9A]"></i>
                                                    <h4 className="font-semibold text-gray-800">AI Feedback:</h4>
                                                </div>
                                                <div className="prose max-w-none text-sm">
                                                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                        {codeReview.feedback}
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                                                    <span>AI-powered code review</span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(codeReview.feedback)}
                                                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                    >
                                                        <i className="fas fa-copy"></i>
                                                        Copy Feedback
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!codeReview.feedback && !codeReview.reviewing && (
                                            <div className="text-center py-12 text-gray-500">
                                                <i className="fas fa-robot text-4xl mb-3 opacity-50"></i>
                                                <p className="font-semibold mb-2">Get AI-Powered Code Review</p>
                                                <p className="text-sm max-w-md mx-auto">
                                                    Write some code and get instant feedback on improvements, best practices, and potential issues from our AI assistant.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features & Quick Tips */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fas fa-bolt text-blue-500 text-xl"></i>
                            <h3 className="font-semibold text-gray-800">Quick Run</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Press Ctrl+Enter to execute your code instantly</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fas fa-robot text-green-500 text-xl"></i>
                            <h3 className="font-semibold text-gray-800">AI Review</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Get detailed feedback on code quality and improvements</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fas fa-save text-purple-500 text-xl"></i>
                            <h3 className="font-semibold text-gray-800">Save Snippets</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Store your code for later access and reference</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-amber-500">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fas fa-language text-amber-500 text-xl"></i>
                            <h3 className="font-semibold text-gray-800">Multi-Language</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Support for Python, JavaScript, Java, C++, and more</p>
                    </div>
                </div>

                {/* Learning Resources */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Learning Resources & Examples</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <h4 className="font-semibold text-gray-800 mb-2">Beginner Exercises</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Hello World programs</li>
                                <li>• Basic calculations</li>
                                <li>• String manipulation</li>
                                <li>• Simple loops</li>
                            </ul>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <h4 className="font-semibold text-gray-800 mb-2">Intermediate Projects</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Calculator app</li>
                                <li>• Todo list manager</li>
                                <li>• Number guessing game</li>
                                <li>• File operations</li>
                            </ul>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <h4 className="font-semibold text-gray-800 mb-2">AI Review Focus</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Code readability</li>
                                <li>• Best practices</li>
                                <li>• Performance tips</li>
                                <li>• Error handling</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IDE;