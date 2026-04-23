import React, { useEffect, useState } from "react";
import { Search, Trash2, Edit, Save, XCircle, Users, Download, Filter, ChevronLeft, ChevronRight, GraduationCap, AlertCircle } from "lucide-react";
import {
  deleteStudentAndAttendance,
  getSubjects,
  getStudents,
  saveStudents,
  updateStudentAndAttendance,
} from "../utils/localStorageUtils";

const StudentsListPage = ({ currentUser }) => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [yearFilter, setYearFilter] = useState("");

  // Load from LocalStorage
  useEffect(() => {
    const syncStudents = () => {
      const allStudents = getStudents();

      if (currentUser?.role === "teacher") {
        const teacherSubjectIds = new Set(
          getSubjects()
            .filter((subject) => subject.teacherId === currentUser.id)
            .flatMap((subject) => subject.studentIds || [])
        );
        setStudents(allStudents.filter((student) => teacherSubjectIds.has(student.id)));
        return;
      }

      setStudents(allStudents);
    };

    syncStudents();
    window.addEventListener("attendance:data-changed", syncStudents);

    return () => {
      window.removeEventListener("attendance:data-changed", syncStudents);
    };
  }, [currentUser]);

  // Save helper
  const saveToStorage = (data) => {
    saveStudents(data);
    setStudents(data);
  };

  // Delete student
  const deleteStudent = (id) => {
    if (currentUser?.role !== "admin") {
      setMessage({ type: "error", text: "❌ Only admins can delete students." });
      return;
    }

    const target = students.find((student) => student.id === id);
    const shouldDelete = window.confirm(
      `⚠️ Delete ${target?.name || "this student"}?\n\nThis will also remove all associated attendance records. This action cannot be undone.`
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
        text: `✅ Student deleted. Removed ${result.removedLogsCount} attendance log(s).`,
      });
    } else {
      setMessage({ type: "error", text: "❌ Student not found. Nothing was deleted." });
    }
  };

  // Start editing
  const startEdit = (student) => {
    if (currentUser?.role !== "admin") {
      setMessage({ type: "error", text: "❌ Teachers can only view students under their subjects." });
      return;
    }

    setEditingId(student.id);
    setEditForm(student);
  };

  // Save edit
  const saveEdit = () => {
    if (currentUser?.role !== "admin") {
      setMessage({ type: "error", text: "❌ Only admins can update student records." });
      return;
    }

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
      setMessage({ type: "error", text: "❌ ID, Name, and Course are required." });
      return;
    }

    const duplicateId = students.some(
      (student) => student.id === normalizedEdit.id && student.id !== editingId
    );
    if (duplicateId) {
      setMessage({ type: "error", text: "❌ Another student already uses this ID." });
      return;
    }

    const result = updateStudentAndAttendance(editingId, normalizedEdit);
    if (!result.updatedStudent) {
      setMessage({ type: "error", text: "❌ Failed to update student record." });
      return;
    }

    const updated = students.map((s) =>
      s.id === editingId ? normalizedEdit : s
    );
    setStudents(updated);
    setEditingId(null);
    setMessage({
      type: "success",
      text: `✅ Student updated. Synced ${result.updatedLogsCount} attendance log(s).`,
    });

    if (originalStudent?.id !== normalizedEdit.id) {
      setSearch((prev) => (prev === originalStudent?.id ? normalizedEdit.id : prev));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Student ID", "Name", "Course", "Year Level", "Section"];
    const csvData = filtered.map(s => [
      s.id,
      s.name,
      s.course,
      s.year || "",
      s.section || ""
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wmsu_students_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    setMessage({ type: "success", text: "✅ Students list exported successfully!" });
  };

  // Filtered list
  const filtered = students.filter(
    (s) =>
      (String(s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(s.id || "").includes(search)) &&
      (yearFilter === "" || s.year === yearFilter)
  );

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, yearFilter]);

  useEffect(() => {
    if (!message.text) {
      return;
    }

    const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const yearLevels = ["", "1", "2", "3", "4"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Students <span className="text-red-600">List</span>
              </h2>
              <p className="text-gray-500 mt-1">
                {currentUser?.role === "admin"
                  ? "Manage and view all registered students"
                  : "View students enrolled in your assigned subjects"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Total Students</p>
                <p className="text-2xl font-black text-gray-900">{students.length}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Active Students</p>
                <p className="text-2xl font-black text-green-600">{students.filter(s => s.status !== 'inactive').length}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap size={20} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Courses</p>
                <p className="text-2xl font-black text-gray-900">{new Set(students.map(s => s.course)).size}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Filter size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Filtered</p>
                <p className="text-2xl font-black text-gray-900">{filtered.length}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Search size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                placeholder="Search by name or student ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white"
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
              <button
                onClick={exportToCSV}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? "✅" : "❌"}
            {message.text}
          </div>
        )}

        {/* Table / Cards */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                <tr>
                  <th className="p-4 text-left font-bold">Student ID</th>
                  <th className="p-4 text-left font-bold">Name</th>
                  <th className="p-4 text-left font-bold">Course</th>
                  <th className="p-4 text-left font-bold">Year</th>
                  <th className="p-4 text-left font-bold">Section</th>
                  <th className="p-4 text-center font-bold">{currentUser?.role === "admin" ? "Actions" : "Access"}</th>
                </tr>
              </thead>

              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-12">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No students found</p>
                      <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, index) => (
                    <tr key={student.id} className={`border-t border-gray-100 hover:bg-red-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="p-4 font-mono text-xs font-bold text-gray-700">
                        {editingId === student.id ? (
                          <input
                            className="border border-gray-300 p-1 rounded-md w-28 text-sm"
                            value={editForm.id}
                            onChange={(e) =>
                              setEditForm({ ...editForm, id: e.target.value })
                            }
                          />
                        ) : (
                          student.id
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {editingId === student.id ? (
                          <input
                            className="border border-gray-300 p-1 rounded-md w-40 text-sm"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                          />
                        ) : (
                          student.name
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {editingId === student.id ? (
                          <input
                            className="border border-gray-300 p-1 rounded-md w-32 text-sm"
                            value={editForm.course}
                            onChange={(e) =>
                              setEditForm({ ...editForm, course: e.target.value })
                            }
                          />
                        ) : (
                          student.course
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {editingId === student.id ? (
                          <select
                            className="border border-gray-300 p-1 rounded-md w-20 text-sm"
                            value={editForm.year}
                            onChange={(e) =>
                              setEditForm({ ...editForm, year: e.target.value })
                            }
                          >
                            <option value="">Select</option>
                            <option value="1">1st</option>
                            <option value="2">2nd</option>
                            <option value="3">3rd</option>
                            <option value="4">4th</option>
                          </select>
                        ) : (
                          student.year ? `${student.year}${getOrdinalSuffix(student.year)} Year` : "-"
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {editingId === student.id ? (
                          <input
                            className="border border-gray-300 p-1 rounded-md w-16 text-sm"
                            value={editForm.section}
                            onChange={(e) =>
                              setEditForm({ ...editForm, section: e.target.value })
                            }
                          />
                        ) : (
                          student.section || "-"
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {currentUser?.role !== "admin" ? (
                            <span className="text-xs font-semibold text-gray-400">Read only</span>
                          ) : editingId === student.id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all"
                                title="Save"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                                title="Cancel"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(student)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => deleteStudent(student.id)}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {paginatedStudents.length === 0 ? (
              <div className="text-center p-8">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 font-medium">No students found</p>
                <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              paginatedStudents.map((student) => (
                <div key={student.id} className="rounded-xl border border-gray-200 p-3 bg-white">
                  {editingId === student.id ? (
                    <div className="space-y-2">
                      <input
                        className="w-full border border-gray-300 p-2 rounded-md text-sm"
                        value={editForm.id}
                        onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                        placeholder="Student ID"
                      />
                      <input
                        className="w-full border border-gray-300 p-2 rounded-md text-sm"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Name"
                      />
                      <input
                        className="w-full border border-gray-300 p-2 rounded-md text-sm"
                        value={editForm.course}
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        placeholder="Course"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="w-full border border-gray-300 p-2 rounded-md text-sm"
                          value={editForm.year}
                          onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                        >
                          <option value="">Year</option>
                          <option value="1">1st</option>
                          <option value="2">2nd</option>
                          <option value="3">3rd</option>
                          <option value="4">4th</option>
                        </select>
                        <input
                          className="w-full border border-gray-300 p-2 rounded-md text-sm"
                          value={editForm.section}
                          onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                          placeholder="Section"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={saveEdit}
                          className="flex-1 p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all"
                        >
                          <Save size={16} className="mx-auto" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                        >
                          <XCircle size={16} className="mx-auto" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{student.name}</p>
                          <p className="text-xs font-mono text-gray-500 mt-0.5">{student.id}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>{student.year ? `${student.year}${getOrdinalSuffix(student.year)} Year` : 'No year'}</p>
                          <p>{student.section || 'No section'}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{student.course}</p>

                      <div className="mt-3 flex gap-2">
                        {currentUser?.role !== 'admin' ? (
                          <span className="text-xs font-semibold text-gray-400">Read only</span>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(student)}
                              className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all"
                            >
                              <Edit size={16} className="mx-auto" />
                            </button>
                            <button
                              onClick={() => deleteStudent(student.id)}
                              className="flex-1 p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                            >
                              <Trash2 size={16} className="mx-auto" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 gap-3">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} students
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg font-medium transition-all ${
                          currentPage === pageNum
                            ? "bg-red-600 text-white"
                            : "hover:bg-red-50 text-gray-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function for ordinal suffixes
const getOrdinalSuffix = (year) => {
  if (year === "1") return "st";
  if (year === "2") return "nd";
  if (year === "3") return "rd";
  return "th";
};

export default StudentsListPage;