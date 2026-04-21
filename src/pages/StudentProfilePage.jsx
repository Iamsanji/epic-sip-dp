import React, { useMemo } from "react";
import { User, CalendarCheck2, Clock3, UserX } from "lucide-react";
import { getAttendanceLogs, getStudents } from "../utils/localStorageUtils";

const StudentProfilePage = ({ currentUser }) => {
  const students = getStudents();
  const logs = getAttendanceLogs();

  const linkedStudent = useMemo(() => {
    if (currentUser?.studentId) {
      return students.find((student) => student.id === currentUser.studentId) || null;
    }

    return students.find((student) => student.id === currentUser?.username) || null;
  }, [students, currentUser]);

  const myLogs = useMemo(() => {
    if (!linkedStudent) {
      return [];
    }

    return logs.filter((log) => log.studentId === linkedStudent.id);
  }, [logs, linkedStudent]);

  const present = myLogs.filter((log) => log.status === "present").length;
  const late = myLogs.filter((log) => log.status === "late").length;
  const absent = myLogs.filter((log) => log.status === "absent").length;

  if (!linkedStudent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-2xl bg-yellow-50 text-yellow-700 p-5 font-semibold">
          Your student account is not linked to a registered student record yet. Ask your teacher/admin to map your account.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h2 className="text-4xl font-black text-gray-900 dark:text-white">My Profile</h2>
        <p className="text-gray-500">View your attendance status and history.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <User className="text-indigo-600" />
          <h3 className="text-xl font-black dark:text-white">{linkedStudent.name}</h3>
        </div>
        <p className="text-sm text-gray-500">ID: {linkedStudent.id}</p>
        <p className="text-sm text-gray-500">
          {linkedStudent.course} {linkedStudent.year}-{linkedStudent.section}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 bg-emerald-500 text-white">
          <CalendarCheck2 />
          <p className="mt-3 text-3xl font-black">{present}</p>
          <p className="text-sm">Present</p>
        </div>
        <div className="rounded-2xl p-5 bg-amber-500 text-white">
          <Clock3 />
          <p className="mt-3 text-3xl font-black">{late}</p>
          <p className="text-sm">Late</p>
        </div>
        <div className="rounded-2xl p-5 bg-rose-500 text-white">
          <UserX />
          <p className="mt-3 text-3xl font-black">{absent}</p>
          <p className="text-sm">Absent</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-lg overflow-hidden">
        <div className="p-4 border-b font-black dark:text-white">My Attendance Logs</div>
        <div className="divide-y">
          {myLogs.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No attendance logs yet.</p>
          ) : (
            myLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold dark:text-white">{log.subjectCode || "General Session"}</p>
                  <p className="text-sm text-gray-500">{log.date} {log.time}</p>
                </div>
                <span
                  className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                    log.status === "present"
                      ? "bg-emerald-100 text-emerald-700"
                      : log.status === "late"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
