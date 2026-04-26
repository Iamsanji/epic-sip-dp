import React, { useEffect, useMemo, useState } from "react";
import { QRCode } from "react-qr-code";
import { jsPDF } from "jspdf";
import {
  Download,
  QrCode,
  User,
  CalendarCheck2,
  Clock3,
  UserX,
  GraduationCap,
  Award,
  TrendingUp,
  AlertCircle,
  ImagePlus,
  BookOpen,
  FileDown,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  getAttendanceLogs,
  parseScheduleDays,
  getStudentById,
  getSubjects,
  updateStudentProfileImage,
} from "../utils/localStorageUtils";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getTimeRangeFromSchedule = (schedule) => {
  const text = String(schedule || "").trim();
  const match = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  return match ? match[1] : "Time not set";
};

const StudentProfilePage = ({ currentUser }) => {
  const studentId = String(currentUser?.id || currentUser?.studentId || currentUser?.username || "").trim();
  const [student, setStudent] = useState(() => getStudentById(studentId));
  const [logs, setLogs] = useState(() => getAttendanceLogs());
  const [subjects, setSubjects] = useState(() => getSubjects());
  const [notice, setNotice] = useState({ text: "", type: "" });

  useEffect(() => {
    const sync = () => {
      setStudent(getStudentById(studentId));
      setLogs(getAttendanceLogs());
      setSubjects(getSubjects());
    };

    sync();
    window.addEventListener("attendance:data-changed", sync);
    return () => window.removeEventListener("attendance:data-changed", sync);
  }, [studentId]);

  useEffect(() => {
    if (!notice.text) return;
    const timer = setTimeout(() => setNotice({ text: "", type: "" }), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const myLogs = useMemo(() => {
    if (!student) return [];
    return logs.filter((log) => log.studentId === student.id);
  }, [logs, student]);

  const enrolledSubjects = useMemo(() => {
    if (!student) return [];
    return subjects.filter((subject) => subject.studentIds?.includes(student.id));
  }, [subjects, student]);

  const weeklySchedule = useMemo(() => {
    const scheduleMap = WEEK_DAYS.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {});

    enrolledSubjects.forEach((subject) => {
      const days = parseScheduleDays(subject.schedule);
      const timeRange = getTimeRangeFromSchedule(subject.schedule);

      if (days.length === 0) {
        return;
      }

      days.forEach((day) => {
        scheduleMap[day].push({
          code: subject.code,
          title: subject.title,
          teacherName: subject.teacherName || "Unassigned",
          schedule: subject.schedule || "",
          timeRange,
        });
      });
    });

    return scheduleMap;
  }, [enrolledSubjects]);

  const present = myLogs.filter((log) => log.status === "present").length;
  const late = myLogs.filter((log) => log.status === "late").length;
  const absent = myLogs.filter((log) => log.status === "absent").length;
  const attended = present + late;
  const attendanceRate = myLogs.length > 0 ? ((attended / myLogs.length) * 100).toFixed(1) : "0.0";

  const subjectBreakdown = useMemo(() => {
    const breakdown = new Map();

    myLogs.forEach((log) => {
      const key = log.subjectCode || log.subjectTitle || "General";
      const current = breakdown.get(key) || {
        subjectCode: key,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
      };

      current.total += 1;
      current.present += log.status === "present" ? 1 : 0;
      current.late += log.status === "late" ? 1 : 0;
      current.absent += log.status === "absent" ? 1 : 0;
      breakdown.set(key, current);
    });

    return [...breakdown.values()].sort((a, b) => b.total - a.total);
  }, [myLogs]);

  const downloadQR = () => {
    try {
      const svg = document.getElementById("studentProfileQR");
      if (!svg) return;

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
        
        ctx.font = "500 12px Inter, system-ui";
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "center";
        ctx.fillText("WMSU Attendance System", canvas.width / 2, canvas.height - 15);
        
        const png = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = png;
        link.download = `WMSU-${student?.id || "QR"}.png`;
        link.click();
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error("QR download error:", error);
    }
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !student) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice({ text: "Please upload a valid image file.", type: "error" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotice({ text: "Image is too large. Maximum file size is 2MB.", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const nextStudent = updateStudentProfileImage(student.id, String(reader.result || ""));
        setStudent(nextStudent);
        setNotice({ text: "Profile picture updated.", type: "success" });
      } catch {
        setNotice({ text: "Failed to update profile picture.", type: "error" });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeProfileImage = () => {
    if (!student) {
      return;
    }

    try {
      const nextStudent = updateStudentProfileImage(student.id, "");
      setStudent(nextStudent);
      setNotice({ text: "Profile picture removed.", type: "success" });
    } catch {
      setNotice({ text: "Failed to remove profile picture.", type: "error" });
    }
  };

  const downloadSchedulePdf = () => {
  if (!student) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  // Add header design
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 120, "F");
  
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, pageWidth, 8, "F");
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("WMSU Attendance System", pageWidth / 2, 55, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Official Class Schedule Document", pageWidth / 2, 80, { align: "center" });
  
  y = 160;
  
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 100, 8, 8, "F");
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 100, 8, 8, "S");
  
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(margin + 1, y + 1, pageWidth - (margin * 2) - 2, 30, 6, 6, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Student Information", margin + 15, y + 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  
  doc.text(`Name: ${student.name}`, margin + 15, y + 55);
  doc.text(`Student ID: ${student.id}`, margin + 15, y + 75);
  doc.text(`Course: ${student.course}${student.year ? ` - Year ${student.year}` : ""}${student.section ? ` Section ${student.section}` : ""}`, margin + 15, y + 95);
  
  y += 100;
  
  y += 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.text("Weekly Class Schedule", margin, y);
  
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text("Generated on: " + new Date().toLocaleDateString(), margin, y);  
  y += 30;
  
  const drawDayCard = (day, entries, startY, isEven) => {
    const cardWidth = (pageWidth - (margin * 2) - 20) / 2;
    const cardX = isEven ? margin : margin + cardWidth + 20;
    let currentY = startY;
    
    if (currentY + 120 > pageHeight - margin) {
      doc.addPage();
      currentY = margin + 20;
      
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageWidth, 50, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("WMSU Class Schedule (Continued)", pageWidth / 2, 30, { align: "center" });
      currentY = margin + 40;
    }
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(cardX, currentY, cardWidth, 110, 6, 6, "F");
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, currentY, cardWidth, 110, 6, 6, "S");
    
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(cardX + 1, currentY + 1, cardWidth - 2, 28, 4, 4, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(day, cardX + (cardWidth / 2), currentY + 20, { align: "center" });
    
    let contentY = currentY + 45;
    
    if (entries.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("No classes scheduled", cardX + (cardWidth / 2), contentY, { align: "center" });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      
      entries.slice(0, 3).forEach((item, idx) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(item.code, cardX + 10, contentY);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        let title = item.title.length > 25 ? item.title.substring(0, 22) + "..." : item.title;
        doc.text(title, cardX + 10, contentY + 14);
        
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(item.timeRange, cardX + 10, contentY + 28);
        
        contentY += 32;
        doc.setFontSize(9);
        
        if (idx === 2 && entries.length > 3) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(156, 163, 175);
          doc.text(`+${entries.length - 3} more subjects`, cardX + 10, contentY);
        }
      });
    }
    
    return currentY + 120;
  };
  
  let scheduleY = y;
  for (let i = 0; i < WEEK_DAYS.length; i += 2) {
    const leftDay = WEEK_DAYS[i];
    const rightDay = WEEK_DAYS[i + 1];
    const leftEntries = weeklySchedule[leftDay] || [];
    const rightEntries = rightDay ? (weeklySchedule[rightDay] || []) : [];
    
    scheduleY = drawDayCard(leftDay, leftEntries, scheduleY, true);
    
    if (rightDay) {
      drawDayCard(rightDay, rightEntries, scheduleY - 120, false);
    }
    
    scheduleY += 10;
    
    if (scheduleY > pageHeight - 80) {
      scheduleY = margin + 20;
    }
  }
  
  doc.addPage();
  
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 80, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("Attendance Summary", pageWidth / 2, 40, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Complete attendance report for the current semester", pageWidth / 2, 62, { align: "center" });
  
  let summaryY = 120;
  
  const stats = [
    { label: "Present Days", value: present, color: [34, 197, 94] },
    { label: "Late Days", value: late, color: [234, 179, 8] },
    { label: "Absent Days", value: absent, color: [239, 68, 68] },
  ];
  
  const cardWidth = (pageWidth - (margin * 2) - 40) / 3;
  
  stats.forEach((stat, idx) => {
    const cardX = margin + (idx * (cardWidth + 20));
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(cardX, summaryY, cardWidth, 100, 8, 8, "F");
    doc.setDrawColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.setLineWidth(1);
    doc.roundedRect(cardX, summaryY, cardWidth, 100, 8, 8, "S");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.text(stat.value.toString(), cardX + (cardWidth / 2), summaryY + 45, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(stat.label, cardX + (cardWidth / 2), summaryY + 70, { align: "center" });
  });
  
  summaryY += 140;
  
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(margin, summaryY, pageWidth - (margin * 2), 80, 8, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Overall Attendance Rate", margin + 20, summaryY + 30);
  
  doc.setFontSize(36);
  doc.text(`${attendanceRate}%`, margin + 20, summaryY + 65);
  
  const barWidth = 200;
  const barHeight = 12;
  const barX = pageWidth - margin - barWidth - 20;
  const barY = summaryY + 35;
  
  doc.setFillColor(255, 255, 255, 0.3);
  doc.roundedRect(barX, barY, barWidth, barHeight, 6, 6, "F");
  
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(barX, barY, (barWidth * parseFloat(attendanceRate)) / 100, barHeight, 6, 6, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${attended} of ${myLogs.length} sessions attended`, barX, barY - 8);
  
  summaryY += 110;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(220, 38, 38);
  doc.text("Subject-wise Performance", margin, summaryY);
  
  summaryY += 25;
  
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, summaryY, pageWidth - (margin * 2), 28, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  
  const colWidths = [150, 80, 70, 70, 110];
  let x = margin;
  
  doc.text("Subject", x + 10, summaryY + 18);
  x += colWidths[0];
  doc.text("Present", x + 10, summaryY + 18);
  x += colWidths[1];
  doc.text("Late", x + 10, summaryY + 18);
  x += colWidths[2];
  doc.text("Absent", x + 10, summaryY + 18);
  x += colWidths[3];
  doc.text("Rate", x + 10, summaryY + 18);
  
  summaryY += 28;
  
  subjectBreakdown.forEach((row, idx) => {
    const rate = row.total > 0 ? (((row.present + row.late) / row.total) * 100).toFixed(1) : "0.0";
    const fillColor = idx % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
    
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(margin, summaryY, pageWidth - (margin * 2), 28, "F");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    
    x = margin;
    doc.text(row.subjectCode, x + 10, summaryY + 18);
    x += colWidths[0];
    doc.setTextColor(34, 197, 94);
    doc.text(row.present.toString(), x + 10, summaryY + 18);
    x += colWidths[1];
    doc.setTextColor(234, 179, 8);
    doc.text(row.late.toString(), x + 10, summaryY + 18);
    x += colWidths[2];
    doc.setTextColor(239, 68, 68);
    doc.text(row.absent.toString(), x + 10, summaryY + 18);
    x += colWidths[3];
    
    const rateColor = parseFloat(rate) >= 80 ? [34, 197, 94] : parseFloat(rate) >= 60 ? [234, 179, 8] : [239, 68, 68];
    doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${rate}%`, x + 10, summaryY + 18);
    
    summaryY += 28;
    
    if (summaryY > pageHeight - 60 && idx < subjectBreakdown.length - 1) {
      doc.addPage();
      summaryY = margin;
      
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, summaryY, pageWidth - (margin * 2), 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      
      x = margin;
      doc.text("Subject", x + 10, summaryY + 18);
      x += colWidths[0];
      doc.text("Present", x + 10, summaryY + 18);
      x += colWidths[1];
      doc.text("Late", x + 10, summaryY + 18);
      x += colWidths[2];
      doc.text("Absent", x + 10, summaryY + 18);
      x += colWidths[3];
      doc.text("Rate", x + 10, summaryY + 18);
      
      summaryY += 28;
    }
  });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      "WMSU Attendance System • Official Document • Generated on " + new Date().toLocaleString(),
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
  
  doc.save(`WMSU-Schedule-${student.id}.pdf`);
  };

  if (!student) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Student Record Found</h3>
          <p className="text-gray-500">Please ask an admin to register your student ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student <span className="text-red-600">Dashboard</span>
              </h1>
              <p className="text-gray-500 mt-1">Track your attendance and academic progress</p>
            </div>
          </div>
        </div>

        {/* Notice */}
        {notice.text && (
          <div className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            notice.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {notice.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {notice.text}
          </div>
        )}

        {/* QR Code - Prominent at the top */}
        <div className="mb-8 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-2">
                <QrCode size={24} />
                <h2 className="text-xl font-bold">Your Attendance QR Code</h2>
              </div>
              <p className="text-red-100 text-sm mb-4">
                Show this QR code to your teacher for attendance scanning
              </p>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-xs text-red-100">Student ID</p>
                  <p className="font-mono text-sm font-bold">{student.id}</p>
                </div>
                <button
                  onClick={downloadQR}
                  className="bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-md"
                >
                  <Download size={14} /> Download QR
                </button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <div className="relative">
                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow">
                  WMSU
                </div>
                <QRCode id="studentProfileQR" value={student.id} size={140} level="H" fgColor="#dc2626" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <User size={18} />
                  Profile Information
                </h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    {student.profileImage ? (
                      <img
                        src={student.profileImage}
                        alt="Student profile"
                        className="w-28 h-28 rounded-2xl object-cover border-4 border-red-100 shadow-md"
                      />
                    ) : (
                      <div className="w-28 h-28 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center border-4 border-red-100 shadow-md">
                        <User size={40} className="text-red-600" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 cursor-pointer bg-red-600 rounded-full p-1.5 shadow-lg hover:bg-red-700 transition-colors">
                      <ImagePlus size={14} className="text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                    </label>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                  <p className="text-sm text-red-600 font-mono mt-1">{student.id}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {student.course}
                    </span>
                    {student.year && (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        Year {student.year}
                      </span>
                    )}
                    {student.section && (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        Sec {student.section}
                      </span>
                    )}
                  </div>
                  {student.profileImage && (
                    <button
                      onClick={removeProfileImage}
                      className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards - Horizontal Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-3 border border-green-100 text-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CalendarCheck2 size={16} className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{present}</p>
                <p className="text-[10px] font-semibold text-green-600">PRESENT</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-white rounded-xl p-3 border border-yellow-100 text-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Clock3 size={16} className="text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{late}</p>
                <p className="text-[10px] font-semibold text-yellow-600">LATE</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-3 border border-red-100 text-center">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <UserX size={16} className="text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{absent}</p>
                <p className="text-[10px] font-semibold text-red-600">ABSENT</p>
              </div>
            </div>

            {/* Attendance Rate Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Overall Attendance Rate</p>
                  <p className="text-2xl font-bold text-red-600">{attendanceRate}%</p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-red-600" />
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {attended} of {myLogs.length} sessions attended
              </p>
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enrolled Subjects */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-white" />
                    <h3 className="text-white font-semibold">Enrolled Subjects</h3>
                  </div>
                  <span className="text-xs font-medium bg-white/20 text-white px-2 py-1 rounded-full">
                    {enrolledSubjects.length} Subjects
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {enrolledSubjects.length === 0 ? (
                  <div className="text-center py-10">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No enrolled subjects yet</p>
                  </div>
                ) : (
                  enrolledSubjects.map((subject) => (
                    <div key={subject.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-red-600">{subject.code}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{subject.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {subject.schedule || "Schedule not set"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Teacher: {subject.teacherName || "Unassigned"}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck2 size={18} className="text-white" />
                    <h3 className="text-white font-semibold">Weekly Schedule</h3>
                  </div>
                  <button
                    onClick={downloadSchedulePdf}
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  >
                    <FileDown size={14} /> Export PDF
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                {WEEK_DAYS.map((day) => {
                  const entries = weeklySchedule[day] || [];
                  return (
                    <div key={day} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
                        <p className="text-xs font-bold text-gray-700">{day}</p>
                      </div>
                      <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                        {entries.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">No classes scheduled</p>
                        ) : (
                          entries.map((item, index) => (
                            <div key={`${item.code}-${index}`} className="bg-red-50 rounded-lg p-1.5 border border-red-100">
                              <p className="text-xs font-bold text-red-700">{item.code}</p>
                              <p className="text-xs text-gray-700 truncate">{item.title}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                <Clock size={8} />
                                {item.timeRange}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Attendance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck2 size={18} className="text-white" />
                    <h3 className="text-white font-semibold">Recent Activity</h3>
                  </div>
                  <span className="text-xs font-medium bg-white/20 text-white px-2 py-1 rounded-full">
                    {myLogs.length} Records
                  </span>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {myLogs.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No attendance records yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {myLogs.slice(0, 15).map((log) => (
                      <div key={log.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{log.subjectCode || "General"}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {log.date} • {log.time}
                            </p>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            log.status === "present"
                              ? "bg-green-100 text-green-700"
                              : log.status === "late"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}>
                            {log.status === "present" && <CheckCircle size={10} />}
                            {log.status === "late" && <Clock size={10} />}
                            {log.status === "absent" && <XCircle size={10} />}
                            {log.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subject Performance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-white" />
                  <h3 className="text-white font-semibold">Subject Performance</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {subjectBreakdown.length === 0 ? (
                  <div className="text-center py-6">
                    <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No subject data available</p>
                  </div>
                ) : (
                  subjectBreakdown.map((row) => {
                    const rate = row.total > 0 ? (((row.present + row.late) / row.total) * 100).toFixed(1) : "0.0";
                    const rateColor = parseFloat(rate) >= 80 ? "green" : parseFloat(rate) >= 60 ? "yellow" : "red";
                    return (
                      <div key={row.subjectCode} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{row.subjectCode}</p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                                <CheckCircle size={8} /> {row.present}
                              </span>
                              <span className="text-[10px] text-yellow-600 flex items-center gap-0.5">
                                <Clock size={8} /> {row.late}
                              </span>
                              <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                                <XCircle size={8} /> {row.absent}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">{rate}%</p>
                            <p className="text-[9px] text-gray-400">{row.total} sessions</p>
                          </div>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              rateColor === "green" ? "bg-green-500" : rateColor === "yellow" ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;