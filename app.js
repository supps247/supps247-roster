const SUPABASE_URL = 'https://wyawmmfggnzjhaqvzmeq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_u9_uZIJV3zOS3i3MASBubg_wQLPpMP4';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const SUPPS247_LOCATIONS = [
  'Springvale (Head Office)', 'Dandenong', 'Point Cook', 'Caroline Springs',
  'Tarneit', 'Manor Lakes', 'Craigieburn', 'Reservoir',
  'South Yarra (Chapel Street)', 'Ringwood', 'Chirnside Park'
];
const SUPPS247_EMPLOYEES = [
  'Sebastian', 'Ash', 'Dhillon', 'Roy', 'Ainsley', 'Anthony', 'Sash', 'Vishesh', 'Lokesh',
  'Sahil', 'Rahul', 'Harinder', 'Sumit', 'Lochlan', 'Anikin', 'Vicky', 'Joel', 'Moni', 'Jashan'
];
const defaultState = {
  revision: 0,
  updatedAt: null,
  updatedBy: 'system',
  employees: SUPPS247_EMPLOYEES,
  locations: SUPPS247_LOCATIONS,
  shifts: []
};

let state = structuredClone(defaultState);
let saving = false;
let queuedSave = false;
let realtimeChannel = null;
let currentUser = null;
let selectedWeek = mondayOf(new Date());

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmtTime = t => new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayName = d => d.toLocaleDateString([], { weekday: 'short' });

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function weekEnd(start) {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return d;
}

function weekLabel(start) {
  const end = weekEnd(start);
  return `${start.toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => t.classList.add('hidden'), 2200);
}

function setConnection(ok, text) {
  const el = $('connectionStatus');
  if (!el) return;
  el.textContent = text || (ok ? 'Cloud connected' : 'Offline');
  el.className = `sync-status ${ok ? 'online' : 'offline'}`;
}

function editorName() {
  return currentUser?.email || 'Admin';
}

function shiftsForWeek(start, employee = 'all') {
  const s = isoDate(start);
  const e = isoDate(weekEnd(start));
  return state.shifts
    .filter(x => x.date >= s && x.date <= e && (employee === 'all' || x.employee === employee))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.employee.localeCompare(b.employee));
}

function shiftHours(x) {
  const [sh, sm] = x.start.split(':').map(Number);
  const [eh, em] = x.end.split(':').map(Number);
  return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm) - (Number(x.breakMin) || 0)) / 60);
}

function fillSelect(select, values, includeAll = false) {
  select.innerHTML = (includeAll ? '<option value="all">All employees</option>' : '') + values.map(v => `<option value="${v}">${v}</option>`).join('');
}

async function loadState() {
  const { data, error } = await db.from('roster_state').select('state, revision, updated_at, updated_by').eq('id', 1).single();
  if (error) throw error;
  state = { ...defaultState, ...(data.state || {}), revision: Number(data.revision || 0), updatedAt: data.updated_at, updatedBy: data.updated_by };
}

async function save() {
  if (saving) {
    queuedSave = true;
    return;
  }
  saving = true;
  setConnection(true, 'Saving…');
  const payload = { employees: state.employees, locations: state.locations, shifts: state.shifts };
  try {
    const { data, error } = await db.rpc('save_roster_state', {
      p_state: payload,
      p_base_revision: Number(state.revision || 0),
      p_updated_by: editorName()
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('No save response');
    if (row.conflict) {
      state = { ...defaultState, ...(row.state || {}), revision: Number(row.revision || 0), updatedAt: row.updated_at, updatedBy: row.updated_by };
      render();
      toast('Another user changed the roster. Latest version loaded.');
    } else {
      state.revision = Number(row.revision || state.revision + 1);
      state.updatedAt = row.updated_at;
      state.updatedBy = row.updated_by;
      setConnection(true, 'Cloud synced');
    }
  } catch (err) {
    console.error(err);
    setConnection(false, 'Save failed');
    toast(err.message || 'Could not save roster');
  } finally {
    saving = false;
    if (queuedSave) {
      queuedSave = false;
      save();
    }
  }
}

function connectLiveUpdates() {
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel('supps247-roster-live')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'roster_state', filter: 'id=eq.1' }, payload => {
      const row = payload.new;
      if (Number(row.revision) > Number(state.revision)) {
        state = { ...defaultState, ...(row.state || {}), revision: Number(row.revision), updatedAt: row.updated_at, updatedBy: row.updated_by };
        render();
        toast(`Roster updated by ${row.updated_by || 'another user'}`);
      }
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') setConnection(true, 'Cloud synced');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection(false, 'Reconnecting…');
    });
}

function renderRosterBuilder() {
  $('managerWeekLabel').textContent = weekLabel(selectedWeek);
  const filter = $('employeeFilter').value || 'all';
  const shifts = shiftsForWeek(selectedWeek, filter);
  $('rosterTableBody').innerHTML = shifts.length ? shifts.map(s => {
    const d = parseDate(s.date);
    return `<tr><td><strong>${dayName(d)}</strong><small>${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small></td><td>${s.employee}</td><td>${s.location}</td><td>${fmtTime(s.start)}</td><td>${fmtTime(s.end)}</td><td>${s.breakMin || 0} min</td><td>${shiftHours(s).toFixed(1)}</td><td class="actions"><button class="icon-btn edit-shift" data-id="${s.id}">Edit</button><button class="icon-btn delete-shift" data-id="${s.id}">Delete</button></td></tr>`;
  }).join('') : `<tr><td colspan="8" class="empty">No shifts for this week. Click “Add shift” or “Outlet weekly roster” to start.</td></tr>`;

  document.querySelectorAll('.edit-shift').forEach(b => b.onclick = () => openShiftDialog(state.shifts.find(s => s.id === b.dataset.id)));
  document.querySelectorAll('.delete-shift').forEach(b => b.onclick = () => {
    if (confirm('Delete this shift?')) {
      state.shifts = state.shifts.filter(s => s.id !== b.dataset.id);
      save();
      render();
      toast('Shift deleted');
    }
  });
}

function shiftsForOutletWeek(start) {
  const s = isoDate(start);
  const e = isoDate(weekEnd(start));
  const weekly = state.shifts.filter(x => x.date >= s && x.date <= e);
  const locations = [...new Set(weekly.map(s => s.location))].sort((a, b) => a.localeCompare(b));
  return locations.map(location => {
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const d = new Date(start);
      d.setDate(d.getDate() + dayIndex);
      const date = isoDate(d);
      return weekly
        .filter(shift => shift.location === location && shift.date === date)
        .sort((a, b) => a.start.localeCompare(b.start) || a.employee.localeCompare(b.employee));
    });
    return { location, days };
  });
}

function renderOutletWeekView() {
  const body = $('outletRosterBody');
  if (!body) return;
  const outlets = shiftsForOutletWeek(selectedWeek);
  if (!outlets.length) {
    body.innerHTML = `<tr><td colspan="9" class="empty">No outlet rosters for this week yet.</td></tr>`;
    return;
  }
  body.innerHTML = outlets.map(({ location, days }) => {
    const totalHours = days.flat().reduce((sum, s) => sum + shiftHours(s), 0);
    const cells = days.map(dayShifts => {
      if (!dayShifts.length) return `<td class="outlet-day empty-day">—</td>`;
      return `<td class="outlet-day">${dayShifts.map(s => `
        <div class="outlet-shift">
          <strong>${s.employee}</strong>
          <span>${fmtTime(s.start)}–${fmtTime(s.end)}</span>
        </div>
      `).join('')}</td>`;
    }).join('');
    return `<tr>
      <td class="outlet-name"><strong>${location}</strong></td>
      ${cells}
      <td class="outlet-total">${totalHours.toFixed(1)}</td>
    </tr>`;
  }).join('');
}

function renderTodayTeam() {
  const today = isoDate(new Date());
  const shifts = state.shifts.filter(s => s.date === today).sort((a, b) => a.location.localeCompare(b.location) || a.start.localeCompare(b.start));
  $('teamList').innerHTML = shifts.length
    ? shifts.map(s => `<div class="team-row"><div><strong>${s.employee}</strong><p>${s.location} · ${fmtTime(s.start)}–${fmtTime(s.end)}</p></div><span class="status on">Scheduled</span></div>`).join('')
    : '<p class="muted">No staff rostered today.</p>';
}

function renderStats() {
  const today = isoDate(new Date());
  const todayShifts = state.shifts.filter(s => s.date === today);
  const weekShifts = shiftsForWeek(selectedWeek);
  $('rosteredToday').textContent = todayShifts.length;
  $('activeOutlets').textContent = new Set(todayShifts.map(s => s.location)).size;
  $('weeklyShifts').textContent = weekShifts.length;
  $('managerHours').textContent = weekShifts.reduce((sum, s) => sum + shiftHours(s), 0).toFixed(1);
  $('heroToday').textContent = todayShifts.length;
  $('heroWeek').textContent = weekShifts.length;
  $('heroOutlets').textContent = state.locations.length;
}

function render() {
  renderRosterBuilder();
  renderOutletWeekView();
  renderTodayTeam();
  renderStats();
}

function openShiftDialog(shift = null) {
  $('dialogTitle').textContent = shift ? 'Edit shift' : 'Add shift';
  $('shiftId').value = shift?.id || '';
  $('shiftEmployee').value = shift?.employee || state.employees[0];
  $('shiftDate').value = shift?.date || isoDate(selectedWeek);
  $('shiftLocation').value = shift?.location || state.locations[0];
  $('shiftStart').value = shift?.start || '09:00';
  $('shiftEnd').value = shift?.end || '17:00';
  $('shiftBreak').value = shift?.breakMin ?? 30;
  $('shiftNotes').value = shift?.notes || '';
  $('shiftDialog').showModal();
}

function renderBulkRosterRows() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  $('bulkRosterBody').innerHTML = state.employees.map(employee => `
    <tr data-employee="${employee}">
      <td><strong>${employee}</strong></td>
      ${days.map((d, i) => `<td class="day-shift" data-day="${i}">
        <label class="day-toggle"><input type="checkbox" class="day-enabled" aria-label="${employee} ${d}"><span>Work</span></label>
        <select class="shift-preset" disabled aria-label="${employee} ${d} shift type">
          <option value="full">Full day</option>
          <option value="half-am">Half AM</option>
          <option value="half-pm">Half PM</option>
          <option value="custom">Custom</option>
        </select>
        <div class="day-times">
          <input class="day-start" type="time" value="09:00" disabled aria-label="${employee} ${d} start">
          <input class="day-end" type="time" value="17:00" disabled aria-label="${employee} ${d} finish">
        </div>
        <label class="break-label">Break <input class="day-break" type="number" min="0" step="5" value="30" disabled></label>
      </td>`).join('')}
    </tr>`).join('');

  $('bulkRosterBody').querySelectorAll('.day-shift').forEach(cell => {
    const enabled = cell.querySelector('.day-enabled');
    const preset = cell.querySelector('.shift-preset');
    const start = cell.querySelector('.day-start');
    const end = cell.querySelector('.day-end');
    const breakInput = cell.querySelector('.day-break');
    const applyPreset = () => {
      if (preset.value === 'full') { start.value = '09:00'; end.value = '17:00'; breakInput.value = '30'; }
      if (preset.value === 'half-am') { start.value = '09:00'; end.value = '13:00'; breakInput.value = '0'; }
      if (preset.value === 'half-pm') { start.value = '13:00'; end.value = '17:00'; breakInput.value = '0'; }
    };
    enabled.addEventListener('change', () => {
      [preset, start, end, breakInput].forEach(el => el.disabled = !enabled.checked);
      if (enabled.checked) applyPreset();
    });
    preset.addEventListener('change', applyPreset);
  });
}

function openBulkRosterDialog() {
  $('bulkWeek').value = isoDate(selectedWeek);
  $('bulkLocation').value = state.locations[0];
  renderBulkRosterRows();
  $('bulkRosterDialog').showModal();
}

function showApp(session) {
  currentUser = session.user;
  $('loginView').classList.add('hidden');
  $('managerView').classList.remove('hidden');
  $('logoutBtn').classList.remove('hidden');
  loadState()
    .then(() => {
      fillSelect($('employeeFilter'), state.employees, true);
      fillSelect($('shiftEmployee'), state.employees);
      fillSelect($('shiftLocation'), state.locations);
      fillSelect($('bulkLocation'), state.locations);
      connectLiveUpdates();
      setConnection(true, 'Cloud synced');
      render();
    })
    .catch(err => {
      console.error(err);
      setConnection(false, 'Database setup required');
      toast('Run setup.sql in Supabase SQL Editor first');
    });
}

function showLogin() {
  currentUser = null;
  $('managerView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
  $('logoutBtn').classList.add('hidden');
  setConnection(false, 'Sign in required');
}

$('bulkRoster').onclick = openBulkRosterDialog;
$('closeBulkDialog').onclick = () => $('bulkRosterDialog').close();
$('cancelBulkDialog').onclick = () => $('bulkRosterDialog').close();
$('bulkRosterForm').addEventListener('submit', e => {
  e.preventDefault();
  const week = mondayOf(parseDate($('bulkWeek').value));
  const location = $('bulkLocation').value;
  let added = 0, skipped = 0;
  $('bulkRosterBody').querySelectorAll('tr').forEach(row => {
    const employee = row.dataset.employee;
    row.querySelectorAll('.day-shift').forEach(cell => {
      if (!cell.querySelector('.day-enabled').checked) return;
      const start = cell.querySelector('.day-start').value;
      const end = cell.querySelector('.day-end').value;
      const breakMin = Number(cell.querySelector('.day-break').value) || 0;
      if (!start || !end || end <= start) { skipped++; return; }
      const d = new Date(week);
      d.setDate(d.getDate() + Number(cell.dataset.day));
      const date = isoDate(d);
      const duplicate = state.shifts.some(s => s.date === date && s.employee === employee && s.location === location && s.start === start);
      if (duplicate) { skipped++; return; }
      const preset = cell.querySelector('.shift-preset').value;
      const notes = preset === 'full' ? 'Full day' : preset === 'half-am' ? 'Half day (AM)' : preset === 'half-pm' ? 'Half day (PM)' : 'Custom shift';
      state.shifts.push({ id: crypto.randomUUID(), date, employee, location, start, end, breakMin, notes });
      added++;
    });
  });
  if (!added && !skipped) {
    toast('Select at least one employee day');
    return;
  }
  save();
  $('bulkRosterDialog').close();
  selectedWeek = week;
  render();
  toast(`${added} shifts added${skipped ? `, ${skipped} skipped` : ''}`);
});

$('shiftForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('shiftId').value;
  const item = {
    id: id || crypto.randomUUID(),
    employee: $('shiftEmployee').value,
    date: $('shiftDate').value,
    location: $('shiftLocation').value,
    start: $('shiftStart').value,
    end: $('shiftEnd').value,
    breakMin: Number($('shiftBreak').value) || 0,
    notes: $('shiftNotes').value.trim()
  };
  if (item.end <= item.start) {
    toast('Finish time must be after start time');
    return;
  }
  if (id) {
    const i = state.shifts.findIndex(s => s.id === id);
    state.shifts[i] = item;
  } else {
    state.shifts.push(item);
  }
  save();
  $('shiftDialog').close();
  render();
  toast(id ? 'Shift updated' : 'Shift added');
});

$('closeDialog').onclick = () => $('shiftDialog').close();
$('cancelDialog').onclick = () => $('shiftDialog').close();
$('addShift').onclick = () => openShiftDialog();
$('prevWeek').onclick = () => {
  selectedWeek.setDate(selectedWeek.getDate() - 7);
  render();
};
$('nextWeek').onclick = () => {
  selectedWeek.setDate(selectedWeek.getDate() + 7);
  render();
};
$('employeeFilter').onchange = render;
$('copyWeek').onclick = () => {
  const previous = new Date(selectedWeek);
  previous.setDate(previous.getDate() - 7);
  const source = shiftsForWeek(previous);
  if (!source.length) {
    toast('Previous week has no shifts');
    return;
  }
  const existingIds = new Set(shiftsForWeek(selectedWeek).map(s => `${s.date}|${s.employee}|${s.location}|${s.start}`));
  let added = 0;
  source.forEach(s => {
    const d = parseDate(s.date);
    d.setDate(d.getDate() + 7);
    const copy = { ...s, id: crypto.randomUUID(), date: isoDate(d) };
    const key = `${copy.date}|${copy.employee}|${copy.location}|${copy.start}`;
    if (!existingIds.has(key)) {
      state.shifts.push(copy);
      added++;
    }
  });
  save();
  render();
  toast(`${added} shifts copied`);
};
$('bulkRoster').onclick = openBulkRosterDialog;
$('clearWeek').onclick = () => {
  if (!confirm(`Clear all shifts for ${weekLabel(selectedWeek)}?`)) return;
  const s = isoDate(selectedWeek), e = isoDate(weekEnd(selectedWeek));
  state.shifts = state.shifts.filter(x => x.date < s || x.date > e);
  save();
  render();
  toast('Week cleared');
};
$('exportRoster').onclick = () => {
  const shifts = shiftsForWeek(selectedWeek);
  if (!shifts.length) {
    toast('No shifts to export');
    return;
  }
  const rows = [['Date', 'Day', 'Employee', 'Outlet', 'Start', 'Finish', 'Break Minutes', 'Paid Hours', 'Notes'], ...shifts.map(s => [s.date, dayName(parseDate(s.date)), s.employee, s.location, s.start, s.end, s.breakMin || 0, shiftHours(s).toFixed(2), s.notes || ''])];
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `supps247-roster-${isoDate(selectedWeek)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$('downloadBackup').onclick = () => {
  const backup = { exportedAt: new Date().toISOString(), project: 'Supps247 Roster', ...state };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  a.download = `supps247-roster-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('loginError').classList.add('hidden');
  const { data, error } = await db.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPassword').value });
  if (error) {
    $('loginError').textContent = error.message;
    $('loginError').classList.remove('hidden');
    return;
  }
  await showApp(data.session);
});

$('logoutBtn').onclick = async () => {
  await db.auth.signOut();
  showLogin();
};

async function initialise() {
  const { data: { session } } = await db.auth.getSession();
  if (session) showApp(session); else showLogin();
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showLogin();
  });
}

initialise();
