import React, { useEffect, useState } from "react";
import { Search, Trash2, Edit, Save, XCircle } from "lucide-react";
import {
  deleteStudentAndAttendance,
  getStudents,
  saveStudents,
  updateStudentAndAttendance,
} from "../utils/localStorageUtils";

const StudentsListPage = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    course: "",
    year: "",
    section: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });

  // Load from LocalStorage
  useEffect(() => {
    const syncStudents = () => setStudents(getStudents());
    syncStudents();
    window.addEventListener("attendance:data-changed", syncStudents);

    return () => {
      window.removeEventListener("attendance:data-changed", syncStudents);
    };
  }, []);

  // Save helper
  const saveToStorage = (data) => {
    saveStudents(data);
    setStudents(data);
  };

  // Delete student
  const deleteStudent = (id) => {
    const target = students.find((student) => student.id === id);
    const shouldDelete = window.confirm(
      `Delete ${target?.name || "this student"} and all related attendance logs?`
    );

    if (!shouldDelete) {
      return;
    }

    const result = deleteStudentAndAttendance(id);
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);

    if (editingId === id) {
      setEditingId(null);
    }

    if (result.removedStudent) {
      setMessage({
        type: "success",
        text: `Student deleted. Removed ${result.removedLogsCount} related attendance log(s).`,
      });
    } else {
      setMessage({ type: "error", text: "Student not found. Nothing was deleted." });
    }
  };

  // Start editing
  const startEdit = (student) => {
    setEditingId(student.id);
    setEditForm(student);
  };

  // Save edit
  const saveEdit = () => {
    const originalStudent = students.find((student) => student.id === editingId);
    const normalizedEdit = {
      ...editForm,
      id: String(editForm.id || "").trim(),
      name: String(editForm.name || "").trim(),
      course: String(editForm.course || "").trim(),
      year: String(editForm.year || "").trim(),
      section: String(editForm.section || "").trim(),
    };

    if (!normalizedEdit.id || !normalizedEdit.name || !normalizedEdit.course) {
      setMessage({ type: "error", text: "ID, Name, and Course are required." });
      return;
    }

    const duplicateId = students.some(
      (student) => student.id === normalizedEdit.id && student.id !== editingId
    );
    if (duplicateId) {
      setMessage({ type: "error", text: "Another student already uses this ID." });
      return;
    }

    const result = updateStudentAndAttendance(editingId, normalizedEdit);
    if (!result.updatedStudent) {
      setMessage({ type: "error", text: "Failed to update student record." });
      return;
    }

    const updated = students.map((s) =>
      s.id === editingId ? normalizedEdit : s
    );
    setStudents(updated);
    setEditingId(null);
    setMessage({
      type: "success",
      text: `Student updated. Synced ${result.updatedLogsCount} attendance log(s).`,
    });

    if (originalStudent?.id !== normalizedEdit.id) {
      setSearch((prev) => (prev === originalStudent?.id ? normalizedEdit.id : prev));
    }
  };

  // Filtered list
  const filtered = students.filter(
    (s) =>
      String(s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(s.id || "").includes(search)
  );

  useEffect(() => {
    if (!message.text) {
      return;
    }

    const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <h2 className="text-4xl font-extrabold mb-6 text-gray-900 dark:text-white">
        Students List
      </h2>

      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-6">
        <Search className="text-gray-500" />
        <input
          className="w-full p-3 rounded-xl border"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {message.text && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-left">Year</th>
              <th className="p-3 text-left">Section</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr key={student.id} className="border-t">
                  {/* ID */}
                  <td className="p-3">{student.id}</td>

                  {/* Name */}
                  <td className="p-3">
                    {editingId === student.id ? (
                      <input
                        className="border p-1 rounded"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    ) : (
                      student.name
                    )}
                  </td>

                  {/* Course */}
                  <td className="p-3">{student.course}</td>

                  {/* Year */}
                  <td className="p-3">{student.year}</td>

                  {/* Section */}
                  <td className="p-3">{student.section}</td>

                  {/* Actions */}
                  <td className="p-3 flex gap-2">
                    {editingId === student.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="text-green-600"
                        >
                          <Save />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500"
                        >
                          <XCircle />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(student)}
                          className="text-blue-600"
                        >
                          <Edit />
                        </button>
                        <button
                          onClick={() => deleteStudent(student.id)}
                          className="text-red-600"
                        >
                          <Trash2 />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentsListPage;
