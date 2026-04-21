import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import DashboardPage from './DashboardPage';
import ScannerPage from './ScannerPage';
import RegisterStudentPage from './RegisterStudentPage';
import StudentsListPage from './StudentsListPage';
import AttendanceLogsPage from './AttendanceLogsPage';

const MainLayout = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'scanner':
        return <ScannerPage />;
      case 'register':
        return <RegisterStudentPage />;
      case 'students':
        return <StudentsListPage />;
      case 'logs':
        return <AttendanceLogsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default MainLayout;
