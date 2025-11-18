// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header-Footer/Header';
import Footer from './components/Header-Footer/Footer';
import HomePage from './components/HomePage';
import CourseDetail from './components/CourseDetail';
import CoursesPage from './components/CoursesPage';
import CourseDescribe from './components/CourseGenerationSteps/CourseDescribe';
import GeneratedCourses from './components/CourseGenerationSteps/GeneratedCourses';
import StudentDashboard from './components/StudentPortal/StudentDashboard';
import PrivateChat from './components/ChatRoom/PrivateChat';
import Instructors from './components/Instructor/Instructors';
import InstructorSingleProfile from './components/Instructor/InstructorSingleProfile';
import EnrollCourseSingle from './components/CourseGenerationSteps/EnrollCourseSingle';
import AssignmentDetail from './components/Assignment/AssignmentDetail';
import QuizDetail from './components/Quiz/QuizDeail';
import QuizSession from './components/Quiz/QuizSession';
import StartingPage from './components/StartingPage/StartingPage';
import RoleSelection from './components/StartingPage/RoleSelection';
import TutorDashboard from './components/TutorPortal/TutorDashboard';
import BookRecommendation from './components/StudentPortal/BookRecomendation';
import Login_Screen from './components/LoginScreen/loginScreen';
import ProfileSettings from './components/ProfileEdit/ProfileSettings';
import Registration_Screen from './components/RegistrationScreen/registrationScreen';
import { AuthProvider } from "./contexts/AuthContext";
import { InstructorProvider } from "./contexts/InstructorContext";
import CreateAssignment from './components/TutorPortal/CreateAssignment';
import CreateQuiz from './components/TutorPortal/CreateQuiz';
import CourseModules from './components/CourseGenerationSteps/CourseModules';
import CourseModuleDetails from './components/CourseGenerationSteps/CourseModuleDetails';
import IDE from './components/IDE';
import AdminDashboard from './components/Admin/admindashboard';
import AdminLoginScreen from './components/LoginScreen/AdminLoginScreen';
import PerformanceAnalysis from './components/ReportGeneration/PerformanceAnalysis';
import TutorStudentProgress from './components/ReportGeneration/TutorStudentProgress';
import CreateCourse from './components/CreateCourse';
import CourseAnalytics from './components/CourseAnalytics';


function App() {
  return (
    <AuthProvider>
      <InstructorProvider>
        <div className="App flex flex-col min-h-screen">
          <Header />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<StartingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login-screen" element={<Login_Screen />} />
            <Route path="/registration-screen" element={<Registration_Screen />} />
            <Route path="/select-role" element={<RoleSelection />} />
            <Route path="/admin-login" element={<AdminLoginScreen />} />

            {/* Course Routes */}
            <Route path="/courses-page" element={<CoursesPage />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/generated-courses" element={<GeneratedCourses />} />
            <Route path="/enroll-course-single/:id" element={<EnrollCourseSingle />} />


            {/* Instructor/Public Profile Routes */}
            <Route path="/instructors" element={<Instructors />} />
            <Route path="/instructor-Profile/:id" element={<InstructorSingleProfile />} />

            {/* Student Routes */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/book-recomendation" element={<BookRecommendation />} />
            <Route path="/performance-analysis" element={<PerformanceAnalysis />} />

            {/* Assignment & Quiz Routes (Student) */}
            <Route path="/assignment/:id" element={<AssignmentDetail />} />
            <Route path="/quizzes/:id" element={<QuizDetail />} />
            <Route path="/quiz/:id/start" element={<QuizSession />} />

            {/* Tutor Routes */}
            <Route path="/tutor-dashboard" element={<TutorDashboard />} />
            <Route path="/tutor/create-course" element={<CreateCourse />} />
            <Route path="/tutor/course/:id/edit" element={<CreateCourse />} />
            <Route path="/tutor/student-progress" element={<TutorStudentProgress />} />
            <Route path="/tutor/course/:courseId/analytics" element={<CourseAnalytics />} />


            {/* Tutor Content Creation Routes */}
            <Route path="/create-assignment" element={<CreateAssignment />} />
            <Route path="/create-quiz" element={<CreateQuiz />} />
            <Route path="/add-course" element={<CourseDescribe />} />
            <Route path="/add-course/modules" element={<CourseModules />} />
            <Route path="/add-course/module-details" element={<CourseModuleDetails />} />

            {/* Admin Routes */}
            <Route path="/admin-dashboard" element={<AdminDashboard />} />

            {/* Shared Routes */}
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/private-chat" element={<PrivateChat />} />
            <Route path="/ide" element={<IDE />} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </div>
      </InstructorProvider>
    </AuthProvider>
  );
}

// Simple 404 component
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-4">Page not found</p>
      <a href="/" className="text-blue-600 hover:text-blue-800 underline">
        Return to Home
      </a>
    </div>
  </div>
);

export default App;