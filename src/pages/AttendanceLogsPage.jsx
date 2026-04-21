import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, ChevronRight,
  Eye, RefreshCw, Clock, UserCheck, UserX, X
} from 'lucide-react';
import { getAttendanceLogs, getLocalDateISO } from '../utils/localStorageUtils';

const AttendanceLogsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showAlert, setShowAlert] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const itemsPerPage = 5;

  const isWithinDateRange = (logDateISO) => {
    if (!logDateISO) {
      return false;
    }

    const todayISO = getLocalDateISO();

    if (dateFilter === 'today') {
      return logDateISO === todayISO;
    }

    if (dateFilter === 'week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const weekStartISO = getLocalDateISO(weekStart);
      return logDateISO >= weekStartISO && logDateISO <= todayISO;
    }

    if (dateFilter === 'month') {
      const monthPrefix = todayISO.slice(0, 7);
      return logDateISO.startsWith(monthPrefix);
    }

    if (dateFilter === 'custom') {
      if (!startDate || !endDate) {
        return true;
      }
      return logDateISO >= startDate && logDateISO <= endDate;
    }

    return true;
  };

  // FIXED: Load data from LocalStorage instead of broken API
  const loadLogsFromStorage = () => {
    setIsRefreshing(true);
    try {
      const savedLogs = getAttendanceLogs();
      
      let filtered = savedLogs.filter((log) => {
        const studentName = String(log.studentName || '').toLowerCase();
        const studentId = String(log.studentId || '').toLowerCase();
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
          studentName.includes(query) ||
          studentId.includes(query);
        const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
        const matchesDate = isWithinDateRange(log.dateISO);
        return matchesSearch && matchesStatus && matchesDate;
      });

      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // 4. Update stats and state
      setTotalRecords(filtered.length);
      
      // Pagination logic
      const start = (currentPage - 1) * itemsPerPage;
      const paginatedData = filtered.slice(start, start + itemsPerPage);
      
      setAttendanceData(paginatedData);
      setShowAlert(null);
    } catch (error) {
      console.error('Error loading logs:', error);
      setShowAlert({ type: 'error', message: 'Failed to load local logs.' });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Run on mount or when filters/page change
  useEffect(() => {
    loadLogsFromStorage();
  }, [searchTerm, filterStatus, dateFilter, startDate, endDate, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, dateFilter, startDate, endDate]);

  useEffect(() => {
    const onDataChanged = () => loadLogsFromStorage();
    window.addEventListener('attendance:data-changed', onDataChanged);
    return () => window.removeEventListener('attendance:data-changed', onDataChanged);
  }, [searchTerm, filterStatus, dateFilter, startDate, endDate, currentPage]);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);

  const getStatusBadge = (status) => {
    const statusConfig = {
      present: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: UserCheck, label: 'Present' },
      absent: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: UserX, label: 'Absent' },
      late: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Late' }
    };
    const config = statusConfig[status] || statusConfig.present;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 pb-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Attendance Logs</h2>
        <p className="text-gray-500">Track and manage student records</p>
      </div>

      {showAlert && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {showAlert.message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2 text-sm"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"
              />
              <span className="text-sm text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>
          )}

          <button onClick={loadLogsFromStorage} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Student</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Time</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {attendanceData.length > 0 ? attendanceData.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-bold dark:text-white">{log.studentName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.studentId}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.subjectCode || "General"}</td>
                  <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.date} {log.time}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedLog(log)} className="text-purple-500 hover:text-purple-700"><Eye size={18} /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-medium">No logs found. Try scanning a QR code first!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight size={18}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold dark:text-white">Log Detail</h3>
              <button onClick={() => setSelectedLog(null)}><X /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Student</p>
                <p className="font-bold dark:text-white text-lg">{selectedLog.studentName}</p>
                <p className="text-sm text-purple-500">{selectedLog.studentId}</p>
                <p className="text-xs text-gray-400 mt-1">Subject: {selectedLog.subjectCode || "General"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Time</p>
                  <p className="font-bold dark:text-white">{selectedLog.time}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Status</p>
                  {getStatusBadge(selectedLog.status)}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedLog(null)} className="w-full mt-8 py-3 bg-gray-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLogsPage;