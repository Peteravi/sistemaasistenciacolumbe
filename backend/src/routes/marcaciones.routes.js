const router = require('express').Router();

const { pool } = require('../config/db');
const { requireAuth } = require('../middlewares/auth.middleware');
const { normalizeText } = require('../utils/text.util');
const { nowParts, timeToMinutes } = require('../utils/time.util');
const { getClientIp, validateIp } = require('../utils/ip.util');
const { getAuthUser } = require('../services/user.service');
const { audit } = require('../services/audit.service');
const {
  syncDailyAttendance,
  getScheduleForUser,
  getNextMarkType,
  calculateLateMinutes,
  logMarkAttempt
} = require('../services/attendance.service');

router.get('/hoy', requireAuth, async (req, res, next) => {
  try {
    const now = nowParts();

    const [rows] = await pool.query(
      `SELECT
          m.id_marcacion,
          m.fecha_marcacion AS fecha,
          m.hora_marcacion AS hora,
          tm.codigo AS tipo,
          tm.nombre AS tipoTexto,
          m.ip_origen AS ip,
          m.estado_marcacion AS estado,
          m.minutos_atraso
       FROM marcaciones m
       INNER JOIN tipos_marcacion tm ON tm.id_tipo_marcacion = m.id_tipo_marcacion
       WHERE m.id_usuario = ? 
         AND m.fecha_marcacion = ? 
         AND m.estado_marcacion <> 'ANULADA'
       ORDER BY tm.orden_marcacion ASC`,
      [req.auth.id_usuario, now.date]
    );

    res.json({
      fecha: now.date,
      marcaciones: rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/historial', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);

    const [rows] = await pool.query(
      `SELECT
          m.id_marcacion,
          m.fecha_marcacion AS fecha,
          m.hora_marcacion AS hora,
          tm.codigo AS tipo,
          tm.nombre AS tipoTexto,
          m.ip_origen AS ip,
          m.estado_marcacion AS estado,
          m.minutos_atraso
       FROM marcaciones m
       INNER JOIN tipos_marcacion tm ON tm.id_tipo_marcacion = m.id_tipo_marcacion
       WHERE m.id_usuario = ? 
         AND m.estado_marcacion <> 'ANULADA'
       ORDER BY m.fecha_marcacion DESC, m.hora_marcacion DESC
       LIMIT ?`,
      [req.auth.id_usuario, limit]
    );

    res.json({
      marcaciones: rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const user = await getAuthUser(req);

    if (!user || user.estado !== 'ACTIVO') {
      return res.status(403).json({
        message: 'El usuario no está activo.'
      });
    }

    if (user.nombre_rol === 'CONSULTA') {
      return res.status(403).json({
        message: 'Su rol no tiene permiso para registrar marcaciones.'
      });
    }

    const tipo = normalizeText(req.body.tipo_marcacion || req.body.tipo || '');

    const [tipoRows] = await pool.query(
      'SELECT id_tipo_marcacion, codigo, orden_marcacion FROM tipos_marcacion WHERE codigo = ? AND estado = 1 LIMIT 1',
      [tipo]
    );

    if (!tipoRows.length) {
      return res.status(400).json({
        message: 'Tipo de marcación no reconocido.'
      });
    }

    const tipoMarcacion = tipoRows[0];
    const now = nowParts();
    const ip = getClientIp(req);
    const ipValidation = await validateIp(ip);

    if (!ipValidation.autorizada) {
      await logMarkAttempt({
        idUsuario: user.id_usuario,
        cedula: user.cedula,
        idTipoMarcacion: tipoMarcacion.id_tipo_marcacion,
        resultado: 'IP_NO_AUTORIZADA',
        mensaje: ipValidation.mensaje,
        req
      });

      return res.status(403).json({
        message: ipValidation.mensaje
      });
    }

    const [holidayRows] = await pool.query(
      'SELECT nombre FROM dias_no_laborables WHERE fecha = ? AND estado = 1 LIMIT 1',
      [now.date]
    );

    if (holidayRows.length) {
      await logMarkAttempt({
        idUsuario: user.id_usuario,
        cedula: user.cedula,
        idTipoMarcacion: tipoMarcacion.id_tipo_marcacion,
        resultado: 'DIA_NO_LABORABLE',
        mensaje: holidayRows[0].nombre,
        req
      });

      return res.status(400).json({
        message: `No se puede marcar en día no laborable: ${holidayRows[0].nombre}`
      });
    }

    const horario = await getScheduleForUser(user.id_usuario, now.day);

    if (!horario) {
      return res.status(400).json({
        message: 'No existe horario configurado para el usuario.'
      });
    }

    if (!horario.es_laborable) {
      await logMarkAttempt({
        idUsuario: user.id_usuario,
        cedula: user.cedula,
        idTipoMarcacion: tipoMarcacion.id_tipo_marcacion,
        resultado: 'DIA_NO_LABORABLE',
        mensaje: 'Día no laborable según horario.',
        req
      });

      return res.status(400).json({
        message: 'Hoy no es día laborable según el horario asignado.'
      });
    }

    const nextType = await getNextMarkType(user.id_usuario, now.date);

    if (!nextType) {
      return res.status(400).json({
        message: 'La jornada laboral de hoy ya está completa.'
      });
    }

    if (tipo !== nextType) {
      await logMarkAttempt({
        idUsuario: user.id_usuario,
        cedula: user.cedula,
        idTipoMarcacion: tipoMarcacion.id_tipo_marcacion,
        resultado: 'SECUENCIA_INVALIDA',
        mensaje: `Primero debe registrar ${nextType}.`,
        req
      });

      return res.status(400).json({
        message: `Secuencia inválida. Primero debe registrar: ${nextType}.`
      });
    }

    const scheduleTimeByType = {
      ENTRADA: horario.hora_entrada,
      SALIDA_ALMUERZO: horario.hora_salida_almuerzo,
      RETORNO_ALMUERZO: horario.hora_retorno_almuerzo,
      SALIDA: horario.hora_salida
    };

    if (tipo !== 'ENTRADA') {
      const currentMinutes = timeToMinutes(now.time);
      const configuredMinutes = timeToMinutes(scheduleTimeByType[tipo]);

      if (configuredMinutes !== null && currentMinutes < configuredMinutes) {
        return res.status(400).json({
          message: `Aún no puede registrar ${tipo}. Disponible desde las ${scheduleTimeByType[tipo]}.`
        });
      }
    }

    const lateMinutes = calculateLateMinutes(tipo, now.time, horario);
    const estado = lateMinutes > 0 ? 'ATRASO' : 'VALIDA';

    try {
      const [insertResult] = await pool.query(
        `INSERT INTO marcaciones
          (id_usuario, id_tipo_marcacion, id_ip_autorizada, fecha_marcacion, hora_marcacion, fecha_hora_servidor, ip_origen, user_agent, estado_marcacion, minutos_atraso, observacion, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id_usuario,
          tipoMarcacion.id_tipo_marcacion,
          ipValidation.regla?.id_ip_autorizada || null,
          now.date,
          now.time,
          now.dateTime,
          ip,
          req.headers['user-agent'] || null,
          estado,
          lateMinutes,
          lateMinutes > 0 ? `Atraso de ${lateMinutes} minuto(s)` : null,
          user.id_usuario
        ]
      );

      await syncDailyAttendance(user.id_usuario, now.date);

      await logMarkAttempt({
        idUsuario: user.id_usuario,
        cedula: user.cedula,
        idTipoMarcacion: tipoMarcacion.id_tipo_marcacion,
        resultado: 'PERMITIDO',
        mensaje: 'Marcación registrada.',
        req
      });

      await audit({
        usuarioId: user.id_usuario,
        accion: 'CREAR_MARCACION',
        tabla: 'marcaciones',
        idRegistro: insertResult.insertId,
        descripcion: `Marcación ${tipo}`,
        datosNuevos: {
          tipo,
          fecha: now.date,
          hora: now.time,
          estado
        },
        req
      });

      return res.status(201).json({
        message: 'Marcación registrada correctamente.',
        id_marcacion: insertResult.insertId,
        fecha: now.date,
        fecha_marcacion: now.date,
        hora: now.time,
        hora_marcacion: now.time,
        tipo,
        ip,
        ip_origen: ip,
        estado,
        minutos_atraso: lateMinutes
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        await logMarkAttempt({
          idUsuario: user.id_usuario,
          cedula: user.cedula,
          idTipoMarcacion: tipoMarcacion.id_tipo_marcacion,
          resultado: 'MARCACION_REPETIDA',
          mensaje: 'Marcación repetida.',
          req
        });

        return res.status(409).json({
          message: `La marcación ${tipo} ya fue registrada hoy.`
        });
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;