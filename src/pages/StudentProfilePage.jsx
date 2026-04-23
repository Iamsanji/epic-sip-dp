import React, { useMemo } from "react";
import { QRCode } from "react-qr-code";
import { Download, QrCode, User, CalendarCheck2, Clock3, UserX, GraduationCap, Award, TrendingUp, AlertCircle, ChevronRight } from "lucide-react";
import { getAttendanceLogs, getStudentById } from "../utils/localStorageUtils";

const StudentProfilePage = ({ currentUser }) => {
  const studentId = String(currentUser?.id || currentUser?.studentId || currentUser?.username || "").trim();
  const student = useMemo(() => getStudentById(studentId), [studentId]);
  const logs = getAttendanceLogs();

  const myLogs = useMemo(() => {
    if (!student) return [];
    return logs.filter((log) => log.studentId === student.id);
  }, [logs, student]);

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

  if (!student) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md text-center shadow-lg border border-red-100">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Student Record Found</h3>
          <p className="text-sm text-gray-500">Please ask an admin to register your student ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-6xl mx-auto w-full px-4 py-4 sm:py-5">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-md">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My <span className="text-red-600">Profile</span></h1>
            <p className="text-sm text-gray-500">View your attendance status and QR code</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          {/* Left Section */}
          <div className="space-y-5">
            {/* Student Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} className="text-red-600" />
                  <h3 className="font-semibold text-gray-900">Student Information</h3>
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <User size={22} className="text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{student.name}</h4>
                    <p className="text-red-600 font-mono text-xs mt-0.5">ID: {student.id}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {student.course}
                      </span>
                      {student.year && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          Year {student.year}
                        </span>
                      )}
                      {student.section && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          Sec {student.section}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 border border-green-100 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <CalendarCheck2 size={14} className="text-green-600" />
                  <span className="text-[10px] font-semibold text-green-600">PRESENT</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{present}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-yellow-100 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <Clock3 size={14} className="text-yellow-600" />
                  <span className="text-[10px] font-semibold text-yellow-600">LATE</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{late}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-red-100 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <UserX size={14} className="text-red-600" />
                  <span className="text-[10px] font-semibold text-red-600">ABSENT</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{absent}</p>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Attendance Rate</p>
                  <p className="text-2xl font-bold text-red-600">{attendanceRate}%</p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-red-600" />
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {attended} of {myLogs.length} sessions attended
              </p>
            </div>
          </div>

          {/* Right Section - QR Code */}
          <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden lg:sticky lg:top-20">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-red-600" />
                <h3 className="font-semibold text-gray-900">My QR Code</h3>
              </div>
            </div>
            <div className="p-5 flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-md border border-red-100 relative">
                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  WMSU
                </div>
                <QRCode id="studentProfileQR" value={student.id} size={160} level="H" fgColor="#dc2626" />
              </div>
              <p className="mt-3 text-xs text-gray-500 text-center font-mono">{student.id}</p>
              <button
                onClick={downloadQR}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Download size={14} /> Download QR
              </button>
            </div>
          </div>
        </div>

        {/* Recent Attendance Logs */}
        <div className="mt-5 bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck2 size={16} className="text-red-600" />
                <h3 className="font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full">
                {myLogs.length} total
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {myLogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No attendance records yet</p>
              </div>
            ) : (
              myLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="px-5 py-3 hover:bg-gray-50 transition-all">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{log.subjectCode || "General"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{log.date} • {log.time}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      log.status === "present"
                        ? "bg-green-100 text-green-700"
                        : log.status === "late"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Per-Subject Breakdown */}
        <div className="mt-5 bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-red-600" />
              <h3 className="font-semibold text-gray-900">Subject Performance</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {subjectBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No subject data available</p>
              </div>
            ) : (
              subjectBreakdown.map((row) => {
                const rate = row.total > 0 ? (((row.present + row.late) / row.total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={row.subjectCode} className="px-5 py-3 hover:bg-gray-50 transition-all">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{row.subjectCode}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-green-600">✓ {row.present}</span>
                          <span className="text-[10px] text-yellow-600">⏰ {row.late}</span>
                          <span className="text-[10px] text-red-600">✗ {row.absent}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-red-600">{rate}%</p>
                        <p className="text-[9px] text-gray-400">{row.total} logs</p>
                      </div>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          parseFloat(rate) >= 80 ? "bg-green-500" : parseFloat(rate) >= 60 ? "bg-yellow-500" : "bg-red-500"
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
  );
};

export default StudentProfilePage;