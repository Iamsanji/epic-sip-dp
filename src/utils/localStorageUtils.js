// Utility functions for LocalStorage management

const STORAGE_KEYS = {
  students: 'students',
  attendanceLogs: 'attendance_logs',
  legacyAttendanceLogs: 'attendanceLogs',
  users: 'users',
  subjects: 'subjects',
  attendanceSessions: 'attendance_sessions',
  activeSessionId: 'attendance_active_session_id',
  currentUser: 'attendance_current_user',
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
    subjectId: String(log?.subjectId || '').trim(),
    subjectCode: String(log?.subjectCode || '').trim(),
    subjectTitle: String(log?.subjectTitle || '').trim(),
    sessionId: String(log?.sessionId || '').trim(),
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

  const index = allLogs.findIndex((log) => {
    if (normalized.sessionId) {
      return log.studentId === normalized.studentId && log.sessionId === normalized.sessionId;
    }

    return log.studentId === normalized.studentId && log.dateISO === normalized.dateISO;
  });

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
  const users = getUsers();

  const nextStudents = students.filter((student) => student.id !== safeStudentId);
  const nextLogs = logs.filter((log) => log.studentId !== safeStudentId);
  const nextUsers = users.filter(
    (user) => !(user.role === 'student' && (user.studentId === safeStudentId || user.username === safeStudentId))
  );

  const removedStudent = nextStudents.length !== students.length;
  const removedLogsCount = logs.length - nextLogs.length;

  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(nextStudents));
  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(nextLogs));
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
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
  const users = getUsers();

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

  const nextUsers = users.map((user) => {
    if (user.role !== 'student') {
      return user;
    }

    const linkedById = user.studentId === safeOldId;
    const linkedByUsername = user.username === safeOldId;
    if (!linkedById && !linkedByUsername) {
      return user;
    }

    return {
      ...user,
      name: normalizedStudent.name,
      studentId: normalizedStudent.id,
      username: linkedByUsername ? normalizedStudent.id : user.username,
      password: linkedByUsername ? normalizedStudent.id : user.password,
    };
  });

  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(nextStudents));
  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(nextLogs));
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
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

const normalizeUser = (user) => ({
  id: String(user?.id || '').trim(),
  name: String(user?.name || '').trim(),
  role: String(user?.role || '').trim().toLowerCase(),
  username: String(user?.username || '').trim(),
  password: String(user?.password || '').trim(),
  studentId: String(user?.studentId || '').trim(),
});

const normalizeSubject = (subject) => ({
  id: String(subject?.id || '').trim(),
  code: String(subject?.code || '').trim().toUpperCase(),
  title: String(subject?.title || '').trim(),
  teacherId: String(subject?.teacherId || '').trim(),
  teacherName: String(subject?.teacherName || '').trim(),
  studentIds: Array.isArray(subject?.studentIds)
    ? [...new Set(subject.studentIds.map((id) => String(id || '').trim()).filter(Boolean))]
    : [],
  schedule: String(subject?.schedule || '').trim(),
});

const normalizeSession = (session) => ({
  id: String(session?.id || '').trim(),
  subjectId: String(session?.subjectId || '').trim(),
  subjectCode: String(session?.subjectCode || '').trim(),
  subjectTitle: String(session?.subjectTitle || '').trim(),
  teacherId: String(session?.teacherId || '').trim(),
  teacherName: String(session?.teacherName || '').trim(),
  dateISO: String(session?.dateISO || getLocalDateISO()).trim(),
  startTime: String(session?.startTime || '').trim(),
  endTime: String(session?.endTime || '').trim(),
  status: String(session?.status || 'OPEN').trim().toUpperCase(),
});

export const getUsers = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(normalizeUser).filter((user) => user.id && user.role && user.username);
};

export const saveUsers = (users) => {
  const safeUsers = Array.isArray(users)
    ? users
        .map(normalizeUser)
        .filter((user) => user.id && user.role && user.username)
    : [];

  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(safeUsers));
  notifyDataChanged();
};

export const seedDefaultUsers = () => {
  const existing = getUsers();
  if (existing.length > 0) {
    return existing;
  }

  const defaults = [
    {
      id: 'admin-001',
      name: 'System Admin',
      role: 'admin',
      username: 'admin',
      password: 'admin123',
      studentId: '',
    },
    {
      id: 'teacher-001',
      name: 'Teacher One',
      role: 'teacher',
      username: 'teacher',
      password: 'teacher123',
      studentId: '',
    },
    {
      id: 'student-001',
      name: 'Student User',
      role: 'student',
      username: 'student',
      password: 'student123',
      studentId: '',
    },
  ];

  saveUsers(defaults);
  return defaults;
};

export const getCurrentUser = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.currentUser), null);
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const normalized = normalizeUser(raw);
  return normalized.id ? normalized : null;
};

export const setCurrentUser = (user) => {
  const normalized = normalizeUser(user);
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(normalized));
  notifyDataChanged();
};

export const logoutCurrentUser = () => {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  notifyDataChanged();
};

export const authenticateUser = (username, password) => {
  const users = getUsers();
  const safeUsername = String(username || '').trim().toLowerCase();
  const safePassword = String(password || '').trim();

  const matched = users.find(
    (user) => user.username.toLowerCase() === safeUsername && user.password === safePassword
  );

  return matched || null;
};

export const getSubjects = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.subjects), []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(normalizeSubject).filter((subject) => subject.id && subject.code && subject.title);
};

export const saveSubjects = (subjects) => {
  const safeSubjects = Array.isArray(subjects)
    ? subjects
        .map(normalizeSubject)
        .filter((subject) => subject.id && subject.code && subject.title)
    : [];

  localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(safeSubjects));
  notifyDataChanged();
};

export const deleteSubject = (subjectId) => {
  const safeSubjectId = String(subjectId || '').trim();
  const subjects = getSubjects();
  const sessions = getAttendanceSessions();
  const logs = getAttendanceLogs();

  const nextSubjects = subjects.filter((subject) => subject.id !== safeSubjectId);
  const nextSessions = sessions.filter((session) => session.subjectId !== safeSubjectId);
  const nextLogs = logs.filter((log) => log.subjectId !== safeSubjectId);

  localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(nextSubjects));
  localStorage.setItem(STORAGE_KEYS.attendanceSessions, JSON.stringify(nextSessions));
  localStorage.setItem(STORAGE_KEYS.attendanceLogs, JSON.stringify(nextLogs));

  const activeSessionId = localStorage.getItem(STORAGE_KEYS.activeSessionId);
  if (activeSessionId) {
    const stillExists = nextSessions.some((session) => session.id === activeSessionId);
    if (!stillExists) {
      localStorage.removeItem(STORAGE_KEYS.activeSessionId);
    }
  }

  notifyDataChanged();
};

export const getAttendanceSessions = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.attendanceSessions), []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizeSession)
    .filter((session) => session.id && session.subjectId)
    .sort((a, b) => {
      const aTime = new Date(`${a.dateISO} ${a.startTime || '00:00:00'}`).getTime();
      const bTime = new Date(`${b.dateISO} ${b.startTime || '00:00:00'}`).getTime();
      return bTime - aTime;
    });
};

export const saveAttendanceSessions = (sessions) => {
  const safeSessions = Array.isArray(sessions)
    ? sessions
        .map(normalizeSession)
        .filter((session) => session.id && session.subjectId)
    : [];

  localStorage.setItem(STORAGE_KEYS.attendanceSessions, JSON.stringify(safeSessions));
  notifyDataChanged();
};

export const getActiveSession = () => {
  const activeSessionId = String(localStorage.getItem(STORAGE_KEYS.activeSessionId) || '').trim();
  if (!activeSessionId) {
    return null;
  }

  const sessions = getAttendanceSessions();
  const active = sessions.find((session) => session.id === activeSessionId && session.status === 'OPEN');
  return active || null;
};

export const startAttendanceSession = ({ subject, teacher }) => {
  const sessions = getAttendanceSessions();

  const now = new Date();
  const session = normalizeSession({
    id: `session-${Date.now()}`,
    subjectId: subject?.id,
    subjectCode: subject?.code,
    subjectTitle: subject?.title,
    teacherId: teacher?.id,
    teacherName: teacher?.name,
    dateISO: getLocalDateISO(now),
    startTime: now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    endTime: '',
    status: 'OPEN',
  });

  const nextSessions = sessions.map((item) =>
    item.status === 'OPEN'
      ? {
          ...item,
          status: 'CLOSED',
          endTime:
            item.endTime ||
            now.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
        }
      : item
  );

  nextSessions.unshift(session);
  localStorage.setItem(STORAGE_KEYS.attendanceSessions, JSON.stringify(nextSessions));
  localStorage.setItem(STORAGE_KEYS.activeSessionId, session.id);
  notifyDataChanged();

  return session;
};

export const closeAttendanceSession = (sessionId) => {
  const safeSessionId = String(sessionId || '').trim();
  const sessions = getAttendanceSessions();
  const now = new Date();

  const nextSessions = sessions.map((session) => {
    if (session.id !== safeSessionId) {
      return session;
    }

    return {
      ...session,
      status: 'CLOSED',
      endTime:
        session.endTime ||
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
    };
  });

  localStorage.setItem(STORAGE_KEYS.attendanceSessions, JSON.stringify(nextSessions));

  const activeSessionId = String(localStorage.getItem(STORAGE_KEYS.activeSessionId) || '').trim();
  if (activeSessionId === safeSessionId) {
    localStorage.removeItem(STORAGE_KEYS.activeSessionId);
  }

  notifyDataChanged();
};
