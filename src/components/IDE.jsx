import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IDE = () => {
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Sample starter code for different languages
    const starterCode = {
        python: `# Welcome to Python IDE
def hello_world():
    print("Hello, World!")

hello_world()`,
        javascript: `// Welcome to JavaScript IDE
function helloWorld() {
    console.log("Hello, World!");
}

helloWorld();`,
        java: `// Welcome to Java IDE
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
        cpp: `// Welcome to C++ IDE
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
    };

    // Set initial code based on selected language
    useEffect(() => {
        setCode(starterCode[language]);
    }, [language]);

    // Piston API configuration
    const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

    const executeCode = async () => {
        setIsLoading(true);
        setError('');
        setOutput('');

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

    const handleClear = () => {
        setCode(starterCode[language]);
        setOutput('');
        setError('');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Online Code IDE</h1>
                    <p className="text-gray-600">Write, edit, and execute code in multiple programming languages</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Code Editor */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Code Editor</h2>
                                <div className="flex items-center space-x-4">
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="border border-gray-300 rounded-md overflow-hidden">
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full h-96 p-4 font-mono text-sm focus:outline-none resize-none bg-gray-900 text-white"
                                    spellCheck="false"
                                />
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Language: <span className="font-semibold capitalize">{language}</span>
                                </div>
                                <button
                                    onClick={executeCode}
                                    disabled={isLoading}
                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center space-x-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Running...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-play"></i>
                                            <span>Run Code</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Output */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow-md p-6 h-full">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Output</h2>

                            {error && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                    <div className="flex items-center space-x-2 text-red-700">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <span className="font-semibold">Error:</span>
                                    </div>
                                    <p className="mt-1 text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="border border-gray-300 rounded-md bg-gray-900 text-white p-4 min-h-96 max-h-96 overflow-auto">
                                <pre className="font-mono text-sm whitespace-pre-wrap">
                                    {isLoading ? 'Executing code...' : output || 'Your output will appear here...'}
                                </pre>
                            </div>

                            <div className="mt-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-2 mb-2">
                                    <i className="fas fa-info-circle"></i>
                                    <span>Powered by Piston API</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Supported Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                            <i className="fas fa-code text-blue-600"></i>
                            <div>
                                <h4 className="font-semibold text-blue-800">Multiple Languages</h4>
                                <p className="text-blue-700 text-sm">Python, JavaScript, Java, C++, and more</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                            <i className="fas fa-bolt text-green-600"></i>
                            <div>
                                <h4 className="font-semibold text-green-800">Fast Execution</h4>
                                <p className="text-green-700 text-sm">Quick code execution with real-time output</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                            <i className="fas fa-cloud text-purple-600"></i>
                            <div>
                                <h4 className="font-semibold text-purple-800">Cloud-Based</h4>
                                <p className="text-purple-700 text-sm">No setup required, runs in browser</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IDE;