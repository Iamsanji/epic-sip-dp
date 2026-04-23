import React, { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, AlertTriangle, ScanLine, XCircle, Clock, Users, BookOpen, Power, PowerOff } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  getAttendanceLogs,
  getLocalDateISO,
  getOpenAttendanceSessions,
  getStudents,
  getSubjects,
  upsertTodayAttendanceLog,
} from "../utils/localStorageUtils";

const ScannerPage = () => {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [openSessions, setOpenSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const syncSessions = () => {
      const sessions = getOpenAttendanceSessions();
      setOpenSessions(sessions);
      setSelectedSessionId((prev) => {
        if (prev && sessions.some((session) => session.id === prev)) {
          return prev;
        }

        return sessions[0]?.id || "";
      });
    };

    syncSessions();
    window.addEventListener("attendance:data-changed", syncSessions);
    return () => window.removeEventListener("attendance:data-changed", syncSessions);
  }, []);

  useEffect(() => {
    if (scannerStarted) {
      return;
    }

    if (openSessions.length === 0) {
      setStatus("error");
      setMessage("No open attendance sessions found. Ask an admin or assigned teacher to open one first.");
    }
  }, [openSessions, scannerStarted]);

  const getAttendanceStatusForSession = (session, date = new Date()) => {
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const lateCutoff = Number(session?.lateCutoffMinutes);
    const closeCutoff = Number(session?.closeMinutes);

    if (Number.isFinite(closeCutoff) && totalMinutes > closeCutoff) {
      return "closed";
    }

    if (Number.isFinite(lateCutoff) && totalMinutes > lateCutoff) {
      return "late";
    }

    return "present";
  };

  const buildAttendanceLog = (student, session) => {
    const now = new Date();
    const dateISO = getLocalDateISO(now);
    const status = getAttendanceStatusForSession(session, now);

    return {
      id: `${student.id}-${dateISO}-${session.id}`,
      studentId: student.id,
      studentName: student.name,
      course: student.course,
      year: student.yearLevel,
      section: student.section,
      status,
      dateISO,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      timestamp: now.toISOString(),
      sessionId: session.id,
      subjectId: session.subjectId,
      subjectCode: session.subjectCode,
      subjectTitle: session.subjectTitle,
    };
  };

  const selectedSession = openSessions.find((session) => session.id === selectedSessionId) || null;

  const addToRecentScans = (student, status, subjectCode) => {
    setRecentScans(prev => [
      {
        id: Date.now(),
        studentName: student.name,
        studentId: student.id,
        status: status,
        subjectCode: subjectCode,
        time: new Date().toLocaleTimeString(),
      },
      ...prev
    ].slice(0, 10));
  };

  const startScanner = () => {
    if (scannerStarted) return;

    if (!selectedSession) {
      setStatus("error");
      setMessage("Select an open subject session before starting the scanner.");
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        if (isProcessingRef.current) {
          return;
        }

        isProcessingRef.current = true;

        try {
          const scannedId = String(decodedText || "").trim();
          const students = getStudents();
          const student = students.find((item) => item.id === scannedId);
          const liveSession = openSessions.find((session) => session.id === selectedSession.id) || null;

          if (!student) {
            setStatus("error");
            setMessage(`Student not found for ID: ${scannedId}`);
            addToRecentScans({ name: "Unknown", id: scannedId }, "error", liveSession?.subjectCode || "N/A");
            return;
          }

          if (!liveSession) {
            setStatus("error");
            setMessage("Session was closed before scan completed.");
            return;
          }

          const subjects = getSubjects();
          const activeSubject = subjects.find((subject) => subject.id === liveSession.subjectId);
          const isEnrolled = activeSubject?.studentIds?.includes(student.id);

          if (!isEnrolled) {
            setStatus("error");
            setMessage(
              `${student.name} is not enrolled in ${liveSession.subjectCode || "this subject"}.`
            );
            addToRecentScans(student, "not enrolled", liveSession.subjectCode);
            return;
          }

          const nextLog = buildAttendanceLog(student, liveSession);

          if (nextLog.status === "closed") {
            setStatus("error");
            setMessage(
              `Attendance window closed for ${liveSession.subjectCode}. Close cutoff was ${liveSession.closeTime || "set by teacher"}.`
            );
            addToRecentScans(student, "closed", liveSession.subjectCode);
            return;
          }

          const { isUpdate } = upsertTodayAttendanceLog(nextLog);
          const allLogs = getAttendanceLogs();

          const successMessage = `${isUpdate ? "Updated" : "Recorded"}: ${student.name} - ${nextLog.status.toUpperCase()}`;
          setStatus("success");
          setMessage(successMessage);
          addToRecentScans(student, nextLog.status, liveSession.subjectCode);
          
        } catch (error) {
          setStatus("error");
          setMessage("Failed to record attendance. Please try again.");
          console.error("Scanner save error:", error);
        } finally {
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 1000);
        }
      },
      (error) => {
        console.debug("Scan error:", error);
      }
    );

    setScannerStarted(true);
    setStatus("info");
    setMessage("Scanner active. Ready to scan student QR codes.");
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
      setScannerStarted(false);
      setStatus("info");
      setMessage("Scanner stopped.");
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "success": return "bg-green-50 border-green-200 text-green-700";
      case "error": return "bg-red-50 border-red-200 text-red-700";
      case "info": return "bg-blue-50 border-blue-200 text-blue-700";
      default: return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-5 h-5" />;
      case "error": return <AlertTriangle className="w-5 h-5" />;
      case "info": return <ScanLine className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col">
        {/* Header - Compact */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <ScanLine className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                QR Code <span className="text-red-600">Scanner</span>
              </h2>
              <p className="text-gray-500 text-sm">Scan student IDs for the selected subject session</p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">Open Subject Session</p>
              <p className="text-xs text-emerald-600">QR scans are matched to the student record first, then validated for this session.</p>
            </div>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[260px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="">Choose an open session</option>
              {openSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.subjectCode} - {session.subjectTitle}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content - Takes remaining height */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Scanner Section */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 flex flex-col">
              {/* Active Session Banner */}
              {selectedSession && (
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 rounded-t-2xl flex-shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <BookOpen className="text-white" size={16} />
                      </div>
                      <div>
                        <p className="text-red-100 text-[10px] font-bold uppercase tracking-wider">Active Session</p>
                        <p className="text-white font-bold text-sm">
                          {selectedSession.subjectCode} - {selectedSession.subjectTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-white/90 text-xs">
                      <Clock size={12} />
                      <span>
                        {selectedSession.startTime}
                        {selectedSession.lateCutoffTime ? ` • Late: ${selectedSession.lateCutoffTime}` : ""}
                        {selectedSession.closeTime ? ` • Close: ${selectedSession.closeTime}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 flex flex-col min-h-0">
                {/* Scanner Controls */}
                <div className="flex-shrink-0 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-500">
                    {selectedSession ? `Ready for ${selectedSession.subjectCode}` : "Select an open session to begin"}
                  </div>
                  
                  <div className="flex gap-2">
                    {!scannerStarted ? (
                      <button
                        onClick={startScanner}
                        disabled={!selectedSession}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
                          selectedSession 
                            ? "bg-red-600 hover:bg-red-700 text-white shadow" 
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <Power size={14} />
                        Start
                      </button>
                    ) : (
                      <button
                        onClick={stopScanner}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm bg-gray-600 hover:bg-gray-700 text-white shadow transition-all"
                      >
                        <PowerOff size={14} />
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                {/* Scanner Box - Takes remaining space */}
                <div className={`min-h-[320px] sm:min-h-[420px] rounded-xl overflow-hidden border-2 transition-all ${
                  scannerStarted ? "border-red-300 shadow-lg shadow-red-100" : "border-dashed border-gray-300"
                } bg-gray-50`}>
                  <div id="reader" className="w-full h-full"></div>

                  {!scannerStarted && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <Camera className="w-16 h-16 text-gray-300 mb-3" />
                      <p className="text-gray-400 font-medium mb-1">
                        Scanner is not active
                      </p>
                      <p className="text-gray-400 text-xs">
                        Click "Start" to begin scanning
                      </p>
                      {!selectedSession && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-yellow-700 text-xs">
                          <AlertTriangle size={12} className="inline mr-1" />
                          No open attendance session selected
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Alert */}
                {message && (
                  <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 border text-sm ${getStatusColor()} flex-shrink-0`}>
                    {getStatusIcon()}
                    <span className="font-medium text-xs">{message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Scans Sidebar */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 flex flex-col min-h-[280px] lg:min-h-0 lg:h-full">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="text-white" size={16} />
                  <h3 className="text-sm font-bold text-white">Recent Scans</h3>
                </div>
                <p className="text-red-100 text-[10px] mt-0.5">Last 10 scans</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 min-h-[160px] lg:min-h-0">
                {recentScans.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <ScanLine className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-400 text-xs">No scans yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="p-2 rounded-lg bg-gray-50 hover:bg-red-50 transition-colors border border-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate">{scan.studentName}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{scan.studentId}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                scan.status === "present" ? "bg-green-100 text-green-700" :
                                scan.status === "late" ? "bg-yellow-100 text-yellow-700" :
                                scan.status === "closed" ? "bg-orange-100 text-orange-700" :
                                scan.status === "error" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {scan.status.toUpperCase()}
                              </span>
                              <span className="text-[9px] text-gray-400">{scan.subjectCode}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-[10px] text-gray-400">{scan.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {recentScans.length > 0 && (
                <div className="p-2 border-t border-gray-100 text-center flex-shrink-0">
                  <p className="text-[10px] text-gray-400">
                    Total: {recentScans.length} scans
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions - Compact footer */}
        <div className="flex-shrink-0 mt-3 bg-white rounded-xl border border-red-100 p-2">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">1</span>
              <span className="text-gray-500">Start session</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">2</span>
              <span className="text-gray-500">Click Start</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">3</span>
              <span className="text-gray-500">Scan QR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;