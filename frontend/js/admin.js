let activeUser = null;

let adminUsers = [];
let adminSchedules = [];
let adminDepartments = [];
let adminPositions = [];
let adminIps = [];

const ADMIN_TAB_PERMISSIONS = {
  usuarios: 'canManageUsers',
  horarios: 'canManageSchedules',
  estructura: 'canManageStructure',
  ips: 'canManageIps'
};

document.addEventListener('DOMContentLoaded', async () => {
  activeUser = requireAuth(['ADMINISTRADOR', 'TALENTO_HUMANO']);

  if (!activeUser) return;

  bindLogout();

  if (!hasBackendSession()) {
    alert('Debe iniciar sesión usando el backend para administrar datos en MySQL. Cierre sesión e ingrese nuevamente.');
    window.location.href = 'index.html';
    return;
  }

  applyAdminPermissions();
  bindTabs();
  bindUserForm();
  bindScheduleForm();
  bindDepartmentForm();
  bindPositionForm();
  bindIpForm();

  await loadAllAdminData();
});

function hasBackendSession() {
  return Boolean(activeUser?.token && activeUser.token !== 'demo-token');
}

async function loadAllAdminData() {
  try {
    await Promise.all([
      loadUsers(),
      loadSchedules(),
      loadDepartments(),
      loadPositions(),
      hasPermission('canManageIps', activeUser) ? loadIps() : Promise.resolve()
    ]);

    renderAllAdminTables();
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudieron cargar los datos desde MySQL.');
  }
}

async function loadUsers() {
  const result = await apiFetch('/admin/usuarios');
  adminUsers = result.usuarios || [];
}

async function loadSchedules() {
  const result = await apiFetch('/admin/horarios');
  adminSchedules = result.horarios || [];
}

async function loadDepartments() {
  const result = await apiFetch('/admin/departamentos');
  adminDepartments = result.departamentos || [];
}

async function loadPositions() {
  const result = await apiFetch('/admin/cargos');
  adminPositions = result.cargos || [];
}

async function loadIps() {
  const result = await apiFetch('/admin/ips');
  adminIps = result.ips || [];
}

function applyAdminPermissions() {
  configureRoleSelect();
  applyTabVisibility();

  setFormEnabled('userForm', hasPermission('canManageUsers', activeUser));
  setFormEnabled('scheduleForm', hasPermission('canManageSchedules', activeUser));
  setFormEnabled('departmentForm', hasPermission('canManageStructure', activeUser));
  setFormEnabled('positionForm', hasPermission('canManageStructure', activeUser));
  setFormEnabled('ipForm', hasPermission('canManageIps', activeUser));
}

function configureRoleSelect() {
  const select = document.getElementById('userRol');

  if (!select) return;

  const allowedRoles = getRolePermissions(activeUser.rol).allowedAssignableRoles || [];

  select.innerHTML = allowedRoles.map((role) => `
    <option value="${role}">${formatRole(role)}</option>
  `).join('');
}

function applyTabVisibility() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    const permission = ADMIN_TAB_PERMISSIONS[button.dataset.tab];
    const allowed = !permission || hasPermission(permission, activeUser);

    button.style.display = allowed ? '' : 'none';
    button.disabled = !allowed;
  });

  document.querySelectorAll('.tab-panel').forEach((panel) => {
    const tabName = panel.id.replace('tab-', '');
    const permission = ADMIN_TAB_PERMISSIONS[tabName];
    const allowed = !permission || hasPermission(permission, activeUser);

    panel.style.display = allowed ? '' : 'none';
  });

  const activeButton = document.querySelector('.tab-btn.active');

  if (!activeButton || activeButton.style.display === 'none') {
    const firstAllowedButton = Array.from(document.querySelectorAll('.tab-btn'))
      .find((button) => button.style.display !== 'none');

    if (firstAllowedButton) {
      activateTab(firstAllowedButton.dataset.tab);
    }
  }
}

function setFormEnabled(formId, enabled) {
  const form = document.getElementById(formId);

  if (!form) return;

  form.querySelectorAll('input, select, button').forEach((element) => {
    element.disabled = !enabled;
  });
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const permission = ADMIN_TAB_PERMISSIONS[button.dataset.tab];

      if (permission && !hasPermission(permission, activeUser)) {
        alert('No tiene permiso para acceder a esta sección.');
        return;
      }

      activateTab(button.dataset.tab);
    });
  });
}

function activateTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((item) => item.classList.remove('active'));

  const button = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const panel = document.getElementById(`tab-${tabName}`);

  if (button) button.classList.add('active');
  if (panel) panel.classList.add('active');
}

function renderAllAdminTables() {
  renderUsers();
  renderSchedules();
  renderDepartments();
  renderPositions();
  renderIps();
}

// ============================================================
// USUARIOS
// ============================================================
function bindUserForm() {
  const form = document.getElementById('userForm');
  const resetBtn = document.getElementById('resetUserForm');

  if (!form || !resetBtn) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!hasPermission('canManageUsers', activeUser)) {
      alert('No tiene permiso para gestionar usuarios.');
      return;
    }

    const editingId = document.getElementById('userIndex').value.trim();
    const isEditing = editingId !== '';

    const userData = {
      cedula: document.getElementById('userCedula').value.trim(),
      nombre: document.getElementById('userNombre').value.trim().toUpperCase(),
      cargo: document.getElementById('userCargo').value.trim().toUpperCase(),
      departamento: document.getElementById('userDepartamento').value.trim(),
      rol: document.getElementById('userRol').value,
      estado: document.getElementById('userEstado').value
    };

    if (!validateUserData(userData, editingId)) return;

    try {
      if (isEditing) {
        await apiFetch(`/admin/usuarios/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(userData)
        });

        alert('Usuario actualizado correctamente.');
      } else {
        const result = await apiFetch('/admin/usuarios', {
          method: 'POST',
          body: JSON.stringify(userData)
        });

        alert(`Usuario creado correctamente.\nContraseña inicial: ${result.password_inicial}`);
      }

      resetUserForm();
      await loadUsers();
      renderUsers();
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el usuario.');
    }
  });

  resetBtn.addEventListener('click', resetUserForm);
}

function validateUserData(userData, editingId) {
  if (!userData.cedula || !userData.nombre || !userData.cargo || !userData.departamento || !userData.rol) {
    alert('Complete todos los campos obligatorios del usuario.');
    return false;
  }

  if (!/^\d{9,10}$/.test(userData.cedula)) {
    alert('La cédula debe contener entre 9 y 10 dígitos numéricos.');
    return false;
  }

  if (!canAssignRole(userData.rol, activeUser)) {
    alert(`Su rol no puede asignar el rol: ${formatRole(userData.rol)}.`);
    return false;
  }

  const duplicatedCedula = adminUsers.some((user) => (
    user.cedula === userData.cedula &&
    String(user.id_usuario) !== String(editingId)
  ));

  if (duplicatedCedula) {
    alert('Ya existe un usuario con esa cédula.');
    return false;
  }

  return true;
}

function canCurrentUserEditUser(targetUser) {
  if (!targetUser) return false;

  if (activeUser.rol === 'ADMINISTRADOR') return true;

  if (activeUser.rol === 'TALENTO_HUMANO') {
    return ['FUNCIONARIO', 'CONSULTA'].includes(targetUser.rol);
  }

  return false;
}

function canCurrentUserDeleteUser(targetUser) {
  if (!hasPermission('canDeleteUsers', activeUser)) return false;
  if (!targetUser) return false;
  if (targetUser.cedula === activeUser.cedula) return false;

  return true;
}

function resetUserForm() {
  const form = document.getElementById('userForm');

  if (form) form.reset();

  document.getElementById('userIndex').value = '';

  const cedulaInput = document.getElementById('userCedula');

  if (cedulaInput) {
    cedulaInput.readOnly = false;
  }

  configureRoleSelect();
  applyAdminPermissions();
}

function renderUsers() {
  const body = document.getElementById('usersTable');

  if (!body) return;

  const visibleUsers = adminUsers.filter((user) => (
    activeUser.rol === 'ADMINISTRADOR' ||
    ['FUNCIONARIO', 'CONSULTA'].includes(user.rol)
  ));

  if (!visibleUsers.length) {
    body.innerHTML = '<tr><td colspan="6">No existen usuarios registrados en MySQL.</td></tr>';
    return;
  }

  body.innerHTML = visibleUsers.map((user) => {
    const canEdit = canCurrentUserEditUser(user);
    const canDelete = canCurrentUserDeleteUser(user);

    return `
      <tr>
        <td>${escapeHtml(user.cedula)}</td>
        <td>${escapeHtml(user.nombre || user.nombre_completo)}</td>
        <td>${escapeHtml(user.cargo || '')}</td>
        <td>${escapeHtml(formatRole(user.rol))}</td>
        <td><span class="badge ${user.estado === 'ACTIVO' ? 'active' : 'danger'}">${escapeHtml(user.estado)}</span></td>
        <td>
          <button class="btn btn-secondary btn-small" type="button" onclick="editUser(${user.id_usuario})" ${canEdit ? '' : 'disabled'}>Editar</button>
          <button class="btn btn-danger btn-small" type="button" onclick="deleteUser(${user.id_usuario})" ${canDelete ? '' : 'disabled'}>Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function editUser(id) {
  const user = adminUsers.find((item) => String(item.id_usuario) === String(id));

  if (!canCurrentUserEditUser(user)) {
    alert('No tiene permiso para editar este usuario.');
    return;
  }

  document.getElementById('userIndex').value = user.id_usuario;
  document.getElementById('userCedula').value = user.cedula || '';
  document.getElementById('userNombre').value = user.nombre || user.nombre_completo || '';
  document.getElementById('userCargo').value = user.cargo || '';
  document.getElementById('userDepartamento').value = user.departamento || '';

  const cedulaInput = document.getElementById('userCedula');

  if (cedulaInput) {
    cedulaInput.readOnly = true;
  }

  configureRoleSelect();

  const roleSelect = document.getElementById('userRol');

  if (!canAssignRole(user.rol, activeUser)) {
    roleSelect.innerHTML = `<option value="${user.rol}">${formatRole(user.rol)}</option>`;
  }

  roleSelect.value = user.rol;

  document.getElementById('userEstado').value = user.estado || 'ACTIVO';

  activateTab('usuarios');
}

async function deleteUser(id) {
  const user = adminUsers.find((item) => String(item.id_usuario) === String(id));

  if (!canCurrentUserDeleteUser(user)) {
    alert('No tiene permiso para eliminar este usuario o está intentando eliminar su propia cuenta.');
    return;
  }

  const confirmed = await showConfirm(
    `¿Desea desactivar al usuario ${user.nombre || user.nombre_completo}?`,
    {
      title: 'Desactivar usuario',
      confirmText: 'Desactivar',
      cancelText: 'Cancelar'
    }
  );

  if (!confirmed) return;

  try {
    await apiFetch(`/admin/usuarios/${id}`, {
      method: 'DELETE'
    });

    await loadUsers();
    renderUsers();

    alert('Usuario desactivado correctamente.');
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudo desactivar el usuario.');
  }
}

// ============================================================
// HORARIOS
// ============================================================
function bindScheduleForm() {
  const form = document.getElementById('scheduleForm');
  const resetBtn = document.getElementById('resetScheduleForm');

  if (!form || !resetBtn) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!hasPermission('canManageSchedules', activeUser)) {
      alert('No tiene permiso para gestionar horarios.');
      return;
    }

    const schedule = {
      nombre: document.getElementById('scheduleName').value.trim(),
      entrada: document.getElementById('timeEntry').value,
      salidaAlmuerzo: document.getElementById('timeLunchOut').value,
      retornoAlmuerzo: document.getElementById('timeLunchBack').value,
      salida: document.getElementById('timeExit').value,
      tolerancia: Number(document.getElementById('toleranceEntry').value || 0)
    };

    if (!validateSchedule(schedule)) return;

    try {
      const editingId = document.getElementById('scheduleIndex').value.trim();

      await apiFetch(editingId ? `/admin/horarios/${editingId}` : '/admin/horarios', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(schedule)
      });

      resetScheduleForm();
      await loadSchedules();
      renderSchedules();

      alert('Horario guardado correctamente en MySQL.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el horario.');
    }
  });

  resetBtn.addEventListener('click', resetScheduleForm);
}

function validateSchedule(schedule) {
  if (!schedule.nombre || !schedule.entrada || !schedule.salidaAlmuerzo || !schedule.retornoAlmuerzo || !schedule.salida) {
    alert('Complete todos los campos del horario.');
    return false;
  }

  const entrada = timeToMinutes(schedule.entrada);
  const salidaAlmuerzo = timeToMinutes(schedule.salidaAlmuerzo);
  const retornoAlmuerzo = timeToMinutes(schedule.retornoAlmuerzo);
  const salida = timeToMinutes(schedule.salida);

  if (!(entrada < salidaAlmuerzo && salidaAlmuerzo < retornoAlmuerzo && retornoAlmuerzo < salida)) {
    alert('El horario debe ser secuencial: entrada < salida almuerzo < retorno almuerzo < salida final.');
    return false;
  }

  if (schedule.tolerancia < 0) {
    alert('La tolerancia no puede ser negativa.');
    return false;
  }

  return true;
}

function resetScheduleForm() {
  const form = document.getElementById('scheduleForm');

  if (form) form.reset();

  document.getElementById('scheduleIndex').value = '';

  const toleranceInput = document.getElementById('toleranceEntry');

  if (toleranceInput) toleranceInput.value = 10;

  applyAdminPermissions();
}

function renderSchedules() {
  const body = document.getElementById('schedulesTable');

  if (!body) return;

  if (!adminSchedules.length) {
    body.innerHTML = '<tr><td colspan="6">No existen horarios registrados en MySQL.</td></tr>';
    return;
  }

  body.innerHTML = adminSchedules.map((schedule) => `
    <tr>
      <td>${escapeHtml(schedule.nombre)}</td>
      <td>${escapeHtml(schedule.entrada || '')}</td>
      <td>${escapeHtml(schedule.salidaAlmuerzo || '')}</td>
      <td>${escapeHtml(schedule.retornoAlmuerzo || '')}</td>
      <td>${escapeHtml(schedule.salida || '')}</td>
      <td>
        <button class="btn btn-secondary btn-small" type="button" onclick="editSchedule(${schedule.id_horario})">Editar</button>
        <button class="btn btn-danger btn-small" type="button" onclick="deleteSchedule(${schedule.id_horario})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function editSchedule(id) {
  const schedule = adminSchedules.find((item) => String(item.id_horario) === String(id));

  if (!schedule) {
    alert('Horario no encontrado.');
    return;
  }

  document.getElementById('scheduleIndex').value = schedule.id_horario;
  document.getElementById('scheduleName').value = schedule.nombre || '';
  document.getElementById('timeEntry').value = schedule.entrada || '';
  document.getElementById('timeLunchOut').value = schedule.salidaAlmuerzo || '';
  document.getElementById('timeLunchBack').value = schedule.retornoAlmuerzo || '';
  document.getElementById('timeExit').value = schedule.salida || '';
  document.getElementById('toleranceEntry').value = schedule.tolerancia || 10;

  activateTab('horarios');
}

async function deleteSchedule(id) {
  if (!confirm('¿Desea eliminar este horario?')) return;

  try {
    await apiFetch(`/admin/horarios/${id}`, {
      method: 'DELETE'
    });

    await loadSchedules();
    renderSchedules();

    alert('Horario eliminado correctamente.');
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudo eliminar el horario.');
  }
}

// ============================================================
// DEPARTAMENTOS
// ============================================================
function bindDepartmentForm() {
  const form = document.getElementById('departmentForm');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!hasPermission('canManageStructure', activeUser)) {
      alert('No tiene permiso para gestionar departamentos.');
      return;
    }

    const input = document.getElementById('departmentName');
    const value = input.value.trim();

    if (!value) {
      alert('Ingrese el nombre del departamento.');
      return;
    }

    try {
      await apiFetch('/admin/departamentos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: value
        })
      });

      input.value = '';

      await loadDepartments();
      renderDepartments();

      alert('Departamento guardado correctamente en MySQL.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el departamento.');
    }
  });
}

function renderDepartments() {
  const list = document.getElementById('departmentsList');

  if (!list) return;

  if (!adminDepartments.length) {
    list.innerHTML = '<span class="tag-item">No existen departamentos registrados.</span>';
    return;
  }

  list.innerHTML = adminDepartments.map((department) => `
    <span class="tag-item">
      ${escapeHtml(department.nombre || department.nombre_departamento)}
    </span>
  `).join('');
}

// ============================================================
// CARGOS
// ============================================================
function bindPositionForm() {
  const form = document.getElementById('positionForm');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!hasPermission('canManageStructure', activeUser)) {
      alert('No tiene permiso para gestionar cargos.');
      return;
    }

    const input = document.getElementById('positionName');
    const value = input.value.trim().toUpperCase();

    if (!value) {
      alert('Ingrese el nombre del cargo.');
      return;
    }

    try {
      await apiFetch('/admin/cargos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: value
        })
      });

      input.value = '';

      await loadPositions();
      renderPositions();

      alert('Cargo guardado correctamente en MySQL.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el cargo.');
    }
  });
}

function renderPositions() {
  const list = document.getElementById('positionsList');

  if (!list) return;

  if (!adminPositions.length) {
    list.innerHTML = '<span class="tag-item">No existen cargos registrados.</span>';
    return;
  }

  list.innerHTML = adminPositions.map((position) => `
    <span class="tag-item">
      ${escapeHtml(position.nombre || position.nombre_cargo)}
    </span>
  `).join('');
}

// ============================================================
// IPS AUTORIZADAS
// ============================================================
function bindIpForm() {
  const form = document.getElementById('ipForm');
  const resetBtn = document.getElementById('resetIpForm');

  if (!form || !resetBtn) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!hasPermission('canManageIps', activeUser)) {
      alert('Solo el administrador puede gestionar IPs autorizadas.');
      return;
    }

    const ip = {
      nombre: document.getElementById('ipName').value.trim(),
      tipo: document.getElementById('ipType').value,
      inicio: document.getElementById('ipStart').value.trim(),
      fin: document.getElementById('ipEnd').value.trim()
    };

    if (!validateIpRule(ip)) return;

    const payload = buildIpPayload(ip);

    try {
      const editingId = document.getElementById('ipIndex').value.trim();

      await apiFetch(editingId ? `/admin/ips/${editingId}` : '/admin/ips', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      resetIpForm();

      await loadIps();
      renderIps();

      alert('IP autorizada guardada correctamente en MySQL.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar la IP autorizada.');
    }
  });

  resetBtn.addEventListener('click', resetIpForm);
}

function buildIpPayload(ip) {
  if (ip.tipo === 'CIDR') {
    let cidrValue = ip.fin;

    if (ip.fin.startsWith('/')) {
      cidrValue = `${ip.inicio}${ip.fin}`;
    }

    return {
      nombre: ip.nombre,
      tipo: ip.tipo,
      inicio: ip.inicio,
      fin: null,
      cidr: cidrValue
    };
  }

  return {
    nombre: ip.nombre,
    tipo: ip.tipo,
    inicio: ip.inicio,
    fin: ip.tipo === 'RANGO_IP' ? ip.fin : null,
    cidr: null
  };
}

function validateIpRule(ip) {
  if (!ip.nombre || !ip.tipo || !ip.inicio) {
    alert('Complete los datos obligatorios de la regla de IP.');
    return false;
  }

  if (ip.tipo === 'IP_EXACTA') {
    const isValidExactIp = ip.inicio === '::1' || ipv4ToNumber(ip.inicio) !== null;

    if (!isValidExactIp) {
      alert('Ingrese una IP exacta válida. Ejemplo: 192.168.1.10');
      return false;
    }
  }

  if (ip.tipo === 'RANGO_IP') {
    if (!ip.fin) {
      alert('Para rangos debe ingresar IP inicial e IP final.');
      return false;
    }

    if (ipv4ToNumber(ip.inicio) === null || ipv4ToNumber(ip.fin) === null) {
      alert('Para rangos debe ingresar IP inicial e IP final válidas. Ejemplo: 192.168.1.1 - 192.168.1.254');
      return false;
    }

    if (ipv4ToNumber(ip.inicio) > ipv4ToNumber(ip.fin)) {
      alert('La IP inicial no puede ser mayor que la IP final.');
      return false;
    }
  }

  if (ip.tipo === 'CIDR') {
    if (!ip.fin) {
      alert('Para CIDR ingrese el valor en IP fin / CIDR. Ejemplo: /24 o 192.168.1.0/24');
      return false;
    }

    const cidrValue = ip.fin.startsWith('/') ? `${ip.inicio}${ip.fin}` : ip.fin;

    if (!/^\d{1,3}(\.\d{1,3}){3}\/([0-9]|[1-2][0-9]|3[0-2])$/.test(cidrValue)) {
      alert('CIDR inválido. Ejemplo correcto: 192.168.1.0/24');
      return false;
    }
  }

  return true;
}

function resetIpForm() {
  const form = document.getElementById('ipForm');

  if (form) form.reset();

  document.getElementById('ipIndex').value = '';

  applyAdminPermissions();
}

function renderIps() {
  const body = document.getElementById('ipsTable');

  if (!body) return;

  if (!hasPermission('canManageIps', activeUser)) {
    body.innerHTML = '<tr><td colspan="5">Su rol no tiene permiso para ver IPs autorizadas.</td></tr>';
    return;
  }

  if (!adminIps.length) {
    body.innerHTML = '<tr><td colspan="5">No existen IPs autorizadas registradas en MySQL.</td></tr>';
    return;
  }

  body.innerHTML = adminIps.map((ip) => `
    <tr>
      <td>${escapeHtml(ip.nombre)}</td>
      <td>${escapeHtml(ip.tipo)}</td>
      <td>${escapeHtml(ip.inicio || '')}</td>
      <td>${escapeHtml(ip.cidr || ip.fin || 'No aplica')}</td>
      <td>
        <button class="btn btn-secondary btn-small" type="button" onclick="editIp(${ip.id_ip_autorizada})">Editar</button>
        <button class="btn btn-danger btn-small" type="button" onclick="deleteIp(${ip.id_ip_autorizada})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function editIp(id) {
  const ip = adminIps.find((item) => String(item.id_ip_autorizada) === String(id));

  if (!ip) {
    alert('IP no encontrada.');
    return;
  }

  document.getElementById('ipIndex').value = ip.id_ip_autorizada;
  document.getElementById('ipName').value = ip.nombre || '';
  document.getElementById('ipType').value = ip.tipo || 'IP_EXACTA';
  document.getElementById('ipStart').value = ip.inicio || '';
  document.getElementById('ipEnd').value = ip.cidr || ip.fin || '';

  activateTab('ips');
}

async function deleteIp(id) {
  if (!confirm('¿Desea eliminar esta IP autorizada?')) return;

  try {
    await apiFetch(`/admin/ips/${id}`, {
      method: 'DELETE'
    });

    await loadIps();
    renderIps();

    alert('IP eliminada correctamente.');
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudo eliminar la IP.');
  }
}

// ============================================================
// UTILIDADES
// ============================================================
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}