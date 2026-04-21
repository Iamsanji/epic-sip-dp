import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import DashboardPage from './DashboardPage';
import ScannerPage from './ScannerPage';
import RegisterStudentPage from './RegisterStudentPage';
import StudentsListPage from './StudentsListPage';
import AttendanceLogsPage from './AttendanceLogsPage';
import SubjectsPage from './SubjectsPage';
import SessionsPage from './SessionsPage';
import StudentProfilePage from './StudentProfilePage';
import LoginPage from './LoginPage';
import {
  getCurrentUser,
  logoutCurrentUser,
  seedDefaultUsers,
} from '../utils/localStorageUtils';

const MainLayout = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    seedDefaultUsers();
    const syncUser = () => setCurrentUser(getCurrentUser());
    window.addEventListener('attendance:data-changed', syncUser);
    return () => window.removeEventListener('attendance:data-changed', syncUser);
  }, []);

  const navItems = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    const role = currentUser.role;
    if (role === 'admin') {
      return [
        { label: 'Dashboard', key: 'dashboard', icon: 'dashboard', color: 'text-blue-400' },
        { label: 'Subjects', key: 'subjects', icon: 'book', color: 'text-cyan-400' },
        { label: 'Sessions', key: 'sessions', icon: 'session', color: 'text-emerald-400' },
        { label: 'QR Scanner', key: 'scanner', icon: 'scanner', color: 'text-green-400' },
        { label: 'Register Student', key: 'register', icon: 'register', color: 'text-yellow-400' },
        { label: 'Students List', key: 'students', icon: 'students', color: 'text-purple-400' },
        { label: 'Attendance Logs', key: 'logs', icon: 'logs', color: 'text-orange-400' },
      ];
    }

    if (role === 'teacher') {
      return [
        { label: 'Dashboard', key: 'dashboard', icon: 'dashboard', color: 'text-blue-400' },
        { label: 'Subjects', key: 'subjects', icon: 'book', color: 'text-cyan-400' },
        { label: 'Sessions', key: 'sessions', icon: 'session', color: 'text-emerald-400' },
        { label: 'QR Scanner', key: 'scanner', icon: 'scanner', color: 'text-green-400' },
        { label: 'Register Student', key: 'register', icon: 'register', color: 'text-yellow-400' },
        { label: 'Students List', key: 'students', icon: 'students', color: 'text-purple-400' },
        { label: 'Attendance Logs', key: 'logs', icon: 'logs', color: 'text-orange-400' },
      ];
    }

    return [
      { label: 'My Profile', key: 'profile', icon: 'students', color: 'text-violet-400' },
      { label: 'Attendance Logs', key: 'logs', icon: 'logs', color: 'text-orange-400' },
    ];
  }, [currentUser]);

  useEffect(() => {
    if (!navItems.some((item) => item.key === currentPage)) {
      setCurrentPage(navItems[0]?.key || 'dashboard');
    }
  }, [navItems, currentPage]);

  const handleLogout = () => {
    logoutCurrentUser();
    setCurrentUser(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'subjects':
        return <SubjectsPage currentUser={currentUser} />;
      case 'sessions':
        return <SessionsPage currentUser={currentUser} />;
      case 'scanner':
        return <ScannerPage />;
      case 'register':
        return <RegisterStudentPage />;
      case 'students':
        return <StudentsListPage />;
      case 'logs':
        return <AttendanceLogsPage />;
      case 'profile':
        return <StudentProfilePage currentUser={currentUser} />;
      default:
        return <DashboardPage />;
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        navItems={navItems}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default MainLayout;
