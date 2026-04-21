import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  UserX, 
  FileText,
  Activity,
  RefreshCw
} from 'lucide-react';
import {
  getAttendanceLogs,
  getLocalDateISO,
  getStudents,
} from '../utils/localStorageUtils';

const DashboardPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectSummary, setSubjectSummary] = useState([]);
  
  // Initialize stats with LocalStorage logic
  const [stats, setStats] = useState([
    { label: 'Total Registered Students', value: 0, change: '+0', changeType: 'up', icon: Users, color: 'from-indigo-500 to-purple-600' },
    { label: 'Present Today', value: 0, change: '+0', changeType: 'up', icon: CalendarCheck, color: 'from-green-400 to-emerald-500' },
    { label: 'Late Today', value: 0, change: '+0', changeType: 'down', icon: Clock, color: 'from-yellow-400 to-orange-500' },
    { label: 'Absent Today', value: 0, change: '+0', changeType: 'up', icon: UserX, color: 'from-red-400 to-pink-500' },
    { label: 'Total Attendance Logs', value: 0, change: '+0', changeType: 'up', icon: FileText, color: 'from-blue-400 to-cyan-500' },
  ]);

  const [recentActivity, setRecentActivity] = useState([]);

  // FIXED: Load data from LocalStorage instead of a broken API
  const fetchDashboardData = () => {
    setIsRefreshing(true);
    try {
      const savedStudents = getStudents();
      const attendanceLogs = getAttendanceLogs();

      const todayISO = getLocalDateISO();
      const logsToday = attendanceLogs.filter((log) => log.dateISO === todayISO);

      // One active attendance status per student for today.
      const todayByStudent = new Map();
      logsToday.forEach((log) => {
        todayByStudent.set(log.studentId, log);
      });

      const present = [...todayByStudent.values()].filter((log) => log.status === 'present').length;
      const late = [...todayByStudent.values()].filter((log) => log.status === 'late').length;
      const absent = savedStudents.length - todayByStudent.size;

      // 3. Update the Stat Cards
      setStats(prev => [
        { ...prev[0], value: savedStudents.length },
        { ...prev[1], value: present },
        { ...prev[2], value: late },
        { ...prev[3], value: Math.max(0, absent) },
        { ...prev[4], value: attendanceLogs.length },
      ]);

      // 4. Set Recent Activity (show last 5 logs)
      setRecentActivity(attendanceLogs.slice(0, 5));

      const summaryMap = new Map();
      attendanceLogs.forEach((log) => {
        const key = log.subjectCode || 'GENERAL';
        const current = summaryMap.get(key) || { subjectCode: key, total: 0, present: 0, late: 0, absent: 0 };
        current.total += 1;
        if (log.status === 'present') current.present += 1;
        if (log.status === 'late') current.late += 1;
        if (log.status === 'absent') current.absent += 1;
        summaryMap.set(key, current);
      });

      setSubjectSummary([...summaryMap.values()].sort((a, b) => b.total - a.total).slice(0, 6));

    } catch (error) {
      console.error('Error reading LocalStorage:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setIsLoading(false);
      }, 500); // Small delay for smooth feel
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onDataChanged = () => fetchDashboardData();
    window.addEventListener('attendance:data-changed', onDataChanged);

    return () => {
      clearInterval(timer);
      window.removeEventListener('attendance:data-changed', onDataChanged);
    };
  }, []);

  // Helper calculations
  const total = stats[0].value || 0;
  const attendancePercentage = total > 0 ? ((stats[1].value / total) * 100).toFixed(1) : 0;
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center animate-pulse">
          <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Syncing Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard</h2>
          <p className="text-gray-500">Attendance analytics from your local database</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 transition-all shadow-sm font-bold text-slate-700 dark:text-slate-200"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`rounded-3xl p-6 text-white shadow-lg bg-gradient-to-br ${stat.color} transition-transform hover:scale-[1.02]`}>
            <stat.icon size={28} className="opacity-80 mb-4" />
            <div className="text-3xl font-black">{stat.value}</div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Chart Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xl font-bold dark:text-white">Attendance Overview</h3>
            <div className="text-right">
              <span className="text-3xl font-black text-indigo-600">{attendancePercentage}%</span>
              <p className="text-xs text-slate-400 font-bold uppercase">Rate Today</p>
            </div>
          </div>
          
          {/* Simple SVG Chart */}
          <div className="relative h-48 flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle 
                cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12"
                className="text-indigo-500"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * attendancePercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black dark:text-white">{stats[1].value}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Present</span>
            </div>
          </div>
        </div>

        {/* Clock Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center flex flex-col justify-center text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-6xl font-black tracking-tighter mb-2">{formatTime(currentTime)}</div>
            <div className="text-indigo-400 font-bold uppercase tracking-widest">{formatDate(currentTime)}</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/50 to-transparent opacity-50"></div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-lg dark:text-white">Recent Activity</h3>
          <Activity className="text-indigo-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {recentActivity.length > 0 ? recentActivity.map((log, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="font-bold dark:text-white">{log.studentName}</div>
                    <div className="text-xs text-slate-400">{log.studentId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      log.status === 'present'
                        ? 'bg-green-100 text-green-700'
                        : log.status === 'late'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.time}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="px-6 py-10 text-center text-slate-400 font-medium">No attendance logs found for today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800">
          <h3 className="font-black text-lg dark:text-white">Per Subject Analytics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Subject</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Total Logs</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Present</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Late</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {subjectSummary.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-sm text-slate-400">No subject analytics yet.</td>
                </tr>
              ) : (
                subjectSummary.map((row) => (
                  <tr key={row.subjectCode}>
                    <td className="px-6 py-4 font-bold dark:text-white">{row.subjectCode}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{row.total}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-bold">{row.present}</td>
                    <td className="px-6 py-4 text-sm text-amber-600 font-bold">{row.late}</td>
                    <td className="px-6 py-4 text-sm text-rose-600 font-bold">{row.absent}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;