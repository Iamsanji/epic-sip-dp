import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Trash2, PlusCircle, Users, User, Calendar, Clock, Search, X, CheckCircle, AlertCircle, Pencil, Save } from "lucide-react";
import {
  deleteSubject,
  getStudents,
  parseScheduleDurationMinutes,
  getSubjects,
  getUsers,
  saveSubjects,
} from "../utils/localStorageUtils";

const SubjectsPage = ({ currentUser }) => {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState("");
  const [editingStudentIds, setEditingStudentIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
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
    if (!message.text) return;
    const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const visibleSubjects = useMemo(() => {
    let filtered = subjects;
    
    if (currentUser?.role === "teacher") {
      filtered = subjects.filter((subject) => subject.teacherId === currentUser.id);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(subject => 
        subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply teacher filter
    if (filterTeacher && currentUser?.role === "admin") {
      filtered = filtered.filter(subject => subject.teacherId === filterTeacher);
    }
    
    return filtered;
  }, [subjects, currentUser, searchTerm, filterTeacher]);

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

  const selectAllStudents = () => {
    if (form.studentIds.length === students.length) {
      setForm((prev) => ({ ...prev, studentIds: [] }));
    } else {
      setForm((prev) => ({ ...prev, studentIds: students.map(s => s.id) }));
    }
  };

  const createSubject = (e) => {
    e.preventDefault();

    if (currentUser?.role !== "admin") {
      setMessage({ text: "❌ Only admins can create subjects.", type: "error" });
      return;
    }

    const code = form.code.trim().toUpperCase();
    const title = form.title.trim();
    const schedule = form.schedule.trim();
    const teacher = teachers.find((item) => item.id === form.teacherId);
    const scheduleDurationMinutes = parseScheduleDurationMinutes(schedule);

    if (!code || !title || !teacher || !schedule) {
      setMessage({ text: "❌ Code, title, teacher, and schedule are required.", type: "error" });
      return;
    }

    if (!Number.isFinite(scheduleDurationMinutes) || scheduleDurationMinutes <= 0) {
      setMessage({
        text: "❌ Schedule must include a valid time range (example: Monday 7:00 - 10:00).",
        type: "error",
      });
      return;
    }

    const duplicate = subjects.some((subject) => subject.code === code);
    if (duplicate) {
      setMessage({ text: "❌ Subject code already exists.", type: "error" });
      return;
    }

    const next = {
      id: `subject-${Date.now()}`,
      code,
      title,
      teacherId: teacher.id,
      teacherName: teacher.name,
      schedule,
      studentIds: form.studentIds,
      createdAt: new Date().toISOString(),
    };

    saveSubjects([...subjects, next]);
    setForm({ code: "", title: "", teacherId: "", schedule: "", studentIds: [] });
    setShowForm(false);
    setMessage({ text: "✅ Subject created successfully.", type: "success" });
    window.dispatchEvent(new CustomEvent('attendance:data-changed'));
  };

  const removeSubject = (subjectId) => {
    if (currentUser?.role !== "admin") {
      setMessage({ text: "❌ Only admins can delete subjects.", type: "error" });
      return;
    }

    const target = subjects.find((subject) => subject.id === subjectId);
    const shouldDelete = window.confirm(
      `⚠️ Delete subject "${target?.code} - ${target?.title}"?\n\nThis will also remove all associated sessions and attendance logs. This action cannot be undone.`
    );
    if (!shouldDelete) return;

    deleteSubject(subjectId);
    setMessage({ text: "✅ Subject and related data removed successfully.", type: "success" });
    window.dispatchEvent(new CustomEvent('attendance:data-changed'));
  };

  const startEditEnrollment = (subject) => {
    if (currentUser?.role !== "admin") {
      setMessage({ text: "❌ Only admins can edit subject enrollments.", type: "error" });
      return;
    }

    setEditingSubjectId(subject.id);
    setEditingStudentIds(Array.isArray(subject.studentIds) ? [...subject.studentIds] : []);
  };

  const cancelEditEnrollment = () => {
    setEditingSubjectId("");
    setEditingStudentIds([]);
  };

  const toggleEditStudent = (studentId) => {
    setEditingStudentIds((prev) => {
      const exists = prev.includes(studentId);
      return exists ? prev.filter((id) => id !== studentId) : [...prev, studentId];
    });
  };

  const selectAllEditStudents = () => {
    if (editingStudentIds.length === students.length) {
      setEditingStudentIds([]);
      return;
    }

    setEditingStudentIds(students.map((student) => student.id));
  };

  const saveEnrollmentChanges = (subjectId) => {
    if (currentUser?.role !== "admin") {
      setMessage({ text: "❌ Only admins can edit subject enrollments.", type: "error" });
      return;
    }

    const subject = subjects.find((item) => item.id === subjectId);
    if (!subject) {
      setMessage({ text: "❌ Subject not found.", type: "error" });
      return;
    }

    const nextSubjects = subjects.map((item) =>
      item.id === subjectId ? { ...item, studentIds: [...new Set(editingStudentIds)] } : item
    );

    saveSubjects(nextSubjects);
    setEditingSubjectId("");
    setEditingStudentIds([]);
    setMessage({ text: `✅ Enrollment updated for ${subject.code}.`, type: "success" });
    window.dispatchEvent(new CustomEvent("attendance:data-changed"));
  };

  const totalStudents = visibleSubjects.reduce((sum, subject) => sum + subject.studentIds.length, 0);
  const uniqueTeachers = [...new Set(visibleSubjects.map(s => s.teacherId))].length;

  return (
    <div className="min-h-full bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Subjects <span className="text-red-600">Management</span>
              </h2>
              <p className="text-gray-500 mt-1">Create classes, assign teachers, and enroll students</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Total Subjects</p>
                <p className="text-2xl font-black text-red-600">{visibleSubjects.length}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Total Teachers</p>
                <p className="text-2xl font-black text-blue-600">{uniqueTeachers}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Enrolled Students</p>
                <p className="text-2xl font-black text-green-600">{totalStudents}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase">Avg. Class Size</p>
                <p className="text-2xl font-black text-purple-600">
                  {visibleSubjects.length > 0 ? Math.round(totalStudents / visibleSubjects.length) : 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
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
            {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by code or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm"
                  />
                </div>
                {currentUser?.role === "admin" && (
                  <select
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  >
                    <option value="">All Teachers</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {currentUser?.role === "admin" && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="w-full lg:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                  <PlusCircle size={18} />
                  {showForm ? "Cancel" : "Create Subject"}
                </button>
              )}
            </div>
          </div>

          {/* Create Subject Form */}
          {showForm && (
            <div className="border-t border-gray-100 p-6 bg-gradient-to-r from-red-50 to-white">
              <form onSubmit={createSubject}>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PlusCircle size={20} className="text-red-600" />
                  New Subject Details
                </h3>
                {teachers.length === 0 && (
                  <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                    No teacher accounts found. Create teacher accounts from Admin Controls before creating a subject.
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Subject Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="e.g., CCS101"
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Subject Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Introduction to Computing"
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Teacher <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.teacherId}
                      onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white"
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Schedule <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.schedule}
                      onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
                      placeholder="e.g., Monday 7:00 - 10:00"
                      required
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This time range is used to auto-close attendance sessions.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">Enroll Students</label>
                    {students.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAllStudents}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                      >
                        {form.studentIds.length === students.length ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 grid sm:grid-cols-2 gap-2 bg-gray-50">
                    {students.length > 0 ? (
                      students.map((student) => (
                        <label key={student.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.studentIds.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-gray-700">{student.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{student.id}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 col-span-2 text-center py-4">
                        No students registered yet.
                      </p>
                    )}
                  </div>
                  {form.studentIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {form.studentIds.length} student(s) selected
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={teachers.length === 0}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02]"
                  >
                    Create Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Subjects List */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <BookOpen className="text-white" size={20} />
              <h3 className="text-lg font-bold text-white">Subject List</h3>
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white">
                {visibleSubjects.length} Subjects
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {visibleSubjects.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No subjects available</p>
                <p className="text-gray-300 text-sm mt-1">
                  {currentUser?.role === "admin" || currentUser?.role === "teacher"
                    ? "Click 'Create Subject' to get started"
                    : "No subjects assigned to you yet"}
                </p>
              </div>
            ) : (
              visibleSubjects.map((subject) => (
                <div key={subject.id} className="p-5 hover:bg-red-50/30 transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-black text-gray-900 text-lg">{subject.code}</h4>
                        <span className="text-gray-400">•</span>
                        <p className="text-gray-600 font-medium">{subject.title}</p>
                        {subject.schedule && (
                          <>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>{subject.schedule}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm mt-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={14} className="text-blue-500" />
                          <span>Teacher: <span className="font-semibold">{subject.teacherName || "Unassigned"}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users size={14} className="text-green-500" />
                          <span>Enrolled: <span className="font-semibold">{subject.studentIds.length} students</span></span>
                        </div>
                      </div>
                      {subject.studentIds.length > 0 && editingSubjectId !== subject.id && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          <span className="text-xs text-gray-400">Enrolled IDs:</span>
                          {subject.studentIds.slice(0, 5).map(id => {
                            const student = students.find(s => s.id === id);
                            return (
                              <span key={id} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                {student?.name?.split(' ')[0] || id}
                              </span>
                            );
                          })}
                          {subject.studentIds.length > 5 && (
                            <span className="text-xs text-gray-400">+{subject.studentIds.length - 5} more</span>
                          )}
                        </div>
                      )}

                      {editingSubjectId === subject.id && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-white p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-gray-800">Edit Enrolled Students</p>
                            {students.length > 0 && (
                              <button
                                type="button"
                                onClick={selectAllEditStudents}
                                className="text-xs font-semibold text-red-600 hover:text-red-700"
                              >
                                {editingStudentIds.length === students.length ? "Deselect All" : "Select All"}
                              </button>
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 grid sm:grid-cols-2 gap-2 bg-gray-50">
                            {students.length === 0 ? (
                              <p className="text-sm text-gray-400 col-span-2 text-center py-4">No students registered yet.</p>
                            ) : (
                              students.map((student) => (
                                <label
                                  key={student.id}
                                  className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editingStudentIds.includes(student.id)}
                                    onChange={() => toggleEditStudent(student.id)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                  />
                                  <span className="text-gray-700">{student.name}</span>
                                  <span className="text-xs text-gray-400 ml-auto">{student.id}</span>
                                </label>
                              ))
                            )}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">{editingStudentIds.length} student(s) selected</p>
                        </div>
                      )}
                    </div>

                    {currentUser?.role === "admin" && (
                      <div className="flex items-center gap-2 self-start">
                        {editingSubjectId === subject.id ? (
                          <>
                            <button
                              onClick={() => saveEnrollmentChanges(subject.id)}
                              className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all transform hover:scale-105"
                              title="Save Enrollment"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={cancelEditEnrollment}
                              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all transform hover:scale-105"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditEnrollment(subject)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all transform hover:scale-105"
                            title="Edit Enrolled Students"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => removeSubject(subject.id)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all transform hover:scale-105"
                          title="Delete Subject"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary Footer */}
          {visibleSubjects.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between text-sm gap-2">
                <span className="text-gray-500">Total Subjects: <span className="font-bold text-gray-900">{visibleSubjects.length}</span></span>
                <span className="text-gray-500">Total Enrollments: <span className="font-bold text-gray-900">{totalStudents}</span></span>
                <span className="text-gray-500">Active Teachers: <span className="font-bold text-gray-900">{uniqueTeachers}</span></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectsPage;