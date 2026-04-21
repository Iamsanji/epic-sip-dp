import React, { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, AlertTriangle, ScanLine } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  getActiveSession,
  getAttendanceLogs,
  getLocalDateISO,
  getStudents,
  getSubjects,
  upsertTodayAttendanceLog,
} from "../utils/localStorageUtils";

const ScannerPage = () => {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [statusMode, setStatusMode] = useState("auto");
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  const getAttendanceStatus = (date = new Date()) => {
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const lateCutoff = 8 * 60 + 15;
    return totalMinutes > lateCutoff ? "late" : "present";
  };

  const buildAttendanceLog = (student) => {
    const now = new Date();
    const dateISO = getLocalDateISO(now);
    const computedStatus =
      statusMode === "auto" ? getAttendanceStatus(now) : statusMode;

    return {
      id: `${student.id}-${dateISO}`,
      studentId: student.id,
      studentName: student.name,
      course: student.course,
      year: student.year,
      section: student.section,
      status: computedStatus,
      dateISO,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      timestamp: now.toISOString(),
    };
  };

  const startScanner = () => {
    if (scannerStarted) return;

    const activeSession = getActiveSession();
    if (!activeSession) {
      setStatus("error");
      setMessage("No active attendance session. Ask your teacher/admin to open a session first.");
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: 250,
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
          const liveSession = getActiveSession();

          if (!student) {
            setStatus("error");
            setMessage(`No student found for QR ID: ${scannedId}`);
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
              `${student.name} (${student.id}) is not enrolled in ${liveSession.subjectCode || "this subject"}.`
            );
            return;
          }

          const nextLog = buildAttendanceLog(student);
          nextLog.sessionId = liveSession.id;
          nextLog.subjectId = liveSession.subjectId;
          nextLog.subjectCode = liveSession.subjectCode;
          nextLog.subjectTitle = liveSession.subjectTitle;
          const { isUpdate } = upsertTodayAttendanceLog(nextLog);
          const allLogs = getAttendanceLogs();

          setStatus("success");
          setMessage(
            `${isUpdate ? "Attendance Updated" : "Attendance Recorded"}: ${student.name} (${student.id}) - ${nextLog.status.toUpperCase()} in ${liveSession.subjectCode} | Total Logs: ${allLogs.length}`
          );
        } catch (error) {
          setStatus("error");
          setMessage("Failed to record attendance. Please try again.");
          console.error("Scanner save error:", error);
        } finally {
          scanner
            .clear()
            .catch(() => {})
            .finally(() => {
              scannerRef.current = null;
              isProcessingRef.current = false;
              setScannerStarted(false);
            });
        }
      },
      () => {
        // ignore scan errors
      }
    );

    setScannerStarted(true);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <h2 className="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white tracking-tight">
        QR Code Scanner
      </h2>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 p-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900">
            <ScanLine className="w-8 h-8 text-indigo-600 dark:text-indigo-300" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Scan Student QR
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Use your camera to scan the student's QR code.
            </p>
          </div>
        </div>

        {/* Scanner Box */}
        <div className="rounded-2xl overflow-hidden border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Attendance Status Mode
            </label>
            <select
              value={statusMode}
              onChange={(e) => setStatusMode(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="auto">Auto (Time Based)</option>
              <option value="present">Force Present</option>
              <option value="late">Force Late</option>
              <option value="absent">Force Absent</option>
            </select>
          </div>

          <div id="reader" className="w-full"></div>

          {!scannerStarted && (
            <div className="h-72 flex flex-col items-center justify-center text-center">
              <Camera className="w-14 h-14 text-indigo-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Camera scanner is not active
              </p>

              <button
                onClick={startScanner}
                className="mt-5 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg"
              >
                Start Scanner
              </button>
            </div>
          )}
        </div>

        {/* Status Alert */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
              status === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status === "success" ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 text-center">
          Make sure camera permission is enabled.
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;