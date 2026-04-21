import React, { useState, useEffect } from "react";
import { QRCode } from "react-qr-code";
import { getStudents, saveStudents } from "../utils/localStorageUtils";
import {
  UserPlus,
  CheckCircle2,
  Download,
  GraduationCap,
  AlertCircle,
  QrCode as QrIcon
} from "lucide-react";

const RegisterStudentPage = () => {
  const [form, setForm] = useState({
    id: "",
    name: "",
    course: "",
    year: "",
    section: "",
  });

  const [savedStudent, setSavedStudent] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Clear message after 3 seconds so it doesn't stay forever
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const registerStudent = (e) => {
    e.preventDefault(); // Prevent any default form behavior

    const normalizedForm = {
      id: String(form.id || "").trim(),
      name: String(form.name || "").trim(),
      course: String(form.course || "").trim(),
      year: String(form.year || "").trim(),
      section: String(form.section || "").trim(),
    };
    
    if (!normalizedForm.id || !normalizedForm.name || !normalizedForm.course) {
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

      const newStudent = { ...normalizedForm };
      saveStudents([...students, newStudent]);

      // IMPORTANT: Update state in this specific order
      setSavedStudent(newStudent);
      setMessage({ text: "Student registered successfully!", type: "success" });
      setForm({ id: "", name: "", course: "", year: "", section: "" });
      
    } catch (err) {
      console.error("Registration Error:", err);
      setMessage({ text: "System Error: Could not save data.", type: "error" });
    }
  };

  const qrValue = savedStudent?.id ? String(savedStudent.id).trim() : "";
  const hasValidQR = Boolean(qrValue);

  const downloadQR = () => {
    try {
      const svg = document.getElementById("studentQR");
      if (!svg) {
        alert("QR Code element not found. Please try again.");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = 300;
        canvas.height = 300;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 25, 25, 250, 250);
        
        const png = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = png;
        link.download = `Student-${savedStudent?.id || 'QR'}.png`;
        link.click();
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Download Error:", err);
      alert("Flash/Canvas error: Could not generate file.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-gray-900 dark:text-white">Register Student</h2>
        <p className="text-gray-500">Create a new student record and generate a unique QR ID.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Form */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="text-green-600" size={28} />
            <h3 className="text-xl font-bold dark:text-white">Student Details</h3>
          </div>

          <form onSubmit={registerStudent} className="space-y-4">
            {['id', 'name', 'course', 'year', 'section'].map((key) => (
              <div key={key}>
                <input
                  name={key}
                  value={form[key]}
                  onChange={handleChange}
                  placeholder={key.charAt(0).toUpperCase() + key.slice(1) + (key === 'id' ? ' Number' : '')}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
            ))}
            
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold p-4 rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              Register Student
            </button>

            {message.text && (
              <div className={`p-4 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-bold">{message.text}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Side: QR View */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 p-10 flex flex-col items-center justify-center min-h-[500px]">
          {savedStudent && hasValidQR ? (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <div className="bg-white p-6 rounded-3xl shadow-2xl mb-6">
                <QRCode
                  id="studentQR"
                  value={qrValue}
                  size={200}
                  level="H"
                />
              </div>
              <h4 className="text-2xl font-black text-gray-900 dark:text-white">{savedStudent.name}</h4>
              <p className="text-indigo-600 font-mono font-bold">{savedStudent.id}</p>
              <div className="flex items-center gap-2 text-gray-500 mt-2">
                <GraduationCap size={18} />
                <span>{savedStudent.course} {savedStudent.year}-{savedStudent.section}</span>
              </div>
              <button
                onClick={downloadQR}
                className="mt-8 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all"
              >
                <Download size={20} /> Download QR
              </button>
            </div>
          ) : (
            <div className="text-center opacity-30">
              <QrIcon size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-bold">Waiting for Registration</p>
              <p className="text-sm">The QR code will appear here after saving.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterStudentPage;