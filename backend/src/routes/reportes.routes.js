const router = require('express').Router();

const { pool } = require('../config/db');
const { requireAuth } = require('../middlewares/auth.middleware');
const { nowParts, buildDateRange } = require('../utils/time.util');

function formatDbDate(value) {
  if (!value) return '';

  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return String(value).slice(0, 10);
}

function getDayNumber(fecha) {
  const date = new Date(`${fecha}T00:00:00`);
  const day = date.getDay();

  return day === 0 ? 7 : day;
}

async function getHolidayMap(fechaInicio, fechaFin) {
  try {
    const [rows] = await pool.query(
      `SELECT fecha, nombre, tipo
       FROM dias_no_laborables
       WHERE fecha BETWEEN ? AND ?
         AND estado = 1`,
      [fechaInicio, fechaFin]
    );

    return new Map(
      rows.map((row) => [formatDbDate(row.fecha), row])
    );
  } catch (error) {
    console.error('No se pudo consultar días no laborables:', error.message);
    return new Map();
  }
}

async function getScheduleForUserDate(idUsuario, fecha) {
  const diaSemana = getDayNumber(fecha);

  try {
    const [rows] = await pool.query(
      `SELECT
          h.id_horario,
          h.nombre_horario,
          hd.es_laborable,
          hd.hora_entrada,
          hd.hora_salida_almuerzo,
          hd.hora_retorno_almuerzo,
          hd.hora_salida
       FROM usuarios_horarios uh
       INNER JOIN horarios h 
          ON h.id_horario = uh.id_horario
       INNER JOIN horario_detalles hd 
          ON hd.id_horario = h.id_horario 
         AND hd.dia_semana = ?
       WHERE uh.id_usuario = ?
         AND uh.estado = 1
         AND h.estado = 1
         AND uh.fecha_inicio <= ?
         AND (uh.fecha_fin IS NULL OR uh.fecha_fin >= ?)
       ORDER BY uh.fecha_inicio DESC
       LIMIT 1`,
      [diaSemana, idUsuario, fecha, fecha]
    );

    return rows[0] || null;
  } catch (error) {
    console.error('No se pudo consultar horario del usuario:', error.message);
    return null;
  }
}

function buildReportRow({ user, date, found, holiday, schedule }) {
  if (found) {
    return {
      fecha: date,
      cedula: user.cedula,
      funcionario: user.funcionario,
      departamento: user.nombre_departamento || '',
      cargo: user.nombre_cargo || '',
      entrada: found.hora_entrada || '',
      salidaAlmuerzo: found.hora_salida_almuerzo || '',
      retornoAlmuerzo: found.hora_retorno_almuerzo || '',
      salida: found.hora_salida || '',
      estado: found.estado_dia || 'INCOMPLETO',
      atraso: Number(found.minutos_atraso || 0) > 0 ? 'Sí' : 'No',
      minutos_atraso: Number(found.minutos_atraso || 0),
      minutos_trabajados: Number(found.minutos_trabajados || 0),
      observacion: found.observacion || ''
    };
  }

  if (holiday) {
    return {
      fecha: date,
      cedula: user.cedula,
      funcionario: user.funcionario,
      departamento: user.nombre_departamento || '',
      cargo: user.nombre_cargo || '',
      entrada: '',
      salidaAlmuerzo: '',
      retornoAlmuerzo: '',
      salida: '',
      estado: 'FERIADO',
      atraso: 'No',
      minutos_atraso: 0,
      minutos_trabajados: 0,
      observacion: holiday.nombre
    };
  }

  if (!schedule || Number(schedule.es_laborable) !== 1) {
    return {
      fecha: date,
      cedula: user.cedula,
      funcionario: user.funcionario,
      departamento: user.nombre_departamento || '',
      cargo: user.nombre_cargo || '',
      entrada: '',
      salidaAlmuerzo: '',
      retornoAlmuerzo: '',
      salida: '',
      estado: 'NO_LABORABLE',
      atraso: 'No',
      minutos_atraso: 0,
      minutos_trabajados: 0,
      observacion: !schedule
        ? 'Sin horario asignado para esta fecha.'
        : 'Día no laborable según horario.'
    };
  }

  return {
    fecha: date,
    cedula: user.cedula,
    funcionario: user.funcionario,
    departamento: user.nombre_departamento || '',
    cargo: user.nombre_cargo || '',
    entrada: '',
    salidaAlmuerzo: '',
    retornoAlmuerzo: '',
    salida: '',
    estado: 'FALTA',
    atraso: 'No',
    minutos_atraso: 0,
    minutos_trabajados: 0,
    observacion: 'Sin marcaciones en día laborable.'
  };
}

router.get('/asistencia', requireAuth, async (req, res, next) => {
  try {
    const now = nowParts();

    const fechaInicio = String(req.query.fecha_inicio || req.query.start || now.date);
    const fechaFin = String(req.query.fecha_fin || req.query.end || fechaInicio);
    const tipo = String(req.query.tipo || 'REPORTE_GENERAL');
    const cedula = String(req.query.cedula || req.query.employee || 'TODOS');

    if (new Date(`${fechaInicio}T00:00:00`) > new Date(`${fechaFin}T00:00:00`)) {
      return res.status(400).json({
        message: 'La fecha de inicio no puede ser mayor que la fecha fin.'
      });
    }

    if (req.auth.rol === 'FUNCIONARIO') {
      if (cedula !== 'TODOS' && cedula !== req.auth.cedula) {
        return res.status(403).json({
          message: 'Solo puede consultar sus propios reportes.'
        });
      }
    }

    const params = [];
    let userWhere = "u.estado = 'ACTIVO'";

    if (req.auth.rol === 'FUNCIONARIO') {
      userWhere += ' AND u.id_usuario = ?';
      params.push(req.auth.id_usuario);
    } else if (cedula !== 'TODOS') {
      userWhere += ' AND u.cedula = ?';
      params.push(cedula);
    }

    const [users] = await pool.query(
      `SELECT
          u.id_usuario,
          u.cedula,
          CONCAT_WS(' ', u.primer_apellido, u.segundo_apellido, u.primer_nombre, u.segundo_nombre) AS funcionario,
          d.nombre_departamento,
          c.nombre_cargo
       FROM usuarios u
       LEFT JOIN departamentos d 
          ON d.id_departamento = u.id_departamento
       LEFT JOIN cargos c 
          ON c.id_cargo = u.id_cargo
       WHERE ${userWhere}
       ORDER BY u.primer_apellido, u.primer_nombre`,
      params
    );

    const [attendance] = await pool.query(
      `SELECT *
       FROM asistencia_diaria
       WHERE fecha BETWEEN ? AND ?`,
      [fechaInicio, fechaFin]
    );

    const attendanceMap = new Map(
      attendance.map((row) => [
        `${row.id_usuario}_${formatDbDate(row.fecha)}`,
        row
      ])
    );

    const holidayMap = await getHolidayMap(fechaInicio, fechaFin);
    const dates = buildDateRange(fechaInicio, fechaFin);

    let rows = [];

    for (const user of users) {
      for (const date of dates) {
        const found = attendanceMap.get(`${user.id_usuario}_${date}`);
        const holiday = holidayMap.get(date);
        const schedule = found ? null : await getScheduleForUserDate(user.id_usuario, date);

        rows.push(buildReportRow({
          user,
          date,
          found,
          holiday,
          schedule
        }));
      }
    }

    if (tipo === 'ATRASOS') {
      rows = rows.filter((row) => row.estado === 'ATRASO');
    }

    if (tipo === 'FALTAS') {
      rows = rows.filter((row) => row.estado === 'FALTA');
    }

    if (tipo === 'MARCACIONES_INCOMPLETAS') {
      rows = rows.filter((row) => row.estado === 'INCOMPLETO');
    }

    if (['ADMINISTRADOR', 'TALENTO_HUMANO', 'CONSULTA'].includes(req.auth.rol)) {
      try {
        await pool.query(
          `INSERT INTO reportes_generados
           (generado_por, tipo_reporte, fecha_inicio, fecha_fin, formato, parametros)
           VALUES (?, ?, ?, ?, 'PANTALLA', ?)`,
          [
            req.auth.id_usuario,
            tipo,
            fechaInicio,
            fechaFin,
            JSON.stringify({ cedula })
          ]
        );
      } catch (reportLogError) {
        console.error('El reporte sí se calculó, pero no se pudo guardar en reportes_generados:', reportLogError.message);
      }
    }

    return res.json({
      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      total: rows.length,
      estadisticas: {
        atrasos: rows.filter((row) => row.estado === 'ATRASO').length,
        faltas: rows.filter((row) => row.estado === 'FALTA').length,
        incompletos: rows.filter((row) => row.estado === 'INCOMPLETO').length,
        completos: rows.filter((row) => row.estado === 'COMPLETO').length,
        feriados: rows.filter((row) => row.estado === 'FERIADO').length,
        no_laborables: rows.filter((row) => row.estado === 'NO_LABORABLE').length
      },
      filas: rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;