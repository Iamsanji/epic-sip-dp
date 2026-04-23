import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, ChevronRight,
  Eye, RefreshCw, Clock, UserCheck, UserX, X,
  Calendar, Download, Filter, AlertCircle,
  TrendingUp, TrendingDown, FileText, Printer,
  ChevronDown
} from 'lucide-react';
import { getAttendanceLogs, getLocalDateISO, getStudents, getSubjects } from '../utils/localStorageUtils';

const AttendanceLogsPage = ({ currentUser }) => {
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
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });
  const [studentRates, setStudentRates] = useState({});
  const [subjectSummary, setSubjectSummary] = useState([]);
  
  const itemsPerPage = 10;

  const isWithinDateRange = (logDateISO) => {
    if (!logDateISO) return false;
    const todayISO = getLocalDateISO();

    if (dateFilter === 'today') return logDateISO === todayISO;
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
      if (!startDate || !endDate) return true;
      return logDateISO >= startDate && logDateISO <= endDate;
    }
    return true;
  };

  const loadLogsFromStorage = () => {
    setIsRefreshing(true);
    try {
      const savedLogs = getAttendanceLogs();
      const isTeacher = currentUser?.role === 'teacher';
      const allowedSubjectIds = new Set(
        isTeacher
          ? getSubjects()
              .filter((subject) => subject.teacherId === currentUser?.id)
              .map((subject) => subject.id)
          : []
      );
      const roleScopedLogs = isTeacher
        ? savedLogs.filter((log) => allowedSubjectIds.has(String(log.subjectId || '').trim()))
        : savedLogs;
      
      let filtered = roleScopedLogs.filter((log) => {
        const studentName = String(log.studentName || '').toLowerCase();
        const studentId = String(log.studentId || '').toLowerCase();
        const query = searchTerm.toLowerCase();
        const matchesSearch = studentName.includes(query) || studentId.includes(query);
        const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
        const matchesDate = isWithinDateRange(log.dateISO);
        return matchesSearch && matchesStatus && matchesDate;
      });

      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Calculate stats
      const presentCount = filtered.filter(l => l.status === 'present').length;
      const lateCount = filtered.filter(l => l.status === 'late').length;
      const absentCount = filtered.filter(l => l.status === 'absent').length;
      setStats({ present: presentCount, late: lateCount, absent: absentCount });

      const studentSummary = new Map();
      roleScopedLogs.forEach((log) => {
        const studentId = String(log.studentId || '').trim();
        if (!studentId) {
          return;
        }

        const current = studentSummary.get(studentId) || { total: 0, attended: 0 };
        current.total += 1;
        if (log.status === 'present' || log.status === 'late') {
          current.attended += 1;
        }
        studentSummary.set(studentId, current);
      });

      const rateMap = {};
      studentSummary.forEach((value, key) => {
        rateMap[key] = value.total > 0 ? ((value.attended / value.total) * 100).toFixed(1) : '0.0';
      });
      setStudentRates(rateMap);

      const subjectMap = new Map();
      filtered.forEach((log) => {
        const key = log.subjectCode || 'General';
        const current = subjectMap.get(key) || { subjectCode: key, total: 0, present: 0, late: 0, absent: 0 };
        current.total += 1;
        if (log.status === 'present') current.present += 1;
        if (log.status === 'late') current.late += 1;
        if (log.status === 'absent') current.absent += 1;
        subjectMap.set(key, current);
      });
      setSubjectSummary([...subjectMap.values()].sort((a, b) => b.total - a.total).slice(0, 4));
      
      setTotalRecords(filtered.length);
      
      const start = (currentPage - 1) * itemsPerPage;
      const paginatedData = filtered.slice(start, start + itemsPerPage);
      
      setAttendanceData(paginatedData);
      setShowAlert(null);
    } catch (error) {
      console.error('Error loading logs:', error);
      setShowAlert({ type: 'error', message: 'Failed to load attendance logs.' });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogsFromStorage();
  }, [searchTerm, filterStatus, dateFilter, startDate, endDate, currentPage, currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, dateFilter, startDate, endDate]);

  useEffect(() => {
    const onDataChanged = () => loadLogsFromStorage();
    window.addEventListener('attendance:data-changed', onDataChanged);
    return () => window.removeEventListener('attendance:data-changed', onDataChanged);
  }, [searchTerm, filterStatus, dateFilter, startDate, endDate, currentPage, currentUser]);

  const exportToCSV = () => {
    const headers = ["Student ID", "Student Name", "Subject", "Status", "Date", "Time"];
    const csvData = attendanceData.map(log => [
      log.studentId,
      log.studentName,
      log.subjectCode || "General",
      log.status.toUpperCase(),
      log.date,
      log.time
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wmsu_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    setShowAlert({ type: 'success', message: 'Attendance logs exported successfully!' });
    setTimeout(() => setShowAlert(null), 3000);
  };

  const printLogs = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>WMSU Attendance Logs</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #dc2626; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #dc2626; color: white; }
            .status-present { color: #10b981; }
            .status-late { color: #f59e0b; }
            .status-absent { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>WMSU Attendance Logs</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${totalRecords}</p>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceData.map(log => `
                <tr>
                  <td>${log.studentId}</td>
                  <td>${log.studentName}</td>
                  <td>${log.subjectCode || "General"}</td>
                  <td class="status-${log.status}">${log.status.toUpperCase()}</td>
                  <td>${log.date}</td>
                  <td>${log.time}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.print();
    printWindow.close();
  };

  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);

  const getStatusBadge = (status) => {
    const statusConfig = {
      present: { color: 'bg-green-100 text-green-800', icon: UserCheck, label: 'Present' },
      absent: { color: 'bg-red-100 text-red-800', icon: UserX, label: 'Absent' },
      late: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Late' }
    };
    const config = statusConfig[status] || statusConfig.present;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  if (currentUser?.role === 'student') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-lg font-bold text-gray-900">Access Restricted</p>
          <p className="mt-1 text-sm text-gray-600">
            Students can only view their own records from the profile page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex justify-center items-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <p className="text-red-600 font-bold">Loading attendance logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Attendance <span className="text-red-600">Logs</span>
              </h2>
              <p className="text-gray-500 mt-1">Track and manage student attendance records</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Present</p>
                <p className="text-2xl font-black text-green-600">{stats.present}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Late</p>
                <p className="text-2xl font-black text-yellow-600">{stats.late}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Absent</p>
                <p className="text-2xl font-black text-red-600">{stats.absent}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown size={20} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Per-Student Attendance</p>
                <p className="text-sm text-gray-500">Current page uses overall student history</p>
              </div>
              <Filter size={18} className="text-red-600" />
            </div>
            <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
              {Object.keys(studentRates).length === 0 ? (
                <p className="text-sm text-gray-400">No student data yet.</p>
              ) : (
                Object.entries(studentRates)
                  .slice(0, 5)
                  .map(([studentId, rate]) => (
                    <div key={studentId} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-gray-500">{studentId}</span>
                      <span className="font-bold text-red-600">{rate}%</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Subject Summary</p>
                <p className="text-sm text-gray-500">Top subjects in the current filter</p>
              </div>
              <TrendingUp size={18} className="text-red-600" />
            </div>
            <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
              {subjectSummary.length === 0 ? (
                <p className="text-sm text-gray-400">No subject data yet.</p>
              ) : (
                subjectSummary.map((subject) => {
                  const rate = subject.total > 0 ? (((subject.present + subject.late) / subject.total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={subject.subjectCode} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">{subject.subjectCode}</span>
                      <span className="font-bold text-red-600">{rate}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Alert Message */}
        {showAlert && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            showAlert.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {showAlert.type === "success" ? "✅" : "❌"}
            {showAlert.message}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
            <div className="flex flex-col xl:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none cursor-pointer"
              >
                <option value="all">📊 All Status</option>
                <option value="present">✅ Present</option>
                <option value="late">⏰ Late</option>
                <option value="absent">❌ Absent</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none cursor-pointer"
              >
                <option value="all">📅 All Dates</option>
                <option value="today">📆 Today</option>
                <option value="week">📅 Last 7 Days</option>
                <option value="month">📆 This Month</option>
                <option value="custom">⚙️ Custom Range</option>
              </select>

              {dateFilter === 'custom' && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  />
                  <span className="hidden sm:inline text-sm text-gray-400">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 sm:ml-auto">
                <button 
                  onClick={exportToCSV}
                  className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all transform hover:scale-105"
                  title="Export to CSV"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={printLogs}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all transform hover:scale-105"
                  title="Print"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={loadLogsFromStorage} 
                  className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceData.length > 0 ? attendanceData.map((log, index) => (
                  <tr key={log.id} className={`hover:bg-red-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{log.studentName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{log.course || "No course"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-mono">{log.studentId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-red-600">{studentRates[log.studentId] || '0.0'}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{log.subjectCode || "General"}</div>
                      {log.subjectTitle && <div className="text-xs text-gray-400 mt-0.5">{log.subjectTitle}</div>}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{log.date}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{log.time}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedLog(log)} 
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all transform hover:scale-105"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center">
                      <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No attendance logs found</p>
                      <p className="text-gray-300 text-sm mt-1">Try adjusting your filters or scan some QR codes</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {attendanceData.length > 0 ? (
              attendanceData.map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-200 p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{log.studentName}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{log.studentId}</p>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>

                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p><span className="font-semibold">Subject:</span> {log.subjectCode || 'General'}</p>
                    <p><span className="font-semibold">Rate:</span> {studentRates[log.studentId] || '0.0'}%</p>
                    <p><span className="font-semibold">When:</span> {log.date} • {log.time}</p>
                  </div>

                  <button
                    onClick={() => setSelectedLog(log)}
                    className="mt-3 w-full p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <Eye size={15} />
                    View Details
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center p-10">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No attendance logs found</p>
                <p className="text-gray-300 text-sm mt-1">Try adjusting your filters or scan some QR codes</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {endIndex} of {totalRecords} records
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg font-medium transition-all ${
                          currentPage === pageNum
                            ? "bg-red-600 text-white"
                            : "hover:bg-red-50 text-gray-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-2xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="text-white" size={20} />
                  <h3 className="text-xl font-bold text-white">Attendance Details</h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="text-white hover:bg-white/20 rounded-lg p-1 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs text-red-600 font-bold uppercase mb-1 tracking-wider">Student Information</p>
                  <p className="font-bold text-gray-900 text-lg">{selectedLog.studentName}</p>
                  <p className="text-sm text-red-600 font-mono mt-1">{selectedLog.studentId}</p>
                  <div className="mt-2 pt-2 border-t border-red-100">
                    <p className="text-xs text-gray-600">Course: {selectedLog.course || "N/A"}</p>
                    <p className="text-xs text-gray-600 mt-0.5">Year/Section: {selectedLog.year || "N/A"} - {selectedLog.section || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Subject</p>
                    <p className="font-semibold text-gray-900">{selectedLog.subjectCode || "General"}</p>
                    {selectedLog.subjectTitle && (
                      <p className="text-xs text-gray-500 mt-1">{selectedLog.subjectTitle}</p>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Status</p>
                    {getStatusBadge(selectedLog.status)}
                  </div>
                </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Student Attendance Rate</p>
                    <p className="font-semibold text-gray-900">{studentRates[selectedLog.studentId] || '0.0'}%</p>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Date</p>
                    <p className="font-semibold text-gray-900">{selectedLog.date}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Time</p>
                    <p className="font-semibold text-gray-900">{selectedLog.time}</p>
                  </div>
                </div>
                {selectedLog.sessionId && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600">Session ID: {selectedLog.sessionId}</p>
                  </div>
                )}
              </div>
              <div className="p-6 pt-0">
                <button 
                  onClick={() => setSelectedLog(null)} 
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogsPage;