const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');
const { JWT_SECRET } = require('../config/env');
const { sha256 } = require('../utils/crypto.util');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      message: 'Token no enviado. Inicie sesión nuevamente.'
    });
  }

  const tokenHash = sha256(token);

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const [sessions] = await pool.query(
      `SELECT
          s.id_sesion,
          s.id_usuario,
          s.estado AS estado_sesion,
          u.estado AS estado_usuario,
          r.nombre_rol
       FROM sesiones s
       INNER JOIN usuarios u ON u.id_usuario = s.id_usuario
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE s.token_hash = ?
         AND s.estado = 'ACTIVA'
         AND s.fecha_fin IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    if (!sessions.length) {
      return res.status(401).json({
        message: 'La sesión fue cerrada o ya no está activa. Inicie sesión nuevamente.'
      });
    }

    const session = sessions[0];

    if (Number(session.id_usuario) !== Number(payload.id_usuario)) {
      await pool.query(
        "UPDATE sesiones SET estado = 'CERRADA', fecha_fin = NOW() WHERE id_sesion = ?",
        [session.id_sesion]
      );

      return res.status(401).json({
        message: 'Sesión inválida. Inicie sesión nuevamente.'
      });
    }

    if (session.estado_usuario !== 'ACTIVO') {
      await pool.query(
        "UPDATE sesiones SET estado = 'CERRADA', fecha_fin = NOW() WHERE id_sesion = ?",
        [session.id_sesion]
      );

      return res.status(403).json({
        message: 'El usuario ya no está activo.'
      });
    }

    req.auth = {
      ...payload,
      rol: session.nombre_rol,
      token_hash: tokenHash,
      id_sesion: session.id_sesion
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      await pool.query(
        "UPDATE sesiones SET estado = 'EXPIRADA', fecha_fin = NOW() WHERE token_hash = ? AND estado = 'ACTIVA'",
        [tokenHash]
      );
    }

    return res.status(401).json({
      message: 'Sesión inválida o vencida.'
    });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.rol)) {
      return res.status(403).json({
        message: 'No tiene permisos para realizar esta acción.'
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  allowRoles
};