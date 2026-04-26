import React, { useEffect, useMemo, useState } from "react";
import { 
  PlayCircle, StopCircle, TimerReset, CalendarDays, Users, Radio, 
  BookOpen, Clock, CheckCircle, XCircle, AlertCircle, Activity
} from "lucide-react";
import {
  closeAttendanceSession,
  getAuditLogs,
  getAttendanceSessions,
  getSubjects,
  startAttendanceSession,
} from "../utils/localStorageUtils";

const SessionsPage = ({ currentUser }) => {
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [lateGraceMinutes, setLateGraceMinutes] = useState(15);
  const [closeAfterMinutes, setCloseAfterMinutes] = useState(30);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSubjects(getSubjects());
      setSessions(getAttendanceSessions());
      setAuditLogs(getAuditLogs());
    };

    sync();
    window.addEventListener("attendance:data-changed", sync);
    return () => window.removeEventListener("attendance:data-changed", sync);
  }, []);

  useEffect(() => {
    if (!message.text) return;
    const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const visibleSubjects = useMemo(() => {
    if (currentUser?.role === "teacher") {
      return subjects.filter((subject) => subject.teacherId === currentUser.id);
    }
    return subjects;
  }, [subjects, currentUser]);

  const visibleSessions = useMemo(() => {
    if (currentUser?.role === "teacher") {
      return sessions.filter((session) => session.teacherId === currentUser.id);
    }
    return sessions;
  }, [sessions, currentUser]);

  const openSessions = useMemo(
    () => visibleSessions.filter((session) => session.status === "OPEN"),
    [visibleSessions]
  );
  const canStartSessions = currentUser?.role === "teacher";

  const startSubjectSession = (subject) => {
    const safeLateGrace = Math.max(0, Math.min(180, Number(lateGraceMinutes) || 0));
    const safeCloseAfter = Math.max(safeLateGrace, Math.min(720, Number(closeAfterMinutes) || 0));

    setIsLoading(true);
    try {
      const session = startAttendanceSession({
        subject,
        teacher: currentUser,
        timing: {
          lateGraceMinutes: safeLateGrace,
          closeAfterMinutes: safeCloseAfter,
        },
      });
      setMessage({ text: `✅ Session started for ${session.subjectCode}`, type: "success" });
      window.dispatchEvent(new CustomEvent('attendance:data-changed'));
    } catch (error) {
      setMessage({ text: `❌ ${error?.message || "Failed to start session"}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const closeSubjectSession = (subjectId) => {
    const session = visibleSessions.find((item) => item.subjectId === subjectId && item.status === "OPEN");
    if (!session) {
      setMessage({ text: "❌ No open session to close for this subject", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      closeAttendanceSession(session.id, currentUser);
      setMessage({ text: `✅ Session closed for ${session.subjectCode}`, type: "success" });
      window.dispatchEvent(new CustomEvent('attendance:data-changed'));
    } catch (error) {
      setMessage({ text: `❌ ${error?.message || "Failed to close session"}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalEnrolled = visibleSubjects.reduce((sum, subj) => sum + (subj.studentIds?.length || 0), 0);
  const recentSessionAudit = auditLogs.filter((log) => log.action.includes("SESSION")).slice(0, 8);

  return (
    <div className="min-h-full bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Attendance <span className="text-red-600">Sessions</span>
              </h2>
              <p className="text-gray-500 mt-1">Start and manage attendance sessions per subject</p>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Open Sessions</p>
                <p className="text-2xl font-black text-green-600">{openSessions.length}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Radio size={20} className="text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Ready for QR scans</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Subjects</p>
                <p className="text-2xl font-black text-red-600">{visibleSubjects.length}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Available in your view</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Total Sessions</p>
                <p className="text-2xl font-black text-blue-600">{visibleSessions.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TimerReset size={20} className="text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Tracked session history</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Enrolled Students</p>
                <p className="text-2xl font-black text-purple-600">{totalEnrolled}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Across all subjects</p>
          </div>
        </div>

        {/* Subject Controls */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="text-white" size={20} />
              <h3 className="text-lg font-bold text-white">Subject Controls</h3>
            </div>
            <p className="text-red-100 text-sm mt-1">Start or close attendance sessions for each subject</p>
          </div>

          <div className="p-6">
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">Session Timing Rules</p>
              <p className="text-xs text-red-600 mt-1">
                Only teachers can start sessions for their assigned subjects. Session closes automatically based on the session time you set below.
              </p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600">
                  Late after (minutes from Start)
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={lateGraceMinutes}
                    onChange={(event) => setLateGraceMinutes(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-gray-900"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-600">
                  Close after (minutes from Start)
                  <input
                    type="number"
                    min={0}
                    max={720}
                    value={closeAfterMinutes}
                    onChange={(event) => setCloseAfterMinutes(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-gray-900"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Example: if Close after is 180 minutes, the session auto-closes 3 hours after Start.
              </p>
            </div>

            {visibleSubjects.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No subjects available</p>
                <p className="text-gray-300 text-sm mt-1">
                  {currentUser?.role === "teacher" 
                    ? "No subjects assigned to you yet" 
                    : "Create subjects to start taking attendance"}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {visibleSubjects.map((subject) => {
                  const activeSession = visibleSessions.find(
                    (item) => item.subjectId === subject.id && item.status === "OPEN"
                  );
                  const latestSession = visibleSessions.find((item) => item.subjectId === subject.id) || null;
                  const hasAssignedTeacher = Boolean(subject.teacherId);

                  return (
                    <div 
                      key={subject.id} 
                      className={`rounded-xl border-2 transition-all duration-200 ${
                        activeSession 
                          ? "border-green-300 bg-gradient-to-br from-green-50 to-white shadow-md" 
                          : "border-gray-100 bg-white hover:border-red-200 hover:shadow-md"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <BookOpen size={14} className={activeSession ? "text-green-600" : "text-gray-400"} />
                              <p className="font-black text-gray-900 text-lg">{subject.code}</p>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{subject.title}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Users size={10} />
                                {subject.studentIds?.length || 0} students
                              </span>
                              {subject.schedule && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={10} />
                                  {subject.schedule}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                            activeSession 
                              ? "bg-green-100 text-green-700 border border-green-200" 
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {activeSession ? "● OPEN" : "○ CLOSED"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <button
                            onClick={() => startSubjectSession(subject)}
                            disabled={isLoading || activeSession || !hasAssignedTeacher || !canStartSessions}
                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                              activeSession || !hasAssignedTeacher || !canStartSessions
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700 text-white transform hover:scale-[1.02]"
                            }`}
                          >
                            <PlayCircle size={14} /> Start
                          </button>
                          <button
                            onClick={() => closeSubjectSession(subject.id)}
                            disabled={!activeSession || isLoading}
                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                              !activeSession
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gray-600 hover:bg-gray-700 text-white transform hover:scale-[1.02]"
                            }`}
                          >
                            <StopCircle size={14} /> Close
                          </button>
                        </div>

                        {!hasAssignedTeacher && (
                          <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-[11px] text-yellow-700">
                            No teacher assigned. Assign a teacher from Admin Controls before starting this session.
                          </div>
                        )}

                        {!canStartSessions && (
                          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] text-blue-700">
                            Teacher login required to start sessions. Admin can monitor and close existing sessions.
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Last session:</span>
                            <span className="text-gray-600 font-medium">
                              {latestSession 
                                ? `${latestSession.dateISO} ${latestSession.startTime}` 
                                : "No sessions yet"}
                            </span>
                          </div>
                          {latestSession && (
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-gray-400">Timing:</span>
                              <span className="text-gray-600 font-medium">
                                Late {latestSession.lateCutoffTime || "-"} • Close {latestSession.closeTime || "-"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Session History */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <TimerReset className="text-white" size={20} />
              <h3 className="text-lg font-bold text-white">Session History</h3>
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white">
                {visibleSessions.length} Records
              </span>
            </div>
            <p className="text-red-100 text-sm mt-1">Complete history of all attendance sessions</p>
          </div>

          <div className="divide-y divide-gray-100">
            {visibleSessions.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No sessions yet</p>
                <p className="text-gray-300 text-sm mt-1">Start your first attendance session</p>
              </div>
            ) : (
              visibleSessions.map((session) => (
                <div key={session.id} className="p-5 hover:bg-red-50/30 transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={14} className="text-red-600" />
                        <p className="font-bold text-gray-900">
                          {session.subjectCode} - {session.subjectTitle}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <CalendarDays size={12} />
                          <span>{session.dateISO}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock size={12} />
                          <span>
                            {session.startTime} 
                            {session.endTime ? ` → ${session.endTime}` : " (Active)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock size={12} />
                          <span>
                            Late: {session.lateCutoffTime || "-"} • Close: {session.closeTime || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Users size={12} />
                          <span>Teacher: {session.teacherName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1 ${
                          session.status === "OPEN" 
                            ? "bg-green-100 text-green-700 border border-green-200" 
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {session.status === "OPEN" ? (
                          <><div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></div> OPEN</>
                        ) : (
                          <><div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div> CLOSED</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary Footer */}
          {visibleSessions.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between text-sm gap-2">
                <span className="text-gray-500">Total Sessions: <span className="font-bold text-gray-900">{visibleSessions.length}</span></span>
                <span className="text-gray-500">Open Sessions: <span className="font-bold text-green-600">{openSessions.length}</span></span>
                <span className="text-gray-500">Closed Sessions: <span className="font-bold text-gray-600">{visibleSessions.length - openSessions.length}</span></span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <Activity className="text-white" size={20} />
              <h3 className="text-lg font-bold text-white">Session Audit Trail</h3>
            </div>
            <p className="text-red-100 text-sm mt-1">Persistent history for session starts and closures</p>
          </div>

          <div className="divide-y divide-gray-100">
            {recentSessionAudit.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 font-medium">No session audit events yet</p>
              </div>
            ) : (
              recentSessionAudit.map((log) => (
                <div key={log.id} className="p-4">
                  <p className="text-sm font-bold text-gray-900">{log.action.replaceAll("_", " ")}</p>
                  <p className="text-sm text-gray-600">{log.details || "No details"}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.timestamp).toLocaleString()} • {log.actorName || "System"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionsPage;