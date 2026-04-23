import React, { useEffect, useMemo, useState } from "react";
import { KeyRound, UserCog, History, Users, ShieldAlert } from "lucide-react";
import {
  createTeacherAccount,
  getAuditLogs,
  getSubjects,
  getUsers,
  reassignSubjectTeacher,
  updateTeacherAccount,
} from "../utils/localStorageUtils";

const emptyTeacherForm = { name: "", username: "", password: "" };

const AdminControlsPage = ({ currentUser }) => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
  const [editingTeacherId, setEditingTeacherId] = useState("");

  const sync = () => {
    setTeachers(getUsers().filter((user) => user.role === "teacher"));
    setSubjects(getSubjects());
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    sync();
    window.addEventListener("attendance:data-changed", sync);
    return () => window.removeEventListener("attendance:data-changed", sync);
  }, []);

  useEffect(() => {
    if (!message.text) {
      return;
    }

    const timer = setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const teacherById = useMemo(() => {
    const map = new Map();
    teachers.forEach((teacher) => map.set(teacher.id, teacher));
    return map;
  }, [teachers]);

  if (currentUser?.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-bold">Admin access required.</p>
          <p className="text-sm mt-1">Only administrators can manage teacher accounts and reassignment controls.</p>
        </div>
      </div>
    );
  }

  const resetTeacherForm = () => {
    setTeacherForm(emptyTeacherForm);
    setEditingTeacherId("");
  };

  const onSubmitTeacher = (e) => {
    e.preventDefault();
    try {
      if (editingTeacherId) {
        updateTeacherAccount(editingTeacherId, teacherForm, currentUser);
        setMessage({ type: "success", text: "Teacher account updated." });
      } else {
        createTeacherAccount(teacherForm, currentUser);
        setMessage({ type: "success", text: "Teacher account created." });
      }
      resetTeacherForm();
      sync();
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to save teacher account." });
    }
  };

  const onEditTeacher = (teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      username: teacher.username,
      password: teacher.password,
    });
  };

  const onReassignTeacher = (subjectId, teacherId) => {
    try {
      reassignSubjectTeacher(subjectId, teacherId, currentUser);
      setMessage({ type: "success", text: "Subject teacher reassigned." });
      sync();
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to reassign teacher." });
    }
  };

  const relevantAudit = auditLogs.filter(
    (log) => log.action.includes("SESSION") || log.action.includes("TEACHER") || log.action.includes("SUBJECT_TEACHER")
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-4 sm:py-6 space-y-6">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Admin Controls</h2>
        <p className="text-gray-500">Manage teacher accounts, subject ownership, and audit history.</p>
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

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-red-100 shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="text-red-600" size={18} />
            <h3 className="font-bold text-lg">Teacher Accounts</h3>
          </div>

          <form onSubmit={onSubmitTeacher} className="space-y-3 mb-5">
            <input
              value={teacherForm.name}
              onChange={(e) => setTeacherForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 p-3"
              placeholder="Teacher full name"
            />
            <input
              value={teacherForm.username}
              onChange={(e) => setTeacherForm((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 p-3"
              placeholder="Username"
            />
            <input
              value={teacherForm.password}
              onChange={(e) => setTeacherForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 p-3"
              placeholder="Password"
              type="text"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold">
                {editingTeacherId ? "Update Teacher" : "Create Teacher"}
              </button>
              {editingTeacherId && (
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-bold"
                  onClick={resetTeacherForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {teachers.length === 0 ? (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
                No teacher accounts found. Create at least one teacher to assign subjects.
              </div>
            ) : (
              teachers.map((teacher) => (
                <div key={teacher.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-500">{teacher.username}</p>
                  </div>
                  <button
                    className="text-sm font-bold text-red-600"
                    onClick={() => onEditTeacher(teacher)}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-red-600" size={18} />
            <h3 className="font-bold text-lg">Subject to Teacher Overview</h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {subjects.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">No subjects available yet.</div>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="font-bold text-gray-900">{subject.code} - {subject.title}</p>
                  <p className="text-xs text-gray-500 mt-1">Current teacher: {subject.teacherName || "Unassigned"}</p>
                  <select
                    className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
                    value={subject.teacherId || ""}
                    onChange={(e) => onReassignTeacher(subject.id, e.target.value)}
                  >
                    <option value="">Select teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-red-100 shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="text-red-600" size={18} />
          <h3 className="font-bold text-lg">Audit History</h3>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {relevantAudit.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">No audit events recorded yet.</div>
          ) : (
            relevantAudit.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-100 p-3">
                <p className="text-sm font-bold text-gray-900">{log.action.replaceAll("_", " ")}</p>
                <p className="text-sm text-gray-600 mt-0.5">{log.details || "No details"}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(log.timestamp).toLocaleString()} • {log.actorName || "System"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {teachers.length === 0 && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-700 text-sm flex items-start gap-2">
          <ShieldAlert size={16} className="mt-0.5" />
          Sessions cannot start for unassigned subjects. Create at least one teacher and assign them to each subject.
        </div>
      )}
    </div>
  );
};

export default AdminControlsPage;
