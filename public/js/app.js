const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '◫' },
  { id: 'departments', label: 'Departments', icon: '⌂' },
  { id: 'courses', label: 'Courses', icon: '▤' },
  { id: 'sections', label: 'Sections', icon: '▦' },
  { id: 'students', label: 'Students', icon: '♙' },
  { id: 'exams', label: 'Exams', icon: '▣' },
  { id: 'invigilators', label: 'Invigilators', icon: '♧' },
  { id: 'rooms', label: 'Rooms', icon: '⌑' },
  { id: 'time-slots', label: 'Time slots', icon: '◷' },
  { id: 'relationships', label: 'Enrollments', icon: '↗' },
  { id: 'schedule', label: 'Exam schedule', icon: '▧' }
];

const LABELS = {
  dept_name: 'Department',
  building: 'Building',
  course_id: 'Course ID',
  title: 'Course title',
  credits: 'Credits',
  sec_id: 'Section ID',
  semester: 'Semester',
  year: 'Year',
  student_id: 'Student ID',
  student_name: 'Student name',
  email: 'Email',
  exam_id: 'Exam ID',
  exam_date: 'Exam date',
  exam_time: 'Exam time',
  invigilator_id: 'Invigilator',
  invigilator_name: 'Invigilator name',
  contact: 'Contact',
  room_id: 'Room',
  room_number: 'Room number',
  capacity: 'Capacity',
  slot_id: 'Time slot',
  start_time: 'Start time',
  end_time: 'End time'
};

const FIELDS = {
  departments: [
    { name: 'dept_name', type: 'text', maxLength: 100 },
    { name: 'building', type: 'text', maxLength: 100 }
  ],
  courses: [
    { name: 'title', type: 'text', maxLength: 150 },
    { name: 'credits', type: 'number', min: 1 }
  ],
  sections: [
    { name: 'semester', type: 'text', maxLength: 20 },
    { name: 'year', type: 'number', min: 2000 },
    { name: 'dept_name', type: 'select', resource: 'departments', key: 'dept_name', display: 'dept_name' },
    { name: 'course_id', type: 'select', resource: 'courses', key: 'course_id', display: 'title' }
  ],
  students: [
    { name: 'student_name', type: 'text', maxLength: 120 },
    { name: 'email', type: 'email', maxLength: 254 }
  ],
  exams: [
    { name: 'exam_date', type: 'date' },
    { name: 'exam_time', type: 'time' },
    { name: 'invigilator_id', type: 'select', resource: 'invigilators', key: 'invigilator_id', display: 'invigilator_name' },
    { name: 'room_id', type: 'select', resource: 'rooms', key: 'room_id', display: 'room_number' },
    { name: 'slot_id', type: 'select', resource: 'time-slots', key: 'slot_id', display: 'start_time' }
  ],
  invigilators: [
    { name: 'invigilator_name', type: 'text', maxLength: 120 },
    { name: 'contact', type: 'text', maxLength: 40 }
  ],
  rooms: [
    { name: 'room_number', type: 'text', maxLength: 30 },
    { name: 'capacity', type: 'number', min: 1 }
  ],
  'time-slots': [
    { name: 'start_time', type: 'time' },
    { name: 'end_time', type: 'time' }
  ]
};

let activeView = 'overview';
let records = [];
let editingId = null;
let noticeTimer;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const displayTime = (value) => String(value || '').slice(0, 5);

function showNotice(message, isError = false) {
  const notice = $('#notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 4500);
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}

function setView(view) {
  activeView = view;
  $('#dashboard-view').hidden = view !== 'overview';
  $('#records-view').hidden = !FIELDS[view];
  $('#relationships-view').hidden = view !== 'relationships';
  $('#schedule-view').hidden = view !== 'schedule';
  $('#page-title').textContent = NAV_ITEMS.find((item) => item.id === view)?.label || 'Overview';
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  if (FIELDS[view]) loadRecords();
  if (view === 'overview') loadDashboard();
  if (view === 'relationships') loadRelationshipOptions();
  if (view === 'schedule') loadSchedule();
}

function renderNavigation() {
  $('#main-nav').innerHTML = NAV_ITEMS.map((item) =>
    `<button class="nav-item${item.id === activeView ? ' active' : ''}" data-view="${item.id}">
      <span class="nav-icon">${item.icon}</span><span>${item.label}</span></button>`
  ).join('');
  $('#main-nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (button) setView(button.dataset.view);
  });
}

async function loadRecords() {
  $('#records-title').textContent = NAV_ITEMS.find((item) => item.id === activeView)?.label || activeView;
  $('#table-body').innerHTML = '<tr><td class="loading" colspan="10">Loading records…</td></tr>';
  try {
    records = await api(`/${activeView}${$('#search-input').value ? `?search=${encodeURIComponent($('#search-input').value)}` : ''}`);
    renderTable();
  } catch (error) {
    $('#table-body').innerHTML = `<tr><td class="loading" colspan="10">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderTable() {
  const fields = FIELDS[activeView];
  const columns = fields.map((field) => field.name);
  $('#table-head').innerHTML = `<tr>${columns.map((name) => `<th>${escapeHtml(LABELS[name] || name)}</th>`).join('')}<th>Actions</th></tr>`;
  $('#record-count').textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
  $('#empty-state').hidden = records.length > 0;
  $('#table-body').innerHTML = records.map((record) => {
    const id = record[primaryKeyFor(activeView)];
    const cells = columns.map((column) => `<td>${escapeHtml(formatValue(column, record[column]))}</td>`).join('');
    return `<tr>${cells}<td><div class="actions-cell">
      <button class="action-button" data-action="edit" data-id="${escapeHtml(id)}">Edit</button>
      <button class="action-button delete" data-action="delete" data-id="${escapeHtml(id)}">Delete</button>
    </div></td></tr>`;
  }).join('');
}

function primaryKeyFor(resource) {
  return {
    departments: 'dept_name', courses: 'course_id', sections: 'sec_id', students: 'student_id',
    exams: 'exam_id', invigilators: 'invigilator_id', rooms: 'room_id', 'time-slots': 'slot_id'
  }[resource];
}

function formatValue(key, value) {
  if (key.endsWith('_time')) return displayTime(value);
  return value;
}

async function buildFormFields(resource, record = {}) {
  const container = $('#form-fields');
  const schema = FIELDS[resource];
  container.innerHTML = '';
  for (const field of schema) {
    const label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = LABELS[field.name] || field.name;
    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      const options = await api(`/${field.resource}`);
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Select an option';
      input.append(empty);
      options.forEach((option) => {
        const item = document.createElement('option');
        item.value = option[field.key];
        item.textContent = String(option[field.display]);
        input.append(item);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type;
      if (field.maxLength) input.maxLength = field.maxLength;
      if (field.min !== undefined) input.min = String(field.min);
      if (field.name === 'exam_time' || field.type === 'time') input.step = '60';
    }
    input.name = field.name;
    input.required = true;
    input.className = 'field-control';
    input.value = record[field.name] ?? '';
    if (field.name.endsWith('_time') && field.type !== 'select') input.value = displayTime(input.value);
    label.append(input);
    container.append(label);
  }
}

function openCreateDialog() {
  editingId = null;
  $('#dialog-title').textContent = `Add ${NAV_ITEMS.find((item) => item.id === activeView).label.toLowerCase().replace(/s$/, '')}`;
  buildFormFields(activeView).then(() => $('#record-dialog').showModal()).catch((error) => showNotice(error.message, true));
}

function openEditDialog(id) {
  const record = records.find((item) => String(item[primaryKeyFor(activeView)]) === String(id));
  if (!record) return;
  editingId = id;
  $('#dialog-title').textContent = `Edit ${NAV_ITEMS.find((item) => item.id === activeView).label.toLowerCase().replace(/s$/, '')}`;
  buildFormFields(activeView, record).then(() => $('#record-dialog').showModal()).catch((error) => showNotice(error.message, true));
}

async function saveRecord(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  for (const field of FIELDS[activeView]) {
    if (field.type === 'number') payload[field.name] = Number(payload[field.name]);
  }
  try {
    const method = editingId === null ? 'POST' : 'PUT';
    const path = editingId === null ? `/${activeView}` : `/${activeView}/${encodeURIComponent(editingId)}`;
    await api(path, { method, body: JSON.stringify(payload) });
    $('#record-dialog').close();
    showNotice(editingId === null ? 'Record created successfully.' : 'Record updated successfully.');
    await loadRecords();
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function deleteRecord(id) {
  const label = NAV_ITEMS.find((item) => item.id === activeView).label.toLowerCase();
  if (!window.confirm(`Delete this ${label.replace(/s$/, '')}? Related records may prevent deletion.`)) return;
  try {
    await api(`/${activeView}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    showNotice('Record deleted successfully.');
    await loadRecords();
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function loadDashboard() {
  try {
    const [students, courses, sections, schedule] = await Promise.all([
      api('/students'), api('/courses'), api('/sections'), api('/exam-schedule')
    ]);
    $('#dashboard-view').innerHTML = `
      <div class="overview-intro"><div><p class="eyebrow">YOUR UNIVERSITY AT A GLANCE</p><h2>Academic overview</h2><p>Keep your examination operations organized and on schedule.</p></div></div>
      <div class="stats-grid">
        ${statCard('Total students', students.length, '♙', 'purple', 'Registered in the system')}
        ${statCard('Active courses', courses.length, '▤', 'cyan', 'Across all departments')}
        ${statCard('Course sections', sections.length, '▦', 'orange', 'Available for enrollment')}
        ${statCard('Scheduled exams', schedule.length, '▣', 'green', 'With room and invigilator')}
      </div>
      <div class="dashboard-grid">
        <div class="panel"><div class="panel-header"><div><h3>Upcoming exam schedule</h3><p>Exam times, rooms and assigned invigilators</p></div><button class="text-button" data-go="schedule">View schedule →</button></div>
          ${schedule.length ? `<div class="table-scroll"><table class="mini-table"><thead><tr><th>Exam</th><th>Date</th><th>Time</th><th>Room</th><th>Invigilator</th></tr></thead><tbody>${schedule.slice(0, 5).map((exam) => `<tr><td><span class="badge">EX-${exam.exam_id}</span></td><td>${escapeHtml(String(exam.exam_date).slice(0, 10))}</td><td>${escapeHtml(displayTime(exam.exam_time))}</td><td>${escapeHtml(exam.room_number)}</td><td>${escapeHtml(exam.invigilator_name)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-state">No exams scheduled yet.</p>'}
        </div>
        <div class="panel"><div class="panel-header"><div><h3>Quick actions</h3><p>Jump to a workspace</p></div></div><div class="quick-list">
          ${quickAction('♙', 'Register a student', 'Add a student record', 'students')}
          ${quickAction('▤', 'Create a course', 'Set up a new course', 'courses')}
          ${quickAction('▣', 'Schedule an exam', 'Assign room and invigilator', 'exams')}
          ${quickAction('↗', 'Manage enrollments', 'Connect students to sections', 'relationships')}
        </div></div>
      </div>`;
  } catch (error) {
    showNotice(`Dashboard could not load: ${error.message}`, true);
  }
}

function statCard(label, value, icon, color, note) {
  return `<article class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${color}">${icon}</span></div><div class="stat-number">${value}</div><div class="stat-note">${note}</div></article>`;
}

function quickAction(icon, title, subtitle, view) {
  return `<button class="quick-item" data-go="${view}"><span class="quick-icon">${icon}</span><span><strong>${title}</strong><small>${subtitle}</small></span></button>`;
}

async function loadRelationshipOptions() {
  try {
    const [students, sections, exams] = await Promise.all([api('/students'), api('/sections'), api('/exams')]);
    fillSelect($('#enrollment-form [name="student_id"]'), students, 'student_id', 'student_name');
    fillSelect($('#enrollment-form [name="sec_id"]'), sections, 'sec_id', 'sec_id', (section) => `Section ${section.sec_id} · ${section.semester} ${section.year}`);
    fillSelect($('#exam-assignment-form [name="student_id"]'), students, 'student_id', 'student_name');
    fillSelect($('#exam-assignment-form [name="exam_id"]'), exams, 'exam_id', 'exam_id', (exam) => `Exam ${exam.exam_id} · ${String(exam.exam_date).slice(0, 10)}`);
  } catch (error) {
    showNotice(error.message, true);
  }
}

function fillSelect(select, rows, key, label, getLabel) {
  select.innerHTML = '<option value="">Select an option</option>';
  rows.forEach((row) => {
    const option = document.createElement('option');
    option.value = row[key];
    option.textContent = getLabel ? getLabel(row) : row[label];
    select.append(option);
  });
}

async function submitRelationship(event, endpoint) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  payload.student_id = Number(payload.student_id);
  payload[endpoint === '/enrollments' ? 'sec_id' : 'exam_id'] = Number(payload[endpoint === '/enrollments' ? 'sec_id' : 'exam_id']);
  try {
    await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    event.currentTarget.reset();
    showNotice(endpoint === '/enrollments' ? 'Student enrolled successfully.' : 'Student assigned to exam successfully.');
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function loadSchedule() {
  try {
    const search = $('#schedule-search').value.trim();
    const schedule = await api(`/exam-schedule${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    $('#schedule-head').innerHTML = '<tr><th>Exam</th><th>Date</th><th>Time</th><th>Time slot</th><th>Room</th><th>Students</th><th>Invigilator</th></tr>';
    $('#schedule-body').innerHTML = schedule.map((exam) =>
      `<tr><td><span class="badge">EX-${exam.exam_id}</span></td><td>${escapeHtml(String(exam.exam_date).slice(0, 10))}</td><td>${escapeHtml(displayTime(exam.exam_time))}</td><td>${escapeHtml(displayTime(exam.start_time))}–${escapeHtml(displayTime(exam.end_time))}</td><td>${escapeHtml(exam.room_number)}</td><td>${escapeHtml(exam.student_count)} / ${escapeHtml(exam.capacity)}</td><td>${escapeHtml(exam.invigilator_name)}</td></tr>`
    ).join('');
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function checkConnection() {
  try {
    await api('/health');
    $('#connection-label').textContent = 'Connected';
    $('#connection-dot').classList.add('online');
  } catch {
    $('#connection-label').textContent = 'Offline';
    $('#connection-dot').classList.remove('online');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  $('#today-label').textContent = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date());
  $('#add-record').addEventListener('click', openCreateDialog);
  $('#record-form').addEventListener('submit', saveRecord);
  $('#close-dialog').addEventListener('click', () => $('#record-dialog').close());
  $('#cancel-dialog').addEventListener('click', () => $('#record-dialog').close());
  $('#table-body').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'edit') openEditDialog(button.dataset.id);
    if (button.dataset.action === 'delete') deleteRecord(button.dataset.id);
  });
  $('#search-input').addEventListener('input', debounce(loadRecords, 250));
  $('#schedule-search').addEventListener('input', debounce(loadSchedule, 250));
  $('#enrollment-form').addEventListener('submit', (event) => submitRelationship(event, '/enrollments'));
  $('#exam-assignment-form').addEventListener('submit', (event) => submitRelationship(event, '/exam-assignments'));
  $('#dashboard-view').addEventListener('click', (event) => {
    const button = event.target.closest('[data-go]');
    if (button) setView(button.dataset.go);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('#record-dialog').open) $('#record-dialog').close();
  });
  checkConnection();
  setView('overview');
});

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}
