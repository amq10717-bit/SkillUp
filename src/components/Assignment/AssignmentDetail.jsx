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
                        setSubmissions(submissionsData);
                    });
                }
            } catch (error) {
                console.error('Error loading assignment data:', error);
                if (isMounted) {
                    setError('Failed to load assignment data');
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
            const uploadData = await uploadToCloudinarySigned(file);
            return uploadData.secure_url;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    };

    const handleUploadAndAnalyze = async () => {
        if (!submissionFile || !assignment) return;
        setUploading(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Prepare submission data (we will send the actual file to FastAPI)
            const submissionData = {
                assignmentId: assignment.id,
                assignmentTitle: assignment.AssignmentTitle,
                studentId: user.uid,
                studentName: user.displayName || 'Student',
                studentEmail: user.email,
                fileName: submissionFile.name,
                fileUrl: null,
                submittedAt: serverTimestamp(),
                status: 'submitted',
                grade: null,
                feedback: '',
                totalMarks: assignment.totalMarks || 100,
                aiAnalysis: null
            };

            // Call analysis API
            const fd = new FormData();
            fd.append("file", submissionFile);
            fd.append("assignment_id", assignment.id);
            fd.append("student_id", user.uid);
            fd.append("total_marks", assignment.totalMarks || 100);
            fd.append("teacher_solution_text", assignment.teacherSolution || "");

            const res = await fetch("http://localhost:8000/api/analyze", {
                method: "POST",
                body: fd,
            });

            if (!res.ok) throw new Error("Server error " + res.status);
            const analysisData = await res.json();

            // Update submission data with analysis results
            submissionData.grade = analysisData.grade;
            submissionData.scorePercent = analysisData.score_percent;
            submissionData.aiProbability = analysisData.ai_probability;
            submissionData.teacherSimilarity = analysisData.teacher_similarity;
            submissionData.maxStudentSimilarity = analysisData.max_student_similarity;
            submissionData.status = 'graded';
            submissionData.gradedAt = serverTimestamp();
            submissionData.aiAnalysis = analysisData;

            // Save submission to Firestore
            await addDoc(collection(db, 'submissions'), submissionData);
            setAnalysisResult(analysisData);
            setSubmissionFile(null);
        } catch (error) {
            console.error('Error submitting assignment:', error);
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
            alert('Failed to update grade');
        }
    };

    // PDF display component with error handling
    const PDFViewer = ({ url, title }) => {
        const [pdfError, setPdfError] = useState(false);

        if (pdfError) {
            return (
                <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-md h-96 flex flex-col items-center justify-center">
                    <PaperClipIcon className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="mb-2">Unable to preview PDF</p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        Open PDF in new tab
                    </a>
                    <span className="mx-2">or</span>
                    <a
                        href={url}
                        download
                        className="text-green-600 hover:underline"
                    >
                        Download PDF
                    </a>
                </div>
            );
        }

        return (
            <div className="h-96">
                <iframe
                    src={`${url}#view=fitH`}
                    className="w-full h-full rounded-md bg-gray-50 border-0"
                    title={title}
                    onError={() => setPdfError(true)}
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading assignment...</div>
                </div>
            </div>
        );
    }

    if (error || !assignment) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-lg">{error || 'Assignment not found.'}</div>
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

            <div className="mt-30 mb-30 font-poppins">
                <div className='grid grid-cols-[65%_35%] max-w-6xl mx-auto'>
                    <div className='order-2 z-1'>
                        <div className='shadow-lg rounded-sm p-5 m-4 bg-white sticky top-20 pb-10'>
                            <div className='flex flex-col gap-4'>
                                {userRole === 'tutor' ? (
                                    // Tutor View
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
                                    // Student View
                                    <>
                                        <div className='flex justify-between items-center mb-4'>
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
                                                        <span className='text-sm'>{file.name}</span>
                                                    </a>
                                                ))}
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
                                                    onChange={(e) => setSubmissionFile(e.target.files[0])}
                                                />
                                            </>
                                        )}
                                        {submissionFile && (
                                            <>
                                                <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between'>
                                                    <div className='flex items-center'>
                                                        <PaperClipIcon className='w-4 h-4 mr-2 text-green-600' />
                                                        <span className='text-sm'>{submissionFile.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSubmissionFile(null)}
                                                        className='text-red-500 hover:text-red-700'
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={handleUploadAndAnalyze}
                                                    className='btn-primary w-full py-3 text-sm mt-4'
                                                    disabled={uploading}
                                                >
                                                    {uploading ? 'Uploading & Analyzing...' : 'Upload & Analyze'}
                                                </button>
                                            </>
                                        )}
                                        {analysisResult && (
                                            <div className='mt-4 p-4 bg-blue-50 rounded'>
                                                <h4 className='font-semibold mb-2'>AI Analysis Results</h4>
                                                <div><strong>Grade:</strong> {analysisResult.grade} / {analysisResult.total_marks}</div>
                                                <div><strong>Score %:</strong> {(analysisResult.score_percent * 100).toFixed(1)}%</div>
                                                <div><strong>AI probability:</strong> {(analysisResult.ai_probability * 100).toFixed(1)}%</div>
                                                <div><strong>Teacher similarity:</strong> {(analysisResult.teacher_similarity * 100).toFixed(1)}%</div>
                                                <div><strong>Max student similarity:</strong> {(analysisResult.max_student_similarity * 100).toFixed(1)}%</div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='order-1 pr-5'>
                        <div className='bg-white rounded-2xl pb-10 px-10 shadow-2xl'>
                            <div className="pt-6 pb-6 max-w-4xl mx-auto text-gray-800">
                                <h1 className='font-poppins text-4xl font-extrabold mb-5'>{assignment.AssignmentTitle}</h1>

                                <div className='mb-8'>
                                    <h2 className='text-2xl font-semibold mb-3'>Description</h2>
                                    <p className='text-gray-600 leading-relaxed'>{assignment.AssignmentDescription}</p>
                                </div>

                                {Array.isArray(assignment.attachments) && assignment.attachments.length > 0 && (
                                    <div className='mb-8'>
                                        <h2 className='text-2xl font-semibold mb-3'>Resources</h2>
                                        <div className='space-y-4'>
                                            {assignment.attachments.map((att, idx) => {
                                                const isImage = typeof att.type === 'string' && att.type.startsWith('image/');
                                                const isPdf = (typeof att.type === 'string' && att.type === 'application/pdf') ||
                                                    (typeof att.url === 'string' && att.url.toLowerCase().endsWith('.pdf'));

                                                return (
                                                    <div key={att.public_id || att.url || idx} className='border rounded-lg p-3'>
                                                        <div className='flex items-center justify-between mb-2'>
                                                            <div className='flex items-center'>
                                                                <PaperClipIcon className='w-5 h-5 text-gray-500 mr-2' />
                                                                <div>
                                                                    <div className='text-sm font-medium text-gray-800'>{att.name || `Attachment ${idx + 1}`}</div>
                                                                    {att.size && <div className='text-xs text-gray-500'>{att.size}</div>}
                                                                </div>
                                                            </div>
                                                            <div className='flex items-center gap-3'>
                                                                <a href={att.url} target='_blank' rel='noreferrer' className='text-BgPrimary hover:underline text-sm'>Open</a>
                                                                <a href={att.url} download className='text-gray-600 hover:underline text-sm'>Download</a>
                                                            </div>
                                                        </div>

                                                        {isImage && (
                                                            <div className='mt-2'>
                                                                <img
                                                                    src={att.url}
                                                                    alt={att.name || `Attachment ${idx + 1}`}
                                                                    className='max-h-80 rounded-md object-contain w-full bg-gray-50'
                                                                />
                                                            </div>
                                                        )}

                                                        {isPdf && (
                                                            <PDFViewer
                                                                url={att.url}
                                                                title={att.name || `PDF Attachment ${idx + 1}`}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {assignment.objectives && (
                                    <div className='mb-8'>
                                        <h2 className='text-2xl font-semibold mb-3'>Learning Objectives</h2>
                                        <ul className='list-disc pl-6 space-y-2'>
                                            {assignment.objectives.map((objective, index) => (
                                                <li key={index} className='text-gray-600'>{objective}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className='mt-10'>
                                    <div className='flex flex-row gap-0 mb-10'>
                                        <button
                                            onClick={() => setActiveTab('instructions')}
                                            className={`text-[20px] font-bold font-poppins px-4 py-2 ${activeTab === 'instructions' ? 'border-b-3 border-hoverGreen text-black' : 'border-b border-gray-200 text-black'
                                                }`}
                                        >
                                            Instructions
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('submissions')}
                                            className={`text-[20px] font-bold font-poppins px-4 py-2 ${activeTab === 'submissions' ? 'border-b-3 border-hoverGreen text-black' : 'border-b border-gray-200 text-black'
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
                                            {assignment.requirements && (
                                                <>
                                                    <h3 className='text-xl font-semibold mb-3'>Assignment Requirements</h3>
                                                    <ul className='list-disc pl-6 space-y-2'>
                                                        {assignment.requirements.map((req, index) => (
                                                            <li key={index} className='text-gray-600'>{req}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                            {assignment.gradingCriteria && (
                                                <>
                                                    <h3 className='text-xl font-semibold mt-6 mb-3'>Grading Criteria</h3>
                                                    <div className='space-y-3'>
                                                        {assignment.gradingCriteria.map((criteria, index) => (
                                                            <div key={index} className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                                                                <span>{criteria.category}</span>
                                                                <span className='font-medium'>{criteria.percentage}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'submissions' && (
                                        <div className='space-y-4'>
                                            {userRole === 'tutor' ? (
                                                // Tutor view - all submissions
                                                allSubmissions.length === 0 ? (
                                                    <div className='text-center py-8 text-gray-500'>No submissions yet</div>
                                                ) : (
                                                    allSubmissions.map((submission) => (
                                                        <div key={submission.id} className='p-4 border rounded-lg hover:bg-gray-50'>
                                                            <div className='flex justify-between items-start mb-2'>
                                                                <div className='flex items-center'>
                                                                    <UserIcon className='w-4 h-4 mr-2 text-gray-500' />
                                                                    <div>
                                                                        <span className='font-medium'>{submission.studentName}</span>
                                                                        <p className='text-sm text-gray-500'>{submission.studentEmail}</p>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-sm ${submission.status === 'graded' ? 'text-green-600' :
                                                                    submission.status === 'submitted' ? 'text-yellow-600' :
                                                                        'text-gray-600'
                                                                    }`}>
                                                                    {submission.status}
                                                                </span>
                                                            </div>
                                                            <div className='flex justify-between text-sm text-gray-500 mb-2'>
                                                                <span>
                                                                    Submitted on {submission.submittedAt?.toDate?.().toLocaleString() || 'Unknown date'}
                                                                </span>
                                                                {submission.grade && (
                                                                    <span>Grade: {submission.grade}/{submission.totalMarks}</span>
                                                                )}
                                                            </div>
                                                            <div className='flex gap-2 mt-2'>
                                                                <a
                                                                    href={submission.fileUrl}
                                                                    download
                                                                    className='text-sm text-blue-600 hover:text-blue-800'
                                                                >
                                                                    Download File
                                                                </a>
                                                                {submission.status !== 'graded' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const grade = prompt('Enter grade:');
                                                                            const feedback = prompt('Enter feedback:');
                                                                            if (grade && feedback) {
                                                                                handleGradeSubmission(submission.id, grade, feedback);
                                                                            }
                                                                        }}
                                                                        className='text-sm text-green-600 hover:text-green-800 ml-4'
                                                                    >
                                                                        Grade Submission
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )
                                            ) : (
                                                // Student view - own submissions
                                                submissions.length === 0 ? (
                                                    <div className='text-center py-8 text-gray-500'>No submissions yet</div>
                                                ) : (
                                                    submissions.map((submission) => (
                                                        <div key={submission.id} className='p-4 border rounded-lg hover:bg-gray-50'>
                                                            <div className='flex justify-between items-center mb-2'>
                                                                <div className='flex items-center'>
                                                                    <PaperClipIcon className='w-4 h-4 mr-2' />
                                                                    <span className='font-medium'>{submission.fileName}</span>
                                                                </div>
                                                                <span className={`text-sm ${submission.status === 'graded' ? 'text-green-600' :
                                                                    submission.status === 'submitted' ? 'text-yellow-600' :
                                                                        'text-gray-600'
                                                                    }`}>
                                                                    {submission.status}
                                                                </span>
                                                            </div>
                                                            <div className='flex justify-between text-sm text-gray-500'>
                                                                <span>
                                                                    Submitted on {submission.submittedAt?.toDate?.().toLocaleString() || 'Unknown date'}
                                                                </span>
                                                                {submission.grade && (
                                                                    <span>Grade: {submission.grade}/{submission.totalMarks}</span>
                                                                )}
                                                            </div>
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