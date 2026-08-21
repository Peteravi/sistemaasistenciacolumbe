const APP_CONFIG = {
  // En local y en Vercel el frontend consume la API del mismo dominio.
  apiBase: localStorage.getItem('apiBase') || '/api',
  demoMode: ['localhost', '127.0.0.1'].includes(window.location.hostname),
  storageKeys: {
    currentUser: 'columbe_current_user',
    users: 'columbe_demo_users',
    schedules: 'columbe_demo_schedules',
    departments: 'columbe_demo_departments',
    positions: 'columbe_demo_positions',
    ips: 'columbe_demo_ips',
    marks: 'columbe_demo_marks'
  },
  defaultScheduleName: 'Horario institucional general'
};

const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  TALENTO_HUMANO: 'TALENTO_HUMANO',
  FUNCIONARIO: 'FUNCIONARIO',
  CONSULTA: 'CONSULTA'
};

const ROLE_LABELS = {
  ADMINISTRADOR: 'Administrador',
  TALENTO_HUMANO: 'Talento Humano / Secretaría',
  FUNCIONARIO: 'Funcionario',
  CONSULTA: 'Consulta / Auditoría'
};

const PERMISSIONS = {
  ADMINISTRADOR: {
    canMark: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageAdministrators: true,
    canManageSchedules: true,
    canManageStructure: true,
    canManageIps: true,
    canDeleteUsers: true,
    canDeleteSchedules: true,
    canDeleteStructure: true,
    canDeleteIps: true,
    canViewOwnReports: true,
    canViewAllReports: true,
    allowedAssignableRoles: ['ADMINISTRADOR', 'TALENTO_HUMANO', 'FUNCIONARIO', 'CONSULTA']
  },

  TALENTO_HUMANO: {
    canMark: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageAdministrators: false,
    canManageSchedules: true,
    canManageStructure: true,
    canManageIps: false,
    canDeleteUsers: false,
    canDeleteSchedules: false,
    canDeleteStructure: false,
    canDeleteIps: false,
    canViewOwnReports: true,
    canViewAllReports: true,
    allowedAssignableRoles: ['FUNCIONARIO', 'CONSULTA']
  },

  FUNCIONARIO: {
    canMark: true,
    canAccessAdmin: false,
    canManageUsers: false,
    canManageAdministrators: false,
    canManageSchedules: false,
    canManageStructure: false,
    canManageIps: false,
    canDeleteUsers: false,
    canDeleteSchedules: false,
    canDeleteStructure: false,
    canDeleteIps: false,
    canViewOwnReports: true,
    canViewAllReports: false,
    allowedAssignableRoles: []
  },

  CONSULTA: {
    canMark: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canManageAdministrators: false,
    canManageSchedules: false,
    canManageStructure: false,
    canManageIps: false,
    canDeleteUsers: false,
    canDeleteSchedules: false,
    canDeleteStructure: false,
    canDeleteIps: false,
    canViewOwnReports: false,
    canViewAllReports: true,
    allowedAssignableRoles: []
  }
};

const DEMO_USERS = [
  {
    cedula: '0604462911',
    password: '2911LUISANILEMA',
    nombre: 'ANILEMA MORALES LUIS EDUARDO',
    cargo: 'OPERADOR DE RETROEXCAVADORA',
    departamento: 'Transporte y Maquinaria',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060439159',
    password: '9159EDELBERTOATUPANA',
    nombre: 'ATUPAÑA CHIMBOLEMA EDELBERTO',
    cargo: 'VOCAL ALTERNO PRINCIPALIZADO',
    departamento: 'Vocalías',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '0603263963',
    password: '3963JOSECEPEDA',
    nombre: 'CEPEDA GUAMAN JOSE IGNACIO',
    cargo: 'PRESIDENTE',
    departamento: 'Presidencia',
    rol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '061487648',
    password: '7648ANACHACHA',
    nombre: 'CHACHA RIOS ANA LASTENIA',
    cargo: 'AUXILIAR DE SERVICIO',
    departamento: 'Servicios Generales',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060199768',
    password: '9768JOSECHIMBOLEMA',
    nombre: 'CHIMBOLEMA MORALES JOSE DOMINGO',
    cargo: 'VOCAL ALTERNO',
    departamento: 'Vocalías',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060326232',
    password: '6232JOSECHUCURI',
    nombre: 'CHUCURI MALAN JOSE MANUEL',
    cargo: 'VOCAL PRINCIPAL',
    departamento: 'Vocalías',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '0603209172',
    password: '9172GUILERMOGUALI',
    nombre: 'GUALI AÑALLA GUILERMO RAUL',
    cargo: 'TECNICO DE PLANIFICACION',
    departamento: 'Planificación',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060439066',
    password: '9066VICTORGUAMANA',
    nombre: 'GUAMANA GUALLI VICTOR JAIME',
    cargo: 'CHOFER DE VEHICULO',
    departamento: 'Transporte y Maquinaria',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060421853',
    password: '1853JOSENARANJO',
    nombre: 'NARANJO ATUPAÑA JOSE MANUEL',
    cargo: 'CHOFER DE VOLQUETE',
    departamento: 'Transporte y Maquinaria',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060334896',
    password: '4896WILFRIDOPARCO',
    nombre: 'PARCO CHICAIZA WILFRIDO',
    cargo: 'SECRETARIO/TESORERO',
    departamento: 'Secretaría/Tesorería',
    rol: 'TALENTO_HUMANO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '060389512',
    password: '9512LUISYAMBAY',
    nombre: 'YAMBAY SATAY LUIS FERNANDO',
    cargo: 'VOCAL PRINCIPAL',
    departamento: 'Vocalías',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
  {
    cedula: '1750014092',
    password: '4092MIRYAMCHUMA',
    nombre: 'CHUMA MINA GUA MIRYAM ALEXANDRA',
    cargo: 'VOCAL PRINCIPAL',
    departamento: 'Vocalías',
    rol: 'FUNCIONARIO',
    estado: 'ACTIVO',
    horario: APP_CONFIG.defaultScheduleName
  },
];

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedFrontendData() {
  if (!APP_CONFIG.demoMode) return;

  if (!localStorage.getItem(APP_CONFIG.storageKeys.users)) {
    setStored(APP_CONFIG.storageKeys.users, DEMO_USERS);
  }

  if (!localStorage.getItem(APP_CONFIG.storageKeys.schedules)) {
    setStored(APP_CONFIG.storageKeys.schedules, [
      {
        nombre: APP_CONFIG.defaultScheduleName,
        entrada: '08:00',
        salidaAlmuerzo: '12:00',
        retornoAlmuerzo: '13:00',
        salida: '16:30',
        tolerancia: 10
      }
    ]);
  }

  if (!localStorage.getItem(APP_CONFIG.storageKeys.departments)) {
    setStored(APP_CONFIG.storageKeys.departments, [
      'Presidencia',
      'Secretaría/Tesorería',
      'Vocalías',
      'Planificación',
      'Servicios Generales',
      'Transporte y Maquinaria'
    ]);
  }

  if (!localStorage.getItem(APP_CONFIG.storageKeys.positions)) {
    setStored(APP_CONFIG.storageKeys.positions, [
      'PRESIDENTE',
      'SECRETARIO/TESORERO',
      'VOCAL PRINCIPAL',
      'VOCAL ALTERNO',
      'VOCAL ALTERNO PRINCIPALIZADO',
      'TECNICO DE PLANIFICACION',
      'AUXILIAR DE SERVICIO',
      'OPERADOR DE RETROEXCAVADORA',
      'CHOFER DE VEHICULO',
      'CHOFER DE VOLQUETE'
    ]);
  }

  if (!localStorage.getItem(APP_CONFIG.storageKeys.ips)) {
    setStored(APP_CONFIG.storageKeys.ips, [
      { nombre: 'Localhost desarrollo IPv4', tipo: 'IP_EXACTA', inicio: '127.0.0.1', fin: '' },
      { nombre: 'Localhost desarrollo IPv6', tipo: 'IP_EXACTA', inicio: '::1', fin: '' },
      { nombre: 'Red institucional de ejemplo', tipo: 'RANGO_IP', inicio: '192.168.1.1', fin: '192.168.1.254' }
    ]);
  }

  if (!localStorage.getItem(APP_CONFIG.storageKeys.marks)) {
    setStored(APP_CONFIG.storageKeys.marks, []);
  }
}

function getCurrentUser() {
  return getStored(APP_CONFIG.storageKeys.currentUser, null);
}

function setCurrentUser(user) {
  setStored(APP_CONFIG.storageKeys.currentUser, user);
}

function clearCurrentUser() {
  localStorage.removeItem(APP_CONFIG.storageKeys.currentUser);
}

function getRolePermissions(role) {
  return PERMISSIONS[role] || PERMISSIONS.FUNCIONARIO;
}

function hasPermission(permission, user = getCurrentUser()) {
  if (!user || !user.rol) return false;
  return Boolean(getRolePermissions(user.rol)[permission]);
}

function canAssignRole(targetRole, user = getCurrentUser()) {
  if (!user || !targetRole) return false;
  const allowedRoles = getRolePermissions(user.rol).allowedAssignableRoles || [];
  return allowedRoles.includes(targetRole);
}

function requireAuth(allowedRoles = []) {
  seedFrontendData();

  const user = getCurrentUser();

  if (!user) {
    window.location.href = 'index.html';
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.rol)) {
    window.location.href = 'marcaciones.html';
    return null;
  }

  renderSessionUser(user);
  return user;
}

function renderSessionUser(user) {
  const nameEl = document.getElementById('currentUserName');
  const roleEl = document.getElementById('currentUserRole');

  if (nameEl) nameEl.textContent = user.nombre;
  if (roleEl) roleEl.textContent = formatRole(user.rol);

  document.querySelectorAll('.admin-only').forEach((element) => {
    element.style.display = hasPermission('canAccessAdmin', user) ? '' : 'none';
  });

  document.querySelectorAll('.reportes-globales-only').forEach((element) => {
    element.style.display = hasPermission('canViewAllReports', user) ? '' : 'none';
  });
}

function formatRole(role) {
  return ROLE_LABELS[role] || role || 'Sin rol';
}

function bindLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    clearCurrentUser();
    window.location.href = 'index.html';
  });
}

async function apiFetch(path, options = {}) {
  const user = getCurrentUser();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (user?.token && user.token !== 'demo-token') {
    headers.Authorization = `Bearer ${user.token}`;
  }

  const response = await fetch(`${APP_CONFIG.apiBase}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'No se pudo completar la solicitud');
  }

  return response.json();
}

function showMessage(targetId, message, type = 'info') {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.className = `form-message show ${type}`;
  target.textContent = message;
}

function hideMessage(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.className = 'form-message';
  target.textContent = '';
}

function todayISO() {
  return toISODateLocal(new Date());
}

function toISODateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateEs(dateInput) {
  const date = new Date(`${dateInput}T00:00:00`);
  return date.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

function roleBadgeClass(value) {
  if (value === 'ACTIVO' || value === 'VALIDA' || value === 'COMPLETO') return 'active';
  if (value === 'ATRASO' || value === 'INCOMPLETO' || value === 'TEMPRANA') return 'warning';
  return 'danger';
}

function timeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;

  const [hours, minutes] = value.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

function dateToMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizeIp(ip) {
  return String(ip || '').trim().replace(/^::ffff:/, '');
}

function ipv4ToNumber(ip) {
  const cleanIp = normalizeIp(ip);
  const parts = cleanIp.split('.').map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }

  return parts.reduce((accumulator, part) => (accumulator * 256) + part, 0);
}

function isIpAllowed(ip, rules = getStored(APP_CONFIG.storageKeys.ips, [])) {
  const cleanIp = normalizeIp(ip);

  if (!cleanIp) return false;

  return rules.some((rule) => {
    if (!rule || !rule.inicio) return false;

    const start = normalizeIp(rule.inicio);
    const end = normalizeIp(rule.fin);

    if (rule.tipo === 'IP_EXACTA') {
      return cleanIp === start;
    }

    if (rule.tipo === 'RANGO_IP') {
      const currentNumber = ipv4ToNumber(cleanIp);
      const startNumber = ipv4ToNumber(start);
      const endNumber = ipv4ToNumber(end);

      if (currentNumber === null || startNumber === null || endNumber === null) return false;

      return currentNumber >= startNumber && currentNumber <= endNumber;
    }

    return false;
  });
}

function getActiveSchedule(user = getCurrentUser()) {
  const schedules = getStored(APP_CONFIG.storageKeys.schedules, []);

  if (!schedules.length) return null;

  const scheduleName =
    user?.horario ||
    user?.horarioNombre ||
    user?.scheduleName ||
    APP_CONFIG.defaultScheduleName;

  return schedules.find((schedule) => schedule.nombre === scheduleName) || schedules[0];
}

// ============================================================
// TOASTS / NOTIFICACIONES GLOBALES
// ============================================================

function inferToastType(message) {
  const text = String(message || '').toLowerCase();

  if (
    text.includes('correctamente') ||
    text.includes('creado') ||
    text.includes('creada') ||
    text.includes('actualizado') ||
    text.includes('actualizada') ||
    text.includes('guardado') ||
    text.includes('guardada') ||
    text.includes('eliminado') ||
    text.includes('eliminada') ||
    text.includes('desactivado') ||
    text.includes('generado')
  ) {
    return 'success';
  }

  if (
    text.includes('no se pudo') ||
    text.includes('error') ||
    text.includes('inválid') ||
    text.includes('incorrect') ||
    text.includes('fall') ||
    text.includes('denegado') ||
    text.includes('sin permiso') ||
    text.includes('no tiene permiso')
  ) {
    return 'error';
  }

  if (
    text.includes('complete') ||
    text.includes('ingrese') ||
    text.includes('debe') ||
    text.includes('seleccione') ||
    text.includes('advertencia') ||
    text.includes('atención')
  ) {
    return 'warning';
  }

  return 'info';
}

function getToastTitle(type) {
  const titles = {
    success: 'Operación exitosa',
    error: 'No se pudo completar',
    warning: 'Atención',
    info: 'Información'
  };

  return titles[type] || titles.info;
}

function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '!',
    warning: '⚠',
    info: 'i'
  };

  return icons[type] || icons.info;
}

function ensureToastContainer() {
  let container = document.getElementById('toastContainer');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  return container;
}

function showToast(message, type = 'info', options = {}) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');

  const finalType = type || inferToastType(message);
  const duration = Number(options.duration || 4200);

  toast.className = `app-toast ${finalType}`;
  toast.innerHTML = `
    <div class="toast-icon">${getToastIcon(finalType)}</div>
    <div class="toast-content">
      <p class="toast-title">${options.title || getToastTitle(finalType)}</p>
      <p class="toast-message"></p>
    </div>
    <button class="toast-close" type="button" aria-label="Cerrar notificación">×</button>
  `;

  toast.querySelector('.toast-message').textContent = String(message || '');

  const closeToast = () => {
    toast.style.animation = 'toastOut .18s ease-in forwards';
    setTimeout(() => toast.remove(), 180);
  };

  toast.querySelector('.toast-close').addEventListener('click', closeToast);

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }

  return toast;
}

function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    overlay.innerHTML = `
      <div class="confirm-box">
        <h3>${options.title || 'Confirmar acción'}</h3>
        <p></p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" type="button" data-action="cancel">
            ${options.cancelText || 'Cancelar'}
          </button>
          <button class="btn btn-danger" type="button" data-action="confirm">
            ${options.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('p').textContent = String(message || '');

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false);
    });

    document.addEventListener('keydown', function onEscape(event) {
      if (event.key === 'Escape') {
        document.removeEventListener('keydown', onEscape);
        close(false);
      }
    });

    document.body.appendChild(overlay);
  });
}

// Reemplaza los alert() normales por toast en todo el sistema.
window.showToast = showToast;
window.showConfirm = showConfirm;

window.alert = function customAlert(message) {
  showToast(String(message || ''), inferToastType(message));
};

seedFrontendData();
