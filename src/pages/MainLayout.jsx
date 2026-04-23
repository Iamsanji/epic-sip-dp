import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  logoutCurrentUser,
  seedDefaultUsers,
} from '../utils/localStorageUtils';

const Sidebar = lazy(() => import('../components/Sidebar'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const ScannerPage = lazy(() => import('./ScannerPage'));
const RegisterStudentPage = lazy(() => import('./RegisterStudentPage'));
const StudentsListPage = lazy(() => import('./StudentsListPage'));
const AttendanceLogsPage = lazy(() => import('./AttendanceLogsPage'));
const SubjectsPage = lazy(() => import('./SubjectsPage'));
const SessionsPage = lazy(() => import('./SessionsPage'));
const StudentProfilePage = lazy(() => import('./StudentProfilePage'));
const LoginPage = lazy(() => import('./LoginPage'));
const AdminControlsPage = lazy(() => import('./AdminControlsPage'));

const MainLayout = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    seedDefaultUsers();
    const syncUser = () => setCurrentUser(getCurrentUser());
    window.addEventListener('attendance:data-changed', syncUser);

    return () => {
      window.removeEventListener('attendance:data-changed', syncUser);
    };
  }, []);

  const navItems = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    const role = currentUser.role;
    if (role === 'admin') {
      return [
        { label: 'Dashboard', key: 'dashboard', icon: 'dashboard', color: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'Subjects', key: 'subjects', icon: 'book', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Admin Controls', key: 'admin-controls', icon: 'settings', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Sessions', key: 'sessions', icon: 'session', color: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'QR Scanner', key: 'scanner', icon: 'scanner', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Register Student', key: 'register', icon: 'register', color: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'Students List', key: 'students', icon: 'students', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Attendance Logs', key: 'logs', icon: 'logs', color: 'text-red-600', bgColor: 'bg-red-50' },
      ];
    }

    if (role === 'teacher') {
      return [
        { label: 'Dashboard', key: 'dashboard', icon: 'dashboard', color: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'Subjects', key: 'subjects', icon: 'book', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Sessions', key: 'sessions', icon: 'session', color: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'QR Scanner', key: 'scanner', icon: 'scanner', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Students List', key: 'students', icon: 'students', color: 'text-red-500', bgColor: 'bg-red-50' },
        { label: 'Attendance Logs', key: 'logs', icon: 'logs', color: 'text-red-600', bgColor: 'bg-red-50' },
      ];
    }

    return [
      { label: 'My Profile', key: 'profile', icon: 'students', color: 'text-red-600', bgColor: 'bg-red-50' },
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
      case 'admin-controls':
        return <AdminControlsPage currentUser={currentUser} />;
      case 'scanner':
        return <ScannerPage />;
      case 'register':
        return <RegisterStudentPage currentUser={currentUser} />;
      case 'students':
        return <StudentsListPage currentUser={currentUser} />;
      case 'logs':
        return <AttendanceLogsPage currentUser={currentUser} />;
      case 'profile':
        return <StudentProfilePage currentUser={currentUser} />;
      default:
        return <DashboardPage />;
    }
  };

  if (!currentUser) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-red-50" />}>
        <LoginPage onLogin={setCurrentUser} />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <Suspense fallback={<div className="h-screen w-72 bg-white border-r border-red-100" />}>
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          navItems={navItems}
          onLogout={handleLogout}
          currentUser={currentUser}
        />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-x-clip">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-red-100 pl-16 pr-4 py-3 sm:px-6 sm:py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">
                  <span className="text-red-600">WMSU</span> Attendance
                </h1>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-medium text-gray-700">{currentUser.name}</div>
                <div className="text-xs text-gray-400">{currentUser.id}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 sm:p-6 md:p-8">
          <Suspense fallback={<div className="min-h-[260px] rounded-xl border border-red-100 bg-white" />}>
            {renderPage()}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;