import React, { useEffect, useMemo, useState } from "react";
import { PlayCircle, StopCircle, TimerReset } from "lucide-react";
import {
  closeAttendanceSession,
  getActiveSession,
  getAttendanceSessions,
  getSubjects,
  startAttendanceSession,
} from "../utils/localStorageUtils";

const SessionsPage = ({ currentUser }) => {
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const sync = () => {
      setSubjects(getSubjects());
      setSessions(getAttendanceSessions());
      setActiveSession(getActiveSession());
    };

    sync();
    window.addEventListener("attendance:data-changed", sync);
    return () => window.removeEventListener("attendance:data-changed", sync);
  }, []);

  useEffect(() => {
    if (!message.text) {
      return;
    }

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

  const handleStart = () => {
    const subject = visibleSubjects.find((item) => item.id === selectedSubjectId);
    if (!subject) {
      setMessage({ text: "Please choose a subject.", type: "error" });
      return;
    }

    const session = startAttendanceSession({
      subject,
      teacher: currentUser,
    });

    setActiveSession(session);
    setSelectedSubjectId("");
    setMessage({ text: `Session started for ${session.subjectCode}.`, type: "success" });
  };

  const handleClose = () => {
    if (!activeSession) {
      setMessage({ text: "No active session to close.", type: "error" });
      return;
    }

    closeAttendanceSession(activeSession.id);
    setActiveSession(null);
    setMessage({ text: "Session closed.", type: "success" });
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
      <div>
        <h2 className="text-4xl font-black text-gray-900 dark:text-white">Attendance Sessions</h2>
        <p className="text-gray-500">Start or close subject attendance windows.</p>
      </div>

      {message.text && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-lg p-6">
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full rounded-xl border p-3"
          >
            <option value="">Select subject</option>
            {visibleSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleStart}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2"
          >
            <PlayCircle size={18} /> Start Session
          </button>

          <button
            onClick={handleClose}
            className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2"
          >
            <StopCircle size={18} /> Close Session
          </button>
        </div>

        {activeSession ? (
          <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm font-semibold">
            Active Session: {activeSession.subjectCode} ({activeSession.subjectTitle}) started at {activeSession.startTime}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-100 text-slate-600 p-3 text-sm font-semibold">
            No active session.
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <TimerReset className="text-indigo-500" />
          <h3 className="font-bold text-lg dark:text-white">Session History</h3>
        </div>

        <div className="divide-y">
          {visibleSessions.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No sessions yet.</p>
          ) : (
            visibleSessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold dark:text-white">{session.subjectCode} - {session.subjectTitle}</p>
                  <p className="text-sm text-gray-500">
                    {session.dateISO} | {session.startTime} {session.endTime ? `- ${session.endTime}` : ""}
                  </p>
                  <p className="text-sm text-gray-500">Teacher: {session.teacherName}</p>
                </div>
                <span
                  className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                    session.status === "OPEN"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionsPage;
