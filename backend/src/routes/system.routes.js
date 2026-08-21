const router = require('express').Router();

const { pool } = require('../config/db');
const { TZ } = require('../config/env');
const { nowParts } = require('../utils/time.util');
const { getClientIp, validateIp } = require('../utils/ip.util');

router.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'API del sistema GAD Columbe disponible.',
    endpoints: {
      health: '/api/health',
      horaServidor: '/api/sistema/hora',
      login: '/api/auth/login',
      marcaciones: '/api/marcaciones',
      usuarios: '/api/admin/usuarios',
      reportes: '/api/reportes/asistencia'
    }
  });
});

router.get('/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      ok: true,
      message: 'Backend conectado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sistema/hora', async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const validation = await validateIp(ip);
    const now = nowParts();

    res.json({
      fecha_hora_servidor: now.dateTime,
      fecha: now.date,
      hora: now.time,
      zona_horaria: TZ,
      ip_origen: ip,
      ip_autorizada: validation.autorizada,
      mensaje_ip: validation.mensaje
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;