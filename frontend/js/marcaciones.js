let activeUser = null;
let serverClock = new Date();
let serverClockTimer = null;
let serverAvailable = false;
let detectedIpValue = '';
let ipAuthorized = false;
let ipValidationMessage = 'Validación pendiente';

const MARK_ORDER = ['ENTRADA', 'SALIDA_ALMUERZO', 'RETORNO_ALMUERZO', 'SALIDA'];

const MARK_LABELS = {
  ENTRADA: 'Entrada',
  SALIDA_ALMUERZO: 'Salida a almuerzo',
  RETORNO_ALMUERZO: 'Retorno de almuerzo',
  SALIDA: 'Salida final'
};

const MARK_SCHEDULE_FIELD = {
  ENTRADA: 'entrada',
  SALIDA_ALMUERZO: 'salidaAlmuerzo',
  RETORNO_ALMUERZO: 'retornoAlmuerzo',
  SALIDA: 'salida'
};

document.addEventListener('DOMContentLoaded', async () => {
  activeUser = requireAuth();

  if (!activeUser) return;

  bindLogout();

  await loadServerInfo();

  renderTodayMarks();
  renderHistory();
  bindMarkButtons();
});

async function loadServerInfo() {
  try {
    const result = await apiFetch('/sistema/hora');

    const serverDateValue =
      result.fecha_hora_servidor ||
      result.fechaHoraServidor ||
      result.fecha;

    serverClock = serverDateValue ? new Date(serverDateValue) : new Date();
    serverAvailable = true;

    detectedIpValue =
      result.ip_origen ||
      result.ipOrigen ||
      result.ip ||
      '';

    if (detectedIpValue) {
      document.getElementById('detectedIp').textContent = detectedIpValue;
    } else {
      document.getElementById('detectedIp').textContent = 'IP validada por backend';
    }

    const backendIpFlag = result.ip_autorizada ?? result.ipAutorizada;

    if (backendIpFlag === true) {
      ipAuthorized = true;
      ipValidationMessage = 'IP institucional autorizada';
      setIpStatus('Autorizada', 'success');
    } else if (backendIpFlag === false) {
      ipAuthorized = false;
      ipValidationMessage = 'La IP actual no pertenece a la red institucional autorizada.';
      setIpStatus('No autorizada', 'danger');
    } else if (detectedIpValue) {
      ipAuthorized = isIpAllowed(detectedIpValue);
      ipValidationMessage = ipAuthorized
        ? 'IP autorizada por regla local.'
        : 'La IP detectada no coincide con las reglas autorizadas.';

      setIpStatus(
        ipAuthorized ? 'Autorizada' : 'No autorizada',
        ipAuthorized ? 'success' : 'danger'
      );
    } else {
      ipAuthorized = true;
      ipValidationMessage = 'Backend conectado. Agregue ip_autorizada al endpoint para validación estricta.';
      setIpStatus('Validación backend', 'success');
    }

    document.getElementById('serverMode').textContent = 'Servidor';
    document.getElementById('serverMode').className = 'status-chip success';
  } catch (error) {
    serverAvailable = false;
    serverClock = new Date();

    detectedIpValue = '127.0.0.1';
    ipAuthorized = isIpAllowed(detectedIpValue);

    ipValidationMessage = ipAuthorized
      ? 'Modo demostración autorizado por regla localhost.'
      : 'Modo demostración: localhost no está en la lista de IPs autorizadas.';

    document.getElementById('serverMode').textContent = 'Modo demostración';
    document.getElementById('serverMode').className = 'status-chip warning';
    document.getElementById('detectedIp').textContent = detectedIpValue;

    setIpStatus(
      ipAuthorized ? 'Demo autorizada' : 'No autorizada',
      ipAuthorized ? 'warning' : 'danger'
    );
  }

  renderClock();

  clearInterval(serverClockTimer);

  serverClockTimer = setInterval(() => {
    serverClock = new Date(serverClock.getTime() + 1000);
    renderClock();
    renderTodayMarks();
  }, 1000);
}

function renderClock() {
  document.getElementById('serverTime').textContent = serverClock.toLocaleTimeString('es-EC', {
    hour12: false
  });

  document.getElementById('serverDate').textContent = serverClock.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

function setIpStatus(text, type) {
  const ipStatus = document.getElementById('ipStatus');

  ipStatus.textContent = text;
  ipStatus.className = `status-chip ${type}`;
}

function bindMarkButtons() {
  document.querySelectorAll('.mark-card').forEach((button) => {
    button.addEventListener('click', () => registerMark(button.dataset.type));
  });
}

function getServerDateISO() {
  return toISODateLocal(serverClock);
}

function getUserMarks() {
  const allMarks = getStored(APP_CONFIG.storageKeys.marks, []);

  return allMarks.filter((mark) => mark.cedula === activeUser.cedula);
}

function getTodayMarks() {
  const currentDate = getServerDateISO();

  return getUserMarks().filter((mark) => mark.fecha === currentDate);
}

function getNextMarkType(todayMarks = getTodayMarks()) {
  const registeredTypes = todayMarks.map((mark) => mark.tipo);

  return MARK_ORDER.find((type) => !registeredTypes.includes(type)) || null;
}

function renderTodayMarks() {
  const todayMarks = getTodayMarks();
  const registeredTypes = todayMarks.map((mark) => mark.tipo);
  const nextType = getNextMarkType(todayMarks);

  MARK_ORDER.forEach((type) => {
    const button = document.querySelector(`[data-type="${type}"]`);
    const timeLabel = document.getElementById(`time-${type}`);
    const mark = todayMarks.find((item) => item.tipo === type);

    if (!button || !timeLabel) return;

    if (mark) {
      button.classList.add('done');
      button.disabled = true;
      button.title = `${MARK_LABELS[type]} registrada a las ${mark.hora}`;
      timeLabel.textContent = mark.hora;
      return;
    }

    const validation = validateMarkRequest(type);

    button.classList.remove('done');
    button.disabled = !validation.allowed;
    button.title = validation.message;

    if (type !== nextType) {
      const requiredType = nextType ? MARK_LABELS[nextType] : 'Jornada completa';
      timeLabel.textContent = nextType ? `Primero: ${requiredType}` : 'Completado';
    } else if (!validation.allowed && validation.availableAt) {
      timeLabel.textContent = `Desde ${validation.availableAt}`;
    } else if (!validation.allowed) {
      timeLabel.textContent = 'Bloqueado';
    } else {
      timeLabel.textContent = 'Disponible';
    }
  });

  const dayStatus = document.getElementById('dayStatus');

  if (registeredTypes.length === MARK_ORDER.length) {
    dayStatus.textContent = 'Jornada completa';
    dayStatus.className = 'status-chip success';
  } else if (!ipAuthorized) {
    dayStatus.textContent = 'IP no autorizada';
    dayStatus.className = 'status-chip danger';
  } else {
    dayStatus.textContent = 'En proceso';
    dayStatus.className = 'status-chip warning';
  }
}

function validateMarkRequest(type) {
  const schedule = getActiveSchedule(activeUser);
  const todayMarks = getTodayMarks();
  const registeredTypes = todayMarks.map((mark) => mark.tipo);
  const nextType = getNextMarkType(todayMarks);

  if (!hasPermission('canMark', activeUser)) {
    return {
      allowed: false,
      message: 'Su rol no tiene permiso para registrar marcaciones.'
    };
  }

  if (!MARK_ORDER.includes(type)) {
    return {
      allowed: false,
      message: 'Tipo de marcación no reconocido.'
    };
  }

  if (!ipAuthorized) {
    return {
      allowed: false,
      message: ipValidationMessage || 'La IP actual no está autorizada para marcar asistencia.'
    };
  }

  if (!schedule) {
    return {
      allowed: false,
      message: 'No existe un horario configurado para validar la jornada.'
    };
  }

  if (registeredTypes.includes(type)) {
    return {
      allowed: false,
      message: `La marcación ${MARK_LABELS[type]} ya fue registrada hoy.`
    };
  }

  if (type !== nextType) {
    return {
      allowed: false,
      message: nextType
        ? `Secuencia inválida. Primero debe registrar: ${MARK_LABELS[nextType]}.`
        : 'La jornada laboral de hoy ya está completa.'
    };
  }

  const scheduleField = MARK_SCHEDULE_FIELD[type];
  const configuredTime = schedule[scheduleField];
  const configuredMinutes = timeToMinutes(configuredTime);
  const currentMinutes = dateToMinutes(serverClock);

  if (type !== 'ENTRADA' && configuredMinutes !== null && currentMinutes < configuredMinutes) {
    return {
      allowed: false,
      availableAt: configuredTime,
      message: `Aún no puede registrar ${MARK_LABELS[type]}. Disponible desde las ${configuredTime}.`
    };
  }

  return {
    allowed: true,
    message: `Puede registrar ${MARK_LABELS[type]}.`
  };
}

async function registerMark(type) {
  hideMessage('markMessage');

  const validation = validateMarkRequest(type);

  if (!validation.allowed) {
    showMessage('markMessage', validation.message, 'error');
    renderTodayMarks();
    return;
  }

  const shouldUseDemoFallback = !serverAvailable || activeUser.token === 'demo-token';

  try {
    if (!shouldUseDemoFallback) {
      const result = await apiFetch('/marcaciones', {
        method: 'POST',
        body: JSON.stringify({
          tipo_marcacion: type
        })
      });

      persistLocalMark(type, result, 'Servidor');

      showMessage(
        'markMessage',
        result.message || 'Marcación registrada correctamente.',
        'success'
      );
    } else {
      throw new Error('Modo demostración activo');
    }
  } catch (backendError) {
    if (!shouldUseDemoFallback) {
      showMessage(
        'markMessage',
        backendError.message || 'No se pudo registrar la marcación.',
        'error'
      );
      return;
    }

    persistLocalMark(type, {}, 'Modo demostración');

    showMessage(
      'markMessage',
      'Marcación registrada en modo demostración. Al conectar Node.js se usará la hora real del servidor y la IP validada por backend.',
      'success'
    );
  }

  renderTodayMarks();
  renderHistory();
}

function persistLocalMark(type, backendResult = {}, sourceLabel = 'Servidor') {
  const allMarks = getStored(APP_CONFIG.storageKeys.marks, []);
  const now = new Date(serverClock);

  const fecha =
    backendResult.fecha ||
    backendResult.fecha_marcacion ||
    getServerDateISO();

  const hora =
    backendResult.hora ||
    backendResult.hora_marcacion ||
    now.toLocaleTimeString('es-EC', { hour12: false });

  const alreadyExists = allMarks.some((mark) => (
    mark.cedula === activeUser.cedula &&
    mark.fecha === fecha &&
    mark.tipo === type
  ));

  if (alreadyExists) return;

  const mark = {
    cedula: activeUser.cedula,
    funcionario: activeUser.nombre,
    fecha,
    tipo: type,
    tipoTexto: MARK_LABELS[type],
    hora,
    ip:
      backendResult.ip ||
      backendResult.ip_origen ||
      backendResult.ipOrigen ||
      detectedIpValue ||
      sourceLabel,
    estado: backendResult.estado || calculateMarkStatus(type, now)
  };

  allMarks.push(mark);

  setStored(APP_CONFIG.storageKeys.marks, allMarks);
}

function calculateMarkStatus(type, date) {
  const schedule = getActiveSchedule(activeUser);

  if (!schedule) return 'VALIDA';

  const totalMinutes = dateToMinutes(date);

  if (type === 'ENTRADA') {
    const entryMinutes = timeToMinutes(schedule.entrada);
    const tolerance = Number(schedule.tolerancia || 0);

    if (entryMinutes === null) return 'VALIDA';

    return totalMinutes > entryMinutes + tolerance ? 'ATRASO' : 'VALIDA';
  }

  const configuredTime = schedule[MARK_SCHEDULE_FIELD[type]];
  const configuredMinutes = timeToMinutes(configuredTime);

  if (configuredMinutes !== null && totalMinutes < configuredMinutes) {
    return 'TEMPRANA';
  }

  return 'VALIDA';
}

function renderHistory() {
  const body = document.getElementById('historyBody');
  const marks = getUserMarks().slice().reverse().slice(0, 20);

  if (!marks.length) {
    body.innerHTML = '<tr><td colspan="5">No existen marcaciones registradas todavía.</td></tr>';
    return;
  }

  body.innerHTML = marks.map((mark) => `
    <tr>
      <td>${mark.fecha}</td>
      <td>${mark.tipoTexto || MARK_LABELS[mark.tipo]}</td>
      <td>${mark.hora}</td>
      <td>${mark.ip || 'No registrada'}</td>
      <td><span class="badge ${roleBadgeClass(mark.estado)}">${mark.estado}</span></td>
    </tr>
  `).join('');
}