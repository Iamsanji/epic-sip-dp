// Utility functions for LocalStorage management

const STORAGE_KEYS = {
  students: 'students',
  attendanceLogs: 'attendance_logs',
  legacyAttendanceLogs: 'attendanceLogs',
  users: 'users',
  subjects: 'subjects',
  attendanceSessions: 'attendance_sessions',
  auditLogs: 'attendance_audit_logs',
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

const formatMinutesToClock = (minutes, baseDate = new Date()) => {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes)) {
    return '';
  }

  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = ((totalMinutes % 60) + 60) % 60;
  const dateValue = new Date(baseDate);
  dateValue.setHours(hours, mins, 0, 0);

  return dateValue.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseHourMinute = (hourText, minuteText, meridiem) => {
  const hour = Number(hourText);
  const minute = Number(minuteText || '0');

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }

    const normalizedHour = hour % 12;
    return meridiem === 'pm' ? normalizedHour * 60 + minute + 12 * 60 : normalizedHour * 60 + minute;
  }

  if (hour < 0 || hour > 23) {
    return null;
  }

  return hour * 60 + minute;
};

export const parseScheduleDurationMinutes = (scheduleText) => {
  const schedule = String(scheduleText || '').trim();
  if (!schedule) {
    return null;
  }

  const timeRangeMatch = schedule.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );

  if (!timeRangeMatch) {
    return null;
  }

  const [, startHourText, startMinuteText, rawStartMeridiem, endHourText, endMinuteText, rawEndMeridiem] =
    timeRangeMatch;
  const startMeridiem = (rawStartMeridiem || rawEndMeridiem || '').toLowerCase() || null;
  const endMeridiem = (rawEndMeridiem || rawStartMeridiem || '').toLowerCase() || null;

  const startMinutes = parseHourMinute(startHourText, startMinuteText, startMeridiem);
  const endMinutesBase = parseHourMinute(endHourText, endMinuteText, endMeridiem);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutesBase)) {
    return null;
  }

  let duration = endMinutesBase - startMinutes;
  if (duration <= 0) {
    duration += 24 * 60;
  }

  if (duration <= 0 || duration > 12 * 60) {
    return null;
  }

  return duration;
};

export const getSubjectSessionTimingRules = (scheduleText, preferredLateGraceMinutes = 15) => {
  const durationMinutes = parseScheduleDurationMinutes(scheduleText);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  const safePreferredLate = Number.isFinite(Number(preferredLateGraceMinutes))
    ? Math.max(0, Number(preferredLateGraceMinutes))
    : 15;
  const lateGraceMinutes = Math.min(durationMinutes - 1, Math.min(180, safePreferredLate));

  return {
    durationMinutes,
    lateGraceMinutes: Math.max(0, lateGraceMinutes),
    closeAfterMinutes: durationMinutes,
  };
};

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

export const getStudentById = (studentId) => {
  const safeStudentId = String(studentId || '').trim();
  if (!safeStudentId) {
    return null;
  }

  return getStudents().find((student) => student.id === safeStudentId) || null;
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
  lateCutoffTime: String(session?.lateCutoffTime || '').trim(),
  closeTime: String(session?.closeTime || '').trim(),
  startMinutes: Number.isFinite(Number(session?.startMinutes)) ? Number(session.startMinutes) : null,
  lateCutoffMinutes: Number.isFinite(Number(session?.lateCutoffMinutes)) ? Number(session.lateCutoffMinutes) : null,
  closeMinutes: Number.isFinite(Number(session?.closeMinutes)) ? Number(session.closeMinutes) : null,
  lateGraceMinutes: Number.isFinite(Number(session?.lateGraceMinutes)) ? Number(session.lateGraceMinutes) : 15,
  closeAfterMinutes: Number.isFinite(Number(session?.closeAfterMinutes)) ? Number(session.closeAfterMinutes) : 30,
  scheduleDurationMinutes: Number.isFinite(Number(session?.scheduleDurationMinutes))
    ? Number(session.scheduleDurationMinutes)
    : null,
  endTime: String(session?.endTime || '').trim(),
  status: String(session?.status || 'OPEN').trim().toUpperCase(),
});

const getSessionCloseTimestamp = (session) => {
  const closeMinutes = Number(session?.closeMinutes);
  const dateISO = String(session?.dateISO || '').trim();

  if (Number.isFinite(closeMinutes) && dateISO) {
    const sessionDate = new Date(`${dateISO}T00:00:00`);
    if (!Number.isNaN(sessionDate.getTime())) {
      return sessionDate.getTime() + closeMinutes * 60 * 1000;
    }
  }

  if (dateISO) {
    const sessionDate = new Date(`${dateISO}T23:59:59`);
    if (!Number.isNaN(sessionDate.getTime())) {
      return sessionDate.getTime();
    }
  }

  return null;
};

const applySessionAutoClose = (sessions, now = new Date()) => {
  const currentTime = now.getTime();
  let hasChanges = false;

  const nextSessions = sessions.map((session) => {
    if (session.status !== 'OPEN') {
      return session;
    }

    const closeTimestamp = getSessionCloseTimestamp(session);
    if (!Number.isFinite(closeTimestamp) || closeTimestamp >= currentTime) {
      return session;
    }

    hasChanges = true;
    return {
      ...session,
      status: 'CLOSED',
      endTime: session.endTime || session.closeTime || formatMinutesToClock(session.closeMinutes, now),
    };
  });

  return { nextSessions, hasChanges };
};

const normalizeAuditLog = (log) => ({
  id: String(log?.id || `audit-${Date.now()}`).trim(),
  timestamp: String(log?.timestamp || new Date().toISOString()).trim(),
  action: String(log?.action || '').trim(),
  entityType: String(log?.entityType || '').trim(),
  entityId: String(log?.entityId || '').trim(),
  actorId: String(log?.actorId || '').trim(),
  actorName: String(log?.actorName || '').trim(),
  details: String(log?.details || '').trim(),
});

export const getAuditLogs = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.auditLogs), []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizeAuditLog)
    .filter((log) => log.id && log.timestamp && log.action)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const addAuditLog = ({ action, entityType, entityId, actorId, actorName, details }) => {
  const logs = getAuditLogs();
  const next = normalizeAuditLog({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    actorId,
    actorName,
    details,
  });

  if (!next.action) {
    return null;
  }

  const capped = [next, ...logs].slice(0, 500);
  localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(capped));
  notifyDataChanged();
  return next;
};

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

export const createTeacherAccount = ({ name, username, password }, actor = null) => {
  const safeName = String(name || '').trim();
  const safeUsername = String(username || '').trim();
  const safePassword = String(password || '').trim();

  if (!safeName || !safeUsername || !safePassword) {
    throw new Error('Name, username, and password are required.');
  }

  const users = getUsers();
  const exists = users.some((user) => user.username.toLowerCase() === safeUsername.toLowerCase());
  if (exists) {
    throw new Error('Username already exists.');
  }

  const nextTeacher = normalizeUser({
    id: `teacher-${Date.now()}`,
    name: safeName,
    role: 'teacher',
    username: safeUsername,
    password: safePassword,
    studentId: '',
  });

  saveUsers([...users, nextTeacher]);

  addAuditLog({
    action: 'TEACHER_ACCOUNT_CREATED',
    entityType: 'user',
    entityId: nextTeacher.id,
    actorId: actor?.id || '',
    actorName: actor?.name || 'System',
    details: `Teacher account created for ${nextTeacher.name} (${nextTeacher.username}).`,
  });

  return nextTeacher;
};

export const updateTeacherAccount = (
  teacherId,
  { name, username, password },
  actor = null
) => {
  const safeTeacherId = String(teacherId || '').trim();
  if (!safeTeacherId) {
    throw new Error('Teacher ID is required.');
  }

  const users = getUsers();
  const index = users.findIndex((user) => user.id === safeTeacherId && user.role === 'teacher');
  if (index < 0) {
    throw new Error('Teacher account not found.');
  }

  const current = users[index];
  const nextName = String(name ?? current.name).trim();
  const nextUsername = String(username ?? current.username).trim();
  const nextPassword = String(password ?? current.password).trim();

  if (!nextName || !nextUsername || !nextPassword) {
    throw new Error('Name, username, and password are required.');
  }

  const usernameTaken = users.some(
    (user) => user.id !== safeTeacherId && user.username.toLowerCase() === nextUsername.toLowerCase()
  );

  if (usernameTaken) {
    throw new Error('Username already exists.');
  }

  const updated = normalizeUser({
    ...current,
    name: nextName,
    username: nextUsername,
    password: nextPassword,
  });

  const nextUsers = [...users];
  nextUsers[index] = updated;
  saveUsers(nextUsers);

  // Keep subject teacherName in sync when a teacher display name changes.
  const subjects = getSubjects();
  const nextSubjects = subjects.map((subject) =>
    subject.teacherId === updated.id ? { ...subject, teacherName: updated.name } : subject
  );
  localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(nextSubjects));

  addAuditLog({
    action: 'TEACHER_ACCOUNT_UPDATED',
    entityType: 'user',
    entityId: updated.id,
    actorId: actor?.id || '',
    actorName: actor?.name || 'System',
    details: `Teacher account updated for ${updated.name} (${updated.username}).`,
  });

  notifyDataChanged();
  return updated;
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

  notifyDataChanged();
};

export const reassignSubjectTeacher = (subjectId, teacherId, actor = null) => {
  const safeSubjectId = String(subjectId || '').trim();
  const safeTeacherId = String(teacherId || '').trim();

  if (!safeSubjectId || !safeTeacherId) {
    throw new Error('Subject and teacher are required.');
  }

  const subjects = getSubjects();
  const subjectIndex = subjects.findIndex((subject) => subject.id === safeSubjectId);
  if (subjectIndex < 0) {
    throw new Error('Subject not found.');
  }

  const teacher = getUsers().find((user) => user.id === safeTeacherId && user.role === 'teacher');
  if (!teacher) {
    throw new Error('Teacher account not found.');
  }

  const oldTeacherName = subjects[subjectIndex].teacherName || 'Unassigned';
  const nextSubjects = [...subjects];
  nextSubjects[subjectIndex] = {
    ...nextSubjects[subjectIndex],
    teacherId: teacher.id,
    teacherName: teacher.name,
  };

  saveSubjects(nextSubjects);

  addAuditLog({
    action: 'SUBJECT_TEACHER_REASSIGNED',
    entityType: 'subject',
    entityId: safeSubjectId,
    actorId: actor?.id || '',
    actorName: actor?.name || 'System',
    details: `${nextSubjects[subjectIndex].code} reassigned from ${oldTeacherName} to ${teacher.name}.`,
  });

  return nextSubjects[subjectIndex];
};

export const getAttendanceSessions = () => {
  const raw = safeParse(localStorage.getItem(STORAGE_KEYS.attendanceSessions), []);
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized = raw
    .map(normalizeSession)
    .filter((session) => session.id && session.subjectId);

  const { nextSessions, hasChanges } = applySessionAutoClose(normalized);
  if (hasChanges) {
    localStorage.setItem(STORAGE_KEYS.attendanceSessions, JSON.stringify(nextSessions));
  }

  return nextSessions.sort((a, b) => {
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
  const sessions = getAttendanceSessions();

  return sessions.find((session) => session.status === 'OPEN') || null;
};

export const getOpenAttendanceSessions = () => getAttendanceSessions().filter((session) => session.status === 'OPEN');

export const getActiveSessionForSubject = (subjectId) => {
  const safeSubjectId = String(subjectId || '').trim();
  if (!safeSubjectId) {
    return null;
  }

  return getOpenAttendanceSessions().find((session) => session.subjectId === safeSubjectId) || null;
};

export const startAttendanceSession = ({ subject, teacher, timing }) => {
  const sessions = getAttendanceSessions();
  const safeSubjectId = String(subject?.id || '').trim();

  if (!safeSubjectId) {
    throw new Error('Subject is required to start a session.');
  }

  const assignedTeacherId = String(subject?.teacherId || '').trim();
  if (!assignedTeacherId) {
    throw new Error('This subject has no assigned teacher. Assign one before starting a session.');
  }

  if (String(teacher?.role || '').toLowerCase() === 'teacher' && String(teacher?.id || '').trim() !== assignedTeacherId) {
    throw new Error('You can only start sessions for subjects assigned to your account.');
  }

  const lateGraceMinutes = Number.isFinite(Number(timing?.lateGraceMinutes))
    ? Math.max(0, Math.min(180, Number(timing.lateGraceMinutes)))
    : 15;
  const closeAfterMinutes = Number.isFinite(Number(timing?.closeAfterMinutes))
    ? Math.max(lateGraceMinutes, Math.min(360, Number(timing.closeAfterMinutes)))
    : Math.max(lateGraceMinutes, 30);

  const now = new Date();
  const startMinutes = now.getHours() * 60 + now.getMinutes();
  const lateCutoffMinutes = startMinutes + lateGraceMinutes;
  const closeMinutes = startMinutes + closeAfterMinutes;

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
    lateCutoffTime: formatMinutesToClock(lateCutoffMinutes, now),
    closeTime: formatMinutesToClock(closeMinutes, now),
    startMinutes,
    lateCutoffMinutes,
    closeMinutes,
    lateGraceMinutes,
    closeAfterMinutes,
    scheduleDurationMinutes: parseScheduleDurationMinutes(subject?.schedule),
    endTime: '',
    status: 'OPEN',
  });

  const nextSessions = sessions.map((item) =>
    item.status === 'OPEN' && item.subjectId === safeSubjectId
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

  const autoClosedCount = sessions.filter(
    (item) => item.status === 'OPEN' && item.subjectId === safeSubjectId
  ).length;

  nextSessions.unshift(session);
  localStorage.setItem(STORAGE_KEYS.attendanceSessions, JSON.stringify(nextSessions));
  addAuditLog({
    action: 'SESSION_STARTED',
    entityType: 'session',
    entityId: session.id,
    actorId: teacher?.id || '',
    actorName: teacher?.name || 'System',
    details: `Session started for ${session.subjectCode}. Present window starts immediately, late after ${session.lateCutoffTime}, closes at ${session.closeTime}. ${
      autoClosedCount > 0 ? `${autoClosedCount} previous open session(s) auto-closed.` : 'No previous open session.'
    }`,
  });
  notifyDataChanged();

  return session;
};

export const closeAttendanceSession = (sessionId, actor = null) => {
  const safeSessionId = String(sessionId || '').trim();
  const sessions = getAttendanceSessions();
  const now = new Date();

  const target = sessions.find((session) => session.id === safeSessionId);
  if (!target) {
    throw new Error('Session not found.');
  }

  if (String(actor?.role || '').toLowerCase() === 'teacher' && String(actor?.id || '').trim() !== String(target.teacherId || '').trim()) {
    throw new Error('You can only close sessions that were started for your assigned subject.');
  }

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

  addAuditLog({
    action: 'SESSION_CLOSED',
    entityType: 'session',
    entityId: safeSessionId,
    actorId: actor?.id || '',
    actorName: actor?.name || 'System',
    details: `Session closed for ${target.subjectCode}.`,
  });

  notifyDataChanged();
};
