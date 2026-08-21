const router = require('express').Router();
const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { sha256 } = require('../utils/crypto.util');
const { getClientIp } = require('../utils/ip.util');
const { userPublic } = require('../utils/user.util');
const { requireAuth } = require('../middlewares/auth.middleware');
const { getAuthUser, logLoginAttempt } = require('../services/user.service');

router.post('/login', async (req, res, next) => {
  try {
    const cedula = String(req.body.cedula || '').trim();
    const password = String(req.body.password || '').trim();

    if (!cedula || !password) {
      return res.status(400).json({
        message: 'Ingrese cédula y contraseña.'
      });
    }

    const [rows] = await pool.query(
      `SELECT
          u.*,
          CONCAT_WS(' ', u.primer_apellido, u.segundo_apellido, u.primer_nombre, u.segundo_nombre) AS nombre_completo,
          r.nombre_rol,
          d.nombre_departamento,
          c.nombre_cargo,
          h.nombre_horario
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       LEFT JOIN departamentos d ON d.id_departamento = u.id_departamento
       LEFT JOIN cargos c ON c.id_cargo = u.id_cargo
       LEFT JOIN usuarios_horarios uh ON uh.id_usuario = u.id_usuario AND uh.estado = 1 AND uh.fecha_fin IS NULL
       LEFT JOIN horarios h ON h.id_horario = uh.id_horario
       WHERE u.cedula = ? OR u.usuario = ?
       LIMIT 1`,
      [cedula, cedula]
    );

    if (!rows.length) {
      await logLoginAttempt({
        cedula,
        resultado: 'CEDULA_NO_EXISTE',
        mensaje: 'La cédula no existe.',
        req
      });

      return res.status(401).json({
        message: 'Credenciales incorrectas.'
      });
    }

    const user = rows[0];

    if (user.estado === 'INACTIVO') {
      await logLoginAttempt({
        cedula,
        idUsuario: user.id_usuario,
        resultado: 'USUARIO_INACTIVO',
        mensaje: 'Usuario inactivo.',
        req
      });

      return res.status(403).json({
        message: 'El usuario está inactivo.'
      });
    }

    if (user.estado === 'BLOQUEADO') {
      await logLoginAttempt({
        cedula,
        idUsuario: user.id_usuario,
        resultado: 'USUARIO_BLOQUEADO',
        mensaje: 'Usuario bloqueado.',
        req
      });

      return res.status(403).json({
        message: 'El usuario está bloqueado.'
      });
    }

    const incomingHash = sha256(password);

    if (incomingHash !== user.password_hash) {
      const failedAttempts = Number(user.intentos_fallidos || 0) + 1;
      const newStatus = failedAttempts >= 5 ? 'BLOQUEADO' : user.estado;

      await pool.query(
        'UPDATE usuarios SET intentos_fallidos = ?, estado = ? WHERE id_usuario = ?',
        [failedAttempts, newStatus, user.id_usuario]
      );

      await logLoginAttempt({
        cedula,
        idUsuario: user.id_usuario,
        resultado: 'PASSWORD_INCORRECTO',
        mensaje: 'Contraseña incorrecta.',
        req
      });

      return res.status(401).json({
        message: failedAttempts >= 5
          ? 'Usuario bloqueado por intentos fallidos.'
          : 'Credenciales incorrectas.'
      });
    }

    await pool.query(
      'UPDATE usuarios SET ultimo_login = NOW(), intentos_fallidos = 0 WHERE id_usuario = ?',
      [user.id_usuario]
    );

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        cedula: user.cedula,
        rol: user.nombre_rol
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await pool.query(
      `INSERT INTO sesiones (id_usuario, token_hash, ip_origen, user_agent)
       VALUES (?, ?, ?, ?)`,
      [
        user.id_usuario,
        sha256(token),
        getClientIp(req),
        req.headers['user-agent'] || null
      ]
    );

    await logLoginAttempt({
      cedula,
      idUsuario: user.id_usuario,
      resultado: 'CORRECTO',
      mensaje: 'Inicio de sesión correcto.',
      req
    });

    res.json({
      message: 'Inicio de sesión correcto.',
      token,
      usuario: userPublic(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getAuthUser(req);

    if (!user || user.estado !== 'ACTIVO') {
      return res.status(401).json({
        message: 'Usuario no válido.'
      });
    }

    res.json({
      usuario: userPublic(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');

    await pool.query(
      "UPDATE sesiones SET estado = 'CERRADA', fecha_fin = NOW() WHERE token_hash = ? AND estado = 'ACTIVA'",
      [sha256(token)]
    );

    res.json({
      message: 'Sesión cerrada correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;