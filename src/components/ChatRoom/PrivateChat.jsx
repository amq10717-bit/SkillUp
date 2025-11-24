// src/components/ChatRoom/PrivateChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Paperclip, Send, Users, Plus, MoreVertical, Pin, Archive, Trash2,
    Bell, BellOff, Edit3, Search, Filter, Clock, Star, UserPlus,
    Image, Mic, Camera, File, Video, FileText, X, Download
} from 'lucide-react';
import {
    collection,
    doc,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDocs,
    updateDoc,
    getDoc,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { uploadToCloudinary, isImageFile, getFileCategory } from '../../utils/cloudinary';

const PrivateChat = () => {
    const [user] = useAuthState(auth);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('private');
    const [privateChats, setPrivateChats] = useState([]);
    const [groupChats, setGroupChats] = useState([]);
    const [archivedChats, setArchivedChats] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showChatMenu, setShowChatMenu] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [initialChatLoaded, setInitialChatLoaded] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadingFile, setUploadingFile] = useState(null);
    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const attachmentMenuRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowChatMenu(null);
            }
            if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
                setShowAttachmentMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Enhanced user data fetcher
    const fetchUserData = async (userId) => {
        if (!userId) return null;

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                    id: userId,
                    displayName: userData.displayName || userData.name || userData.fullName || userData.username || userData.email?.split('@')[0] || `User ${userId.slice(0, 4)}`,
                    email: userData.email || 'No email',
                    role: userData.role || 'student',
                    photoURL: userData.photoURL || userData.avatar || null
                };
            }
        } catch (error) {
            console.error(`Error fetching user data for ${userId}:`, error);
        }

        // Fallback data
        return {
            id: userId,
            displayName: `User ${userId.slice(0, 4)}`,
            email: 'No email',
            role: 'user',
            photoURL: null
        };
    };

    // Fetch current user data
    useEffect(() => {
        const fetchCurrentUserData = async () => {
            if (!user) return;

            try {
                const userData = await fetchUserData(user.uid);
                if (userData) {
                    setCurrentUserData(userData);
                } else {
                    setCurrentUserData({
                        id: user.uid,
                        displayName: user.displayName || user.email?.split('@')[0] || 'User',
                        email: user.email,
                        role: 'student',
                        photoURL: user.photoURL
                    });
                }
            } catch (error) {
                console.error('Error fetching current user data:', error);
                setCurrentUserData({
                    id: user.uid,
                    displayName: user.displayName || user.email?.split('@')[0] || 'User',
                    email: user.email,
                    role: 'student',
                    photoURL: user.photoURL
                });
            }
        };

        if (user) {
            fetchCurrentUserData();
        }
    }, [user]);

    // Fetch available users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersQuery = query(collection(db, 'users'));
                const snapshot = await getDocs(usersQuery);
                const usersData = await Promise.all(
                    snapshot.docs
                        .map(doc => doc.id)
                        .filter(id => id !== user?.uid)
                        .map(fetchUserData)
                );
                setAvailableUsers(usersData.filter(Boolean));
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        if (user) {
            fetchUsers();
        }
    }, [user]);

    // Fetch courses for group chats
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                if (user) {
                    const coursesQuery = query(collection(db, 'courses'));
                    const snapshot = await getDocs(coursesQuery);
                    const coursesData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setAvailableCourses(coursesData);
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
                setAvailableCourses([]);
            }
        };

        fetchCourses();
    }, [user]);

    // Enhanced chat fetching with better user data handling
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'privateChats'),
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chats = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const chatData = doc.data();
                    const otherUserId = chatData.participants.find(id => id !== user.uid);
                    const otherUser = await fetchUserData(otherUserId);

                    return {
                        id: doc.id,
                        ...chatData,
                        otherUser,
                        type: 'private'
                    };
                })
            );

            console.log('Private chats with user data:', chats);
            setPrivateChats(chats);

            // Separate archived chats
            const activeChats = chats.filter(chat => !chat.isArchived);
            const archived = chats.filter(chat => chat.isArchived);
            setArchivedChats(archived);

            if (!initialChatLoaded) {
                const chatIdFromUrl = searchParams.get('chat');
                if (chatIdFromUrl) {
                    const chatToSelect = activeChats.find(chat => chat.id === chatIdFromUrl);
                    if (chatToSelect) {
                        setSelectedChat(chatToSelect);
                        searchParams.delete('chat');
                        setSearchParams(searchParams);
                    }
                }
                setInitialChatLoaded(true);
            }

            setLoading(false);
        }, (error) => {
            console.error('Error fetching private chats:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, searchParams, setSearchParams, initialChatLoaded]);

    // Fetch group chats
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'groupChats'),
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chats = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const chatData = doc.data();

                    let courseInfo = {};
                    if (chatData.courseId) {
                        try {
                            const courseDoc = await getDoc(doc(db, 'courses', chatData.courseId));
                            if (courseDoc.exists()) {
                                courseInfo = courseDoc.data();
                            }
                        } catch (error) {
                            console.error('Error fetching course details:', error);
                        }
                    }

                    return {
                        id: doc.id,
                        ...chatData,
                        courseInfo,
                        type: 'group'
                    };
                })
            );

            const activeGroupChats = chats.filter(chat => !chat.isArchived);
            const archivedGroupChats = chats.filter(chat => chat.isArchived);

            setGroupChats(activeGroupChats);
            setArchivedChats(prev => [...prev, ...archivedGroupChats]);
        }, (error) => {
            console.error('Error fetching group chats:', error);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch messages for selected chat
    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            return;
        }

        try {
            const messagesRef = collection(
                db,
                selectedChat.type === 'private' ? 'privateChats' : 'groupChats',
                selectedChat.id,
                'messages'
            );

            const q = query(messagesRef, orderBy('timestamp', 'asc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const messagesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate()
                }));
                setMessages(messagesData);
            }, (error) => {
                console.error('Error fetching messages:', error);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error setting up messages listener:', error);
        }
    }, [selectedChat]);

    // Function to create or find chat with a specific user
    const createOrFindChatWithUser = async (otherUserId) => {
        if (!user) {
            alert('Please log in to start a chat');
            return;
        }

        try {
            // Check if chat already exists
            const existingChatQuery = query(
                collection(db, 'privateChats'),
                where('participants', 'array-contains', user.uid)
            );

            const snapshot = await getDocs(existingChatQuery);
            const existingChat = snapshot.docs.find(doc => {
                const data = doc.data();
                return data.participants.includes(otherUserId);
            });

            if (existingChat) {
                const otherUser = await fetchUserData(otherUserId);
                setSelectedChat({
                    id: existingChat.id,
                    ...existingChat.data(),
                    otherUser,
                    type: 'private'
                });
                return existingChat.id;
            }

            // Create new chat
            const chatData = {
                participants: [user.uid, otherUserId],
                createdAt: serverTimestamp(),
                lastMessage: '',
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'privateChats'), chatData);
            const otherUser = await fetchUserData(otherUserId);

            setSelectedChat({
                id: docRef.id,
                ...chatData,
                otherUser,
                type: 'private'
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating private chat:', error);
            alert('Failed to create chat. Please check Firebase permissions.');
            return null;
        }
    };

    // Chat Management Functions
    const pinChat = async (chatId, chatType) => {
        try {
            const chatRef = doc(db, chatType === 'private' ? 'privateChats' : 'groupChats', chatId);
            await updateDoc(chatRef, {
                isPinned: true,
                pinnedAt: serverTimestamp()
            });
            setShowChatMenu(null);
        } catch (error) {
            console.error('Error pinning chat:', error);
            alert('Failed to pin chat');
        }
    };

    const unpinChat = async (chatId, chatType) => {
        try {
            const chatRef = doc(db, chatType === 'private' ? 'privateChats' : 'groupChats', chatId);
            await updateDoc(chatRef, {
                isPinned: false,
                pinnedAt: null
            });
            setShowChatMenu(null);
        } catch (error) {
            console.error('Error unpinning chat:', error);
            alert('Failed to unpin chat');
        }
    };

    const archiveChat = async (chatId, chatType) => {
        try {
            const chatRef = doc(db, chatType === 'private' ? 'privateChats' : 'groupChats', chatId);
            await updateDoc(chatRef, {
                isArchived: true,
                archivedAt: serverTimestamp()
            });
            setShowChatMenu(null);
            if (selectedChat?.id === chatId) {
                setSelectedChat(null);
            }
        } catch (error) {
            console.error('Error archiving chat:', error);
            alert('Failed to archive chat');
        }
    };

    const unarchiveChat = async (chatId, chatType) => {
        try {
            const chatRef = doc(db, chatType === 'private' ? 'privateChats' : 'groupChats', chatId);
            await updateDoc(chatRef, {
                isArchived: false,
                archivedAt: null
            });
            setShowChatMenu(null);
        } catch (error) {
            console.error('Error unarchiving chat:', error);
            alert('Failed to unarchive chat');
        }
    };

    const deleteChat = async (chatId, chatType) => {
        if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            return;
        }

        try {
            const chatRef = doc(db, chatType === 'private' ? 'privateChats' : 'groupChats', chatId);
            await deleteDoc(chatRef);
            setShowChatMenu(null);
            if (selectedChat?.id === chatId) {
                setSelectedChat(null);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat');
        }
    };

    const clearChatHistory = async (chatId, chatType) => {
        if (!window.confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
            return;
        }

        try {
            const messagesRef = collection(
                db,
                chatType === 'private' ? 'privateChats' : 'groupChats',
                chatId,
                'messages'
            );

            const snapshot = await getDocs(messagesRef);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            const chatRef = doc(db, chatType === 'private' ? 'privateChats' : 'groupChats', chatId);
            await updateDoc(chatRef, {
                lastMessage: '',
                lastMessageTime: serverTimestamp()
            });

            setShowChatMenu(null);
            setMessages([]);
        } catch (error) {
            console.error('Error clearing chat history:', error);
            alert('Failed to clear chat history');
        }
    };

    // Create new private chat
    const createPrivateChat = async (otherUserId) => {
        const chatId = await createOrFindChatWithUser(otherUserId);
        if (chatId) {
            setShowNewChatModal(false);
        }
    };

    // Create new group chat
    const createGroupChat = async () => {
        if (currentUserData?.role !== 'tutor' && currentUserData?.role !== 'admin') {
            alert('Only tutors can create group chats');
            return;
        }

        try {
            if (!groupName.trim() || selectedUsers.length === 0) {
                alert('Please provide group name and select at least one participant');
                return;
            }

            const groupData = {
                name: groupName,
                description: selectedCourse
                    ? `Group for ${availableCourses.find(c => c.id === selectedCourse)?.title || 'Course'}`
                    : 'General Discussion',
                createdBy: user.uid,
                courseId: selectedCourse || null,
                participants: [user.uid, ...selectedUsers],
                createdAt: serverTimestamp(),
                lastMessage: '',
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'groupChats'), groupData);

            setSelectedChat({
                id: docRef.id,
                ...groupData,
                type: 'group'
            });

            setShowNewGroupModal(false);
            setGroupName('');
            setSelectedUsers([]);
            setSelectedCourse('');
        } catch (error) {
            console.error('Error creating group chat:', error);
            alert('Failed to create group. Please check Firebase permissions.');
        }
    };

    // Send message
    const sendMessage = async (text = input, type = 'text', mediaUrl = null, cloudinaryData = null) => {
        if ((!text || text.trim() === '') && !mediaUrl) return;
        if (!selectedChat) return;

        try {
            const messagesRef = collection(
                db,
                selectedChat.type === 'private' ? 'privateChats' : 'groupChats',
                selectedChat.id,
                'messages'
            );

            const messageData = {
                sender: user.uid,
                senderName: currentUserData?.displayName || 'User',
                text: text?.trim() || '',
                timestamp: serverTimestamp(),
                type: type,
                mediaUrl: mediaUrl,
                cloudinaryData: cloudinaryData || (mediaUrl ? {
                    uploadedAt: new Date().toISOString(),
                    resourceType: type === 'image' ? 'image' : 'raw'
                } : null)
            };

            await addDoc(messagesRef, messageData);

            // Update last message in chat document
            const chatRef = doc(
                db,
                selectedChat.type === 'private' ? 'privateChats' : 'groupChats',
                selectedChat.id
            );

            const lastMessageText = type === 'text' ? text :
                type === 'image' ? '📷 Image' :
                    type === 'file' ? '📎 File' :
                        type === 'video' ? '🎥 Video' : '🎤 Voice';

            await updateDoc(chatRef, {
                lastMessage: lastMessageText,
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            if (type === 'text') {
                setInput('');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please check Firebase permissions.');
        }
    };

    // Handle file upload to Cloudinary
    const handleFileUpload = async (file, type) => {
        if (!selectedChat || !file) {
            console.error('Missing parameters');
            return;
        }

        setUploading(true);
        setUploadingFile(file);
        setUploadProgress(0);

        try {
            // Simulate progress (Cloudinary doesn't provide progress events in basic implementation)
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Create folder path for organization
            const folder = `chat_media/${selectedChat.id}`;

            // Upload to Cloudinary using your signed upload function
            const uploadResult = await uploadToCloudinary(file, folder);

            clearInterval(progressInterval);
            setUploadProgress(100);

            console.log('Cloudinary upload successful:', uploadResult);

            // Determine message type based on file category
            const fileCategory = getFileCategory(file);
            const messageType = fileCategory === 'image' ? 'image' :
                fileCategory === 'video' ? 'video' : 'file';

            // Send message with Cloudinary URL
            await sendMessage(
                file.name,
                messageType,
                uploadResult.url,
                {
                    publicId: uploadResult.publicId,
                    resourceType: uploadResult.resourceType,
                    format: uploadResult.format,
                    bytes: uploadResult.bytes,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    originalFilename: uploadResult.originalFilename,
                    uploadedAt: uploadResult.createdAt || new Date().toISOString()
                }
            );

        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);

            // More specific error messages
            if (error.message.includes('Failed to fetch')) {
                alert('Failed to connect to the server. Please check your internet connection and try again.');
            } else if (error.message.includes('VITE_API_BASE_URL is not defined')) {
                alert('Server configuration error. Please contact support.');
            } else if (error.message.includes('Invalid signature data')) {
                alert('Server authentication error. Please try again.');
            } else {
                alert(`Failed to upload file: ${error.message}`);
            }
        } finally {
            setUploading(false);
            setUploadingFile(null);
            setUploadProgress(0);
            setShowAttachmentMenu(false);
        }
    };
    // Handle image upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate image file
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }

            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            handleFileUpload(file, 'image');
            e.target.value = ''; // Reset input
        }
    };

    // Handle document upload
    const handleDocumentUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (10MB limit for documents)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size should be less than 10MB');
                return;
            }

            handleFileUpload(file, 'file');
            e.target.value = ''; // Reset input
        }
    };

    // Handle video upload
    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate video file
            if (!file.type.startsWith('video/')) {
                alert('Please select a valid video file');
                return;
            }

            // Check file size (20MB limit for videos)
            if (file.size > 20 * 1024 * 1024) {
                alert('Video size should be less than 20MB');
                return;
            }

            handleFileUpload(file, 'video');
            e.target.value = ''; // Reset input
        }
    };

    // Handle key press for message input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Toggle user selection for group creation
    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Get user display name
    const getUserDisplayName = (userData) => {
        if (!userData) return 'User';
        return userData.displayName || `User ${userData.id?.slice(0, 4)}` || 'User';
    };

    // Get chat display name
    const getChatDisplayName = (chat) => {
        if (chat.type === 'private') {
            return getUserDisplayName(chat.otherUser);
        } else {
            return chat.name || 'Group Chat';
        }
    };

    // Get user avatar with color based on user ID
    const getUserAvatar = (userData, size = 'w-12 h-12') => {
        if (userData?.photoURL) {
            return (
                <img
                    src={userData.photoURL}
                    alt={getUserDisplayName(userData)}
                    className={`${size} rounded-full object-cover border-2 border-gray-200`}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            );
        }

        const userId = userData?.id || userData?.email || 'user';
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
            'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
        ];
        const colorIndex = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        const color = colors[colorIndex];

        return (
            <div className={`${size} ${color} rounded-full flex items-center justify-center text-white font-semibold border-2 border-white shadow-sm`}>
                {getUserDisplayName(userData).charAt(0).toUpperCase()}
            </div>
        );
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        try {
            if (timestamp instanceof Date) {
                return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            if (timestamp.toDate) {
                return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return '';
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Filter chats based on search term and active tab
    const getFilteredChats = () => {
        let chats = [];

        if (activeTab === 'private') {
            chats = privateChats;
        } else if (activeTab === 'group') {
            chats = groupChats;
        } else if (activeTab === 'archived') {
            chats = archivedChats;
        }

        if (!searchTerm) return chats;

        return chats.filter(chat =>
            getChatDisplayName(chat).toLowerCase().includes(searchTerm.toLowerCase()) ||
            chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Get file icon based on type
    const getFileIcon = (message) => {
        if (message.type === 'image') return Image;
        if (message.type === 'video') return Video;
        if (message.text?.includes('.pdf')) return FileText;
        return File;
    };

    // Attachment Menu Component
    const AttachmentMenu = () => (
        <div
            ref={attachmentMenuRef}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-50"
        >
            <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition text-left"
                disabled={uploading}
            >
                <Image size={16} className="text-green-600" />
                <span>Image</span>
            </button>
            <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition text-left"
                disabled={uploading}
            >
                <Video size={16} className="text-purple-600" />
                <span>Video</span>
            </button>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition text-left"
                disabled={uploading}
            >
                <File size={16} className="text-blue-600" />
                <span>Document</span>
            </button>
            <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition text-left"
                disabled={uploading}
            >
                <Camera size={16} className="text-orange-600" />
                <span>Camera</span>
            </button>
            <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition text-left"
                disabled={uploading}
            >
                <Mic size={16} className="text-red-600" />
                <span>Voice Note</span>
            </button>
        </div>
    );

    // Upload Progress Component
    const UploadProgress = () => (
        <div className="fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50 min-w-64">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                    Uploading {uploadingFile?.name}
                </span>
                <button
                    onClick={() => {
                        setUploading(false);
                        setUploadingFile(null);
                        setUploadProgress(0);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X size={16} />
                </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">
                {uploadProgress}%
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen mt-30 mb-30 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Loading chats...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-10 lg:mb-30 min-h-screen bg-gray-50">
            {uploading && <UploadProgress />}

            {/* Refactored Layout: 
            1. Added px-[15px] for edge safety on mobile.
            2. Changed to flex-col for mobile, kept grid for lg+ screens.
            3. Adjusted top padding for better mobile spacing.
        */}
            <div className='flex flex-col lg:grid lg:grid-cols-[350px_1fr] max-w-7xl mx-auto min-h-[calc(100vh-100px)] lg:min-h-screen pt-24 lg:pt-30 gap-4 lg:gap-6 px-[15px] lg:px-6'>

                {/* Sidebar */}
                <div className='bg-white rounded-xl shadow-sm border border-gray-200 w-full'>
                    <div className='p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl'>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {getUserAvatar(currentUserData, 'w-10 h-10 lg:w-14 lg:h-14')}
                                <div>
                                    <div className="font-bold font-poppins text-sm lg:text-base text-gray-800">
                                        {getUserDisplayName(currentUserData)}
                                    </div>
                                    <div className="text-sm text-green-600 font-poppins flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                        Online
                                    </div>
                                    <div className="text-xs text-gray-500 capitalize">
                                        {currentUserData?.role || 'student'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-3 lg:p-4 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                            />
                        </div>
                    </div>

                    <div className='p-4 lg:p-6 border-b border-gray-200'>
                        <div className="flex items-center justify-between">
                            <p className='font-bold font-poppins text-base lg:text-lg text-gray-800'>Conversations</p>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {privateChats.length + groupChats.length}
                            </span>
                        </div>
                    </div>

                    {/* Tabs - Added overflow scroll for very small screens if needed */}
                    <div className='flex border-b border-gray-200 px-2 lg:px-6 overflow-x-auto no-scrollbar'>
                        <button
                            onClick={() => setActiveTab('private')}
                            className={`flex items-center justify-center gap-2 flex-1 py-3 lg:py-4 font-poppins cursor-pointer border-b-2 transition-all whitespace-nowrap text-sm lg:text-base ${activeTab === 'private'
                                ? 'border-blue-500 text-blue-600 font-semibold'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Users size={16} className="lg:w-[18px] lg:h-[18px]" />
                            Private
                        </button>
                        <button
                            onClick={() => setActiveTab('group')}
                            className={`flex items-center justify-center gap-2 flex-1 py-3 lg:py-4 font-poppins cursor-pointer border-b-2 transition-all whitespace-nowrap text-sm lg:text-base ${activeTab === 'group'
                                ? 'border-green-500 text-green-600 font-semibold'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Users size={16} className="lg:w-[18px] lg:h-[18px]" />
                            Group
                        </button>
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={`flex items-center justify-center gap-2 flex-1 py-3 lg:py-4 font-poppins cursor-pointer border-b-2 transition-all whitespace-nowrap text-sm lg:text-base ${activeTab === 'archived'
                                ? 'border-orange-500 text-orange-600 font-semibold'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Archive size={16} className="lg:w-[18px] lg:h-[18px]" />
                            Archived
                        </button>
                    </div>

                    {/* New Chat Buttons - Hidden for Archive Tab */}
                    {activeTab !== 'archived' && (
                        <div className="p-3 lg:p-4 border-b border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="w-full bg-white text-blue-600 py-2 lg:py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-50 border border-blue-200 transition-all shadow-sm text-sm lg:text-base"
                            >
                                <Plus size={18} />
                                New Private Chat
                            </button>

                            {(currentUserData?.role === 'tutor' || currentUserData?.role === 'admin') && (
                                <button
                                    onClick={() => setShowNewGroupModal(true)}
                                    className="w-full bg-white text-green-600 py-2 lg:py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-50 border border-green-200 transition-all shadow-sm mt-2 text-sm lg:text-base"
                                >
                                    <Users size={18} />
                                    New Group Chat
                                </button>
                            )}
                        </div>
                    )}

                    {/* Chats List - Constrained height on mobile to allow scrolling to chat window */}
                    <div className="overflow-y-auto h-64 lg:h-auto lg:max-h-[calc(100vh-400px)]">
                        <div className='p-3 lg:p-4'>
                            {getFilteredChats().length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users size={40} className="mx-auto mb-3 text-gray-300 lg:w-12 lg:h-12" />
                                    <p className="text-sm lg:text-base">
                                        {activeTab === 'archived'
                                            ? 'No archived chats'
                                            : activeTab === 'private'
                                                ? 'No private chats yet'
                                                : 'No group chats yet'
                                        }
                                    </p>
                                    <p className="text-xs lg:text-sm mt-1">
                                        {activeTab === 'archived'
                                            ? 'Archived chats will appear here'
                                            : activeTab === 'private'
                                                ? 'Start a new conversation'
                                                : currentUserData?.role === 'tutor' || currentUserData?.role === 'admin'
                                                    ? 'Create a new group'
                                                    : 'Join tutor-created groups for your courses'
                                        }
                                    </p>
                                </div>
                            ) : (
                                getFilteredChats().map(chat => (
                                    <ChatItem
                                        key={chat.id}
                                        chat={chat}
                                        isSelected={selectedChat?.id === chat.id}
                                        onSelect={setSelectedChat}
                                        onMenuToggle={setShowChatMenu}
                                        showMenu={showChatMenu === chat.id}
                                        menuRef={menuRef}
                                        onPin={() => pinChat(chat.id, chat.type)}
                                        onUnpin={() => unpinChat(chat.id, chat.type)}
                                        onArchive={() => archiveChat(chat.id, chat.type)}
                                        onUnarchive={() => unarchiveChat(chat.id, chat.type)}
                                        onDelete={() => deleteChat(chat.id, chat.type)}
                                        onClearHistory={() => clearChatHistory(chat.id, chat.type)}
                                        getUserAvatar={getUserAvatar}
                                        getChatDisplayName={getChatDisplayName}
                                        formatTime={formatTime}
                                        isArchivedTab={activeTab === 'archived'}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat Area - Fixed height on mobile for internal scrolling */}
                <div className='bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col w-full h-[600px] lg:h-auto'>
                    {selectedChat ? (
                        <div className="flex flex-col h-full">
                            {/* Chat Header */}
                            <div className="p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 lg:gap-4">
                                        {selectedChat.type === 'private' ? (
                                            getUserAvatar(selectedChat.otherUser, 'w-10 h-10 lg:w-14 lg:h-14')
                                        ) : (
                                            <div className="w-10 h-10 lg:w-14 lg:h-14 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center shadow-sm">
                                                <Users className="text-white w-5 h-5 lg:w-6 lg:h-6" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold font-poppins text-base lg:text-xl text-gray-800 truncate">
                                                {getChatDisplayName(selectedChat)}
                                            </div>
                                            {selectedChat.type === 'group' ? (
                                                <div className="text-xs lg:text-sm text-gray-600 truncate">
                                                    {selectedChat.participants?.length || 0} participants
                                                    {selectedChat.courseInfo?.title && ` • ${selectedChat.courseInfo.title}`}
                                                </div>
                                            ) : (
                                                <div className="text-xs lg:text-sm text-gray-600 capitalize">
                                                    {selectedChat.otherUser?.role || 'user'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="hidden sm:flex text-sm text-green-600 font-poppins items-center bg-white px-3 py-1 rounded-full border border-green-200">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            Online
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowChatMenu(selectedChat.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                            >
                                                <MoreVertical size={20} />
                                            </button>
                                            {showChatMenu === selectedChat.id && (
                                                <div
                                                    ref={menuRef}
                                                    className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-50"
                                                >
                                                    <ChatMenu
                                                        chat={selectedChat}
                                                        onPin={pinChat}
                                                        onUnpin={unpinChat}
                                                        onArchive={archiveChat}
                                                        onUnarchive={unarchiveChat}
                                                        onDelete={deleteChat}
                                                        onClearHistory={clearChatHistory}
                                                        onClose={() => setShowChatMenu(null)}
                                                        isArchived={selectedChat.isArchived}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto py-4 px-3 lg:py-6 lg:px-6 space-y-3 lg:space-y-4 bg-gray-50">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8 lg:py-12">
                                        <Send size={40} className="mx-auto mb-3 text-gray-300 lg:w-12 lg:h-12" />
                                        <h3 className="text-base lg:text-lg font-semibold mb-2">No messages yet</h3>
                                        <p className="text-sm">Start the conversation by sending a message</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <MessageBubble
                                            key={msg.id}
                                            message={msg}
                                            isOwnMessage={msg.sender === user.uid}
                                            showSenderName={selectedChat.type === 'group' && msg.sender !== user.uid}
                                            formatTime={formatTime}
                                            formatFileSize={formatFileSize}
                                            getFileIcon={getFileIcon}
                                        />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-3 lg:p-6 border-t border-gray-200 bg-white rounded-b-xl">
                                <div className="flex items-center gap-2 lg:gap-3 relative">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                            disabled={uploading}
                                            className="text-gray-400 hover:text-blue-500 transition p-2 rounded-full hover:bg-blue-50 disabled:opacity-50"
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                        {showAttachmentMenu && <AttachmentMenu />}
                                    </div>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your message here..."
                                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 lg:py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                        disabled={uploading}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!input.trim() || uploading}
                                        className="bg-blue-500 text-white p-2 lg:p-3 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Send size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-500 py-12 px-4">
                                <Users size={64} className="mx-auto mb-4 text-gray-200" />
                                <h3 className="text-lg lg:text-xl font-semibold mb-2 text-gray-600">Welcome to Chat</h3>
                                <p className="text-sm lg:text-base text-gray-500 max-w-md">
                                    Select a conversation from the sidebar or start a new one to begin messaging.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden file inputs */}
            <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <input type="file" ref={videoInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />
            <input type="file" ref={fileInputRef} onChange={handleDocumentUpload} className="hidden" />

            {/* New Private Chat Modal */}
            {showNewChatModal && (
                <NewChatModal
                    availableUsers={availableUsers}
                    onCreateChat={createPrivateChat}
                    onClose={() => setShowNewChatModal(false)}
                    getUserAvatar={getUserAvatar}
                    getUserDisplayName={getUserDisplayName}
                />
            )}

            {/* New Group Chat Modal */}
            {(currentUserData?.role === 'tutor' || currentUserData?.role === 'admin') && showNewGroupModal && (
                <NewGroupModal
                    groupName={groupName}
                    setGroupName={setGroupName}
                    selectedCourse={selectedCourse}
                    setSelectedCourse={setSelectedCourse}
                    availableCourses={availableCourses}
                    availableUsers={availableUsers}
                    selectedUsers={selectedUsers}
                    toggleUserSelection={toggleUserSelection}
                    onCreateGroup={createGroupChat}
                    onClose={() => {
                        setShowNewGroupModal(false);
                        setGroupName('');
                        setSelectedUsers([]);
                        setSelectedCourse('');
                    }}
                    getUserAvatar={getUserAvatar}
                    getUserDisplayName={getUserDisplayName}
                />
            )}
        </div>
    );
};

// Message Bubble Component
const MessageBubble = ({ message, isOwnMessage, showSenderName, formatTime, formatFileSize, getFileIcon }) => {
    const FileIcon = getFileIcon(message);

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 lg:mb-0`}>
            <div className={`max-w-[85%] lg:max-w-[75%] p-3 lg:px-4 lg:py-3 rounded-2xl shadow-sm ${isOwnMessage
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-white border border-gray-200 rounded-bl-none'
                }`}>
                {showSenderName && (
                    <div className="text-[10px] lg:text-xs font-semibold text-gray-600 mb-1">
                        {message.senderName}
                    </div>
                )}

                {/* Media Content */}
                {message.type === 'image' && message.mediaUrl ? (
                    <div className="mb-2">
                        <img
                            src={message.mediaUrl}
                            alt="Shared image"
                            className="w-full lg:w-auto lg:max-w-xs rounded-lg border border-gray-200 object-cover"
                            loading="lazy"
                        />
                        {message.cloudinaryData?.bytes && (
                            <div className="text-[10px] lg:text-xs opacity-75 mt-1">
                                {formatFileSize(message.cloudinaryData.bytes)}
                            </div>
                        )}
                    </div>
                ) : message.type === 'video' && message.mediaUrl ? (
                    <div className="mb-2">
                        <video
                            src={message.mediaUrl}
                            controls
                            className="w-full lg:w-auto lg:max-w-xs rounded-lg border border-gray-200"
                        />
                        {message.cloudinaryData?.bytes && (
                            <div className="text-[10px] lg:text-xs opacity-75 mt-1">
                                {formatFileSize(message.cloudinaryData.bytes)}
                            </div>
                        )}
                    </div>
                ) : (message.type === 'file' || message.mediaUrl) ? (
                    <div className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-black bg-opacity-10 rounded-lg mb-2">
                        <FileIcon size={20} className={`flex-shrink-0 ${isOwnMessage ? 'text-blue-100' : 'text-blue-500'}`} />
                        <div className="flex-1 min-w-0">
                            <a
                                href={message.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`font-medium hover:underline block truncate text-sm ${isOwnMessage ? 'text-blue-100' : 'text-blue-600'}`}
                            >
                                {message.text || 'Download file'}
                            </a>
                            {message.cloudinaryData?.bytes && (
                                <div className="text-[10px] lg:text-xs opacity-75">
                                    {formatFileSize(message.cloudinaryData.bytes)}
                                </div>
                            )}
                        </div>
                        <Download size={16} className={`flex-shrink-0 ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`} />
                    </div>
                ) : null}

                {/* Text Content */}
                {message.text && message.type === 'text' && (
                    <div className="text-sm leading-relaxed break-words">{message.text}</div>
                )}

                {/* Timestamp */}
                <div className={`text-[10px] lg:text-xs mt-1 lg:mt-2 text-right ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                    {formatTime(message.timestamp)}
                </div>
            </div>
        </div>
    );
};

// Chat Item Component
const ChatItem = ({
    chat,
    isSelected,
    onSelect,
    onMenuToggle,
    showMenu,
    menuRef,
    onPin,
    onUnpin,
    onArchive,
    onUnarchive,
    onDelete,
    onClearHistory,
    getUserAvatar,
    getChatDisplayName,
    formatTime,
    isArchivedTab = false
}) => {
    return (
        <div
            onClick={() => onSelect(chat)}
            className={`p-3 lg:p-4 font-poppins cursor-pointer rounded-xl mb-2 lg:mb-3 transition-all relative group ${isSelected
                ? 'bg-blue-50 border border-blue-200 shadow-sm'
                : 'hover:bg-gray-50 border border-transparent'
                }`}
        >
            <div className="flex items-center gap-3 lg:gap-4">
                {chat.type === 'private' ? (
                    // Passing responsive classes to avatar generator
                    getUserAvatar(chat.otherUser, "w-10 h-10 lg:w-12 lg:h-12")
                ) : (
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                        <Users className="text-white" size={16} /> {/* Adjusted icon size for mobile */}
                    </div>
                )}
                <div className='flex-1 min-w-0'>
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm lg:text-base text-gray-800 truncate flex items-center gap-2">
                            {getChatDisplayName(chat)}
                            {chat.isPinned && <Pin size={12} className="text-yellow-500 lg:w-[14px] lg:h-[14px]" />}
                        </div>
                        <div className="flex items-center gap-2">
                            {chat.lastMessageTime && (
                                <div className="text-[10px] lg:text-xs text-gray-400 whitespace-nowrap">
                                    {formatTime(chat.lastMessageTime)}
                                </div>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMenuToggle(chat.id);
                                }}
                                // Mobile: Always visible (opacity-100). Desktop: Visible on hover (lg:opacity-0 lg:group-hover...)
                                className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition"
                            >
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 truncate mt-1">
                        {chat.lastMessage || 'No messages yet'}
                    </div>
                    {chat.type === 'private' ? (
                        <div className="text-[10px] lg:text-xs text-gray-400 mt-1 capitalize">
                            {chat.otherUser?.role || 'user'}
                        </div>
                    ) : (
                        <div className="text-[10px] lg:text-xs text-gray-400 mt-1">
                            {chat.participants?.length || 0} members
                            {chat.courseInfo?.title && ` • ${chat.courseInfo.title}`}
                        </div>
                    )}
                </div>
            </div>

            {/* Menu */}
            {showMenu && (
                <div
                    ref={menuRef}
                    className="absolute right-2 top-8 lg:top-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-40 lg:min-w-48 z-10"
                >
                    <ChatMenu
                        chat={chat}
                        onPin={onPin}
                        onUnpin={onUnpin}
                        onArchive={onArchive}
                        onUnarchive={onUnarchive}
                        onDelete={onDelete}
                        onClearHistory={onClearHistory}
                        onClose={() => onMenuToggle(null)}
                        isArchived={isArchivedTab}
                    />
                </div>
            )}
        </div>
    );
};

// Chat Menu Component
const ChatMenu = ({
    chat,
    onPin,
    onUnpin,
    onArchive,
    onUnarchive,
    onDelete,
    onClearHistory,
    onClose,
    isArchived = false
}) => {
    const menuItems = [];

    if (isArchived) {
        menuItems.push({
            icon: Archive,
            label: 'Unarchive Chat',
            onClick: () => onUnarchive(chat.id, chat.type),
            color: 'text-gray-700'
        });
    } else {
        if (chat.isPinned) {
            menuItems.push({
                icon: Pin,
                label: 'Unpin Chat',
                onClick: () => onUnpin(chat.id, chat.type),
                color: 'text-gray-700'
            });
        } else {
            menuItems.push({
                icon: Pin,
                label: 'Pin Chat',
                onClick: () => onPin(chat.id, chat.type),
                color: 'text-gray-700'
            });
        }

        menuItems.push({
            icon: Archive,
            label: 'Archive Chat',
            onClick: () => onArchive(chat.id, chat.type),
            color: 'text-gray-700'
        });
    }

    menuItems.push({
        icon: Edit3,
        label: 'Clear History',
        onClick: () => onClearHistory(chat.id, chat.type),
        color: 'text-orange-600'
    });

    menuItems.push({
        icon: Trash2,
        label: 'Delete Chat',
        onClick: () => onDelete(chat.id, chat.type),
        color: 'text-red-600'
    });

    return (
        <>
            {menuItems.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition text-left"
                >
                    <item.icon size={16} className={item.color} />
                    <span className={item.color}>{item.label}</span>
                </button>
            ))}
        </>
    );
};

// New Chat Modal Component
// New Private Chat Modal Component
const NewChatModal = ({ availableUsers, onCreateChat, onClose, getUserAvatar, getUserDisplayName }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl overflow-hidden transform transition-all">
            <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg lg:text-xl font-bold text-gray-800">Start New Chat</h3>
                <p className="text-gray-600 text-xs lg:text-sm mt-1">Select a user to start a conversation</p>
            </div>

            <div className="max-h-[60vh] lg:max-h-96 overflow-y-auto">
                {availableUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Users size={40} className="mx-auto mb-3 text-gray-300 lg:w-12 lg:h-12" />
                        <p className="text-sm">No users available to chat with</p>
                    </div>
                ) : (
                    availableUsers.map(user => (
                        <div
                            key={user.id}
                            onClick={() => onCreateChat(user.id)}
                            className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 hover:bg-blue-50 cursor-pointer transition border-b border-gray-100 last:border-b-0 group"
                        >
                            {getUserAvatar(user, 'w-10 h-10 lg:w-12 lg:h-12 transition-transform group-hover:scale-105')}
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-800 text-sm lg:text-base truncate">
                                    {getUserDisplayName(user)}
                                </div>
                                <div className="text-xs lg:text-sm text-gray-500 capitalize truncate">
                                    {user.role || 'user'} • {user.email}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 lg:p-6 border-t border-gray-200 bg-gray-50">
                <button
                    onClick={onClose}
                    className="w-full bg-white border border-gray-300 text-gray-700 py-2 lg:py-3 rounded-lg hover:bg-gray-50 transition font-medium text-sm lg:text-base shadow-sm active:scale-[0.98]"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

// New Group Modal Component
const NewGroupModal = ({
    groupName,
    setGroupName,
    selectedCourse,
    setSelectedCourse,
    availableCourses,
    availableUsers,
    selectedUsers,
    toggleUserSelection,
    onCreateGroup,
    onClose,
    getUserAvatar,
    getUserDisplayName
}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <h3 className="text-lg lg:text-xl font-bold text-gray-800">Create Group Chat</h3>
                <p className="text-gray-600 text-xs lg:text-sm mt-1">Create a group for course discussions</p>
            </div>

            <div className="p-4 lg:p-6 space-y-3 lg:space-y-4 overflow-y-auto flex-1">
                <div>
                    <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2 text-gray-700">Group Name *</label>
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 lg:px-4 lg:py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                </div>

                {availableCourses.length > 0 && (
                    <div>
                        <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2 text-gray-700">Course (Optional)</label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 lg:px-4 lg:py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
                        >
                            <option value="">Select a course</option>
                            {availableCourses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2 text-gray-700">Select Participants *</label>
                    <div className="flex-1 overflow-y-auto border border-gray-300 rounded-lg bg-gray-50 min-h-[150px]">
                        {availableUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">No users available to add</p>
                            </div>
                        ) : (
                            availableUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => toggleUserSelection(user.id)}
                                    className={`flex items-center gap-3 p-2 lg:p-3 cursor-pointer transition border-b border-gray-100 last:border-b-0 ${selectedUsers.includes(user.id)
                                        ? 'bg-blue-50'
                                        : 'hover:bg-white'
                                        }`}
                                >
                                    <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded border flex items-center justify-center transition-colors ${selectedUsers.includes(user.id)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-400 bg-white'
                                        }`}>
                                        {selectedUsers.includes(user.id) && (
                                            <Check size={12} className="text-white" />
                                        )}
                                    </div>

                                    {getUserAvatar(user, 'w-8 h-8 lg:w-10 lg:h-10')}

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate">
                                            {getUserDisplayName(user)}
                                        </div>
                                        <div className="text-xs text-gray-500 capitalize truncate">
                                            {user.role || 'user'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-right">
                        Selected: <span className="font-semibold text-blue-600">{selectedUsers.length}</span> users
                    </div>
                </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-gray-200 bg-gray-50 flex gap-3 flex-shrink-0">
                <button
                    onClick={onClose}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 lg:py-3 rounded-lg hover:bg-gray-50 transition font-medium text-sm lg:text-base shadow-sm active:scale-[0.98]"
                >
                    Cancel
                </button>
                <button
                    onClick={onCreateGroup}
                    disabled={!groupName.trim() || selectedUsers.length === 0}
                    className="flex-1 bg-green-500 text-white py-2 lg:py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-md active:scale-[0.98] text-sm lg:text-base"
                >
                    Create Group
                </button>
            </div>
        </div>
    </div>
);

export default PrivateChat;