import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  UserX, 
  FileText,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
  Radio
} from 'lucide-react';
import {
  getAttendanceLogs,
  getLocalDateISO,
  getAttendanceSessions,
  getStudents,
  getSubjects,
} from '../utils/localStorageUtils';

const DashboardPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectSummary, setSubjectSummary] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [subjectOverview, setSubjectOverview] = useState([]);
  const [greeting, setGreeting] = useState('');
  
  const [stats, setStats] = useState([
    { label: 'Total Students', value: 0, change: '+0', changeType: 'up', icon: Users, color: 'from-red-600 to-red-700' },
    { label: 'Present Today', value: 0, change: '+0', changeType: 'up', icon: CalendarCheck, color: 'from-red-500 to-red-600' },
    { label: 'Late Today', value: 0, change: '+0', changeType: 'down', icon: Clock, color: 'from-red-400 to-red-500' },
    { label: 'Absent Today', value: 0, change: '+0', changeType: 'up', icon: UserX, color: 'from-red-700 to-red-800' },
    { label: 'Total Logs', value: 0, change: '+0', changeType: 'up', icon: FileText, color: 'from-red-600 to-red-700' },
  ]);

  const [recentActivity, setRecentActivity] = useState([]);

  const fetchDashboardData = () => {
    setIsRefreshing(true);
    try {
      const savedStudents = getStudents();
      const attendanceLogs = getAttendanceLogs();
      const subjects = getSubjects();
      const sessions = getAttendanceSessions();

      const todayISO = getLocalDateISO();
      const logsToday = attendanceLogs.filter((log) => log.dateISO === todayISO);

      const todayByStudent = new Map();
      logsToday.forEach((log) => {
        todayByStudent.set(log.studentId, log);
      });

      const present = [...todayByStudent.values()].filter((log) => log.status === 'present').length;
      const late = [...todayByStudent.values()].filter((log) => log.status === 'late').length;
      const absent = savedStudents.length - todayByStudent.size;

      setStats(prev => [
        { ...prev[0], value: savedStudents.length },
        { ...prev[1], value: present },
        { ...prev[2], value: late },
        { ...prev[3], value: Math.max(0, absent) },
        { ...prev[4], value: attendanceLogs.length },
      ]);

      setRecentActivity(attendanceLogs.slice(0, 8));
      setOpenSessions(sessions.filter((session) => session.status === 'OPEN'));

      const overview = subjects.map((subject) => {
        const enrolled = subject.studentIds?.length || 0;
        const openSession = sessions.find((session) => session.subjectId === subject.id && session.status === 'OPEN');
        return {
          id: subject.id,
          code: subject.code,
          title: subject.title,
          enrolled,
          sessionStatus: openSession ? 'OPEN' : 'CLOSED',
          teacherName: subject.teacherName,
        };
      });
      setSubjectOverview(overview.slice(0, 6));

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
      }, 500);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onDataChanged = () => fetchDashboardData();
    window.addEventListener('attendance:data-changed', onDataChanged);

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => {
      clearInterval(timer);
      window.removeEventListener('attendance:data-changed', onDataChanged);
    };
  }, []);

  const total = stats[0].value || 0;
  const attendancePercentage = total > 0 ? ((stats[1].value / total) * 100).toFixed(1) : 0;
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex justify-center items-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-20 w-20 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Zap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-600 w-8 h-8 animate-pulse" />
          </div>
          <p className="text-red-600 font-bold text-lg">Loading Dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Fetching attendance records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="space-y-6 w-full max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {/* Header Section with WMSU Branding */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  <span className="text-red-600">WMSU</span> Attendance
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {greeting}! Here's your attendance summary
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-2xl font-mono font-bold text-red-600">{formatTime(currentTime)}</div>
                <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid - Modern Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500`}></div>
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                    <stat.icon className="w-5 h-5 text-red-600" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${stat.changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.changeType === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{stat.label}</div>
              </div>
              <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Open Sessions</h3>
                <p className="text-sm text-gray-500 mt-1">Subjects currently accepting QR scans</p>
              </div>
              <Radio className="text-red-600 w-5 h-5" />
            </div>
            <div className="divide-y divide-gray-50">
              {openSessions.length === 0 ? (
                <div className="p-6 text-sm text-gray-400">No open sessions right now.</div>
              ) : (
                openSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{session.subjectCode}</p>
                      <p className="text-sm text-gray-500">{session.subjectTitle}</p>
                    </div>
                    <span className="text-[11px] font-black uppercase px-2 py-1 rounded-full bg-red-100 text-red-700">OPEN</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Subject Overview</h3>
                <p className="text-sm text-gray-500 mt-1">Enrollment and session status by class</p>
              </div>
              <Users className="text-red-600 w-5 h-5" />
            </div>
            <div className="divide-y divide-gray-50">
              {subjectOverview.length === 0 ? (
                <div className="p-6 text-sm text-gray-400">No subjects available.</div>
              ) : (
                subjectOverview.map((subject) => (
                  <div key={subject.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{subject.code}</p>
                      <p className="text-sm text-gray-500">{subject.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{subject.teacherName || 'Unassigned'} • {subject.enrolled} enrolled</p>
                    </div>
                    <span className={`text-[11px] font-black uppercase px-2 py-1 rounded-full ${subject.sessionStatus === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {subject.sessionStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Attendance Overview Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Attendance Overview</h3>
                <p className="text-sm text-gray-500 mt-1">Today's attendance rate</p>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-red-600">{attendancePercentage}%</div>
                <div className="text-xs text-gray-400 mt-1">Attendance Rate</div>
              </div>
            </div>
            
            <div className="relative flex justify-center items-center py-6">
              <svg className="w-40 h-40 sm:w-48 sm:h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="84" fill="none" stroke="#fee2e2" strokeWidth="16" />
                <circle 
                  cx="96" cy="96" r="84" fill="none" stroke="#dc2626" strokeWidth="16"
                  strokeDasharray={527.52}
                  strokeDashoffset={527.52 - (527.52 * attendancePercentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-black text-gray-900">{stats[1].value}</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Present</span>
                <span className="text-xs text-gray-400">out of {total}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-sm text-gray-500">Late</div>
                <div className="text-xl font-bold text-yellow-600">{stats[2].value}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Absent</div>
                <div className="text-xl font-bold text-red-600">{stats[3].value}</div>
              </div>
            </div>
          </div>

          {/* Clock & Stats Card */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-lg p-5 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-32 -translate-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full transform -translate-24 translate-24"></div>
            <div className="relative z-10">
              <div className="text-center">
                <div className="text-3xl sm:text-5xl font-black tracking-tighter mb-3 font-mono">{formatTime(currentTime)}</div>
                <div className="text-red-100 font-medium uppercase tracking-wider text-sm">{formatDate(currentTime)}</div>
                <div className="mt-6 pt-6 border-t border-red-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                  <div className="text-left">
                    <div className="text-xs text-red-100 opacity-75">Today's Performance</div>
                    <div className="text-xl font-bold">{attendancePercentage}% Rate</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-100 opacity-75">Active Students</div>
                    <div className="text-xl font-bold">{stats[0].value}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500 mt-1">Latest attendance records</p>
            </div>
            <Activity className="text-red-600 w-5 h-5" />
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Subject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity.length > 0 ? recentActivity.map((log, i) => (
                  <tr key={i} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{log.studentName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">ID: {log.studentId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        log.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : log.status === 'late'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 'present' && '✓'}
                        {log.status === 'late' && '⏰'}
                        {log.status === 'absent' && '✗'}
                        <span className="ml-1">{log.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.time}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.subjectCode || 'General'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No attendance records found</p>
                        <p className="text-sm mt-1">Check back later for updates</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-4 space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((log, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{log.studentName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ID: {log.studentId}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    log.status === 'present'
                      ? 'bg-green-100 text-green-700'
                      : log.status === 'late'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>{log.time}</p>
                  <p className="mt-0.5">{log.subjectCode || 'General'}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No attendance records found</p>
              </div>
            )}
          </div>
        </div>

        {/* Subject Analytics Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Subject Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">Performance breakdown by subject</p>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Total Logs</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Present</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Late</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Absent</th>
                  <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subjectSummary.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No subject data available</p>
                    </td>
                  </tr>
                ) : (
                  subjectSummary.map((row, idx) => {
                    const successRate = row.total > 0 ? ((row.present / row.total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{row.subjectCode}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{row.total}</td>
                        <td className="px-6 py-4">
                          <span className="text-green-600 font-bold">{row.present}</span>
                          <span className="text-gray-400 text-xs ml-1">({row.total > 0 ? ((row.present/row.total)*100).toFixed(0) : 0}%)</span>
                        </td>
                        <td className="px-6 py-4 text-amber-600 font-bold">{row.late}</td>
                        <td className="px-6 py-4 text-red-600 font-bold">{row.absent}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-600 rounded-full transition-all duration-500"
                                style={{ width: `${successRate}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-600 min-w-[40px]">{successRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-4 space-y-3">
            {subjectSummary.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No subject data available</p>
              </div>
            ) : (
              subjectSummary.map((row, idx) => {
                const successRate = row.total > 0 ? ((row.present / row.total) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="rounded-xl border border-gray-200 p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 text-sm">{row.subjectCode}</p>
                      <span className="text-xs font-bold text-red-600">{successRate}%</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-1">
                      <p>Total: {row.total}</p>
                      <p>Present: {row.present}</p>
                      <p>Late: {row.late}</p>
                      <p>Absent: {row.absent}</p>
                    </div>
                    <div className="mt-2 h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full" style={{ width: `${successRate}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">
            Western Mindanao State University - Attendance Management System
          </p>
          <p className="text-xs text-gray-300 mt-1">
            © 2024 WMSU. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;