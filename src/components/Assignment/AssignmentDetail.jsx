import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ClockIcon, PaperClipIcon, UserIcon } from '@heroicons/react/24/outline';
import {
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { uploadToCloudinarySigned } from '../../utils/cloudinary';
import HeroSection from '../Hero Section/HeroSection';

const FormattedDescription = ({ description }) => {
    if (!description) return null;

    // Split by double newlines to preserve paragraphs
    const paragraphs = description.split('\n\n').filter(para => para.trim());

    return (
        <div className="space-y-4">
            {paragraphs.map((paragraph, index) => {
                // Check if this paragraph is a heading (ends with colon or is in uppercase)
                const isHeading = paragraph.trim().endsWith(':') ||
                    paragraph === paragraph.toUpperCase() ||
                    paragraph.includes('\n') === false && paragraph.length < 100;

                if (isHeading) {
                    return (
                        <h3 key={index} className="font-semibold text-gray-800 text-lg mt-4 first:mt-0">
                            {paragraph.trim()}
                        </h3>
                    );
                }

                // Regular paragraph with potential line breaks
                const lines = paragraph.split('\n').filter(line => line.trim());
                return (
                    <div key={index} className="space-y-2">
                        {lines.map((line, lineIndex) => (
                            <p key={lineIndex} className="leading-relaxed">
                                {line.trim()}
                            </p>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

function AssignmentDetail() {
    const { id } = useParams();
    const [assignment, setAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [activeTab, setActiveTab] = useState('instructions');
    const [submissionFile, setSubmissionFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState('student');

    useEffect(() => {
        let unsubscribeSubmissions = null;
        let unsubscribeAllSubmissions = null;
        let isMounted = true;

        const loadAssignmentData = async () => {
            try {
                setLoading(true);
                setError(null);
                const user = auth.currentUser;
                if (!user) {
                    setError('User not authenticated');
                    return;
                }

                const assignmentDoc = await getDoc(doc(db, 'assignments', id));
                if (!isMounted) return;

                if (!assignmentDoc.exists()) {
                    setError('Assignment not found');
                    setAssignment(null);
                    return;
                }

                const assignmentData = assignmentDoc.data();
                console.log('📋 Assignment data:', assignmentData);

                // Debug: Check attachments
                if (assignmentData.attachments) {
                    console.log('📎 Attachments found:', assignmentData.attachments);
                    assignmentData.attachments.forEach((att, index) => {
                        console.log(`Attachment ${index}:`, {
                            name: att.name,
                            url: att.url,
                            type: att.type,
                            publicId: att.publicId
                        });
                    });
                }

                const isTutor = assignmentData.createdBy === user.uid;
                setUserRole(isTutor ? 'tutor' : 'student');
                setAssignment({ id: assignmentDoc.id, ...assignmentData });

                if (isTutor) {
                    const allSubsQuery = query(
                        collection(db, 'submissions'),
                        where('assignmentId', '==', id)
                    );
                    unsubscribeAllSubmissions = onSnapshot(allSubsQuery, (snapshot) => {
                        if (!isMounted) return;
                        const submissionsData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        console.log('👨‍🏫 Tutor submissions:', submissionsData);
                        setAllSubmissions(submissionsData);
                    });
                } else {
                    const subsQuery = query(
                        collection(db, 'submissions'),
                        where('assignmentId', '==', id),
                        where('studentId', '==', user.uid)
                    );
                    unsubscribeSubmissions = onSnapshot(subsQuery, (snapshot) => {
                        if (!isMounted) return;
                        const submissionsData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        console.log('🎓 Student submissions:', submissionsData);
                        setSubmissions(submissionsData);
                    });
                }
            } catch (error) {
                console.error('❌ Error loading assignment data:', error);
                if (isMounted) {
                    setError('Failed to load assignment data: ' + error.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (id) {
            loadAssignmentData();
        }

        return () => {
            isMounted = false;
            if (unsubscribeSubmissions) unsubscribeSubmissions();
            if (unsubscribeAllSubmissions) unsubscribeAllSubmissions();
        };
    }, [id]);

    const handleFileUpload = async (file) => {
        try {
            console.log('📤 Starting file upload:', file.name, file.type, file.size);
            const uploadData = await uploadToCloudinarySigned(file);
            console.log('✅ File upload successful:', uploadData);
            return uploadData.secure_url;
        } catch (error) {
            console.error('❌ Error uploading file:', error);
            throw error;
        }
    };

    const handleUploadAndAnalyze = async () => {
        if (!submissionFile || !assignment) {
            alert('Please select a file to upload');
            return;
        }

        setUploading(true);
        console.log('🚀 Starting upload and analysis process...');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Step 1: Upload file to Cloudinary first
            console.log('📤 Uploading file to Cloudinary...');
            const fileUrl = await handleFileUpload(submissionFile);
            console.log('✅ File uploaded to:', fileUrl);

            // Prepare submission data
            const submissionData = {
                assignmentId: assignment.id,
                assignmentTitle: assignment.AssignmentTitle,
                studentId: user.uid,
                studentName: user.displayName || 'Student',
                studentEmail: user.email,
                fileName: submissionFile.name,
                fileUrl: fileUrl, // Use the uploaded URL
                submittedAt: serverTimestamp(),
                status: 'submitted',
                grade: null,
                feedback: '',
                totalMarks: assignment.totalMarks || 100,
                aiAnalysis: null
            };

            console.log('📝 Submission data prepared:', submissionData);

            // Step 2: Call analysis API with the uploaded file URL
            console.log('🤖 Sending for AI analysis...');
            const analysisPayload = {
                file_url: fileUrl,
                assignment_id: assignment.id,
                student_id: user.uid,
                total_marks: assignment.totalMarks || 100,
                // This is the key addition:
                teacher_solution_text: assignment.teacherSolution || "",
                file_name: submissionFile.name
            };

            console.log('📦 Analysis payload:', analysisPayload);

            const res = await fetch("http://localhost:8000/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(analysisPayload),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server error ${res.status}: ${errorText}`);
            }

            const analysisData = await res.json();
            console.log('✅ Analysis results:', analysisData);

            // Update submission data with analysis results
            submissionData.grade = analysisData.grade;
            submissionData.scorePercent = analysisData.score_percent;
            submissionData.aiProbability = analysisData.ai_probability;
            submissionData.teacherSimilarity = analysisData.teacher_similarity;
            submissionData.maxStudentSimilarity = analysisData.max_student_similarity;
            submissionData.status = 'graded';
            submissionData.gradedAt = serverTimestamp();
            submissionData.aiAnalysis = analysisData;

            // Step 3: Save submission to Firestore
            console.log('💾 Saving submission to Firestore...');
            const docRef = await addDoc(collection(db, 'submissions'), submissionData);
            console.log('✅ Submission saved with ID:', docRef.id);

            setAnalysisResult(analysisData);
            setSubmissionFile(null);

            alert('Assignment submitted successfully!');
        } catch (error) {
            console.error('❌ Error submitting assignment:', error);
            alert("Submission failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleGradeSubmission = async (submissionId, grade, feedback) => {
        try {
            await updateDoc(doc(db, 'submissions', submissionId), {
                grade: parseInt(grade),
                feedback: feedback,
                status: 'graded',
                gradedAt: serverTimestamp()
            });
            alert('Grade updated successfully!');
        } catch (error) {
            console.error('Error updating grade:', error);
            alert('Failed to update grade: ' + error.message);
        }
    };

    // Enhanced PDF display component with better error handling
    const PDFViewer = ({ url, title }) => {
        const [pdfError, setPdfError] = useState(false);
        const [loading, setLoading] = useState(true);

        console.log('📄 PDFViewer loading:', url);

        if (pdfError) {
            return (
                <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-md h-96 flex flex-col items-center justify-center">
                    <PaperClipIcon className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="mb-2">Unable to preview PDF</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline px-4 py-2 border border-blue-600 rounded"
                        >
                            Open PDF in new tab
                        </a>
                        <a
                            href={url}
                            download
                            className="text-green-600 hover:underline px-4 py-2 border border-green-600 rounded"
                        >
                            Download PDF
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-96 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-gray-600">Loading PDF...</p>
                        </div>
                    </div>
                )}
                <iframe
                    src={`${url}#view=fitH`}
                    className="w-full h-full rounded-md bg-gray-50 border-0"
                    title={title}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setPdfError(true);
                        setLoading(false);
                    }}
                    style={{ display: loading ? 'none' : 'block' }}
                />
                <div className="mt-2 text-center">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                    >
                        Open PDF in new tab for better viewing
                    </a>
                </div>
            </div>
        );
    };

    // Enhanced file display component
    const FileDisplay = ({ file }) => {
        const isImage = file.type?.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.url?.toLowerCase().endsWith('.pdf');
        const isVideo = file.type?.startsWith('video/');

        console.log('📁 File display:', file);

        if (isImage) {
            return (
                <div className="mt-2">
                    <img
                        src={file.url}
                        alt={file.name || 'Assignment attachment'}
                        className="max-h-60 lg:max-h-80 rounded-md object-contain w-full bg-gray-50"
                        onError={(e) => {
                            console.error('❌ Image failed to load:', file.url);
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
            );
        }

        if (isPdf) {
            return <PDFViewer url={file.url} title={file.name || 'PDF Attachment'} />;
        }

        if (isVideo) {
            return (
                <div className="mt-2">
                    <video
                        controls
                        className="max-h-60 lg:max-h-80 rounded-md w-full bg-gray-50"
                    >
                        <source src={file.url} type={file.type} />
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }

        // Generic file display
        return (
            <div className="mt-2 p-4 bg-gray-50 rounded-md text-center">
                <PaperClipIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                    {file.type || 'Unknown file type'}
                </p>
                <a
                    href={file.url}
                    download
                    className="text-blue-600 hover:underline"
                >
                    Download {file.name || 'File'}
                </a>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <div className="text-lg text-gray-600">Loading assignment...</div>
                </div>
            </div>
        );
    }

    if (error || !assignment) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-2">{error || 'Assignment not found.'}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-blue-600 hover:underline"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // Determine submission status for current user
    const currentUserSubmission = submissions.find(sub => sub.status === 'submitted' || sub.status === 'graded');
    const assignmentStatus = currentUserSubmission ?
        (currentUserSubmission.status === 'graded' ? 'Graded' : 'Submitted') :
        'Pending';

    // Stats for tutor view
    const totalSubmissions = allSubmissions.length;
    const gradedSubmissions = allSubmissions.filter(sub => sub.status === 'graded').length;
    const pendingSubmissions = totalSubmissions - gradedSubmissions;

    return (
        <div>
            <HeroSection
                title={assignment.AssignmentTitle}
                breadcrumb={[
                    { label: 'Home', path: '/' },
                    { label: assignment.AssignmentTitle },
                ]}
            />

            <div className="my-8 lg:mt-30 lg:mb-30 font-poppins">
                <div className='flex flex-col lg:grid lg:grid-cols-[65%_35%] max-w-7xl mx-auto px-[15px] lg:px-0'>
                    <div className='order-2 w-full lg:w-auto z-1'>
                        <div className='shadow-lg rounded-sm p-4 lg:p-5 my-6 lg:m-4 bg-white static lg:sticky lg:top-20 pb-6 lg:pb-10'>
                            <div className='flex flex-col gap-4'>
                                {userRole === 'tutor' ? (
                                    <>
                                        <div className='flex justify-between items-center mb-4'>
                                            <span className="text-lg font-semibold">Submission Stats</span>
                                        </div>
                                        <div className='space-y-4 border rounded-lg p-4 bg-blue-50'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>Total Submissions</span>
                                                <span className='text-blue-600 font-bold'>{totalSubmissions}</span>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>Graded</span>
                                                <span className='text-green-600 font-bold'>{gradedSubmissions}</span>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>Pending Review</span>
                                                <span className='text-yellow-600 font-bold'>{pendingSubmissions}</span>
                                            </div>
                                        </div>
                                        <div className='mt-6'>
                                            <h3 className='font-semibold mb-3'>Quick Actions</h3>
                                            <button className="w-full bg-[#4CBC9A] text-white py-2 rounded-lg mb-2 hover:bg-[#3aa384]">
                                                Download All Submissions
                                            </button>
                                            <button className="w-full bg-[#6c5dd3] text-white py-2 rounded-lg hover:bg-[#5a4bbf]">
                                                View Analytics
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0'>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${assignmentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                assignmentStatus === 'Submitted' ? 'bg-green-100 text-green-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                {assignmentStatus}
                                            </span>
                                            <p className='text-gray-500 text-sm flex items-center'>
                                                <ClockIcon className='w-4 h-4 mr-1' />
                                                Due {assignment.DeadLine}
                                            </p>
                                        </div>
                                        <div className='space-y-4 border rounded-lg p-4'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>Total Marks</span>
                                                <span className='text-greenSmall font-bold'>{assignment.totalMarks}</span>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>Questions</span>
                                                <span className='text-gray-600'>{assignment.questionsCount}</span>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>Attempts</span>
                                                <span className='text-gray-600'>{assignment.attemptsLeft} remaining</span>
                                            </div>
                                        </div>
                                        <div className='mt-6'>
                                            <h3 className='font-semibold mb-3'>Attachments</h3>
                                            <div className='space-y-2'>
                                                {assignment.attachments?.map((file, index) => (
                                                    <a
                                                        key={index}
                                                        href={file.url}
                                                        download
                                                        className='flex items-center p-2 border rounded hover:bg-gray-50 transition-colors'
                                                    >
                                                        <PaperClipIcon className='w-4 h-4 mr-2 text-gray-500' />
                                                        <span className='text-sm truncate'>{file.name}</span>
                                                    </a>
                                                ))}
                                                {(!assignment.attachments || assignment.attachments.length === 0) && (
                                                    <p className="text-gray-500 text-sm text-center py-2">No attachments</p>
                                                )}
                                            </div>
                                        </div>
                                        {(!currentUserSubmission || assignment.allowResubmission) && (
                                            <>
                                                <button
                                                    onClick={() => document.getElementById('fileInput').click()}
                                                    className='btn-primary w-full py-3 text-sm mt-6'
                                                    disabled={currentUserSubmission?.status === 'graded' && !assignment.allowResubmission}
                                                >
                                                    {currentUserSubmission ? 'Resubmit Assignment' : 'Submit Assignment'}
                                                </button>
                                                <input
                                                    type="file"
                                                    id="fileInput"
                                                    hidden
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) {
                                                            setSubmissionFile(e.target.files[0]);
                                                        }
                                                    }}
                                                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                                />
                                            </>
                                        )}
                                        {submissionFile && (
                                            <>
                                                <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between'>
                                                    <div className='flex items-center overflow-hidden'>
                                                        <PaperClipIcon className='w-4 h-4 mr-2 text-green-600 flex-shrink-0' />
                                                        <span className='text-sm truncate'>{submissionFile.name}</span>
                                                        <span className='text-xs text-gray-500 ml-2'>
                                                            ({(submissionFile.size / 1024 / 1024).toFixed(2)} MB)
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSubmissionFile(null)}
                                                        className='text-red-500 hover:text-red-700 ml-2 text-lg'
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={handleUploadAndAnalyze}
                                                    className='btn-primary w-full py-3 text-sm mt-4'
                                                    disabled={uploading}
                                                >
                                                    {uploading ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Uploading & Analyzing...
                                                        </div>
                                                    ) : 'Upload & Analyze'}
                                                </button>
                                            </>
                                        )}
                                        {analysisResult && (
                                            <div className='mt-4 p-4 bg-blue-50 rounded border border-blue-100'>
                                                <h4 className='font-semibold mb-3 text-blue-800'>AI Analysis Results</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Predicted Grade:</span>
                                                        <span className="font-bold text-blue-700">{analysisResult.grade} / {analysisResult.total_marks}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Score Percentage:</span>
                                                        <span className="font-bold text-blue-700">{(analysisResult.score_percent * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">AI Probability:</span>
                                                        <span className="font-bold text-blue-700">{(analysisResult.ai_probability * 100).toFixed(1)}%</span>
                                                    </div>

                                                    {/* New Similarity Metric Display */}
                                                    <div className="flex justify-between bg-white p-1 rounded border border-blue-100">
                                                        <span className="text-gray-600">Teacher Similarity:</span>
                                                        <span className={`font-bold ${(analysisResult.teacher_similarity * 100) > 70 ? 'text-green-600' : 'text-orange-600'}`}>
                                                            {(analysisResult.teacher_similarity * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='order-1 w-full lg:pr-5'>
                        <div className='bg-white rounded-xl lg:rounded-2xl pb-6 lg:pb-10 px-4 lg:px-10 shadow-lg lg:shadow-2xl'>
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <h1 className='font-poppins text-2xl lg:text-3xl font-extrabold mb-5 break-words'>{assignment.AssignmentTitle}</h1>

                                <div className='mb-8'>
                                    <h2 className='text-xl lg:text-2xl font-semibold mb-4'>Description</h2>
                                    <div className='text-gray-600 leading-relaxed text-sm lg:text-base whitespace-pre-line bg-gray-50 p-4 rounded-lg border'>
                                        {assignment.AssignmentDescription ? (
                                            <FormattedDescription description={assignment.AssignmentDescription} />
                                        ) : (
                                            <p className="text-gray-500 italic">No description provided.</p>
                                        )}
                                    </div>
                                </div>

                                {Array.isArray(assignment.attachments) && assignment.attachments.length > 0 && (
                                    <div className='mb-8'>
                                        <h2 className='text-xl lg:text-2xl font-semibold mb-3'>Resources</h2>
                                        <div className='space-y-4'>
                                            {assignment.attachments.map((att, idx) => (
                                                <div key={att.public_id || att.url || idx} className='border rounded-lg p-3'>
                                                    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-0'>
                                                        <div className='flex items-center overflow-hidden w-full sm:w-auto'>
                                                            <PaperClipIcon className='w-5 h-5 text-gray-500 mr-2 flex-shrink-0' />
                                                            <div className="min-w-0">
                                                                <div className='text-sm font-medium text-gray-800 truncate'>
                                                                    {att.name || `Attachment ${idx + 1}`}
                                                                </div>
                                                                {att.size && (
                                                                    <div className='text-xs text-gray-500'>
                                                                        {att.size} • {att.type || 'File'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className='flex items-center gap-3 w-full sm:w-auto justify-end'>
                                                            <a
                                                                href={att.url}
                                                                target='_blank'
                                                                rel='noreferrer'
                                                                className='text-BgPrimary hover:underline text-sm'
                                                            >
                                                                Open
                                                            </a>
                                                            <a
                                                                href={att.url}
                                                                download
                                                                className='text-gray-600 hover:underline text-sm'
                                                            >
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* Enhanced file display */}
                                                    <FileDisplay file={att} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {assignment.objectives && (
                                    <div className='mb-8'>
                                        <h2 className='text-xl lg:text-2xl font-semibold mb-3'>Learning Objectives</h2>
                                        <ul className='list-disc pl-6 space-y-2'>
                                            {assignment.objectives.map((objective, index) => (
                                                <li key={index} className='text-gray-600 text-sm lg:text-base'>{objective}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className='mt-10'>
                                    <div className='flex flex-row gap-0 mb-6 lg:mb-10 overflow-x-auto no-scrollbar'>
                                        <button
                                            onClick={() => setActiveTab('instructions')}
                                            className={`text-base lg:text-[20px] font-bold font-poppins px-4 py-2 whitespace-nowrap ${activeTab === 'instructions' ? 'border-b-3 border-hoverGreen text-black' : 'border-b border-gray-200 text-black'
                                                }`}
                                        >
                                            Instructions
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('submissions')}
                                            className={`text-base lg:text-[20px] font-bold font-poppins px-4 py-2 whitespace-nowrap ${activeTab === 'submissions' ? 'border-b-3 border-hoverGreen text-black' : 'border-b border-gray-200 text-black'
                                                }`}
                                        >
                                            {userRole === 'tutor' ?
                                                `Submissions (${allSubmissions.length})` :
                                                `My Submissions (${submissions.length})`
                                            }
                                        </button>
                                    </div>

                                    {activeTab === 'instructions' && (
                                        <div className='prose max-w-none'>
                                            {/* Detailed Instructions */}
                                            {assignment.instructions && assignment.instructions.length > 0 && (
                                                <>
                                                    <h3 className='text-lg lg:text-xl font-semibold mb-4'>Detailed Instructions</h3>
                                                    <ul className='list-disc pl-6 space-y-3 bg-gray-50 p-4 rounded-lg'>
                                                        {assignment.instructions.map((instruction, index) => (
                                                            <li key={index} className='text-gray-700 text-sm lg:text-base leading-relaxed'>
                                                                {instruction}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}

                                            {/* Learning Objectives */}
                                            {assignment.learningObjectives && assignment.learningObjectives.length > 0 && (
                                                <>
                                                    <h3 className='text-lg lg:text-xl font-semibold mt-8 mb-4'>Learning Objectives</h3>
                                                    <ul className='list-disc pl-6 space-y-3 bg-blue-50 p-4 rounded-lg'>
                                                        {assignment.learningObjectives.map((objective, index) => (
                                                            <li key={index} className='text-gray-700 text-sm lg:text-base leading-relaxed'>
                                                                {objective}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}

                                            {/* Show message if no instructions or objectives */}
                                            {(!assignment.instructions || assignment.instructions.length === 0) &&
                                                (!assignment.learningObjectives || assignment.learningObjectives.length === 0) && (
                                                    <div className="text-center py-8 text-gray-500">
                                                        No instructions or learning objectives provided for this assignment.
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                    {activeTab === 'submissions' && (
                                        <div className='space-y-4'>
                                            {userRole === 'tutor' ? (
                                                allSubmissions.length === 0 ? (
                                                    <div className='text-center py-8 text-gray-500'>No submissions yet</div>
                                                ) : (
                                                    allSubmissions.map((submission) => (
                                                        <div key={submission.id} className='p-4 border rounded-lg hover:bg-gray-50'>
                                                            <div className='flex flex-col sm:flex-row justify-between items-start mb-2 gap-2 sm:gap-0'>
                                                                <div className='flex items-center'>
                                                                    <UserIcon className='w-4 h-4 mr-2 text-gray-500 flex-shrink-0' />
                                                                    <div className="min-w-0">
                                                                        <span className='font-medium block truncate'>{submission.studentName}</span>
                                                                        <p className='text-sm text-gray-500 truncate'>{submission.studentEmail}</p>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-sm ${submission.status === 'graded' ? 'text-green-600' :
                                                                    submission.status === 'submitted' ? 'text-yellow-600' :
                                                                        'text-gray-600'
                                                                    }`}>
                                                                    {submission.status}
                                                                </span>
                                                            </div>
                                                            <div className='flex flex-col sm:flex-row justify-between text-sm text-gray-500 mb-2 gap-1 sm:gap-0'>
                                                                <span>
                                                                    Submitted on {submission.submittedAt?.toDate?.().toLocaleString() || 'Unknown date'}
                                                                </span>
                                                                {submission.grade && (
                                                                    <span>Grade: {submission.grade}/{submission.totalMarks}</span>
                                                                )}
                                                            </div>
                                                            {submission.fileUrl && (
                                                                <div className='mb-2'>
                                                                    <a
                                                                        href={submission.fileUrl}
                                                                        download
                                                                        className='text-sm text-blue-600 hover:text-blue-800'
                                                                    >
                                                                        📎 Download Submission: {submission.fileName}
                                                                    </a>
                                                                </div>
                                                            )}
                                                            <div className='flex flex-col sm:flex-row gap-2 mt-2'>
                                                                {submission.status !== 'graded' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const grade = prompt('Enter grade:');
                                                                            const feedback = prompt('Enter feedback:');
                                                                            if (grade && feedback) {
                                                                                handleGradeSubmission(submission.id, grade, feedback);
                                                                            }
                                                                        }}
                                                                        className='text-sm text-green-600 hover:text-green-800 text-center sm:text-left'
                                                                    >
                                                                        Grade Submission
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )
                                            ) : (
                                                submissions.length === 0 ? (
                                                    <div className='text-center py-8 text-gray-500'>No submissions yet</div>
                                                ) : (
                                                    submissions.map((submission) => (
                                                        <div key={submission.id} className='p-4 border rounded-lg hover:bg-gray-50'>
                                                            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0'>
                                                                <div className='flex items-center overflow-hidden'>
                                                                    <PaperClipIcon className='w-4 h-4 mr-2 flex-shrink-0' />
                                                                    <span className='font-medium truncate'>{submission.fileName}</span>
                                                                </div>
                                                                <span className={`text-sm ${submission.status === 'graded' ? 'text-green-600' :
                                                                    submission.status === 'submitted' ? 'text-yellow-600' :
                                                                        'text-gray-600'
                                                                    }`}>
                                                                    {submission.status}
                                                                </span>
                                                            </div>
                                                            <div className='flex flex-col sm:flex-row justify-between text-sm text-gray-500 gap-1 sm:gap-0'>
                                                                <span>
                                                                    Submitted on {submission.submittedAt?.toDate?.().toLocaleString() || 'Unknown date'}
                                                                </span>
                                                                {submission.grade && (
                                                                    <span>Grade: {submission.grade}/{submission.totalMarks}</span>
                                                                )}
                                                            </div>
                                                            {submission.fileUrl && (
                                                                <div className='mt-2'>
                                                                    <a
                                                                        href={submission.fileUrl}
                                                                        download
                                                                        className='text-sm text-blue-600 hover:text-blue-800'
                                                                    >
                                                                        📎 Download Your Submission
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {submission.feedback && (
                                                                <div className='mt-2 p-2 bg-gray-50 rounded text-sm'>
                                                                    <strong>Feedback:</strong> {submission.feedback}
                                                                </div>
                                                            )}
                                                            {submission.aiAnalysis && (
                                                                <div className='mt-2 p-3 bg-blue-50 rounded text-sm'>
                                                                    <strong>AI Analysis:</strong> Score {(submission.aiAnalysis.score_percent * 100).toFixed(1)}% | Similarity {(submission.aiAnalysis.teacher_similarity * 100).toFixed(1)}%
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AssignmentDetail;