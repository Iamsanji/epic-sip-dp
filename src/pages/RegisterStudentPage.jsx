import React, { useState, useEffect } from "react";
import { QRCode } from "react-qr-code";
import { getStudents, saveStudents } from "../utils/localStorageUtils";
import {
  UserPlus,
  CheckCircle2,
  Download,
  GraduationCap,
  AlertCircle,
  QrCode as QrIcon,
  Sparkles,
  Printer,
  Copy,
  Check
} from "lucide-react";

const RegisterStudentPage = ({ currentUser }) => {
  const [form, setForm] = useState({
    id: "",
    name: "",
    course: "",
    yearLevel: "",
    section: "",
  });

  const [savedStudent, setSavedStudent] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const registerStudent = (e) => {
    e.preventDefault();

    const normalizedForm = {
      id: String(form.id || "").trim(),
      name: String(form.name || "").trim(),
      course: String(form.course || "").trim(),
      year: String(form.yearLevel || "").trim(),
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

      const newStudent = { 
        ...normalizedForm,
        registeredAt: new Date().toISOString(),
        status: "active"
      };
      saveStudents([...students, newStudent]);

      setSavedStudent(newStudent);
      setMessage({ text: "Student registered successfully!", type: "success" });
      setForm({ 
        id: "", name: "", course: "", yearLevel: "", section: ""
      });
      
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
        canvas.width = 400;
        canvas.height = 400;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 300, 300);
        
        // Add watermark
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "center";
        ctx.fillText("WMSU Attendance System", canvas.width / 2, canvas.height - 10);
        
        const png = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = png;
        link.download = `WMSU-Student-${savedStudent?.id || 'QR'}.png`;
        link.click();
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Download Error:", err);
      alert("Error generating QR code. Please try again.");
    }
  };

  const copyStudentId = () => {
    if (savedStudent?.id) {
      navigator.clipboard.writeText(savedStudent.id);
      setCopied(true);
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>WMSU Student QR Code - ${savedStudent?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .qr-container { margin: 20px auto; }
            .student-info { margin-top: 20px; }
            .wmsu-header { color: #dc2626; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1 class="wmsu-header">WMSU Attendance System</h1>
          <div class="qr-container">${document.getElementById("studentQR").outerHTML}</div>
          <div class="student-info">
            <h2>${savedStudent?.name}</h2>
            <p>Student ID: ${savedStudent?.id}</p>
            <p>${savedStudent?.course} - Year ${savedStudent?.year || ""} Section ${savedStudent?.section || ""}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.print();
    printWindow.close();
  };

  return (
    currentUser?.role !== "admin" ? (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-lg font-bold text-gray-900">Access Restricted</p>
          <p className="mt-1 text-sm text-gray-600">
            Only admins can register new students and generate their initial QR code.
          </p>
        </div>
      </div>
    ) : (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
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

              {/* Full Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                />
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

          {/* Right Side: QR View */}
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden lg:sticky lg:top-24">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 sm:px-8 py-4">
              <div className="flex items-center gap-3">
                <QrIcon className="text-white" size={24} />
                <h3 className="text-xl font-bold text-white">Student QR Code</h3>
              </div>
              <p className="text-red-100 text-sm mt-1">Generate and download QR for attendance</p>
            </div>

            <div className="p-5 sm:p-8 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[500px]">
              {savedStudent && hasValidQR ? (
                <div className="flex flex-col items-center animate-in zoom-in duration-300 w-full">
                  {/* QR Code Container */}
                  <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-red-100 mb-6 relative">
                    <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                      WMSU
                    </div>
                    <QRCode
                      id="studentQR"
                      value={qrValue}
                      size={190}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#dc2626"
                    />
                  </div>
                  
                  {/* Student Info */}
                  <div className="text-center mb-6 w-full">
                    <h4 className="text-2xl font-black text-gray-900">{savedStudent.name}</h4>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <p className="text-red-600 font-mono font-bold text-lg">{savedStudent.id}</p>
                      <button
                        onClick={copyStudentId}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy ID"
                      >
                        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-400" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-600 mt-3 flex-wrap">
                      <GraduationCap size={16} />
                      <span className="font-medium">
                        {savedStudent.course}
                      </span>
                    </div>
                    <div className="text-gray-500 text-sm mt-1">
                      {savedStudent.year && `Year ${savedStudent.year}`} 
                      {savedStudent.year && savedStudent.section && " • "}
                      {savedStudent.section && `Section ${savedStudent.section}`}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={downloadQR}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02]"
                    >
                      <Download size={18} /> Download
                    </button>
                    <button
                      onClick={printQR}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                    >
                      <Printer size={18} /> Print
                    </button>
                  </div>
                  
                  <div className="mt-6 p-3 bg-red-50 rounded-xl text-center">
                    <p className="text-xs text-red-600">
                      <AlertCircle size={12} className="inline mr-1" />
                      This QR code is used for attendance scanning
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <QrIcon size={64} className="text-gray-300" />
                  </div>
                  <p className="text-lg font-bold text-gray-700">No QR Code Generated</p>
                  <p className="text-sm text-gray-400 mt-2">Fill in the form and register a student<br />to generate their unique QR code</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  );
};

export default RegisterStudentPage;