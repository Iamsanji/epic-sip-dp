import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Trash2, PlusCircle } from "lucide-react";
import {
  deleteSubject,
  getStudents,
  getSubjects,
  getUsers,
  saveSubjects,
} from "../utils/localStorageUtils";

const SubjectsPage = ({ currentUser }) => {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [form, setForm] = useState({
    code: "",
    title: "",
    teacherId: "",
    schedule: "",
    studentIds: [],
  });

  useEffect(() => {
    const sync = () => {
      setSubjects(getSubjects());
      setStudents(getStudents());
      setTeachers(getUsers().filter((user) => user.role === "teacher"));
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

  const toggleStudent = (studentId) => {
    setForm((prev) => {
      const exists = prev.studentIds.includes(studentId);
      return {
        ...prev,
        studentIds: exists
          ? prev.studentIds.filter((id) => id !== studentId)
          : [...prev.studentIds, studentId],
      };
    });
  };

  const createSubject = (e) => {
    e.preventDefault();

    const code = form.code.trim().toUpperCase();
    const title = form.title.trim();
    const teacher = teachers.find((item) => item.id === form.teacherId);

    if (!code || !title || !teacher) {
      setMessage({ text: "Code, title, and teacher are required.", type: "error" });
      return;
    }

    const duplicate = subjects.some((subject) => subject.code === code);
    if (duplicate) {
      setMessage({ text: "Subject code already exists.", type: "error" });
      return;
    }

    const next = {
      id: `subject-${Date.now()}`,
      code,
      title,
      teacherId: teacher.id,
      teacherName: teacher.name,
      schedule: form.schedule.trim(),
      studentIds: form.studentIds,
    };

    saveSubjects([...subjects, next]);
    setForm({ code: "", title: "", teacherId: "", schedule: "", studentIds: [] });
    setMessage({ text: "Subject created successfully.", type: "success" });
  };

  const removeSubject = (subjectId) => {
    const target = subjects.find((subject) => subject.id === subjectId);
    const shouldDelete = window.confirm(`Delete subject ${target?.code || ""}?`);
    if (!shouldDelete) {
      return;
    }

    deleteSubject(subjectId);
    setMessage({ text: "Subject and related session/log data removed.", type: "success" });
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
      <div>
        <h2 className="text-4xl font-black text-gray-900 dark:text-white">Subjects</h2>
        <p className="text-gray-500">Create classes, assign teachers, and enroll students.</p>
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

      {(currentUser?.role === "admin" || currentUser?.role === "teacher") && (
        <form onSubmit={createSubject} className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-6 border">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="Subject code (e.g. CCS101)"
              className="w-full p-3 rounded-xl border"
            />
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Subject title"
              className="w-full p-3 rounded-xl border"
            />

            <select
              value={form.teacherId}
              onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
              className="w-full p-3 rounded-xl border"
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>

            <input
              value={form.schedule}
              onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
              placeholder="Schedule (optional)"
              className="w-full p-3 rounded-xl border"
            />
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-500 mb-2">Enroll Students</p>
            <div className="max-h-44 overflow-y-auto border rounded-xl p-3 grid sm:grid-cols-2 gap-2">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.studentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>{student.name} ({student.id})</span>
                </label>
              ))}
              {students.length === 0 && <p className="text-sm text-gray-400">No students yet.</p>}
            </div>
          </div>

          <button className="mt-4 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2">
            <PlusCircle size={18} /> Create Subject
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <BookOpen className="text-indigo-500" />
          <h3 className="font-bold text-lg dark:text-white">Subject List</h3>
        </div>

        <div className="divide-y">
          {visibleSubjects.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No subjects available.</p>
          ) : (
            visibleSubjects.map((subject) => (
              <div key={subject.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-gray-900 dark:text-white">{subject.code} - {subject.title}</p>
                  <p className="text-sm text-gray-500">Teacher: {subject.teacherName || "Unassigned"}</p>
                  <p className="text-sm text-gray-500">Students: {subject.studentIds.length}</p>
                  {subject.schedule && <p className="text-sm text-gray-500">Schedule: {subject.schedule}</p>}
                </div>

                {(currentUser?.role === "admin" || currentUser?.id === subject.teacherId) && (
                  <button onClick={() => removeSubject(subject.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectsPage;
