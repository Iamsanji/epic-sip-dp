// Utility functions for LocalStorage management

const STORAGE_KEYS = {
  students: 'students',
  attendanceLogs: 'attendance_logs',
  legacyAttendanceLogs: 'attendanceLogs',
  settings: 'settings',
};

const notifyDataChanged = () => {
  window.dispatchEvent(new Event('attendance:data-changed'));
};

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const pad = (value) => String(value).padStart(2, '0');

export const getLocalDateISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const normalizeStudent = (student) => ({
  id: String(student?.id ?? '').trim(),
  name: String(student?.name ?? '').trim(),
  course: String(student?.course ?? '').trim(),
  year: String(student?.year ?? '').trim(),
  section: String(student?.section ?? '').trim(),
});

const normalizeAttendanceLog = (log) => {
  const dateObj = log?.timestamp ? new Date(log.timestamp) : new Date();
  const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const dateISO = String(log?.dateISO || '').trim() || getLocalDateISO(safeDate);
  const status = String(log?.status || 'present').toLowerCase();

  return {
    id: String(log?.id || `${String(log?.studentId || '').trim()}-${dateISO}`).trim(),
    studentId: String(log?.studentId || log?.id || '').trim(),
    studentName: String(log?.studentName || log?.student || '').trim(),
    course: String(log?.course || '').trim(),
    year: String(log?.year || '').trim(),
    section: String(log?.section || '').trim(),
    status: status === 'late' || status === 'absent' ? status : 'present',
    dateISO,
    date: String(log?.date || safeDate.toLocaleDateString()).trim(),
    time: String(
      log?.time ||
        safeDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
    ).trim(),
    timestamp: log?.timestamp || safeDate.toISOString(),
  };
};

export const getStudents = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.students), []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizeStudent)
    .filter((student) => student.id && student.name && student.course);
};

export const saveStudents = (students) => {
  const safeStudents = Array.isArray(students)
    ? students
        .map(normalizeStudent)
        .filter((student) => student.id && student.name && student.course)
    : [];

  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(safeStudents));
  notifyDataChanged();
};

export const getAttendanceLogs = () => {
  const current = safeParse(localStorage.getItem(STORAGE_KEYS.attendanceLogs), []);
  const legacy = safeParse(localStorage.getItem(STORAGE_KEYS.legacyAttendanceLogs), []);
  const rawLogs = Array.isArray(current) && current.length > 0 ? current : legacy;

  if (!Array.isArray(rawLogs)) {
    return [];
  }

  const normalized = rawLogs
    .map(normalizeAttendanceLog)
    .filter((log) => log.studentId && log.studentName);

  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(normalized));

  if (localStorage.getItem(STORAGE_KEYS.legacyAttendanceLogs)) {
    localStorage.removeItem(STORAGE_KEYS.legacyAttendanceLogs);
  }

  return normalized.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const saveAttendanceLogs = (logs) => {
  const safeLogs = Array.isArray(logs)
    ? logs
        .map(normalizeAttendanceLog)
        .filter((log) => log.studentId && log.studentName)
    : [];

  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(safeLogs));
  notifyDataChanged();
};

export const upsertTodayAttendanceLog = (incomingLog) => {
  const normalized = normalizeAttendanceLog(incomingLog);
  const allLogs = getAttendanceLogs();

  const index = allLogs.findIndex(
    (log) => log.studentId === normalized.studentId && log.dateISO === normalized.dateISO
  );

  let updatedLogs;
  let isUpdate = false;

  if (index >= 0) {
    updatedLogs = [...allLogs];
    updatedLogs[index] = {
      ...updatedLogs[index],
      ...normalized,
      id: updatedLogs[index].id || normalized.id,
    };
    isUpdate = true;
  } else {
    updatedLogs = [normalized, ...allLogs];
  }

  saveAttendanceLogs(updatedLogs);
  return { log: normalized, isUpdate };
};

export const deleteStudentAndAttendance = (studentId) => {
  const safeStudentId = String(studentId || '').trim();
  if (!safeStudentId) {
    return { removedStudent: false, removedLogsCount: 0 };
  }

  const students = getStudents();
  const logs = getAttendanceLogs();

  const nextStudents = students.filter((student) => student.id !== safeStudentId);
  const nextLogs = logs.filter((log) => log.studentId !== safeStudentId);

  const removedStudent = nextStudents.length !== students.length;
  const removedLogsCount = logs.length - nextLogs.length;

  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(nextStudents));
  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(nextLogs));
  notifyDataChanged();

  return { removedStudent, removedLogsCount };
};

export const updateStudentAndAttendance = (oldStudentId, updatedStudent) => {
  const safeOldId = String(oldStudentId || '').trim();
  const normalizedStudent = normalizeStudent(updatedStudent);

  if (!safeOldId || !normalizedStudent.id || !normalizedStudent.name || !normalizedStudent.course) {
    return { updatedStudent: false, updatedLogsCount: 0 };
  }

  const students = getStudents();
  const logs = getAttendanceLogs();

  const studentIndex = students.findIndex((student) => student.id === safeOldId);
  if (studentIndex < 0) {
    return { updatedStudent: false, updatedLogsCount: 0 };
  }

  const nextStudents = [...students];
  nextStudents[studentIndex] = normalizedStudent;

  let updatedLogsCount = 0;
  const nextLogs = logs.map((log) => {
    if (log.studentId !== safeOldId) {
      return log;
    }

    updatedLogsCount += 1;
    return {
      ...log,
      studentId: normalizedStudent.id,
      studentName: normalizedStudent.name,
      course: normalizedStudent.course,
      year: normalizedStudent.year,
      section: normalizedStudent.section,
      id: `${normalizedStudent.id}-${log.dateISO}`,
    };
  });

  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(nextStudents));
  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(nextLogs));
  notifyDataChanged();

  return { updatedStudent: true, updatedLogsCount };
};

export const getSettings = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.settings), {});
  return raw && typeof raw === 'object' ? raw : {};
};

export const saveSettings = (settings) => {
  const safeSettings = settings && typeof settings === 'object' ? settings : {};
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(safeSettings));
  notifyDataChanged();
};
