const { pool } = require('../config/db');
const { minutesWorked, timeToMinutes } = require('../utils/time.util');
const { getClientIp } = require('../utils/ip.util');

async function syncDailyAttendance(idUsuario, fecha) {
  const [marks] = await pool.query(
    `SELECT tm.codigo, m.hora_marcacion, m.minutos_atraso
     FROM marcaciones m
     INNER JOIN tipos_marcacion tm ON tm.id_tipo_marcacion = m.id_tipo_marcacion
     WHERE m.id_usuario = ? 
       AND m.fecha_marcacion = ? 
       AND m.estado_marcacion <> 'ANULADA'`,
    [idUsuario, fecha]
  );

  const byType = Object.fromEntries(marks.map((m) => [m.codigo, m]));

  const row = {
    entrada: byType.ENTRADA?.hora_marcacion || null,
    salida_almuerzo: byType.SALIDA_ALMUERZO?.hora_marcacion || null,
    retorno_almuerzo: byType.RETORNO_ALMUERZO?.hora_marcacion || null,
    salida: byType.SALIDA?.hora_marcacion || null
  };

  const totalMarks = marks.length;
  const atraso = marks.reduce((sum, item) => sum + Number(item.minutos_atraso || 0), 0);

  const estadoDia = totalMarks === 4
    ? (atraso > 0 ? 'ATRASO' : 'COMPLETO')
    : 'INCOMPLETO';

  const trabajados = totalMarks === 4 ? minutesWorked(row) : 0;

  await pool.query(
    `INSERT INTO asistencia_diaria
      (id_usuario, fecha, hora_entrada, hora_salida_almuerzo, hora_retorno_almuerzo, hora_salida, estado_dia, minutos_atraso, minutos_trabajados, observacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      hora_entrada = VALUES(hora_entrada),
      hora_salida_almuerzo = VALUES(hora_salida_almuerzo),
      hora_retorno_almuerzo = VALUES(hora_retorno_almuerzo),
      hora_salida = VALUES(hora_salida),
      estado_dia = VALUES(estado_dia),
      minutos_atraso = VALUES(minutos_atraso),
      minutos_trabajados = VALUES(minutos_trabajados),
      observacion = VALUES(observacion)`,
    [
      idUsuario,
      fecha,
      row.entrada,
      row.salida_almuerzo,
      row.retorno_almuerzo,
      row.salida,
      estadoDia,
      atraso,
      trabajados,
      null
    ]
  );
}

async function getScheduleForUser(idUsuario, diaSemana) {
  const [rows] = await pool.query(
    `SELECT
        h.id_horario,
        h.nombre_horario,
        h.tolerancia_entrada_minutos,
        h.tolerancia_retorno_almuerzo_minutos,
        hd.es_laborable,
        hd.hora_entrada,
        hd.hora_salida_almuerzo,
        hd.hora_retorno_almuerzo,
        hd.hora_salida
     FROM usuarios_horarios uh
     INNER JOIN horarios h ON h.id_horario = uh.id_horario
     INNER JOIN horario_detalles hd ON hd.id_horario = h.id_horario AND hd.dia_semana = ?
     WHERE uh.id_usuario = ?
       AND uh.estado = 1
       AND h.estado = 1
       AND uh.fecha_inicio <= CURDATE()
       AND (uh.fecha_fin IS NULL OR uh.fecha_fin >= CURDATE())
     ORDER BY uh.fecha_inicio DESC
     LIMIT 1`,
    [diaSemana, idUsuario]
  );

  return rows[0] || null;
}

async function getNextMarkType(idUsuario, fecha) {
  const [marks] = await pool.query(
    `SELECT tm.codigo
     FROM marcaciones m
     INNER JOIN tipos_marcacion tm ON tm.id_tipo_marcacion = m.id_tipo_marcacion
     WHERE m.id_usuario = ? 
       AND m.fecha_marcacion = ? 
       AND m.estado_marcacion <> 'ANULADA'
     ORDER BY tm.orden_marcacion ASC`,
    [idUsuario, fecha]
  );

  const registered = new Set(marks.map((m) => m.codigo));
  const order = ['ENTRADA', 'SALIDA_ALMUERZO', 'RETORNO_ALMUERZO', 'SALIDA'];

  return order.find((code) => !registered.has(code)) || null;
}

function calculateLateMinutes(tipo, horaActual, horario) {
  const actual = timeToMinutes(horaActual);

  if (actual === null || !horario) return 0;

  if (tipo === 'ENTRADA') {
    const base = timeToMinutes(horario.hora_entrada);
    const tolerance = Number(horario.tolerancia_entrada_minutos || 0);

    if (base === null) return 0;

    return Math.max(0, actual - (base + tolerance));
  }

  if (tipo === 'RETORNO_ALMUERZO') {
    const base = timeToMinutes(horario.hora_retorno_almuerzo);
    const tolerance = Number(horario.tolerancia_retorno_almuerzo_minutos || 0);

    if (base === null) return 0;

    return Math.max(0, actual - (base + tolerance));
  }

  return 0;
}

async function logMarkAttempt({
  idUsuario,
  cedula,
  idTipoMarcacion,
  resultado,
  mensaje,
  req
}) {
  await pool.query(
    `INSERT INTO intentos_marcacion
      (id_usuario, cedula_ingresada, id_tipo_marcacion, ip_origen, user_agent, resultado, mensaje)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      idUsuario || null,
      cedula || null,
      idTipoMarcacion || null,
      getClientIp(req),
      req.headers['user-agent'] || null,
      resultado,
      mensaje
    ]
  );
}

module.exports = {
  syncDailyAttendance,
  getScheduleForUser,
  getNextMarkType,
  calculateLateMinutes,
  logMarkAttempt
};