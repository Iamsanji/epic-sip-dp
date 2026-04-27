import React, { useState, useEffect } from "react";
import { getStudents, saveStudents } from "../utils/localStorageUtils";
import {
  UserPlus,
  CheckCircle2,
  GraduationCap,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  QrCode as QrIcon,
} from "lucide-react";

const RegisterStudentPage = ({ currentUser }) => {
  const [form, setForm] = useState({
    id: "",
    firstName: "",
    middleInitial: "",
    lastName: "",
    course: "",
    yearLevel: "",
    section: "",
  });

  const [savedStudent, setSavedStudent] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "middleInitial") {
      setForm({ ...form, middleInitial: value.replace(/\./g, "").slice(0, 2).toUpperCase() });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const buildDisplayName = (firstName, middleInitial, lastName) => {
    const safeFirstName = String(firstName || "").trim();
    const safeLastName = String(lastName || "").trim();
    const safeMiddleInitial = String(middleInitial || "")
      .trim()
      .replace(/\./g, "")
      .slice(0, 2)
      .toUpperCase();

    if (!safeFirstName || !safeLastName) {
      return "";
    }

    return [safeFirstName, safeMiddleInitial ? `${safeMiddleInitial}.` : "", safeLastName]
      .filter(Boolean)
      .join(" ");
  };

  const registerStudent = (e) => {
    e.preventDefault();

    const normalizedFirstName = String(form.firstName || "").trim();
    const normalizedLastName = String(form.lastName || "").trim();
    const normalizedMiddleInitial = String(form.middleInitial || "")
      .trim()
      .replace(/\./g, "")
      .slice(0, 2)
      .toUpperCase();
    const normalizedName = buildDisplayName(normalizedFirstName, normalizedMiddleInitial, normalizedLastName);

    const normalizedForm = {
      id: String(form.id || "").trim(),
      firstName: normalizedFirstName,
      middleInitial: normalizedMiddleInitial,
      lastName: normalizedLastName,
      name: normalizedName,
      course: String(form.course || "").trim(),
      year: String(form.yearLevel || "").trim(),
      section: String(form.section || "").trim(),
    };
    
    if (!normalizedForm.id || !normalizedForm.firstName || !normalizedForm.lastName || !normalizedForm.course) {
      setMessage({ text: "Please complete all required fields.", type: "error" });
      return;
    }

    try {
      const students = getStudents();
      const exists = students.find((s) => String(s?.id || "").trim() === normalizedForm.id);

      if (exists) {
        setMessage({ text: "Student ID already exists.", type: "error" });
        return;
      }

      const newStudent = { 
        ...normalizedForm,
        registeredAt: new Date().toISOString(),
        status: "active"
      };
      saveStudents([...students, newStudent]);

      setSavedStudent(newStudent);
      setMessage({ text: "Student registered successfully!", type: "success" });
      setForm({ 
        id: "", firstName: "", middleInitial: "", lastName: "", course: "", yearLevel: "", section: ""
      });
      
    } catch (err) {
      console.error("Registration Error:", err);
      setMessage({ text: "System Error: Could not save data.", type: "error" });
    }
  };

  const hasStudent = Boolean(savedStudent?.id);

  return (
    currentUser?.role !== "admin" ? (
      <div className="min-h-[60vh] bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-lg font-bold text-gray-900">Access Restricted</p>
          <p className="mt-1 text-sm text-gray-600">
            Only admins can register new students and generate their initial QR code.
          </p>
        </div>
      </div>
    ) : (
    <div className="min-h-full bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto w-full px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserPlus className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                Register <span className="text-red-600">Student</span>
              </h2>
              <p className="text-gray-500 mt-1">Create a student record. The QR code stores the student ID only</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-start">
          
          {/* Left Side: Form */}
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 sm:px-8 py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="text-white" size={24} />
                <h3 className="text-xl font-bold text-white">Student Information</h3>
              </div>
              <p className="text-red-100 text-sm mt-1">Fill in all required details</p>
            </div>

            <form onSubmit={registerStudent} className="p-5 sm:p-8 space-y-5">
              {/* Student ID */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  name="id"
                  value={form.id}
                  onChange={handleChange}
                  placeholder="e.g., 2024-0001"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Student Name
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First Name *"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                  <input
                    name="middleInitial"
                    value={form.middleInitial}
                    onChange={handleChange}
                    placeholder="M.I. (Optional, up to 2 letters)"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last Name *"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <input
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  placeholder="e.g., BS Information Technology"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
              </div>

              {/* Year Level and Section */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Year Level
                  </label>
                  <select
                    name="yearLevel"
                    value={form.yearLevel}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white"
                  >
                    <option value="">Select Year Level</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Section
                  </label>
                  <input
                    name="section"
                    value={form.section}
                    onChange={handleChange}
                    placeholder="e.g., A"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold p-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 mt-4"
              >
                <UserPlus className="inline mr-2" size={20} />
                Register Student
              </button>

              {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              )}
            </form>
          </div>

          {/* Right Side: Handoff */}
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden lg:sticky lg:top-24">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 sm:px-8 py-4">
              <div className="flex items-center gap-3">
                <QrIcon className="text-white" size={24} />
                <h3 className="text-xl font-bold text-white">Student Access</h3>
              </div>
              <p className="text-red-100 text-sm mt-1">QR access belongs to the student profile after login</p>
            </div>

            <div className="p-5 sm:p-8 min-h-[360px] sm:min-h-[500px] flex items-center justify-center">
              <div className="w-full max-w-md space-y-4">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-red-700">Recommended flow</p>
                      <p className="text-sm text-red-600 mt-1">
                        Register the student here, then let the student log in to their account and use QR from My Profile.
                      </p>
                    </div>
                  </div>
                </div>

                {hasStudent ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Last registered student</p>
                    <div className="mt-2">
                      <h4 className="text-lg font-black text-gray-900">{savedStudent.name}</h4>
                      <p className="text-sm font-mono text-red-600">{savedStudent.id}</p>
                      <p className="text-sm text-gray-600 mt-1">{savedStudent.course}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {savedStudent.year ? `Year ${savedStudent.year}` : ""}
                        {savedStudent.year && savedStudent.section ? " • " : ""}
                        {savedStudent.section ? `Section ${savedStudent.section}` : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8">
                    <QrIcon size={56} className="text-gray-300 mx-auto" />
                    <p className="text-lg font-bold text-gray-700 mt-4">No student selected</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Student QR code will be available from the student profile after login.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  );
};

export default RegisterStudentPage;