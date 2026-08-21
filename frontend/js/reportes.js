let activeUser = null;
let currentReportRows = [];

document.addEventListener('DOMContentLoaded', async () => {
  activeUser = requireAuth();

  if (!activeUser) return;

  bindLogout();

  if (!hasBackendSession()) {
    alert('Debe iniciar sesión usando el backend para consultar reportes desde MySQL. Cierre sesión e ingrese nuevamente.');
    window.location.href = 'index.html';
    return;
  }

  await setupFilters();
  bindReportForm();
  await generateReport();
});

function hasBackendSession() {
  return Boolean(activeUser?.token && activeUser.token !== 'demo-token');
}

async function setupFilters() {
  const start = document.getElementById('dateStart');
  const end = document.getElementById('dateEnd');
  const today = todayISO();

  start.value = today;
  end.value = today;

  const employeeFilter = document.getElementById('employeeFilter');

  const canSeeAll = hasPermission('canViewAllReports', activeUser);

  if (!canSeeAll) {
    employeeFilter.innerHTML = `
      <option value="${activeUser.cedula}">${escapeHtml(activeUser.nombre)}</option>
    `;
    employeeFilter.disabled = true;
    return;
  }

  if (activeUser.rol === 'CONSULTA') {
    employeeFilter.innerHTML = '<option value="TODOS">Todos los funcionarios</option>';
    employeeFilter.disabled = true;
    return;
  }

  try {
    const result = await apiFetch('/admin/usuarios');
    const users = result.usuarios || [];

    employeeFilter.innerHTML = '<option value="TODOS">Todos los funcionarios</option>' + users.map((user) => `
      <option value="${escapeHtml(user.cedula)}">${escapeHtml(user.nombre || user.nombre_completo)}</option>
    `).join('');
  } catch (error) {
    console.error(error);

    employeeFilter.innerHTML = '<option value="TODOS">Todos los funcionarios</option>';
    employeeFilter.disabled = true;

    alert(error.message || 'No se pudo cargar el listado de funcionarios.');
  }
}

function bindReportForm() {
  const form = document.getElementById('reportForm');
  const exportBtn = document.getElementById('exportCsvBtn');
  const printBtn = document.getElementById('printReportBtn');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await generateReport();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportCsv);
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

async function generateReport() {
  const type = document.getElementById('reportType').value;
  const employee = document.getElementById('employeeFilter').value;
  const start = document.getElementById('dateStart').value;
  const end = document.getElementById('dateEnd').value;

  if (!start || !end) {
    alert('Seleccione fecha de inicio y fecha fin.');
    return;
  }

  if (new Date(`${start}T00:00:00`) > new Date(`${end}T00:00:00`)) {
    alert('La fecha de inicio no puede ser mayor que la fecha fin.');
    return;
  }

  try {
    setReportLoading(true);

    const query = new URLSearchParams({
      tipo: type,
      cedula: employee || 'TODOS',
      fecha_inicio: start,
      fecha_fin: end
    });

    const result = await apiFetch(`/reportes/asistencia?${query.toString()}`);

    currentReportRows = result.filas || result.rows || result.data || [];

    renderReport(type, currentReportRows);
    renderStats(result.estadisticas, result.total);
  } catch (error) {
    console.error(error);

    currentReportRows = [];

    renderReport(type, []);
    renderStats(null, 0);
    alert(`No se pudo generar el reporte desde MySQL: ${error.message}`);
  } finally {
    setReportLoading(false);
  }
}

function setReportLoading(isLoading) {
  const submitBtn = document.querySelector('#reportForm button[type="submit"]');

  if (!submitBtn) return;

  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Generando...' : 'Generar reporte';
}

function renderReport(type, rows) {
  const titleMap = {
    ASISTENCIA_DIARIA: 'Reporte de asistencia diaria',
    ATRASOS: 'Reporte de atrasos',
    FALTAS: 'Reporte de faltas',
    MARCACIONES_INCOMPLETAS: 'Reporte de marcaciones incompletas',
    REPORTE_GENERAL: 'Reporte general'
  };

  document.getElementById('reportTitle').textContent = titleMap[type] || 'Reporte generado';

  const body = document.getElementById('reportBody');

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9">No existen registros para los filtros seleccionados.</td></tr>';
    return;
  }

  body.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.fecha)}</td>
      <td>${escapeHtml(row.cedula)}</td>
      <td>${escapeHtml(row.funcionario)}</td>
      <td>${escapeHtml(row.entrada || 'Sin registro')}</td>
      <td>${escapeHtml(row.salidaAlmuerzo || 'Sin registro')}</td>
      <td>${escapeHtml(row.retornoAlmuerzo || 'Sin registro')}</td>
      <td>${escapeHtml(row.salida || 'Sin registro')}</td>
      <td><span class="badge ${badgeClassByStatus(row.estado)}">${escapeHtml(row.estado)}</span></td>
      <td>${escapeHtml(row.atraso || 'No')}</td>
    </tr>
  `).join('');
}

function renderStats(stats, totalValue) {
  const total = Number(totalValue || 0);
  const atrasos = Number(stats?.atrasos || 0);
  const faltas = Number(stats?.faltas || 0);
  const incompletos = Number(stats?.incompletos || 0);

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statLate').textContent = atrasos;
  document.getElementById('statAbsences').textContent = faltas;
  document.getElementById('statIncomplete').textContent = incompletos;
}

function badgeClassByStatus(status) {
  if (status === 'COMPLETO') return 'completo';
  if (status === 'ATRASO' || status === 'INCOMPLETO') return 'warning';
  return 'danger';
}

function exportCsv() {
  if (!currentReportRows.length) {
    alert('No hay datos para exportar.');
    return;
  }

  const headers = [
    'Fecha',
    'Cedula',
    'Funcionario',
    'Entrada',
    'Salida almuerzo',
    'Retorno',
    'Salida',
    'Estado',
    'Atraso',
    'Minutos atraso',
    'Minutos trabajados'
  ];

  const rows = currentReportRows.map((row) => [
    row.fecha,
    row.cedula,
    row.funcionario,
    row.entrada,
    row.salidaAlmuerzo,
    row.retornoAlmuerzo,
    row.salida,
    row.estado,
    row.atraso,
    row.minutos_atraso,
    row.minutos_trabajados
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `reporte_asistencia_${todayISO()}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}