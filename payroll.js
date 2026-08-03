const app = window.rosterApp;

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));
const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function formatHours(value) {
  return Number(value || 0).toFixed(2);
}

function readNumberInput(id, fallback) {
  const input = $(id);
  if (!input) return fallback;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function payrollState() {
  const payroll = app.state.payroll || {};
  return {
    defaultHourlyRate: Number(payroll.defaultHourlyRate ?? 25),
    overtimeThresholdHours: Number(payroll.overtimeThresholdHours ?? 38),
    overtimeMultiplier: Number(payroll.overtimeMultiplier ?? 1.5),
    employeeRates: { ...(payroll.employeeRates || {}) }
  };
}

function writePayrollState(nextPayroll) {
  app.state.payroll = nextPayroll;
}

function syncControlsFromState() {
  const payroll = payrollState();
  const startInput = $('payrollStart');
  const endInput = $('payrollEnd');
  const defaultRateInput = $('payrollDefaultRate');
  const thresholdInput = $('payrollThreshold');
  const multiplierInput = $('payrollMultiplier');

  if (startInput && !startInput.value) startInput.value = app.isoDate(app.selectedWeek);
  if (endInput && !endInput.value) endInput.value = app.isoDate(app.weekEnd(app.selectedWeek));
  if (defaultRateInput && !defaultRateInput.value) defaultRateInput.value = formatHours(payroll.defaultHourlyRate);
  if (thresholdInput && !thresholdInput.value) thresholdInput.value = formatHours(payroll.overtimeThresholdHours);
  if (multiplierInput && !multiplierInput.value) multiplierInput.value = formatHours(payroll.overtimeMultiplier);
}

function currentRange() {
  const startInput = $('payrollStart');
  const endInput = $('payrollEnd');
  let start = startInput?.value ? app.parseDate(startInput.value) : new Date(app.selectedWeek);
  let end = endInput?.value ? app.parseDate(endInput.value) : app.weekEnd(app.selectedWeek);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < start) [start, end] = [end, start];
  return { start, end };
}

function periodLabel(start, end) {
  return `${start.toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function shiftsForRange(start, end) {
  const from = app.isoDate(start);
  const to = app.isoDate(end);
  return app.state.shifts.filter(shift => shift.date >= from && shift.date <= to);
}

function effectiveRate(employee, payroll = payrollState()) {
  const override = Number(payroll.employeeRates?.[employee]);
  return Number.isFinite(override) && override > 0 ? override : payroll.defaultHourlyRate;
}

function payrollRows() {
  const payroll = payrollState();
  const { start, end } = currentRange();
  const grouped = new Map();

  for (const shift of shiftsForRange(start, end)) {
    const hours = app.shiftHours(shift);
    const current = grouped.get(shift.employee) || {
      employee: shift.employee,
      shifts: 0,
      hours: 0,
      locations: new Set()
    };
    current.shifts += 1;
    current.hours += hours;
    current.locations.add(shift.location);
    grouped.set(shift.employee, current);
  }

  return [...grouped.values()]
    .map(row => {
      const rate = effectiveRate(row.employee, payroll);
      const overtimeHours = Math.max(0, row.hours - payroll.overtimeThresholdHours);
      const regularHours = Math.max(0, row.hours - overtimeHours);
      const gross = regularHours * rate + overtimeHours * rate * payroll.overtimeMultiplier;
      return {
        ...row,
        rate,
        regularHours,
        overtimeHours,
        gross,
        locations: [...row.locations].sort().join(', ')
      };
    })
    .sort((a, b) => a.employee.localeCompare(b.employee));
}

function payrollTotals(rows) {
  return rows.reduce((totals, row) => {
    totals.hours += row.hours;
    totals.overtimeHours += row.overtimeHours;
    totals.gross += row.gross;
    return totals;
  }, { hours: 0, overtimeHours: 0, gross: 0 });
}

function updatePayrollConfig() {
  const payroll = payrollState();
  writePayrollState({
    defaultHourlyRate: readNumberInput('payrollDefaultRate', payroll.defaultHourlyRate),
    overtimeThresholdHours: readNumberInput('payrollThreshold', payroll.overtimeThresholdHours),
    overtimeMultiplier: readNumberInput('payrollMultiplier', payroll.overtimeMultiplier),
    employeeRates: { ...(payroll.employeeRates || {}) }
  });
  app.save();
  renderPayroll();
}

function syncRangeToRosterWeek() {
  const startInput = $('payrollStart');
  const endInput = $('payrollEnd');
  if (startInput) startInput.value = app.isoDate(app.selectedWeek);
  if (endInput) endInput.value = app.isoDate(app.weekEnd(app.selectedWeek));
  renderPayroll();
}

function updateEmployeeRate(employee, rawValue) {
  const payroll = payrollState();
  const nextRates = { ...(payroll.employeeRates || {}) };
  const rate = Number(rawValue);
  if (!rawValue || !Number.isFinite(rate) || rate <= 0 || rate === payroll.defaultHourlyRate) {
    delete nextRates[employee];
  } else {
    nextRates[employee] = rate;
  }
  writePayrollState({
    ...payroll,
    employeeRates: nextRates
  });
  app.save();
  renderPayroll();
}

function resetOverrides() {
  const payroll = payrollState();
  writePayrollState({
    ...payroll,
    employeeRates: {}
  });
  app.save();
  renderPayroll();
  app.toast('Payroll overrides cleared');
}

function exportPayrollCSV() {
  const rows = payrollRows();
  if (!rows.length) {
    app.toast('No shifts in this pay period');
    return;
  }
  const { start, end } = currentRange();
  const csvRows = [
    ['Employee', 'Shifts', 'Hours', 'OT Hours', 'Rate', 'Gross', 'Locations'],
    ...rows.map(row => [
      row.employee,
      row.shifts,
      row.hours.toFixed(2),
      row.overtimeHours.toFixed(2),
      row.rate.toFixed(2),
      row.gross.toFixed(2),
      row.locations
    ])
  ];
  const csv = csvRows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const file = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `supps247-payroll-${app.isoDate(start)}_to_${app.isoDate(end)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderPayrollRates() {
  const body = $('payrollRatesBody');
  if (!body) return;
  const payroll = payrollState();
  body.innerHTML = app.state.employees.map(employee => {
    const rate = effectiveRate(employee, payroll);
    return `
      <tr>
        <td><strong>${esc(employee)}</strong></td>
        <td>
          <label class="rate-input">
            <span>$</span>
            <input
              class="payroll-rate-input"
              data-employee="${esc(employee)}"
              type="number"
              min="0"
              step="0.01"
              value="${formatHours(rate)}"
            />
          </label>
        </td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('.payroll-rate-input').forEach(input => {
    input.addEventListener('change', () => updateEmployeeRate(input.dataset.employee, input.value));
  });
}

function renderPayroll() {
  const body = $('payrollTableBody');
  if (!body) return;

  syncControlsFromState();
  const rows = payrollRows();
  const totals = payrollTotals(rows);
  const { start, end } = currentRange();
  const payroll = payrollState();

  const people = $('payrollPeople');
  const hours = $('payrollHours');
  const overtime = $('payrollOvertime');
  const gross = $('payrollGross');
  const period = $('payrollPeriodLabel');

  if (people) people.textContent = String(rows.length);
  if (hours) hours.textContent = formatHours(totals.hours);
  if (overtime) overtime.textContent = formatHours(totals.overtimeHours);
  if (gross) gross.textContent = formatMoney(totals.gross);
  if (period) period.textContent = periodLabel(start, end);

  body.innerHTML = rows.length
    ? rows.map(row => `
        <tr>
          <td><strong>${esc(row.employee)}</strong></td>
          <td>${row.shifts}</td>
          <td>${formatHours(row.hours)}</td>
          <td>${formatHours(row.overtimeHours)}</td>
          <td>${formatMoney(row.rate)}</td>
          <td>${formatMoney(row.gross)}</td>
          <td>${esc(row.locations || '—')}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="7" class="empty">No shifts in this pay period.</td></tr>';

  renderPayrollRates();
}

function wirePayrollControls() {
  const on = (id, event, handler) => {
    const node = $(id);
    if (node) node.addEventListener(event, handler);
  };

  on('payrollStart', 'change', renderPayroll);
  on('payrollEnd', 'change', renderPayroll);
  on('payrollDefaultRate', 'change', updatePayrollConfig);
  on('payrollThreshold', 'change', updatePayrollConfig);
  on('payrollMultiplier', 'change', updatePayrollConfig);
  on('payrollUseRosterWeek', 'click', syncRangeToRosterWeek);
  on('resetPayrollOverrides', 'click', resetOverrides);
  on('exportPayroll', 'click', exportPayrollCSV);
}

function wrapRender() {
  if (app.__payrollWrapped || typeof app.render !== 'function') return;
  const originalRender = app.render;
  const wrappedRender = () => {
    originalRender();
    renderPayroll();
  };
  app.render = wrappedRender;
  window.render = wrappedRender;
  app.__payrollWrapped = true;
}

wirePayrollControls();
wrapRender();
renderPayroll();
